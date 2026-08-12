'use strict';
/* OMNISCIENT SCALPER v22.0 — swarm smoke test on a synthetic full-contract state. */

const { runAll } = require('./agents/index.js');

function candles(n, ms, o = 100, spread = 1) {
  const out = [];
  let p = o;
  for (let i = n - 1; i >= 0; i--) {
    const h = p + spread * 0.8, l = p - spread * 0.8;
    out.push([Date.now() - i * ms, p, h, l, p + (i % 3 - 1) * 0.2, 10 + (i % 5)]);
    p += (i % 4 === 0 ? 0.1 : -0.05);
  }
  return out;
}

function mkInd(price) {
  return {
    ema8: price + 0.1, ema21: price, ema50: price - 0.1, ema200: price - 0.5,
    prevEma8: price + 0.05, prevEma21: price - 0.05, prevEma50: price - 0.15,
    rsi: 55, rsiPrev: 54, stoch: { k: 55, d: 53 }, macd: 0.05, signal: 0.02,
    histogram: 0.03, prevHistogram: 0.01, cci: 20, cciPrev: 10, wr: -40,
    atr: 0.5, bb: { upper: 101, middle: 100, lower: 99, prevUpper: 100.9, prevLower: 99.1 },
    kc: { upper: 100.8, middle: 100, lower: 99.2, prevUpper: 100.7, prevLower: 99.3 },
    adx: 22, hull: 100.1, prevHull: 100.08, vwap: 100.05, rvol: 1.1, volAvg: 10
  };
}

const PRICE = 100;
const S = {
  price: PRICE, mark: PRICE + 0.01, index: PRICE - 0.005, bid: PRICE - 0.02, ask: PRICE + 0.02,
  spread: 0.04, funding: 0.0001, fundingHist: [0.00005, 0.0001, 0.00012, 0.0001, 0.0001, 0.00012],
  oi: 100000, oiDelta: 0.01, oiHist: [98000, 99000, 99500, 100000],
  lsGlobal: 0.55, lsTopAcc: 1.1, lsTopPos: 1.2, takerRatio: 0.52, basis: 0.05,
  basisPct: 0.0005, adl: 52, forceLiq: { count: 5, netBuy: 50 }, forceLiqAge: 60,
  book: {
    bids: [[99.95, 5], [99.9, 4]], asks: [[100.05, 5], [100.1, 4]],
    bidVol: 10, askVol: 10, imbalBid: 0.52, imbalPrev: 0.5, bidWalls: [{ p: 99.5, q: 50 }],
    askWalls: [], spread: 0.1, top3Bid: 4, top3Ask: 4, l1Bid: 99.95, l1Ask: 100.05
  },
  tf: {
    '1m': { candles: candles(120, 60000), i: mkInd(PRICE) },
    '3m': { candles: candles(120, 180000), i: mkInd(PRICE) },
    '5m': { candles: candles(120, 300000), i: mkInd(PRICE) },
    '15m': { candles: candles(120, 900000), i: mkInd(PRICE) },
    '1h': { candles: candles(120, 3600000), i: mkInd(PRICE) },
    '4h': { candles: candles(120, 14400000), i: mkInd(PRICE) },
    '1d': { candles: candles(60, 86400000), i: mkInd(PRICE) }
  },
  pivots: { pp: 100, r1: 100.5, r2: 101, s1: 99.5, s2: 99 },
  pivots1h: { pp: 100, r1: 100.6, s1: 99.4 },
  prevDay: { h: 101.5, l: 98.5, o: 99, c: 100.2 },
  vp: {
    '15m': { poc: 100.05, vah: 100.5, val: 99.6 },
    '1h': { poc: 100, vah: 100.8, val: 99.2 }
  },
  vwap15: 100.02,
  swings15: { sh: [100.6, 100.4], sl: [99.4, 99.6] },
  srHi: [100.8, 100.5], srLo: [99.5, 99.2],
  obs: { bull: { low: 99.9, high: 100.1 }, bear: { low: 100.0, high: 100.2 } },
  obs1h: { bull: { low: 99.7, high: 99.9 }, bear: null },
  fvgs: { bull: 99.7, bear: 100.3 },
  fvgs1h: { bull: 99.5, bear: 100.5 },
  breaker: { level: 100.2, side: 'BULL' },
  breaker1h: { level: 99.8, side: 'BEAR' },
  liqVoids: [{ top: 99.6, bot: 99.2 }],
  liqVoids1h: [],
  imbalance: { to: 'BULL', size: 9.5 },
  channel: { type: 'BULL', top: 100.7, bot: 99.7, slope: 0.05, apex: 0.4 },
  range: { top: 100.5, bot: 99.5, mid: 100, type: 'BULL', width: 1, slope: 0.1, apex: 0.6 },
  openingRange: { high: 100.3, low: 99.8 },
  bias15: 'LONG', bias1h: 'LONG', bias4h: 'LONG',
  regime: 'MED', atr15: 0.5, atr15pct: 0.005,
  cvd: 100, cvdPrev: 95, cvd1h: 400, cvdRate: 0.1,
  cvdDivBull: false, cvdDivBear: false,
  rsiDivBull: false, rsiDivBear: false,
  macdDivBull: false, macdDivBear: false,
  stochDivBull: false, stochDivBear: false,
  cciDivBull: false, cciDivBear: false,
  delta15: candles(40, 900000).map((x, i) => (i % 4 === 0 ? 0.02 : -0.01)), delta15Cur: 0.05, aggBuyPct: 0.55, tradeSeq: 3, tradeAggPct: 0.6,
  largeTrades: { net: 10, count: 5, vol: 100 },
  sessions: {
    name: 'London', isAsian: false, isLondon: true, isNY: false, isWeekend: false,
    asianHigh: 100.25, asianLow: 99.85, minToLondon: 9999, minToNY: 180
  },
  sigStreak: 0, sigAge: 3, sigRR: 1.8, sigSL: 99.45, sigTP: 101.1, conf: 0.6,
  corrBTC: 0.6, liq: { sweptH: null, sweptL: null, sweptAt: 0 },
  prevVotes: { long: 300, short: 200, neutral: 100, total: 600 },
  meta: {
    apiOk: true, wsConnected: true, paused: false, lastFull: Date.now(),
    lastTrade: Date.now(), lastBook: Date.now(), lastCandleAge: 15000,
    failedCount: 0, cooldown: false, rateLimited: false, uptime: 600000,
    bootPhase: 6, bootDone: true, bootErrors: 0, bootMs: 12000, bootBanner: true,
    pingOk: true, timeSynced: true, wsLag: 120, cycleMs: 1800, reconnects: 0,
    evalCount: 12, cyclesOK: 24, cyclesFail: 1, gatesReady: true,
    missingKlines: 0, missingDerivatives: 0, interpRatio: 0.02, zeroClamps: 0,
    silentFails: 0, version: 'v22.0', warnCount: 0, historyCount: 3, audioOn: true,
    heapMB: 80, evalMs: 40, forceDir: null, lastSignalAt: Date.now() - 40000
  },
  ui: { lastKey: null, paused: false, fullscreen: false, audio: true, showVotes: true,
    showGates: true, force: null, operatorAway: false, keysLastMin: 3,
    lastInteraction: Date.now(), voiceCmd: null, scanAll: true, errorCount: 0,
    renderedAt: Date.now(), sessionMinutes: 60, quit: false, hideHelp: false }
};

const t0 = Date.now();
const res = runAll(S);
const dt = Date.now() - t0;

const tally = { LONG: 0, SHORT: 0, NEUTRAL: 0 };
res.votes.forEach(v => { tally[v.vote]++; });

console.log(`agents: ${res.agentCount} | categories: ${res.perCat.length} | faults: ${res.faults.length} | evalMs: ${dt}`);
if (res.faults.length) {
  console.log('FAULTS:');
  res.faults.forEach(f => console.log(`  cat ${f.cat} ${f.title} -> ${String(f.error).slice(0, 150)}`));
}
console.log('tally:', JSON.stringify(tally));

let ok = res.agentCount === 600 && res.faults.length === 0;
if (!ok) { process.exitCode = 1; } else { console.log('SMOKE TEST PASS'); }