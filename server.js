'use strict';
/* OMNISCIENT SCALPER v22.0 — Terminal server: HTTP static files, SSE live stream, refresh cycles. */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const F = require('./fetcher');
const { Aggregator } = require('./aggregator');

const PORT = Number(process.env.PORT) || 8890;
const CYCLE_MS = 7500;
const PUB = path.join(__dirname, 'public');

const agg = new Aggregator();
const clients = new Set();
const box = {
  bootAt: Date.now(), cycles: 0, cycleMs: 0,
  tick: null, tickAt: null, err: null, errAt: null
};

/* trim heavy arrays for the wire */
function trim(S) {
  if (!S) return S;
  const T = Object.assign({}, S, { tf: {} });
  for (const k of Object.keys(S.tf || {})) {
    T.tf[k] = Object.assign({}, S.tf[k], { candles: (S.tf[k].candles || []).slice(-120) });
  }
  if (T.aggTrades) T.aggTrades = T.aggTrades.slice(-60);
  return T;
}

function broadcast() {
  const payload = {
    t: Date.now(), bootAt: box.bootAt, cycles: box.cycles, cycleMs: box.cycleMs,
    err: box.err, errAt: box.errAt, tickAt: box.tickAt,
    S: box.tick ? trim(box.tick.S) : null,
    tally: box.tick ? box.tick.tally : null,
    signal: box.tick ? box.tick.signal : null,
    gates: box.tick ? box.tick.gates : null,
    faults: box.tick ? box.tick.faults : null,
    perCat: box.tick ? box.tick.perCat : null
  };
  const msg = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) {
    try { res.write(msg); } catch { clients.delete(res); }
  }
}

async function runCycle() {
  const t0 = Date.now();
  try {
    const [pool, deriv, heavy] = await Promise.all([F.fetchPool(), F.fetchDerivatives(), F.fetchHeavy()]);
    const data = { pool, deriv, heavy };
    const out = agg.tick(data);
    box.tick = out;
    box.tickAt = Date.now();
    box.err = null; box.errAt = null;
  } catch (e) {
    box.err = String((e && e.stack) || e);
    box.errAt = Date.now();
  }
  box.cycles++;
  box.cycleMs = Date.now() - t0;
  broadcast();
}

/* SSE */
function stream(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write(`data: ${JSON.stringify({ hello: 'omniscient-v22', at: Date.now() })}\n\n`);
  clients.add(res);
  req.on('close', () => clients.delete(res));
}

/* static files */
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon'
};

function serve(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.normalize(path.join(PUB, urlPath));
  if (!file.startsWith(PUB)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/stream')) stream(req, res);
  else serve(req, res);
});

server.listen(PORT, () => {
  console.log(`omniscient-v22 terminal -> http://localhost:${PORT}`);
  runCycle();
  setInterval(runCycle, CYCLE_MS).unref();
});
