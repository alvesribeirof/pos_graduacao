import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
import { workerEvents } from '../events/constants.js';

let _globalCtx = {};
let _model = null;

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
const oneHotWeighted = (index, length, weight) =>
    tf.oneHot(index, length).cast('float32').mul(weight);

/**
 * Codifica um filme em um vetor numérico
 * Exemplo de filme:
 * { id: 1, title: 'Inception', genres: ['Sci-Fi', 'Action'], 
 *   rating: 8.8, year: 2010, director: 'Nolan', cast: ['DiCaprio', ...] }
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
    return tf.concat1d([
        rating,
        year,
        genreEncoding,
        actorEncoding,
        directorEncoding
    ]);
}

/**
 * Codifica um usuário baseado em filmes que assistiu
 * Similar a encodeUser, mas para filmes
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
    return tf.concat1d([
        tf.tensor1d([5 / context.maxRating * WEIGHTS.rating]), // Rating médio normalizado
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
 * Cada exemplo: [userVector, movieVector] → label (0 ou 1)
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
        xs: tf.tensor2d(inputs),
        ys: tf.tensor2d(labels, [labels.length, 1]),
        inputDimension: context.dimensions * 2
    };
}

/**
 * Configura e treina a rede neural
 * Arquitetura similar ao código original para produtos
 */
async function configureNeuralNetAndTrain(trainData) {
    const model = tf.sequential();

    // Camada de entrada: 128 neurônios
    model.add(
        tf.layers.dense({
            inputShape: [trainData.inputDimension],
            units: 256,  // Aumentado para mais complexidade (filmes vs produtos)
            activation: 'relu'
        })
    );

    // Dropout para evitar overfitting
    model.add(tf.layers.dropout({ rate: 0.3 }));

    // Camada oculta 1: 128 neurônios
    model.add(
        tf.layers.dense({
            units: 128,
            activation: 'relu'
        })
    );

    model.add(tf.layers.dropout({ rate: 0.2 }));

    // Camada oculta 2: 64 neurônios
    model.add(
        tf.layers.dense({
            units: 64,
            activation: 'relu'
        })
    );

    // Camada de saída: 1 neurônio com sigmoid (probabilidade 0-1)
    model.add(
        tf.layers.dense({
            units: 1,
            activation: 'sigmoid'
        })
    );

    model.compile({
        optimizer: tf.train.adam(0.001),  // Learning rate menor
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
    });

    // Treinar o modelo
    await model.fit(trainData.xs, trainData.ys, {
        epochs: 150,
        batchSize: 16,
        shuffle: true,
        validationSplit: 0.2,  // 20% para validação
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                if (epoch % 10 === 0) {
                    postMessage({
                        type: workerEvents.trainingLog,
                        epoch: epoch,
                        loss: logs.loss,
                        accuracy: logs.acc,
                        valLoss: logs.val_loss,
                        valAccuracy: logs.val_acc
                    });
                }
            }
        }
    });

    return model;
}

/**
 * Handler para treinar o modelo
 * Espera: { users }
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
 * Espera: { user, topN }
 * Retorna: lista de filmes recomendados ordenados por score
 */
function recommend({ user, topN = 10 }) {
    if (!_model) {
        console.error('❌ Modelo não foi treinado');
        return;
    }

    const context = _globalCtx;
    
    try {
        // 1️⃣ Codificar o usuário
        const userVector = encodeUser(user, context).dataSync();

        // 2️⃣ Criar pares (usuário, filme) para cada filme
        const inputs = context.movieVectors.map(({ vector }) => {
            return [...userVector, ...vector];
        });

        // 3️⃣ Converter para Tensor
        const inputTensor = tf.tensor2d(inputs);

        // 4️⃣ Fazer predições
        const predictions = _model.predict(inputTensor);
        const scores = predictions.dataSync();

        // 5️⃣ Criar recomendações com scores
        const recommendations = context.movieVectors.map((item, index) => {
            return {
                ...item.meta,
                id: item.id,
                title: item.title,
                score: scores[index],  // Probabilidade 0-1
                scorePercentage: Math.round(scores[index] * 100)  // Percentual
            };
        });

        // 6️⃣ Ordenar e filtrar já assistidos
        const watched = new Set(user.watched ? user.watched.map(w => w.id) : []);
        const sortedRecommendations = recommendations
            .filter(r => !watched.has(r.id))  // Não recomendar filmes já assistidos
            .sort((a, b) => b.score - a.score)
            .slice(0, topN);

        console.log('🎯 Recomendações geradas:', sortedRecommendations.length);

        // 7️⃣ Enviar para thread principal
        postMessage({
            type: workerEvents.recommend,
            user,
            recommendations: sortedRecommendations
        });

        // Cleanup
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
 * Event listener para mensagens do thread principal
 */
self.onmessage = e => {
    const { action, ...data } = e.data;
    if (handlers[action]) {
        handlers[action](data);
    } else {
        console.warn('❌ Ação desconhecida:', action);
    }
};
