'use strict';
/* OMNISCIENT SCALPER v22.0 — Rule framework + shared pattern helpers for the 700-agent swarm. */

class AgentEval {
  constructor(id, cat, title) {
    this.id = id; this.cat = cat; this.title = title;
    this.score = 0; this.fired = [];
  }
  hit(cond, pts, label) {
    if (cond) { this.score += pts; this.fired.push(label); }
  }
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function finish(A, S, opts = {}) {
  const minDir = opts.minDir ?? 1.5;
  const vote = A.score >= minDir ? 'LONG' : A.score <= -minDir ? 'SHORT' : 'NEUTRAL';
  const atr = S.atr15 || 1;
  let entry = opts.entry ?? S.price;
  let sl = opts.sl, tp = opts.tp;
  const strength = Math.abs(A.score);
  const rr = clamp(1.2 + strength * 0.25, 1.5, 3.2);
  if (vote === 'LONG') {
    sl = sl ?? entry - (opts.slAtr ?? 1.1) * atr;
    tp = tp ?? entry + rr * (entry - sl);
  } else if (vote === 'SHORT') {
    sl = sl ?? entry + (opts.slAtr ?? 1.1) * atr;
    tp = tp ?? entry - rr * (sl - entry);
  } else {
    sl = sl ?? entry - 1.1 * atr;
    tp = tp ?? entry + 1.1 * atr;
  }
  const conf = strength === 0 ? 0.55 : clamp(0.55 + strength * 0.045, 0.55, 0.96);
  return {
    id: A.id, cat: A.cat, title: A.title, vote,
    entry: +entry.toFixed(2), sl: +sl.toFixed(2), tp: +tp.toFixed(2),
    conf: +conf.toFixed(3), rules: A.fired
  };
}

/* --- pin bar detection (last candle) --- */
function lastPin(candles) {
  const c = candles[candles.length - 1];
  const o = Number(c[1]), h = Number(c[2]), l = Number(c[3]), cl = Number(c[4]);
  const range = h - l;
  if (range <= 0) return { bull: false, bear: false, ratio: 1, bodyPct: 50 };
  const body = Math.abs(cl - o);
  const upper = h - Math.max(o, cl);
  const lower = Math.min(o, cl) - l;
  const bodyPct = (body / range) * 100;
  const bull = lower >= 2 * Math.max(body, 0.0001) && cl > o;
  const bear = upper >= 2 * Math.max(body, 0.0001) && o > cl;
  return { bull, bear, ratio: Math.max(upper, lower) / (body || range), bodyPct, upper, lower, body, range };
}

/* --- candlestick context --- */
function lastCandle(candles) {
  const c = candles[candles.length - 1];
  const p = candles[candles.length - 2];
  return {
    o: Number(c[1]), h: Number(c[2]), l: Number(c[3]), c: Number(c[4]), v: Number(c[5]),
    bull: Number(c[4]) > Number(c[1]), bear: Number(c[4]) < Number(c[1]),
    range: Number(c[2]) - Number(c[3]),
    prev: { o: Number(p[1]), h: Number(p[2]), l: Number(p[3]), c: Number(p[4]), v: Number(p[5]) }
  };
}

/* engulfing on last candle */
function lastEngulf(candles) {
  const lc = lastCandle(candles);
  const b = lc.bull ? lc.c - lc.o : lc.o - lc.c;
  const pb = lc.prev.bull ? lc.prev.c - lc.prev.o : lc.prev.o - lc.prev.c;
  const bullE = lc.bull && lc.o <= lc.prev.o && lc.c >= lc.prev.c && b >= pb;
  const bearE = lc.bear && lc.o >= lc.prev.o && lc.c <= lc.prev.c && b >= pb;
  return { bullE, bearE, strong: b > pb * 1.5 };
}

/* NEAREST support/resistance from price */
function nearestLevel(S, dir) {
  const atr = S.atr15 || 1;
  if (dir === 'long') {
    const sup = S.srLo ? S.srLo[0] : null;
    const sl15 = S.swings15.sl ? S.swings15.sl[0] : null;
    const cand = [sup, sl15, S.pivots ? S.pivots.s1 : null].filter(Boolean);
    if (!cand.length) return S.price - atr;
    return cand.reduce((a, b) => (Math.abs(b - S.price) < Math.abs(a - S.price) ? b : a), cand[0]);
  }
  const res = S.srHi ? S.srHi[0] : null;
  const sh15 = S.swings15.sh ? S.swings15.sh[0] : null;
  const cand = [res, sh15, S.pivots ? S.pivots.r1 : null].filter(Boolean);
  if (!cand.length) return S.price + atr;
  return cand.reduce((a, b) => (Math.abs(b - S.price) < Math.abs(a - S.price) ? b : a), cand[0]);
}

/* divergence helper: price HH vs oscillator LH (bear), price LL vs osc HL (bull) over last n bars */
function divergence(candles, series, n = 8) {
  const c = candles.slice(-n), s = series.slice(-n);
  if (c.length < 5 || s.length !== c.length) return null;
  let bear = null, bull = null;
  const hh = Math.max(...c.map(x => x.h || Number(x[2])));
  const ll = Math.min(...c.map(x => x.l || Number(x[3])));
  const sHi = Math.max(...s), sLo = Math.min(...s);
  if (Number(c[c.length - 1][2]) >= hh && s[s.length - 1] < sHi) bear = true;
  if (Number(c[c.length - 1][3]) <= ll && s[s.length - 1] > sLo) bull = true;
  return { bear, bull };
}

/* equality of consecutive highs/lows (liquidity pools) */
function equalPools(candles, n = 8, tolPct = 0.0004) {
  const eqH = [], eqL = [];
  const seen = new Map();
  candles.slice(-n * 2).forEach((c, i) => {
    const h = Number(c[2]), l = Number(c[3]);
    for (const [k, v] of seen) {
      if (Math.abs(k - h) / k <= tolPct) v.h.push({ price: h, at: i });
      if (Math.abs(k - l) / k <= tolPct) v.l.push({ price: l, at: i });
    }
    if (!seen.has(Number(h.toFixed(2)))) seen.set(Number(h.toFixed(2)), { h: [], l: [] });
    if (!seen.has(Number(l.toFixed(2)))) seen.set(Number(l.toFixed(2)), { h: [], l: [] });
  });
  for (const [k, v] of seen) {
    if (v.h.length >= 2) eqH.push({ price: k, count: v.h.length + 1 });
    if (v.l.length >= 2) eqL.push({ price: k, count: v.l.length + 1 });
  }
  return {
    highs: [...new Set(eqH.map(e => Math.round(e.price * 100) / 100))],
    lows: [...new Set(eqL.map(e => Math.round(e.price * 100) / 100))]
  };
}

/* retracement helper */
function fibRetrace(high, low, level) { return high - (high - low) * level; }

/* session helpers */
function sessionHours(d) {
  const h = d + Math.floor(Number(d) / 24) * 0;
  return h; // passthrough of UTC hour float
}

module.exports = {
  AgentEval, finish, clamp, lastPin, lastCandle, lastEngulf,
  nearestLevel, divergence, equalPools, fibRetrace, sessionHours
};