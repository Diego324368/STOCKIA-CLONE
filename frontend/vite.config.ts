import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const frontendDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // O .env fica na raiz do monorepo (um nivel acima de frontend/), nao neste pacote.
  envDir: resolve(frontendDir, '..'),
});
