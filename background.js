// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Just Copy - OCR Text Extractor installed');
});

// Handle messages between content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'capturedText' || request.action === 'capturedImage') {
        // Try to send message to popup
        chrome.runtime.sendMessage(request).catch(error => {
            // If popup is not open, store the data
            if (error.message.includes('Could not establish connection')) {
                chrome.storage.local.set({ lastCapturedData: request }, () => {
                    console.log('Data stored for when popup opens');
                });
            } else {
                console.error('Message send error:', error);
            }
        });
    } else if (request.action === 'reopenPopup') {
        // Get the current tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                // Open the popup
                chrome.action.openPopup();
            }
        });
    }
    // Return true to indicate we will respond asynchronously
    return true;
}); 