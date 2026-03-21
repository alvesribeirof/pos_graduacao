# Exemplo 05 - Local RAG com PDF

Exemplo avancado de RAG local para perguntas sobre PDFs, combinando embeddings no navegador com armazenamento vetorial no ChromaDB.

## Objetivo

- Fazer ingestao local de PDF.
- Gerar embeddings no browser.
- Recuperar contexto relevante e responder com Gemini Nano.

## Tecnologias

- Prompt API (Gemini Nano)
- Transformers.js
- ChromaDB
- PDF.js
- Translation API do Chrome

## Requisitos

- Google Chrome com suporte as APIs nativas.
- Flags ativas em chrome://flags:
	- #prompt-api-for-gemini-nano
	- #translation-api
	- #language-detector-api
- Servidor ChromaDB local em execucao.

## Como Executar

```bash
npm install
python run_chroma.py
```

Depois abra index.html conforme instrucoes do projeto.

## Fluxo RAG

1. Upload do PDF.
2. Chunking do texto.
3. Geracao de embeddings.
4. Persistencia no ChromaDB.
5. Recuperacao de contexto relevante.
6. Resposta final com prompt enriquecido.

## Estrutura Principal

- controllers: fluxo de eventos.
- services: IA, embeddings e recuperacao.
- views: interface.
