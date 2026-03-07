# 💬 Exemplo 04 - AI Chat com Parâmetros

Um chat interativo utilizando a **Prompt API (Gemini Nano)** nativa do Chrome, com interface para ajuste fino de parâmetros de geração.

## 🎯 Funcionalidades

- **Ajuste de Parâmetros**: Controles deslizantes para `Temperature` e `TopK`.
- **Streaming de Resposta**: Visualização da resposta da IA em tempo real.
- **Botão Stop**: Possibilidade de interromper a geração a qualquer momento via `AbortController`.
- **Checagem de Requisitos**: Validação automática de navegador, flags e status do download do modelo.

## 📋 Configuração do Ambiente

1. Use o **Google Chrome** recente.
2. Ative a flag: `chrome://flags/#prompt-api-for-gemini-nano`.
3. Reinicie o navegador.

## 🚀 Como Executar

```bash
# Instalar dependências (para o servidor de desenvolvimento)
npm install

# Iniciar o servidor
npm run dev
```
Abra em `http://localhost:8080`.
