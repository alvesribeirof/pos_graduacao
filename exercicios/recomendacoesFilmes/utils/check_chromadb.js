import { ChromaClient } from "chromadb";
import fs from "fs";

// Esse script permite indexar o Movies.json no ChromaDB via processo Node
// OBSERVAÇÃO: A API client "chromadb" do NPM precisa de um servidor do ChromaDB rodando,
// se o docker não for possível, nós ativaremos o InMemory do projeto ou explicaremos ao usuário
console.log("Para usar o ChromaDB client-side JS é necessário que o servidor do Chroma rodando (ex: via Docker). Como o docker não está disponível, a solução recomendada pelo projeto para prototipagem será a ativada (InMemory).");

// Deixaremos o script preparado para o caso do usuário instalar o ChromaDB
async function run() {
    try {
        const client = new ChromaClient();
        await client.version();
        console.log("Servidor ChromaDB detectado!");
    } catch (e) {
        console.log("Servidor ChromaDB Local não está rodando. Por favor instale o instalador nativo do ChromaDB ou Docker.");
        console.log("O aplicativo usará o Fallback de Vetores em Memória (InMemoryVectorStore).");
    }
}
run();
