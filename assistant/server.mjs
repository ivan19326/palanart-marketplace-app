import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createAssistantHandler } from './handler.mjs';
import { createFileQuota } from './quota.mjs';

const knowledge = JSON.parse(await readFile(new URL('./public-knowledge.json', import.meta.url), 'utf8'));
const origins = (process.env.ASSISTANT_ORIGINS || 'https://palanart.github.io').split(',').map(value => value.trim());
const quota = createFileQuota({ path: process.env.ASSISTANT_QUOTA_FILE || fileURLToPath(new URL('./.runtime/quota.json', import.meta.url)),
  dailyLimit: Number(process.env.ASSISTANT_DAILY_LIMIT || 100) });
const handler = createAssistantHandler({ apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || undefined, knowledge, origins, quota });
const preview = process.env.ASSISTANT_PREVIEW === '1';
const files = new Map([
  ['/preview', ['./preview.html', 'text/html; charset=utf-8']],
  ['/assistant-widget.js', ['../marketplace_build/assistant-widget.js', 'text/javascript; charset=utf-8']],
  ['/assistant-widget.css', ['../marketplace_build/assistant-widget.css', 'text/css; charset=utf-8']]
]);
let inflight = 0;
const recent = new Map();
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (preview && req.method === 'GET' && files.has(req.url)) {
      const [path, type] = files.get(req.url);
      res.setHeader('Content-Type', type);
      res.end(await readFile(new URL(path, import.meta.url))); return;
    }
    // Reverse-proxy headers are deliberately ignored. Configure rate limits at the proxy too.
    const now = Date.now();
    for (const [key, value] of recent) if (value.until < now) recent.delete(key);
    const ip = req.socket.remoteAddress;
    const state = recent.get(ip) || { count: 0, until: now + 60000 };
    if (req.method === 'POST' && (inflight >= 4 || state.count >= 8 || recent.size >= 1000)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Слишком много запросов. Повторите через минуту.' })); return;
    }
    if (req.method === 'POST') { state.count++; recent.set(ip, state); }
    inflight++;
    try {
      const chunks = []; let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 16000) { res.writeHead(413); res.end(); return; }
        chunks.push(chunk);
      }
      const request = new Request('http://localhost' + req.url, { method: req.method, headers: req.headers,
        ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: Buffer.concat(chunks) }) });
      const response = await handler(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } finally { inflight--; }
  } catch { if (!res.headersSent) res.writeHead(500); res.end(); }
});
server.requestTimeout = 10000;
server.headersTimeout = 10000;
server.listen(Number(process.env.PORT || 8788), process.env.HOST || '127.0.0.1', () => {
  console.log('PALANART consultant server listening; no prompts or secrets are logged.');
});
