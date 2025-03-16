const { app, BrowserWindow, ipcMain, screen, dialog, nativeTheme, nativeImage, Tray, Notification, Menu, MenuItem } = require('electron')
const { setupIPC, handleShortcuts, retrieveSettings, updateSettings } = require('./ipc');
const { registerShortcuts, unregisterShortcuts, SHORTCUT_CQ } = require('./shortcuts');
const packageJson = require('../package.json');
const path = require('path');
const { slideInWindow } = require('./screen-utils');
const Store = require('electron-store').default;

let store = null;
let mainWindow = null;
let testWindow = null;

/**
 * monitor errors in the main process (the Node.js part of Electron), 
 * catching any unhandled errors thrown with throw new Error() 
 * or unhandled promise rejections.
 */
process.on('uncaughtException', (error) => {
    const text = `Main Process Uncaught Exception: ${error}`;
    // Optional: dialog to notify user
    // electron.dialog.showErrorBox('An error occurred', error.message);
    if (mainWindow)
        mainWindow.webContents.send('generate-message', text);
    else
        console.error(text);
});

process.on('unhandledRejection', (reason) => {
    const text = `Main Process Unhandled Rejection: ${reason}`;
    if (mainWindow)
        mainWindow.webContents.send('generate-message', text);
    else
        console.error(text);
});

// Initialize app settings before creating windows
function initializeApp() {
    // Get saved theme or default to 'system'
    store = new Store();
    const savedTheme = store.get('theme', 'system');
    nativeTheme.themeSource = savedTheme;

    // Other initializations...
}

const createMainWindow = () => {
    // Load saved window configuration
    const windowConfig = store.get('windowConfig') || {
        width: 400,
        height: 800,
        position: 'center' // 'left', 'right', 'center'
    };
    mainWindow = new BrowserWindow({
        width: windowConfig.width,
        height: windowConfig.height,
        resizable: true,
        frame: true,
        transparent: false,
        focusable: true, // **This prevents the window from taking focus
        show: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            additionalArguments: ['--enable-features=PlatformHasDefaultAecDump'],
            preload: path.join(__dirname, 'preload.js')
        }
    });

    /**
     * The window is configured to prevent closing unless the application is quitting, hiding the window instead.
    */
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault()
            mainWindow.hide()
            return false
        }
        return true
    })

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.setTitle(packageJson.productName);
    });

    // When content is loaded, show and animate
    mainWindow.once('ready-to-show', () => {
        mainWindow.showInactive();
        mainWindow.focus();
        slideInWindow(mainWindow, windowConfig.position); // 'left', 'right', 'center'
    });

    // Only for development
    //mainWindow.webContents.openDevTools();
}

function createTray() {
    const iconPath = path.join(__dirname, '../assets/tray.png');
    const icon = nativeImage.createFromPath(iconPath);
    icon.setTemplateImage(true);
    const tray = new Tray(icon);

    const testIconPath = path.join(__dirname, '../assets/test_mark.png');
    const testIcon = nativeImage.createFromPath(testIconPath);
    // Function to update the tray menu with the current theme
    function updateTrayMenu() {
        const contextMenu = Menu.buildFromTemplate([
            {
                label: '◎ Show Sakana', click: () => {
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    if (!mainWindow.isVisible()) mainWindow.show();
                    mainWindow.focus();
                }
            },
            /*
            {
                label: 'Test',
                icon: testIcon, // Use a larger icon file
                click: () => {
                    showTestWindow(mainWindow);
                }
            },
            */
            { type: 'separator' },
            {
                label: '◐ Appearance',
                submenu: [
                    {
                        label: '◐ Light Mode',
                        type: 'radio',
                        checked: !nativeTheme.shouldUseDarkColors,
                        click: () => {
                            setTheme('light');
                            updateTrayMenu();
                        }
                    },
                    {
                        label: '◑ Dark Mode',
                        type: 'radio',
                        checked: nativeTheme.shouldUseDarkColors,
                        click: () => {
                            setTheme('dark');
                            updateTrayMenu();
                        }
                    },
                    {
                        label: '□ Follow System',
                        type: 'radio',
                        checked: nativeTheme.themeSource === 'system',
                        click: () => {
                            setTheme('system');
                            updateTrayMenu();
                        }
                    }
                ]
            },
            { type: 'separator' },
            {
                label: '⛭ Settings...',
                accelerator: 'CommandOrControl+.',
                click: () => {
                    showSettingsDialog();
                }
            },
            { type: 'separator' },
            {
                label: '⏻ Quit',
                accelerator: 'CommandOrControl+Q',
                click: () => {
                    app.isQuitting = true;
                    app.quit();
                }
            }
        ]);

        function setTheme(theme) {
            nativeTheme.themeSource = theme;
            store.set('theme', theme);
        }

        // Get the description from package.json
        const productName = packageJson.productName;
        tray.setToolTip(productName);
        tray.setContextMenu(contextMenu);
    }

    // Function to change theme
    function setTheme(theme) {
        // Get current window
        if (!mainWindow) return;

    }

    // Initialize with current theme (you'd get this from your settings/store)
    updateTrayMenu();

    // Optional: Listen for system theme changes
    nativeTheme.on('updated', () => {
        updateTrayMenu(nativeTheme.shouldUseDarkColors);
    });
}

function createMenu() {
    // Get the default menu
    const defaultMenu = Menu.getApplicationMenu();
    // Convert to array and filter out the Help menu
    const menuItems = defaultMenu.items.filter(item => item.label !== 'Help').map(item => {
        // Check if this is the View menu
        if (item.label === 'View') {
            // Create a copy of the item
            const viewItem = { ...item };

            // Filter submenu to only keep Toggle Full Screen
            viewItem.submenu = item.submenu.items.filter(subItem =>
                subItem.label === 'Toggle Full Screen' ||
                subItem.label.includes('Full Screen')  // For cross-platform compatibility
            );

            return viewItem;
        }

        // Replace the default About menu (typically under app name menu on macOS)
        if (item.role === 'appMenu' || (process.platform !== 'darwin' && item.label === '&Help')) {
            const appMenuItem = { ...item };
            // Find and replace the About menu item
            if (appMenuItem.submenu) {
                appMenuItem.submenu = appMenuItem.submenu.items.map(subItem => {
                    if (subItem.role === 'about' || subItem.label === `About ${app.getName()}`) {
                        return {
                            label: `About ${app.getName()}`,
                            click: () => {
                                // Custom About dialog with separate version numbers
                                dialog.showMessageBox({
                                    title: `About ${app.getName()}`,
                                    message: `${app.getName()}`,
                                    detail: `Version ${app.getVersion()}`,
                                    buttons: ['OK'],
                                    icon: "../assets/app.icns"
                                });
                            }
                        };
                    }
                    return subItem;
                });
            }
            return appMenuItem;
        }
        return item;
    });

    // Create your custom menu item
    const myHelpMenuItem = {
        label: 'Settings',
        submenu: [{
            label: 'Show',
            accelerator: 'CommandOrControl+.',
            click: () => {
                showSettingsDialog();
            }
        }]
    };

    // Add your custom menu item
    const newMenuTemplate = [...menuItems, myHelpMenuItem];

    // Build and set the new menu
    const newMenu = Menu.buildFromTemplate(newMenuTemplate);
    Menu.setApplicationMenu(newMenu);
}

function createWidgets() {
    //showNotification()
    createMenu()
    createTray()

    // Make sure screen module is available
    screen.getPrimaryDisplay();
}


function showNotification(title, body) {
    new Notification({ title: title, body: body }).show()
}

function showTestWindow(parentWindow) {
    if (testWindow) {
        testWindow.focus();
        return;
    }
    const parentBounds = parentWindow.getBounds();
    const parentContentBounds = parentWindow.getContentBounds();
    // Create a new browser window configured as a dialog
    testWindow = new BrowserWindow({
        parent: parentWindow, // Set parent without modal flag
        modal: false,
        frame: false,
        resizable: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        transparent: true,   // Transparent background
        show: false,         // Hide until loaded
        backgroundColor: '#00000000', // Transparent background
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    //settingsDialog.setMenuBarVisibility(false);
    // Set the dialog size to match the content area
    testWindow.setSize(parentContentBounds.width, parentContentBounds.height);

    // Position the dialog relative to the parent window
    testWindow.setPosition(
        parentBounds.x,  // Keep the X position the same
        parentBounds.y + (parentBounds.height - parentContentBounds.height)  // Adjust Y to account for title bar
    );
    // Load your dialog HTML
    //settingsDialog.loadFile(path.join(__dirname, 'speech-settings-holder.html'));
    testWindow.loadFile(path.join(__dirname, 'settings-modal.html'));

    // For debugging
    testWindow.webContents.openDevTools();

    // Optional: Center on parent
    /*
    const dialogBounds = settingsDialog.getBounds();
    settingsDialog.setSize(parentBounds.width, parentBounds.height);
    settingsDialog.setPosition(
        parentBounds.x,
        parentBounds.y
    );
    */

    // Auto-close when focus is lost
    /*
    testWindow.on('blur', () => {
        testWindow.close();
        testWindow = null;
    });
    */
    testWindow.once('ready-to-show', () => {
        testWindow.show();
    });
    // dom-ready
    testWindow.webContents.on('did-finish-load', () => {
    });
}

function showSettingsDialog() {
    const settings = retrieveSettings();
    mainWindow.webContents.send('show-settings', settings);
}

ipcMain.on('load-settings', (event) => {
    showSettingsDialog();
})

// Handle the IPC events
ipcMain.on('save-settings', (event, settings) => {
    // Save the settings to your config or storage
    //console.log('Saving settings:', settings)
    updateSettings(settings);

    // Close the window
    mainWindow.webContents.send('close-settings', settings);
})

function showDialog(msg) {
    // From main process
    /*
    dialog.showMessageBox({
        type: 'info', // 'info', 'error', 'question', 'warning'
        title: 'Message Title',
        message: msg,
        detail: 'Additional details here',
        buttons: ['OK']
    })
    */

    // For simple messages
    dialog.showMessageBoxSync({
        message: msg
    })
}

function clearupMainWindow() {

    app.isQuitting = true;
}

function activateMainWindow() {
    /*
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow()
    }
    */
    if (mainWindow === null) {
        createMainWindow()
    } else {
        mainWindow.show()
    }
}

function onShortcutsEvents(type) {
    if (type == SHORTCUT_CQ) {
        app.quit();
        return;
    }
    handleShortcuts(type);
}

// when the app is ready, create the main window and register shortcuts
app.whenReady().then(() => {
    // Initialize app settings first
    initializeApp();
    // Then create your main window
    createMainWindow();
    // Create tray, menus, etc.
    createWidgets();
    // Setup IPC handlers
    setupIPC(mainWindow);
    // Register global shortcuts
    registerShortcuts(onShortcutsEvents);
})

// before the app is terminated, clear both timers
app.on('before-quit', () => {
    //console.log('App is about to quit');
    clearupMainWindow()
})

// The event sequence is: before-quit → windows closing → will-quit → app exits
app.on('will-quit', () => {
    // Clean up by unregistering all shortcuts
    // console.log('App will quit');
    unregisterShortcuts()
});

// for windows and linux (close app when all windows are closed)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// For macos only
// Also consider handling the 'quit' event for the Dock icon
app.on('activate', () => {
    activateMainWindow()
})
