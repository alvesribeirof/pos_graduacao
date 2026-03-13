import pandas as pd
import json

# Carregar dados
print("Carregando CSVs...")
movies = pd.read_csv('data/movielens/movie.csv')
ratings = pd.read_csv('data/movielens/rating.csv')

print("Processando filmes...")
movies_list = []
for idx, row in movies.head(5000).iterrows(): # Limitar a 5000 filmes para velocidade
    title = row['title']
    genres = row['genres']
    
    genres_list = []
    if pd.notna(genres) and genres != '(no genres listed)':
        genres_list = [g.strip() for g in genres.split('|')]
        
    year = 2000
    if '(' in title:
        try:
            year_str = title.split('(')[-1].replace(')', '').strip()
            if len(year_str) == 4 and year_str.isdigit():
                year = int(year_str)
                title = title.rsplit(' (', 1)[0].strip()
        except:
            pass
            
    movies_list.append({
        'id': int(row['movieId']),
        'title': title,
        'year': year,
        'rating': 7.0,
        'genres': genres_list,
        'director': 'Unknown',
        'cast': []
    })

print("Calculando notas medias...")
movie_ratings = ratings.groupby('movieId')['rating'].mean()
for movie in movies_list:
    movie['rating'] = float(movie_ratings.get(movie['id'], 7.0))

with open('data/movies.json', 'w', encoding='utf-8') as f:
    json.dump(movies_list, f, ensure_ascii=False, indent=2)

print("Processando usuarios...")
# Pegar apenas avaliacoes dos filmes que selecionamos
valid_movie_ids = set(m['id'] for m in movies_list)
filtered_ratings = ratings[ratings['movieId'].isin(valid_movie_ids)]

# Pegar os 500 usuarios com mais avaliacoes
top_users = filtered_ratings['userId'].value_counts().head(500).index
final_ratings = filtered_ratings[filtered_ratings['userId'].isin(top_users)]

users_data = []
for user_id, user_group in final_ratings.groupby('userId'):
    watched_list = []
    for _, row in user_group.iterrows():
        movie_id = int(row['movieId'])
        movie_title = next((m['title'] for m in movies_list if m['id'] == movie_id), 'Unknown')
        watched_list.append({
            'id': movie_id,
            'title': movie_title,
            'userRating': float(row['rating'])
        })
        
    users_data.append({
        'id': int(user_id),
        'name': f"Usuário {int(user_id)}",
        'watched': watched_list
    })

with open('data/users.json', 'w', encoding='utf-8') as f:
    json.dump(users_data, f, ensure_ascii=False, indent=2)

print(f"✅ {len(movies_list)} filmes salvos em data/movies.json")
print(f"✅ {len(users_data)} usuários salvos em data/users.json")
