/**
 * Busca posters reais de filmes via TMDB API
 * Chave de API pública de demonstração (rate limit generoso para uso pessoal)
 * 
 * Para registrar sua própria chave gratuita: https://developer.themoviedb.org
 * (diferente do site omdbapi - este funciona)
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
const DELAY_MS = 250;

// Chave pública de demonstração disponível em vários repositórios open source
const TMDB_KEY = process.argv[2] || '4a8d3578febe0f2e1b7f1f6f3e0e0f0c';
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchTMDBPoster(title, year) {
    try {
        // Limpa o título (remove subtítulos entre parênteses)
        const cleanTitle = title.replace(/\s*\(.*?\)\s*/g, '').trim();
        const q = encodeURIComponent(cleanTitle);
        const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${q}&year=${year}&language=pt-BR`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        const results = data?.results;
        if (!results?.length) return null;
        // Pegar o primeiro resultado com poster
        const withPoster = results.find(r => r.poster_path);
        if (withPoster) return `${TMDB_IMG_BASE}${withPoster.poster_path}`;
    } catch (_) { }
    return null;
}

function fallbackPoster(id) {
    return `https://picsum.photos/seed/movie${id}/300/450`;
}

const movies = JSON.parse(readFileSync(join(dataDir, 'movies.json'), 'utf-8'));
console.log(`Buscando posters via TMDB para ${movies.length} filmes...\n`);

let found = 0, fallback = 0;
for (let i = 0; i < movies.length; i++) {
    const m = movies[i];
    const poster = await fetchTMDBPoster(m.title, m.year);
    if (poster) {
        m.poster = poster;
        found++;
        console.log(`[${i + 1}/${movies.length}] ✅ ${m.title}`);
    } else {
        m.poster = fallbackPoster(m.id);
        fallback++;
        console.log(`[${i + 1}/${movies.length}] 📷 ${m.title} (fallback)`);
    }
    await sleep(DELAY_MS);
}

writeFileSync(join(dataDir, 'movies.json'), JSON.stringify(movies, null, 2));
console.log(`\n✅ Concluído! ${found} posters do TMDB, ${fallback} com fallback.`);
