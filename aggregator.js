'use strict';
/* OMNISCIENT SCALPER v22.0 — Aggregator: builds the full S state, runs the 600-agent swarm,
   tallies votes, computes trimmed-median signal geometry, validates the 6-Gate protocol. */

const IND = require('./indicators');
const RB = require('./agents/rulebook.js');
const { runAll } = require('./agents/index.js');

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const BUCKET = 900000;

/* min-vote geometry — tuned v22.1:
   - quorum: winner side must carry at least VOTE_MIN_QUORUM validated agent geometries
   - engagement: enough agents must have an opinion (NEUTRAL = abstain, not oppose)
   - conf: winner must hold VOTE_MIN_CONF of the *engaged* swarm
   Previously conf was measured vs all 600 agents, so abstentions (422/600 typical in
   flat tape) made ~0.55 unreachable and the 251-floor dead. */
const VOTE_MIN_QUORUM = 51;
const VOTE_MIN_ENGAGED = 150;
const VOTE_MIN_CONF = 0.60;

/* ---------- indicator bundle for one timeframe ---------- */
function tfInd(candles) {
  const CL = IND.closes(candles);
  const prev = candles.slice(0, -1);
  const CLp = CL.slice(0, -1);
  const e8 = IND.ema(CL, 8), e21 = IND.ema(CL, 21), e50 = IND.ema(CL, 50), e200 = IND.ema(CL, 200);
  const macd = IND.macd(candles);
  const macdPrev = prev.length > 40 ? IND.macd(prev) : null;
  const st = IND.stoch(candles);
  const cc = IND.cci(candles);
  const ccPrev = prev.length > 25 ? IND.cci(prev) : null;
  const bb = IND.bollinger(candles);
  const bbPrev = prev.length > 25 ? IND.bollinger(prev) : null;
  const kc = IND.keltner(candles);
  const kcPrev = prev.length > 25 ? IND.keltner(prev) : null;
  const hc = IND.hullMA(CL, 21);
  const hcPrev = CLp.length > 21 ? IND.hullMA(CLp, 21) : null;
  const bbOut = { upper: bb.upper, middle: bb.mid, lower: bb.lower, mid: bb.mid, bw: bb.bw, prevUpper: bbPrev ? bbPrev.upper : null, prevLower: bbPrev ? bbPrev.lower : null };
  const kcOut = { upper: kc.upper, middle: kc.mid, lower: kc.lower, mid: kc.mid, bw: kc.bw, prevUpper: kcPrev ? kcPrev.upper : null, prevLower: kcPrev ? kcPrev.lower : null };
  return {
    ema8: e8, ema21: e21, ema50: e50, ema200: e200,
    prevEma8: IND.ema(CLp, 8), prevEma21: IND.ema(CLp, 21), prevEma50: IND.ema(CLp, 50), prevEma200: CLp.length > 200 ? IND.ema(CLp, 200) : null,
    rsi: IND.rsi(candles), rsiPrev: prev.length > 20 ? IND.rsi(prev) : null,
    stoch: st, macd: Object.assign({}, macd, { prevMacd: macdPrev ? macdPrev.macd : null }),
    cci: cc, cciPrev: ccPrev, wr: IND.williamsR(candles),
    atr: IND.atr(candles),
    bb: bbOut, prevBb: bbPrev ? { bw: bbPrev.bw, upper: bbPrev.upper, middle: bbPrev.mid, lower: bbPrev.lower } : null,
    kc: kcOut, prevKc: kcPrev ? { bw: kcPrev.bw, upper: kcPrev.upper, middle: kcPrev.mid, lower: kcPrev.lower } : null,
    adx: IND.adx(candles),
    hull: hc, prevHull: hcPrev,
    vwap: IND.vwap(candles),
    rvol: IND.rvol(candles),
    volAvg: IND.sma(IND.vols(candles), 20)
  };
}

/* rolling-window oscillator series for divergence detection */
function oscSeries(candles, fn, need = 60) {
  const out = new Array(candles.length).fill(null);
  for (let k = need; k < candles.length; k++) {
    const v = fn(candles.slice(k - need + 1, k + 1));
    out[k] = (typeof v === 'object' && v !== null) ? (v.k !== undefined ? v.k : v.macd !== undefined ? v.macd : v.histogram) : v;
  }
  return out;
}

function divergenceSafe(candles, series) {
  try { return RB.divergence(candles, series, 8); } catch (e) { return null; }
}

function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 10) return null;
  const ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let k = 0; k < n; k++) {
    const dx = a[k] - ma, dy = b[k] - mb;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

/* ---------- aggregator core ---------- */
class Aggregator {
  constructor(opts = {}) {
    this.engagedFloor = opts.engagedFloor ?? VOTE_MIN_ENGAGED; /* backtest may relax (data-starved replay) */
    this.mirrorSlAtSwing = opts.mirrorSlAtSwing ?? false;   /* mirrored SHORT SL anchored to swing high */
    this.bearBarOnly = opts.bearBarOnly ?? false;           /* flips only when the 15m candle is already red */
    this.structMinAge = opts.structMinAge ?? 3;             /* trade only ESTABLISHED trends (consecutive bars) */
    this.mem = {
      cvdRunning: 0, cvdBuckets: [],
      prevImbal: 0.5, fundingHist: [], oiHist: [],
      sweepH: null, sweepL: null, sweepHAt: 99, sweepLAt: 99,
      prevVotes: { long: 350, short: 300, neutral: 50, total: 600 },
      conf: 0.55, sigRR: 0, sigSL: null, sigTP: null, sigAge: null, lastSignalAt: null,
      streak: 0, signal: null, history: [], lastOutcome: 0,
      structName: null, structAge: 0, structBarTs: 0
    };
  }

  tick(data) {
    const pool = data.pool || {}, heavy = data.heavy || {};
    const S = this.buildS(data);
    S.meta = Object.assign({}, data.meta || {});
    S.meta.freshAge = Math.min(
      pool.finishedAt || Date.now(), heavy.finishedAt || Date.now(),
      (data.deriv && data.deriv.finishedAt) || Date.now());
    S.metaFreshAge = Date.now() - S.meta.freshAge;
    /* time source: bar time when candles exist (enables replay), else wall clock */
    const c15 = S.tf['15m'] && S.tf['15m'].candles;
    S.now = c15 && c15.length ? Number(c15[c15.length - 1][0]) : Date.now();
    const now = S.now;

    S.structure = this.structureOf(S);
    /* structure age advances per 15m BAR (not per tick) so live (7.5s cycles) and
       replay (15m bars) measure the same thing: consecutive bars of established trend */
    const barTs = c15 && c15.length ? Number(c15[c15.length - 1][0]) : 0;
    if (barTs !== this.mem.structBarTs) {
      this.mem.structBarTs = barTs;
      if (this.mem.structName === S.structure) this.mem.structAge++;
      else { this.mem.structName = S.structure; this.mem.structAge = 1; }
    }
    S.structureAge = this.mem.structAge;

    const swarm = runAll(S);
    /* SHORT engine: in DOWN structure the system trades pro-cyclically — every LONG
       (dip-buy, hammer-at-support, order-block accumulation…) is a knife catch in a
       waterfall. Flip all LONG votes to mirrored SHORT (levels reflected around entry). */
    if (S.structure === 'DOWN') {
      const c15l = c15 && c15[c15.length - 1];
      const lastGreen = c15l && Number(c15l[4]) > Number(c15l[1]);
      const swingH = S.swings15 && S.swings15.sh && S.swings15.sh[0];
      for (const v of swarm.votes) {
        if (v.vote === 'LONG') {
          if (this.bearBarOnly && lastGreen) continue; /* bounce not rolling over yet → stand down */
          v.vote = 'SHORT';
          const e = v.entry;
          if (isFinite(e)) {
            if (isFinite(v.sl)) v.sl = +(e + (e - v.sl)).toFixed(2);
            if (isFinite(v.tp)) v.tp = +(e + (e - v.tp)).toFixed(2);
            if (this.mirrorSlAtSwing && isFinite(v.sl) && isFinite(swingH) && swingH > v.sl) {
              const rr = isFinite(v.tp) && v.sl - e > 0 ? (v.sl - v.tp) / (v.sl - e) : 1.7;
              v.sl = swingH;
              v.tp = +(e - rr * (v.sl - e)).toFixed(2);
            }
          }
        }
      }
    }
    const tally = { LONG: 0, SHORT: 0, NEUTRAL: 0 };
    swarm.votes.forEach(v => tally[v.vote]++);
    tally.total = swarm.agentCount;
    const engaged = tally.LONG + tally.SHORT;
    const conf = engaged ? Math.max(tally.LONG, tally.SHORT) / engaged : 0.5;

    S.prevVotes = this.mem.prevVotes;
    S.tally = tally;
    this.mem.prevVotes = tally;
    this.mem.conf = conf;

    const geom = this.computeGeometry(S, swarm, tally);
    S.sigRR = geom.rr; S.sigSL = geom.sl; S.sigTP = geom.tp;

    const gates = this.gates(S, tally, conf);
    S.gates = gates;

    const canRefire = !this.mem.signal; /* persist active signal until expireSignal clears it */
    const signal = (gates.all && geom.entryCount >= VOTE_MIN_QUORUM && canRefire)
      ? this.buildSignal(S, swarm, tally, conf, gates, geom, now)
      : (this.mem.signal ? this.mem.signal : null);
    S.signal = signal ? this.decorate(signal, S) : null;
    S.sigAge = this.mem.sigAge;
    S.sigStreak = this.mem.streak;
    S.sigRR = this.mem.sigRR;
    S.sigSL = this.mem.sigSL;
    S.sigTP = this.mem.sigTP;
    S.conf = conf;
    S.faults = swarm.faults;
    S.noTradeReason = !gates.all
      ? 'GATE PROTOCOL: ' + ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g8'].filter(k => !gates[k].pass).map(k => k.toUpperCase()).join(', ') + ' FAILED'
      : (geom.entryCount < VOTE_MIN_QUORUM ? 'AGENT ENTRY CLUSTER TOO THIN (QUORUM ' + VOTE_MIN_QUORUM + ') — NO SIGNAL' : 'NO TRADE — MINORITY OUTLOOK');

    this.expireSignal(S, now);
    return { S, tally, signal, gates, faults: swarm.faults, perCat: swarm.perCat };
  }

  /* ------------------------------- state builder ------------------------------- */
  buildS(data) {
    const pool = data.pool || {};
    const R = pool.results || {};
    const deriv = data.deriv || {};
    const D = deriv.results || {};
    const heavy = data.heavy || {};
    const H = heavy.results || {};
    const mem = this.mem;
    const $ = name => (R[name] && R[name].data) || undefined;
    const $D = name => (D[name] && D[name].data) || undefined;
    const $H = name => (H[name] && H[name].data) || undefined;
    const nowSrc = (() => {
      const k = $('k_15m');
      return k && k.length ? Number(k[k.length - 1][0]) : Date.now();
    })();
    const S = {
      now: nowSrc,
      price: null, mark: null, index: null, bid: null, ask: null, spread: null,
      funding: null, fundingHist: mem.fundingHist, oi: null, oiDelta: null, oiHist: mem.oiHist,
      lsGlobal: null, lsTopAcc: null, lsTopPos: null, takerRatio: null,
      basis: null, basisPct: null, adl: null,
      forceLiq: { count: 0, netBuy: 0 }, forceLiqAge: 999,
      book: { bids: [], asks: [], bidVol: 0, askVol: 0, imbalBid: 0.5, imbalPrev: mem.prevImbal, bidWalls: [], askWalls: [], spread: 0, top3Bid: 0, top3Ask: 0, l1Bid: null, l1Ask: null },
      tf: {}, pivots: null, pivots1h: null, prevDay: null,
      vp: {}, vwap15: null, swings15: { sh: [], sl: [] }, srHi: [], srLo: [],
      obs: { bull: [], bear: [] }, obs1h: { bull: [], bear: [] },
      fvgs: { bull: [], bear: [] }, fvgs1h: { bull: [], bear: [] },
      breaker: null, breaker1h: null, liqVoids: [], liqVoids1h: [],
      imbalance: { to: 'NEUTRAL', size: 0 },
      channel: null, range: null, openingRange: null,
      bias15: 'NEUTRAL', bias1h: 'NEUTRAL', bias4h: 'NEUTRAL',
      regime: 'MED', atr15: 0, atr15pct: 0,
      cvd: null, cvdPrev: null, cvd1h: null, cvdRate: null,
      cvdDivBull: false, cvdDivBear: false,
      rsiDivBull: false, rsiDivBear: false, macdDivBull: false, macdDivBear: false,
      stochDivBull: false, stochDivBear: false, cciDivBull: false, cciDivBear: false,
      delta15: [], delta15Cur: null,
      aggBuyPct: 0.5, tradeSeq: 0, tradeAggPct: 0, largeTrades: { count: 0, net: 0, vol: 0 },
      aggTrades: [],
      sessions: null, sigStreak: 0, sigAge: null, sigRR: 0, sigSL: null, sigTP: null, conf: 0.55,
      corrBTC: null,
      liq: { sweptH: mem.sweepH, sweptL: mem.sweepL, sweptAt: Math.max(mem.sweepHAt, mem.sweepLAt) }
    };

    /* price core */
    const prem = $('premiumIndex');
    if (prem) {
      S.mark = Number(prem.markPrice) || null;
      S.index = Number(prem.indexPrice) || null;
      if (S.mark !== null && S.index !== null) {
        S.basis = S.mark - S.index;
        S.basisPct = S.index ? S.basis / S.index : null;
      }
      if (prem.lastFundingRate !== undefined) {
        S.funding = Number(prem.lastFundingRate);
        const fh = mem.fundingHist;
        const fNow = S.now || Date.now();
        if (!fh.length || fNow - (mem.fundingAt || 0) > 3.6e6) {
          mem.fundingAt = fNow;
          fh.push(S.funding);
          if (fh.length > 24) fh.shift();
        }
      }
    }
    const t24 = $('ticker24');
    if (t24) {
      if (t24.lastPrice !== undefined) S.price = Number(t24.lastPrice);
      S.ticker24 = t24;
    }
    const bt = $('bookTicker');
    if (bt) {
      S.bid = Number(bt.bidPrice);
      S.ask = Number(bt.askPrice);
      S.spread = S.ask - S.bid;
    }
    const oiR = $('openInterest');
    if (oiR) S.oi = Number(oiR.openInterest);
    const oiHRaw = $D('oiHist');
    if (oiHRaw && oiHRaw.length) {
      const oh = oiHRaw.map(x => Number(x.sumOpenInterest)).filter(v => isFinite(v) && v > 0);
      for (const v of oh) { mem.oiHist.push(v); }
      while (mem.oiHist.length > 30) mem.oiHist.shift();
      S.oiHist = mem.oiHist;
      if (mem.oiHist.length >= 2) S.oiDelta = (mem.oiHist[mem.oiHist.length - 1] - mem.oiHist[mem.oiHist.length - 2]) / (mem.oiHist[mem.oiHist.length - 2] || 1);
    }
    if (S.oi === null && mem.oiHist.length) S.oi = mem.oiHist[mem.oiHist.length - 1];
    if (S.price === null) S.price = S.mark;
    if (S.price === null) return S; /* nothing usable this cycle */

    /* timeframes + indicators */
    for (const tfName of ['1m', '3m', '5m', '15m', '1h', '4h', '1d']) {
      const candles = $(`k_${tfName}`);
      if (!candles || candles.length < 40) continue;
      S.tf[tfName] = { candles, i: tfInd(candles) };
    }
    if (!S.tf['15m']) return S;
    const i15 = S.tf['15m'].i;
    S.atr15 = i15.atr || 0;
    S.atr15pct = S.price ? S.atr15 / S.price : 0;
    S.regime = S.atr15pct < 0.0015 ? 'LOW' : S.atr15pct > 0.0035 ? 'HIGH' : 'MED';

    /* prevDay + pivots */
    const d1k = S.tf['1d'] && S.tf['1d'].candles;
    if (d1k && d1k.length > 1) {
      const pd = d1k[d1k.length - 2];
      S.prevDay = { h: Number(pd[2]), l: Number(pd[3]), o: Number(pd[1]), c: Number(pd[4]) };
      S.pivots = IND.pivotPoints(pd);
    }
    const h1 = S.tf['1h'] && S.tf['1h'].candles;
    if (h1 && h1.length > 1) S.pivots1h = IND.pivotPoints(h1[h1.length - 2]);

    /* biases */
    const biasOf = tfName => {
      const c = S.tf[tfName] && S.tf[tfName].candles;
      if (!c || c.length < 60) return 'NEUTRAL';
      const b = IND.dominantBias(c);
      return b === 'RANGE' ? 'NEUTRAL' : b;
    };
    S.bias15 = biasOf('15m'); S.bias1h = biasOf('1h'); S.bias4h = biasOf('4h');

    /* volume profile + vwap */
    const c15f = S.tf['15m'].candles;
    const v15 = IND.volumeProfile(c15f.slice(-48));
    S.vp['15m'] = { poc: v15.poc, vah: v15.valueHigh, val: v15.valueLow };
    S.vwap15 = IND.vwap(c15f.slice(-200));
    if (S.tf['1h']) {
      const v1h = IND.volumeProfile(S.tf['1h'].candles.slice(-48));
      S.vp['1h'] = { poc: v1h.poc, vah: v1h.valueHigh, val: v1h.valueLow };
    }

    /* swings + S/R */
    const sw = IND.swingLevels(c15f, 3);
    const shAll = sw.filter(x => x.type === 'high').map(x => x.price);
    const slAll = sw.filter(x => x.type === 'low').map(x => x.price);
    const byDist = (a, b) => Math.abs(a - S.price) - Math.abs(b - S.price);
    S.swings15 = { sh: shAll.sort(byDist), sl: slAll.sort(byDist) };
    const sr = IND.supportResistance(c15f, 3);
    S.srHi = sr.filter(x => x.price > S.price).sort(byDist).map(x => x.price);
    S.srLo = sr.filter(x => x.price < S.price).sort(byDist).map(x => x.price);

    /* order blocks + FVGs */
    const obsOf = (tfName) => {
      const c = S.tf[tfName] && S.tf[tfName].candles;
      if (!c || c.length < 30) return { bull: [], bear: [], bullF: [], bearF: [] };
      const bull = IND.detectOrderBlocks(c, 'bull').map(b => ({ top: b.top, bot: b.bot, at: b.at }))
        .sort((a, b) => Math.abs(a.bot - S.price) - Math.abs(b.bot - S.price));
      const bear = IND.detectOrderBlocks(c, 'bear').map(b => ({ top: b.top, bot: b.bot, at: b.at }))
        .sort((a, b) => Math.abs(a.top - S.price) - Math.abs(b.top - S.price));
      const fvg = IND.detectFVGs(c).map(g => ({ top: g.top, bot: g.bot, at: g.at }));
      return {
        bull, bear,
        bullF: fvg.filter(g => g.bot < S.price).sort((a, b) => b.bot - a.bot),
        bearF: fvg.filter(g => g.top > S.price).sort((a, b) => a.top - b.top)
      };
    };
    const o15 = obsOf('15m');
    S.obs = { bull: o15.bull, bear: o15.bear };
    const o1h = obsOf('1h');
    S.obs1h = { bull: o1h.bull, bear: o1h.bear };
    S.fvgs = { bull: o15.bullF, bear: o15.bearF };
    S.fvgs1h = { bull: o1h.bullF, bear: o1h.bearF };
    const brokenOB = (arr, dir, atrRef) => {
      for (const b of arr) {
        if (dir === 'bull' && S.price < b.bot - atrRef * 0.15)
          return { top: b.top, bot: b.bot, mid: (b.top + b.bot) / 2, bull: 1, bear: 0, at: b.at, mitig: { top: b.top, bot: b.bot } };
        if (dir === 'bear' && S.price > b.top + atrRef * 0.15)
          return { top: b.top, bot: b.bot, mid: (b.top + b.bot) / 2, bull: 0, bear: 1, at: b.at, mitig: { top: b.top, bot: b.bot } };
      }
      return null;
    };
    S.breaker = brokenOB(o15.bull, 'bull', S.atr15 || 1) || brokenOB(o15.bear, 'bear', S.atr15 || 1);
    S.breaker1h = S.tf['1h'] ? (brokenOB(o1h.bull, 'bull', S.tf['1h'].i.atr || 1) || brokenOB(o1h.bear, 'bear', S.tf['1h'].i.atr || 1)) : null;

    /* liquidity voids */
    const voidsOf = (tfName, mult) => {
      const c = S.tf[tfName] && S.tf[tfName].candles;
      if (!c || c.length < 10) return [];
      const atr = S.tf[tfName].i.atr || 1;
      const out = [];
      for (let k = 1; k < c.length - 1; k++) {
        const prevH = Number(c[k - 1][2]), prevL = Number(c[k - 1][3]);
        const curL = Number(c[k][3]), curH = Number(c[k][2]);
        if (prevH < curL - atr * mult) out.push({ top: curL, low: prevH });
        if (prevL > curH + atr * mult) out.push({ top: prevL, low: curH });
      }
      return out.slice(-8);
    };
    S.liqVoids = voidsOf('15m', 1.5);
    S.liqVoids1h = S.tf['1h'] ? voidsOf('1h', 2) : [];

    /* channel + range */
    const n = Math.min(40, c15f.length);
    const seg = c15f.slice(-n);
    const ys = seg.map(x => Number(x[4]));
    const mx = ys.reduce((a, b) => a + b, 0) / n;
    const xt = (n - 1) / 2;
    let sxy = 0, sxx = 0;
    for (let k = 0; k < n; k++) { sxy += (k - xt) * (ys[k] - mx); sxx += (k - xt) * (k - xt); }
    const slope = sxx ? sxy / sxx : 0;
    const regEnd = mx + slope * (n - 1 - xt);
    const band = (S.atr15 || 1) * 0.5;
    S.channel = {
      type: slope > 0.02 ? 'BULL' : slope < -0.02 ? 'BEAR' : 'NEUTRAL',
      top: regEnd + band, bot: regEnd - band, slope,
      apex: clamp(1 - Math.abs(ys[n - 1] - regEnd) / (band * 4 || 1), 0, 1)
    };
    const hAvg = Math.max(...seg.map(x => Number(x[2]))), lAvg = Math.min(...seg.map(x => Number(x[3])));
    const flat = Math.abs(slope) < 0.02 && (hAvg - lAvg) < (S.atr15 || 1) * 2.2;
    const tri = Math.abs(slope) >= 0.02 && Math.abs(slope) < 0.08 && (hAvg - lAvg) < (S.atr15 || 1) * 1.3;
    S.range = {
      type: tri ? 'tri' : flat ? 'flat' : 'trending',
      top: hAvg, bot: lAvg, mid: (hAvg + lAvg) / 2, width: hAvg - lAvg,
      slope, apex: S.channel.apex
    };

    /* opening range: first 2 bars of UTC day */
    const dayStart = Math.floor(c15f[c15f.length - 1][0] / 86400000) * 86400000;
    const orC = c15f.filter(x => x[0] >= dayStart).slice(0, 2);
    if (orC.length >= 2) {
      S.openingRange = { high: Math.max(...orC.map(x => Number(x[2]))), low: Math.min(...orC.map(x => Number(x[3]))) };
    }

    /* sweeps + equal pools */
    this.detectSweeps(S);

    /* sessions */
    S.sessions = this.sessions(S);

    /* derivatives */
    const gLS = $D('globalLS');
    if (gLS && gLS.length) S.lsGlobal = Number(gLS[gLS.length - 1].longShortRatio);
    const tA = $D('topAccLS');
    if (tA && tA.length) S.lsTopAcc = Number(tA[tA.length - 1].longShortRatio);
    const tP = $D('topPosLS');
    if (tP && tP.length) S.lsTopPos = Number(tP[tP.length - 1].longShortRatio);
    const tR = $D('takerRatio');
    if (tR && tR.length) S.takerRatio = Number(tR[tR.length - 1].buySellRatio);
    if (S.lsGlobal !== null) {
      S.adl = clamp(50 + (S.lsGlobal - 0.5) * 60 + ((S.takerRatio || 0.5) - 0.5) * 60 + (S.funding || 0) * 8000, 5, 95);
    }

    /* forced orders */
    const fo = $H('forceOrders');
    if (fo && fo.length) {
      let count = 0, netBuy = 0, lastT = 0;
      for (const o of fo) {
        count++;
        const qty = Number(o.origQty) || 0, pr = Number(o.price) || 0;
        netBuy += (o.side === 'BUY' ? 1 : -1) * qty * pr;
        if (o.time > lastT) lastT = Number(o.time);
      }
      S.forceLiq = { count, netBuy };
      S.forceLiqAge = lastT ? (Date.now() - lastT) / 60000 : 999;
    }

    /* order book */
    const depth = $('depth');
    if (depth) {
      const bids = depth.bids.map(b => [Number(b[0]), Number(b[1])]);
      const asks = depth.asks.map(a => [Number(a[0]), Number(a[1])]);
      S.book.bids = bids; S.book.asks = asks;
      const bv = bids.slice(0, 12).reduce((s, x) => s + x[1], 0);
      const av = asks.slice(0, 12).reduce((s, x) => s + x[1], 0);
      S.book.bidVol = bv; S.book.askVol = av;
      S.book.imbalBid = (bv + av) > 0 ? bv / (bv + av) : 0.5;
      S.book.imbalPrev = mem.prevImbal;
      mem.prevImbal = S.book.imbalBid;
      const mean = (bv + av) / Math.max(bids.length + asks.length, 1) || 1;
      S.book.bidWalls = bids.slice(0, 30).filter(b => b[1] >= mean * 1.8).map(b => ({ p: b[0], q: b[1] }));
      S.book.askWalls = asks.slice(0, 30).filter(a => a[1] >= mean * 1.8).map(a => ({ p: a[0], q: a[1] }));
      S.book.top3Bid = bids.slice(0, 3).reduce((s, x) => s + x[1], 0);
      S.book.top3Ask = asks.slice(0, 3).reduce((s, x) => s + x[1], 0);
      S.book.l1Bid = bids[0] ? bids[0][0] : null;
      S.book.l1Ask = asks[0] ? asks[0][0] : null;
      S.book.spread = (S.ask || 0) - (S.bid || 0);
      if (S.spread === null) S.spread = S.book.spread;
    }

    /* tape → CVD / delta / sequence */
    const ag = $H('aggTrades');
    if (ag && ag.length) {
      S.aggTrades = ag;
      const bucketAt = t => Math.floor(t / BUCKET) * BUCKET;
      const map = new Map();
      let large = { count: 0, net: 0, vol: 0 };
      for (const t of ag) {
        const qty = Number(t.q), pr = Number(t.p), isBuy = t.m === false;
        const bk = bucketAt(Number(t.T));
        const cur = map.get(bk) || { cvd: 0, bv: 0, sv: 0, n: 0 };
        cur.cvd += isBuy ? qty : -qty; cur.bv += isBuy ? qty : 0; cur.sv += isBuy ? 0 : qty; cur.n++;
        map.set(bk, cur);
        if ((qty * pr) >= 30000) { large.count++; large.net += isBuy ? qty * pr : -qty * pr; large.vol += qty * pr; }
      }
      S.largeTrades = large;
      const keys = [...map.keys()].sort((a, b) => a - b);
      S.delta15 = keys.map(k => map.get(k).cvd);
      S.delta15Cur = S.delta15.length ? S.delta15[S.delta15.length - 1] : 0;
      const last = map.get(keys[keys.length - 1]) || { bv: 0, sv: 0, cvd: 0, n: 0 };
      S.aggBuyPct = (last.bv + last.sv) > 0 ? last.bv / (last.bv + last.sv) : 0.5;
      S.tradeAggPct = Math.max(last.bv, last.sv) / Math.max(last.bv + last.sv, 1e-9);
      S.tradeSeq = 0;
      for (let k = keys.length - 1; k > keys.length - 7 && k >= 0; k--) {
        const side = map.get(keys[k]).cvd >= 0 ? 1 : -1;
        if (k === keys.length - 1) { S.tradeSeq = side; continue; }
        if (k === 0) break;
        const prevSide = map.get(keys[k - 1]).cvd >= 0 ? 1 : -1;
        if (side === prevSide) S.tradeSeq = side * (Math.abs(S.tradeSeq) + 1); else break;
      }
      /* merge into running cvd buckets */
      let merged = false;
      for (const k of keys) {
        const b = map.get(k);
        const lastB = mem.cvdBuckets.length ? mem.cvdBuckets[mem.cvdBuckets.length - 1] : null;
        if (lastB && lastB.t === k) { lastB.cvd = b.cvd; lastB.bv = b.bv; lastB.sv = b.sv; lastB.n = b.n; merged = true; }
        else mem.cvdBuckets.push({ t: k, cvd: b.cvd, bv: b.bv, sv: b.sv, n: b.n });
      }
      if (mem.cvdBuckets.length > 60) mem.cvdBuckets.splice(0, mem.cvdBuckets.length - 60);
      if (mem.cvdBuckets.length && !merged) mem.cvdRunning += mem.cvdBuckets[mem.cvdBuckets.length - 1].cvd;
      S.cvd = mem.cvdRunning;
      const tmp = mem.cvdBuckets;
      S.cvdPrev = tmp.length > 1 ? tmp[tmp.length - 1].cvd : null;
      S.cvd1h = tmp.slice(-4).reduce((s, x) => s + x.cvd, 0);
      S.cvdRate = S.atr15 ? ((tmp.length > 1 ? tmp[tmp.length - 1].cvd - tmp[tmp.length - 2].cvd : 0) / S.atr15) : null;
      if (tmp.length >= 12 && c15f.length >= tmp.length) {
        const cSlice = c15f.slice(-tmp.length);
        const cvdSer = tmp.slice(-cSlice.length).map(x => x.cvd);
        const d = divergenceSafe(cSlice, cvdSer);
        if (d) { S.cvdDivBull = !!d.bull; S.cvdDivBear = !!d.bear; }
      }
    }

    /* oscillator divergences on 15m */
    const rsiS = IND.rsiSeries(c15f);
    const d1 = divergenceSafe(c15f, rsiS); if (d1) { S.rsiDivBull = !!d1.bull; S.rsiDivBear = !!d1.bear; }
    const macdS = oscSeries(c15f, cs => IND.macd(cs), 40);
    const d2 = divergenceSafe(c15f, macdS); if (d2) { S.macdDivBull = !!d2.bull; S.macdDivBear = !!d2.bear; }
    const stochS = oscSeries(c15f, cs => IND.stoch(cs), 30);
    const d3 = divergenceSafe(c15f, stochS); if (d3) { S.stochDivBull = !!d3.bull; S.stochDivBear = !!d3.bear; }
    const cciS = oscSeries(c15f, cs => IND.cci(cs), 30);
    const d4 = divergenceSafe(c15f, cciS); if (d4) { S.cciDivBull = !!d4.bull; S.cciDivBear = !!d4.bear; }

    /* BTC correlation */
    const btc = $('k_BTCUSDT_15m');
    if (btc && btc.length > 30) {
      S.corrBTC = pearson(c15f.slice(-50).map(x => Number(x[4])), btc.slice(-50).map(x => Number(x[4])));
    }

    /* imbalance summary */
    if (S.delta15 && S.delta15.length >= 4) {
      const d = S.delta15.slice(-4).reduce((s, x) => s + x, 0);
      S.imbalance = { to: d > 0 ? 'BULL' : d < 0 ? 'BEAR' : 'NEUTRAL', size: Math.abs(d) };
    }

    return S;
  }

  /* sweep memory across cycles */
  detectSweeps(S) {
    const mem = this.mem;
    const atr = S.atr15 || 1;
    const pools = [];
    S.swings15.sh.slice(0, 4).forEach(p => pools.push({ p, dir: 'H' }));
    S.swings15.sl.slice(0, 4).forEach(p => pools.push({ p, dir: 'L' }));
    if (S.prevDay) { pools.push({ p: S.prevDay.h, dir: 'H' }); pools.push({ p: S.prevDay.l, dir: 'L' }); }
    if (S.sessions && S.sessions.asianHigh) pools.push({ p: S.sessions.asianHigh, dir: 'H' });
    if (S.sessions && S.sessions.asianLow) pools.push({ p: S.sessions.asianLow, dir: 'L' });
    const c15 = S.tf['15m'].candles;
    for (let k = Math.max(0, c15.length - 4); k < c15.length; k++) {
      const h = Number(c15[k][2]), l = Number(c15[k][3]), cl = Number(c15[k][4]);
      for (const pool of pools) {
        if (pool.dir === 'H' && h >= pool.p - atr * 0.15 && cl < pool.p) {
          const age = c15.length - 1 - k;
          if (mem.sweepH !== pool.p || mem.sweepHAt >= age) { mem.sweepH = pool.p; mem.sweepHAt = age; }
        }
        if (pool.dir === 'L' && l <= pool.p + atr * 0.15 && cl > pool.p) {
          const age = c15.length - 1 - k;
          if (mem.sweepL !== pool.p || mem.sweepLAt >= age) { mem.sweepL = pool.p; mem.sweepLAt = age; }
        }
      }
    }
    if (mem.sweepHAt >= 8) { mem.sweepH = null; }
    if (mem.sweepLAt >= 8) { mem.sweepL = null; }
    S.liq.sweptH = mem.sweepH;
    S.liq.sweptL = mem.sweepL;
    S.liq.sweptAt = Math.min(mem.sweepHAt, mem.sweepLAt);
    const eq = RB.equalPools(c15, 8);
    S.liq.eqH = eq.highs;
    S.liq.eqL = eq.lows;
  }

  sessions(S) {
    const c1 = S.tf['1m'] && S.tf['1m'].candles;
    const t = c1 && c1.length ? Number(c1[c1.length - 1][0]) : Date.now();
    const d = new Date(t);
    const h = d.getUTCHours() + d.getUTCMinutes() / 60;
    const dow = d.getUTCDay();
    const isWeekend = dow === 6 || dow === 0;
    const isAsian = h >= 0 && h < 8;
    const isLondon = h >= 8 && h < 12;
    const isNY = h >= 12 && h < 21;
    const name = isWeekend ? 'Weekend' : isNY ? 'NY' : isLondon ? 'London' : isAsian ? 'Asian' : 'Other';
    let asianHigh = null, asianLow = null;
    if (c1) {
      const dayStart = Math.floor(t / 86400000) * 86400000;
      const today = c1.filter(x => x[0] >= dayStart);
      if (today.length >= 2) {
        asianHigh = Math.max(...today.map(x => Number(x[2])));
        asianLow = Math.min(...today.map(x => Number(x[3])));
      }
    }
    const nextAt = hour => {
      const next = new Date(t);
      next.setUTCHours(hour, 0, 0, 0);
      if (next.getTime() <= t) next.setUTCDate(next.getUTCDate() + 1);
      return Math.round((next.getTime() - t) / 60000);
    };
    return {
      name, isAsian, isLondon, isNY, isWeekend,
      asianHigh, asianLow,
      minToLondon: h < 8 ? nextAt(8) : 9999,
      minToNY: h < 12 ? nextAt(12) : 9999
    };
  }

  /* --------------------------- geometry (pre-gate) --------------------------- */
  computeGeometry(S, swarm, tally) {
    const winner = tally.LONG >= tally.SHORT ? 'LONG' : 'SHORT';
    const majority = swarm.votes.filter(v => v.vote === winner);
    const atr = S.atr15 || 1;
    let out = { winner, entryCount: majority.length, idealEntry: S.price, sl: null, tp: null, rr: 0, risk: 0, entryLow: null, entryHigh: null };
    if (majority.length < VOTE_MIN_QUORUM) return out;
    const trim = arr => {
      if (!arr.length) return null;
      const s = arr.slice().sort((a, b) => a - b);
      const cut = Math.max(1, Math.floor(s.length * 0.1));
      const core = s.slice(cut, s.length - cut);
      return core.length ? core[Math.floor(core.length / 2)] : s[0];
    };
    const medEntry = trim(majority.map(v => v.entry || S.price)) || S.price;
    let sl = trim(majority.map(v => v.sl).filter(x => isFinite(x)));
    let tp = trim(majority.map(v => v.tp).filter(x => isFinite(x)));
    const slFallback = medEntry + (winner === 'LONG' ? -1 : 1) * atr * 1.1;
    const tpFallback = medEntry + (winner === 'LONG' ? 1 : -1) * atr * 2;
    if (!isFinite(sl) || Math.abs(sl - medEntry) > atr * 2.5) sl = slFallback;
    if (!isFinite(tp) || Math.abs(tp - medEntry) > atr * 4) tp = tpFallback;
    const risk = Math.abs(medEntry - sl);
    const reward = Math.abs(tp - medEntry);
    out.idealEntry = medEntry;
    out.sl = sl; out.tp = tp;
    out.risk = risk;
    out.rr = risk > 0 ? reward / risk : 0;
    out.entryLow = medEntry - atr * 0.3;
    out.entryHigh = medEntry + atr * 0.3;
    return out;
  }

  /* -------------------------------- structure --------------------------------- */
  /* structural alignment: 1h EMA50/200 pair (UP / DOWN / MIXED) — sole authority,
     the 15m position check was too sticky: bounces inside a waterfall read MIXED
     and starved the SHORT engine. */
  structureOf(S) {
    const f1h = S.tf['1h'] && S.tf['1h'].i;
    if (!f1h || !f1h.ema50 || !f1h.ema200 || !S.price) return 'MIXED';
    if (f1h.ema50 > f1h.ema200 && S.price > f1h.ema50) return 'UP';
    if (f1h.ema50 < f1h.ema200 && S.price < f1h.ema50) return 'DOWN';
    return 'MIXED';
  }

  /* ---------------------------------- gates ----------------------------------- */
  gates(S, tally, conf) {
    const atr = S.atr15 || 0;
    const g1 = S.metaFreshAge !== undefined && S.metaFreshAge < 60000;
    const g2 = S.atr15pct >= 0.0008 && S.atr15pct <= 0.0045 && (S.spread || 0) < 0.15;
    const g3 = Math.max(tally.LONG, tally.SHORT) >= VOTE_MIN_QUORUM && (tally.LONG + tally.SHORT) >= this.engagedFloor && conf >= VOTE_MIN_CONF;
    const slDist = S.sigSL ? Math.abs(S.sigSL - S.price) : NaN;
    const rr = S.sigRR || 0;
    const g4 = isFinite(slDist) && slDist > 0 && slDist <= atr * 1.5 && rr >= 1.5;
    const imb = S.book.imbalBid;
    const dir = tally.LONG >= tally.SHORT ? 'LONG' : 'SHORT';
    const g5 = dir === 'LONG' ? imb >= 0.2 : imb <= 0.8;
    const fundVeto = Math.abs(S.funding || 0) > 0.001;
    const oiVeto = S.oiDelta !== null && S.oiDelta !== undefined && Math.abs(S.oiDelta) > 0.1;
    const lsVeto = S.lsGlobal !== null && (S.lsGlobal > 0.9 || S.lsGlobal < 0.1);
    const g6 = !(fundVeto || oiVeto || lsVeto);
    /* g8 — structural alignment: veto signals against the dominant trend; MIXED = stand down.
       structMinAge: only trade trends established for >= N bars (chop immunity). */
    const structure = S.structure;
    const g8 = ((structure === 'UP' && dir === 'LONG') || (structure === 'DOWN' && dir === 'SHORT')) && S.structureAge >= this.structMinAge;
    return {
      g1: { pass: g1, note: 'All API data fresh < 60s (fresh ' + Math.round(S.metaFreshAge || 0) + 's)' },
      g2: { pass: g2, note: 'ATR% = ' + (S.atr15pct * 100).toFixed(3) + '% | spread $' + (S.spread || 0).toFixed(3) },
      g3: { pass: g3, note: Math.max(tally.LONG, tally.SHORT) + '/' + (tally.LONG + tally.SHORT) + ' engaged (floor ' + this.engagedFloor + '), dir conf ' + (conf * 100).toFixed(1) + '%, quorum ' + VOTE_MIN_QUORUM },
      g4: { pass: g4, note: 'R:R = ' + (rr ? rr.toFixed(2) : '—') + ' | SL = ' + (isFinite(slDist) ? (slDist / (atr || 1)).toFixed(2) : '—') + '× ATR' },
      g5: { pass: g5, note: 'OB imbalance ' + (imb * 100).toFixed(1) + '% ' + (imb >= 0.5 ? 'BID' : 'ASK') },
      g6: { pass: g6, note: 'Funding ' + ((S.funding || 0) * 100).toFixed(4) + '% | OIΔ ' + (S.oiDelta === null ? '—' : (S.oiDelta * 100).toFixed(1) + '%') + ' | L/S ' + (S.lsGlobal === null ? '—' : S.lsGlobal.toFixed(2)) },
      g8: { pass: g8, note: 'Structure ' + structure + ' ×' + S.structureAge + ' vs ' + dir + ' majority' },
      all: g1 && g2 && g3 && g4 && g5 && g6 && g8,
      fundVeto, oiVeto, lsVeto, dir
    };
  }

  /* ------------------------------- signal build ------------------------------- */
  buildSignal(S, swarm, tally, conf, gates, geom, now) {
    const price = S.price || geom.idealEntry;
    now = now || Date.now();
    const atr = S.atr15 || 1;
    const riskLevel = (this.mem.streak <= -2 && this.mem.streak > -4) ? 0.5 : 1;
    const riskPct = 1 * riskLevel;
    const notional = (10000 * riskPct) / ((geom.risk / price) || 1e-9);
    const lev = clamp(notional / 10000, 1, 10);
    const trail = geom.winner === 'LONG' ? geom.idealEntry + 2 * geom.risk : geom.idealEntry - 2 * geom.risk;
    const invalidation = geom.winner === 'LONG' ? geom.idealEntry - atr * 2 : geom.idealEntry + atr * 2;

    const majority = swarm.votes.filter(v => v.vote === geom.winner);
    const byCat = new Map();
    majority.forEach(v => { byCat.set(v.cat, (byCat.get(v.cat) || 0) + 1); });
    const topCats = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(e => 'Cat ' + e[0]);
    const keyAgents = majority.slice().sort((a, b) => b.conf - a.conf).slice(0, 3).map(v => v.id);

    const quality = Math.round(clamp(conf * 600 + (geom.rr >= 1.5 ? 200 : 0) + (gates.all ? 100 : 0) + (geom.rr >= 2.2 ? 60 : 0), 0, 1000));

    const warnings = [];
    if (Math.abs(S.funding || 0) > 0.0005) warnings.push('EXTREME FUNDING: ' + ((S.funding || 0) * 100).toFixed(4) + '% — crowded positioning.');
    if ((S.spread || 0) > 0.5) warnings.push('Wide spread — position size reduced 50%.');
    if (S.forceLiq && S.forceLiq.count > 40) warnings.push('Liquidation storm detected (' + S.forceLiq.count + ' forced orders).');
    if (S.regime === 'HIGH') warnings.push('High volatility regime — expect whipsaw.');
    if (this.mem.streak <= -2) warnings.push('Loss streak ' + this.mem.streak + ' — risk cut to 0.5%.');
    warnings.push('Honor the stop. Never average down.');

    const sig = {
      ts: now, direction: geom.winner, conf,
      count: Math.max(tally.LONG, tally.SHORT) + '/600',
      quality, timeframe: '15-MINUTE PRIMARY | 3-MINUTE EXECUTION',
      entryZone: [geom.entryLow, geom.entryHigh], idealEntry: geom.idealEntry,
      sl: geom.sl, tp: geom.tp, trail, rr: geom.rr, riskPct, notional, lev,
      maxDD: 10, validity: 12, invalidation,
      topCats, keyAgents,
      price, mark: S.mark, index: S.index, spread: S.spread,
      funding: S.funding, oi: S.oi, ls: S.lsGlobal,
      gates: {
        g1: gates.g1.pass, g2: gates.g2.pass, g3: gates.g3.pass,
        g4: gates.g4.pass, g5: gates.g5.pass, g6: gates.g6.pass, g8: gates.g8.pass
      },
      warnings
    };
    this.mem.signal = sig;
    this.mem.sigRR = geom.rr;
    this.mem.sigSL = geom.sl;
    this.mem.sigTP = geom.tp;
    this.mem.conf = conf;
    this.mem.sigAge = 0;
    this.mem.lastSignalAt = now;
    this.mem.history.push(sig);
    if (this.mem.history.length > 25) this.mem.history.shift();
    return sig;
  }

  decorate(sig, S) {
    const p = S.pivots || {};
    sig.levels = {
      resistance: [S.srHi && S.srHi[0], p.r1, p.r2].filter(x => x !== undefined && x !== null && x !== 0).slice(0, 3),
      support: [S.srLo && S.srLo[0], p.s1, p.s2].filter(x => x !== undefined && x !== null && x !== 0).slice(0, 3),
      r1: p.r1, r2: p.r2, r3: p.r3, s1: p.s1, s2: p.s2, s3: p.s3
    };
    sig.checklist = [
      'Set limit order at ' + sig.idealEntry.toFixed(2),
      'Hard stop at ' + sig.sl.toFixed(2) + ' — NO EXCEPTIONS',
      'Take profit at ' + sig.tp.toFixed(2),
      'Trail stop to breakeven at ' + sig.trail.toFixed(2),
      'Invalidation: 15m close beyond ' + sig.invalidation.toFixed(2)
    ];
    sig.rationale = sig.direction === 'LONG'
      ? 'Majority of the 600-agent swarm (' + sig.topCats.join(', ') + ') aligned on bullish structure with rising flow; median stop stays inside 1.5×ATR while median target delivers ' + sig.rr.toFixed(2) + ':1.'
      : 'Majority of the 600-agent swarm (' + sig.topCats.join(', ') + ') aligned on bearish structure with falling flow; median stop stays inside 1.5×ATR while median target delivers ' + sig.rr.toFixed(2) + ':1.';
    return sig;
  }

  /* signal age / streak management */
  expireSignal(S, now) {
    const mem = this.mem;
    now = now || Date.now();
    if (mem.signal && mem.lastSignalAt) {
      mem.sigAge = (now - mem.lastSignalAt) / 60000;
      const sig = mem.signal;
      if (mem.sigAge > sig.validity) {
        const price = S.price;
        let outcome = 0;
        if (sig.direction === 'LONG') { if (price <= sig.sl) outcome = -1; else if (price >= sig.tp) outcome = 1; }
        else { if (price >= sig.sl) outcome = -1; else if (price <= sig.tp) outcome = 1; }
        if (outcome !== 0) { mem.streak += outcome; mem.lastOutcome = outcome; }
        mem.signal = null;
      }
    }
    /* live-grade open history entries against current price */
    if (S.price) {
      for (const h of mem.history) {
        if (h.outcome !== undefined && h.outcome !== null) continue;
        if (now - h.ts > (h.validity || 12) * 60000) { h.outcome = 99; continue; }
        if (h.direction === 'LONG') { if (S.price <= h.sl) h.outcome = -1; else if (S.price >= h.tp) h.outcome = 1; }
        else { if (S.price >= h.sl) h.outcome = -1; else if (S.price <= h.tp) h.outcome = 1; }
      }
    }
    S.history = mem.history;
    S.sigAge = mem.sigAge;
    S.sigStreak = mem.streak;
  }
}

module.exports = { Aggregator };