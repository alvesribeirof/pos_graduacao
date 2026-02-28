/* global tf */
import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
import { workerEvents } from '../events/constants.js';

// ChromaDB é opcional. Deixe false para evitar erros quando o serviço não estiver ativo.
const ENABLE_CHROMADB = true;

// try importing ChromaDB client (dependency installed via npm)
let ChromaDBClient;
if (ENABLE_CHROMADB) {
    try {
        ChromaDBClient = await import('../chromadb-example.js').then(m => m.ChromaDBClient);
    } catch (err) {
        console.warn('ChromaDB client not available:', err.message);
    }
}

let _globalCtx = {};
let _model = null;
let chromaClient = null;

// Pesos para diferentes features de filmes
const WEIGHTS = {
    genre: 0.35,        // Preferência de gênero é importante
    rating: 0.25,       // Qualidade do filme importa
    actor: 0.20,        // Atores preferidos
    director: 0.10,     // Diretor preferido
    year: 0.10          // Ano de lançamento
};

/**
 * Normaliza valores contínuos para range 0-1
 * Exemplo: rating 8.5 em escala 0-10 → 0.85
 */
const normalize = (value, min, max) => (value - min) / ((max - min) || 1);

/**
 * Cria contexto com índices de gêneros, atores, diretores
 * Similar a makeContext do código de produtos
 */
function makeMovieContext(movies, users) {
    const ratings = movies.map(m => m.rating);
    const years = movies.map(m => m.year);

    const minRating = Math.min(...ratings);
    const maxRating = Math.max(...ratings);

    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    // Extrair todos os gêneros, atores e diretores únicos
    const genres = [...new Set(movies.flatMap(m => m.genres || []))];
    const actors = [...new Set(movies.flatMap(m => m.cast || []))];
    const directors = [...new Set(movies.map(m => m.director).filter(Boolean))];

    // Criar índices para codificação one-hot
    const genresIndex = Object.fromEntries(
        genres.map((genre, index) => [genre, index])
    );
    const actorsIndex = Object.fromEntries(
        actors.map((actor, index) => [actor, index])
    );
    const directorsIndex = Object.fromEntries(
        directors.map((director, index) => [director, index])
    );

    // Calcular rating médio por filme (baseado em usuários que assistiram)
    const ratingAverageByMovie = {};
    const watchCounts = {};

    users.forEach(user => {
        user.watched.forEach(movie => {
            watchCounts[movie.id] = (watchCounts[movie.id] || 0) + 1;
            ratingAverageByMovie[movie.id] =
                (ratingAverageByMovie[movie.id] || 0) + (movie.userRating || 5);
        });
    });

    Object.keys(ratingAverageByMovie).forEach(movieId => {
        ratingAverageByMovie[movieId] /= watchCounts[movieId];
    });

    return {
        movies,
        users,
        genresIndex,
        actorsIndex,
        directorsIndex,
        ratingAverageByMovie,
        watchCounts,
        minRating,
        maxRating,
        minYear,
        maxYear,
        numGenres: genres.length,
        numActors: actors.length,
        numDirectors: directors.length,
        // Dimensões totais do vetor: rating + year + genres + actors + directors
        dimensions: 2 + genres.length + actors.length + directors.length
    };
}

/**
 * One-hot encoding com peso aplicado
 */
const oneHotWeighted = (index, length, weight) => {
    if (length < 2) {
        return tf.tensor1d([weight]).cast('float32');
    }
    return tf.oneHot(index, length).cast('float32').mul(weight);
};

/**
 * Codifica um filme em um vetor numérico
 */
function encodeMovie(movie, context) {
    // Rating normalizado e ponderado
    const rating = tf.tensor1d([
        normalize(
            movie.rating || movie.userRating || 5,
            context.minRating,
            context.maxRating
        ) * WEIGHTS.rating
    ]);

    // Ano normalizado
    const year = tf.tensor1d([
        normalize(
            movie.year,
            context.minYear,
            context.maxYear
        ) * WEIGHTS.year
    ]);

    // One-hot para TODOS os gêneros do filme
    let genreEncoding = tf.zeros([context.numGenres]);
    if (movie.genres && movie.genres.length > 0) {
        const genreIndices = movie.genres
            .map(g => context.genresIndex[g])
            .filter(i => i !== undefined);

        if (genreIndices.length > 0) {
            const genreOneHots = genreIndices.map(idx =>
                oneHotWeighted(idx, context.numGenres, WEIGHTS.genre / movie.genres.length)
            );
            genreEncoding = tf.addN(genreOneHots);
        }
    }

    // One-hot para TODOS os atores do filme (elenco)
    let actorEncoding = tf.zeros([context.numActors]);
    if (movie.cast && movie.cast.length > 0) {
        const actorIndices = movie.cast
            .map(a => context.actorsIndex[a])
            .filter(i => i !== undefined)
            .slice(0, 10); // Limitar aos 10 principais atores

        if (actorIndices.length > 0) {
            const actorOneHots = actorIndices.map(idx =>
                oneHotWeighted(idx, context.numActors, WEIGHTS.actor / actorIndices.length)
            );
            actorEncoding = tf.addN(actorOneHots);
        }
    }

    // One-hot para o diretor
    let directorEncoding = tf.zeros([context.numDirectors]);
    if (movie.director && context.directorsIndex[movie.director] !== undefined) {
        directorEncoding = oneHotWeighted(
            context.directorsIndex[movie.director],
            context.numDirectors,
            WEIGHTS.director
        );
    }

    // Concatenar todos os encodings
    return tf.concat([
        rating,
        year,
        genreEncoding,
        actorEncoding,
        directorEncoding
    ]);
}

/**
 * Codifica um usuário baseado em filmes que assistiu
 */
function encodeUser(user, context) {
    if (user.watched && user.watched.length > 0) {
        // Média dos vetores de filmes assistidos
        return tf.stack(
            user.watched.map(movie => encodeMovie(movie, context))
        )
            .mean(0)
            .reshape([1, context.dimensions]);
    }

    // Usuário sem historico: vetor neutro
    return tf.concat([
        tf.tensor1d([5 / context.maxRating * WEIGHTS.rating]),
        tf.tensor1d([
            normalize(new Date().getFullYear(), context.minYear, context.maxYear) * WEIGHTS.year
        ]),
        tf.zeros([context.numGenres]),
        tf.zeros([context.numActors]),
        tf.zeros([context.numDirectors])
    ]).reshape([1, context.dimensions]);
}

/**
 * Cria dados de treinamento para a rede neural
 */
function createTrainingData(context) {
    const inputs = [];
    const labels = [];

    context.users
        .filter(u => u.watched && u.watched.length > 0)
        .forEach(user => {
            const userVector = encodeUser(user, context).dataSync();

            context.movies.forEach(movie => {
                const movieVector = encodeMovie(movie, context).dataSync();

                // Label: 1 se usuário assistiu, 0 se não
                const hasWatched = user.watched.some(w => w.id === movie.id) ? 1 : 0;

                // Combinar vetores
                inputs.push([...userVector, ...movieVector]);
                labels.push(hasWatched);
            });
        });

    return {
        inputs,
        labels,
        inputDimension: context.dimensions * 2
    };
}

/**
 * Configura e treina a rede neural
 */
async function configureNeuralNetAndTrain(trainData) {
    const model = tf.sequential();

    model.add(
        tf.layers.dense({
            inputShape: [trainData.inputDimension],
            units: 256,
            activation: 'relu'
        })
    );

    model.add(tf.layers.dropout({ rate: 0.3 }));

    model.add(
        tf.layers.dense({
            units: 128,
            activation: 'relu'
        })
    );

    model.add(tf.layers.dropout({ rate: 0.2 }));

    model.add(
        tf.layers.dense({
            units: 64,
            activation: 'relu'
        })
    );

    model.add(
        tf.layers.dense({
            units: 1,
            activation: 'sigmoid'
        })
    );

    model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
    });

    const totalSamples = trainData.inputs.length;
    const batchSize = 1000;
    const epochs = 5;

    console.log(`Dividindo ${totalSamples} amostras em chunks de ${batchSize} para evitar estouro de memória (WebGL)`);

    for (let epoch = 1; epoch <= epochs; epoch++) {
        let epochLoss = 0;
        let epochAcc = 0;
        let batches = 0;

        for (let i = 0; i < totalSamples; i += batchSize) {
            const end = Math.min(i + batchSize, totalSamples);

            const xBatchArray = trainData.inputs.slice(i, end);
            const yBatchArray = trainData.labels.slice(i, end).map(L => [L]);

            const xs = tf.tensor2d(xBatchArray);
            const ys = tf.tensor2d(yBatchArray);

            const h = await model.fit(xs, ys, {
                epochs: 1,
                batchSize: 16,
                shuffle: true,
                verbose: 0
            });

            epochLoss += h.history.loss[0];
            epochAcc += h.history.acc[0];
            batches++;

            // Liberação agressiva de memória
            tf.dispose([xs, ys]);
        }

        const avgLoss = epochLoss / batches;
        const avgAcc = epochAcc / batches;

        postMessage({
            type: workerEvents.trainingLog,
            epoch: epoch,
            loss: avgLoss,
            accuracy: avgAcc
        });

        postMessage({
            type: workerEvents.progressUpdate,
            progress: { progress: Math.floor(50 + (epoch / epochs) * 50) }
        });
    }

    return model;
}

/**
 * Handler para treinar o modelo
 */
async function trainModel({ users }) {
    console.log('🎬 Iniciando treinamento com', users.length, 'usuários');
    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 1 } });

    try {
        // Carregar dados de filmes
        const movies = await (await fetch('/data/movies.json')).json();

        console.log('📽️ Filmes carregados:', movies.length);

        // Criar contexto
        const context = makeMovieContext(movies, users);

        // Pré-processar vetores dos filmes
        context.movieVectors = movies.map(movie => {
            return {
                id: movie.id,
                title: movie.title,
                meta: { ...movie },
                vector: encodeMovie(movie, context).dataSync()
            };
        });

        _globalCtx = context;

        // opcional: inicializar ChromaDB e armazenar vetores
        if (ENABLE_CHROMADB && ChromaDBClient && !chromaClient) {
            chromaClient = new ChromaDBClient();
            await chromaClient.initCollection();
            const vectors = context.movieVectors.map(m => m.vector);
            await chromaClient.storeMovieEmbeddings(context.movies, vectors);
        }

        // Criar dados de treinamento
        console.log('🔢 Criando dados de treinamento...');
        const trainData = createTrainingData(context);

        postMessage({ type: workerEvents.progressUpdate, progress: { progress: 50 } });

        // Treinar modelo
        console.log('🧠 Treinando rede neural...');
        _model = await configureNeuralNetAndTrain(trainData);

        postMessage({ type: workerEvents.progressUpdate, progress: { progress: 100 } });
        postMessage({ type: workerEvents.trainingComplete });
    } catch (error) {
        console.error('❌ Erro no treinamento:', error);
        postMessage({
            type: 'trainingError',
            error: error.message
        });
    }
}

/**
 * Handler para recomendações
 */
async function recommend({ user, topN = 10 }) {
    if (!_model) {
        console.error('❌ Modelo não foi treinado');
        return;
    }

    const context = _globalCtx;

    try {
        // Codificar o usuário
        const userVector = encodeUser(user, context).dataSync();

        // se Chroma estiver presente, buscar subset
        let candidates = context.movieVectors;
        if (chromaClient) {
            const similar = await chromaClient.querySimilarMovies(userVector, 50);
            if (similar && similar.ids) {
                const idSet = new Set(similar.ids);
                candidates = context.movieVectors.filter(m => idSet.has(m.id));
            }
        }

        // Criar pares (usuário, filme)
        const inputs = candidates.map(({ vector }) => [...userVector, ...vector]);

        // Converter para Tensor e predição
        const inputTensor = tf.tensor2d(inputs);
        const predictions = _model.predict(inputTensor);
        const scores = predictions.dataSync();

        // Mapear recomendações
        const recommendations = candidates.map((item, idx) => ({
            ...item.meta,
            id: item.id,
            title: item.title,
            score: scores[idx],
            scorePercentage: Math.round(scores[idx] * 100)
        }));

        // Ordenar e filtrar já assistidos
        const watched = new Set(user.watched ? user.watched.map(w => w.id) : []);
        const sortedRecommendations = recommendations
            .filter(r => !watched.has(r.id))
            .sort((a, b) => b.score - a.score)
            .slice(0, topN);

        console.log('🎯 Recomendações geradas:', sortedRecommendations.length);

        postMessage({
            type: workerEvents.recommend,
            user,
            recommendations: sortedRecommendations
        });

        inputTensor.dispose();
        predictions.dispose();
    } catch (error) {
        console.error('❌ Erro na recomendação:', error);
        postMessage({
            type: 'recommendationError',
            error: error.message
        });
    }
}

/**
 * Handlers para diferentes ações
 */
const handlers = {
    [workerEvents.trainModel]: trainModel,
    [workerEvents.recommend]: recommend,
};

/**
 * Event listener para mensagens
 */
self.onmessage = e => {
    const { action, ...data } = e.data;
    if (handlers[action]) {
        handlers[action](data);
    } else {
        console.warn('❌ Ação desconhecida:', action);
    }
};
