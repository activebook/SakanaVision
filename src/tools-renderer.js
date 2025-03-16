
/**
 * Tooltip setup
 * left tooltip (info button)
 * right tooltip (question button)
 * Positioned tooltips directly above each button instead of centering them
 * Added directional positioning for the arrow tips to point to their respective buttons
 * Tooltips disappearing on mouseout
 */

const infoButton = document.getElementById('infoButton');
const questionButton = document.getElementById('questionButton');

// Variables to store timeout IDs
let infoTimeoutId;
let questionTimeoutId;
let tipTimeout = 4000;

function setTooltipMessage(tooltipTitleId, tooltipId, title, message) {
    const tooltipTitle = document.getElementById(tooltipTitleId);
    const tooltip = document.getElementById(tooltipId);
    //window.debug.log('Setting tooltip message:' , message);

    // Find or create the message span
    /*
    let messageSpan = tooltip.querySelector('.tooltip-message');
    if (!messageSpan) {
        messageSpan = document.createElement('span');
        messageSpan.className = 'tooltip-message';
        tooltip.insertBefore(messageSpan, tooltip.firstChild);
    }
    messageSpan.textContent = message;
    */
    tooltipTitle.textContent = title;
    tooltip.textContent = message;
}

function setupTooltip(buttonId, tooltipId, timeoutId, timeout) {
    const button = document.getElementById(buttonId);
    const tooltip = document.getElementById(tooltipId);
    button.addEventListener('click', function () {
        tooltip.classList.remove('hidden');

        // Clear any existing timeout
        clearTimeout(timeoutId);

        // Hide tooltip after 5 seconds
        timeoutId = setTimeout(function () {
            tooltip.classList.add('hidden');
        }, timeout);
    });
    button.addEventListener('mouseout', function () {
        tooltip.classList.add('hidden');
        clearTimeout(timeoutId);
    });
}

//setupTooltip('infoButton', 'infoTooltip', infoTimeoutId, tipTimeout);
//setupTooltip('questionButton', 'questionTooltip', questionTimeoutId, tipTimeout);

document.addEventListener('DOMContentLoaded', async () => {
    const config = await window.api.getConfig();
    //setTooltipMessage('infoTooltip', config.tips.info);
    //window.debug.log('Config:', config);
    setTooltipMessage('questionTooltipTitle', 'questionTooltip', config.TIPS.HOWTO.TITLE, config.TIPS.HOWTO.CONTENT);

    // Tell what user should do
    const tips = config.TIPS.INFO.CONTENT + "\n" + config.TIPS.HOWTO.TITLE + "\n" + config.TIPS.HOWTO.CONTENT;
    simulateChatResponse(tips);
});