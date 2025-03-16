const fs = require('fs/promises');
const path = require('path');
const toml = require('@iarna/toml');

/**
 * Utility function to pause execution for a specified time
 * @param {number} ms - Time to sleep in milliseconds
 * @returns {Promise} Promise that resolves after the specified time
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let appUserDataDir = '';
function getAppUserDataDir() {
    return appUserDataDir;
}
function setAppUserDataDir(dir) {
    appUserDataDir = dir;
}

/**
 * Generate a unique filename with a timestamp under the app's user data directory
 * @param {string} prefix - Prefix for the filename
 * @param {string} suffix - Suffix for the filename
 * @returns {string} Generated filename
 */
function getUserDataFilePath(prefix = 'random', suffix = '.tmp', duplicate = false) {
    if (!appUserDataDir) {
        throw new Error('App user data directory not set');
    }
    if (duplicate) {
        const now = new Date();

        // Format: YYMMDD-HHMMSS
        const year = now.getFullYear().toString().slice(-2); // last 2 digits of year
        const month = (now.getMonth() + 1).toString().padStart(2, '0'); // months are 0-indexed
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
    
        const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;
        return path.join(appUserDataDir, `${prefix}_${timestamp}.${suffix}`);    
    } else {
        return path.join(appUserDataDir, `${prefix}.${suffix}`);
    }
}

function generateFilename(prefix = 'random', suffix = '.tmp') {
    const now = new Date();

    // Format: YYMMDD-HHMMSS
    const year = now.getFullYear().toString().slice(-2); // last 2 digits of year
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // months are 0-indexed
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;
    return `${prefix}_${timestamp}.${suffix}`;
}

async function loadConfig() {
    try {
        // Load base config
        const configPath = path.join(__dirname, '../config.toml');
        const configFile = await fs.readFile(configPath, 'utf8');
        const config = toml.parse(configFile);
        return config;
    } catch (err) {
        console.error('Error loading config:', err);
    }
}

// Read and parse the TOML file
async function updateConfig(config) {
    try {
        // Convert back to TOML format
        const updatedToml = toml.stringify(config);
        const configPath = path.join(__dirname, '../config.toml');
        // Write the updated content back to the file
        await fs.writeFile(configPath, updatedToml, 'utf8');
        return config;
    } catch (err) {
        console.error('Error updating TOML file:', err);
    }
}

// Extract only English text from mixed text
function extractEnglish(text) {
    const englishPattern = /[A-Za-z0-9\s.,!?'";:()_\-+@#$%&*=[\]{}|/<>~`]+/g;
    const matches = text.match(englishPattern) || [];
    return matches.join(' ').trim();
}

// Extract only Japanese text from mixed text
function extractJapanese(text) {
    // A better approach for Japanese is to look for text segments containing Japanese-specific characters
    // This looks for segments with Hiragana or Katakana (uniquely Japanese)
    const japanesePattern = /(?:[\u3040-\u309F\u30A0-\u30FF]|[\u4E00-\u9FAF])+/g;
    const matches = text.match(japanesePattern) || [];

    // Additional filter: only keep segments that contain at least one hiragana or katakana character
    // This helps exclude purely Chinese segments
    return matches
        .filter(segment => /[\u3040-\u309F\u30A0-\u30FF]/.test(segment))
        .join('')
        .trim();
}

// Extract only Chinese text from mixed text
function extractChinese(text) {
    // First extract all Chinese characters
    const chinesePattern = /[\u4E00-\u9FFF\u3400-\u4DBF\u20000-\u2A6DF\u2A700-\u2B73F\u2B740-\u2B81F\u2B820-\u2CEAF\u2CEB0-\u2EBEF\uF900-\uFAFF]+/g;
    const matches = text.match(chinesePattern) || [];

    // Filter out segments that are likely Japanese (contain hiragana or katakana)
    return matches
        .filter(segment => !/[\u3040-\u309F\u30A0-\u30FF]/.test(segment))
        .join('')
        .trim();
}


module.exports = {
    sleep,
    getAppUserDataDir,
    setAppUserDataDir,
    getUserDataFilePath,
    generateFilename,
    loadConfig,
    updateConfig,
    extractEnglish,
    extractJapanese,
    extractChinese
};