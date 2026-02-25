// anki/anki.js - Complete with queue integration
console.log('✅ anki.js loaded');

let lastDefinition = '';
let panelOpen = false;
const ANKI_CONNECT_URL = 'http://localhost:8765';

// Create notification container
function createNotificationContainer() {
    let container = document.getElementById('anki-notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'anki-notification-container';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }
    return container;
}

// Show notification
function showNotification(message, type = 'success') {
    const container = createNotificationContainer();
    const notification = document.createElement('div');
    
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        info: '#2196F3',
        warning: '#ff9800'
    };
    
    notification.style.cssText = `
        background: ${colors[type] || colors.info};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 8px;
        animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
        max-width: 300px;
        pointer-events: none;
    `;
    
    const icon = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    
    notification.innerHTML = `${icon[type] || '📢'} ${message}`;
    container.appendChild(notification);
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeOut {
            to { opacity: 0; transform: translateX(100%); }
        }
    `;
    document.head.appendChild(style);
    
    // Remove after animation
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Anki-Connect API functions
async function ankiRequest(action, params = {}) {
    try {
        const response = await fetch(ANKI_CONNECT_URL, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                action: action,
                version: 6,
                params: params
            })
        });
        
        if (!response.ok) return null;
        const data = await response.json();
        return data.error ? null : data.result;
    } catch (error) {
        console.error('Anki connection failed:', error);
        return null;
    }
}

// Listen for number key copies
document.addEventListener('anki:definitionCopied', function(e) {
    lastDefinition = e.detail.definition;
    chrome.storage.local.set({ lastBack: lastDefinition });
    console.log('📋 Definition stored');
});

// Listen for click copies
document.addEventListener('anki:wordClicked', function(e) {
    lastDefinition = e.detail.definition;
    chrome.storage.local.set({ lastBack: lastDefinition });
    console.log('📋 Definition stored (from click)');
});

// Listen for panel open/close messages
chrome.runtime.onMessage.addListener(function(request) {
    if (request.action === 'panelOpened') panelOpen = true;
    if (request.action === 'panelClosed') panelOpen = false;
});

// Listen for shortcuts
document.addEventListener('keydown', function(event) {
    console.log('🔑 Key pressed:', event.code, 'Ctrl:', event.ctrlKey, 'Shift:', event.shiftKey);
    
    // Ctrl+Space - Quick save or save from panel
    if (event.code === 'Space' && event.ctrlKey && !event.shiftKey && !event.altKey) {
        console.log('🎯 Ctrl+Space DETECTED!');
        event.preventDefault();
        event.stopPropagation();
        
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        console.log('Selected text:', selectedText || '(none)');
        
        chrome.storage.local.get(['lastFront', 'lastBack'], async function(result) {
            const front = selectedText || result.lastFront || '';
            const back = result.lastBack || lastDefinition || '';
            console.log('Front:', front, 'Back:', back, 'Panel open:', panelOpen);
            
            if (panelOpen) {
                // If panel is open, send save message to panel
                console.log('Sending saveFromPanel message');
                chrome.runtime.sendMessage({ action: 'saveFromPanel' });
            } else if (front && back) {
                // Both fields populated - quick save using queue
                console.log('Both fields ready - attempting quick save');
                const decks = await ankiRequest('deckNames') || ['Arabic Vocabulary'];
                const defaultDeck = decks.includes('Arabic Vocabulary') ? 'Arabic Vocabulary' : decks[0];
                
                if (window.ankiQueue) {
                    const result = await window.ankiQueue.addToQueue({ 
                        front, back, 
                        deck: defaultDeck, 
                        tags: ['arabic', 'from-web'] 
                    });
                    console.log('Quick save result:', result);
                    if (result.queued) {
                        showNotification('📦 Card queued - will sync when Anki available', 'info');
                    }
                } else {
                    // Fallback if queue not loaded
                    const result = await ankiRequest('addNote', {
                        note: {
                            deckName: defaultDeck,
                            modelName: 'Basic',
                            fields: { Front: front, Back: back },
                            tags: ['arabic', 'from-web']
                        }
                    });
                    if (result) {
                        showNotification('✅ Card saved to Anki!', 'success');
                    } else {
                        showNotification('❌ Failed to save - Anki not running?', 'error');
                    }
                }
            } else {
                // Missing fields - open panel
                console.log('Missing fields - opening panel');
                chrome.storage.local.set({ lastFront: front }, function() {
                    chrome.runtime.sendMessage({ action: 'openPopup' });
                    showNotification('✏️ Edit your card in the panel', 'info');
                });
            }
        });
    }
    
    // Ctrl+Shift+B - Always open panel
    if (event.code === 'KeyB' && event.ctrlKey && event.shiftKey && !event.altKey) {
        console.log('🎯 Ctrl+Shift+B DETECTED!');
        event.preventDefault();
        
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        chrome.storage.local.set({ lastFront: selectedText }, function() {
            chrome.runtime.sendMessage({ action: 'openPopup' });
        });
    }
});

// Message listener for panel
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('📨 Message received in anki.js:', request);
    
    if (request.action === 'ankiPing') {
        ankiRequest('requestPermission').then(result => {
            sendResponse({ connected: result && result.permission === 'granted' });
        });
        return true;
    }
    
    if (request.action === 'getDecks') {
        ankiRequest('deckNames').then(decks => {
            sendResponse({ decks: decks || [] });
        });
        return true;
    }
    
    if (request.action === 'addNote') {
        // Use the queue system instead of direct save
        if (window.ankiQueue) {
            window.ankiQueue.addToQueue({
                front: request.front,
                back: request.back,
                deck: request.deck,
                tags: request.tags
            }).then(result => {
                sendResponse(result);
            });
        } else {
            // Fallback to direct save
            ankiRequest('addNote', {
                note: {
                    deckName: request.deck,
                    modelName: 'Basic',
                    fields: { Front: request.front, Back: request.back },
                    tags: request.tags
                }
            }).then(result => {
                sendResponse({ success: !!result });
            });
        }
        return true;
    }
    
    if (request.action === 'getQueueStatus') {
        if (window.ankiQueue) {
            window.ankiQueue.getStatus().then(status => sendResponse(status));
        } else {
            sendResponse({ queued: 0, isOnline: navigator.onLine });
        }
        return true;
    }
    
    if (request.action === 'syncQueue') {
        if (window.ankiQueue) {
            window.ankiQueue.processQueue().then(result => sendResponse(result));
        } else {
            sendResponse({ synced: 0, remaining: 0 });
        }
        return true;
    }
    
    return true;
});

// Load queue system at the end
console.log('📦 Loading queue system...');
const queueScript = document.createElement('script');
queueScript.src = chrome.runtime.getURL('anki/anki-queue.js');
queueScript.onload = () => console.log('✅ Queue system loaded');
queueScript.onerror = (e) => console.error('❌ Failed to load queue system:', e);
document.head.appendChild(queueScript);