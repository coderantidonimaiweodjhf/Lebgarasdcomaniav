'use strict';
/* OMNISCIENT SCALPER v22.0 — Indicator Engine.
   Every value is computed from raw Binance kline/trade data. No caching beyond the 60s freshness gate. */

function sma(arr, n) {
  if (arr.length < n) return null;
  let s = 0;
  for (let i = arr.length - n; i < arr.length; i++) s += arr[i];
  return s / n;
}

function ema(arr, n) {
  if (arr.length < n) return null;
  const k = 2 / (n + 1);
  let e = arr[0];
  for (let i = 1; i < arr.length; i++) e = arr[i] * k + e * (1 - k);
  return e;
}

function emaSeries(arr, n) {
  const k = 2 / (n + 1);
  let e = arr.length ? arr[0] : 0;
  const out = [e];
  for (let i = 1; i < arr.length; i++) {
    e = arr[i] * k + e * (1 - k);
    out.push(e);
  }
  return out;
}

function closes(candles) { return candles.map(c => Number(c[4])); }
function highs(candles) { return candles.map(c => Number(c[2])); }
function lows(candles) { return candles.map(c => Number(c[3])); }
function vols(candles) { return candles.map(c => Number(c[5])); }

function rsi(candles, n = 14) {
  const c = closes(candles);
  if (c.length < n + 1) return null;
  let g = 0, l = 0;
  for (let i = 1; i <= n; i++) {
    const d = c[c.length - i] - c[c.length - i - 1];
    if (d >= 0) g += d; else l -= d;
  }
  g /= n; l /= n;
  if (l === 0) return 100;
  const rs = g / l;
  return 100 - 100 / (1 + rs);
}

function rsiSeries(candles, n = 14) {
  const c = closes(candles);
  if (c.length < n + 1) return [];
  const out = [];
  let g = 0, l = 0;
  for (let i = 1; i <= n; i++) {
    const d = c[i] - c[i - 1];
    if (d >= 0) g += d; else l -= d;
  }
  const push = () => {
    if (l === 0) out.push(100);
    else out.push(100 - 100 / (1 + (g / n) / (l / n)));
  };
  push();
  for (let i = n + 1; i < c.length; i++) {
    const d = c[i] - c[i - 1];
    const pg = d >= 0 ? d : 0, pl = d < 0 ? -d : 0;
    g = (g * (n - 1) + pg) / n;
    l = (l * (n - 1) + pl) / n;
    push();
  }
  return out;
}

function trueRanges(candles) {
  const tr = [];
  for (let i = 1; i < candles.length; i++) {
    const h = Number(candles[i][2]), l = Number(candles[i][3]), pc = Number(candles[i - 1][4]);
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  return tr;
}

function atr(candles, n = 14) {
  const tr = trueRanges(candles);
  if (tr.length < n) return null;
  let a = sma(tr, n);
  for (let i = n; i < tr.length; i++) a = (a * (n - 1) + tr[i]) / n;
  return a;
}

function macd(candles, fast = 12, slow = 26, signal = 9) {
  const c = closes(candles);
  if (c.length < slow + signal) return null;
  const ef = emaSeries(c, fast), es = emaSeries(c, slow);
  const macdLine = ef.map((v, i) => v - es[i]);
  const k = 2 / (signal + 1);
  let s = macdLine[0];
  const sig = [s];
  for (let i = 1; i < macdLine.length; i++) {
    s = macdLine[i] * k + s * (1 - k);
    sig.push(s);
  }
  const m = macdLine[macdLine.length - 1];
  const sg = sig[sig.length - 1];
  const hist = m - sg;
  const prevM = macdLine[macdLine.length - 2];
  const prevHist = prevM - sig[sig.length - 2];
  return { macd: m, signal: sg, histogram: hist, prevHistogram: prevHist, rising: hist > prevHist };
}

function stoch(candles, k = 14, d = 3) {
  const h = highs(candles), l = lows(candles), c = closes(candles);
  if (c.length < k + d) return null;
  const kk = [];
  for (let i = k - 1; i < c.length; i++) {
    const hh = Math.max(...h.slice(i - k + 1, i + 1));
    const ll = Math.min(...l.slice(i - k + 1, i + 1));
    kk.push(ll === hh ? 50 : ((c[i] - ll) / (hh - ll)) * 100);
  }
  const dv = [];
  for (let i = d - 1; i < kk.length; i++) {
    let s = 0;
    for (let j = i - d + 1; j <= i; j++) s += kk[j];
    dv.push(s / d);
  }
  return { k: kk[kk.length - 1], d: dv[dv.length - 1] };
}

function cci(candles, n = 20) {
  const h = highs(candles), l = lows(candles), c = closes(candles);
  if (c.length < n) return null;
  const tp = [];
  for (let i = 0; i < c.length; i++) tp.push((h[i] + l[i] + c[i]) / 3);
  const t = tp.slice(-n);
  const mean = t.reduce((a, b) => a + b, 0) / n;
  let md = 0;
  for (const v of t) md += Math.abs(v - mean);
  md /= n;
  if (md === 0) return 0;
  return (tp[tp.length - 1] - mean) / (0.015 * md);
}

function williamsR(candles, n = 14) {
  const h = highs(candles), l = lows(candles), c = closes(candles);
  if (c.length < n) return null;
  const hh = Math.max(...h.slice(-n));
  const ll = Math.min(...l.slice(-n));
  return ll === hh ? -50 : ((hh - c[c.length - 1]) / (hh - ll)) * -100;
}

function bollinger(candles, n = 20, m = 2) {
  const c = closes(candles);
  if (c.length < n) return null;
  const win = c.slice(-n);
  const mid = win.reduce((a, b) => a + b, 0) / n;
  let v = 0;
  for (const x of win) v += (x - mid) ** 2;
  const sd = Math.sqrt(v / n);
  return { mid, upper: mid + m * sd, lower: mid - m * sd, bw: ((mid + m * sd) - (mid - m * sd)) / mid };
}

function keltner(candles, n = 20, m = 2) {
  const c = closes(candles);
  const tr = trueRanges(candles);
  if (c.length < n) return null;
  const mid = sma(c, n);
  const atrN = sma(tr, n);
  return { mid, upper: mid + m * atrN, lower: mid - m * atrN };
}

function adx(candles, n = 14) {
  if (candles.length < n * 2) return null;
  let plusDM = 0, minusDM = 0, trSum = 0;
  for (let i = 1; i <= n; i++) {
    const h = Number(candles[i][2]), l = Number(candles[i][3]);
    const ph = Number(candles[i - 1][2]), pl = Number(candles[i - 1][3]), pc = Number(candles[i - 1][4]);
    const up = h - ph, dn = pl - l;
    plusDM += up > dn && up > 0 ? up : 0;
    minusDM += dn > up && dn > 0 ? dn : 0;
    trSum += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  }
  let pdi = (plusDM / trSum) * 100, mdi = (minusDM / trSum) * 100;
  let dx = pdi + mdi === 0 ? 0 : (Math.abs(pdi - mdi) / (pdi + mdi)) * 100;
  let adxV = dx;
  for (let i = n + 1; i < candles.length; i++) {
    const h = Number(candles[i][2]), l = Number(candles[i][3]);
    const ph = Number(candles[i - 1][2]), pl = Number(candles[i - 1][3]), pc = Number(candles[i - 1][4]);
    const up = h - ph, dn = pl - l;
    const pdm = up > dn && up > 0 ? up : 0;
    const mdm = dn > up && dn > 0 ? dn : 0;
    plusDM = (plusDM * (n - 1) + pdm) / n;
    minusDM = (minusDM * (n - 1) + mdm) / n;
    const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    trSum = (trSum * (n - 1) + tr) / n;
    pdi = (plusDM / trSum) * 100; mdi = (minusDM / trSum) * 100;
    dx = pdi + mdi === 0 ? 0 : (Math.abs(pdi - mdi) / (pdi + mdi)) * 100;
    adxV = (adxV * (n - 1) + dx) / n;
  }
  return { adx: adxV, plusDI: pdi, minusDI: mdi };
}

function hullMA(candles, n) {
  const c = closes(candles);
  const h = Math.floor(n / 2), r = Math.floor(Math.sqrt(n));
  if (c.length < n + r) return null;
  const wma = (arr, len) => {
    const seg = arr.slice(-len);
    let s = 0, w = 0;
    for (let i = 0; i < seg.length; i++) { s += seg[i] * (i + 1); w += i + 1; }
    return s / w;
  };
  return wma(c.map((_, i) => 2 * wma(c.slice(0, i + 1), h) - wma(c.slice(0, i + 1), n)), r);
}

function vwap(candles) {
  let pv = 0, v = 0;
  for (const c of candles) {
    const tp = (Number(c[2]) + Number(c[3]) + Number(c[4])) / 3;
    const vol = Number(c[5]);
    pv += tp * vol; v += vol;
  }
  return v === 0 ? null : pv / v;
}

function rvol(candles, n = 20) {
  const v = vols(candles);
  const avg = sma(v, n);
  if (!avg) return null;
  return v[v.length - 1] / avg;
}

function swingLevels(candles, n = 3) {
  const highs = candles.map(c => Number(c[2]));
  const lows = candles.map(c => Number(c[3]));
  const swings = [];
  for (let i = n; i < highs.length - n; i++) {
    let isHigh = true, isLow = true;
    for (let j = i - n; j <= i + n; j++) {
      if (j === i) continue;
      if (highs[j] >= highs[i]) isHigh = false;
      if (lows[j] <= lows[i]) isLow = false;
    }
    if (isHigh) swings.push({ type: 'high', price: highs[i], at: i });
    if (isLow) swings.push({ type: 'low', price: lows[i], at: i });
  }
  return swings;
}

function supportResistance(candles, n = 3) {
  const swings = swingLevels(candles, n);
  const zones = new Map();
  for (const s of swings) {
    const key = Math.round(s.price * 10) / 10;
    const z = zones.get(key) || { price: key, hits: 0, type: s.type };
    z.hits++;
    zones.set(key, z);
  }
  const levels = [...zones.values()].filter(z => z.hits >= 2).sort((a, b) => b.hits - a.hits);
  return levels.slice(0, 8);
}

function pivotPoints(prev) {
  const h = Number(prev[2]), l = Number(prev[3]), c = Number(prev[4]);
  const p = (h + l + c) / 3;
  return {
    p,
    r1: 2 * p - l, r2: p + (h - l), r3: h + 2 * (p - l),
    s1: 2 * p - h, s2: p - (h - l), s3: l - 2 * (h - p)
  };
}

function detectOrderBlocks(candles, dir) {
  const blocks = [];
  for (let i = 2; i < candles.length - 1; i++) {
    const c0 = candles[i - 1], c1 = candles[i], c2 = candles[i + 1];
    const c0c = Number(c0[4]), c0o = Number(c0[1]);
    const c1h = Number(c1[2]), c1l = Number(c1[3]), c1c = Number(c1[4]);
    const c2h = Number(c2[2]), c2l = Number(c2[3]);
    if (dir === 'bull') {
      if (c0o > c0c && c1c > c0c && c2h > c1h) blocks.push({ type: 'bull', top: c0o, bot: c0c, at: i });
    } else {
      if (c0o < c0c && c1c < c0c && c2l < c1l) blocks.push({ type: 'bear', top: c0o, bot: c0c, at: i });
    }
  }
  return blocks.slice(-30);
}

function detectFVGs(candles) {
  const gaps = [];
  for (let i = 1; i < candles.length - 1; i++) {
    const prevH = Number(candles[i - 1][2]), prevL = Number(candles[i - 1][3]);
    const nextH = Number(candles[i + 1][2]), nextL = Number(candles[i + 1][3]);
    const curH = Number(candles[i][2]), curL = Number(candles[i][3]);
    if (nextL > prevH) gaps.push({ type: 'bull', top: nextL, bot: prevH, mid: (nextL + prevH) / 2, at: i, mh: Math.max(curH, nextH), ml: Math.min(curL, prevL) });
    if (nextH < prevL) gaps.push({ type: 'bear', top: prevL, bot: nextH, mid: (prevL + nextH) / 2, at: i, mh: Math.max(curH, prevL), ml: Math.min(curL, nextH) });
  }
  return gaps.slice(-30);
}

function volumeProfile(candles, bins = 24) {
  const min = Math.min(...lows(candles)), max = Math.max(...highs(candles));
  const step = (max - min) / bins || 1;
  const prof = new Array(bins).fill(0);
  for (const c of candles) {
    const h = Number(c[2]), l = Number(c[3]), v = Number(c[5]);
    const lo = Math.max(0, Math.floor((l - min) / step));
    const hi = Math.min(bins - 1, Math.floor((h - min) / step));
    if (hi - lo > bins * 0.6) continue;
    for (let b = lo; b <= hi; b++) prof[b] += v / (hi - lo + 1);
  }
  let poc = 0, maxV = 0;
  prof.forEach((v, i) => { if (v > maxV) { maxV = v; poc = i; } });
  const val = prof.filter(v => v > 0).reduce((a, b) => a + b, 0);
  let cum = 0, vl = maxV, vh = maxV;
  const target = val * 0.7;
  if (target > 0) {
    while (cum < target) {
      const below = vl > 0 ? prof[vl - 1] : 0;
      const above = vh < bins - 1 ? prof[vh + 1] : 0;
      if (below >= above && vl > 0) { cum += below; vl--; }
      else if (vh < bins - 1) { cum += above; vh++; }
      else break;
    }
  }
  return {
    poc: min + step * poc + step / 2,
    valueLow: min + step * vl,
    valueHigh: min + step * (vh + 1),
    bins, step, min, max
  };
}

function cvdFromAggTrades(trades) {
  let cvd = 0;
  for (const t of trades) {
    const qty = Number(t.q);
    const price = Number(t.p);
    cvd += t.m ? -qty : qty;
  }
  return cvd;
}

function renko(candles, brickSize) {
  const bricks = [];
  let last = null, lastDir = 0;
  for (const c of candles) {
    const close = Number(c[4]);
    if (last === null) {
      last = close; continue;
    }
    if (lastDir >= 0 && close >= last + brickSize) {
      bricks.push({ open: last, close, dir: 1 });
      lastDir = 1;
      while (close >= last + brickSize) last += brickSize;
    } else if (lastDir <= 0 && close <= last - brickSize) {
      bricks.push({ open: last, close, dir: -1 });
      lastDir = -1;
      while (close <= last - brickSize) last -= brickSize;
    }
  }
  return bricks;
}

function dominantBias(candles, period = 100) {
  const c = closes(candles).slice(-period);
  const ema8 = ema(c, 8), ema21 = ema(c, 21), ema50 = ema(c, 50);
  const m = macd(candles.slice(-(period + 60)));
  const st = stoch(candles.slice(-(period + 30)));
  let score = 0;
  if (ema8 > ema21) score++; else score--;
  if (ema21 > ema50) score++; else score--;
  if (c[c.length - 1] > ema8 && c[c.length - 1] > ema50) score++ ; else score--;
  if (m && (m.macd > m.signal)) score++; else if (m) score--;
  if (st && st.k > st.d) score++; else if (st) score--;
  if (score >= 3) return 'LONG';
  if (score <= -3) return 'SHORT';
  return 'RANGE';
}

module.exports = {
  sma, ema, emaSeries, closes, highs, lows, vols, rsi, rsiSeries, atr, macd,
  stoch, cci, williamsR, bollinger, keltner, adx, hullMA, vwap, rvol,
  swingLevels, supportResistance, pivotPoints, detectOrderBlocks, detectFVGs,
  volumeProfile, cvdFromAggTrades, renko, dominantBias
};