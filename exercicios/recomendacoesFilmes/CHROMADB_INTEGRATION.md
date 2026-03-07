# 🗄️ Integração com ChromaDB

Este guia explica como integrar **ChromaDB** para persistência dos vetores de filmes.

## 📋 Por que ChromaDB?

- ✅ **Fácil setup**: Instale com npm, use como lib JS
- ✅ **Local-first**: Dados persistem no disco
- ✅ **Rápido**: Busca vetorial otimizada
- ✅ **Gratuito**: Open-source
- ✅ **Escalável**: Suporta milhões de documentos

## 🚀 Setup

### 1. Instalar ChromaDB

```bash
npm install chromadb
```

### 2. Usar ChromaDB no Worker

```javascript
// no movieTrainingWorker.js
import { Chroma } from 'chromadb';

const chroma = new Chroma();

// Criar coleção para filmes
const moviesCollection = await chroma.getOrCreateCollection({
    name: 'movies',
    metadata: { description: 'Vetores de filmes' }
});

// Armazenar vetores dos filmes
await moviesCollection.upsert({
    ids: [movie.id.toString()],
    embeddings: [encodeMovie(movie, context).dataSync()],
    documents: [movie.title],
    metadata: {
        title: movie.title,
        year: movie.year,
        rating: movie.rating,
        genres: movie.genres.join(','),
        director: movie.director
    }
});
```

### 3. Busca Vetorial

```javascript
// Buscar filmes similares ao vetor do usuário
const results = await moviesCollection.query({
    queryEmbeddings: [userVector],
    nResults: 50,  // Top 50 filmes mais próximos
    include: ['embeddings', 'documents', 'metadatas', 'distances']
});

// Usar apenas esses 50 filmes no modelo
const topFilmIds = results.ids[0];
const topMovies = topFilmIds.map(id => 
    context.movieVectors.find(m => m.id === parseInt(id))
);
```

## 📊 Arquitetura com ChromaDB

```
┌─────────────────────────────────────┐
│     Thread Principal (Main)         │
│  ┌─────────────────────────────────┐│
│  │ 1. Carregar usuários            ││
│  │ 2. Enviar ao Worker             ││
│  │ 3. Renderizar recomendações     ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────┐
│   Web Worker (movieTrainingWorker)  │
│  ┌─────────────────────────────────┐│
│  │ Codificar filmes → vetores      ││
│  │ Armazenar em ChromaDB           ││
│  │ Treinar rede neural             ││
│  │ Buscar top-50 filmes (ChromaDB) ││
│  │ Fazer predições nos top-50      ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────┐
│  ChromaDB (Vetor Database Local)    │
│  ┌─────────────────────────────────┐│
│  │ Coleção: movies                 ││
│  │ - 1000+ vetores de filmes       ││
│  │ - Metadados (title, year, etc)  ││
│  │ - Índice HNSW para busca rápida ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

## 💡 Caso de Uso Real

### Sem ChromaDB
```
1. Usuário faz recomendação
2. Modelo prediz score para TODOS os 1000 filmes
3. Ordena e retorna top-10
⏱️ Tempo: ~500ms em 1000 filmes
```

### Com ChromaDB
```
1. Usuário faz recomendação
2. ChromaDB busca top-50 filmes mais próximos (busca vetorial)
3. Modelo prediz score para os 50 filmes
4. Ordena e retorna top-10
⏱️ Tempo: ~50ms em 50 filmes (10x mais rápido!)
```

## 🔧 Implementação Completa

Veja `chromadb-integration.js` para implementação pronta.

## 📚 Alternativas

### Weaviate (Recomendado para Produção)
```bash
npm install weaviate-ts-client
```
- Melhor suporte a metadados
- REST API incluída
- Cloud gratuito para testar

### Pinecone (SaaS)
```bash
npm install @pinecone-database/pinecone
```
- Cloud gerenciado
- Ultra-low latency
- Pago por uso

### PostgreSQL + pgvector
```bash
npm install pg
```
- Integre com banco relacional existente
- Sem dependências externas
- Suporta SQL + vetores

## 🎯 Próximos Passos

1. **Implementar ChromaDB** no movieTrainingWorker.js
2. **Otimizar buscas** com função de similaridade
3. **Persistir dados** entre sessões
4. **Montar API REST** para servir recomendações
5. **Deploy em produção** com banco de dados remoto

## 📖 Referências

- [ChromaDB Docs](https://docs.trychroma.com/)
- [Embedding Models](https://python.langchain.com/docs/integrations/text_embedding)
- [Vector Search Algorithms](https://en.wikipedia.org/wiki/Nearest_neighbor_search)
