// anki/anki.js - Complete with queue integration, floating plus, fallback detection, and optimizations
console.log('🔥🔥🔥 ANKI.JS LOADED - OPTIMIZED VERSION 🔥🔥🔥');

let lastDefinition = '';
let lastCopiedWord = '';
let panelOpen = false;
let floatingPlus = null;
let plusTimeout = null;
let lastSelectionAttempt = null;
let fallbackButton = null;
let selectionCheckInterval = null;
const ANKI_CONNECT_URL = 'http://localhost:8765';

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Track definition copies
document.addEventListener('anki:definitionCopied', function(e) {
    lastDefinition = e.detail.definition;
    lastCopiedWord = e.detail.word || '';
    chrome.storage.local.set({ lastBack: lastDefinition });
});

document.addEventListener('anki:wordClicked', function(e) {
    lastDefinition = e.detail.definition;
    lastCopiedWord = e.detail.word || '';
    chrome.storage.local.set({ lastBack: lastDefinition });
});

// ===== FALLBACK DETECTION =====

// Check if we can access selection
function canAccessSelection() {
    try {
        const selection = window.getSelection();
        return !!selection.toString().trim();
    } catch (e) {
        return false;
    }
}

// Check if we're in a problematic context
function detectSelectionContext() {
    const activeElement = document.activeElement;
    
    // Check for iframe
    if (window !== window.top) {
        return { canShow: false, reason: 'iframe', message: 'Inside an iframe' };
    }
    
    // Check for contenteditable
    if (activeElement && activeElement.isContentEditable) {
        return { canShow: true, reason: 'contenteditable', message: 'Editable field' };
    }
    
    // Check for shadow DOM
    if (activeElement && activeElement.shadowRoot) {
        return { canShow: false, reason: 'shadow-dom', message: 'Inside Shadow DOM' };
    }
    
    // Check for canvas
    if (activeElement && activeElement.tagName === 'CANVAS') {
        return { canShow: false, reason: 'canvas', message: 'Canvas element' };
    }
    
    // Check for SVG
    if (activeElement && activeElement.namespaceURI === 'http://www.w3.org/2000/svg') {
        return { canShow: false, reason: 'svg', message: 'SVG element' };
    }
    
    return { canShow: true, reason: 'normal', message: 'Normal HTML' };
}

// Create fallback button
function createFallbackButton(text) {
    removeFallbackButton();
    
    fallbackButton = document.createElement('div');
    fallbackButton.id = 'anki-fallback-button';
    fallbackButton.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; justify-content: center;">
            <span>📌</span>
            <span>Save selection to Anki</span>
            <span style="font-size: 11px; opacity: 0.7; background: rgba(0,0,0,0.2); padding: 2px 8px; border-radius: 12px;">
                Plus not available
            </span>
        </div>
    `;
    fallbackButton.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 14px 28px;
        border-radius: 50px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 15px;
        font-weight: 500;
        box-shadow: 0 10px 30px rgba(102, 126, 234, 0.5);
        z-index: 10000002;
        cursor: pointer;
        animation: slideUpFancy 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        border: 2px solid rgba(255,255,255,0.3);
        backdrop-filter: blur(10px);
        max-width: 90%;
        text-align: center;
        letter-spacing: 0.3px;
        user-select: none;
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        will-change: transform, box-shadow;
    `;
    
    fallbackButton.addEventListener('mouseenter', () => {
        fallbackButton.style.transform = 'translateX(-50%) scale(1.05)';
        fallbackButton.style.boxShadow = '0 15px 40px rgba(102, 126, 234, 0.7)';
        fallbackButton.style.background = 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)';
    });
    
    fallbackButton.addEventListener('mouseleave', () => {
        fallbackButton.style.transform = 'translateX(-50%) scale(1)';
        fallbackButton.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.5)';
        fallbackButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    });
    
    fallbackButton.addEventListener('click', async () => {
        if (text && lastDefinition) {
            fallbackButton.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span>⏳</span>
                    <span>Saving...</span>
                </div>
            `;
            fallbackButton.style.opacity = '0.8';
            fallbackButton.style.pointerEvents = 'none';
            
            chrome.storage.local.get(['lastUsedDeck'], async function(result) {
                const deck = result.lastUsedDeck || 'Arabic Vocabulary';
                
                if (window.ankiQueue) {
                    await window.ankiQueue.addToQueue({ 
                        front: text, 
                        back: lastDefinition, 
                        deck: deck, 
                        tags: ['arabic', 'from-web'] 
                    });
                    showNotification(`📦 Card queued to ${deck}`, 'info');
                }
                removeFallbackButton();
            });
        }
    });
    
    document.body.appendChild(fallbackButton);
    
    setTimeout(() => {
        removeFallbackButton();
    }, 8000);
}

function removeFallbackButton() {
    if (fallbackButton) {
        fallbackButton.remove();
        fallbackButton = null;
    }
}

// Monitor selection periodically for problematic contexts
function startSelectionMonitoring() {
    if (selectionCheckInterval) clearInterval(selectionCheckInterval);
    
    selectionCheckInterval = setInterval(() => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText && lastDefinition && !panelOpen) {
            const context = detectSelectionContext();
            
            if (!context.canShow) {
                try {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    
                    if (rect.width > 0 && rect.height > 0) {
                        createFallbackButton(selectedText);
                    }
                } catch (e) {
                    createFallbackButton(selectedText);
                }
            }
        } else {
            removeFallbackButton();
        }
    }, 500);
}

startSelectionMonitoring();

// ===== FLOATING PLUS ICON FUNCTIONS =====

// Create floating plus icon - CLOSER to text
function createFloatingPlus(x, y) {
    removeFloatingPlus();
    
    floatingPlus = document.createElement('div');
    floatingPlus.id = 'anki-floating-plus';
    floatingPlus.setAttribute('data-tooltip', 'Save to Anki');
    floatingPlus.innerHTML = '➕';
    floatingPlus.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        color: white;
        cursor: pointer;
        box-shadow: 0 4px 10px rgba(102, 126, 234, 0.4);
        z-index: 10000001;
        transition: all 0.2s ease;
        animation: plusPop 0.2s ease;
        border: 2px solid rgba(255, 255, 255, 0.3);
        pointer-events: auto;
    `;
    
    floatingPlus.addEventListener('mouseenter', () => {
        floatingPlus.style.transform = 'scale(1.1)';
        floatingPlus.style.boxShadow = '0 6px 15px rgba(102, 126, 234, 0.6)';
    });
    
    floatingPlus.addEventListener('mouseleave', () => {
        floatingPlus.style.transform = 'scale(1)';
        floatingPlus.style.boxShadow = '0 4px 10px rgba(102, 126, 234, 0.4)';
    });
    
    floatingPlus.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        floatingPlus.innerHTML = '⏳';
        floatingPlus.style.pointerEvents = 'none';
        floatingPlus.style.opacity = '0.8';
        
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (!selectedText) {
            showNotification('⚠️ No text selected', 'error');
            removeFloatingPlus();
            return;
        }
        
        if (!lastDefinition) {
            showNotification('⚠️ Copy a word first (press 1-9)', 'error');
            removeFloatingPlus();
            return;
        }
        
        chrome.storage.local.get(['lastUsedDeck'], async function(result) {
            const deck = result.lastUsedDeck || 'Arabic Vocabulary';
            
            if (window.ankiQueue) {
                await window.ankiQueue.addToQueue({ 
                    front: selectedText, 
                    back: lastDefinition, 
                    deck: deck, 
                    tags: ['arabic', 'from-web'] 
                });
                showNotification(`📦 Card queued to ${deck}`, 'info');
            }
            
            removeFloatingPlus();
        });
    });
    
    plusTimeout = setTimeout(() => {
        removeFloatingPlus();
    }, 3000);
    
    document.body.appendChild(floatingPlus);
}

function removeFloatingPlus() {
    if (floatingPlus) {
        floatingPlus.remove();
        floatingPlus = null;
    }
    if (plusTimeout) {
        clearTimeout(plusTimeout);
        plusTimeout = null;
    }
}

// Debounced mouseup handler for better performance
const debouncedMouseUp = debounce(function(e) {
    if (e.target.id === 'anki-floating-plus' || e.target.id === 'anki-fallback-button') return;
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText && lastDefinition && !panelOpen) {
        const context = detectSelectionContext();
        
        if (context.canShow) {
            try {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                
                if (rect.width > 0 && rect.height > 0) {
                    // CLOSER POSITION: right edge + 5px, top edge - 15px
                    const x = rect.right + window.scrollX + 5;
                    const y = rect.top + window.scrollY - 15;
                    createFloatingPlus(x, y);
                }
            } catch (e) {
                createFallbackButton(selectedText);
            }
        } else {
            createFallbackButton(selectedText);
        }
    } else {
        removeFloatingPlus();
        removeFallbackButton();
    }
}, 150); // 150ms debounce

document.addEventListener('mouseup', debouncedMouseUp);

document.addEventListener('mousedown', function(e) {
    if (e.target.id !== 'anki-floating-plus' && e.target.id !== 'anki-fallback-button') {
        removeFloatingPlus();
    }
});

window.addEventListener('scroll', () => {
    removeFloatingPlus();
});

// Animation styles
const animStyle = document.createElement('style');
animStyle.textContent = `
    @keyframes plusPop {
        0% { transform: scale(0); opacity: 0; }
        80% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
    }
    
    @keyframes slideUpFancy {
        0% { opacity: 0; transform: translate(-50%, 50px); }
        100% { opacity: 1; transform: translate(-50%, 0); }
    }
`;
document.head.appendChild(animStyle);

// ===== END FLOATING PLUS ICON FUNCTIONS =====

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
        padding: 10px 18px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 8px;
        animation: slideIn 0.2s ease, fadeOut 0.2s ease 2.3s forwards;
        max-width: 280px;
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
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 2500);
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

// Listen for panel open/close messages
chrome.runtime.onMessage.addListener(function(request) {
    if (request.action === 'panelOpened') {
        panelOpen = true;
        removeFloatingPlus();
        removeFallbackButton();
    }
    if (request.action === 'panelClosed') panelOpen = false;
});

// Listen for shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl+Space - Quick save or save from panel
    if (event.code === 'Space' && event.ctrlKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        event.stopPropagation();
        
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        chrome.storage.local.get(['lastFront', 'lastBack', 'lastUsedDeck'], async function(result) {
            const front = selectedText || result.lastFront || '';
            const back = result.lastBack || lastDefinition || '';
            
            if (panelOpen) {
                chrome.runtime.sendMessage({ action: 'saveFromPanel' });
            } else if (front && back) {
                const decks = await ankiRequest('deckNames') || ['Arabic Vocabulary'];
                
                let targetDeck = result.lastUsedDeck;
                if (!targetDeck || !decks.includes(targetDeck)) {
                    targetDeck = decks.includes('Arabic Vocabulary') ? 'Arabic Vocabulary' : decks[0];
                }
                
                chrome.storage.local.set({ lastUsedDeck: targetDeck });
                
                if (window.ankiQueue) {
                    await window.ankiQueue.addToQueue({ 
                        front, back, 
                        deck: targetDeck, 
                        tags: ['arabic', 'from-web'] 
                    });
                    showNotification(`📦 Card queued to ${targetDeck}`, 'info');
                } else {
                    const result = await ankiRequest('addNote', {
                        note: {
                            deckName: targetDeck,
                            modelName: 'Basic',
                            fields: { Front: front, Back: back },
                            tags: ['arabic', 'from-web']
                        }
                    });
                    if (result) {
                        showNotification(`✅ Card saved to ${targetDeck}`, 'success');
                    }
                }
                
                removeFloatingPlus();
                removeFallbackButton();
            } else {
                chrome.storage.local.set({ lastFront: front }, function() {
                    chrome.runtime.sendMessage({ action: 'openPopup' });
                });
            }
        });
    }
    
    // Ctrl+Shift+Q - Always queue
    if (event.code === 'KeyQ' && event.ctrlKey && event.shiftKey && !event.altKey) {
        event.preventDefault();
        
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText && lastDefinition) {
            chrome.storage.local.get(['lastUsedDeck'], async function(result) {
                const deck = result.lastUsedDeck || 'Arabic Vocabulary';
                
                if (window.ankiQueue) {
                    await window.ankiQueue.addToQueue({ 
                        front: selectedText, 
                        back: lastDefinition, 
                        deck: deck, 
                        tags: ['arabic', 'from-web'] 
                    });
                    showNotification(`📦 Card queued to ${deck}`, 'info');
                    removeFloatingPlus();
                    removeFallbackButton();
                }
            });
        }
    }
    
    // Ctrl+Shift+B - Always open panel
    if (event.code === 'KeyB' && event.ctrlKey && event.shiftKey && !event.altKey) {
        event.preventDefault();
        
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        chrome.storage.local.set({ lastFront: selectedText }, function() {
            chrome.runtime.sendMessage({ action: 'openPopup' });
            removeFloatingPlus();
            removeFallbackButton();
        });
    }
});

// Message listener for panel
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
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

// Load queue system
console.log('📦 Loading queue system...');
const queueScript = document.createElement('script');
queueScript.src = chrome.runtime.getURL('anki/anki-queue.js');
queueScript.onload = () => console.log('✅ Queue system loaded');
queueScript.onerror = (e) => console.error('❌ Failed to load queue system:', e);
document.head.appendChild(queueScript);