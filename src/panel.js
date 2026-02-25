// panel.js
console.log('✅ Panel loaded');

let ankiConnected = false;
let availableDecks = [];

// Get elements
const frontBox = document.getElementById('frontBox');
const backBox = document.getElementById('backBox');
const tagInput = document.getElementById('tagInput');
const tagsList = document.getElementById('tagsList');
const deckSelect = document.getElementById('deckSelect');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const statusDiv = document.getElementById('status');
const queueStatus = document.getElementById('queueStatus');
const queueCount = document.getElementById('queueCount');
const queueText = document.getElementById('queueText');
const syncBtn = document.getElementById('syncNow');

// Tag management
let tags = ['arabic'];

// Notify that panel is open
chrome.runtime.sendMessage({ action: 'panelOpened' });

// Notify when panel closes
window.addEventListener('beforeunload', function() {
    chrome.runtime.sendMessage({ action: 'panelClosed' });
});

// Load saved data and check Anki connection
chrome.storage.local.get(['lastFront', 'lastBack', 'lastUsedDeck'], function(result) {
    if (result.lastFront) {
        frontBox.innerHTML = result.lastFront;
    } else {
        frontBox.innerHTML = '<span class="empty">No text selected</span>';
    }
    
    if (result.lastBack) {
        backBox.innerHTML = result.lastBack.replace(/\n/g, '<br>');
    } else {
        backBox.innerHTML = '<span class="empty">No definition copied</span>';
    }
    
    console.log('📂 Remembered deck:', result.lastUsedDeck);
    
    checkAnkiConnection();
    loadDecks(result.lastUsedDeck);
    updateQueueStatus();
});

// Check if Anki is running
function checkAnkiConnection() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs && tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'ankiPing' }, function(response) {
                ankiConnected = response && response.connected;
                if (!ankiConnected) {
                    showStatus('⚠️ Anki not running - cards will be queued', 'info');
                }
            });
        }
    });
}

// Load decks from Anki
function loadDecks(rememberedDeck) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs && tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getDecks' }, function(response) {
                if (response && response.decks && response.decks.length > 0) {
                    availableDecks = response.decks;
                    updateDeckSelect(rememberedDeck);
                }
            });
        }
    });
}

// Update deck selector with available decks and select remembered one
function updateDeckSelect(rememberedDeck) {
    deckSelect.innerHTML = '';
    availableDecks.forEach(deck => {
        const option = document.createElement('option');
        option.value = deck;
        option.textContent = deck;
        
        // Select if it's the remembered deck, or default to Arabic Vocabulary
        if (rememberedDeck === deck) {
            option.selected = true;
            console.log('🎯 Selected remembered deck:', deck);
        } else if (!rememberedDeck && deck === 'Arabic Vocabulary') {
            option.selected = true;
            console.log('📚 Defaulting to Arabic Vocabulary');
        }
        
        deckSelect.appendChild(option);
    });
}

// ===== NEW: When deck selection changes, remember it immediately =====
deckSelect.addEventListener('change', function() {
    const selectedDeck = this.value;
    chrome.storage.local.set({ lastUsedDeck: selectedDeck }, function() {
        console.log('💾 Deck updated immediately:', selectedDeck);
        showStatus(`✅ Default deck set to: ${selectedDeck}`, 'success');
    });
});

// Show status message
function showStatus(message, type = 'success') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 3000);
}

// Handle empty state for front box
frontBox.addEventListener('focus', function() {
    if (this.querySelector('.empty')) this.innerHTML = '';
});

frontBox.addEventListener('blur', function() {
    if (this.innerText.trim() === '') {
        this.innerHTML = '<span class="empty">No text selected</span>';
    }
});

// Handle empty state for back box
backBox.addEventListener('focus', function() {
    if (this.querySelector('.empty')) this.innerHTML = '';
});

backBox.addEventListener('blur', function() {
    if (this.innerText.trim() === '') {
        this.innerHTML = '<span class="empty">No definition copied</span>';
    }
});

// Render tags
function renderTags() {
    tagsList.innerHTML = tags.map(tag => 
        `<span class="tag">
            ${tag}
            <button onclick="removeTag('${tag}')" title="Remove tag">×</button>
        </span>`
    ).join('');
}

window.removeTag = function(tag) {
    tags = tags.filter(t => t !== tag);
    renderTags();
};

// Add tag on Enter
tagInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const newTag = this.value.trim();
        if (newTag && !tags.includes(newTag)) {
            tags.push(newTag);
            renderTags();
            this.value = '';
        }
    }
});

// Add tag on comma
tagInput.addEventListener('keyup', function(e) {
    if (e.key === ',') {
        const value = this.value.slice(0, -1).trim();
        if (value && !tags.includes(value)) {
            tags.push(value);
            renderTags();
            this.value = '';
        }
    }
});

// Listen for save from background
chrome.runtime.onMessage.addListener(function(request) {
    if (request.action === 'saveFromPanel') {
        saveCard();
    }
});

// Save card function
function saveCard() {
    const front = frontBox.innerText.replace('No text selected', '').trim();
    const back = backBox.innerText.replace('No definition copied', '').trim();
    const deck = deckSelect.value;
    
    if (!front || !back) {
        showStatus('⚠️ Both fields are required', 'error');
        return;
    }
    
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span>⏳</span> Saving...';
    
    // Remember this deck for future quick saves (already done by change event, but keep for safety)
    chrome.storage.local.set({ lastUsedDeck: deck });
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs && tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'addNote',
                front: front,
                back: back,
                deck: deck,
                tags: tags
            }, function(response) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<span>💾</span> Save to Anki';
                
                if (response && response.success) {
                    showStatus('✅ Card saved to Anki!', 'success');
                    chrome.storage.local.remove(['lastFront', 'lastBack']);
                    setTimeout(() => window.close(), 1500);
                } else if (response && response.queued) {
                    showStatus('📦 Card queued - will sync when Anki available', 'info');
                    updateQueueStatus();
                    setTimeout(() => window.close(), 1500);
                } else {
                    showStatus('❌ Save failed - card queued for retry', 'info');
                    updateQueueStatus();
                }
            });
        }
    });
}

// Save button click
saveBtn.addEventListener('click', saveCard);

// Cancel button
cancelBtn.addEventListener('click', function() {
    window.close();
});

// Listen for Ctrl+Space in panel
document.addEventListener('keydown', function(event) {
    if (event.code === 'Space' && event.ctrlKey && !event.shiftKey && !event.altKey) {
        console.log('🎯 Ctrl+Space in panel detected');
        event.preventDefault();
        saveCard();
    }
});

// ===== QUEUE STATUS FUNCTIONS =====

// Update queue status display
async function updateQueueStatus() {
    chrome.runtime.sendMessage({ action: 'getQueueStatus' }, (response) => {
        if (response && response.queued > 0) {
            queueCount.textContent = response.queued;
            queueText.textContent = response.queued === 1 ? 'card waiting to sync' : 'cards waiting to sync';
            queueStatus.style.display = 'flex';
            
            // Update based on online status
            if (!response.isOnline) {
                queueStatus.classList.add('offline');
                syncBtn.textContent = 'Offline';
                syncBtn.disabled = true;
            } else {
                queueStatus.classList.remove('offline');
                syncBtn.textContent = 'Sync Now';
                syncBtn.disabled = false;
            }
        } else {
            queueStatus.style.display = 'none';
        }
    });
}

// Manual sync button handler
if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
        const originalText = syncBtn.textContent;
        
        syncBtn.textContent = 'Syncing...';
        syncBtn.disabled = true;
        
        chrome.runtime.sendMessage({ action: 'syncQueue' }, (result) => {
            if (result && result.synced > 0) {
                showStatus(`✅ Synced ${result.synced} card${result.synced > 1 ? 's' : ''} to Anki`, 'success');
            }
            updateQueueStatus();
            syncBtn.textContent = originalText;
            syncBtn.disabled = false;
        });
    });
}

// Update queue status every 30 seconds while panel is open
setInterval(updateQueueStatus, 30000);

// ===== END QUEUE STATUS FUNCTIONS =====

// Initialize
renderTags();