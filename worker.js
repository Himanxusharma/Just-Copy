importScripts('lib/tesseract.min.js');

self.onmessage = async function (e) {
    const { imageData, id } = e.data;

    try {
        const worker = await Tesseract.createWorker();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');

        const { data: { text } } = await worker.recognize(imageData, {
            tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?@#$%^&*()_+-=[]{}|;:"\'<>/ ',
            tessedit_pageseg_mode: Tesseract.PSM.AUTO
        });

        await worker.terminate();

        self.postMessage({ id, text });
    } catch (error) {
        self.postMessage({ id, error: error.message });
    }
}; 