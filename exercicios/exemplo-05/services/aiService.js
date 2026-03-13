import { pipeline, env } from '@xenova/transformers';
import { ChromaClient } from 'chromadb';

export class AIService {
    constructor() {
        this.session = null;
        this.abortController = null;
        this.chroma = new ChromaClient({ path: "http://localhost:8000" });
        this.extractor = null;
    }

    async initRAG() {
        if (!this.extractor) {
            env.allowLocalModels = false;
            // Utilizando o modelo menor e mais veloz da Xenova para text-embeddings no browser
            this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        }
    }

    chunkText(text, chunkSize = 1000, overlap = 200) {
        if (!text) return [];
        const chunks = [];
        let i = 0;
        while (i < text.length) {
            chunks.push(text.slice(i, i + chunkSize));
            i += chunkSize - overlap;
        }
        return chunks;
    }

    async checkRequirements() {
        const errors = [];
        const returnResults = () => errors.length ? errors : null;

        // @ts-ignore
        const isChrome = !!window.chrome;
        if (!isChrome)
            errors.push("⚠️ Este recurso só funciona no Google Chrome ou Chrome Canary (versão recente).");

        if (!('LanguageModel' in self)) {
            errors.push("⚠️ As APIs nativas de IA não estão ativas.");
            errors.push("Ative a seguinte flag em chrome://flags/:");
            errors.push("- Prompt API for Gemini Nano (chrome://flags/#prompt-api-for-gemini-nano)");
            errors.push("Depois reinicie o Chrome e tente novamente.");
            return errors;
        }

        // Check Translator availability
        if ('Translator' in self) {
            const translatorAvailability = await Translator.availability({
                sourceLanguage: 'en',
                targetLanguage: 'pt'
            });

            if (translatorAvailability === 'no') {
                errors.push("⚠️ Tradução de inglês para português não está disponível.");
            }
        } else {
            errors.push("⚠️ A API de Tradução não está ativa.");
            errors.push("Ative a seguinte flag em chrome://flags/:");
            errors.push("- Translation API (chrome://flags/#translation-api)");
        }

        // Check Language Detection API
        if (!('LanguageDetector' in self)) {
            errors.push("⚠️ A API de Detecção de Idioma não está ativa.");
            errors.push("Ative a seguinte flag em chrome://flags/:");
            errors.push("- Language Detection API (chrome://flags/#language-detector-api)");
        }

        if (errors.length > 0) {
            return errors;
        }

        const availability = await LanguageModel.availability({ languages: ["pt"] });

        if (availability === 'available') {
            return null;
        }

        if (availability === 'unavailable') {
            errors.push(`⚠️ O seu dispositivo não suporta modelos de linguagem nativos de IA.`);
        }

        if (availability === 'downloading') {
            errors.push(`⚠️ O modelo de linguagem de IA está sendo baixado. Por favor, aguarde alguns minutos e tente novamente.`);
        }

        if (availability === 'downloadable') {
            errors.push(`⚠️ O modelo de linguagem de IA precisa ser baixado, baixando agora... (acompanhe o progresso no terminal do chrome)`);
            try {
                const session = await LanguageModel.create({
                    expectedInputLanguages: ["en"],
                    monitor(m) {
                        m.addEventListener('downloadprogress', (e) => {
                            const percent = ((e.loaded / e.total) * 100).toFixed(0);
                        });
                    }
                });
                await session.prompt('Hello');
                session.destroy();

                // Re-check availability after download
                const newAvailability = await LanguageModel.availability({ languages: ["en"] });
                if (newAvailability === 'available') {
                    return null; // Download successful
                }
            } catch (error) {
                errors.push(`⚠️ Erro ao baixar o modelo: ${error.message}`);
            }
        }

        return errors.length > 0 ? errors : null;
    }

    async getParams() {
        // LanguageModel.params() is deprecated and only available in extension contexts.
        // On web, it returns null - use defaults from Chrome docs.
        const DEFAULT_PARAMS = {
            defaultTopK: 3,
            maxTopK: 128,
            defaultTemperature: 1,
            maxTemperature: 2
        };

        try {
            const params = await LanguageModel.params?.();
            if (params) {
                return params;
            }
        } catch (e) {
            console.warn('LanguageModel.params() not available, using defaults.');
        }
        return DEFAULT_PARAMS;
    }

    async* createSession(question, temperature, topK, file = null, onStatus = null) {
        this.abortController?.abort();
        this.abortController = new AbortController();

        // Build content array with text and optional file
        const contentArray = [{ type: "text", value: question }];

        if (file) {
            const fileType = file.type.startsWith('image') ? 'image' :
                file.type.startsWith('audio') ? 'audio' : 'pdf';

            if (fileType === 'pdf') {
                if (typeof window.pdfjsLib !== 'undefined') {
                    // Extrai o texto do PDF e anexa ao prompt (a API Chrome IA não suporta PDFs de forma nativa)
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
                    onStatus?.('📄 Extraindo texto do PDF...');
                    let pdfText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        pdfText += textContent.items.map(item => item.str).join(' ') + '\n';
                    }

                    // Implementação do RAG: Chunking, Embedding e ChromaDB
                    onStatus?.('🧠 Inicializando modelo de embeddings local (Transformers.js)...');
                    await this.initRAG();

                    onStatus?.('✂️ Dividindo o documento em blocos (chunks)...');
                    const chunks = this.chunkText(pdfText, 1000, 200);

                    onStatus?.(`🔢 Gerando vetores semânticos para ${chunks.length} blocos...`);
                    // Gerar Embeddings para os Chunks de PDF
                    const embeddings = await Promise.all(chunks.map(chunk =>
                        this.extractor(chunk, { pooling: 'mean', normalize: true })
                            .then(res => Array.from(res.data))
                    ));

                    onStatus?.('💾 Salvando embeddings no ChromaDB local...');
                    // Salvar no ChromaDB local
                    const collectionName = "pdf_docs_" + Date.now();
                    const collection = await this.chroma.getOrCreateCollection({ name: collectionName });

                    const ids = chunks.map((_, i) => `id_${i}`);
                    await collection.add({
                        ids: ids,
                        embeddings: embeddings,
                        documents: chunks
                    });

                    onStatus?.('🔍 Buscando trechos mais relevantes para sua pergunta...');
                    // Gerar Embedding para a pergunta e buscar os chunks relevantes
                    const questionEmbeddingRes = await this.extractor(question, { pooling: 'mean', normalize: true });
                    const questionEmbedding = Array.from(questionEmbeddingRes.data);

                    const searchResults = await collection.query({
                        queryEmbeddings: [questionEmbedding],
                        nResults: 3 // Pegamos os 3 trechos mais relevantes do arquivo
                    });

                    let retrievedText = '';
                    if (searchResults.documents && searchResults.documents[0]) {
                        retrievedText = searchResults.documents[0].join('\n\n---\n\n');
                    }

                    // Fornecer ao Nano apenas os trechos relevantes!
                    contentArray[0].value += '\n\nTrechos mais relevantes do arquivo PDF (use-os para basear sua resposta):\n\n' + retrievedText;

                    // Opcional: Apagar coleção para não inchar a pasta do ChromaDB no seu PC, comente se quiser guardar o index
                    await this.chroma.deleteCollection({ name: collectionName });

                } else {
                    console.error("PDF.js library is not loaded.");
                }
            } else {
                // Convert file to blob for proper handling (since image and audio are supported natively)
                const blob = new Blob([await file.arrayBuffer()], { type: file.type });
                contentArray.push({ type: fileType, value: blob });
            }
        }

        // Create session with minimal required params right before prompting
        const isPdfMode = file && file.type === 'application/pdf';
        const isNativeFile = file && !isPdfMode; // image or audio

        const sessionConfig = {
            temperature: temperature,
            topK: topK,
            systemPrompt: "You are an AI assistant that responds clearly and objectively. Always respond in plain text format instead of markdown.",
            expectedOutputs: [{ type: "text", languages: ["en"] }],
        };

        if (isNativeFile) {
            const inputType = file.type.startsWith('image') ? 'image' : 'audio';
            sessionConfig.expectedInputs = [{ type: "text" }, { type: inputType }];
        }

        if (this.session) {
            this.session.destroy();
            this.session = null;
        }

        this.session = await LanguageModel.create(sessionConfig);

        onStatus?.('🤖 Gerando resposta com Gemini Nano...');

        let responseStream;
        if (isNativeFile) {
            // For native image/audio files: use structured content array format
            responseStream = await this.session.promptStreaming(
                [{ role: 'user', content: contentArray }],
                { signal: this.abortController.signal }
            );
        } else {
            // For text-only or PDF (text extracted): use simple string – more reliable
            const promptText = contentArray[0].value;
            responseStream = await this.session.promptStreaming(
                promptText,
                { signal: this.abortController.signal }
            );
        }

        for await (const chunk of responseStream) {
            if (this.abortController.signal.aborted) {
                break;
            }
            yield chunk;
        }
    }

    abort() {
        this.abortController?.abort();
    }

    isAborted() {
        return this.abortController?.signal.aborted;
    }
}
