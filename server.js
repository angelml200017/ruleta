import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handlePoker } from './poker-room.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
// En producción (Render, Fly, Railway, etc.) hay que bindear a 0.0.0.0 para
// que el proxy de la plataforma pueda alcanzar el puerto. En local mantenemos
// 127.0.0.1 para no exponer la app al resto de la red por defecto.
const IS_PROD =
    process.env.NODE_ENV === 'production' || !!process.env.RENDER;
const HOST = process.env.HOST || (IS_PROD ? '0.0.0.0' : '127.0.0.1');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

async function tryServeFile(filePath, res) {
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    send(res, 200, data, { 'Content-Type': type });
    return true;
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'EISDIR') return false;
    throw err;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (await handlePoker(req, res, url)) return;

    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';

    // Resolver y prevenir path traversal. OJO: hay que comparar con el
    // separador al final para no permitir hermanos como "publicBackup".
    const resolved = path.normalize(path.join(publicDir, rel));
    if (
        resolved !== publicDir &&
        !resolved.startsWith(publicDir + path.sep)
    ) {
      send(res, 403, 'Forbidden');
      return;
    }

    // Intentar servir el archivo solicitado
    if (await tryServeFile(resolved, res)) return;

    // Fallback: devolver index.html para rutas no encontradas
    const indexPath = path.join(publicDir, 'index.html');
    if (await tryServeFile(indexPath, res)) return;

    send(res, 404, 'Not found');
  } catch (err) {
    console.error(err);
    send(res, 500, 'Internal server error');
  }
});

server.listen(PORT, HOST, () => {
  const displayHost =
      HOST === '0.0.0.0' || HOST === '::' ? 'localhost' : HOST;
  console.log('\n  La Ruleta de la Integración');
  console.log(`  → http://${displayHost}:${PORT}`);
  if (HOST === '127.0.0.1' || HOST === '::1') {
    console.log('  (solo localhost; usa HOST=0.0.0.0 para exponer al LAN)\n');
  } else {
    console.log('');
  }
});