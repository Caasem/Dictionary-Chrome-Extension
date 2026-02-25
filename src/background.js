// background.js
console.log('✅ Background script loaded');

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('📨 Background received:', request);
    
    if (request.action === 'openPopup') {
        chrome.browserAction.openPopup();
        sendResponse({status: 'opened'});
    }
    
    return true;
});