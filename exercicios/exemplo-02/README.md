# Exemplo 02 - Duck Hunt JS com Pipeline Web

Implementacao do jogo Duck Hunt em JavaScript/HTML5, com pipeline de build e assets para uso em navegador.

## Objetivo

- Demonstrar arquitetura front-end com modulos ES.
- Trabalhar com renderizacao, audio e assets de jogo.
- Executar fluxo local de desenvolvimento com build automatizado.

## Requisitos

- Node.js 18+
- npm 9+
- ffmpeg (para rebuild de audio)
- texturepacker (para rebuild de sprites)

## Como Executar

```bash
npm install
npm start
```

A aplicacao sera servida em http://localhost:8080. Evite abrir por file:// devido a restricoes de CORS.

## Scripts Uteis

- npm run build: gera build manual de producao.
- npm run audio: recompila sprites de audio.
- npm run images: recompila sprites de imagem.
- npm run lint: valida padrao de codigo.

## Estrutura Principal

- src: codigo-fonte do jogo.
- dist: build pronto para execucao.
- machine-learning: recursos de ML usados no projeto.
- vendor: dependencias auxiliares.
