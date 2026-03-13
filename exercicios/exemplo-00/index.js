import * as tf from '@tensorflow/tfjs';

async function trainModel(inputXs, outputYs) {
    const model = tf.sequential();

    // entrada
    model.add(tf.layers.dense({
        inputShape: [7], // 7 posições de entrada (idade, 3 cores + 3 cidades)
        units: 80, // quanto maior, mais processamento vai usar
        activation: 'relu' // filtro
    }));

    // saída
    model.add(tf.layers.dense({
        units: 3, // 3 categorias de saída (premium, medium, basic)
        activation: 'softmax' // filtro // normaliza a saída em probabilidades
    }));


    // Compila o modelo
    model.compile({
        optimizer: 'adam', // algoritmo de otimização (Adam = Adaptive Moment Estimation)
        loss: 'categoricalCrossentropy', // compara com a resposta correta e calcula o erro
        metrics: ['accuracy'] // métrica para avaliar o modelo
    });

    // Treina o modelo
    await model.fit(inputXs, outputYs, {
        epochs: 100, // número de vezes que o modelo vai passar pelos dados de treinamento
        shuffle: true, // embaralha os dados a cada época para evitar overfitting (viés)
        verbose: 0, // 0 = sem logs, 1 = logs por época, 2 = logs por lote
        callbacks: {
            // onEpochEnd: (epoch, logs) => {
            //     console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(2)}, accuracy = ${logs.acc.toFixed(2)}`);
            // }
        }
    });

    return model;
}

async function predict(model, pessoa) {
    const inputTensor = tf.tensor2d(pessoa);
    const prediction = model.predict(inputTensor);
    const predictedArray = await prediction.array();
    return predictedArray[0].map((prob, index) => ({ prob, index }))
}

const tensorPessoasNormalizado = [
    [0.33, 1, 0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0, 1, 0],
    [1, 0, 0, 1, 0, 0, 1]
]

const labelsNomes = ["premium", "medium", "basic"];

const tensorLabels = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
]

const inputXs = tf.tensor2d(tensorPessoasNormalizado);
const outputYs = tf.tensor2d(tensorLabels);

// quanto mais dado melhor!
// assim o algoritmo consegue entender melhor os padrões complexos
// dos dados
const model = await trainModel(inputXs, outputYs);

const pessoaTensorNormalizado = [
    [0.2, 0, 0, 1, 0, 0, 1]
]

const predictions = await predict(model, pessoaTensorNormalizado);
const results = predictions
    .sort((a, b) => b.prob - a.prob)
    .map(p => `${labelsNomes[p.index]}: ${(p.prob * 100).toFixed(2)}%`)
    .join('\n');

console.log(results);