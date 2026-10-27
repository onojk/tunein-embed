// Tiny reverse proxy that adds CORS headers to ONE upstream Icecast/SHOUTcast server.
// Run it behind HTTPS (nginx, Caddy, Cloudflare Tunnel...) to also fix mixed content.
//   UPSTREAM=http://radio.example.com:8000 PORT=8080 node proxy.js
//   then use src="https://your-proxy.example.com/stream" (same path as on the upstream).
const http = require('http');
const https = require('https');

const UPSTREAM = new URL(process.env.UPSTREAM || 'http://127.0.0.1:8000');
const PORT = Number(process.env.PORT) || 8080;
const CORS = { 'Access-Control-Allow-Origin': process.env.ALLOW_ORIGIN || '*', 'Access-Control-Allow-Headers': 'Range' };

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return res.writeHead(204, CORS).end();
  // Only plain GETs of a path: never let the client choose the host (no open proxy).
  if (req.method !== 'GET' || !req.url.startsWith('/')) return res.writeHead(400, CORS).end();
  const target = new URL(UPSTREAM.origin + req.url);
  const lib = target.protocol === 'https:' ? https : http;
  // SHOUTcast v1 only serves /7.html to browser-like user agents.
  const up = lib.get(target, { headers: { 'User-Agent': 'Mozilla/5.0 (tunein-embed proxy)' } }, (u) => {
    res.writeHead(u.statusCode, { ...CORS, 'Content-Type': u.headers['content-type'] || 'audio/mpeg', 'Cache-Control': 'no-cache' });
    u.pipe(res);
  });
  up.on('error', () => (res.headersSent ? res.end() : res.writeHead(502, CORS).end()));
  res.on('close', () => up.destroy()); // listener left: close the upstream connection too
}).listen(PORT, () => console.log(`Proxying ${UPSTREAM.origin} on :${PORT}`));
