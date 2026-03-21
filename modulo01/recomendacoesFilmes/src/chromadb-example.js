/**
 * 📚 Exemplo de Integração com ChromaDB
 * 
 * Este arquivo mostra como integrar ChromaDB ao movieTrainingWorker.js
 * para persistência e busca rápida de vetores.
 * 
 * NOTA: ChromaDB em JavaScript está em desenvolvimento.
 * Considere usar Python + API REST ou Weaviate para produção.
 */

// ============================================================================
// OPÇÃO 1: ChromaDB via API REST (RECOMENDADO)
// ============================================================================

/**
 * Cliente ChromaDB via HTTP
 * Requer: Docker com ChromaDB rodando em localhost:8000
 * 
 * docker run -p 8000:8000 chromadb/chroma
 */
class ChromaDBClient {
    constructor(baseUrl = 'http://localhost:8001') {
        this.baseUrl = baseUrl;
        this.tenant = 'default_tenant';
        this.database = 'default_database';
        this.collectionName = 'movies';
        this.collectionId = null; // UUID retornado pela API v2
    }

    get collectionsBase() {
        return `${this.baseUrl}/api/v2/tenants/${this.tenant}/databases/${this.database}/collections`;
    }

    /**
     * Inicializa coleção de filmes e armazena o UUID retornado pela API v2
     */
    async initCollection() {
        try {
            // Tenta criar a coleção (get_or_create)
            const createRes = await fetch(this.collectionsBase, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: this.collectionName,
                    metadata: { description: 'Vetores de filmes para recomendação' },
                    get_or_create: true
                })
            });

            if (createRes.ok) {
                const data = await createRes.json();
                this.collectionId = data.id;
                console.log(`✅ Coleção ChromaDB carregada. UUID: ${this.collectionId}`);
                return;
            }

            // Fallback: busca pelo nome
            const getRes = await fetch(`${this.collectionsBase}/${this.collectionName}`);
            if (getRes.ok) {
                const data = await getRes.json();
                this.collectionId = data.id;
                console.log(`✅ Coleção ChromaDB existente encontrada. UUID: ${this.collectionId}`);
                return;
            }

            throw new Error(`Não foi possível criar ou carregar a coleção: HTTP ${createRes.status}`);
        } catch (error) {
            console.warn('⚠️ ChromaDB não está rodando ou acessível:', error.message);
            throw error;
        }
    }

    /**
     * Armazena vetores de filmes em blocos (batching) para evitar timeouts
     */
    async storeMovieEmbeddings(movies, vectors) {
        const BATCH_SIZE = 100;
        console.log(`[ChromaDB] Iniciando sincronização de ${movies.length} filmes em blocos de ${BATCH_SIZE}...`);

        for (let i = 0; i < movies.length; i += BATCH_SIZE) {
            const end = Math.min(i + BATCH_SIZE, movies.length);
            const batchMovies = movies.slice(i, end);
            const batchVectors = vectors.slice(i, end);

            if (!this.collectionId) {
                console.warn('⚠️ UUID da coleção não disponível. Pulando sincronização.');
                return;
            }

            try {
                const response = await fetch(
                    `${this.collectionsBase}/${this.collectionId}/add`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ids: batchMovies.map(m => m.id.toString()),
                            embeddings: batchVectors.map(v => Array.from(v)),
                            documents: batchMovies.map(m => m.title),
                            metadatas: batchMovies.map(m => ({
                                title: m.title,
                                year: m.year,
                                rating: m.rating,
                                genres: (m.genres || []).join(','),
                                director: m.director || 'Unknown'
                            }))
                        })
                    }
                );

                if (!response.ok) {
                    throw new Error(`Erro no bloco ${i}-${end}: HTTP ${response.status}`);
                }

                console.log(`✅ Bloco ${i}-${end} sincronizado`);
            } catch (error) {
                console.warn(`⚠️ Erro ao sincronizar bloco ${i}-${end}:`, error.message);
                // Continuar para o próximo bloco ou parar? Vamos registrar e continuar.
            }
        }

        console.log(`✅ Sincronização de ${movies.length} filmes concluída.`);
    }

    /**
     * Retorna o total de itens na coleção
     */
    async getCount() {
        try {
            const res = await fetch(`${this.collectionsBase}/${this.collectionId}/count`);
            if (res.ok) return await res.json();
        } catch (_) { }
        return 0;
    }

    /**
     * Busca filmes similares ao vetor do usuário
     */
    async querySimilarMovies(userVector, topN = 50) {
        try {
            if (!this.collectionId) {
                console.warn('⚠️ UUID da coleção não disponível para query.');
                return null;
            }

            // n_results não pode ser maior que o número de itens na coleção
            const count = await this.getCount();
            const nResults = Math.min(topN, count);
            if (nResults === 0) {
                console.warn('⚠️ ChromaDB está vazio — sem itens para buscar.');
                return null;
            }

            const response = await fetch(
                `${this.collectionsBase}/${this.collectionId}/query`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        // Sanitizar: substituir NaN/null por 0.0 (ChromaDB rejeita valores inválidos)
                        query_embeddings: [Array.from(userVector).map(v => (isFinite(v) && v !== null ? v : 0.0))],
                        n_results: nResults,
                        include: ['documents', 'metadatas', 'distances']
                    })
                }
            );

            if (!response.ok) {
                const body = await response.text();
                throw new Error(`HTTP ${response.status}: ${body}`);
            }

            const result = await response.json();
            return {
                ids: result.ids[0].map(id => parseInt(id)),
                distances: result.distances[0],
                documents: result.documents[0],
                metadatas: result.metadatas[0]
            };
        } catch (error) {
            console.warn('⚠️ Erro ao buscar em ChromaDB:', error.message);
            return null;
        }
    }
}

// ============================================================================
// OPÇÃO 2: Implementação usando apenas Arrays (Para Prototipagem)
// ============================================================================

class InMemoryVectorStore {
    constructor() {
        this.vectors = [];
        this.metadata = [];
    }

    /**
     * Armazena vetores de filmes em memória
     */
    store(movies, vectors) {
        this.vectors = vectors;
        this.metadata = movies.map(m => ({
            id: m.id,
            title: m.title,
            year: m.year,
            rating: m.rating,
            genres: m.genres,
            director: m.director
        }));
        console.log(`✅ ${movies.length} filmes armazenados em memória`);
    }

    /**
     * Busca filmes similares usando distância euclidiana
     */
    querySimilar(userVector, topN = 50) {
        // Calcular distância para todos os filmes
        const distances = this.vectors.map((vector, idx) => ({
            id: this.metadata[idx].id,
            distance: this._euclideanDistance(userVector, vector),
            metadata: this.metadata[idx]
        }));

        // Ordenar por proximidade
        distances.sort((a, b) => a.distance - b.distance);

        // Retornar top-N
        return distances.slice(0, topN);
    }

    /**
     * Calcula distância euclidiana entre dois vetores
     */
    _euclideanDistance(a, b) {
        if (a.length !== b.length) return Infinity;
        return Math.sqrt(
            a.reduce((sum, val, idx) => sum + Math.pow(val - b[idx], 2), 0)
        );
    }
}

// ============================================================================
// USO NO WORKER
// ============================================================================

/**
 * Exemplo de como usar no movieTrainingWorker.js
 * 
 * // No início do worker
 * const chromaDB = new ChromaDBClient();
 * await chromaDB.initCollection();
 * 
 * // Após fazer encoding de filmes
 * await chromaDB.storeMovieEmbeddings(
 *     context.movies,
 *     context.movieVectors.map(m => m.vector)
 * );
 * 
 * // Ao fazer recomendação
 * function recommend({ user, topN = 10 }) {
 *     if (!_model) return;
 * 
 *     const context = _globalCtx;
 *     const userVector = encodeUser(user, context).dataSync();
 * 
 *     // Buscar apenas top-50 filmes similares
 *     const similarMovies = await chromaDB.querySimilarMovies(userVector, 50);
 * 
 *     if (!similarMovies) {
 *         console.log('ChromaDB desativado, usando todos os filmes');
 *         // Fallback: usar todos os filmes
 *     }
 * 
 *     // Fazer predição apenas nos filmes similares
 *     const moviesToPredict = similarMovies 
 *         ? context.movieVectors.filter(m => similarMovies.ids.includes(m.id))
 *         : context.movieVectors;
 * 
 *     const inputs = moviesToPredict.map(({ vector }) => {
 *         return [...userVector, ...vector];
 *     });
 * 
 *     // ... resto do código de recomendação
 * }
 */

// ============================================================================
// COMPARAÇÃO: COM vs SEM CHROMADB
// ============================================================================

/*
SEM ChromaDB:
├─ Predição em 1000 filmes
│  ├─ Criar 1000 tensores de entrada
│  ├─ Feed forward na rede neural
│  └─ 500ms (em GPU) / 2000ms (em CPU)
└─ Problema: Lento para datasets grandes

COM ChromaDB:
├─ Busca vetorial (top-50)
│  └─ 10-50ms usando índice HNSW
├─ Predição em 50 filmes
│  ├─ Criar 50 tensores de entrada
│  ├─ Feed forward na rede neural
│  └─ 50ms
└─ Total: ~100ms (10x mais rápido!)

ESCALABILIDADE:
SEM ChromaDB: 1000 filmes = 2s | 10000 filmes = 20s ❌
COM ChromaDB: 1000 filmes = 100ms | 10000 filmes = 100ms ✅
*/

export { ChromaDBClient, InMemoryVectorStore };
