/**
 * Renderer process
 * Only deal with chat response
 */

// DOM Elements
const chatResponseArea = document.getElementById('chatResponseArea');
const loadingIndicator = document.getElementById('loadingIndicator');

function showProgress() {
    loadingIndicator.classList.remove('hidden');
}

function hideProgress() {
    loadingIndicator.classList.add('hidden');
}

// Simulate cursor
function createCursor() {
    const cursor = document.createElement('span');
    cursor.id = 'cursor';
    // Using Tailwind CSS classes (e.g., "ml-2" adds a small left margin)
    cursor.className = 'inline-block align-text-bottom ml-1 bg-neutral-700 dark:bg-neutral-400 w-0.5 h-5 animate-blink';
    return cursor;
}

function removeCursor() {
    const cursor = document.getElementById('cursor');
    if (cursor) cursor.remove();
}

// Updated renderer.js
let messageContainer = null;
// Keep track of the full text so far
let accumulatedText = '';

function initChatResponse() {
    chatResponseArea.innerHTML = '';
    messageContainer = document.createElement('div');
    messageContainer.className = 'min-h-6 relative whitespace-pre-wrap break-words leading-6';
    chatResponseArea.appendChild(messageContainer);
    accumulatedText = ''; // Reset text

    // Add cursor
    removeCursor();
    messageContainer.appendChild(createCursor());
}


// Simulate chat response
function showChatResponse(text) {
    // Remove existing cursor
    removeCursor();

    // Add new text to accumulated text
    accumulatedText += text;
    // Update the text content (replace instead of append)
    messageContainer.textContent = accumulatedText;

    // Add cursor back
    messageContainer.appendChild(createCursor());

    // Scroll with small delay
    setTimeout(() => {
        chatResponseArea.scrollTop = chatResponseArea.scrollHeight;
    }, 10);
}

function clearChatResponse() {
    initChatResponse();
}

/**
 * Testing only
 */
function simulateChatResponse(text) {
    // Remove existing cursor
    clearChatResponse();

    let i = 0;
    const typingInterval = setInterval(() => {
        if (i < text.length) {
            showChatResponse(text.charAt(i));
            i++;
        } else {
            clearInterval(typingInterval);

            // don't remove cursor, tell what user should do
            //removeCursor();
        }
    }, 0);
}

document.addEventListener('DOMContentLoaded', async () => {
    // Listen for shortcut events from main process
    window.api.startProgress(() => {
        showProgress();
    });
    window.api.completeProgress(() => {
        hideProgress();
    });

    window.api.beginMessage(() => {
        clearChatResponse();
    });

    // Generate new essage
    window.api.generateMessage((text) => {
        showChatResponse(text);
    });

    // Complete message
    window.api.completeMessage(() => {
        removeCursor();
        hideProgress();
        window.api.playTTS(accumulatedText);
    });

    // Focus the chat area on load
    window.addEventListener('load', () => {
        //chatResponseArea.focus();

    });

    // Listen for theme changes
    window.api.onThemeChange((theme) => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    });
});



