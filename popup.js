document.addEventListener('DOMContentLoaded', function () {
    const captureBtn = document.getElementById('captureBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');
    const resultContainer = document.getElementById('resultContainer');
    const extractedText = document.getElementById('extractedText');
    const processingIndicator = document.getElementById('processingIndicator');

    let worker = null;

    // Check for any stored captured text
    chrome.storage.local.get(['lastCapturedText'], (result) => {
        if (result.lastCapturedText) {
            // Process the stored text
            extractedText.textContent = result.lastCapturedText;
            resultContainer.style.display = 'block';
            // Clear the stored text
            chrome.storage.local.remove(['lastCapturedText']);
        }
    });

    // Check if current URL is restricted
    async function checkRestrictedUrl() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const url = tab.url;

            // List of restricted URLs
            const restrictedUrls = [
                'chrome://',
                'chrome-extension://',
                'chrome.google.com/webstore',
                'edge://',
                'about:',
                'file://'
            ];

            // Check if URL is restricted
            const isRestricted = restrictedUrls.some(restricted => url.startsWith(restricted));

            // Disable button and show tooltip if restricted
            if (isRestricted) {
                captureBtn.disabled = true;
                captureBtn.title = 'Capture is not available on this page';
                captureBtn.style.opacity = '0.5';
                captureBtn.style.cursor = 'not-allowed';
            } else {
                captureBtn.disabled = false;
                captureBtn.title = 'Capture text from page';
                captureBtn.style.opacity = '1';
                captureBtn.style.cursor = 'pointer';
            }
        } catch (error) {
            console.error('URL check error:', error);
        }
    }

    // Check URL when popup opens
    checkRestrictedUrl();

    // Initialize Tesseract worker
    async function initWorker() {
        if (!worker) {
            worker = await Tesseract.createWorker({
                logger: m => {
                    if (m.status === 'recognizing text') {
                        processingIndicator.querySelector('span').textContent =
                            `Processing... ${Math.round(m.progress * 100)}%`;
                    }
                }
            });
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
        }
        return worker;
    }

    // Handle screen capture
    captureBtn.addEventListener('click', async () => {
        if (captureBtn.disabled) return;

        try {
            showProcessing();
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            // First, inject the content script
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });

            // Then send the message
            chrome.tabs.sendMessage(tab.id, { action: 'startCapture' });
        } catch (error) {
            console.error('Capture error:', error);
            showError('Failed to start capture. Please try again.');
        }
    });

    // Handle image upload
    uploadBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    await processImage(file);
                } catch (error) {
                    showError('Failed to process image');
                }
            }
        };

        input.click();
    });

    // Handle copy button
    copyBtn.addEventListener('click', async () => {
        const text = extractedText.textContent;
        try {
            await navigator.clipboard.writeText(text);
            showSuccess('Text copied to clipboard');
        } catch (error) {
            showError('Failed to copy text');
        }
    });

    // Handle clear button
    clearBtn.addEventListener('click', () => {
        extractedText.textContent = '';
        resultContainer.style.display = 'none';
    });

    // Process image using Tesseract.js
    async function processImage(file) {
        showProcessing();

        try {
            const worker = await initWorker();

            // Create image bitmap
            const image = await createImageBitmap(file);

            // Perform OCR with optimized settings
            const { data: { text } } = await worker.recognize(image, {
                tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?@#$%^&*()_+-=[]{}|;:"\'<>/ ',
                tessedit_pageseg_mode: Tesseract.PSM.AUTO
            });

            showResult(text);
        } catch (error) {
            console.error('OCR Error:', error);
            showError('Failed to extract text');
        } finally {
            hideProcessing();
        }
    }

    // Show processing state
    function showProcessing() {
        processingIndicator.style.display = 'flex';
        resultContainer.style.display = 'block';
        extractedText.textContent = '';
    }

    // Hide processing state
    function hideProcessing() {
        processingIndicator.style.display = 'none';
    }

    // Show the extracted text
    function showResult(text) {
        extractedText.textContent = text.trim();
        resultContainer.style.display = 'block';
    }

    // Show error message
    function showError(message) {
        extractedText.textContent = `Error: ${message}`;
        extractedText.style.color = 'var(--error-color)';
        resultContainer.style.display = 'block';
    }

    // Show success message
    function showSuccess(message) {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓';
        copyBtn.style.color = 'var(--success-color)';

        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.color = '';
        }, 2000);
    }

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'capturedText') {
            extractedText.textContent = request.text;
            resultContainer.style.display = 'block';
        } else if (request.action === 'captureError') {
            showError(request.error || 'Failed to capture text');
            hideProcessing();
        }
    });

    // Cleanup worker on popup close
    window.addEventListener('unload', async () => {
        if (worker) {
            await worker.terminate();
            worker = null;
        }
    });
}); 