// anki/anki-queue.js - Offline queue system
console.log('📦 Queue system loaded');

class AnkiQueue {
    constructor() {
        this.QUEUE_KEY = 'ankiOfflineQueue';
        this.STATS_KEY = 'ankiQueueStats';
        this.MAX_RETRIES = 5;
        this.RETRY_DELAY = 5 * 60 * 1000; // 5 minutes
        this.BATCH_SIZE = 10; // Send 10 cards at a time
        this.ANKI_CONNECT_URL = 'http://localhost:8765';
        
        // Initialize
        this.initQueue();
        this.setupListeners();
        this.setupAlarm();
        
        // Make globally available
        window.ankiQueue = this;
    }
    
    // Initialize queue in storage
    async initQueue() {
        const result = await chrome.storage.local.get([this.QUEUE_KEY, this.STATS_KEY]);
        if (!result[this.QUEUE_KEY]) {
            await chrome.storage.local.set({ 
                [this.QUEUE_KEY]: [],
                [this.STATS_KEY]: {
                    totalQueued: 0,
                    totalSynced: 0,
                    failed: [],
                    lastSyncAttempt: null
                }
            });
        }
        this.queue = result[this.QUEUE_KEY] || [];
        this.stats = result[this.STATS_KEY] || {
            totalQueued: 0,
            totalSynced: 0,
            failed: [],
            lastSyncAttempt: null
        };
        console.log(`📊 Queue loaded: ${this.queue.length} pending cards`);
    }
    
    // Set up online/offline listeners
    setupListeners() {
        window.addEventListener('online', () => {
            console.log('🌐 Connection restored - attempting sync');
            this.processQueue();
            this.showNotification('🔄 Connection restored - syncing cards...', 'info');
        });
        
        // Listen for manual sync requests
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'syncQueue') {
                this.processQueue().then(result => sendResponse(result));
                return true;
            }
            if (request.action === 'getQueueStatus') {
                this.getStatus().then(status => sendResponse(status));
                return true;
            }
        });
    }
    
    // Set up periodic sync alarm
    setupAlarm() {
        chrome.alarms.create('ankiQueueSync', {
            periodInMinutes: 15 // Try every 15 minutes
        });
        
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'ankiQueueSync') {
                console.log('⏰ Periodic sync check');
                this.processQueue();
            }
        });
    }
    
    // Add card to queue
    async addToQueue(card) {
        const queueEntry = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            front: card.front,
            back: card.back,
            deck: card.deck,
            tags: card.tags || ['arabic', 'from-web'],
            timestamp: Date.now(),
            retries: 0,
            lastAttempt: null,
            error: null
        };
        
        this.queue.push(queueEntry);
        this.stats.totalQueued++;
        
        await this.saveQueue();
        
        console.log(`📥 Card queued (${this.queue.length} total)`);
        
        // Try to process immediately
        this.processQueue();
        
        return { queued: true, queueId: queueEntry.id };
    }
    
    // Process queue - send cards to Anki
    async processQueue() {
        if (this.queue.length === 0) {
            console.log('📪 Queue empty');
            return { synced: 0, remaining: 0 };
        }
        
        if (!navigator.onLine) {
            console.log('📴 Offline - cannot sync');
            return { synced: 0, remaining: this.queue.length, offline: true };
        }
        
        // Check if Anki is reachable
        const ankiOnline = await this.pingAnki();
        if (!ankiOnline) {
            console.log('🔄 Anki not running - will retry later');
            this.stats.lastSyncAttempt = Date.now();
            await this.saveQueue();
            return { synced: 0, remaining: this.queue.length, ankiOffline: true };
        }
        
        console.log(`📤 Processing queue (${this.queue.length} cards)`);
        
        let synced = 0;
        let failed = [];
        let batch = this.queue.slice(0, this.BATCH_SIZE);
        
        for (let card of batch) {
            try {
                const result = await this.sendToAnki(card);
                if (result) {
                    synced++;
                    this.stats.totalSynced++;
                    // Remove from queue
                    this.queue = this.queue.filter(c => c.id !== card.id);
                } else {
                    card.retries++;
                    card.lastAttempt = Date.now();
                    if (card.retries >= this.MAX_RETRIES) {
                        // Move to failed permanently
                        this.stats.failed.push(card);
                        this.queue = this.queue.filter(c => c.id !== card.id);
                    }
                }
            } catch (error) {
                console.error('Failed to sync card:', card.id, error);
                card.error = error.message;
                card.retries++;
                card.lastAttempt = Date.now();
            }
        }
        
        this.stats.lastSyncAttempt = Date.now();
        await this.saveQueue();
        
        // Show notification
        if (synced > 0) {
            this.showNotification(`✅ Synced ${synced} card${synced > 1 ? 's' : ''} to Anki`, 'success');
        }
        
        // If there are more cards, continue processing
        if (this.queue.length > 0) {
            setTimeout(() => this.processQueue(), 2000); // Process next batch
        }
        
        return {
            synced,
            remaining: this.queue.length,
            failed: this.stats.failed.length
        };
    }
    
    // Test Anki connection
    async pingAnki() {
        try {
            const response = await fetch(this.ANKI_CONNECT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'requestPermission',
                    version: 6
                })
            });
            const data = await response.json();
            return data.result && data.result.permission === 'granted';
        } catch {
            return false;
        }
    }
    
    // Send single card to Anki
    async sendToAnki(card) {
        const response = await fetch(this.ANKI_CONNECT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'addNote',
                version: 6,
                params: {
                    note: {
                        deckName: card.deck,
                        modelName: 'Basic',
                        fields: {
                            Front: card.front,
                            Back: card.back
                        },
                        tags: card.tags
                    }
                }
            })
        });
        
        const data = await response.json();
        return !data.error;
    }
    
    // Save queue to storage
    async saveQueue() {
        await chrome.storage.local.set({
            [this.QUEUE_KEY]: this.queue,
            [this.STATS_KEY]: this.stats
        });
    }
    
    // Get queue status
    async getStatus() {
        return {
            queued: this.queue.length,
            totalQueued: this.stats.totalQueued,
            totalSynced: this.stats.totalSynced,
            failed: this.stats.failed.length,
            lastSync: this.stats.lastSyncAttempt,
            isOnline: navigator.onLine
        };
    }
    
    // Show notification
    showNotification(message, type = 'info') {
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            info: '#2196F3',
            warning: '#ff9800'
        };
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000000;
            animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
            max-width: 300px;
        `;
        
        const icon = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };
        
        notification.textContent = `${icon[type] || '📢'} ${message}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
}

// Initialize queue
new AnkiQueue();