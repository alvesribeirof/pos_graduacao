# 📄 Exemplo 05 - Local RAG (Retrieval-Augmented Generation)

Este é o exemplo mais avançado da série, implementando um pipeline completo de **RAG local** que permite conversar com arquivos PDF sem enviar dados para a nuvem.

## 🚀 Tecnologias Utilizadas

- **Gemini Nano (Prompt API)**: LLM nativo do Chrome para geração de texto.
- **Transformers.js (Xenova)**: Execução local do modelo `all-MiniLM-L6-v2` para geração de embeddings no browser.
- **ChromaDB**: Banco de dados vetorial local para armazenamento e busca semântica.
- **PDF.js**: Extração de texto de documentos PDF diretamente no cliente.
- **Chrome Translation API**: Tradução automática de termos quando necessário.

## 🧠 Como Funciona

1. **Upload**: O usuário faz o upload de um PDF.
2. **Chunking**: O texto é dividido em blocos (chunks).
3. **Embeddings**: Transfomers.js gera vetores numéricos para cada bloco.
4. **Vector Store**: Os vetores e textos são salvos no ChromaDB local.
5. **Retrieval**: Ao fazer uma pergunta, o sistema busca os 3 trechos mais relevantes do PDF.
6. **Augmented Prompt**: Os trechos são enviados ao Gemini Nano como contexto para a resposta final.

## 🛠️ Requisitos e Setup

### Flags do Chrome
Ative as seguintes flags em `chrome://flags`:
- `#prompt-api-for-gemini-nano`
- `#translation-api`
- `#language-detector-api`

### ChromaDB Local
Você precisa de um servidor ChromaDB rodando e acessível com CORS liberado.
```bash
# Executar o servidor via Python
python run_chroma.py
```

## 📂 Estrutura Modular
- `services/`: Lógica de IA, RAG e Tradução.
- `controllers/`: Gerenciamento de eventos e fluxo de dados.
- `views/`: Manipulação do DOM e interface.
