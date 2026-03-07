# 📥 Guia: Integração de Dados do Kaggle

Este guia explica como baixar dados de filmes do Kaggle e adaptá-los para o recomendador.

## 🎯 Datasets Recomendados

### 1️⃣ MovieLens (MAIS RECOMENDADO)
- **Link**: https://www.kaggle.com/datasets/grouplens/movielens-20m-dataset
- **Tamanho**: 400MB+ | ~27,000 filmes | ~138,000 usuários
- **Dados**: ratings.csv, movies.csv, links.csv
- **Qualidade**: ⭐⭐⭐⭐⭐ - Dataset padrão da indústria

### 2️⃣ IMDb Movies
- **Link**: https://www.kaggle.com/datasets/pythonx/imdb-movies
- **Tamanho**: 50MB | ~10,000 filmes
- **Dados**: movies.csv com metadados completos
- **Qualidade**: ⭐⭐⭐⭐ - Bom para iniciar

### 3️⃣ Netflix Prize
- **Link**: https://www.kaggle.com/datasets/netflix-inc/netflix-prize-data
- **Tamanho**: 2GB + | Histórico real de visualizações
- **Dados**: Próprio para análise de histórico
- **Qualidade**: ⭐⭐⭐⭐⭐ - Dados reais de produção

## 📋 Setup Inicial

### Passo 1: Instalar Kaggle CLI

```bash
npm install -g kaggle
```

ou com Python:
```bash
pip install kaggle
```

### Passo 2: Configurar API Key

1. Vá em https://www.kaggle.com/account
2. Clique em **"Create New Token"**
3. Salve o arquivo `kaggle.json` em `~/.kaggle/`
4. Ajuste permissões:
   ```bash
   chmod 600 ~/.kaggle/kaggle.json
   ```

### Passo 3: Baixar Dataset

```bash
# Opção 1: Usar script fornecido
npm run download-data

# Opção 2: Manualmente
kaggle datasets download -d grouplens/movielens-20m-dataset -p data/
unzip data/movielens-20m-dataset.zip -d data/
```

## 🔄 Convertendo para Formato Esperado

### MovieLens → Formato Local

```python
import pandas as pd
import json

# Carregar dados
movies = pd.read_csv('data/ml-20m/movies.csv')
ratings = pd.read_csv('data/ml-20m/ratings.csv')

# Preparar movies.json
movies_list = []
for idx, row in movies.iterrows():
    title, genres = row['title'].rsplit(' (', 1)
    genres = genres[:-1]  # Remover ')'
    genres_list = [g.strip() for g in genres.split('|')]
    
    movies_list.append({
        'id': int(row['movieId']),
        'title': title,
        'year': int(title.split('(')[-1][:-1]) if '(' in title else 2000,
        'rating': 7.0,  # Será atualizado com ratings médios
        'genres': genres_list,
        'director': 'Unknown',
        'cast': []
    })

# Adicionar ratings médios
movie_ratings = ratings.groupby('movieId')['rating'].mean()
for movie in movies_list:
    movie['rating'] = float(movie_ratings.get(movie['id'], 7.0))

# Salvar
with open('data/movies.json', 'w') as f:
    json.dump(movies_list, f, ensure_ascii=False, indent=2)

# Preparar users.json
users_data = ratings.groupby('userId').apply(
    lambda x: {
        'id': int(x.iloc[0]['userId']),
        'name': f"Usuário {int(x.iloc[0]['userId'])}",
        'watched': [
            {
                'id': int(row['movieId']),
                'title': next((m['title'] for m in movies_list if m['id'] == int(row['movieId'])), 'Unknown'),
                'userRating': int(row['rating'])
            }
            for _, row in x.iterrows()
        ]
    }
).tolist()

# Limitar a 100 usuários para não sobrecarregar
users_data = users_data[:100]

with open('data/users.json', 'w') as f:
    json.dump(users_data, f, ensure_ascii=False, indent=2)

print(f"✅ {len(movies_list)} filmes salvos")
print(f"✅ {len(users_data)} usuários salvos")
```

### IMDb → Formato Local

```python
import pandas as pd
import json

# Carregar dados IMDb
df = pd.read_csv('data/imdb_movies.csv')

movies_list = []
for idx, row in df.head(10000).iterrows():  # Limitar a 10k
    if pd.isna(row['title']):
        continue
        
    # Parse genres
    genres = []
    if pd.notna(row['genre']):
        genres = [g.strip() for g in str(row['genre']).split(',')]
    
    movies_list.append({
        'id': idx,
        'title': row['title'],
        'year': int(row['year']) if pd.notna(row['year']) else 2000,
        'rating': float(row['rating']) if pd.notna(row['rating']) else 7.0,
        'genres': genres,
        'director': row['director'] if pd.notna(row['director']) else 'Unknown',
        'cast': [a.strip() for a in str(row['actors']).split(',')[:5]] if pd.notna(row['actors']) else []
    })

with open('data/movies.json', 'w') as f:
    json.dump(movies_list, f, ensure_ascii=False, indent=2)

print(f"✅ {len(movies_list)} filmes salvos")
```

## 🧪 Testando Dados

```bash
# Verificar estrutura
node -e "
const movies = require('./data/movies.json');
const users = require('./data/users.json');
console.log('📽️ Filmes:', movies.length);
console.log('👥 Usuários:', users.length);
console.log('Sample movie:', JSON.stringify(movies[0], null, 2));
"
```

## ⚠️ Dicas Importantes

### Limpeza de Dados

```python
# Remover filmes sem informações
movies = [m for m in movies if m.get('title') and m.get('year')]

# Remover usuários sem histórico
users = [u for u in users if len(u.get('watched', [])) > 0]

# Limitar escopo para testes rápidos
movies = movies[:1000]
users = users[:100]
```

### Performance

| Dataset | Filmes | Usuários | Tempo Treino | Espaço |
|---------|--------|----------|--------------|--------|
| Exemplo | 10 | 8 | 5s | 1MB |
| Small | 1,000 | 100 | 30s | 50MB |
| Medium | 10,000 | 1,000 | 5min | 500MB |
| Large | 27,000 | 10,000 | 30min+ | 2GB+ |

### Recomendações para Começar

```json
{
  "development": {
    "filmes": 500,
    "usuarios": 50,
    "tempo_esperado": "15 segundos"
  },
  "producao": {
    "filmes": 5000,
    "usuarios": 500,
    "tempo_esperado": "2 minutos",
    "requer_chromadb": true
  }
}
```

## 🚀 Próximos Passos

1. ✅ Baixar dados do Kaggle
2. ✅ Converter para formato JSON
3. ✅ Testar no recomendador
4. ✅ Ajustar hiperparâmetros se necessário
5. ✅ Integrar ChromaDB para escalar

## 📚 Scripts Python Úteis

### Validar Dados

```python
import json

def validate_data(movies_file, users_file):
    with open(movies_file) as f:
        movies = json.load(f)
    with open(users_file) as f:
        users = json.load(f)
    
    print(f"📽️ Total de filmes: {len(movies)}")
    print(f"👥 Total de usuários: {len(users)}")
    
    # Verificar campos obrigatórios
    required_movie_fields = ['id', 'title', 'rating', 'year', 'genres']
    missing = [f for f in required_movie_fields if f not in movies[0]]
    if missing:
        print(f"❌ Campos faltando em filmes: {missing}")
    else:
        print("✅ Filme template OK")
    
    # Assistências por usuário
    avg_watched = sum(len(u['watched']) for u in users) / len(users)
    print(f"⏱️ Média de filmes/usuário: {avg_watched:.1f}")
    
    # Cobertura de filmes
    watched_ids = set()
    for u in users:
        watched_ids.update(w['id'] for w in u['watched'])
    coverage = len(watched_ids) / len(movies) * 100
    print(f"📊 Cobertura: {coverage:.1f}% dos filmes têm rating de usuários")

validate_data('data/movies.json', 'data/users.json')
```

## 🆘 Troubleshooting

### "Kaggle API não configurado"
```bash
# Verificar
kaggle datasets list | head
# Se erro: Configure ~/.kaggle/kaggle.json
```

### "JSON inválido"
```python
# Validar JSON antes de usar
import json
try:
    with open('data/movies.json') as f:
        json.load(f)
    print("✅ JSON válido")
except json.JSONDecodeError as e:
    print(f"❌ Erro: {e}")
```

### "Dataset muito grande"
```python
# Limitar a subset
movies = movies[:5000]
users = users[:500]
```

---

**Pronto!** Agora você tem dados reais para treinar o recomendador. 🎬
