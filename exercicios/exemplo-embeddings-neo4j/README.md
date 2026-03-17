# Embeddings com Neo4j e LangChain

Exemplo de busca por similaridade semântica usando embeddings locais (HuggingFace), Neo4j como banco de vetores e LangChain como orquestrador.

O fluxo carrega um PDF sobre tensores e TensorFlow.js, gera embeddings para cada chunk de texto e os armazena no Neo4j. Em seguida, executa buscas por similaridade com perguntas pré-definidas.

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js v22+ (TypeScript via `--experimental-strip-types`) |
| Embeddings | `@huggingface/transformers` (local, sem API externa) |
| Vector Store | Neo4j 5.14 Community + plugin APOC |
| Orquestração | LangChain (`@langchain/community`, `@langchain/core`) |
| Infraestrutura | Docker Compose |

## Pré-requisitos

- Node.js v22+
- Docker Desktop

## Configuração

1. Copie o arquivo de variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```

2. Preencha o `.env` (os valores do Neo4j já estão configurados para o Docker local):
   ```env
   OPENROUTER_API_KEY=sua_chave_aqui   # https://openrouter.ai/settings/keys
   ```

## Como rodar

```bash
# 1. Instalar dependências
npm install

# 2. Subir o Neo4j via Docker
npm run infra:up

# 3. Executar o exemplo
npm run dev
```

Para derrubar a infraestrutura:
```bash
npm run infra:down
```

## O que acontece ao rodar

1. Carrega o PDF `tensores.pdf` e divide em chunks de 1000 caracteres (overlap de 200)
2. Gera embeddings locais com o modelo `Xenova/all-MiniLM-L6-v2`
3. Limpa os nós existentes no Neo4j e insere os novos chunks com seus vetores
4. Executa buscas por similaridade para 6 perguntas sobre tensores e redes neurais
5. Exibe os 3 trechos mais relevantes para cada pergunta

## Estrutura

```
src/
├── index.ts              # Ponto de entrada — orquestra todo o fluxo
├── config.ts             # Configurações centralizadas (lidas do .env)
├── documentProcessor.ts  # Carrega o PDF e divide em chunks
└── util.ts               # Helpers de exibição de resultados
docker-compose.yml        # Neo4j + APOC
tensores.pdf              # Documento de exemplo (fonte dos dados)
```

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `NEO4J_URI` | URI de conexão Bolt | `bolt://localhost:7687` |
| `NEO4J_USER` | Usuário do Neo4j | `neo4j` |
| `NEO4J_PASSWORD` | Senha do Neo4j | `password` |
| `EMBEDDING_MODEL` | Modelo HuggingFace para embeddings | `Xenova/all-MiniLM-L6-v2` |
| `NLP_MODEL` | Modelo OpenRouter para NLP | `openai/gpt-4o-mini` |
| `OPENROUTER_API_KEY` | Chave da API OpenRouter | — |
| `OPENROUTER_SITE_URL` | URL do site (header OpenRouter) | `http://localhost` |
| `OPENROUTER_SITE_NAME` | Nome do site (header OpenRouter) | `exemplo-embeddings-neo4j` |
