/**
 * 🎬 Recomendador de Filmes - Thread Principal
 * 
 * Responsabilidades:
 * - Gerenciar a interface HTML
 * - Comunicar com Web Worker
 * - Renderizar recomendações
 * - Atualizar UI com progresso de treinamento
 */

import { workerEvents } from './events/constants.js';

// Estado da aplicação
let appState = {
    worker: null,
    isTraining: false,
    isModelTrained: false,
    allUsers: [],
    currentUser: null,
    recommendations: []
};

/**
 * Inicializa a aplicação
 */
async function init() {
    console.log('🚀 Iniciando aplicação...');

    try {
        // Carregar usuários
        await loadUsers();

        // Inicializar Web Worker
        initWorker();

        // Configurar event listeners
        setupEventListeners();

        console.log('✅ Aplicação pronta!');
    } catch (error) {
        showError('Erro ao inicializar: ' + error.message);
    }
}

/**
 * Carrega lista de usuários do servidor
 */
async function loadUsers() {
    try {
        const response = await fetch('/data/users.json');
        appState.allUsers = await response.json();
        console.log('📺 Usuários carregados:', appState.allUsers.length);

        // Preencher dropdown de usuários
        populateUserSelect();
    } catch (error) {
        throw new Error('Falha ao carregar usuários: ' + error.message);
    }
}

/**
 * Popula dropdown com usuários
 */
function populateUserSelect() {
    const select = document.getElementById('userSelect');
    select.innerHTML = '';

    appState.allUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = `${user.name} (${user.watched.length} filmes)`;
        select.appendChild(option);
    });

    // Selecionar primeiro usuário
    if (appState.allUsers.length > 0) {
        select.value = appState.allUsers[0].id;
        selectUser(appState.allUsers[0].id);
    }
}

/**
 * Seleciona um usuário
 */
function selectUser(userId) {
    appState.currentUser = appState.allUsers.find(u => u.id == userId);
    console.log('👤 Usuário selecionado:', appState.currentUser?.name);

    // Atualizar UI
    document.getElementById('recommendBtn').disabled = !appState.isModelTrained;
}

/**
 * Inicializa Web Worker
 */
function initWorker() {
    const timestamp = new Date().getTime();
    appState.worker = new Worker(`src/workers/movieTrainingWorker.js?v=${timestamp}`, { type: 'module' });

    // Ouvir mensagens do worker
    appState.worker.onmessage = (e) => {
        const { type, ...data } = e.data;

        switch (type) {
            case workerEvents.trainingLog:
                handleTrainingLog(data);
                break;
            case workerEvents.trainingComplete:
                handleTrainingComplete();
                break;
            case workerEvents.progressUpdate:
                handleProgressUpdate(data);
                break;
            case workerEvents.recommend:
                handleRecommendations(data);
                break;
            case 'trainingError':
            case 'recommendationError':
                handleWorkerError(data);
                break;
            default:
                console.warn('Evento desconhecido:', type);
        }
    };

    console.log('🔗 Web Worker inicializado');
}

/**
 * Configura event listeners da interface
 */
function setupEventListeners() {
    document.getElementById('trainBtn').addEventListener('click', trainModel);
    document.getElementById('recommendBtn').addEventListener('click', getRecommendations);
    document.getElementById('resetBtn').addEventListener('click', resetApp);
    document.getElementById('userSelect').addEventListener('change', (e) => selectUser(e.target.value));
}

/**
 * Inicia treinamento do modelo
 */
function trainModel() {
    if (appState.isTraining) {
        showMessage('Modelo já está sendo treinado...', 'info');
        return;
    }

    if (appState.allUsers.length === 0) {
        showError('Nenhum usuário disponível para treinamento');
        return;
    }

    appState.isTraining = true;
    showMessage('🧠 Treinando modelo neural...', 'info');

    // Desabilitar botões
    document.getElementById('trainBtn').disabled = true;
    document.getElementById('recommendBtn').disabled = true;
    document.getElementById('resetBtn').disabled = true;

    // Mostrar progress bar
    showProgress();

    // Limpar logs anteriores
    const logsDiv = document.getElementById('trainingLogs');
    logsDiv.innerHTML = '';
    logsDiv.style.display = 'block';

    // Enviar mensagem ao worker
    appState.worker.postMessage({
        action: workerEvents.trainModel,
        users: appState.allUsers
    });
}

/**
 * Handler para logs de treinamento
 */
function handleTrainingLog(data) {
    const { epoch, loss, accuracy, valLoss, valAccuracy } = data;

    console.log(`Epoch ${epoch}: loss=${loss.toFixed(4)}, acc=${accuracy.toFixed(4)}`);

    // Atualizar UI com logs
    const logsDiv = document.getElementById('trainingLogs');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `Epoch ${epoch}: loss=${loss.toFixed(4)}, acc=${accuracy.toFixed(4)}, val_loss=${valLoss?.toFixed(4) || 'N/A'}, val_acc=${valAccuracy?.toFixed(4) || 'N/A'}`;
    logsDiv.appendChild(entry);
    logsDiv.scrollTop = logsDiv.scrollHeight;
}

/**
 * Handler para conclusão do treinamento
 */
function handleTrainingComplete() {
    appState.isTraining = false;
    appState.isModelTrained = true;

    // Habilitar botão de recomendação
    document.getElementById('recommendBtn').disabled = false;
    document.getElementById('trainBtn').disabled = false;
    document.getElementById('resetBtn').disabled = false;

    hideProgress();
    showMessage('✅ Modelo treinado com sucesso!', 'success');
    console.log('✅ Treinamento completo');
}

/**
 * Handler para atualização de progresso
 */
function handleProgressUpdate(data) {
    const { progress } = data.progress;
    updateProgress(progress);
}

/**
 * Obtém recomendações para usuário atual
 */
function getRecommendations() {
    if (!appState.isModelTrained) {
        showError('Treine o modelo antes de obter recomendações');
        return;
    }

    if (!appState.currentUser) {
        showError('Selecione um usuário');
        return;
    }

    showMessage('🎯 Gerando recomendações...', 'info');

    const topN = parseInt(document.getElementById('topN').value) || 10;

    appState.worker.postMessage({
        action: workerEvents.recommend,
        user: appState.currentUser,
        topN: topN
    });
}

/**
 * Handler para recomendações recebidas
 */
function handleRecommendations(data) {
    const { user, recommendations } = data;

    appState.recommendations = recommendations;

    console.log(`🎬 ${recommendations.length} recomendações para ${user.name}`);

    renderRecommendations(recommendations);
    showMessage(`✅ ${recommendations.length} filmes recomendados!`, 'success');
}

/**
 * Retorna o container de recomendações compatível com layouts antigos/novos.
 */
function getRecommendationsContainer() {
    return document.getElementById('recommendations')
        || document.getElementById('recommendationsContainer');
}

/**
 * Renderiza recomendações na tela
 */
function renderRecommendations(recommendations) {
    const container = getRecommendationsContainer();
    if (!container) {
        showError('Container de recomendações não encontrado');
        return;
    }

    if (recommendations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <p>Nenhuma recomendação disponível</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '<div class="movie-grid">' + recommendations.map((movie, index) => {
        const rating = movie.rating || 0;
        const genreChips = (movie.genres || []).slice(0, 3).map(g => `<span class="genre-chip">${g}</span>`).join('');
        const posterUrl = movie.poster;

        const posterContent = posterUrl && !posterUrl.includes('via.placeholder.com')
            ? `<img src="${posterUrl}" alt="${movie.title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'movie-poster-placeholder\\'><div class=\\'poster-film-icon\\'>🎬</div><div class=\\'poster-rank\\'>${String(index + 1).padStart(2, '0')}</div></div>'">`
            : `<div class="movie-poster-placeholder">
                    <div class="poster-film-icon">🎬</div>
                    <div class="poster-rank">${String(index + 1).padStart(2, '0')}</div>
               </div>`;

        return `
        <div class="movie-card" style="animation-delay: ${index * 0.05}s">
            <div class="movie-poster">
                ${posterContent}
                <div class="poster-overlay"></div>
                <div class="rank-pill">#${index + 1}</div>
                <div class="rating-pill">★ ${parseFloat(rating).toFixed(1)}</div>
            </div>
            <div class="movie-body">
                <div class="movie-title">${movie.title}</div>
                <div class="movie-meta">
                    ${movie.year ? `<span>📅 ${movie.year}</span>` : ''}
                    <span>🎯 Match</span>
                </div>
                ${genreChips ? `<div class="movie-genres">${genreChips}</div>` : ''}
                <div class="match-score">
                    <div class="match-label">
                        <span>Score de Compatibilidade</span>
                        <span>${movie.scorePercentage || 0}%</span>
                    </div>
                    <div class="match-track">
                        <div class="match-bar" style="width: ${movie.scorePercentage || 0}%"></div>
                    </div>
                </div>
                ${movie.director || (movie.cast && movie.cast.length > 0) ? `
                <div class="movie-credits">
                    ${movie.director ? `<div>🎬 ${movie.director}</div>` : ''}
                    ${movie.cast && movie.cast.length > 0 ? `<div>👤 ${movie.cast.slice(0, 2).join(', ')}</div>` : ''}
                </div>` : ''}
            </div>
        </div>
        `;
    }).join('') + '</div>';
}

/**
 * Handler para erros do worker
 */
function handleWorkerError(data) {
    appState.isTraining = false;
    hideProgress();
    document.getElementById('trainBtn').disabled = false;
    document.getElementById('resetBtn').disabled = false;

    showError('Erro: ' + data.error);
    console.error('❌ Erro do Worker:', data.error);
}

/**
 * Reseta a aplicação
 */
function resetApp() {
    appState.isTraining = false;
    appState.isModelTrained = false;
    appState.recommendations = [];

    document.getElementById('trainBtn').disabled = false;
    document.getElementById('recommendBtn').disabled = true;
    const container = getRecommendationsContainer();
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🍿</div>
                <p>Selecione um usuário e clique em "Recomendar" para ver as sugestões personalizadas</p>
            </div>
        `;
    }

    hideProgress();
    showMessage('🔄 Sistema resetado', 'info');
}

/**
 * Exibe mensagem na tela
 */
function showMessage(text, type = 'info') {
    const container = document.getElementById('statusMessage');
    container.className = `status-message active ${type}`;
    container.textContent = text;
}

/**
 * Exibe erro
 */
function showError(text) {
    showMessage(text, 'error');
}

/**
 * Mostra barra de progresso
 */
function showProgress() {
    const section = document.getElementById('progressSection');
    section.classList.add('active');
    updateProgress(0);
}

/**
 * Atualiza barra de progresso
 */
function updateProgress(value) {
    document.getElementById('progressFill').style.width = value + '%';
    document.getElementById('progressText').textContent = `Progresso: ${value}%`;
}

/**
 * Esconde barra de progresso
 */
function hideProgress() {
    const section = document.getElementById('progressSection');
    section.classList.remove('active');
}

// Inicializar quando página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
