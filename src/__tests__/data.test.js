import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname replacement for ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('dataset structure', () => {
  const moviesPath = path.resolve(__dirname, '../../data/movies.json');
  const usersPath = path.resolve(__dirname, '../../data/users.json');

  test('movies.json loads as an array', () => {
    const raw = fs.readFileSync(moviesPath, 'utf8');
    const movies = JSON.parse(raw);
    expect(Array.isArray(movies)).toBe(true);
    expect(movies.length).toBeGreaterThan(0);
    const sample = movies[0];
    expect(sample).toHaveProperty('id');
    expect(sample).toHaveProperty('title');
    expect(sample).toHaveProperty('genres');
  });

  test('users.json loads as an array', () => {
    const raw = fs.readFileSync(usersPath, 'utf8');
    const users = JSON.parse(raw);
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
    const sample = users[0];
    expect(sample).toHaveProperty('id');
    expect(sample).toHaveProperty('watched');
    expect(Array.isArray(sample.watched)).toBe(true);
  });
});
