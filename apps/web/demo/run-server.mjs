// Launches `next dev` with the production Redis/Blob credentials blanked
// out at the process-env level. @next/env only lets .env.local populate a
// key when it's *absent* from process.env at startup — setting these to ""
// here (not deleting them) makes Next treat them as already-set and skip
// loading the real values from .env.local, so every store in apps/web/lib
// falls back to its filesystem implementation. This keeps the whole demo
// recording session from ever touching tokensdrift.com's production data.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');

const blanked = {
  KV_REST_API_URL: '',
  KV_REST_API_TOKEN: '',
  KV_REST_API_READ_ONLY_TOKEN: '',
  KV_URL: '',
  REDIS_URL: '',
  UPSTASH_REDIS_REST_URL: '',
  UPSTASH_REDIS_REST_TOKEN: '',
  BLOB_READ_WRITE_TOKEN: '',
};

const child = spawn('npx', ['next', 'dev'], {
  cwd: webRoot,
  env: { ...process.env, ...blanked },
  stdio: 'inherit',
  shell: true,
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
child.on('exit', (code) => process.exit(code ?? 0));
