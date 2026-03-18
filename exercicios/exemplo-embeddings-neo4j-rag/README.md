# RAG com Embeddings, Neo4j e OpenRouter

Exemplo prático de pipeline RAG (Retrieval-Augmented Generation) com:

- embeddings locais via Hugging Face
- armazenamento vetorial no Neo4j
- recuperação semântica com LangChain
- geração de resposta com LLM via OpenRouter

O projeto usa o PDF `tensores.pdf` como base de conhecimento e responde perguntas em português sobre TensorFlow.js e machine learning.

## Tecnologias usadas

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 22+ com TypeScript executado via `--experimental-strip-types` |
| Embeddings | `@langchain/community` + `@huggingface/transformers` (`Xenova/all-MiniLM-L6-v2`) |
| Vector Store | `Neo4jVectorStore` (`@langchain/community/vectorstores/neo4j_vector`) |
| Banco de dados | Neo4j `5.14.0-community` com APOC |
| Geração (LLM) | `ChatOpenAI` (`@langchain/openai`) apontando para OpenRouter |
| Cadeia RAG | `RunnableSequence`, `ChatPromptTemplate`, `StringOutputParser` |
| Parsing de PDF | `PDFLoader` (`@langchain/community`) |
| Split de texto | `RecursiveCharacterTextSplitter` (`@langchain/textsplitters`) |
| Infra | Docker Compose |

## Pré-requisitos

- Node.js 22+
- Docker Desktop

## Configuração

1. Crie o arquivo `.env` a partir do exemplo.

No Linux/macOS:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Preencha principalmente sua chave OpenRouter:

```env
OPENROUTER_API_KEY=sua_chave_aqui
```

## Como executar

```bash
# instalar dependências
npm install

# subir Neo4j + APOC
npm run infra:up

# executar pipeline completo
npm run dev
```

Para derrubar a infraestrutura:

```bash
npm run infra:down
```

## Fluxo implementado

1. Lê `tensores.pdf` com `PDFLoader`
2. Divide o conteúdo em chunks (1000 caracteres, overlap 200)
3. Inicializa embeddings locais (`Xenova/all-MiniLM-L6-v2`)
4. Conecta ao `Neo4jVectorStore`, aguarda a limpeza dos nós antigos e só então repopula os documentos
5. Para cada pergunta:
   - executa busca vetorial com `similaritySearchWithScore` (top K = 3)
   - filtra contexto por score > 0.5
   - monta prompt com template externo
   - chama o modelo definido em `NLP_MODEL` via OpenRouter
   - salva resposta em markdown na pasta `respostas/`

## Prompts e respostas

- `prompts/answerPrompt.json`: define papel, tarefa, instruções e restrições da resposta
- `prompts/template.txt`: template final do prompt injetando pergunta + contexto
- `respostas/`: saída gerada automaticamente em arquivos `.md`

## Estrutura do projeto

```txt
src/
  ai.ts                 # cadeia RAG (retrieve + generate)
  config.ts             # configurações centrais e leitura de prompts/.env
  documentProcessor.ts  # leitura do PDF e split em chunks
  index.ts              # orquestra ingestão, busca e geração
  util.ts               # utilitários auxiliares
prompts/
  answerPrompt.json     # instruções e metadados do assistente
  template.txt          # template de prompt
respostas/              # respostas geradas em .md
docker-compose.yml      # Neo4j + APOC
tensores.pdf            # documento base
```

## Variáveis de ambiente

| Variável | Descrição | Exemplo/Padrão |
|---|---|---|
| `NEO4J_URI` | URI Bolt do Neo4j | `bolt://localhost:7687` |
| `NEO4J_USER` | Usuário Neo4j | `neo4j` |
| `NEO4J_PASSWORD` | Senha Neo4j | `password` |
| `EMBEDDING_MODEL` | Modelo local de embeddings | `Xenova/all-MiniLM-L6-v2` |
| `NLP_MODEL` | Modelo LLM via OpenRouter | `openai/gpt-4o-mini` |
| `OPENROUTER_API_KEY` | Chave da OpenRouter | obrigatório |
| `OPENROUTER_SITE_URL` | Header HTTP-Referer | `http://localhost` |
| `OPENROUTER_SITE_NAME` | Header X-Title | `exemplo-embeddings-neo4j` |

## Scripts NPM

- `npm run start`: executa uma vez
- `npm run dev`: executa em modo watch
- `npm run infra:up`: sobe o Neo4j via Docker
- `npm run infra:down`: derruba containers e volumes
