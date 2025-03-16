const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use IPC
contextBridge.exposeInMainWorld('api', {
    // Register handlers for receiving shortcut notifications from main process

    /**
     * Generate message related functions
     * 
     */
    beginMessage: (callback) => {
        ipcRenderer.on('begin-message', () => callback());
    },
    generateMessage: (callback) => {
        ipcRenderer.on('generate-message', (event, text) => callback(text));
    },
    completeMessage: (callback) => {
        ipcRenderer.on('complete-message', () => callback());
    },
    playTTS: (text) => ipcRenderer.invoke('play-tts', text),

    /**
     * Progress bar related functions
     */
    startProgress: (callback) => {
        ipcRenderer.on('start-progress', () => callback());
    },
    completeProgress: (callback) => {
        ipcRenderer.on('complete-progress', () => callback());
    },

    /**
     * Overlay related functions
     */
    clearupOverlay: (callback) => {
        ipcRenderer.on('clearup-overlay', () => callback());
    },
    closeOverlay: (region) => ipcRenderer.invoke('close-overlay', region),

    /**
     * Settings related functions
     */
    loadSettings: () => ipcRenderer.send('load-settings'),
    showSettings: (callback) => {
        ipcRenderer.on('show-settings', (event, settings) => callback(settings));
    },
    saveSettings: (settings) => ipcRenderer.send('save-settings', settings),
    closeSettings: (callback) => {
        ipcRenderer.on('close-settings', () => callback());
    },

    /**
     * Get all configuration
     * Update info in the renderer process
     */
    getConfig: () => ipcRenderer.invoke('get-configuration'),


    /**
     * Theme related functions
     */
    onThemeChange: (callback) => {
        ipcRenderer.on('set-theme', (_, theme) => callback(theme));
    }
});

contextBridge.exposeInMainWorld('darkMode', {
    toggle: () => ipcRenderer.invoke('dark-mode:toggle'),
    system: () => ipcRenderer.invoke('dark-mode:system')
});

// Expose debugging functions
contextBridge.exposeInMainWorld('debug', {
    log: (...args) => {
        console.log(...args) // This will show in the main process terminal
        // Also logs to renderer console
        // This sends the log to main process
        ipcRenderer.send('main-process-log', ...args)
    }
})

// Define allowed channels for security
/*
const allowedChannels = ['translate-top-window', 'translate-screenshot', 'translate-select-region',
];

contextBridge.exposeInMainWorld('mainChannel', {
    // Send a message without expecting a response
    send: (channel, data) => {
        if (allowedChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },

    // Invoke a message that returns a promise (request-response pattern)
    invoke: (channel, data) => {
        if (allowedChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, data);
        }
    },

    // Optionally, listen to messages from the main process
    on: (channel, callback) => {
        if (allowedChannels.includes(channel)) {
            ipcRenderer.on(channel, callback);
        }
    }
});
*/
