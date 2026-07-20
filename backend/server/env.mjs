import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const serverDir = dirname(fileURLToPath(import.meta.url));
// backend/server -> backend -> raiz do monorepo, onde fica o .env compartilhado.
const monorepoRoot = resolve(serverDir, '..', '..');

export function loadEnv(file = '.env') {
  const candidatePaths = [
    resolve(monorepoRoot, file),
    resolve(process.cwd(), file),
  ];

  const path = candidatePaths.find((candidate) => existsSync(candidate));

  if (!path) {
    return;
  }

  const content = readFileSync(path, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

