# Exemplo 04 - Web AI Chat com Parametros

Chat interativo com Prompt API no Chrome, incluindo configuracao de parametros de geracao e resposta em streaming.

## Objetivo

- Construir interface de chat com IA nativa no navegador.
- Controlar parametros de inferencia como temperature e topK.
- Permitir cancelamento da resposta com AbortController.

## Requisitos

- Google Chrome recente com suporte a Prompt API.
- Flag ativa: chrome://flags/#prompt-api-for-gemini-nano

## Como Executar

```bash
npm install
npm run dev
```

Abra em http://localhost:8080.

## Arquivos Principais

- index.html: estrutura da interface.
- index.js: logica de chat, parametros e streaming.
- style.css: estilos da aplicacao.
