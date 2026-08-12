'use strict';
/* OMNISCIENT SCALPER v22.0 — Agent registry: 60 categories → 700 agents. */

const catsA = require('./cats-a');
const catsB = require('./cats-b');
const catsC = require('./cats-c');
const catsD = require('./cats-d');
const catsE = require('./cats-e');
const catsF = require('./cats-f');

const TITLES = {
  1: 'PIN BAR MASTERS', 2: 'ENGULFING MASTERS', 3: 'DOJI & INDECISION MASTERS', 4: 'HAMMER & SHOOTING STAR MASTERS',
  5: 'CONTINUATION PATTERN MASTERS', 6: 'SWING LEVEL MASTERS', 7: 'PIVOT POINT MASTERS', 8: 'DYNAMIC LEVEL MASTERS',
  9: 'TRENDLINE MASTERS', 10: 'CHANNEL MASTERS', 11: 'RANGE & CONSOLIDATION MASTERS', 12: 'BREAKOUT & FAKEOUT MASTERS',
  13: 'LIQUIDITY POOL MASTERS', 14: 'VOLUME PROFILE MASTERS', 15: 'VOLUME SPIKE MASTERS', 16: 'CVD & DELTA MASTERS',
  17: 'ORDER BOOK DEPTH MASTERS', 18: 'BID-ASK IMBALANCE MASTERS', 19: 'TRADE TAPE MASTERS', 20: 'ABSORPTION & EXHAUSTION MASTERS',
  21: 'RSI MASTERS', 22: 'MACD MASTERS', 23: 'STOCHASTIC MASTERS', 24: 'CCI & WILLIAMS %R MASTERS',
  25: 'MOMENTUM CONFLUENCE MASTERS', 26: 'EMA CROSSOVER MASTERS', 27: 'DYNAMIC S/R MASTERS', 28: 'MA RIBBON MASTERS',
  29: 'HULL & ADAPTIVE MA MASTERS', 30: 'MULTI-TIMEFRAME MA MASTERS', 31: 'ATR MASTERS', 32: 'BOLLINGER BAND MASTERS',
  33: 'KELTNER CHANNEL MASTERS', 34: 'VOLATILITY REGIME MASTERS', 35: 'VOLATILITY POSITION SIZE MASTERS',
  36: 'ORDER BLOCK MASTERS', 37: 'FAIR VALUE GAP MASTERS', 38: 'LIQUIDITY VOID & IMBALANCE MASTERS',
  39: 'BREAKER BLOCK & MITIGATION MASTERS', 40: 'INDUCEMENT & MANIPULATION MASTERS',
  41: 'MULTI-TIMEFRAME ALIGNMENT MASTERS', 42: 'RISK MANAGEMENT MASTERS', 43: 'SESSION & TIMING MASTERS',
  44: 'DERIVATIVES MICROSTRUCTURE MASTERS', 45: 'FUNDING RATE MASTERS', 46: 'FINAL CONFLUENCE & SIGNAL COMPILER',
  47: 'SYSTEM OPERATIONS & MONITORING', 48: 'KEYBOARD & COMMAND INTERFACE', 49: 'ERROR HANDLING & RECOVERY',
  50: 'INITIALIZATION & BOOT SEQUENCE', 61: 'BINANCE DERIVATIVES DEEP ANALYTICS MASTERS',
  62: 'BINANCE LIQUIDATION & FORCED ORDERS MASTERS', 63: 'ALGORITHMIC PATTERN MASTERS',
  64: 'MANIPULATION & SPOOFING MASTERS', 65: 'AUCTION MARKET THEORY MASTERS', 66: 'RENKO & RANGE BAR MASTERS',
  67: 'BINANCE SENTIMENT & DERIVATIVES PSYCHOLOGY MASTERS', 68: 'SEASONALITY & TIME CYCLE MASTERS',
  69: 'MACHINE LEARNING SIGNAL MASTERS', 70: 'PSYCHOLOGY & DISCIPLINE MASTERS'
};

function build() {
  const list = [];
  for (const mod of [catsA, catsB, catsC, catsD, catsE, catsF]) {
    for (const [key, fn] of Object.entries(mod)) {
      const num = parseInt(key.replace('cat', ''), 10);
      if (TITLES[num]) list.push({ cat: num, title: TITLES[num], fn });
    }
  }
  list.sort((a, b) => a.cat - b.cat);
  return list;
}

const categories = build();

/* run every category against S; a failed category must never kill the swarm */
function runAll(S) {
  const votes = [];
  const perCat = new Map();
  const faults = [];
  for (const { cat, title, fn } of categories) {
    try {
      const out = fn(S) || [];
      out.forEach(v => {
        votes.push(v);
        if (!perCat.has(cat)) perCat.set(cat, { cat, title, long: 0, short: 0, neutral: 0, fired: 0 });
        const p = perCat.get(cat);
        p[v.vote.toLowerCase()] = (p[v.vote.toLowerCase()] || 0) + 1;
        p.fired += (v.rules || []).length;
      });
    } catch (e) {
      faults.push({ cat, title, error: String(e && e.message || e) });
    }
  }
  return {
    votes,
    perCat: [...perCat.values()],
    faults,
    agentCount: votes.length
  };
}

module.exports = { categories, runAll, TITLES };