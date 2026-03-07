export class TranslationService {
    constructor() {
        this.translator = null;
        this.languageDetector = null;
        this.initialized = false;
        this.initializing = false;
    }

    async ensureInitialized() {
        if (this.initialized) return;
        if (this.initializing) return;
        this.initializing = true;

        try {
            if (typeof Translator !== 'undefined') {
                this.translator = await Translator.create({
                    sourceLanguage: 'en',
                    targetLanguage: 'pt',
                    monitor(m) {
                        m.addEventListener('downloadprogress', (e) => {
                            const percent = ((e.loaded / e.total) * 100).toFixed(0);
                            console.log(`Translator downloaded ${percent}%`);
                        });
                    }
                });
                console.log('Translator initialized');
            } else {
                console.warn('Translator API not available');
            }

            if (typeof LanguageDetector !== 'undefined') {
                this.languageDetector = await LanguageDetector.create();
                console.log('Language Detector initialized');
            } else {
                console.warn('LanguageDetector API not available');
            }

            this.initialized = true;
        } catch (error) {
            console.error('Error initializing translation:', error);
        } finally {
            this.initializing = false;
        }
    }

    async translateToPortuguese(text) {
        // Lazy init on first use (triggered by user gesture)
        await this.ensureInitialized();

        if (!this.translator) {
            console.warn('Translator not available, returning original text');
            return text;
        }

        try {
            // Detect language first
            if (this.languageDetector) {
                const detectionResults = await this.languageDetector.detect(text);
                console.log('Detected languages:', detectionResults);

                // If already in Portuguese, no need to translate
                if (detectionResults && detectionResults[0]?.detectedLanguage === 'pt') {
                    console.log('Text is already in Portuguese');
                    return text;
                }
            }

            // Use streaming translation
            const stream = this.translator.translateStreaming(text);
            let translated = '';
            for await (const chunk of stream) {
                translated = chunk; // Each chunk is the full translation so far
            }
            console.log('Translated text:', translated);
            return translated;
        } catch (error) {
            console.error('Translation error:', error);
            return text; // Return original text if translation fails
        }
    }
}
