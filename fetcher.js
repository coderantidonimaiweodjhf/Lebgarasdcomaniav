'use strict';
/* OMNISCIENT SCALPER v22.0 — Binance Data Engine.
   100% Binance public APIs. No API key. Every datum carries a fetchedAt timestamp for Gate 1 freshness. */

const https = require('node:https');

const REST = 'https://fapi.binance.com';
const WS = 'wss://fstream.binance.com/ws';
const SYMBOL = 'XAUUSDT';
const TFS = ['1m', '3m', '5m', '15m', '1h', '4h', '1d'];
const CROSS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'];

let cooldownUntil = 0;

function getJson(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'omniscient-v22' } }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(body)); } catch (e) { reject(new Error('bad json ' + url)); }
        } else if (res.statusCode === 429 || res.statusCode === 418) {
          reject(Object.assign(new Error('RATE_LIMIT ' + res.statusCode), { rateLimited: true }));
        } else {
          reject(new Error('HTTP ' + res.statusCode + ' ' + url + ' ' + body.slice(0, 150)));
        }
      });
    });
    req.on('timeout', () => { req.destroy(new Error('timeout ' + url)); });
    req.on('error', reject);
    req.setTimeout(timeoutMs);
  });
}

async function fetchJson(url, tries = 3) {
  if (Date.now() < cooldownUntil) throw new Error('API COOLDOWN');
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await getJson(url);
    } catch (e) {
      lastErr = e;
      if (e.rateLimited) { cooldownUntil = Date.now() + 10000; throw e; }
      if (i < tries - 1) await sleep(500 * (i + 1));
    }
  }
  throw lastErr;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const stamp = data => ({ data, fetchedAt: Date.now() });
const base = `${REST}/fapi/v1`;
const fdata = `${REST}/futures/data`;

async function fetchKlines(symbol, tf, limit = 200, startTime) {
  if (!limit) return []; // placeholder for continuous/index klines handled separately
  const st = startTime ? `&startTime=${startTime}` : '';
  return fetchJson(`${base}/klines?symbol=${symbol}&interval=${tf}&limit=${limit}${st}`);
}

async function fetchPool() {
  const now = Date.now();
  const jobs = [
    ['ping', fetchJson(`${base}/ping`, 2).then(() => 'ok')],
    ['time', fetchJson(`${base}/time`, 2)],
    ['price', fetchJson(`${base}/ticker/price?symbol=${SYMBOL}`, 2)],
    ['ticker24', fetchJson(`${base}/ticker/24hr?symbol=${SYMBOL}`, 2)],
    ['bookTicker', fetchJson(`${base}/ticker/bookTicker?symbol=${SYMBOL}`, 2)],
    ['premiumIndex', fetchJson(`${base}/premiumIndex?symbol=${SYMBOL}`, 2)],
    ['fundingRate', fetchJson(`${base}/fundingRate?symbol=${SYMBOL}&limit=100`, 2)],
    ['openInterest', fetchJson(`${base}/openInterest?symbol=${SYMBOL}`, 2)],
    ['depth', fetchJson(`${base}/depth?symbol=${SYMBOL}&limit=50`, 2)],
    ['adlQuantile', fetchJson(`${base}/adlQuantile?symbol=${SYMBOL}`, 2)]
  ];
  for (const tf of TFS) jobs.push([`k_${tf}`, fetchKlines(SYMBOL, tf, 200)]);
  for (const sym of CROSS) jobs.push([`k_${sym}_15m`, fetchKlines(sym, '15m', 200)]);
  const results = {};
  const errors = {};
  await Promise.all(jobs.map(async ([name, p]) => {
    try { results[name] = stamp(await p); }
    catch (e) { errors[name] = String(e.message || e); }
  }));
  return { results, errors, finishedAt: now };
}

async function fetchDerivatives() {
  const q = `symbol=${SYMBOL}&period=5m&limit=30`;
  const jobs = [
    ['globalLS', fetchJson(`${fdata}/globalLongShortAccountRatio?${q}`, 2)],
    ['topAccLS', fetchJson(`${fdata}/topLongShortAccountRatio?${q}`, 2)],
    ['topPosLS', fetchJson(`${fdata}/topLongShortPositionRatio?${q}`, 2)],
    ['takerRatio', fetchJson(`${fdata}/takerlongshortRatio?${q}`, 2)],
    ['oiHist', fetchJson(`${fdata}/openInterestHist?${q}`, 2)],
    ['basis', fetchJson(`${fdata}/basis?${q}`, 2)],
    ['takerVol', fetchJson(`${fdata}/takerBuySellVol?${q}`, 2)]
  ];
  const results = {};
  const errors = {};
  await Promise.all(jobs.map(async ([name, p]) => {
    try { results[name] = stamp(await p); }
    catch (e) { errors[name] = String(e.message || e); }
  }));
  return { results, errors, finishedAt: Date.now() };
}

async function fetchHeavy() {
  const jobs = [
    ['aggTrades', fetchJson(`${base}/aggTrades?symbol=${SYMBOL}&limit=1000`, 2)],
    ['forceOrders', fetchJson(`${base}/forceOrders?symbol=${SYMBOL}&limit=1000`, 2)],
    ['contKlines', fetchJson(`${base}/continuousKlines?pair=${SYMBOL}&contractType=PERPETUAL&interval=15m&limit=200`, 2)],
    ['indexKlines', fetchJson(`${base}/indexPriceKlines?pair=${SYMBOL}&interval=15m&limit=200`, 2)]
  ];
  const results = {};
  const errors = {};
  await Promise.all(jobs.map(async ([name, p]) => {
    try { results[name] = stamp(await p); }
    catch (e) { errors[name] = String(e.message || e); }
  }));
  return { results, errors, finishedAt: Date.now() };
}

/* WebSocket tier (5s cadence): aggTrade, bookTicker, markPrice for XAUUSDT */
function startWS(handlers) {
  const streams = [`${SYMBOL.toLowerCase()}@aggTrade`, `${SYMBOL.toLowerCase()}@bookTicker`, `${SYMBOL.toLowerCase()}@markPrice`];
  const url = `${WS}/${streams.join('/')}`;
  let ws;
  let heartbeat = 0;
  const connect = () => {
    ws = new WebSocket(url);
    ws.onopen = () => { heartbeat = setInterval(() => { try { ws.send('ping'); } catch {} }, 20000); };
    ws.onmessage = ev => {
      try {
        const m = JSON.parse(ev.data);
        if (m.e === 'aggTrade') handlers.aggTrade(m);
        else if (m.e === 'bookTicker') handlers.bookTicker(m);
        else if (m.e === 'markPriceUpdate') handlers.markPrice(m);
      } catch {}
    };
    ws.onclose = () => { clearInterval(heartbeat); setTimeout(connect, 3000); };
    ws.onerror = () => { try { ws.close(); } catch {} };
  };
  connect();
  return { url, close: () => { clearInterval(heartbeat); try { ws.close(); } catch {} } };
}

module.exports = { SYMBOL, TFS, CROSS, fetchPool, fetchDerivatives, fetchHeavy, startWS, fetchJson, fetchKlines, base, fdata };