// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startCapture') {
        // Create overlay for selection
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.3);
            z-index: 999999;
            cursor: text;
            pointer-events: auto;
        `;

        // Handle mouse down to start selection
        const handleMouseDown = (e) => {
            // Prevent default to avoid text selection issues
            e.preventDefault();
            e.stopPropagation();

            // Change cursor to text
            document.body.style.cursor = 'text';
            overlay.style.cursor = 'text';

            // Enable text selection
            document.body.style.userSelect = 'text';
            document.body.style.webkitUserSelect = 'text';

            // Remove mouse down listener
            overlay.removeEventListener('mousedown', handleMouseDown);
        };

        // Handle mouse up to capture text
        const handleMouseUp = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const text = window.getSelection().toString().trim();
            console.log('Selected text:', text); // Debug log

            if (text) {
                // Store the text in chrome.storage
                chrome.storage.local.set({ lastCapturedText: text }, () => {
                    // Clean up
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                    document.body.style.webkitUserSelect = '';
                    overlay.remove();
                    document.removeEventListener('mouseup', handleMouseUp);

                    // Reopen the popup
                    chrome.runtime.sendMessage({ action: 'reopenPopup' });
                });
            } else {
                // Clean up if no text was selected
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                document.body.style.webkitUserSelect = '';
                overlay.remove();
                document.removeEventListener('mouseup', handleMouseUp);
            }
        };

        // Add event listeners
        overlay.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mouseup', handleMouseUp);

        // Add escape key handler
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                // Clean up
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                document.body.style.webkitUserSelect = '';
                overlay.remove();
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Add overlay to page
        document.body.appendChild(overlay);

        // Log to confirm overlay is added
        console.log('Overlay added to page');
    }
});

function createSelectorOverlay() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.1);
        z-index: 999999;
        cursor: pointer;
    `;

    // Create highlight box
    const highlightBox = document.createElement('div');
    highlightBox.style.cssText = `
        position: absolute;
        border: 2px solid #2563eb;
        background: rgba(37, 99, 235, 0.1);
        pointer-events: none;
        z-index: 1000000;
        display: none;
    `;

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
        position: absolute;
        background: #2563eb;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-family: Arial, sans-serif;
        pointer-events: none;
        z-index: 1000001;
        display: none;
    `;

    let currentElement = null;

    // Add event listeners
    overlay.addEventListener('mousemove', (e) => {
        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (!element || element === overlay || element === highlightBox || element === tooltip) {
            highlightBox.style.display = 'none';
            tooltip.style.display = 'none';
            currentElement = null;
            return;
        }

        if (element !== currentElement) {
            currentElement = element;
            const rect = element.getBoundingClientRect();

            // Update highlight box
            highlightBox.style.display = 'block';
            highlightBox.style.left = rect.left + 'px';
            highlightBox.style.top = rect.top + 'px';
            highlightBox.style.width = rect.width + 'px';
            highlightBox.style.height = rect.height + 'px';

            // Update tooltip
            tooltip.textContent = element.tagName.toLowerCase();
            if (element.id) {
                tooltip.textContent += `#${element.id}`;
            }
            if (element.className) {
                tooltip.textContent += `.${element.className.split(' ').join('.')}`;
            }
            tooltip.style.display = 'block';
            tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
            tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';
        }
    });

    overlay.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (!element || element === overlay || element === highlightBox || element === tooltip) {
            return;
        }

        // Get all text content from the element
        const text = getElementText(element);

        // Remove overlay elements
        overlay.remove();
        highlightBox.remove();
        tooltip.remove();

        // Send the text back to popup
        chrome.runtime.sendMessage({
            action: 'capturedText',
            text: text
        });
    });

    // Add escape key handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            highlightBox.remove();
            tooltip.remove();
        }
    });

    // Add elements to page
    document.body.appendChild(overlay);
    document.body.appendChild(highlightBox);
    document.body.appendChild(tooltip);
}

function getElementText(element) {
    // If element is an input or textarea, get its value
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        return element.value;
    }

    // Get all text nodes recursively
    let text = '';
    const walk = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    let node;
    while (node = walk.nextNode()) {
        const trimmed = node.textContent.trim();
        if (trimmed) {
            text += trimmed + '\n';
        }
    }

    return text.trim();
} 