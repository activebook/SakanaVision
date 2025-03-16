const { globalShortcut } = require('electron')

const SHORTCUT_CT = 1 << 0;
const SHORTCUT_CCT = 1 << 1;
const SHORTCUT_CCR = 1 << 2;
const SHORTCUT_CQ = 1 << 3;


function registerShortcuts(callback) {
    // Register a global shortcut
    globalShortcut.register('Control+T', () => {
        console.log('Global ctrl + t triggered');
        callback(SHORTCUT_CT);
    });
    globalShortcut.register('Control+Command+T', () => {
        console.log('Global ctrl + cmd + t triggered');
        callback(SHORTCUT_CCT);
    });
    globalShortcut.register('Control+Command+R', () => {
        console.log('Global ctrl + cmd + r triggered');
        callback(SHORTCUT_CCR);
    });
    globalShortcut.register('CommandOrControl+Q', () => {
        console.log('Global ctrl + cmd + q triggered');
        callback(SHORTCUT_CQ);
    });
}

function unregisterShortcuts() {
    globalShortcut.unregisterAll();
}

module.exports = {
    registerShortcuts, unregisterShortcuts,
    SHORTCUT_CT, SHORTCUT_CCT, SHORTCUT_CCR, SHORTCUT_CQ
}