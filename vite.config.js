import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Auto-detect base path from GITHUB_REPOSITORY env var (set by GitHub Actions).
// Locally falls back to '/' so `npm run dev` and `npm run preview` work normally.
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = repoName ? `/${repoName}/` : '/';

export default defineConfig({
  plugins: [react()],
  base,
});
