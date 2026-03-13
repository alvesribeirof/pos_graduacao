import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

const MAX_MOVIES = 200;
const MAX_USERS = 50;

// Read originals
const movies = JSON.parse(readFileSync(join(dataDir, 'movies.json'), 'utf-8'));
const users = JSON.parse(readFileSync(join(dataDir, 'users.json'), 'utf-8'));

console.log(`Original: ${movies.length} filmes, ${users.length} usuários`);

// Save originals as backups if not already done
try {
    writeFileSync(join(dataDir, 'movies.full.json'), JSON.stringify(movies, null, 2));
    writeFileSync(join(dataDir, 'users.full.json'), JSON.stringify(users, null, 2));
    console.log('✅ Backups criados: movies.full.json e users.full.json');
} catch (e) {
    console.warn('⚠️ Não foi possível criar backups:', e.message);
}

// Reduce
const reducedMovies = movies.slice(0, MAX_MOVIES);
const reducedUsers = users.slice(0, MAX_USERS);

// Ensure user ratings only reference existing movies
const movieIds = new Set(reducedMovies.map(m => m.id));
const sanitizedUsers = reducedUsers.map(u => ({
    ...u,
    ratings: (u.ratings || []).filter(r => movieIds.has(r.movieId)).slice(0, 20)
}));

writeFileSync(join(dataDir, 'movies.json'), JSON.stringify(reducedMovies, null, 2));
writeFileSync(join(dataDir, 'users.json'), JSON.stringify(sanitizedUsers, null, 2));

console.log(`✅ Reduzido para: ${reducedMovies.length} filmes, ${sanitizedUsers.length} usuários`);
console.log('Para restaurar: copie movies.full.json -> movies.json e users.full.json -> users.json');
