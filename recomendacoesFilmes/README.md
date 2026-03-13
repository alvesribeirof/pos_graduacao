# 🎬 Sistema de Recomendação de Filmes

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/<your-username>/recomendacoes-filmes/actions/workflows/ci.yml/badge.svg)](https://github.com/<your-username>/recomendacoes-filmes/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/recomendacoes-filmes?label=npm)](https://www.npmjs.com/package/recomendacoes-filmes)

Um sistema inteligente de recomendação de filmes usando **TensorFlow.js** para treinar uma rede neural que aprende as preferências dos usuários.

## 🎯 Características

- ✅ Rede neural com TensorFlow.js para classificação de preferências
- ✅ Codificação de features: gênero, atores, diretores, ano, rating
- ✅ Web Workers para treino não-bloqueante
- ✅ Integração com dados do Kaggle
- ✅ Interface interativa com visualização de recomendações
- ✅ Cálculo de vetores para busca semântica

## 📊 Features dos Filmes

O sistema codifica cada filme com:
- **Rating**: Nota normalizada (0-10)
- **Ano**: Ano de lançamento normalizado
- **Gêneros**: One-hot encoding de múltiplos gêneros
- **Atores**: One-hot encoding dos principais atores
- **Diretores**: One-hot encoding do diretor

## 🏗️ Arquitetura de Rede Neural

```
Input Layer (256 neurons) → Dropout 0.3
    ↓
Dense Layer (128 neurons) → ReLU → Dropout 0.2
    ↓
Dense Layer (64 neurons) → ReLU
    ↓
Output Layer (1 neuron) → Sigmoid [0-1]
```

## 📁 Estrutura do Projeto

```
recomendacoesFilmes/
├── package.json
├── README.md
├── index.html              # Interface web
├── data/
│   ├── movies.json        # Dataset de filmes
│   └── users.json         # Histórico de usuários
├── src/
│   ├── index.js           # Ponto de entrada
│   ├── controller/
│   │   └── MovieController.js
│   ├── service/
│   │   └── MovieService.js
│   ├── view/
│   │   ├── MovieView.js
│   │   └── templates/
│   │       └── movie-card.html
│   ├── events/
│   │   └── constants.js
│   └── workers/
│       └── movieTrainingWorker.js
└── utils/
    └── kaggleDownloader.js
```

## 🚀 Quick Start

```bash
# Instalar dependências
npm install

# Baixar dados do Kaggle (opcional)
npm run download-data

# Iniciar servidor
npm start

# Abrir em http://localhost:8000
```

### 🗄️ ChromaDB

O sistema agora **inicia o ChromaDB automaticamente** ao executar `npm start`. Ele utiliza a instalação local no diretório `.venv` e persiste os dados em `chroma_data/`.

Um **Proxy de CORS** também é iniciado na porta 8001 para permitir que o Web Worker no navegador se comunique com o servidor ChromaDB na porta 8000 sem problemas de segurança.

Caso deseje rodar via Docker (opcional):

```bash
docker run -p 8000:8000 chromadb/chroma
```

(ou use `docker-compose` se preferir)

Agora, quando o `movieTrainingWorker` treinar o modelo ele irá enviar os
vetores ao servidor e, durante recomendações, fará uma pré‑filtragem
baseada na busca vetorial.

> **📝 Preparar antes de subir no GitHub**
> 1. Crie um repositório vazio em GitHub (`recomendacoes-filmes`).
> 2. Atualize o campo `repository.url` no `package.json` com seu usuário.
> 3. Adicione, commite e faça o primeiro push:
>    ```bash
>    git init
>    git add .
>    git commit -m "Initial commit"
>    git branch -M main
>    git remote add origin https://github.com/<your-username>/recomendacoes-filmes.git
>    git push -u origin main
>    ```


## 📝 Estrutura de Dados

### movies.json
```json
[
  {
    "id": 1,
    "title": "Inception",
    "year": 2010,
    "rating": 8.8,
    "genres": ["Sci-Fi", "Action", "Thriller"],
    "director": "Christopher Nolan",
    "cast": ["Leonardo DiCaprio", "Marion Cotillard", "Joseph Gordon-Levitt"],
    "overview": "..."
  }
]
```

### users.json
```json
[
  {
    "id": 1,
    "name": "João Silva",
    "watched": [
      {
        "id": 1,
        "title": "Inception",
        "userRating": 9
      }
    ]
  }
]
```

## 🧠 Como Funciona o Treinamento

1. **Codificação**: Cada filme e usuário viram vetores numéricos
2. **Pares de Treino**: (usuário, filme) → label (assistiu/não assistiu)
3. **Treinamento**: Rede neural aprende a prever se usuário vai gostar
4. **Recomendação**: Para novo usuário, calcula score para todos os filmes

## 📊 Pesos das Features

```javascript
const WEIGHTS = {
    genre: 0.35,      // Gênero é muito importante
    rating: 0.25,     // Qualidade do filme
    actor: 0.20,      // Atores favoritos
    director: 0.10,   // Diretor preferido
    year: 0.10        // Ano de lançamento
};
```

## 🔗 Integração com Kaggle

Datasets recomendados:
- **MovieLens**: Recomendado para produção
- **IMDb Movies**: Amplo, com muitos metadados
- **Netflix Prize**: Histórico de visualizações

## 📈 Próximas Melhorias

- [x] Integração e Persistência com ChromaDB
- [ ] API REST para servir recomendações
- [ ] Dashboard de análise
- [ ] Fine-tuning de hiperparâmetros
- [ ] Suporte a embeddings de sinopse

## 🛠️ Desenvolvimento

```bash
# Modo watch (auto-refresh)
npm run dev

# Build para produção
npm run build
```

## 📚 Referências

- [TensorFlow.js Documentation](https://js.tensorflow.org/)
- [Kaggle Datasets](https://www.kaggle.com/datasets)
- [Recommendation Systems](https://en.wikipedia.org/wiki/Recommender_system)

## 🔒 Atualizacao de Seguranca e Dependencias (2026-03-13)

- Atualizacao de dependencias e lockfile do projeto.
- Aplicacao de correcoes de seguranca nao destrutivas.
- Auditoria de producao (`npm audit --omit=dev`) sem vulnerabilidades.
