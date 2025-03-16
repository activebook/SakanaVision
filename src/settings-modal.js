// settings-modal.js

// Modal instance
let modal = null;

// Initialize the modal
function initSettingsModal() {
    // Add modal HTML to the page if not already present
    if (!document.getElementById('settings-modal')) {
        document.getElementById('modal-container').innerHTML = settingsModalHTML;       
        const settingsModal = document.getElementById('settings-modal');
        modal = new Modal(settingsModal);
        // After load settings-template.js
        // Before it contains the modal HTML and components
        setupEventListeners();
    }
}

function setupEventListeners() {
    const closeBtn = document.getElementById('closeBtn');

    // Set up the settings button click handler
    document.getElementById('infoButton').addEventListener('click', () => {
        showProgress();
        window.api.loadSettings(); 
    });

    // Receive settings
    window.api.showSettings((settings) => {
        //window.debug.log('Received show-settings event');
        // api settings
        document.getElementById('apiMode').value = settings.apiMode;
        document.getElementById('apiEndpoint').value = settings.apiEndpoint;
        document.getElementById('apiKey').value = settings.apiKey;
        document.getElementById('apiModel').value = settings.apiModel;
        document.getElementById('apiPrompt').value = settings.apiPrompt;
        document.getElementById('apiSysPrompt').value = settings.apiSysPrompt;
        document.getElementById('apiTemperatureValue').value = settings.apiTemperature;
        // speaker settings
        document.getElementById('spkMode').value = settings.spkMode;
        document.getElementById('spkLang').value = settings.spkLang;
        document.getElementById('spkKey').value = settings.spkKey;
        document.getElementById('spkRateValue').value = settings.spkRate;
        document.getElementById('spkModel').value = settings.spkModel;
        document.getElementById('spkEndpoint').value = settings.spkEndpoint;
        // Add more settings as needed
        document.getElementById("tipInfo").innerHTML = settings.tipInfo;
        document.getElementById("tipHowto").innerHTML = settings.tipHowto;
        // Window Configuration
        document.getElementById('window-width').value = settings.winWidth;
        document.getElementById('window-height').value = settings.winHeight;
        document.getElementById('window-position').value = settings.winPosition;

        if (!modal.isVisible()) {
            modal.show();
        }
        hideProgress();
    });

    window.api.closeSettings(()=>{
        if (modal) modal.hide();
    });

    // Save settings
    document.getElementById('saveBtn').addEventListener('click', () => {
        showProgress();
        const settings = {
            // api settings
            apiMode: document.getElementById('apiMode').value,
            apiEndpoint: document.getElementById('apiEndpoint').value,
            apiKey: document.getElementById('apiKey').value,
            apiModel: document.getElementById('apiModel').value,
            apiPrompt: document.getElementById('apiPrompt').value,
            apiSysPrompt: document.getElementById('apiSysPrompt').value,
            apiTemperature: parseFloat(document.getElementById('apiTemperatureValue').value),
            // speaker settings
            spkMode: document.getElementById('spkMode').value,
            spkLang: document.getElementById('spkLang').value,
            spkKey: document.getElementById('spkKey').value,            
            spkModel: document.getElementById('spkModel').value,
            spkEndpoint: document.getElementById('spkEndpoint').value,
            spkRate: parseFloat(document.getElementById('spkRateValue').value),
            // Add more settings as needed
            winWidth: parseInt(document.getElementById('window-width').value),
            winHeight: parseInt(document.getElementById('window-height').value),
            winPosition: document.getElementById('window-position').value
        };
        //window.debug.log('Save button clicked:', settings);
        window.api.saveSettings(settings);
    });

    // Cancel
    document.getElementById('cancelBtn').addEventListener('click', () => {
        //window.debug.log('Cancel button clicked');
        //window.api.closeSettings();
        if (modal) modal.hide();
    });

    // Close when clicking the X button
    closeBtn.addEventListener('click', () => {
        //window.api.closeSettings();
        if (modal) modal.hide();
    });

    // Add keyboard support for escape key
    /*
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            //window.debug.log('esc on settings');
            window.api.closeSettings();
        }
    });
    */
}

document.addEventListener('DOMContentLoaded', async () => {
    initSettingsModal();    
});


/**
 * api-modal
 */
function toggleAPIKeyVisibility() {
    const apiKeyInput = document.getElementById('apiKey');
    const eyeIconClosed = document.getElementById('eyeIconClosedForAPIKey');
    const eyeIconOpen = document.getElementById('eyeIconOpenForAPIKey');

    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        eyeIconClosed.classList.add('hidden');
        eyeIconOpen.classList.remove('hidden');
    } else {
        apiKeyInput.type = 'password';
        eyeIconClosed.classList.remove('hidden');
        eyeIconOpen.classList.add('hidden');
    }
}

// Function to update temperature input from slider
function updateAPITemperatureValue(value) {
    document.getElementById('apiTemperatureValue').value = value;
}

// Function to update slider from input
function updateAPITemperatureSlider(value) {
    value = Math.max(0, Math.min(2, value));
    document.getElementById('apiTemperatureSlider').value = value;
}

// Reset temperature to default
function resetAPITemperature() {
    document.getElementById('apiTemperatureSlider').value = 0.7;
    document.getElementById('apiTemperatureValue').value = 0.7;
}


/**
 * speaker-modal
 */
function toggleSpeakerKeyVisibility() {
    const spkKeyInput = document.getElementById('spkKey');
    const eyeIconClosed = document.getElementById('eyeIconClosedForSpeakerKey');
    const eyeIconOpen = document.getElementById('eyeIconOpenForSpeakerKey');

    if (spkKeyInput.type === 'password') {
        spkKeyInput.type = 'text';
        eyeIconClosed.classList.add('hidden');
        eyeIconOpen.classList.remove('hidden');
    } else {
        spkKeyInput.type = 'password';
        eyeIconClosed.classList.remove('hidden');
        eyeIconOpen.classList.add('hidden');
    }
}

// Function to update temperature input from slider
function updateSpeakerRateValue(value) {
    document.getElementById('spkRateValue').value = value;
}

// Function to update slider from input
function updateSpeakerRateSlider(value) {
    value = Math.max(0, Math.min(2, value));
    document.getElementById('spkRateSlider').value = value;
}

// Reset temperature to default
function resetSpeakerRate() {
    document.getElementById('spkRateSlider').value = 0.7;
    document.getElementById('spkRateValue').value = 0.7;
}
