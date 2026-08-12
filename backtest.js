'use strict';
/* OMNISCIENT SCALPER v22.1 — backtest harness.
   Replays the full swarm + 6-Gate protocol + signal geometry over historical 15m bars
   (up to 1000 bars ≈ 10 days), using real historical klines + derivatives time series,
   with fabricated live-book inputs (no historical depth/tape → those cats abstain).
   Outcome simulation: intrabar touch of SL/TP within signal validity.
   Run: node backtest.js  [--since <unix-ms>] [--cats] [--mirror] [--bearbar] [--age N]  */

const F = require('./fetcher');
const { Aggregator } = require('./aggregator');

const N = 1500;                 /* 15m klines to replay (~15.6 days) */
const WARM = 800;               /* bars to skip before first test (warms 1h EMA50/200 + 15m EMA200) */
const RELAX_ENGAGED = 80;       /* backtest data lacks depth/tape/cvd → fewer engaged agents */

const sinceArg = process.argv.find(a => a.startsWith('--since='));
const SINCE = sinceArg ? Number(sinceArg.split('=')[1]) : null;
const CATS_DIAG = process.argv.includes('--cats');
const MIRROR = process.argv.includes('--mirror');
const BEARBAR = process.argv.includes('--bearbar');
const AGE = Number((process.argv.find(a => a.startsWith('--age=')) || '').split('=')[1] || 1);

const DAYS30 = 30 * 86400000;
const fdataStale = SINCE && (Date.now() - SINCE) > DAYS30; /* /futures/data series only serve ~30 days */
const st = SINCE ? `&startTime=${SINCE}` : '';
const q = `symbol=${F.SYMBOL}&period=5m&limit=500${st}`;
const DERIV = [
  ['fundingRate', `${F.base}/fundingRate?symbol=${F.SYMBOL}&limit=500${st}`],
  ...(fdataStale ? [] : [
    ['globalLS', `${F.fdata}/globalLongShortAccountRatio?${q}`],
    ['topAccLS', `${F.fdata}/topLongShortAccountRatio?${q}`],
    ['topPosLS', `${F.fdata}/topLongShortPositionRatio?${q}`],
    ['takerRatio', `${F.fdata}/takerlongshortRatio?${q}`],
    ['oiHist', `${F.fdata}/openInterestHist?${q}`]
  ])
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const t0 = Date.now();
  const job = (name, url) => F.fetchJson(url, 2).then(d => [name, d]).catch(e => { console.error('  fetch fail', name, String(e.message || e).slice(0, 60)); return [name, null]; });

  const deriv = {};
  const kTFs = {};
  const LIM = tf => (tf === '1d' ? 400 : tf === '1h' || tf === '4h' ? 1000 : N);
  /* 1d needs 40+ bars at the FIRST replay bar → fetch daily history starting 50 days before the window */
  const dStart = SINCE ? SINCE - 50 * 86400000 : null;
  const jobs = [[F.SYMBOL, '15m'], [F.SYMBOL, '1m'], [F.SYMBOL, '3m'], [F.SYMBOL, '5m'], [F.SYMBOL, '1h'], [F.SYMBOL, '4h'], [F.SYMBOL, '1d'], ['BTCUSDT', '15m']]
    .map(([s, tf]) => F.fetchKlines(s, tf, LIM(tf), tf === '1d' ? dStart : SINCE).then(d => { kTFs[s + '_' + tf] = d; }).catch(e => console.error('  fetch fail', s, tf, String(e.message || e).slice(0, 60))));
  const derivJobs = DERIV.map(([n, u]) => job(n, u).then(([n2, d]) => { deriv[n2] = d; }));

  await Promise.all([...jobs, ...derivJobs]);

  const k15 = kTFs[F.SYMBOL + '_15m'];
  if (!k15 || k15.length < 300) { console.error('insufficient 15m history:', k15 && k15.length); process.exit(1); }
  /* short TFs (1m/3m/5m) carry only ~25h/75h/125h per request — paginate chunks over the
     whole replay window so every replay bar sees real context ending at that bar (no stale/missing tf) */
  const MS = { '1m': 60000, '3m': 180000, '5m': 300000 };
  const kStart = Number(k15[0][0]), kEnd = Number(k15[k15.length - 1][0]);
  for (const tf of ['1m', '3m', '5m']) {
    const ch = 1500 * MS[tf];
    const chunked = [];
    for (let st = kStart - 200 * MS[tf]; st < kEnd + MS[tf]; st += ch) {
      const d = await F.fetchKlines(F.SYMBOL, tf, 1500, st).catch(() => null);
      if (d && d.length) chunked.push(...d);
    }
    const seen = new Set();
    kTFs[F.SYMBOL + '_' + tf] = chunked.filter(x => { if (seen.has(x[0])) return false; seen.add(x[0]); return true; }).sort((a, b) => a[0] - b[0]);
  }
  console.log(`data: 15m×${k15.length} | BTC×${(kTFs.BTCUSDT_15m || []).length} | deriv series: ${DERIV.map(d => d[0]).join(', ')}`);

  /* derivative lookup: last value at-or-before time t */
  const mkLookup = arr => {
    if (!arr) return () => null;
    const t = arr.map(x => Number(x.timestamp || x.calcTime || x.fundingTime || x[0] || 0));
    return tgt => {
      let lo = 0, hi = t.length - 1, best = -1;
      while (lo <= hi) { const m = (lo + hi) >> 1; if (t[m] <= tgt) { best = m; lo = m + 1; } else hi = m - 1; }
      return best >= 0 ? arr[best] : null;
    };
  };
  const at = {
    funding: mkLookup(deriv.fundingRate),
    gls: mkLookup(deriv.globalLS),
    acc: mkLookup(deriv.topAccLS),
    pos: mkLookup(deriv.topPosLS),
    taker: mkLookup(deriv.takerRatio),
    oi: mkLookup(deriv.oiHist)
  };

  const agg = new Aggregator({ engagedFloor: RELAX_ENGAGED, mirrorSlAtSwing: MIRROR, bearBarOnly: BEARBAR, structMinAge: AGE });
  const signals = [];
  let lastSigTs = -1;
  const stats = { bars: 0, gatesPass: 0, geomOk: 0, engagedSum: 0, faults: 0, tallySum: { LONG: 0, SHORT: 0, NEUTRAL: 0 }, cats: {} };

  for (let i = WARM; i < k15.length - 1; i++) {
    const t = Number(k15[i][0]);
    const close = Number(k15[i][4]);
    const slice = (arr, tfMs) => {
      /* last 200 candles of this timeframe ending at-or-before t */
      const cut = arr.filter(x => Number(x[0]) <= t).slice(-200);
      return cut.length ? cut : null;
    };
    const fund = at.funding(t);
    const oiR = at.oi(t);
    const gls = at.gls(t), acc = at.acc(t), pos = at.pos(t), taker = at.taker(t);

    const poolR = {
      ticker24: { data: { lastPrice: String(close) }, fetchedAt: t },
      bookTicker: { data: { bidPrice: String(close - 0.01), askPrice: String(close + 0.01) }, fetchedAt: t },
      premiumIndex: { data: { markPrice: String(close), indexPrice: String(close), lastFundingRate: fund ? Number(fund.fundingRate) : 0 }, fetchedAt: t },
      openInterest: { data: { openInterest: String(oiR ? Number(oiR.sumOpenInterest) : 0) }, fetchedAt: t },
      'k_BTCUSDT_15m': { data: slice(kTFs.BTCUSDT_15m, 900000), fetchedAt: t }
    };
    for (const tf of F.TFS) {
      const c = slice(kTFs[F.SYMBOL + '_' + tf], tf === '1m' ? 60000 : tf === '3m' ? 180000 : tf === '5m' ? 300000 : tf === '15m' ? 900000 : tf === '1h' ? 3600000 : tf === '4h' ? 14400000 : 86400000);
      if (c) poolR['k_' + tf] = { data: c, fetchedAt: t };
    }
    const derivR = {
      oiHist: { data: (deriv.oiHist || []).filter(x => Number(x.timestamp || 0) <= t).slice(-30), fetchedAt: t },
      globalLS: { data: gls ? [{ longShortRatio: Number(gls.longShortRatio) }] : [], fetchedAt: t },
      topAccLS: { data: acc ? [{ longShortRatio: Number(acc.longShortRatio) }] : [], fetchedAt: t },
      topPosLS: { data: pos ? [{ longShortRatio: Number(pos.longShortRatio) }] : [], fetchedAt: t },
      takerRatio: { data: taker ? [{ buySellRatio: Number(taker.buySellRatio) }] : [], fetchedAt: t }
    };
    const now = Date.now(); /* fake freshness: g1 is a live-operations gate, not a strategy gate */
    const data = {
      pool: { results: poolR, errors: {}, finishedAt: now },
      deriv: { results: derivR, errors: {}, finishedAt: now },
      heavy: { results: {}, errors: {}, finishedAt: now },
      meta: { backtest: true }
    };

    stats.bars++;
    const out = agg.tick(data);
    const S = out.S;
    stats.faults += (out.faults || []).length;
    stats.tallySum.LONG += out.tally.LONG;
    stats.tallySum.SHORT += out.tally.SHORT;
    stats.tallySum.NEUTRAL += out.tally.NEUTRAL;
    stats.engagedSum += out.tally.LONG + out.tally.SHORT;
    if (out.gates.all) stats.gatesPass++;
    if (CATS_DIAG && out.perCat) {
      for (const p of out.perCat) {
        const d = stats.cats[p.cat] = stats.cats[p.cat] || { L: 0, S: 0, n: 0 };
        d.L += p.long; d.S += p.short; d.n += p.fired;
      }
    }

    if (out.signal && out.signal.ts !== lastSigTs) {
      lastSigTs = out.signal.ts;
      const sig = out.signal;
      stats.geomOk++;
      /* simulate: enter next bar open, exit on first intrabar touch of SL/TP, max validity bars */
      const validBars = Math.max(2, Math.round((sig.validity || 12) * 4)); /* 15m bars */
      let outcome = 99, exitIdx = -1;
      for (let j = i + 1; j <= Math.min(i + validBars, k15.length - 1); j++) {
        const h = Number(k15[j][2]), l = Number(k15[j][3]);
        if (sig.direction === 'LONG') {
          if (l <= sig.sl) { outcome = -1; exitIdx = j; break; }
          if (h >= sig.tp) { outcome = 1; exitIdx = j; break; }
        } else {
          if (h >= sig.sl) { outcome = -1; exitIdx = j; break; }
          if (l <= sig.tp) { outcome = 1; exitIdx = j; break; }
        }
        if (j === k15.length - 1) { outcome = 0; exitIdx = j; break; } /* ran out of data */
      }
      signals.push({
        at: new Date(t).toISOString(), dir: sig.direction, conf: sig.conf, entry: sig.idealEntry,
        sl: sig.sl, tp: sig.tp, rr: sig.rr, quality: sig.quality, regime: S.regime,
        engaged: out.tally.LONG + out.tally.SHORT, max: Math.max(out.tally.LONG, out.tally.SHORT),
        outcome, bars: exitIdx >= 0 ? exitIdx - i : null
      });
    }
  }

  report(signals, stats, k15.length);
  if (CATS_DIAG && stats.bars) {
    console.log(`\ncategory engagement (bars=${stats.bars}):`);
    const rows = Object.entries(stats.cats)
      .map(([cat, c]) => ({ cat, ...c, bias: c.L / (c.L + c.S) }))
      .sort((a, b) => Math.abs(b.bias - 0.5) - Math.abs(a.bias - 0.5));
    for (const r of rows.slice(0, 12)) {
      const side = r.bias > 0.65 ? 'LONG-LEAN' : r.bias < 0.35 ? 'SHORT-LEAN' : 'mixed';
      console.log(`  cat${String(r.cat).padStart(2)}: LONG ${r.L} / SHORT ${r.S} (n=${r.n}) ${r.bias.toFixed(2)} ${side}`);
    }
  }
  console.log(`\nelapsed ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

function report(signals, stats, nBars) {
  const w = signals.filter(s => s.outcome === 1).length;
  const l = signals.filter(s => s.outcome === -1).length;
  const x = signals.filter(s => s.outcome === 99).length;
  const noData = signals.filter(s => s.outcome === 0).length;
  const decided = signals.filter(s => s.outcome === 1 || s.outcome === -1);
  const wr = decided.length ? w / decided.length : 0;
  const avgRR = decided.length ? decided.reduce((s, x) => s + x.rr, 0) / decided.length : 0;
  const ev = wr * avgRR - (1 - wr); /* per 1R risk */
  const t = stats.tallySum;

  console.log(`\n========== OMNISCIENT v22.1 BACKTEST ==========`);
  console.log(`replay bars: ${stats.bars}/${nBars}  | gates passed: ${stats.gatesPass} (${(stats.gatesPass / stats.bars * 100).toFixed(1)}%) | signals fired: ${signals.length}`);
  if (stats.faults) console.log(`agent faults: ${stats.faults}`);
  console.log(`avg tally: LONG ${(t.LONG / stats.bars).toFixed(0)} / SHORT ${(t.SHORT / stats.bars).toFixed(0)} / NEU ${(t.NEUTRAL / stats.bars).toFixed(0)} | avg engaged ${(stats.engagedSum / stats.bars).toFixed(0)}`);
  console.log(`\noutcomes: WIN ${w} / LOSS ${l} / EXPIRED ${x} / NO-DATA ${noData}`);
  console.log(`decided win rate: ${(wr * 100).toFixed(1)}%  (${decided.length} trades)`);
  console.log(`avg RR: ${avgRR.toFixed(2)}  |  EV per 1R: ${ev >= 0 ? '+' : ''}${ev.toFixed(3)}  (profit if > 0)`);
  if (signals.length) {
    const byDir = d => {
      const dd = signals.filter(s => s.dir === d && (s.outcome === 1 || s.outcome === -1));
      const ww = dd.filter(s => s.outcome === 1).length;
      return dd.length ? `${ww}/${dd.length} (${(ww / dd.length * 100).toFixed(0)}%)` : '—';
    };
    console.log(`by direction: LONG ${byDir('LONG')}  SHORT ${byDir('SHORT')}`);
    const buckets = [[800, 'QB>=8'], [700, 'QB7-8'], [600, 'QB6-7'], [0, 'QB<6']];
    for (const [lo, name] of buckets) {
      const dd = signals.filter(s => s.quality >= lo && (s.outcome === 1 || s.outcome === -1) && !(buckets.some(b => b[0] > lo && s.quality >= b[0])));
      const ww = dd.filter(s => s.outcome === 1).length;
      if (dd.length) console.log(`${name}: ${ww}/${dd.length} (${(ww / dd.length * 100).toFixed(0)}%)`);
    }
    const regs = ['LOW', 'MED', 'HIGH'];
    for (const r of regs) {
      const dd = signals.filter(s => s.regime === r && (s.outcome === 1 || s.outcome === -1));
      const ww = dd.filter(s => s.outcome === 1).length;
      if (dd.length) console.log(`regime ${r}: ${ww}/${dd.length} (${(ww / dd.length * 100).toFixed(0)}%)`);
    }
    console.log(`\nlast 12 signals:`);
    for (const s of signals.slice(-12)) {
      console.log(`  ${s.at.slice(5, 16)} ${s.dir.padEnd(5)} ${s.entry.toFixed(2)} sl ${s.sl.toFixed(2)} tp ${s.tp.toFixed(2)} RR ${s.rr.toFixed(2)} QB${s.quality} ${s.regime} ${s.engaged}/${s.max} → ${s.outcome === 1 ? 'WIN' : s.outcome === -1 ? 'LOSS' : s.outcome === 99 ? 'EXP' : 'NODATA'}`);
    }
  }
}

main().catch(e => { console.error('BACKTEST FAIL:', e); process.exit(1); });