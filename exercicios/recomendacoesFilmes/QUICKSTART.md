# 🚀 Quick Start - Recomendador de Filmes

## ⚡ 5 Minutos para Começar

### 1. Clonar/Entrar na pasta
```bash
cd recomendacoesFilmes
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Iniciar servidor
```bash
npm start
```

### 4. Abrir no navegador
```
http://localhost:8000
```

### 5. Treinar e Recomendar
- Selecione um usuário
- Clique em **"🧠 Treinar Modelo"**
- Espere o treinamento (≈30 segundos)
- Clique em **"🎯 Recomendar"**
- Veja as sugestões personalizadas! 🎬

## 📊 Dados de Teste Inclusos

Vem com **10 filmes** e **8 usuários** pré-configurados em:
- `data/movies.json`
- `data/users.json`

## 🔄 Usar Dados do Kaggle

### Opção 1: Automático
```bash
npm run download-data
```

### Opção 2: Manual
1. Vá em [kaggle.com/datasets](https://www.kaggle.com/datasets)
2. Procure "MovieLens" ou "IMDb Movies"
3. Download
4. Converta para JSON (veja `KAGGLE_INTEGRATION.md`)
5. Copie para `data/movies.json` e `data/users.json`

## 🗂️ Estrutura de Arquivos

```
recomendacoesFilmes/
├── index.html                    # Interface Web
├── package.json                  # Dependências
├── src/
│   ├── index.js                 # Lógica principal
│   ├── events/constants.js      # Eventos
│   ├── workers/
│   │   └── movieTrainingWorker.js # IA
│   └── chromadb-example.js       # Exemplo integração
├── data/
│   ├── movies.json              # Filmes
│   └── users.json               # Usuários
├── utils/
│   └── kaggleDownloader.js       # Download Kaggle
└── docs/
    ├── README.md                 # Documentação
    ├── CHROMADB_INTEGRATION.md   # ChromaDB
    └── KAGGLE_INTEGRATION.md     # Kaggle
```

## 🎓 Como Funciona

```
┌──────────────────────────────┐
│   1. Interface Web           │
│   - Selecionar usuário       │
│   - Clicar em Treinar        │
│   - Clicar em Recomendar     │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   2. Web Worker              │
│   - Codificar filmes         │
│   - Treinar rede neural TF.js│
│   - Fazer predições          │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   3. Interface Atualizada    │
│   - Exibir top-10 filmes     │
│   - Mostrar scores (0-100%)  │
│   - Permitir novas consultas │
└──────────────────────────────┘
```

## 🧠 O Modelo Neural

**Arquitetura:**
- Entrada: ~30-100 features (gênero, ano, atores, diretor, rating)
- Layer 1: 256 neurônios + Dropout 30%
- Layer 2: 128 neurônios + Dropout 20%
- Layer 3: 64 neurônios
- Saída: 1 neurônio (probabilidade 0-1)

**Treinamento:**
- 150 épocas
- 20% validação
- Adam optimizer
- Binary crossentropy loss

## 💡 Recursos da UI

| Botão | Função |
|-------|--------|
| 🧠 Treinar | Treina rede neural com histórico dos usuários |
| 🎯 Recomendar | Gera top-N filmes baseado em preferências |
| 🔄 Resetar | Limpa tudo e recomeça |

## 🔧 Personalização

### Alterar Top N Filmes
```
Mude o campo "Top N Recomendações" para:
- 5: Top 5 (rápido)
- 10: Top 10 (padrão)
- 20: Top 20 (mais opções)
```

### Alterar Pesos das Features
No arquivo `src/workers/movieTrainingWorker.js`:

```javascript
const WEIGHTS = {
    genre: 0.35,    // Aumentar → favorecer gênero
    rating: 0.25,   // Aumentar → favorecer qualidade
    actor: 0.20,    // Aumentar → favorecer atores
    director: 0.10, // Aumentar → favorecer diretores
    year: 0.10      // Aumentar → favorecer ano
};
```

### Alterar Arquitetura da Rede
No mesmo arquivo:

```javascript
// Aumentar neurônios para melhor aprendizado
units: 256    // ← aumentar aqui
units: 128    // ← ou aqui
units: 64     // ← ou aqui
```

## 🐛 Troubleshooting

### "Erro ao carregar dados"
- Verifique se `data/movies.json` e `data/users.json` existem
- Valide JSON: `npm run validate-data`

### "Web Worker não responde"
- Abra DevTools (F12)
- Verifique Console por erros
- Reinicie o navegador

### "Treinamento muito lento"
- Reduza número de filmes em `data/movies.json`
- Reduza número de usuários em `data/users.json`
- Ou aumentar RAM/CPU disponível

### "Recomendações ruins"
- Aumentar épocas: `epochs: 200` (leva mais tempo)
- Aumentar dataset de usuários
- Ajustar pesos das features
- Considere usar ChromaDB

## 📈 Próximos Passos

1. **Testar com dados reais** → Baixe do Kaggle (veja `KAGGLE_INTEGRATION.md`)
2. **Integrar ChromaDB** → Mais rápido com datasets grandes (veja `CHROMADB_INTEGRATION.md`)
3. **Deploy** → Publicar online (Netlify, Vercel, etc)
4. **API REST** → Servir recomendações via API
5. **Chat** → Integrar com LLM para recomendações conversacionais

## 🎯 Exemplos de Uso

### Caso 1: Prototipar
```
✅ Dados padrão (10 filmes, 8 usuários)
✅ Treino rápido (30 segundos)
✅ Sem dependências externas
```

### Caso 2: Testar Escalabilidade
```
⚠️ MovieLens (1,000 filmes, 100 usuários)
⚠️ Treino mais longo (2-3 minutos)
✅ Sem ChromaDB
```

### Caso 3: Produção
```
❌ Sem ChromaDB: Muito lento
✅ Com ChromaDB: ~100ms por recomendação
✅ MovieLens completo (27k filmes)
✅ API REST
```

## 🔗 Links Úteis

- [TensorFlow.js Docs](https://www.tensorflow.org/js)
- [MovieLens Dataset](https://www.kaggle.com/datasets/grouplens/movielens-20m-dataset)
- [ChromaDB](https://www.trychroma.com/)
- [Weaviate](https://weaviate.io/)

## 🤝 Contribuindo

Sugestões e melhorias são bem-vindas!

---

**Desenvolvido com 💜 usando TensorFlow.js**
