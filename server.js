// ShiftMate web prototype: zero-framework Node HTTP server.
//   npm start                          -> http://localhost:3000
//   ANTHROPIC_API_KEY=... npm start    -> Claude drafts the WeChat replies
//   SHIFTMATE_AI=off npm start         -> force the offline rules engine

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const { Store } = require('./lib/store');
const { createApi } = require('./lib/api');
const ai = require('./lib/ai');

const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

class BodyError extends Error {}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 1e6) {
        reject(new BodyError('Request too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (err) {
        reject(new BodyError('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(res, pathname) {
  const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

function createApp(options) {
  const handle = createApi(options);
  return async function handler(req, res) {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (!pathname.startsWith('/api/')) {
      if (req.method !== 'GET') {
        res.writeHead(405);
        res.end();
        return;
      }
      serveStatic(res, pathname);
      return;
    }
    let body = {};
    if (req.method === 'POST') {
      try {
        body = await readBody(req);
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    }
    const out = await handle(req.method, pathname, body);
    if (out.csv !== undefined) {
      res.writeHead(out.status, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${out.filename}"`,
      });
      res.end(`﻿${out.csv}`);
      return;
    }
    res.writeHead(out.status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(out.body));
  };
}

if (require.main === module) {
  const store = new Store(process.env.SHIFTMATE_DATA || path.join(__dirname, 'data', 'state.json'));
  store.load();
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '127.0.0.1';
  http.createServer(createApp({ store })).listen(port, host, () => {
    const st = ai.status();
    console.log(`ShiftMate running at http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
    console.log(st.enabled ? `AI drafts: Claude (${st.model})` : `AI drafts: offline rules engine (${st.reason})`);
  });
}

module.exports = { createApp };
