'use strict';
/* OMNISCIENT SCALPER v22.0 — Agent Categories 61–70: Derivatives, ML & Behavioral Masters (100 agents) */

const { AgentEval, finish, lastCandle, clamp } = require('./rulebook');

const T = S => S.tf['15m'];

/* UTC hour float + weekday from latest 1m candle open time */
function utcHour(S) {
  const c1 = S.tf && S.tf['1m'] && S.tf['1m'].candles;
  const t = c1 && c1.length ? Number(c1[c1.length - 1][0]) : Date.now();
  const d = new Date(t);
  return { h: d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600, dow: d.getUTCDay() };
}

/* lightweight renko reconstruction from closes, brick = 0.5 ATR */
function renko(S) {
  const c = S.tf['15m'].candles;
  if (c.length < 30) return { trend: 'FLAT', bricks: 0, last: 'FLAT' };
  const atr = S.atr15 || 1;
  const brick = Math.max(atr * 0.5, 0.01);
  const closes = c.slice(-60).map(x => Number(x[4]));
  const bricks = [];
  let cur = closes[0], dir = 0;
  for (let i = 1; i < closes.length; i++) {
    const p = closes[i];
    if (dir === 0) {
      if (p >= cur + brick) { dir = 1; cur = p; }
      else if (p <= cur - brick) { dir = -1; cur = p; }
    } else if (dir === 1) {
      if (p >= cur + brick) { dir = 1; cur = p; }
      else if (p <= cur - 2 * brick) { dir = -1; cur = p; }
    } else {
      if (p <= cur - brick) { dir = -1; cur = p; }
      else if (p >= cur + 2 * brick) { dir = 1; cur = p; }
    }
    bricks.push(dir);
  }
  const up = bricks.filter(b => b === 1).length;
  const dn = bricks.filter(b => b === -1).length;
  const last = bricks.length ? bricks[bricks.length - 1] : 0;
  const trend = up > dn * 1.25 ? 'BULL' : dn > up * 1.25 ? 'BEAR' : 'FLAT';
  return { trend, bricks: bricks.length, last: last === 1 ? 'BULL' : last === -1 ? 'BEAR' : 'FLAT', up, dn };
}

function cat61(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const fh = S.fundingHist || [], oh = S.oiHist || [];

  let a = new AgentEval('61.1', 61, 'Basis Curve Read');
  a.hit(S.basis !== null && S.basis > 0 && S.basis < atr * 0.3, 1.5, 'Basis premium normal');
  a.hit(S.basis !== null && S.basis < 0 && S.basis > -atr * 0.3, 1.5, 'Basis discount normal');
  a.hit(S.basis !== null && S.basis > atr * 0.8, -2, 'Basis premium extreme');
  a.hit(S.basis !== null && S.basis < -atr * 0.8, -2, 'Basis discount extreme');
  a.hit(S.basisPct !== null && Math.abs(S.basisPct) < 0.01, 1, 'Basis% anchored');
  a.hit(S.basis !== null && S.basis > 0 && S.bias15 === 'LONG' && c.bull, 0.5, 'Premium + longs paying');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('61.2', 61, 'Taker Ratio Micro');
  a.hit(S.takerRatio !== null && S.takerRatio > 0.58 && c.bull, 2, 'Aggressive buying confirmed');
  a.hit(S.takerRatio !== null && S.takerRatio < 0.42 && c.bear, 2, 'Aggressive selling confirmed');
  a.hit(S.takerRatio !== null && S.takerRatio > 0.58 && c.bear, -1.5, 'Buyers hitting falling price');
  a.hit(S.takerRatio !== null && S.takerRatio < 0.42 && c.bull, -1.5, 'Sellers hitting rising price');
  a.hit(S.takerRatio !== null && Math.abs(S.takerRatio - 0.5) < 0.01, 0.5, 'Tape balanced');
  a.hit(S.takerRatio !== null && S.takerRatio > 0.7, -1.5, 'Taker frenzy = fade fuel');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('61.3', 61, 'OI Trend Analytics');
  const oiUp = oh.length >= 3 ? oh[oh.length - 1] > oh[oh.length - 3] : false;
  const oiDn = oh.length >= 3 ? oh[oh.length - 1] < oh[oh.length - 3] : false;
  a.hit(oiUp && c.bull, 1.5, 'OI expanding with price up');
  a.hit(oiUp && c.bear, -1.5, 'OI expanding with price down');
  a.hit(oiDn && c.bear, 1.5, 'OI contracting with price down');
  a.hit(oiDn && c.bull, 1, 'OI contracting with price up = cover');
  a.hit(S.oiDelta !== null && S.oiDelta > 0.04 && S.funding > 0.0003, -1.5, 'Long stacking + paid funding');
  a.hit(S.oiDelta !== null && Math.abs(S.oiDelta) < 0.005 && c.range < atr * 0.6, -1, 'OI flat in quiet tape');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('61.4', 61, 'ADL Deep Read');
  a.hit(S.adl !== null && S.adl > 55 && c.bull, 1.5, 'ADL bullish + price up');
  a.hit(S.adl !== null && S.adl < 45 && c.bear, 1.5, 'ADL bearish + price down');
  a.hit(S.adl !== null && S.adl > 55 && c.bear, -2, 'ADL bullish vs price down');
  a.hit(S.adl !== null && S.adl < 45 && c.bull, -2, 'ADL bearish vs price up');
  a.hit(S.adl !== null && Math.abs(S.adl - 50) < 3 && S.regime === 'LOW', 0.5, 'ADL neutral chop');
  a.hit(S.adl !== null && (S.adl > 75 || S.adl < 25), -1.5, 'ADL extreme = unwind risk');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('61.5', 61, 'Whale Top Account Analytics');
  a.hit(S.lsTopAcc !== null && S.lsTopAcc > 1.3 && c.bear, 1.5, 'Top accounts long vs drop');
  a.hit(S.lsTopAcc !== null && S.lsTopAcc < 0.77 && c.bull, 1.5, 'Top accounts short vs rally');
  a.hit(S.lsTopAcc !== null && S.lsTopAcc > 1.5 && S.lsTopAcc < 2.5 && c.bull, -1, 'Top accounts long + up');
  a.hit(S.lsTopAcc !== null && S.lsTopAcc > 3, -2, 'Top accounts extremely long');
  a.hit(S.lsTopAcc !== null && S.lsTopAcc < 0.33, -2, 'Top accounts extremely short');
  a.hit(S.lsTopPos !== null && Math.abs(Math.log(S.lsTopPos / (S.lsGlobal || 1))) > 0.5, -1, 'Position skew vs retail skew');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('61.6', 61, 'Funding History Analytics');
  const fMax = fh.length ? Math.max(...fh) : 0, fMin = fh.length ? Math.min(...fh) : 0;
  a.hit(fMax > 0.0008 && S.funding !== null && S.funding < fMax * 0.4, 1.5, 'Funding unwinding from extreme');
  a.hit(fMin < -0.0008 && S.funding !== null && S.funding > fMin * 0.4, 1.5, 'Funding unwinding from extreme');
  a.hit(fMax > 0.0008 && S.funding !== null && S.funding > fMax * 0.9, -2, 'Funding pinned extreme');
  a.hit(fh.length >= 6 && fh[fh.length - 1] > fh[0] && S.bias15 === 'SHORT', 1.5, 'Funding rising, price falling');
  a.hit(fh.length >= 6 && fh[fh.length - 1] < fh[0] && S.bias15 === 'LONG', 1.5, 'Funding falling, price rising');
  a.hit(fh.length >= 12 && Math.abs(fh[fh.length - 1]) < Math.abs(fh[0]) * 0.5 && Math.abs(S.funding || 0) < 0.0001, 1, 'Funding normalized to zero');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('61.7', 61, 'Open Interest Position Regime');
  a.hit(S.oi && S.oi > 0 && S.oiDelta !== null && S.oiDelta > 0.02 && S.bias15 === 'LONG' && c.bull, 1.5, 'Fresh longs riding up');
  a.hit(S.oi && S.oi > 0 && S.oiDelta !== null && S.oiDelta > 0.02 && S.bias15 === 'SHORT' && c.bear, 1.5, 'Fresh shorts riding down');
  a.hit(S.oi && S.oi > 0 && S.oiDelta !== null && S.oiDelta < -0.02 && c.bull, 1, 'Cover-driven rally');
  a.hit(S.oi && S.oi > 0 && S.oiDelta !== null && S.oiDelta < -0.02 && c.bear, 1, 'Stop-run flush');
  a.hit(S.oi && S.oi > 0 && Math.abs(S.oiDelta) > 0.08, -1.5, 'OI spike instability');
  a.hit(S.oi && S.oi > 0 && S.oiDelta !== null && S.oiDelta > 0.02 && c.bear && S.funding > 0.0003, -2, 'Longs caught on knife');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('61.8', 61, 'Retail L/S Analytics');
  a.hit(S.lsGlobal !== null && S.lsGlobal > 0.65 && c.bear, 2, 'Retail longs meet drop');
  a.hit(S.lsGlobal !== null && S.lsGlobal < 0.35 && c.bull, 2, 'Retail shorts meet rally');
  a.hit(S.lsGlobal !== null && S.lsGlobal > 0.8, -2, 'Retail long crowd extreme');
  a.hit(S.lsGlobal !== null && S.lsGlobal < 0.2, -2, 'Retail short crowd extreme');
  a.hit(S.lsGlobal !== null && S.lsGlobal > 0.6 && S.funding > 0.0003 && c.bear, -1.5, 'Triple long crowd');
  a.hit(S.lsGlobal !== null && S.lsGlobal < 0.4 && S.funding < -0.0003 && c.bull, -1.5, 'Triple short crowd');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('61.9', 61, 'Correlation & Basis Stack');
  a.hit(S.corrBTC !== null && S.corrBTC > 0.7 && S.takerRatio !== null && S.takerRatio > 0.55, 1, 'BTC beta + buyer tape');
  a.hit(S.corrBTC !== null && S.corrBTC < -0.5 && S.basisPct !== null && Math.abs(S.basisPct) < 0.01, 1, 'XAU inverse beta, clean basis');
  a.hit(S.corrBTC !== null && Math.abs(S.corrBTC) < 0.3 && S.forceLiq && S.forceLiq.count < 10, 1.5, 'Independent clean move');
  a.hit(S.basisPct !== null && S.basisPct > 0.03 && S.adl !== null && S.adl > 65, -1.5, 'Premium + long ADL = crowded');
  a.hit(S.basisPct !== null && S.basisPct < -0.03 && S.adl !== null && S.adl < 35, -1.5, 'Discount + short ADL = crowded');
  a.hit(S.basisPct !== null && S.basisPct > 0.05, -2, 'Basis% extreme premium');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('61.10', 61, 'Derivatives Verdict');
  const derBull = (S.takerRatio > 0.52 && S.oiDelta > -0.01 && S.funding < 0.0004 && (S.lsGlobal > 0.5 ? false : true)) ? 1 : 0;
  const derBear = (S.takerRatio < 0.48 && S.oiDelta < 0.01 && S.funding > -0.0004 && (S.lsGlobal < 0.5 ? false : true)) ? 1 : 0;
  a.hit(derBull && c.bull, 3, 'Derivatives stack bull');
  a.hit(derBear && c.bear, 3, 'Derivatives stack bear');
  a.hit(derBull && c.bear, -1.5, 'Derivatives bull vs price');
  a.hit(derBear && c.bull, -1.5, 'Derivatives bear vs price');
  a.hit(S.adl !== null && S.adl > 60 && S.lsTopAcc !== null && S.lsTopAcc < 1 && S.lsGlobal !== null && S.lsGlobal < 0.5 && c.bull, 2, 'Smart money net long');
  a.hit(S.adl !== null && S.adl < 40 && S.lsTopAcc !== null && S.lsTopAcc > 1 && S.lsGlobal !== null && S.lsGlobal > 0.5 && c.bear, 2, 'Smart money net short');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat62(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const f = S.forceLiq || { count: 0, netBuy: 0 };
  const liqVol = Math.abs(f.netBuy) / (S.price || 1);

  let a = new AgentEval('62.1', 62, 'Liquidation Cascade Meter');
  a.hit(f.count > 0 && f.count <= 10, 1, 'Light liq flow');
  a.hit(f.count > 10 && f.count <= 40, 0.5, 'Moderate liq flow');
  a.hit(f.count > 40 && f.count <= 100, -2, 'Heavy liq flow');
  a.hit(f.count > 100, -3, 'Cascade storm');
  a.hit(f.count === 0, 1, 'No forced orders');
  a.hit(f.count > 40 && S.regime === 'HIGH', -2.5, 'Liq storm + high vol = halt');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('62.2', 62, 'Forced Order Direction');
  a.hit(f.netBuy > 0 && f.netBuy < S.price * 0.001, 1.5, 'Light short liquidations');
  a.hit(f.netBuy < 0 && f.netBuy > -S.price * 0.001, 1.5, 'Light long liquidations');
  a.hit(f.netBuy > S.price * 0.005, -2, 'Short liq wave = squeeze done');
  a.hit(f.netBuy < -S.price * 0.005, -2, 'Long liq wave = flush done');
  a.hit(f.netBuy > 0 && c.bull, 0.5, 'Forced buyers + up');
  a.hit(f.netBuy < 0 && c.bear, 0.5, 'Forced sellers + down');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('62.3', 62, 'Liq vs OI Health');
  a.hit(f.count > 30 && S.oiDelta !== null && S.oiDelta < -0.03, 1.5, 'Liq + OI drop = flush complete');
  a.hit(f.count > 30 && S.oiDelta !== null && S.oiDelta > 0.03, -2, 'Liq + OI growth = trap');
  a.hit(f.count > 30 && S.funding !== null && S.funding > 0.0005, -2, 'Long liq + extreme funding');
  a.hit(f.count > 30 && S.funding !== null && S.funding < -0.0005, -2, 'Short liq + extreme funding');
  a.hit(f.count > 30 && S.lsGlobal !== null && S.lsGlobal > 0.7 && f.netBuy < 0, 1.5, 'Retail longs flushed');
  a.hit(f.count > 30 && S.lsGlobal !== null && S.lsGlobal < 0.3 && f.netBuy > 0, 1.5, 'Retail shorts flushed');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('62.4', 62, 'Liq Price Magnet');
  a.hit(liqVol > 0 && liqVol < 0.002, 1.5, 'Forced volume mild');
  a.hit(liqVol >= 0.002 && liqVol < 0.01, 0.5, 'Forced volume moderate');
  a.hit(liqVol >= 0.01, -2.5, 'Forced volume extreme');
  a.hit(f.netBuy > 0 && S.bias15 === 'SHORT' && c.bear, 1.5, 'Short squeeze aftermath shorting');
  a.hit(f.netBuy < 0 && S.bias15 === 'LONG' && c.bull, 1.5, 'Long flush aftermath buying');
  a.hit(f.count > 60 && c.range > atr * 2, -2, 'Cascade range explosion');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('62.5', 62, 'Liq Cluster Response');
  a.hit(f.count > 20 && S.liq.sweptL && f.netBuy < 0, 2, 'Longs liquidated at swept low = spring');
  a.hit(f.count > 20 && S.liq.sweptH && f.netBuy > 0, 2, 'Shorts liquidated at swept high = trap');
  a.hit(f.count > 20 && S.liq.sweptL && f.netBuy > 0 && c.bull, 1.5, 'Reclaim after long liq');
  a.hit(f.count > 20 && S.liq.sweptH && f.netBuy < 0 && c.bear, 1.5, 'Reject after short liq');
  a.hit(f.count > 60 && S.liq.sweptL, -1.5, 'Cascade below swept low = continuation');
  a.hit(f.count > 60 && S.liq.sweptH, -1.5, 'Cascade above swept high = continuation');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('62.6', 62, 'Time Decay of Cascade');
  a.hit(f.count <= 5 && S.forceLiqAge !== undefined && S.forceLiqAge < 60, 1, 'Quiet after burst');
  a.hit(f.count > 30 && S.forceLiqAge !== undefined && S.forceLiqAge < 30, -2, 'Cascade still running');
  a.hit(f.count > 30 && S.forceLiqAge !== undefined && S.forceLiqAge > 120, 1, 'Cascade aged out');
  a.hit(f.count === 0 && S.forceLiqAge !== undefined && S.forceLiqAge > 600, 0.5, 'Long liq-free window');
  a.hit(f.count > 50 && c.c < i.ema21, -1.5, 'Cascade below EMA21');
  a.hit(f.count > 50 && c.c > i.ema21, 1, 'Cascade recovered EMA21');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('62.7', 62, 'Forced Order Micro');
  a.hit(f.count > 10 && S.takerRatio !== null && S.takerRatio > 0.6 && f.netBuy < 0, 1, 'Aggro buyers absorbing long liq');
  a.hit(f.count > 10 && S.takerRatio !== null && S.takerRatio < 0.4 && f.netBuy > 0, 1, 'Aggro sellers absorbing short liq');
  a.hit(f.count > 10 && S.takerRatio !== null && S.takerRatio > 0.6 && f.netBuy > 0 && c.bear, -1.5, 'Buyers + short liq + drop = cascade');
  a.hit(f.count > 10 && S.takerRatio !== null && S.takerRatio < 0.4 && f.netBuy < 0 && c.bull, -1.5, 'Sellers + long liq + rally = squeeze');
  a.hit(f.count > 40 && S.spread > 0.4, -2, 'Cascade + wide spread');
  a.hit(f.count > 40 && S.spread < 0.15, 1, 'Cascade with tight book');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('62.8', 62, 'Liquidation Site Mapping');
  a.hit(f.count > 15 && f.netBuy > 0 && S.price > i.ema21, 1.5, 'Short liq + above EMA21 = fuel');
  a.hit(f.count > 15 && f.netBuy < 0 && S.price < i.ema21, 1.5, 'Long liq + below EMA21 = fuel');
  a.hit(f.count > 15 && f.netBuy > 0 && S.price < i.ema21, -1.5, 'Short liq + below EMA21');
  a.hit(f.count > 15 && f.netBuy < 0 && S.price > i.ema21, -1.5, 'Long liq + above EMA21');
  a.hit(f.count > 30 && S.pivots && S.pivots.r1 && f.netBuy > 0 && c.c > S.pivots.r1, -1, 'Short liq pushed through R1');
  a.hit(f.count > 30 && S.pivots && S.pivots.s1 && f.netBuy < 0 && c.c < S.pivots.s1, -1, 'Long liq pushed through S1');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('62.9', 62, 'Cascade Exhaustion Signals');
  a.hit(f.count > 40 && Math.abs(f.netBuy) < S.price * 0.001, 2, 'Cascade with shrinking flow = exhaustion');
  a.hit(f.count > 40 && Math.abs(f.netBuy) > S.price * 0.01, -2, 'Cascade with growing flow');
  a.hit(f.count > 30 && c.bull && c.c > i.ema8, 1.5, 'Candle reclaim after long liq');
  a.hit(f.count > 30 && c.bear && c.c < i.ema8, 1.5, 'Candle break after short liq');
  a.hit(f.count > 30 && S.rsiDivBull, 2, 'Cascade + RSI bull div = bottom');
  a.hit(f.count > 30 && S.rsiDivBear, 2, 'Cascade + RSI bear div = top');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('62.10', 62, 'Forced Orders Final Verdict');
  const quiet = f.count <= 15;
  a.hit(quiet, 2, 'Liq environment quiet');
  a.hit(f.count > 40, -3, 'Liq environment hostile');
  a.hit(f.count > 40 && S.bias15 === 'LONG' && f.netBuy < 0 && c.bull, 1.5, 'Hostile flush turning');
  a.hit(f.count > 40 && S.bias15 === 'SHORT' && f.netBuy > 0 && c.bear, 1.5, 'Hostile squeeze turning');
  a.hit(f.count > 40 && S.conf < 0.6, -1.5, 'Hostile + weak conf');
  a.hit(f.count <= 15 && S.regime === 'MED' && atr / (S.price || 1) < 0.0045, 1.5, 'Quiet + clean regime');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat63(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;

  let a = new AgentEval('63.1', 63, 'VWAP Algo Drift');
  a.hit(S.vwap15 !== undefined && S.price > S.vwap15 && c.bull, 2, 'Above VWAP + bull');
  a.hit(S.vwap15 !== undefined && S.price < S.vwap15 && c.bear, 2, 'Below VWAP + bear');
  a.hit(S.vwap15 !== undefined && S.price > S.vwap15 && c.bear, -1.5, 'Above VWAP fading');
  a.hit(S.vwap15 !== undefined && S.price < S.vwap15 && c.bull, -1.5, 'Below VWAP recovering');
  a.hit(S.vwap15 !== undefined && Math.abs(S.price - S.vwap15) / atr > 2, -1.5, 'VWAP stretch extreme');
  a.hit(S.vwap15 !== undefined && Math.abs(S.price - S.vwap15) / atr < 0.2, 0.5, 'VWAP anchored');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('63.2', 63, 'Delta Engine');
  a.hit(S.delta15Cur !== undefined && S.delta15Cur > 0 && c.bull, 1.5, 'Positive delta + bull candle');
  a.hit(S.delta15Cur !== undefined && S.delta15Cur < 0 && c.bear, 1.5, 'Negative delta + bear candle');
  a.hit(S.delta15Cur !== undefined && S.delta15Cur > 0 && c.bear, -1.5, 'Positive delta vs down candle');
  a.hit(S.delta15Cur !== undefined && S.delta15Cur < 0 && c.bull, -1.5, 'Negative delta vs up candle');
  a.hit(S.delta15Cur !== undefined && Math.abs(S.delta15Cur) < atr * 0.1, 0.5, 'Delta quiet');
  a.hit(S.delta15Cur !== undefined && Math.abs(S.delta15Cur) > atr * 2, -1.5, 'Delta explosion = climax');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('63.3', 63, 'Aggressor Tape Read');
  a.hit(S.aggBuyPct !== undefined && S.aggBuyPct > 0.6 && c.bull, 2, 'Buyer-heavy tape + up');
  a.hit(S.aggBuyPct !== undefined && S.aggBuyPct < 0.4 && c.bear, 2, 'Seller-heavy tape + down');
  a.hit(S.aggBuyPct !== undefined && S.aggBuyPct > 0.6 && c.bear, -1.5, 'Buyers failing');
  a.hit(S.aggBuyPct !== undefined && S.aggBuyPct < 0.4 && c.bull, -1.5, 'Sellers failing');
  a.hit(S.aggBuyPct !== undefined && Math.abs(S.aggBuyPct - 0.5) < 0.03, 0.5, 'Tape balanced');
  a.hit(S.aggBuyPct !== undefined && S.aggBuyPct > 0.75, -1.5, 'Tape one-sided = fade');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('63.4', 63, 'Trade Sequence Algo');
  a.hit(S.tradeSeq !== undefined && S.tradeSeq >= 5 && S.tradeAggPct !== undefined && S.tradeAggPct > 0.8, 2, 'Sustained one-way trade run');
  a.hit(S.tradeSeq !== undefined && S.tradeSeq >= 5 && S.tradeAggPct !== undefined && S.tradeAggPct > 0.8 && c.bull, 1.5, 'Buy run + bull candle');
  a.hit(S.tradeSeq !== undefined && S.tradeSeq >= 5 && S.tradeAggPct !== undefined && S.tradeAggPct > 0.8 && c.bear, 1.5, 'Sell run + bear candle');
  a.hit(S.tradeSeq !== undefined && S.tradeSeq >= 10, -1.5, 'Extreme run = exhaustion');
  a.hit(S.tradeSeq !== undefined && S.tradeSeq >= 5 && c.range < atr * 0.5, -1, 'Run without price move = absorption');
  a.hit(S.tradeSeq !== undefined && S.tradeSeq < 3, 0.5, 'Chopped tape');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('63.5', 63, 'Large Trade Scanner');
  a.hit(S.largeTrades && S.largeTrades.net > 0 && c.bull, 2, 'Institutional net buyer + up');
  a.hit(S.largeTrades && S.largeTrades.net < 0 && c.bear, 2, 'Institutional net seller + down');
  a.hit(S.largeTrades && S.largeTrades.net > 0 && c.bear, -1.5, 'Whale buys fading');
  a.hit(S.largeTrades && S.largeTrades.net < 0 && c.bull, -1.5, 'Whale sells fading');
  a.hit(S.largeTrades && S.largeTrades.count >= 10 && Math.abs(S.largeTrades.net) / (S.largeTrades.vol || 1) > 0.6, 1.5, 'Concentrated large flow');
  a.hit(S.largeTrades && S.largeTrades.count >= 20 && Math.abs(S.largeTrades.net) / (S.largeTrades.vol || 1) < 0.3, -1, 'Noisy large tape');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('63.6', 63, 'RVOL Algorithmic Surge');
  a.hit(i.rvol > 2 && c.bull, 1.5, 'Volume surge + bull');
  a.hit(i.rvol > 2 && c.bear, 1.5, 'Volume surge + bear');
  a.hit(i.rvol > 2 && c.range < atr * 0.5, -1.5, 'Volume surge no range = absorption');
  a.hit(i.rvol > 4, -1.5, 'Volume surge extreme');
  a.hit(i.rvol < 0.7 && S.regime === 'LOW', -1, 'Dead volume');
  a.hit(i.rvol > 1.5 && S.takerRatio !== null && S.takerRatio > 0.55 && c.bull, 2, 'Surge + aggro buying = real');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('63.7', 63, 'CVD Momentum Read');
  a.hit(S.cvdRate !== null && S.cvdRate > 0 && c.bull, 1.5, 'CVD rising + bull');
  a.hit(S.cvdRate !== null && S.cvdRate < 0 && c.bear, 1.5, 'CVD falling + bear');
  a.hit(S.cvdRate !== null && S.cvdRate > 0 && c.bear, -1.5, 'CVD rising vs price down');
  a.hit(S.cvdRate !== null && S.cvdRate < 0 && c.bull, -1.5, 'CVD falling vs price up');
  a.hit(S.cvdRate !== null && Math.abs(S.cvdRate) < 0.05 && S.regime === 'LOW', 0.5, 'CVD flat');
  a.hit(S.cvdRate !== null && Math.abs(S.cvdRate) > 2, -1.5, 'CVD vertical = blowoff');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('63.8', 63, 'Book Imbalance Algo');
  a.hit(S.book && S.book.imbalBid !== undefined && S.book.imbalBid > 0.6 && c.bull, 2, 'Bid-heavy book + bull');
  a.hit(S.book && S.book.imbalBid !== undefined && S.book.imbalBid < 0.4 && c.bear, 2, 'Ask-heavy book + bear');
  a.hit(S.book && S.book.imbalBid !== undefined && S.book.imbalBid > 0.6 && c.bear, -1.5, 'Bid wall failing');
  a.hit(S.book && S.book.imbalBid !== undefined && S.book.imbalBid < 0.4 && c.bull, -1.5, 'Ask wall failing');
  a.hit(S.book && S.book.imbalPrev !== undefined && S.book.imbalPrev !== null && Math.abs(S.book.imbalBid - S.book.imbalPrev) > 0.25, 1, 'Book imbalance flip = signal');
  a.hit(S.book && S.book.imbalBid !== undefined && Math.abs(S.book.imbalBid - 0.5) > 0.35, -1, 'Book extreme = bait');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('63.9', 63, 'Algo Signature Detection');
  const twap = S.tradeAggPct !== undefined && S.tradeAggPct > 0.65 && S.tradeSeq >= 4 && c.range < atr * 0.8;
  const iceberg = S.book && S.book.top3Bid && S.book.bidVol !== undefined && S.book.top3Bid > S.book.bidVol * 0.5;
  a.hit(twap && c.bull, 1.5, 'TWAP-style accumulation up');
  a.hit(twap && c.bear, 1.5, 'TWAP-style distribution down');
  a.hit(iceberg, 0.5, 'Iceberg footprint');
  a.hit(S.book && S.book.askWalls && S.book.askWalls.length > 0 && c.bear, 1, 'Ask wall pressure');
  a.hit(S.book && S.book.bidWalls && S.book.bidWalls.length > 0 && c.bull, 1, 'Bid wall support');
  a.hit(twap && c.range < atr * 0.4, 1, 'Quiet accumulation tape');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('63.10', 63, 'Algo Flow Final Read');
  const flowBull = S.delta15Cur > 0 && S.cvdRate !== null && S.cvdRate > 0 && S.aggBuyPct > 0.52;
  const flowBear = S.delta15Cur < 0 && S.cvdRate !== null && S.cvdRate < 0 && S.aggBuyPct < 0.48;
  a.hit(flowBull && c.bull, 3, 'Full algo flow bull');
  a.hit(flowBear && c.bear, 3, 'Full algo flow bear');
  a.hit(flowBull && c.bear, -2, 'Algo bull flow vs price');
  a.hit(flowBear && c.bull, -2, 'Algo bear flow vs price');
  a.hit(S.delta15Cur === undefined || S.cvdRate === null, -1, 'Flow data missing');
  a.hit(Math.abs(S.delta15Cur || 0) < atr * 0.05 && Math.abs(S.cvdRate || 0) < 0.05 && S.regime === 'LOW', -1, 'Flow dead = skip');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat64(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const book = S.book || {};

  let a = new AgentEval('64.1', 64, 'Wall Detection');
  a.hit(book.bidWalls && book.bidWalls.length >= 2, 1, 'Multiple bid walls');
  a.hit(book.askWalls && book.askWalls.length >= 2, 1, 'Multiple ask walls');
  a.hit(book.bidWalls && book.bidWalls.length >= 3 && c.bull, 1.5, 'Bid wall ladder + up');
  a.hit(book.askWalls && book.askWalls.length >= 3 && c.bear, 1.5, 'Ask wall ladder + down');
  a.hit(book.bidWalls && book.bidWalls.length >= 3 && c.bear, -1.5, 'Bid ladder failing');
  a.hit(book.askWalls && book.askWalls.length >= 3 && c.bull, -1.5, 'Ask ladder failing');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('64.2', 64, 'Spoof Layer Inference');
  a.hit(book.bidWalls && book.bidWalls.length >= 2 && book.imbalBid !== undefined && book.imbalBid < 0.5 && c.bull, 1.5, 'Big bids but asks dominate = spoof');
  a.hit(book.askWalls && book.askWalls.length >= 2 && book.imbalBid !== undefined && book.imbalBid > 0.5 && c.bear, 1.5, 'Big asks but bids dominate = spoof');
  a.hit(book.bidWalls && book.bidWalls.length >= 2 && c.bear && c.c < i.ema21, 1.5, 'Bids failing below EMA21');
  a.hit(book.askWalls && book.askWalls.length >= 2 && c.bull && c.c > i.ema21, 1.5, 'Asks failing above EMA21');
  a.hit(book.bidWalls && book.bidWalls.length >= 4, -1, 'Wall theater');
  a.hit(book.askWalls && book.askWalls.length >= 4, -1, 'Wall theater');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('64.3', 64, 'Absorption Detector');
  a.hit(i.rvol > 1.5 && c.range < atr * 0.4 && c.bull, 1.5, 'Volume absorbed = accumulation');
  a.hit(i.rvol > 1.5 && c.range < atr * 0.4 && c.bear, 1.5, 'Volume absorbed = distribution');
  a.hit(i.rvol > 1.5 && c.range < atr * 0.4 && c.bull && book.imbalBid !== undefined && book.imbalBid < 0.5, 2, 'Sell pressure absorbed = spring');
  a.hit(i.rvol > 1.5 && c.range < atr * 0.4 && c.bear && book.imbalBid !== undefined && book.imbalBid > 0.5, 2, 'Buy pressure absorbed = trap');
  a.hit(i.rvol > 3 && c.range < atr * 0.3, -1, 'Odd-lot absorption weirdness');
  a.hit(c.range > atr * 1.5 && i.rvol > 2, 1, 'Expansion through absorption');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('64.4', 64, 'Imbalance Flip Tracker');
  a.hit(book.imbalPrev !== null && book.imbalPrev !== undefined && book.imbalBid !== undefined && book.imbalBid > 0.55 && book.imbalPrev < 0.45, 2, 'Book flipped bid-heavy');
  a.hit(book.imbalPrev !== null && book.imbalPrev !== undefined && book.imbalBid !== undefined && book.imbalBid < 0.45 && book.imbalPrev > 0.55, 2, 'Book flipped ask-heavy');
  a.hit(book.imbalPrev !== null && book.imbalPrev !== undefined && Math.abs(book.imbalBid - book.imbalPrev) < 0.02, 0.5, 'Book stable');
  a.hit(book.imbalPrev !== null && book.imbalPrev !== undefined && Math.abs(book.imbalBid - book.imbalPrev) > 0.4, -1.5, 'Book flip extreme = fake');
  a.hit(book.imbalPrev !== null && book.imbalPrev !== undefined && book.imbalBid > 0.55 && book.imbalPrev < 0.45 && c.bull, 2.5, 'Flip + follow-through up');
  a.hit(book.imbalPrev !== null && book.imbalPrev !== undefined && book.imbalBid < 0.45 && book.imbalPrev > 0.55 && c.bear, 2.5, 'Flip + follow-through down');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('64.5', 64, 'Depth Ratio Engine');
  a.hit(book.bidVol !== undefined && book.askVol !== undefined && book.bidVol > book.askVol * 1.3, 1.5, 'Depth bid-heavy');
  a.hit(book.bidVol !== undefined && book.askVol !== undefined && book.askVol > book.bidVol * 1.3, 1.5, 'Depth ask-heavy');
  a.hit(book.bidVol !== undefined && book.askVol !== undefined && Math.abs(book.bidVol - book.askVol) / (book.bidVol + book.askVol) < 0.1, 0.5, 'Depth balanced');
  a.hit(book.bidVol !== undefined && book.askVol !== undefined && book.bidVol > book.askVol * 2.5, -1.5, 'Depth one-sided = bait');
  a.hit(book.bidVol !== undefined && book.askVol !== undefined && book.askVol > book.bidVol * 2.5, -1.5, 'Depth one-sided = bait');
  a.hit(book.bidVol !== undefined && book.askVol !== undefined && book.bidVol > book.askVol * 1.3 && c.bull, 2, 'Bid depth + price up');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('64.6', 64, 'Top-of-Book Jitter');
  a.hit(book.l1Bid !== undefined && book.l1Ask !== undefined && (book.l1Ask - book.l1Bid) > atr * 0.15, -1.5, 'L1 spread wide = jitter');
  a.hit(book.l1Bid !== undefined && book.l1Ask !== undefined && (book.l1Ask - book.l1Bid) < atr * 0.05, 1, 'L1 tight');
  a.hit(book.top3Bid !== undefined && book.top3Ask !== undefined && book.top3Bid > book.top3Ask * 1.2 && c.bull, 1.5, 'Top3 bid dominance + up');
  a.hit(book.top3Bid !== undefined && book.top3Ask !== undefined && book.top3Ask > book.top3Bid * 1.2 && c.bear, 1.5, 'Top3 ask dominance + down');
  a.hit(book.top3Bid !== undefined && book.top3Ask !== undefined && book.top3Bid > book.top3Ask * 2.5, -1, 'Top3 extreme = spoof');
  a.hit(book.top3Bid !== undefined && book.top3Ask !== undefined && book.top3Ask > book.top3Bid * 2.5, -1, 'Top3 extreme = spoof');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('64.7', 64, 'Spoof-Candle Pattern');
  a.hit(book.bidWalls && book.bidWalls.length >= 2 && S.liq.sweptL && c.bull, 2.5, 'Bid wall + swept low + reclaim = fakeout');
  a.hit(book.askWalls && book.askWalls.length >= 2 && S.liq.sweptH && c.bear, 2.5, 'Ask wall + swept high + reject = fakeout');
  a.hit(book.bidWalls && book.bidWalls.length >= 2 && c.bear && c.c < i.ema8, 1.5, 'Bid wall failing under EMA8');
  a.hit(book.askWalls && book.askWalls.length >= 2 && c.bull && c.c > i.ema8, 1.5, 'Ask wall failing over EMA8');
  a.hit(book.bidWalls && book.bidWalls.length >= 3 && c.bear && c.range > atr * 1.5, -1.5, 'Bid ladder + collapse = real');
  a.hit(book.askWalls && book.askWalls.length >= 3 && c.bull && c.range > atr * 1.5, -1.5, 'Ask ladder + surge = real');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('64.8', 64, 'Spoof-Flow Divergence');
  a.hit(book.bidWalls && book.bidWalls.length >= 2 && S.takerRatio !== null && S.takerRatio < 0.45, 2, 'Big bids + seller tape = bait');
  a.hit(book.askWalls && book.askWalls.length >= 2 && S.takerRatio !== null && S.takerRatio > 0.55, 2, 'Big asks + buyer tape = bait');
  a.hit(book.bidWalls && book.bidWalls.length >= 2 && S.delta15Cur !== undefined && S.delta15Cur < 0, 1.5, 'Big bids + negative delta');
  a.hit(book.askWalls && book.askWalls.length >= 2 && S.delta15Cur !== undefined && S.delta15Cur > 0, 1.5, 'Big asks + positive delta');
  a.hit(book.bidWalls && book.bidWalls.length >= 3 && S.delta15Cur !== undefined && S.delta15Cur > 0 && c.bull, -1, 'Bids + real buying = legit');
  a.hit(book.askWalls && book.askWalls.length >= 3 && S.delta15Cur !== undefined && S.delta15Cur < 0 && c.bear, -1, 'Asks + real selling = legit');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('64.9', 64, 'Level Sweep Protocol');
  a.hit(S.liq.sweptL && c.bull && c.c > i.ema21, 2, 'Swept low reclaimed above EMA21');
  a.hit(S.liq.sweptH && c.bear && c.c < i.ema21, 2, 'Swept high rejected below EMA21');
  a.hit(S.liq.sweptL && c.bear && c.c < S.liq.sweptL - atr * 0.5, -2, 'Swept low failed = continuation');
  a.hit(S.liq.sweptH && c.bull && c.c > S.liq.sweptH + atr * 0.5, -2, 'Swept high failed = continuation');
  a.hit(S.liq.sweptL && S.liq.sweptAt <= 2 && c.bull, 1.5, 'Fresh swept low reversal');
  a.hit(S.liq.sweptH && S.liq.sweptAt <= 2 && c.bear, 1.5, 'Fresh swept high reversal');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('64.10', 64, 'Manipulation Final Read');
  const spoofScore = (book.bidWalls && book.bidWalls.length >= 2 ? 1 : 0) + (book.askWalls && book.askWalls.length >= 2 ? 1 : 0) + (Math.abs((book.imbalBid || 0.5) - 0.5) > 0.25 ? 1 : 0);
  a.hit(spoofScore >= 2 && c.range < atr * 0.8, 1.5, 'Wall theater in quiet tape');
  a.hit(spoofScore >= 2 && c.range > atr * 1.5, -1.5, 'Wall theater with real move');
  a.hit(spoofScore === 0, 1.5, 'Clean book');
  a.hit(book.imbalBid !== undefined && book.imbalBid > 0.8 && c.bull, -2, 'Book 80% bid + up = gate-5 hazard');
  a.hit(book.imbalBid !== undefined && book.imbalBid < 0.2 && c.bear, -2, 'Book 80% ask + down = gate-5 hazard');
  a.hit(S.liq.sweptL && book.bidWalls && book.bidWalls.length >= 2 && c.bull && S.rsiDivBull, 3, 'Manipulation trifecta long');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat65(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const vp = S.vp && S.vp['15m'], vp1h = S.vp && S.vp['1h'];
  const or = S.openingRange || {};

  let a = new AgentEval('65.1', 65, 'Auction POC Anchor');
  a.hit(vp && vp.poc !== undefined && Math.abs(S.price - vp.poc) < atr * 0.4, 1.5, 'Price at 15m POC');
  a.hit(vp && vp.poc !== undefined && S.price > vp.poc && c.bull, 2, 'Above POC + bull');
  a.hit(vp && vp.poc !== undefined && S.price < vp.poc && c.bear, 2, 'Below POC + bear');
  a.hit(vp && vp.poc !== undefined && S.price > vp.poc && c.bear, -1.5, 'Above POC fading');
  a.hit(vp && vp.poc !== undefined && S.price < vp.poc && c.bull, -1.5, 'Below POC recovering');
  a.hit(vp && vp.poc !== undefined && Math.abs(S.price - vp.poc) / atr > 2, -1.5, 'Stretched from POC');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('65.2', 65, 'Value Area Respect');
  a.hit(vp && vp.vah !== undefined && S.price > vp.vah, 1.5, 'Above VAH = acceptance');
  a.hit(vp && vp.val !== undefined && S.price < vp.val, 1.5, 'Below VAL = rejection');
  a.hit(vp && vp.vah !== undefined && vp.val !== undefined && S.price > vp.val && S.price < vp.vah, 0.5, 'Inside value area');
  a.hit(vp && vp.vah !== undefined && S.price > vp.vah && c.bear, -1.5, 'Fading above VAH');
  a.hit(vp && vp.val !== undefined && S.price < vp.val && c.bull, -1.5, 'Recovering below VAL');
  a.hit(vp && vp.vah !== undefined && vp.val !== undefined && (vp.vah - vp.val) / atr > 4, -1, 'Value area bloated');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('65.3', 65, 'Auction Range Structure');
  a.hit(S.range && S.range.top !== undefined && c.c > S.range.top && c.range > atr * 0.7, 2, 'Range breakout up');
  a.hit(S.range && S.range.bot !== undefined && c.c < S.range.bot && c.range > atr * 0.7, 2, 'Range breakout down');
  a.hit(S.range && S.range.bot !== undefined && S.range.top !== undefined && c.c > S.range.bot && c.c < S.range.top && c.range < atr * 0.5, -1, 'Range compression = breakout soon');
  a.hit(S.range && S.range.type === 'BULL', 1, 'Bull range');
  a.hit(S.range && S.range.type === 'BEAR', 1, 'Bear range');
  a.hit(S.range && S.range.slope !== undefined && Math.abs(S.range.slope) > 1, -1, 'Range slope violent');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('65.4', 65, 'Opening Range Auction');
  a.hit(or.high && S.price > or.high, 1.5, 'Above opening range');
  a.hit(or.low && S.price < or.low, 1.5, 'Below opening range');
  a.hit(or.high && or.low && S.price > or.high && c.range > atr, 2, 'OR expansion up');
  a.hit(or.high && or.low && S.price < or.low && c.range > atr, 2, 'OR expansion down');
  a.hit(or.high && or.low && c.c > or.high && c.c < or.low + (or.high - or.low) * 2 && S.liq.sweptH, 1.5, 'OR high sweep');
  a.hit(or.high && or.low && (or.high - or.low) > atr * 3, -1, 'OR too wide');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('65.5', 65, 'One-Timeframe Balance');
  a.hit(S.channel && S.channel.type === 'BULL' && c.c > i.ema8, 1.5, 'Bull channel + above EMA8');
  a.hit(S.channel && S.channel.type === 'BEAR' && c.c < i.ema8, 1.5, 'Bear channel + below EMA8');
  a.hit(S.channel && S.channel.type === 'BULL' && c.c < i.ema8, -1, 'Bull channel broken');
  a.hit(S.channel && S.channel.type === 'BEAR' && c.c > i.ema8, -1, 'Bear channel broken');
  a.hit(S.channel && S.channel.type === 'NEUTRAL' && S.regime === 'LOW', -0.5, 'Neutral channel chop');
  a.hit(S.channel && S.channel.top !== undefined && c.c > S.channel.top + atr * 0.3, 1, 'Above channel top = burst');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('65.6', 65, 'Swing Auction Points');
  const sh = S.swings15 && S.swings15.sh, sl = S.swings15 && S.swings15.sl;
  a.hit(sh && sh[0] !== undefined && S.price > sh[0], 1.5, 'Above swing high');
  a.hit(sl && sl[0] !== undefined && S.price < sl[0], 1.5, 'Below swing low');
  a.hit(sh && sh[0] !== undefined && S.price > sh[0] && c.range > atr, 2, 'Swing break with range');
  a.hit(sl && sl[0] !== undefined && S.price < sl[0] && c.range > atr, 2, 'Swing break with range');
  a.hit(sh && sh[0] !== undefined && S.price > sh[0] && c.bear, -1.5, 'Failed swing break');
  a.hit(sl && sl[0] !== undefined && S.price < sl[0] && c.bull, -1.5, 'Failed swing break');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('65.7', 65, 'Auction Volume Density');
  a.hit(vp && vp.poc !== undefined && vp1h && vp1h.poc !== undefined && S.price > vp.poc && S.price > vp1h.poc, 1.5, 'Above both POCs');
  a.hit(vp && vp.poc !== undefined && vp1h && vp1h.poc !== undefined && S.price < vp.poc && S.price < vp1h.poc, 1.5, 'Below both POCs');
  a.hit(vp && vp.poc !== undefined && vp1h && vp1h.poc !== undefined && S.price > vp.poc && S.price < vp1h.poc, -1, 'Torn between POCs');
  a.hit(vp && vp.poc !== undefined && S.takerRatio !== null && S.takerRatio > 0.55 && S.price > vp.poc, 1, 'Buyer acceptance above POC');
  a.hit(vp && vp.poc !== undefined && S.takerRatio !== null && S.takerRatio < 0.45 && S.price < vp.poc, 1, 'Seller acceptance below POC');
  a.hit(vp && vp.poc !== undefined && Math.abs(S.price - vp.poc) < atr * 0.15, 0.5, 'POC knife edge');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('65.8', 65, 'Auction Cycle Phase');
  a.hit(or.high && or.low && S.price > or.high && S.price < or.low + (or.high - or.low) * 1.5, 1, 'Early trend phase');
  a.hit(or.high && or.low && S.price > or.high && S.price > or.low + (or.high - or.low) * 2, 1.5, 'Trend extension phase');
  a.hit(S.range && S.range.apex !== undefined && S.range.apex > 0.6, 1, 'Range apex reached = breakout imminent');
  a.hit(S.range && S.range.apex !== undefined && S.range.apex < 0.3, -0.5, 'Range apex far');
  a.hit(S.regime === 'LOW' && c.range < atr * 0.4, 0.5, 'Low activity accumulation');
  a.hit(S.regime === 'HIGH' && c.range > atr * 2, -1, 'Over-traded auction');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('65.9', 65, 'Failure Test Auction');
  a.hit(S.liq.sweptL && c.bull && c.c > i.ema21, 2, 'Sweep + reclaim = failed auction low');
  a.hit(S.liq.sweptH && c.bear && c.c < i.ema21, 2, 'Sweep + reject = failed auction high');
  a.hit(S.liq.sweptL && vp && vp.poc !== undefined && S.price > vp.poc, 1.5, 'Sweep + above POC = strong');
  a.hit(S.liq.sweptH && vp && vp.poc !== undefined && S.price < vp.poc, 1.5, 'Sweep + below POC = strong');
  a.hit(S.liq.sweptL && S.liq.sweptAt <= 1 && c.range > atr, 2, 'Instant sweep reversal');
  a.hit(S.liq.sweptL && S.liq.sweptAt > 6, -1, 'Old sweep = nothing');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('65.10', 65, 'Auction Final Verdict');
  const aucBull = vp && vp.poc !== undefined && S.price > vp.poc && (or.high ? S.price > or.high : true) && c.bull;
  const aucBear = vp && vp.poc !== undefined && S.price < vp.poc && (or.low ? S.price < or.low : true) && c.bear;
  a.hit(aucBull, 3, 'Auction verdict LONG');
  a.hit(aucBear, 3, 'Auction verdict SHORT');
  a.hit(aucBull && S.rsiDivBull, 2, 'Auction long + divergence');
  a.hit(aucBear && S.rsiDivBear, 2, 'Auction short + divergence');
  a.hit(vp && vp.poc !== undefined && Math.abs(S.price - vp.poc) / atr < 0.15 && S.regime === 'LOW', -1, 'POC dead center = no edge');
  a.hit(S.channel && S.channel.slope !== undefined && Math.abs(S.channel.slope) > 0.8 && S.regime === 'HIGH', -1.5, 'Channel steep + chaos');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat66(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const r = renko(S);

  let a = new AgentEval('66.1', 66, 'Renko Trend State');
  a.hit(r.trend === 'BULL', 2, 'Renko bull bricks');
  a.hit(r.trend === 'BEAR', 2, 'Renko bear bricks');
  a.hit(r.trend === 'FLAT', -1, 'Renko flat = no bricks');
  a.hit(r.trend === 'BULL' && c.bull, 1.5, 'Renko + candle agree up');
  a.hit(r.trend === 'BEAR' && c.bear, 1.5, 'Renko + candle agree down');
  a.hit(r.trend === 'BULL' && c.bear && c.range > atr, -1.5, 'Renko bull vs candle down');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('66.2', 66, 'Renko Continuation');
  a.hit(r.last === 'BULL' && c.c > i.ema8, 1.5, 'Last brick up + above EMA8');
  a.hit(r.last === 'BEAR' && c.c < i.ema8, 1.5, 'Last brick down + below EMA8');
  a.hit(r.last === 'BULL' && r.dn > r.up, -1.5, 'Bull brick on bear tape');
  a.hit(r.last === 'BEAR' && r.up > r.dn, -1.5, 'Bear brick on bull tape');
  a.hit(r.trend === 'BULL' && S.bias15 === 'LONG', 2, 'Renko + 15m bias long');
  a.hit(r.trend === 'BEAR' && S.bias15 === 'SHORT', 2, 'Renko + 15m bias short');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('66.3', 66, 'Renko Reversal Detect');
  a.hit(r.trend === 'BULL' && c.bear && c.c < i.ema21 && S.liq.sweptH, 2, 'Renko bull + swept high = turn');
  a.hit(r.trend === 'BEAR' && c.bull && c.c > i.ema21 && S.liq.sweptL, 2, 'Renko bear + swept low = turn');
  a.hit(r.trend === 'BULL' && c.bear && c.range > atr * 1.5, 1.5, 'Renko bull + large bear candle');
  a.hit(r.trend === 'BEAR' && c.bull && c.range > atr * 1.5, 1.5, 'Renko bear + large bull candle');
  a.hit(r.trend === 'BULL' && r.last === 'BEAR', -1, 'Renko flipped to bear');
  a.hit(r.trend === 'BEAR' && r.last === 'BULL', -1, 'Renko flipped to bull');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('66.4', 66, 'Range Bar Rhythm');
  a.hit(c.range > atr * 1.2 && c.bull, 1, 'Range bar expansion up');
  a.hit(c.range > atr * 1.2 && c.bear, 1, 'Range bar expansion down');
  a.hit(c.range < atr * 0.5 && c.bull, 0.5, 'Range bar contraction up');
  a.hit(c.range < atr * 0.5 && c.bear, 0.5, 'Range bar contraction down');
  a.hit(c.range > atr * 1.2 && S.bias15 === 'LONG' && c.bull, 1.5, 'Expansion aligned long');
  a.hit(c.range > atr * 1.2 && S.bias15 === 'SHORT' && c.bear, 1.5, 'Expansion aligned short');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('66.5', 66, 'Renko & Volatility');
  a.hit(r.trend !== 'FLAT' && S.regime === 'MED', 1.5, 'Renko trend in normal vol');
  a.hit(r.trend === 'FLAT' && S.regime === 'LOW', -1, 'Renko flat + low vol');
  a.hit(r.trend !== 'FLAT' && S.regime === 'HIGH', -1.5, 'Renko trend in high vol = chase');
  a.hit(r.trend === 'BULL' && S.atr15pct > 0.004, -1.5, 'Renko bull + ATR% wide');
  a.hit(r.trend === 'BEAR' && S.atr15pct > 0.004, -1.5, 'Renko bear + ATR% wide');
  a.hit(r.trend !== 'FLAT' && c.v > i.volAvg, 1.5, 'Renko trend + above avg volume');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('66.6', 66, 'Renko Brick Harmony');
  a.hit(r.trend === 'BULL' && r.up >= r.dn * 2, 2, 'Renko brick ratio 2:1 bull');
  a.hit(r.trend === 'BEAR' && r.dn >= r.up * 2, 2, 'Renko brick ratio 2:1 bear');
  a.hit(r.up === 0 && r.dn > 5, 2, 'All bear bricks = trend');
  a.hit(r.dn === 0 && r.up > 5, 2, 'All bull bricks = trend');
  a.hit(r.bricks < 5, -1, 'Renko not enough bricks');
  a.hit(Math.abs(r.up - r.dn) / Math.max(r.up, r.dn, 1) < 0.15, -1, 'Renko bricks balanced');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('66.7', 66, 'Renko & Sessions');
  a.hit(r.trend === 'BULL' && S.sessions && S.sessions.isLondon, 2, 'Renko bull + London');
  a.hit(r.trend === 'BEAR' && S.sessions && S.sessions.isNY, 2, 'Renko bear + NY');
  a.hit(r.trend === 'BULL' && S.sessions && S.sessions.isAsian && S.regime === 'LOW', -1.5, 'Renko bull in Asian snooze');
  a.hit(r.trend !== 'FLAT' && S.sessions && S.sessions.minToLondon < 15, 1.5, 'Renko trend pre-London');
  a.hit(r.trend === 'FLAT' && S.sessions && S.sessions.isWeekend, -1, 'Renko flat weekend');
  a.hit(r.trend !== 'FLAT' && S.sessions && S.sessions.isWeekend, -1.5, 'Renko trend weekend = noise');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('66.8', 66, 'Renko & Derivatives');
  a.hit(r.trend === 'BULL' && S.takerRatio !== null && S.takerRatio > 0.55, 2, 'Renko bull + buyer tape');
  a.hit(r.trend === 'BEAR' && S.takerRatio !== null && S.takerRatio < 0.45, 2, 'Renko bear + seller tape');
  a.hit(r.trend === 'BULL' && S.oiDelta !== null && S.oiDelta > 0.02, 1.5, 'Renko bull + OI growth');
  a.hit(r.trend === 'BEAR' && S.oiDelta !== null && S.oiDelta < -0.02, 1.5, 'Renko bear + OI shrink');
  a.hit(r.trend === 'BULL' && S.funding !== null && S.funding > 0.0005, -1.5, 'Renko bull + funding extreme');
  a.hit(r.trend === 'BEAR' && S.funding !== null && S.funding < -0.0005, -1.5, 'Renko bear + funding extreme');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('66.9', 66, 'Renko Filter Pass');
  a.hit(r.trend === 'BULL' && c.bull && c.c > i.ema21, 2.5, 'Triple bull filter');
  a.hit(r.trend === 'BEAR' && c.bear && c.c < i.ema21, 2.5, 'Triple bear filter');
  a.hit(r.trend === 'BULL' && c.c < i.ema21, -2, 'Renko bull below EMA21');
  a.hit(r.trend === 'BEAR' && c.c > i.ema21, -2, 'Renko bear above EMA21');
  a.hit(r.trend === 'FLAT', -1.5, 'Renko filter flat');
  a.hit(r.trend !== 'FLAT' && Math.abs(S.price - i.ema21) > atr * 2.5, -1, 'Renko trend stretched');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('66.10', 66, 'Renko Final Verdict');
  const renkoBull = r.trend === 'BULL' && S.bias15 === 'LONG' && c.c > i.ema8 && S.regime !== 'HIGH';
  const renkoBear = r.trend === 'BEAR' && S.bias15 === 'SHORT' && c.c < i.ema8 && S.regime !== 'HIGH';
  a.hit(renkoBull, 3, 'Renko verdict LONG');
  a.hit(renkoBear, 3, 'Renko verdict SHORT');
  a.hit(r.trend === 'FLAT', -2, 'Renko verdict FLAT');
  a.hit(renkoBull && S.liq.sweptL, 2, 'Renko long + swept low');
  a.hit(renkoBear && S.liq.sweptH, 2, 'Renko short + swept high');
  a.hit(r.trend !== 'FLAT' && S.spread > 0.5, -1.5, 'Renko trend + wide spread');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat67(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const fh = S.fundingHist || [];

  let a = new AgentEval('67.1', 67, 'Crowd Psychology Meter');
  a.hit(S.lsGlobal !== null && S.lsGlobal > 0.6 && S.bias15 === 'SHORT', 2, 'Crowd long vs bear bias');
  a.hit(S.lsGlobal !== null && S.lsGlobal < 0.4 && S.bias15 === 'LONG', 2, 'Crowd short vs bull bias');
  a.hit(S.lsGlobal !== null && S.lsGlobal > 0.75, -2, 'Crowd long extreme');
  a.hit(S.lsGlobal !== null && S.lsGlobal < 0.25, -2, 'Crowd short extreme');
  a.hit(S.lsGlobal !== null && S.lsGlobal > 0.6 && c.bull, -1.5, 'Crowd long + price up');
  a.hit(S.lsGlobal !== null && S.lsGlobal < 0.4 && c.bear, -1.5, 'Crowd short + price down');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('67.2', 67, 'Funding Psychology');
  a.hit(fh.length >= 6 && fh[fh.length - 1] > 0 && fh[0] < 0, 1.5, 'Funding flipped positive = new longs');
  a.hit(fh.length >= 6 && fh[fh.length - 1] < 0 && fh[0] > 0, 1.5, 'Funding flipped negative = new shorts');
  a.hit(fh.length >= 8 && fh[fh.length - 1] > fh[0] * 2 && fh[0] > 0 && S.bias15 === 'SHORT', 2, 'Long crowd ballooning vs price');
  a.hit(fh.length >= 8 && fh[fh.length - 1] < fh[0] * 2 && fh[0] < 0 && S.bias15 === 'LONG', 2, 'Short crowd ballooning vs price');
  a.hit(S.funding !== null && Math.abs(S.funding) < 0.0001 && fh.length > 4, 0.5, 'Funding normalized');
  a.hit(S.funding !== null && S.funding > 0.0005, -2, 'Greed reading extreme');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('67.3', 67, 'Taker Fear/Greed');
  a.hit(S.takerRatio !== null && S.takerRatio > 0.65, -1.5, 'Taker greed = fade');
  a.hit(S.takerRatio !== null && S.takerRatio < 0.35, -1.5, 'Taker fear = fade');
  a.hit(S.takerRatio !== null && S.takerRatio > 0.65 && S.liq.sweptH && c.bear, 2, 'Greed + swept high = top');
  a.hit(S.takerRatio !== null && S.takerRatio < 0.35 && S.liq.sweptL && c.bull, 2, 'Fear + swept low = bottom');
  a.hit(S.takerRatio !== null && S.takerRatio > 0.52 && S.takerRatio < 0.58 && c.bull, 1, 'Moderate buying = healthy');
  a.hit(S.takerRatio !== null && S.takerRatio < 0.48 && S.takerRatio > 0.42 && c.bear, 1, 'Moderate selling = healthy');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('67.4', 67, 'Whale Psychology');
  a.hit(S.lsTopAcc !== null && S.lsTopAcc > 1.5 && S.lsGlobal !== null && S.lsGlobal < 0.4 && c.bull, 2, 'Whales long vs retail short = smart');
  a.hit(S.lsTopAcc !== null && S.lsTopAcc < 0.67 && S.lsGlobal !== null && S.lsGlobal > 0.6 && c.bear, 2, 'Whales short vs retail long = smart');
  a.hit(S.lsTopAcc !== null && S.lsTopAcc > 1.5 && S.lsGlobal !== null && S.lsGlobal > 0.6, -2, 'Whales + retail long = crowded');
  a.hit(S.lsTopAcc !== null && S.lsTopAcc < 0.67 && S.lsGlobal !== null && S.lsGlobal < 0.4, -2, 'Whales + retail short = crowded');
  a.hit(S.adl !== null && S.adl > 60 && S.bias15 === 'LONG', 1.5, 'ADL long + bias long');
  a.hit(S.adl !== null && S.adl < 40 && S.bias15 === 'SHORT', 1.5, 'ADL short + bias short');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('67.5', 67, 'Extremes Protocol');
  const greed = (S.lsGlobal > 0.75 ? 1 : 0) + (S.takerRatio > 0.65 ? 1 : 0) + (S.funding > 0.0005 ? 1 : 0);
  const fear = (S.lsGlobal < 0.25 ? 1 : 0) + (S.takerRatio < 0.35 ? 1 : 0) + (S.funding < -0.0005 ? 1 : 0);
  a.hit(greed >= 2, -2.5, 'Greed trifecta building');
  a.hit(fear >= 2, -2.5, 'Fear trifecta building');
  a.hit(greed >= 3, -3, 'Greed trifecta complete');
  a.hit(fear >= 3, -3, 'Fear trifecta complete');
  a.hit(greed === 0 && fear === 0, 1.5, 'Psychology neutral');
  a.hit(greed >= 2 && S.liq.sweptH && c.bear, 2.5, 'Greed + sweep + reject');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('67.6', 67, 'Retail Positioning Check');
  a.hit(S.lsGlobal !== null && S.lsGlobal > 0.6 && S.oiDelta !== null && S.oiDelta > 0.03, -2, 'Retail longs stacking OI');
  a.hit(S.lsGlobal !== null && S.lsGlobal < 0.4 && S.oiDelta !== null && S.oiDelta < -0.03, -2, 'Retail shorts stacking OI');
  a.hit(S.lsGlobal !== null && S.lsGlobal > 0.6 && S.oiDelta !== null && S.oiDelta < -0.03 && c.bear, 2, 'Retail longs stopped + OI drop');
  a.hit(S.lsGlobal !== null && S.lsGlobal < 0.4 && S.oiDelta !== null && S.oiDelta > 0.03 && c.bull, 2, 'Retail shorts stopped + OI rise');
  a.hit(S.lsGlobal !== null && Math.abs(S.lsGlobal - 0.5) < 0.05, 0.5, 'Retail balanced');
  a.hit(S.lsGlobal !== null && S.lsGlobal > 0.6 && S.lsTopAcc !== null && S.lsTopAcc < 0.67, 1.5, 'Whales fading retail longs');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('67.7', 67, 'Sentiment vs Price Memory');
  a.hit(S.lsGlobal !== null && S.lsGlobal > 0.6 && c.c < i.ema21, 2, 'Crowd long + price below EMA21');
  a.hit(S.lsGlobal !== null && S.lsGlobal < 0.4 && c.c > i.ema21, 2, 'Crowd short + price above EMA21');
  a.hit(S.lsGlobal !== null && S.lsGlobal > 0.6 && c.c > i.ema21 && S.rsiDivBear, 2.5, 'Crowd long + RSI bear div');
  a.hit(S.lsGlobal !== null && S.lsGlobal < 0.4 && c.c < i.ema21 && S.rsiDivBull, 2.5, 'Crowd short + RSI bull div');
  a.hit(S.lsGlobal !== null && S.lsGlobal > 0.6 && c.c > i.ema21, -1, 'Crowd long + price above EMA21');
  a.hit(S.lsGlobal !== null && S.lsGlobal < 0.4 && c.c < i.ema21, -1, 'Crowd short + price below EMA21');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('67.8', 67, 'Sentiment & Session Flow');
  a.hit(S.lsGlobal !== null && S.lsGlobal > 0.6 && S.sessions && S.sessions.isNY && c.bear, 1.5, 'NY + retail long + drop');
  a.hit(S.lsGlobal !== null && S.lsGlobal < 0.4 && S.sessions && S.sessions.isNY && c.bull, 1.5, 'NY + retail short + rally');
  a.hit(S.lsGlobal !== null && S.lsGlobal > 0.6 && S.sessions && S.sessions.isAsian && S.regime === 'LOW', -1, 'Asian + crowded longs = drift');
  a.hit(S.lsGlobal !== null && S.lsGlobal < 0.4 && S.sessions && S.sessions.isAsian && S.regime === 'LOW', -1, 'Asian + crowded shorts = drift');
  a.hit(S.forceLiq && S.forceLiq.count > 30 && S.lsGlobal !== null && S.lsGlobal > 0.6 && S.forceLiq.netBuy < 0, 2, 'Retail long mass liquidation');
  a.hit(S.forceLiq && S.forceLiq.count > 30 && S.lsGlobal !== null && S.lsGlobal < 0.4 && S.forceLiq.netBuy > 0, 2, 'Retail short mass liquidation');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('67.9', 67, 'Behavioral Trap Scanner');
  a.hit(S.liq.sweptL && S.lsGlobal !== null && S.lsGlobal < 0.4 && c.bull, 2, 'Retail shorts swept + reclaim');
  a.hit(S.liq.sweptH && S.lsGlobal !== null && S.lsGlobal > 0.6 && c.bear, 2, 'Retail longs swept + reject');
  a.hit(S.liq.sweptL && S.funding !== null && S.funding > 0.0003, 1.5, 'Swept low + longs paying');
  a.hit(S.liq.sweptH && S.funding !== null && S.funding < -0.0003, 1.5, 'Swept high + shorts paying');
  a.hit(S.liq.sweptL && S.lsGlobal !== null && S.lsGlobal > 0.6 && c.bull, -1.5, 'Retail longs + swept low + recover = squeeze');
  a.hit(S.liq.sweptH && S.lsGlobal !== null && S.lsGlobal < 0.4 && c.bear, -1.5, 'Retail shorts + swept high + reject = squeeze');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('67.10', 67, 'Sentiment Final Verdict');
  const sentBull = S.lsGlobal < 0.45 && S.takerRatio > 0.52 && S.funding < 0.0003 && S.adl > 50;
  const sentBear = S.lsGlobal > 0.55 && S.takerRatio < 0.48 && S.funding > -0.0003 && S.adl < 50;
  a.hit(sentBull && c.bull, 3, 'Sentiment verdict LONG');
  a.hit(sentBear && c.bear, 3, 'Sentiment verdict SHORT');
  a.hit(sentBull && c.bear, -2, 'Sentiment long vs price');
  a.hit(sentBear && c.bull, -2, 'Sentiment short vs price');
  a.hit(S.lsGlobal !== null && Math.abs(S.lsGlobal - 0.5) < 0.03 && S.regime === 'LOW', -1, 'Neutral crowd in dead tape');
  a.hit(sentBull && S.rsiDivBull, 2, 'Sentiment + RSI bull div');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat68(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const u = utcHour(S);
  const h = u.h, dow = u.dow;
  const sess = S.sessions || {};

  let a = new AgentEval('68.1', 68, 'Hour-of-Day Edge');
  a.hit(h >= 7 && h < 8, 1, 'Pre-London early flow');
  a.hit(h >= 8 && h < 12, 2, 'London core hours');
  a.hit(h >= 12 && h < 13, 1, 'London→NY transition');
  a.hit(h >= 13 && h < 17, 2, 'NY core hours');
  a.hit(h >= 17 && h < 21, -1, 'Post-NY fade');
  a.hit(h >= 21 || h < 2, -1.5, 'Overnight thin hours');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('68.2', 68, 'Day-of-Week Cycle');
  a.hit(dow === 0, -2, 'Sunday = pre-open void');
  a.hit(dow === 1, 1.5, 'Monday = weekly open');
  a.hit(dow === 2, 1, 'Tuesday = follow-through');
  a.hit(dow === 3, 1, 'Wednesday = mid-week');
  a.hit(dow === 4, 1.5, 'Thursday = positioning');
  a.hit(dow === 5, 0.5, 'Friday = week unwind');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('68.3', 68, 'Session Handoff Cycles');
  a.hit(sess.minToLondon !== undefined && sess.minToLondon > 0 && sess.minToLondon <= 60, 1.5, 'Pre-London ramp');
  a.hit(sess.minToLondon !== undefined && sess.minToLondon > 0 && sess.minToLondon <= 5, 2, 'London open imminent');
  a.hit(sess.minToNY !== undefined && sess.minToNY > 0 && sess.minToNY <= 60, 1.5, 'Pre-NY ramp');
  a.hit(sess.minToNY !== undefined && sess.minToNY > 0 && sess.minToNY <= 5, 2, 'NY open imminent');
  a.hit(sess.minToLondon !== undefined && sess.minToLondon <= 0 && sess.minToNY !== undefined && sess.minToNY > 120, 0.5, 'Mid-London lull');
  a.hit(sess.isWeekend, -2, 'Weekend cycle void');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('68.4', 68, 'Asian Range Seasonality');
  a.hit(sess.asianHigh && c.c > sess.asianHigh, 1.5, 'Above Asian range');
  a.hit(sess.asianLow && c.c < sess.asianLow, 1.5, 'Below Asian range');
  a.hit(sess.asianHigh && sess.asianLow && (sess.asianHigh - sess.asianLow) < atr * 1.5 && h >= 8, 1.5, 'Tight Asian range = London fuel');
  a.hit(sess.asianHigh && sess.asianLow && (sess.asianHigh - sess.asianLow) > atr * 3, -1, 'Wide Asian range = exhausted');
  a.hit(sess.asianHigh && c.c > sess.asianHigh && S.regime === 'LOW', 1, 'Quiet Asian break');
  a.hit(sess.asianHigh && sess.asianLow && S.price > sess.asianLow && S.price < sess.asianHigh, 0, 'Inside Asian range');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('68.5', 68, 'Opening Range Seasonality');
  const orH = S.openingRange && S.openingRange.high, orL = S.openingRange && S.openingRange.low;
  a.hit(orH && c.c > orH && h >= 8 && h < 12, 2, 'OR break during London');
  a.hit(orL && c.c < orL && h >= 13 && h < 17, 2, 'OR break during NY');
  a.hit(orH && c.c > orH && c.bear && S.liq.sweptH, 2, 'OR break faking high');
  a.hit(orL && c.c < orL && c.bull && S.liq.sweptL, 2, 'OR break faking low');
  a.hit(orH && orL && (orH - orL) < atr && h >= 9 && h < 10, 1, 'Tight OR = explosive session');
  a.hit(orH && orL && c.c > orH && c.c > orL + (orH - orL) * 2.5, -1, 'OR extended far = chase');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('68.6', 68, 'Weekly Bias Cycle');
  a.hit(dow === 1 && c.bull && S.bias1h === 'LONG', 1.5, 'Monday open bull');
  a.hit(dow === 1 && c.bear && S.bias1h === 'SHORT', 1.5, 'Monday open bear');
  a.hit(dow === 5 && S.sigStreak >= 2 && h >= 15, -1.5, 'Friday late + hot streak = profit taking');
  a.hit(dow === 5 && S.liq.sweptL && c.bull, 1.5, 'Friday sweep + reclaim');
  a.hit(dow === 4 && S.regime === 'LOW', -1, 'Thursday dead tape');
  a.hit(dow === 5 && h >= 20, -1.5, 'Friday close chop');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('68.7', 68, 'Liquidity Time Cycles');
  a.hit(h >= 13.5 && h <= 14.5 && S.liq.sweptL, 1.5, 'NY open sweep low');
  a.hit(h >= 8.5 && h <= 9.5 && S.liq.sweptL, 1.5, 'London open sweep low');
  a.hit(h >= 13.5 && h <= 14.5 && S.liq.sweptH, 1.5, 'NY open sweep high');
  a.hit(h >= 8.5 && h <= 9.5 && S.liq.sweptH, 1.5, 'London open sweep high');
  a.hit(h >= 15.5 && h <= 16.5 && S.regime === 'LOW', -1, 'MOC window noise');
  a.hit(h >= 9 && h <= 10 && S.takerRatio !== null && S.takerRatio > 0.55, 1.5, 'London open aggro buyers');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('68.8', 68, 'Data-Release Window Guard');
  a.hit(h >= 13.5 && h <= 14.5, -1, 'US data window = whip risk');
  a.hit(h >= 14 && h <= 14.5 && S.regime === 'HIGH', -2, 'Data window + high vol = skip');
  a.hit(h >= 9 && h <= 9.5 && S.spread > 0.3, -1, 'London open spread spike');
  a.hit(h >= 13.5 && h <= 14.5 && S.forceLiq && S.forceLiq.count > 40, -2, 'Data window + liq storm');
  a.hit(h >= 13 && h <= 14 && c.range < atr * 0.4, 0.5, 'Quiet before data');
  a.hit(h >= 14.5 && h <= 15 && c.range > atr, 1, 'Post-data continuation');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('68.9', 68, 'Time-of-Day Reversal');
  a.hit(h >= 16 && h <= 17 && S.liq.sweptH && c.bear, 1.5, 'Late NY swept high = close top');
  a.hit(h >= 12 && h <= 13 && S.liq.sweptL && c.bull, 1.5, 'Handoff swept low = London close base');
  a.hit(h >= 3 && h <= 6 && c.range > atr * 1.5, -1.5, 'Overnight spike = stop hunt');
  a.hit(h >= 7 && h <= 8 && c.range > atr * 1.5, 1.5, 'Pre-London move = real');
  a.hit(h >= 17 && h <= 21 && S.takerRatio !== null && S.takerRatio < 0.45 && c.bear, 1, 'Post-NY selling drift');
  a.hit(h >= 17 && h <= 21 && S.takerRatio !== null && S.takerRatio > 0.55 && c.bull, 1, 'Post-NY buying drift');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('68.10', 68, 'Time Cycle Final Verdict');
  const prime = h >= 8 && h < 17 && !sess.isWeekend;
  const handoff = sess.minToLondon !== undefined && sess.minToLondon <= 30 || sess.minToNY !== undefined && sess.minToNY <= 30;
  a.hit(prime, 2, 'Prime cycle window');
  a.hit(!prime, -1.5, 'Off-cycle window');
  a.hit(handoff, 1.5, 'Handoff window');
  a.hit(sess.isWeekend, -2.5, 'Weekend = no cycle edge');
  a.hit(prime && S.regime === 'MED' && atr / (S.price || 1) >= 0.0012 && atr / (S.price || 1) <= 0.0045, 2, 'Prime + healthy ATR%');
  a.hit(prime && c.c > sess.asianHigh && S.bias15 === 'LONG', 1.5, 'Prime + above Asian high + long');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat69(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;

  /* normalized feature bundle shared by all 10 ensemble members */
  const f = {
    rsi: clamp((i.rsi - 50) / 50, -1, 1) || 0,
    macd: clamp((i.macd && (i.macd.histogram || i.macd.macd) / (atr * 0.2)), -1, 1) || 0,
    cci: clamp(i.cci / 100, -1, 1) || 0,
    cvd: clamp((S.cvdRate !== null && S.cvdRate !== undefined ? S.cvdRate * 4 : 0), -1, 1),
    vwap: clamp((S.vwap15 !== undefined ? (S.price - S.vwap15) / atr : 0), -1, 1),
    taker: clamp(((S.takerRatio !== null && S.takerRatio !== undefined ? S.takerRatio : 0.5) - 0.5) * 6, -1, 1),
    div: (S.rsiDivBull ? 1 : 0) - (S.rsiDivBear ? 1 : 0),
    sweep: S.liq.sweptL ? 1 : S.liq.sweptH ? -1 : 0,
    oi: clamp((S.oiDelta !== null && S.oiDelta !== undefined ? S.oiDelta * 30 : 0), -1, 1),
    fund: clamp((S.funding !== null && S.funding !== undefined ? -S.funding * 3000 : 0), -1, 1)
  };
  const score = (w, b) => {
    let s = b;
    for (const k of Object.keys(w)) s += w[k] * f[k];
    return s;
  };
  const voteOf = s => s >= 1.5 ? 'LONG' : s <= -1.5 ? 'SHORT' : 'NEUTRAL';

  const members = [
    { id: '69.1', w: { rsi: 0.8, macd: 0.6, cci: 0.4, cvd: 0.3, sweep: 0.5 }, b: 0, rules: ['Ensemble A: momentum mix'] },
    { id: '69.2', w: { vwap: 0.7, taker: 0.6, cvd: 0.5, oi: 0.3 }, b: 0, rules: ['Ensemble B: flow mix'] },
    { id: '69.3', w: { div: 0.9, sweep: 0.7, fund: 0.4, rsi: 0.3 }, b: 0, rules: ['Ensemble C: reversal mix'] },
    { id: '69.4', w: { rsi: 0.5, vwap: 0.5, taker: 0.5, cci: 0.4, macd: 0.4 }, b: 0, rules: ['Ensemble D: balanced'] },
    { id: '69.5', w: { fund: 0.8, oi: 0.6, taker: 0.5, cvd: 0.4, vwap: 0.3 }, b: 0, rules: ['Ensemble E: macro-contra'] },
    { id: '69.6', w: { cvd: 0.8, macd: 0.6, rsi: 0.4, sweep: 0.6, div: 0.3 }, b: 0, rules: ['Ensemble F: momentum+div'] },
    { id: '69.7', w: { sweep: 1.0, div: 0.6, fund: 0.5, cci: 0.3 }, b: 0, rules: ['Ensemble G: trap hunter'] },
    { id: '69.8', w: { vwap: 0.6, rsi: 0.5, macd: 0.5, cvd: 0.3, oi: 0.3, taker: 0.3 }, b: 0, rules: ['Ensemble H: trend confirm'] },
    { id: '69.9', w: { oi: 0.7, fund: 0.6, taker: 0.4, cvd: 0.5, vwap: 0.4 }, b: 0, rules: ['Ensemble I: derivative smart'] },
    { id: '69.10', w: { rsi: 0.6, cci: 0.5, div: 0.5, sweep: 0.4, macd: 0.4, vwap: 0.3, fund: 0.3, taker: 0.3 }, b: 0, rules: ['Ensemble J: full blend'] }
  ];

  for (const m of members) {
    const s = score(m.w, m.b);
    const a = new AgentEval(m.id, 69, m.id.slice(-1) === '1' ? 'Ensemble A' : m.id.slice(-1) === '2' ? 'Ensemble B' : m.id.slice(-1) === '3' ? 'Ensemble C' : m.id.slice(-1) === '4' ? 'Ensemble D' : m.id.slice(-1) === '5' ? 'Ensemble E' : m.id.slice(-1) === '6' ? 'Ensemble F' : m.id.slice(-1) === '7' ? 'Ensemble G' : m.id.slice(-1) === '8' ? 'Ensemble H' : m.id.slice(-1) === '9' ? 'Ensemble I' : 'Ensemble J');
    a.hit(s >= 1.5, 2, m.rules[0] + ' → LONG');
    a.hit(s <= -1.5, 2, m.rules[0] + ' → SHORT');
    a.hit(s > 0.5 && s < 1.5, 1, m.rules[0] + ' → leaning LONG');
    a.hit(s < -0.5 && s > -1.5, 1, m.rules[0] + ' → leaning SHORT');
    a.hit(Math.abs(s) <= 0.5, -1, m.rules[0] + ' → NO EDGE');
    out.push(finish(a, S, { entry: S.price, minDir: 1.5 }));
  }
  return out;
}

function cat70(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const streak = S.sigStreak || 0;

  let a = new AgentEval('70.1', 70, 'Discipline Contract');
  a.hit(streak <= -2, 2, 'Loss streak: cut risk 50%');
  a.hit(streak <= -4, 2.5, 'Deep loss streak: stand down');
  a.hit(streak >= 0, 1, 'No streak penalty');
  a.hit(streak >= 3, 1, 'Win streak: no increase (anti-martingale)');
  a.hit(streak >= 5 && S.regime === 'HIGH', -1, 'Hot streak + chaos = greedy');
  a.hit(streak <= -4 && S.conf >= 0.7, 0.5, 'Losing + high conf = trust system');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('70.2', 70, 'Revenge Guard');
  a.hit(streak <= -2 && S.sigAge !== null && S.sigAge <= 3, -2, 'Revenge mode = new signal too soon');
  a.hit(streak <= -2 && S.sigAge !== null && S.sigAge > 6, 1, 'Cooldown respected after loss');
  a.hit(streak <= -3 && S.regime === 'HIGH', -2, 'Tilt + chaos');
  a.hit(streak <= -3 && S.spread > 0.5, -2, 'Tilt + wide spread');
  a.hit(streak <= -2 && S.conf < 0.6, -1.5, 'Losses + weak signal = skip');
  a.hit(streak <= -2 && pvQ(S) < 251, -2, 'Losses + no quorum = skip');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('70.3', 70, 'FOMO Guard');
  a.hit(c.range > atr * 2.5 && S.sigAge !== null && S.sigAge <= 2, -2, 'Chasing 2.5 ATR candle');
  a.hit(c.c > i.ema21 + atr * 2 && S.bias15 === 'LONG', -1.5, 'Chasing extended long');
  a.hit(c.c < i.ema21 - atr * 2 && S.bias15 === 'SHORT', -1.5, 'Chasing extended short');
  a.hit(S.liq.sweptH && c.c > S.liq.sweptH + atr * 1.5, -2, 'Chasing above swept high');
  a.hit(S.liq.sweptL && c.c < S.liq.sweptL - atr * 1.5, -2, 'Chasing below swept low');
  a.hit(S.regime === 'HIGH' && c.range > atr * 2, -2.5, 'Chasing volatility spike');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('70.4', 70, 'Patience Protocol');
  a.hit(S.regime === 'LOW' && c.range < atr * 0.4, -1, 'No edge in dead tape = wait');
  a.hit(S.regime === 'LOW' && S.sigAge !== null && S.sigAge > 6, 0.5, 'Quiet + no signal = patient');
  a.hit(S.sigAge !== null && S.sigAge > 12, -2, 'Holding stale signal');
  a.hit(S.sigAge !== null && S.sigAge > 12 && streak >= 3, -2.5, 'Hot streak holding stale = ego');
  a.hit(S.spread > 0.5 && c.range < atr, -1.5, 'Wide spread + small range = wait');
  a.hit(streak <= -2 && S.regime === 'LOW', -1, 'Losses + dead tape = done');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('70.5', 70, 'Risk-Down Sequence');
  a.hit(streak <= -2, 1.5, 'Sequence: risk halved');
  a.hit(streak <= -4, 1.5, 'Sequence: stand down next 4');
  a.hit(streak >= 3, 0.5, 'Sequence: hold risk');
  a.hit(streak <= -2 && S.sigRR >= 2.5, 1, 'Losses + good RR = acceptable');
  a.hit(streak <= -2 && S.spread > 0.5, 1.5, 'Losses + spread tax = size 50%');
  a.hit(streak >= 5, -1, 'Five wins = overconfidence');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('70.6', 70, 'Process Over Outcome');
  a.hit(S.conf >= 0.6 && S.sigRR >= 1.5 && streak <= -2, 1.5, 'Process good despite losses');
  a.hit(S.conf >= 0.65 && streak <= -4, 1, 'System edge intact');
  a.hit(S.conf < 0.55 && streak >= 3, -1.5, 'Weak signal on hot streak');
  a.hit(S.sigAge !== null && S.sigAge > 12 && streak <= -2, 2, 'No forced trades after loss');
  a.hit(S.sigStreak !== undefined, 0.5, 'Streak tracked');
  a.hit(S.regime === 'HIGH' && streak <= -3, -1.5, 'Chaos + tilted = stand down');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('70.7', 70, 'Session Discipline');
  a.hit(S.sessions && S.sessions.isWeekend, -2, 'Weekend = no discipline edge');
  a.hit(S.sessions && S.sessions.isAsian && S.regime === 'LOW' && streak <= -2, 1.5, 'Asian low = rest after loss');
  a.hit(S.sessions && S.sessions.isNY && streak <= -3, 1, 'NY + losses = recover first');
  a.hit(S.sessions && S.sessions.minToLondon !== undefined && S.sessions.minToLondon < 10 && streak <= -2, 1, 'Pre-London reset');
  a.hit(S.sessions && S.sessions.isLondon && streak >= 3 && S.regime === 'HIGH', -1.5, 'London + hot streak + chaos');
  a.hit(S.sessions && S.sessions.isNY && c.range > atr * 2 && S.sigAge !== null && S.sigAge <= 3, -1.5, 'NY spike chase');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('70.8', 70, 'Aversion to Edge Loss');
  a.hit(S.spread > 0.5 && c.range < atr * 0.8, -2, 'Spread eats edge = no trade');
  a.hit(S.spread > 0.5 && S.regime === 'LOW', -2.5, 'Wide spread + low vol = impossible');
  a.hit(S.spread > 0.15 && S.spread <= 0.5 && c.range < atr * 0.5, -1, 'Spread pressure in tight tape');
  a.hit(S.spread < 0.15 && c.range > atr, 1, 'Clean spread + range = edge alive');
  a.hit(S.funding !== null && Math.abs(S.funding) > 0.0005 && S.sigRR < 2, -1.5, 'Funding tax vs thin RR');
  a.hit(S.forceLiq && S.forceLiq.count > 40 && streak <= -2, -1.5, 'Liq storm + losses = sit out');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('70.9', 70, 'Compounding Ethics');
  a.hit(streak >= 3 && S.sigRR >= 1.5 && S.conf >= 0.6, 1.5, 'Steady compounding profile');
  a.hit(streak >= 5 && S.sigAge !== null && S.sigAge > 8, -1, 'Long signal + long streak = complacency');
  a.hit(streak <= -2 && S.sigAge !== null && S.sigAge <= 3, -2, 'Immediate revenge trade');
  a.hit(streak <= -4 && S.conf < 0.6, -1.5, 'Deep loss + weak edge');
  a.hit(S.sigStreak !== undefined && S.sigStreak === 0, 0.5, 'Fresh start streak');
  a.hit(S.prevVotes && S.prevVotes.long >= 251 && S.prevVotes.short < 251 && S.conf >= 0.65, 1.5, 'Strong quorum discipline');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('70.10', 70, 'Psychology Final Gate');
  const disciplineOK = streak > -4 && S.spread <= 0.5 && S.regime !== 'HIGH' && S.sigAge !== null && S.sigAge <= 12;
  a.hit(disciplineOK, 2.5, 'Psychology gate open');
  a.hit(!disciplineOK, -2.5, 'Psychology gate closed');
  a.hit(streak <= -4, -2, 'Tilt lockout');
  a.hit(streak <= -4 && S.sigAge !== null && S.sigAge <= 3, -2.5, 'Tilt + fresh signal = block');
  a.hit(disciplineOK && S.sigRR >= 1.8 && S.conf >= 0.6, 2, 'Golden discipline profile');
  a.hit(S.regime === 'HIGH' && streak <= -2 && c.range > atr * 2, -3, 'Red-flag psychology state');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function pvQ(S) { const p = S.prevVotes || {}; return Math.max(p.long || 0, p.short || 0); }

module.exports = { cat61, cat62, cat63, cat64, cat65, cat66, cat67, cat68, cat69, cat70 };