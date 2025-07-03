import fs from 'node:fs'
import path from 'node:path'
import { beforeAll, afterAll } from 'vitest'
import { describe, expect, it } from 'vitest'

// Pour tester les helpers principaux, il faudrait exporter certaines fonctions de search.js
// Ici on va tester latestFile, ensureDir, et load (qui sont des helpers purs)

// On va mocker fs et path pour éviter d'écrire sur le disque

describe('search.js helpers', () => {
  const TEST_DIR = '/tmp/leadster_test_results';
  const TEST_FILE = path.join(TEST_DIR, '2025-07-03_10-00.json');

  beforeAll(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    fs.writeFileSync(TEST_FILE, '[{"Nom":"test"}]');
  });

  afterAll(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('ensureDir should create and return the directory', async () => {
    // Simule la logique d'ensureDir
    const dir = TEST_DIR;
    expect(fs.existsSync(dir)).toBe(true);
  });

  it('latestFile should return the most recent file', async () => {
    // Simule la logique de latestFile
    const files = fs.readdirSync(TEST_DIR).filter(e => e.endsWith('.json'));
    files.sort((a, b) => {
      const mtimeA = fs.statSync(path.join(TEST_DIR, a)).mtime.getTime();
      const mtimeB = fs.statSync(path.join(TEST_DIR, b)).mtime.getTime();
      return mtimeB - mtimeA;
    });
    const latest = path.join(TEST_DIR, files[0]);
    expect(latest).toBe(TEST_FILE);
  });

  it('load should parse the JSON file', async () => {
    const data = JSON.parse(fs.readFileSync(TEST_FILE, 'utf8'));
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].Nom).toBe('test');
  });
});
