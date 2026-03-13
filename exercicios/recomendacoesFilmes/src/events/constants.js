/**
 * Constantes para eventos de comunicação entre threads
 * Thread principal ↔ Web Worker
 */

export const workerEvents = {
    // Main → Worker
    trainModel: 'TRAIN_MODEL',
    recommend: 'RECOMMEND',

    // Worker → Main
    trainingLog: 'TRAINING_LOG',
    trainingComplete: 'TRAINING_COMPLETE',
    progressUpdate: 'PROGRESS_UPDATE',
    trainingError: 'TRAINING_ERROR',
    recommendationError: 'RECOMMENDATION_ERROR'
};

export const appEvents = {
    // Interface Events
    userSelected: 'USER_SELECTED',
    trainStart: 'TRAIN_START',
    trainComplete: 'TRAIN_COMPLETE',
    recommendationsReady: 'RECOMMENDATIONS_READY',
    error: 'ERROR',
    progressUpdate: 'PROGRESS_UPDATE'
};
