// ipc.js
const { ipcMain, BrowserWindow } = require('electron')
const path = require('path')
const { exec, execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const uitls = require('./utils');
const { SHORTCUT_CT, SHORTCUT_CCT, SHORTCUT_CCR, SHORTCUT_CQ } = require('./shortcuts');
const { gemini_generate_stream } = require('./gemini');
const { openai_generate_stream } = require('./openchat');
const { captureScreenRegion, getScreenSize } = require('./screen-utils');
const { kokoro_generate_speech } = require('./kokoro-tts');
const { sambert_generate_speech } = require('./sambert-tts');
const { playAudio } = require('./audio');
const gw = require('get-windows');
const { util } = require('undici');
const Store = require('electron-store').default;


let sender = null;
let config = null;
let mainWindow = null;
let overlayWindow = null;
let selectedRegion = null;
let previouslyFocusedApp = null;
// Global flag to track if streaming is in progress
let isStreaming = false;
// Store currently focused app before showing selector
function captureCurrentFocus() {
    if (process.platform === 'darwin') {
        // 1. Store the currently focused app
        previouslyFocusedApp = gw.activeWindowSync();
    } else if (process.platform === 'win32') {
        // On Windows, get foreground window handle/process
        // Implementation depends on ffi-napi or similar
        previouslyFocusedApp = gw.activeWindowSync();
    }
}

function restorePreviousFocus() {
    if (!previouslyFocusedApp) {
        return;
    }
    if (previouslyFocusedApp.owner.processId === process.pid) {
        // The active window is our own app – no need to switch focus.
        return;
    }

    // Switch to the previously focused app.
    if (process.platform === 'darwin') {
        // macOS
        execSync(`osascript -e 'tell application "${previouslyFocusedApp.owner.name}" to activate'`);
    } else if (process.platform === 'win32') {
        // Windows
        // Uses PowerShell to activate the previous window
        execSync(`powershell -command "(New-Object -ComObject WScript.Shell).AppActivate(${previouslyFocusedApp.id})"`);
    } else if (process.platform === 'linux') {
        // Linux using xdotool (requires installation)
        execSync(`xdotool windowactivate ${previouslyFocusedApp.id}`);
    }
}

function createOverlayWindow() {
    // Check if overlayWindow is already created
    if (overlayWindow) {
        return;
    }

    // Get the primary display's work area dimensions
    const { width, height } = getScreenSize();
    overlayWindow = new BrowserWindow({
        parentWindow: mainWindow,
        width: width,
        height: height,
        x: 0,
        y: 0,
        fullscreen: false,
        fullscreenable: false,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        enableLargerThanScreen: true,
        roundedCorners: false, // Explicitly disable rounded corners
        skipTaskbar: true,  // Won't show in task bar
        trafficLightPosition: { x: -100, y: -100 }, // Hide traffic lights (macOS)
        hasShadow: false,
        titleBarStyle: 'hidden',
        movable: false,
        resizable: false,
        focusable: true,
        show: false, // Start hidden
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    overlayWindow.loadFile(path.join(__dirname, 'overlay.html'));

    // Make it visible on all workspaces
    // Don't use this, when using it, the app icon would disappear!
    //overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // Force it to be above the dock and menu bar
    overlayWindow.setAlwaysOnTop(true, "screen-saver", 1);

    // Macos Only
    if (process.platform === 'darwin') {
        // Then enter fullscreen after loading to ensure proper coverage
        overlayWindow.webContents.on('did-finish-load', () => {
            // Hide the Dock on macos
            //overlayWindow.setSimpleFullScreen(true);
        });
    }
}

function setupIPC(parentWindow) {
    // Keep a reference to the sender
    mainWindow = parentWindow;
    sender = mainWindow.webContents;
    createOverlayWindow();

    // Handle IPC messages
    ipcMain.on('main-process-log', (event, ...args) => {
        console.log(...args) // This will show in terminal
    })

    ipcMain.handle('get-configuration', async (event, args) => {
        // Load the configuration
        if (!config) {
            config = await uitls.loadConfig();
        }
        return config;
    });

    ipcMain.handle('close-overlay', (event, arg) => {
        if (overlayWindow) {
            if (process.platform === 'darwin') {
                // Show the Dock on macos
                //overlayWindow.setSimpleFullScreen(false);
            }
            /*
            overlayWindow.close();
            overlayWindow = null;
            */
            overlayWindow.hide();

            // Return focus to previous app
            restorePreviousFocus();
        }
        const region = arg;
        translateSelectRegion(region);
    });

    ipcMain.handle('play-tts', async (event, text) => {
        playTTS(text);
    });
}

function retrieveSettings() {
    if (!config) {
        console.log('No config found');
        return null;
    }

    const store = new Store();
    const windowConfig = store.get('windowConfig') || {
        width: 400,
        height: 800,
        position: 'center' // 'left', 'right', 'center'
    };
    const settings = {
        // API
        apiMode: config.API.MODE,
        apiEndpoint: config.API.ENDPOINT,
        apiKey: config.API.KEY,
        apiModel: config.API.MODEL,
        apiPrompt: config.API.PROMPT,
        apiSysPrompt: config.API.SYS_PROMPT,
        apiTemperature: config.API.TEMPERATURE,
        // SPEECH
        spkMode: config.SPEECH.MODE,
        spkLang: config.SPEECH.LANG,
        spkModel: config.SPEECH.MODEL,
        spkKey: config.SPEECH.KEY,
        spkEndpoint: config.SPEECH.ENDPOINT,
        spkRate: config.SPEECH.RATE,
        // ... add more settings as needed
        tipInfo: config.TIPS.INFO.CONTENT,
        tipHowto: config.TIPS.HOWTO.CONTENT,
        // Window Configuration
        winWidth: windowConfig.width,
        winHeight: windowConfig.height,
        winPosition: windowConfig.position
    };

    return settings;
}

function updateSettings(settings) {
    if (!settings || !config) {
        console.log('No settings or config found');
        return;
    }
    // Update API settings
    config.API.MODE = settings.apiMode;
    config.API.ENDPOINT = settings.apiEndpoint;
    config.API.KEY = settings.apiKey;
    config.API.MODEL = settings.apiModel;
    config.API.PROMPT = settings.apiPrompt;
    config.API.SYS_PROMPT = settings.apiSysPrompt;
    config.API.TEMPERATURE = parseFloat(settings.apiTemperature);

    // Update SPEECH settings
    config.SPEECH.MODE = settings.spkMode;
    config.SPEECH.LANG = settings.spkLang;
    config.SPEECH.MODEL = settings.spkModel;
    config.SPEECH.KEY = settings.spkKey;
    config.SPEECH.ENDPOINT = settings.spkEndpoint;
    config.SPEECH.RATE = parseFloat(settings.spkRate);
    uitls.updateConfig(config);

    // Update Window Configuration
    const store = new Store();
    store.set('windowConfig', {
        width: settings.winWidth,
        height: settings.winHeight,
        position: settings.winPosition
    });
    
    sender.send('complete-progress');
}

function handleShortcuts(type) {
    switch (type) {
        case SHORTCUT_CT:
            translateTopWindow();
            break;
        case SHORTCUT_CCT:
            translateScreenshot();
            break;
        case SHORTCUT_CCR:
            startSelectRegion();
            break;
    }
}

function translateTopWindow() {
    // Get information about the currently active window
    // options:
    // accessibilityPermission (macOS only) default:true
    // screenRecordingPermission (macOS only) default:true
    /* Format like this:
    {
    owner: {
    bundleId: 'com.microsoft.VSCode',
    name: 'Code',
    processId: 21805,
    path: '/Applications/Visual Studio Code.app'
    },
    memoryUsage: 2288,
    bounds: { x: 0, width: 1920, height: 994, y: 25 },
    id: 1120,
    platform: 'macos',
    title: 'ipc.js — electron_apps (Workspace)'
    }
    */

    const activeWindow = gw.activeWindowSync();
    //console.log(activeWindow);
    let region;
    if (selectedRegion) {
        // Screenshot the selected region
        region = selectedRegion;
    } else {
        region = activeWindow.bounds;
    }
    translateSelectRegion(region);
}

function translateScreenshot() {

    sender.send('start-progress');

    const tmpName = uitls.generateFilename("screenshot", "png");
    const tmpPath = path.join(os.tmpdir(), tmpName);

    let command;
    switch (process.platform) {
        case 'darwin': // macOS
            command = `screencapture -i -x "${tmpPath}"`;
            break;
        case 'win32': // Windows
            command = `powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{PrtSc}'); Start-Sleep -Milliseconds 250; $img = [System.Windows.Forms.Clipboard]::GetImage(); $img.Save('${tmpPath}');"`;
            break;
        case 'linux':
            command = `import -window root "${tmpPath}"`;
            break;
    }

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error('Screenshot error:', error);
            sender.send('complete-progress');
            return;
        }

        if (!fs.existsSync(tmpPath)) {
            console.error('Screenshot cancelled');
            sender.send('complete-progress');
            return;
        }

        console.log(`Screenshot saved at: ${tmpPath}`);
        // Stream the generate content
        streamContent(tmpPath);
    });
}

function startSelectRegion() {
    if (!overlayWindow) {
        createOverlayWindow();
        return;
    }
    captureCurrentFocus();
    overlayWindow.webContents.send("clearup-overlay");
    overlayWindow.show();
}

async function translateSelectRegion(region) {
    sender.send('start-progress');
    if (!region) {
        sender.send('complete-progress');
        return;
    }

    // Keep track of the selected region
    selectedRegion = region;
    console.log('Selected Rectangle:', selectedRegion);

    const imagePath = path.join(__dirname, '../screenshot.png');
    await captureScreenRegion(selectedRegion.x, selectedRegion.y, selectedRegion.width, selectedRegion.height,
        imagePath, shifting = false);
    streamContent(imagePath);
}

function streamContent(imagePath) {
    // If streaming is already in progress, ignore this call
    if (isStreaming) {
        console.log("Streaming already in progress. Ignoring request.");
        return; // Indicate the request was ignored
    }

    // Set flag to block other calls
    isStreaming = true;

    const settings = {
        // API
        apiMode: config.API.MODE,
        apiEndpoint: config.API.ENDPOINT,
        apiKey: config.API.KEY,
        apiModel: config.API.MODEL,
        apiPrompt: config.API.PROMPT,
        apiSysPrompt: config.API.SYS_PROMPT,
        apiTemperature: config.API.TEMPERATURE,
        // SPEECH
        spkMode: config.SPEECH.MODE,
        spkLang: config.SPEECH.LANG,
        spkModel: config.SPEECH.MODEL,
        spkKey: config.SPEECH.KEY,
        spkEndpoint: config.SPEECH.ENDPOINT,
        spkRate: config.SPEECH.RATE
    };
    if (settings.apiMode.trim().toLowerCase() === 'google') {
        sender.send('begin-message');
        gemini_generate_stream(settings, imagePath, (data) => {
            if (!data.end) {
                sender.send('generate-message', data.text);
            } else {
                sender.send('complete-message');
                isStreaming = false;
            }
        });
    } else if (settings.apiMode.trim().toLowerCase() === 'openai') {
        sender.send('begin-message');
        openai_generate_stream(settings, imagePath, (data) => {
            if (!data.end) {
                sender.send('generate-message', data.text);
            } else {
                sender.send('complete-message');
                isStreaming = false;
            }
        });
    } else {
        isStreaming = false;
    }
}

function playTTS(text) {
    if (!text) {
        return;
    }
    const settings = {
        // SPEECH
        spkMode: config.SPEECH.MODE,
        spkLang: config.SPEECH.LANG,
        spkModel: config.SPEECH.MODEL,
        spkKey: config.SPEECH.KEY,
        spkEndpoint: config.SPEECH.ENDPOINT,
        spkRate: config.SPEECH.RATE
    };
    // Filter out text
    if (settings.spkLang.trim().toLowerCase() === 'en') {
        text = uitls.extractEnglish(text);
    } else if (settings.spkLang.trim().toLowerCase() === 'cn') {
        text = uitls.extractChinese(text);
    } else if (settings.spkLang.trim().toLowerCase() === 'jp') {
        text = uitls.extractJapanese(text);
    }
    // Play text using different model
    if (settings.spkMode.trim().toLowerCase() === 'kokoro') {
        kokoroPlay(settings, text);
    } else if (settings.spkMode.trim().toLowerCase() === 'sambert') {
        sambertPlay(settings, text);
    }
}

function kokoroPlay(settings, text) {
    console.log("kokoro tts start");
    kokoro_generate_speech(settings, text).then((filePath) => {
        console.log('kokoro play at: ', filePath);
        playAudio(filePath);
    });

}

function sambertPlay(settings, text) {
    console.log("sambert tts start");
    sambert_generate_speech(settings, text).then((filePath) => {
        console.log("sambert play at: ", filePath);
        playAudio(filePath);
    }).catch(err => { throw new Error("sambert play failed:", err) });
}

module.exports = {
    setupIPC, handleShortcuts,
    retrieveSettings, updateSettings
};