'use strict';
/* OMNISCIENT SCALPER v22.0 — Agent Categories 41–50: Confluence & System Masters (100 agents) */

const { AgentEval, finish, lastCandle } = require('./rulebook');

const T = S => S.tf['15m'];

/* UTC hour float from latest 1m candle open time (deterministic per data-set) */
function utcHour(S) {
  const c1 = S.tf && S.tf['1m'] && S.tf['1m'].candles;
  const t = c1 && c1.length ? Number(c1[c1.length - 1][0]) : Date.now();
  const d = new Date(t);
  return d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
}

function cat41(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const b15 = S.bias15, b1h = S.bias1h, b4h = S.bias4h || b1h;

  let a = new AgentEval('41.1', 41, 'MTF Bias Stack');
  a.hit(b15 === 'LONG' && b1h === 'LONG' && b4h === 'LONG', 3, 'Triple bull stack');
  a.hit(b15 === 'SHORT' && b1h === 'SHORT' && b4h === 'SHORT', 3, 'Triple bear stack');
  a.hit(b15 === 'NEUTRAL' && b1h === 'LONG' && b4h === 'LONG', 1, '15m pullback in 1h bull');
  a.hit(b15 === 'NEUTRAL' && b1h === 'SHORT' && b4h === 'SHORT', 1, '15m pullback in 1h bear');
  a.hit(b15 === 'LONG' && b1h === 'SHORT', -2, '15m vs 1h conflict');
  a.hit(b15 === 'SHORT' && b1h === 'LONG', -2, '15m vs 1h conflict');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('41.2', 41, 'MTF EMA Wind');
  const e15 = i.ema21, e1h = S.tf['1h'].i.ema21, e4h = S.tf['4h'].i.ema21;
  a.hit(S.price > e15 && S.price > e1h && S.price > e4h, 2.5, 'Price above all 21-EMAs');
  a.hit(S.price < e15 && S.price < e1h && S.price < e4h, 2.5, 'Price below all 21-EMAs');
  a.hit(S.price > e15 && S.price < e1h && e1h > e4h, 1, '15m above, 1h rising');
  a.hit(S.price < e15 && S.price > e1h && e1h < e4h, 1, '15m below, 1h falling');
  a.hit(e15 > e1h && e1h > e4h && b15 === 'SHORT', -1.5, 'Fighting rising HTF stack');
  a.hit(e15 < e1h && e1h < e4h && b15 === 'LONG', -1.5, 'Fighting falling HTF stack');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('41.3', 41, 'MTF Liquidity');
  a.hit(b15 === 'LONG' && b1h === 'LONG' && S.liq.sweptL, 2, 'Sweep aligned with HTF bull');
  a.hit(b15 === 'SHORT' && b1h === 'SHORT' && S.liq.sweptH, 2, 'Sweep aligned with HTF bear');
  a.hit(b15 === 'LONG' && S.liq.sweptH, -1.5, 'Bull scalp above swept HTF high');
  a.hit(b15 === 'SHORT' && S.liq.sweptL, -1.5, 'Bear scalp below swept HTF low');
  a.hit(S.pivots && b1h === 'LONG' && S.price > S.pivots.pp, 1, 'Above 1h pivot');
  a.hit(S.pivots && b1h === 'SHORT' && S.price < S.pivots.pp, 1, 'Below 1h pivot');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('41.4', 41, 'MTF Structure Confirm');
  const c1h = lastCandle(S.tf['1h'].candles);
  a.hit(b1h === 'LONG' && c1h.bull && c.range > atr * 0.7, 2, '1h bull impulse padding 15m');
  a.hit(b1h === 'SHORT' && c1h.bear && c.range > atr * 0.7, 2, '1h bear impulse padding 15m');
  a.hit(b1h === 'LONG' && c1h.bear, -1, '1h rejection candle');
  a.hit(b1h === 'SHORT' && c1h.bull, -1, '1h rejection candle');
  a.hit(S.regime === 'LOW' && b1h === 'LONG' && c.range < atr * 0.4, 1, 'HTF support, quiet 15m');
  a.hit(S.swings15 && S.swings15.sh && S.swings15.sh[0] !== undefined && S.price > S.swings15.sh[0] && b1h === 'LONG', 1.5, '15m swing high break + 1h bull');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('41.5', 41, 'MTF Volume Agreement');
  const v15 = c.v / (i.volAvg || 1), v1h = c1h.v / (S.tf['1h'].i.volAvg || 1);
  a.hit(v15 > 1.2 && v1h > 1.2 && c.bull && b1h === 'LONG', 2.5, 'Vol expansion both TF bull');
  a.hit(v15 > 1.2 && v1h > 1.2 && c.bear && b1h === 'SHORT', 2.5, 'Vol expansion both TF bear');
  a.hit(v15 > 1.5 && v1h < 0.8, -1, '15m noise vs quiet HTF');
  a.hit(v15 < 0.7 && v1h > 1.2, 1, 'HTF volume supporting drift');
  a.hit(v15 < 0.5 && b15 === 'LONG' && b1h === 'LONG', 0.5, 'Low volume, trend grind');
  a.hit(v15 > 2.5 && S.regime !== 'HIGH', -1, 'One-sided climax risk');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('41.6', 41, 'MTF Range Apex');
  a.hit(S.range && S.range.type === 'BULL' && b1h === 'LONG' && c.bull, 2, 'Bull range + HTF long');
  a.hit(S.range && S.range.type === 'BEAR' && b1h === 'SHORT' && c.bear, 2, 'Bear range + HTF short');
  a.hit(S.channel && S.channel.type === 'BULL' && c.c > i.ema8, 1.5, 'In bull channel above EMA-8');
  a.hit(S.channel && S.channel.type === 'BEAR' && c.c < i.ema8, 1.5, 'In bear channel below EMA-8');
  a.hit(S.range && S.range.slope > 0.3 && b15 === 'SHORT', -1.5, 'Counter rising range');
  a.hit(S.range && S.range.slope < -0.3 && b15 === 'LONG', -1.5, 'Counter falling range');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('41.7', 41, 'MTF Divergence Agreement');
  a.hit(S.rsiDivBull && S.cvdDivBull, 2.5, 'RSI + CVD bull divergence');
  a.hit(S.rsiDivBear && S.cvdDivBear, 2.5, 'RSI + CVD bear divergence');
  a.hit(S.macdDivBull && S.rsiDivBull, 2, 'MACD + RSI bull divergence');
  a.hit(S.macdDivBear && S.rsiDivBear, 2, 'MACD + RSI bear divergence');
  a.hit(S.rsiDivBull && b1h === 'SHORT', -1, 'Bull div against 1h trend');
  a.hit(S.rsiDivBear && b1h === 'LONG', -1, 'Bear div against 1h trend');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('41.8', 41, 'MTF OB/FVG Agreement');
  const obBull = S.obs && S.obs.bull, obBear = S.obs && S.obs.bear;
  a.hit(b15 === 'LONG' && obBull && obBull.low < S.price && obBull.high > S.price, 2, 'Trading inside bull OB');
  a.hit(b15 === 'SHORT' && obBear && obBear.low < S.price && obBear.high > S.price, 2, 'Trading inside bear OB');
  a.hit(b15 === 'LONG' && S.fvgs && S.fvgs.bull && S.fvgs.bull.length && S.price > S.fvgs.bull[0].bot, 1.5, 'FVG below with bull bias');
  a.hit(b15 === 'SHORT' && S.fvgs && S.fvgs.bear && S.fvgs.bear.length && S.price < S.fvgs.bear[0].top, 1.5, 'FVG above with bear bias');
  a.hit(obBull && obBull.low > S.price && b15 === 'LONG', 1, 'Not yet at bull OB');
  a.hit(obBear && obBear.high < S.price && b15 === 'SHORT', 1, 'Not yet at bear OB');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('41.9', 41, 'MTF Compromise Finder');
  a.hit(b15 === 'LONG' && b1h === 'NEUTRAL' && S.bias4h === 'LONG', 1.5, '15m + 4h long, 1h neutral');
  a.hit(b15 === 'SHORT' && b1h === 'NEUTRAL' && S.bias4h === 'SHORT', 1.5, '15m + 4h short, 1h neutral');
  a.hit(b15 === 'NEUTRAL' && b1h === 'LONG' && c.c > i.ema8, 1, 'Neutral 15m drifting with 1h');
  a.hit(b15 === 'NEUTRAL' && b1h === 'SHORT' && c.c < i.ema8, 1, 'Neutral 15m drifting with 1h');
  a.hit(b15 === 'LONG' && b1h === 'LONG' && b4h === 'SHORT', -1, '1d-4h conflict above');
  a.hit(b15 === 'SHORT' && b1h === 'SHORT' && b4h === 'LONG', -1, '1d-4h conflict below');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('41.10', 41, 'MTF Final Verdict');
  const aligned = (b15 === b1h && b1h === b4h && b15 !== 'NEUTRAL') ? 1 : 0;
  const partial = (b15 === b1h && b15 !== 'NEUTRAL') ? 1 : 0;
  a.hit(aligned && b15 === 'LONG', 3, 'All TF aligned LONG');
  a.hit(aligned && b15 === 'SHORT', 3, 'All TF aligned SHORT');
  a.hit(partial && b15 === 'LONG' && c.c > e15, 1.5, 'Primary alignment LONG');
  a.hit(partial && b15 === 'SHORT' && c.c < e15, 1.5, 'Primary alignment SHORT');
  a.hit(b15 === 'NEUTRAL' && S.regime === 'LOW' && S.spread > 0.3, -2, 'Dead water = no trade');
  a.hit(aligned && S.liq.sweptL && b15 === 'LONG', 1, 'Aligned + sweep = A+ long');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat42(S) {
  const out = [];
  const tf = T(S), i = tf.i, atr = S.atr15 || 1;
  const atrPct = S.atr15pct || 0;
  const streak = S.sigStreak || 0;

  let a = new AgentEval('42.1', 42, 'Per-Trade Risk Cap');
  a.hit(atrPct >= 0.0008 && atrPct <= 0.0045, 2, 'ATR% within 1% risk lane');
  a.hit(atrPct > 0.0045, -2, 'ATR% too wide for 1% risk');
  a.hit(S.spread > 0.5, -1.5, 'Spread tax > 0.5 = halve size');
  a.hit(S.spread > 0.15 && S.spread <= 0.5, -0.5, 'Elevated spread tax');
  a.hit(atrPct < 0.0008, -1, 'ATR% too tight = slippage trap');
  a.hit(S.spread / (atr || 1) > 0.3, -2, 'Spread consumes 30% of ATR edge');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('42.2', 42, 'Stop Distance Health');
  const slDist = S.sigSL ? Math.abs(S.sigSL - S.price) : atr * 1.1;
  const rr = S.sigRR || 0;
  a.hit(slDist > 0 && slDist <= atr * 1.5, 2, 'SL within 1.5 ATR');
  a.hit(slDist > atr * 1.5, -2, 'SL beyond 1.5 ATR');
  a.hit(rr >= 1.5 && rr <= 3.2, 1.5, 'R:R in 1.5–3.2 band');
  a.hit(rr > 3.2, -1, 'R:R fantasy = trap');
  a.hit(rr < 1.5 && rr > 0, -1.5, 'R:R too thin');
  a.hit(slDist < atr * 0.3, -1.5, 'SL inside noise = certain stop');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('42.3', 42, 'Loss Streak Protection');
  a.hit(streak <= -2, 2, 'Two losses: cut to 0.5% risk');
  a.hit(streak <= -4, 2.5, 'Four losses: stand down');
  a.hit(streak >= 0, 1, 'Neutral streak: 1% risk OK');
  a.hit(streak >= 3, 1, 'Three wins: hold (anti-martingale)');
  a.hit(streak <= -2 && S.regime === 'HIGH', 2, 'Losses + high vol: skip');
  a.hit(streak <= -2 && S.conf < 0.6, 1, 'Losses + weak conf: skip');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('42.4', 42, 'Max Risk Event Check');
  a.hit(S.forceLiq && S.forceLiq.count > 50 && Math.abs(S.forceLiq.netBuy) > 0.001 * S.price, -2, 'Forced-order cascade = no new risk');
  a.hit(S.liqVoids && S.liqVoids.length > 0 && S.forceLiq && S.forceLiq.count > 30, -1, 'Void + liq storm = skip');
  a.hit(S.newsHold ? false : true, -1, 'Held news risk flag');
  a.hit(S.obs1h && S.obs1h.bull && S.bias1h === 'SHORT' && S.liq.sweptH, -1, 'Counter OB + sweep = bad risk');
  a.hit(S.regime === 'HIGH' && atrPct > 0.004, -2, 'Whipsaw regime = stopped out');
  a.hit(S.spread > 1, -3, 'Sick spread: terminal mode');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('42.5', 42, 'Position Size Sanity');
  const notional = (S.balance || 10000) / (slDist || atr);
  a.hit(notional > 0 && notional * atrPct < 0.02, 1.5, 'Notional risk within 2%');
  a.hit(atrPct * 10 < 0.001, 1, 'Safe leverage headroom');
  a.hit(atrPct * 10 > 0.01, -1.5, 'Leverage stress > 1% notional');
  a.hit(S.oi && S.oi > 0 && S.oiDelta !== null && S.oiDelta > 0.05 && S.sigRR > 3, -1, 'OI pop + fantasy RR');
  a.hit(S.spread > 0.5 && notional > 0, -1, '50% size cut for wide spread');
  a.hit(S.tradeAggPct > 0.9 && S.tradeSeq > 15, -1, 'One-way tape = size cut');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('42.6', 42, 'Time Validity Risk');
  a.hit(S.sigAge !== null && S.sigAge <= 12, 2, 'Signal age within 12 min');
  a.hit(S.sigAge !== null && S.sigAge > 12, -2, 'Signal expired');
  a.hit(S.sigAge !== null && S.sigAge > 12 && S.sigStreak <= -2, 2, 'Expired + losing streak: skip');
  a.hit(S.sessions && S.sessions.isWeekend && S.regime === 'LOW', -1.5, 'Weekend dead tape');
  a.hit(S.sessions && S.sessions.minToLondon > 0 && S.sessions.minToLondon < 10, 0.5, 'Setup window pre-London');
  a.hit(S.sessions && S.sessions.isAsian && S.regime === 'LOW' && atrPct < 0.0012, -1, 'Asian snooze = chop risk');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('42.7', 42, 'Leverage Discipline');
  const lev = clamp10(S);
  a.hit(lev <= 10, 1.5, 'Leverage ≤ 10× mandate');
  a.hit(lev <= 3 && atrPct > 0.003, 2, 'Low lev on wide ATR');
  a.hit(lev >= 10 && atrPct > 0.0025, -2, 'Max lev + wide ATR = death');
  a.hit(lev >= 10 && S.regime === 'HIGH', -2, 'Max lev + high regime');
  a.hit(lev < 2 && atrPct < 0.0012, -1, 'Under-levered in dead tape');
  a.hit(S.forceLiq && S.forceLiq.count > 40 && lev > 5, -1.5, 'Liquidation storm + lev = skip');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('42.8', 42, 'Correlation Hedge Check');
  a.hit(S.corrBTC !== null && S.corrBTC > 0.7, 0.5, 'Correlated to BTC = macro beta');
  a.hit(S.corrBTC !== null && S.corrBTC < -0.5, -1, 'Inverse BTC beta = whip');
  a.hit(S.corrBTC !== null && Math.abs(S.corrBTC) < 0.2, 1, 'Isolated pawn move = technical');
  a.hit(S.basisPct !== null && S.basisPct > 0.05, -1, 'Heavy basis = crowded');
  a.hit(S.corrBTC !== null && S.corrBTC > 0.9 && S.regime === 'HIGH', -1, 'BTC-driven crash tape');
  a.hit(S.oiDelta !== null && S.oiDelta < -0.06 && S.sigAge !== null && S.sigAge < 5, 0.5, 'OI flush near signal = trap risk');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('42.9', 42, 'Risk Matrix Gate');
  const riskScore = (atrPct > 0.0045 ? 2 : 0) + (S.spread > 0.5 ? 2 : 0) + ((S.regime === 'HIGH') ? 1 : 0) + (streak <= -2 ? 2 : 0);
  a.hit(riskScore >= 3, -3, 'Risk matrix red: no trade');
  a.hit(riskScore === 2, -1.5, 'Risk matrix amber');
  a.hit(riskScore <= 1 && atrPct >= 0.0012 && atrPct <= 0.0035, 2, 'Risk matrix green');
  a.hit(S.spread > 0.5 && S.regime === 'HIGH' && S.forceLiq && S.forceLiq.count > 30, -3, 'Triple risk black swan');
  a.hit(S.sigSL && S.sigSL < S.price && S.bias15 === 'LONG', 1, 'SL below = sane');
  a.hit(S.sigSL && S.sigSL > S.price && S.bias15 === 'SHORT', 1, 'SL above = sane');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('42.10', 42, 'Final Risk Approval');
  const okay = atrPct >= 0.0008 && atrPct <= 0.0045 && S.spread < 0.5 && (S.regime !== 'HIGH' || atrPct < 0.004);
  a.hit(okay, 2.5, 'Baseline risk profile clean');
  a.hit(okay && S.spread < 0.15 && atrPct < 0.003, 1.5, 'Premium risk conditions');
  a.hit(!okay, -2.5, 'Baseline risk profile dirty');
  a.hit(S.sigRR >= 1.5 && S.sigRR <= 3, 1.5, 'RR approved');
  a.hit(streak <= -2 && !okay, -2, 'Losing streak + dirty profile');
  a.hit(streak >= 3 && okay, 1, 'Hot streak, clean profile');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function clamp10(S) { return Math.round(Math.min(10, Math.max(1, (1 / ((S.atr15pct || 0.002) * 10))) ) * 10) / 10; }

function cat43(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const sess = S.sessions || {};
  const h = utcHour(S);

  let a = new AgentEval('43.1', 43, 'Session Prime Time');
  a.hit(sess.isLondon && h >= 8 && h <= 11, 2, 'London prime (08–11 UTC)');
  a.hit(sess.isNY && h >= 13 && h <= 16, 2, 'NY prime (13–16 UTC)');
  a.hit(sess.isAsian && h >= 0 && h <= 4, 1, 'Asian range build');
  a.hit(sess.isWeekend, -2, 'Weekend dead tape');
  a.hit(h >= 21 || h <= 1, -1, 'Overnight thin book');
  a.hit(sess.isLondon && sess.isNY, 2, 'London–NY overlap');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('43.2', 43, 'Session Breakout Duty');
  a.hit(sess.isAsian && c.range < atr * 0.6 && c.c > i.ema21, 1.5, 'Asian tight + above EMA21 = London long');
  a.hit(sess.isAsian && c.range < atr * 0.6 && c.c < i.ema21, 1.5, 'Asian tight + below EMA21 = London short');
  a.hit(sess.isLondon && c.c > (sess.asianHigh || 0) && c.range > atr, 2, 'London breaks Asian high');
  a.hit(sess.isLondon && c.c < (sess.asianLow || 0) && c.range > atr, 2, 'London breaks Asian low');
  a.hit(sess.isNY && c.c > (sess.asianHigh || 0) && c.range > atr, 1.5, 'NY extends Asian breakout');
  a.hit(sess.isNY && S.regime === 'LOW' && c.range < atr * 0.5, -1, 'NY snooze = fade zone');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('43.3', 43, 'London Open Engine');
  const minL = sess.minToLondon !== undefined ? sess.minToLondon : 999;
  a.hit(minL > 0 && minL <= 30, 1.5, 'Pre-London positioning window');
  a.hit(minL > 0 && minL <= 5, 2, 'London ignition imminent');
  a.hit(minL > 30 && minL <= 120 && c.range < atr * 0.5, 1, 'Asian accumulation pre-London');
  a.hit(minL <= 0 && h >= 9 && h <= 12 && sess.name === 'London', 1, 'Mid-London continuation');
  a.hit(minL <= 0 && h >= 8 && h <= 9 && c.range > atr * 1.3, 1.5, 'London open impulse');
  a.hit(minL > 120 && S.regime === 'LOW' && sess.isAsian, 0.5, 'Long Asian quiet block');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('43.4', 43, 'NY Overlap Engine');
  const minNY = sess.minToNY !== undefined ? sess.minToNY : 999;
  a.hit(minNY > 0 && minNY <= 90 && h >= 11.5, 1.5, 'London→NY handoff window');
  a.hit(minNY <= 0 && h >= 13 && h <= 14, 1.5, 'NY open burst');
  a.hit(minNY <= 0 && h >= 14 && h <= 16, 1, 'NY core session');
  a.hit(h >= 16 && h <= 17, -0.5, 'NY close chop');
  a.hit(h >= 17, -1, 'Post-NY fade');
  a.hit(sess.isNY && S.forceLiq && S.forceLiq.count > 30, -1, 'NY liq storm = stand down');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('43.5', 43, 'Asian Range Matrix');
  const ah = sess.asianHigh, al = sess.asianLow;
  a.hit(ah && c.c > ah, 1.5, 'Above Asian high');
  a.hit(al && c.c < al, 1.5, 'Below Asian low');
  a.hit(ah && al && c.c > ah + atr * 0.5, 2, 'Stretched above Asian high');
  a.hit(ah && al && c.c < al - atr * 0.5, 2, 'Stretched below Asian low');
  a.hit(ah && al && c.c > al && c.c < ah, 0, 'Inside Asian range');
  a.hit(ah && al && S.liq.sweptH && c.c < ah, 1, 'Asian high swept + rejected');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('43.6', 43, 'Session Volume Profile');
  a.hit(S.vp && S.vp['15m'] && S.vp['15m'].poc && Math.abs(S.price - S.vp['15m'].poc) < atr * 0.5, 1.5, 'At 15m POC');
  a.hit(S.vp && S.vp['15m'] && S.vp['15m'].vah && c.c > S.vp['15m'].vah, 1, 'Above 15m VAH');
  a.hit(S.vp && S.vp['15m'] && S.vp['15m'].val && c.c < S.vp['15m'].val, 1, 'Below 15m VAL');
  a.hit(S.openingRange && S.openingRange.high && c.c > S.openingRange.high, 1.5, 'Above opening range');
  a.hit(S.openingRange && S.openingRange.low && c.c < S.openingRange.low, 1.5, 'Below opening range');
  a.hit(S.vp && S.vp['1h'] && S.vp['1h'].poc && Math.abs(S.price - S.vp['1h'].poc) > atr * 2, -1, 'Stretched from 1h POC');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('43.7', 43, 'Session Clock Discipline');
  a.hit(h >= 9 && h <= 16 && !sess.isWeekend, 1.5, 'Liquid trading day');
  a.hit(h < 7 || h > 20, -1, 'Illiquid clock hours');
  a.hit(sess.isWeekend && S.regime === 'LOW', -2, 'Weekend low vol = chop');
  a.hit(sess.isWeekend && S.forceLiq && S.forceLiq.count < 5, -1, 'Weekend skeleton market');
  a.hit(sess.isNY && S.takerRatio !== null && S.takerRatio > 0.55, 1, 'NY buyers in control');
  a.hit(S.sigAge !== null && S.sigAge > 8 && sess.isAsian, -1, 'Old signal in slow session');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('43.8', 43, 'Session Break Strategy');
  a.hit(sess.isLondon && S.liq.sweptL && c.bull && c.c > i.ema8, 2, 'London sweep-and-reclaim long');
  a.hit(sess.isNY && S.liq.sweptH && c.bear && c.c < i.ema8, 2, 'NY sweep-and-reject short');
  a.hit(sess.isAsian && S.liq.sweptL && c.bull && c.c > i.ema21, 1.5, 'Asian spring setup');
  a.hit(sess.isAsian && S.liq.sweptH && c.bear && c.c < i.ema21, 1.5, 'Asian trap setup');
  a.hit(sess.isLondon && c.range > atr * 2 && S.liq.sweptH, -1, 'London chased far high');
  a.hit(sess.isNY && c.range > atr * 2 && S.liq.sweptL, -1, 'NY flush far low');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('43.9', 43, 'Open Range & Gap Logic');
  const orH = S.openingRange && S.openingRange.high, orL = S.openingRange && S.openingRange.low;
  a.hit(orH && c.c > orH, 1.5, 'Above open range high');
  a.hit(orL && c.c < orL, 1.5, 'Below open range low');
  a.hit(orH && orL && c.c > orH && c.range > atr, 2, 'OR breakout with volume');
  a.hit(orH && orL && c.c < orL && c.range > atr, 2, 'OR breakdown with volume');
  a.hit(orH && orL && c.c > orH && S.liq.sweptH && c.bear, 1.5, 'OR fakeout high');
  a.hit(orH && orL && c.c < orL && S.liq.sweptL && c.bull, 1.5, 'OR fakeout low');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('43.10', 43, 'Session Final Timing');
  const prime = sess.isLondon || sess.isNY;
  a.hit(prime && !sess.isWeekend, 2, 'Prime session');
  a.hit(!prime && sess.isAsian && S.regime === 'LOW', -1, 'Sub-prime Asian low-vol');
  a.hit(prime && S.regime === 'LOW' && c.range > atr * 0.8, 1, 'Prime + waking up');
  a.hit(prime && S.liq.sweptL && c.bull, 1.5, 'Prime + bullish sweep context');
  a.hit(prime && S.takerRatio !== null && S.takerRatio < 0.4, 1, 'Prime + heavy selling pressure');
  a.hit(sess.isWeekend && Math.abs(S.forceLiq && S.forceLiq.netBuy || 0) > 2 * atr, -1.5, 'Weekend abnormal move');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat44(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;

  let a = new AgentEval('44.1', 44, 'Perp Discount/Premium');
  a.hit(S.basis !== null && S.basis > 0 && S.basis < atr * 0.3, 1.5, 'Healthy premium basis');
  a.hit(S.basis !== null && S.basis < 0 && S.basis > -atr * 0.3, 1.5, 'Healthy discount basis');
  a.hit(S.basis !== null && S.basis > atr * 0.8, -2, 'Extreme premium = bubble risk');
  a.hit(S.basis !== null && S.basis < -atr * 0.8, -2, 'Extreme discount = capitulation');
  a.hit(S.basisPct !== null && Math.abs(S.basisPct) < 0.01, 1, 'Basis near spot fair');
  a.hit(S.basis !== null && S.basis > 0 && c.bear, -1, 'Falling price into premium = squeeze');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('44.2', 44, 'Taker Flow Authority');
  a.hit(S.takerRatio !== null && S.takerRatio > 0.55 && c.bull, 2, 'Taker buyers + bull candle');
  a.hit(S.takerRatio !== null && S.takerRatio < 0.45 && c.bear, 2, 'Taker sellers + bear candle');
  a.hit(S.takerRatio !== null && S.takerRatio > 0.55 && c.bear, -1.5, 'Taker buyers vs falling price');
  a.hit(S.takerRatio !== null && S.takerRatio < 0.45 && c.bull, -1.5, 'Taker sellers vs rising price');
  a.hit(S.takerRatio !== null && S.takerRatio > 0.65 && S.funding > 0.0003, -1, 'Aggro longs + high funding');
  a.hit(S.takerRatio !== null && Math.abs(S.takerRatio - 0.5) < 0.02 && S.regime === 'LOW', 0.5, 'Even flow = chop');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('44.3', 44, 'OI Delta Read');
  a.hit(S.oiDelta !== null && S.oiDelta > 0.02 && c.bull, 1.5, 'New longs adding on rise');
  a.hit(S.oiDelta !== null && S.oiDelta > 0.02 && c.bear, -1.5, 'New longs trapped on drop');
  a.hit(S.oiDelta !== null && S.oiDelta < -0.02 && c.bull, 1.5, 'Shorts covering on rise');
  a.hit(S.oiDelta !== null && S.oiDelta < -0.02 && c.bear, -1.5, 'Longs fleeing on drop');
  a.hit(S.oiDelta !== null && Math.abs(S.oiDelta) < 0.005 && c.range < atr * 0.6, -1, 'Flat OI + quiet = no edge');
  a.hit(S.oiDelta !== null && S.oiDelta > 0.05 && S.funding > 0.0003 && c.bear, -2, 'Levered longs stacking into drop');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('44.4', 44, 'OI History Trend');
  a.hit(S.oiHist && S.oiHist.length >= 2 && S.oiHist[S.oiHist.length - 1] > S.oiHist[S.oiHist.length - 2] && c.bull, 1.5, 'OI uptrend + price up');
  a.hit(S.oiHist && S.oiHist.length >= 2 && S.oiHist[S.oiHist.length - 1] < S.oiHist[S.oiHist.length - 2] && c.bear, 1.5, 'OI downtrend + price down');
  a.hit(S.oiHist && S.oiHist.length >= 3 && S.oiHist[S.oiHist.length - 1] > Math.max(S.oiHist[S.oiHist.length - 3], S.oiHist[S.oiHist.length - 2]) && c.bear && S.funding > 0.0003, -1.5, 'OI top building into long squeeze');
  a.hit(S.oiHist && S.oiHist.length >= 2 && S.oiHist[S.oiHist.length - 1] < S.oiHist[S.oiHist.length - 2] && c.bull, 1, 'OI fall + price up = covering rally');
  a.hit(S.oiHist && S.oiHist.length >= 2 && S.oiHist[S.oiHist.length - 1] > S.oiHist[S.oiHist.length - 2] && c.bear && S.funding < -0.0003, -1.5, 'Short building into dip = continuation');
  a.hit(S.oi && S.oi > 0 && Math.abs(S.oiDelta) > 0.1, -1, 'OI swing wild = instability');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('44.5', 44, 'ADL & Basis Melt');
  a.hit(S.adl !== null && S.adl > 50 && c.bull, 1.5, 'ADL bullish + rising price');
  a.hit(S.adl !== null && S.adl < 50 && c.bear, 1.5, 'ADL bearish + falling price');
  a.hit(S.adl !== null && S.adl > 50 && c.bear, -1.5, 'ADL bullish vs falling price');
  a.hit(S.adl !== null && S.adl < 50 && c.bull, -1.5, 'ADL bearish vs rising price');
  a.hit(S.basisPct !== null && S.basisPct > 0.03 && S.adl > 60, -1, 'Premium + crowded ADL = unwind');
  a.hit(S.basisPct !== null && S.basisPct < -0.03 && S.adl < 40, -1, 'Discount + crowded ADL = short squeeze');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('44.6', 44, 'Whale Account Cluster');
  a.hit(S.lsTopAcc !== null && S.lsTopAcc > 1.5 && c.bear, 1.5, 'Top accounts net long facing dump');
  a.hit(S.lsTopAcc !== null && S.lsTopAcc < 0.67 && c.bull, 1.5, 'Top accounts net short facing rally');
  a.hit(S.lsTopAcc !== null && S.lsTopAcc > 1.5 && c.bull, -1, 'Top accounts long + price up = squeeze fuel');
  a.hit(S.lsTopAcc !== null && S.lsTopAcc < 0.67 && c.bear, -1, 'Top accounts short + price down = cascade fuel');
  a.hit(S.lsTopPos !== null && S.lsTopPos > 1.5 && S.lsTopAcc > 1.5 && S.funding > 0.0005, -2, 'Whales + retail long = knife');
  a.hit(S.lsTopPos !== null && S.lsTopPos < 0.67 && S.lsTopAcc < 0.67 && S.funding < -0.0005, -2, 'Whales + retail short = rocket');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('44.7', 44, 'Long/Short Retail Pulse');
  a.hit(S.lsGlobal !== null && S.lsGlobal > 0.6 && c.bear, 2, 'Retail long crowd meeting dump');
  a.hit(S.lsGlobal !== null && S.lsGlobal < 0.4 && c.bull, 2, 'Retail short crowd meeting rally');
  a.hit(S.lsGlobal !== null && S.lsGlobal > 0.6 && c.bull, -1.5, 'Retail longs + up = crowded');
  a.hit(S.lsGlobal !== null && S.lsGlobal < 0.4 && c.bear, -1.5, 'Retail shorts + down = crowded');
  a.hit(S.lsGlobal !== null && S.lsGlobal > 0.75 && S.takerRatio > 0.6, -2, 'Extreme retail long + aggro buying');
  a.hit(S.lsGlobal !== null && S.lsGlobal < 0.25 && S.takerRatio < 0.4, -2, 'Extreme retail short + aggro selling');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('44.8', 44, 'Funding vs Price Divergence');
  a.hit(S.funding !== null && S.funding > 0.0002 && S.bias15 === 'SHORT', 1.5, 'Longs pay, price falls = short fuel');
  a.hit(S.funding !== null && S.funding < -0.0002 && S.bias15 === 'LONG', 1.5, 'Shorts pay, price rises = long fuel');
  a.hit(S.funding !== null && S.funding > 0.0005 && c.bull, -2, 'Extreme funding + up = climax');
  a.hit(S.funding !== null && S.funding < -0.0005 && c.bear, -2, 'Extreme funding + down = capitulate');
  a.hit(S.fundingHist && S.fundingHist.length >= 3 && S.fundingHist[S.fundingHist.length - 1] > S.fundingHist[S.fundingHist.length - 3] && c.bear, 1, 'Funding rising while price falls');
  a.hit(S.funding !== null && S.funding > 0.001, -2.5, 'Funding melt > 0.1% = hazard');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('44.9', 44, 'Micro Corelate');
  a.hit(S.corrBTC !== null && S.corrBTC > 0.7 && S.tf && S.tf['1h'].i.rsi > 70, -1, 'BTC-hot + XAU overbought = pop');
  a.hit(S.corrBTC !== null && S.corrBTC < 0.3 && c.range > atr * 1.2 && S.takerRatio > 0.55, 1.5, 'Independent move with genuine flow');
  a.hit(S.basisPct !== null && S.basisPct > 0.02 && S.ads && S.ads.bid > S.ads.ask, -1, 'Premium + buy imbalance = nabbed');
  a.hit(S.adl !== null && Math.abs(S.adl - 50) < 5 && S.regime === 'LOW', 0.5, 'Neutral ADL + quiet = scalp OK');
  a.hit(S.lsTopAcc !== null && S.lsGlobal !== null && S.lsTopAcc > 1 && S.lsGlobal < 0.4 && c.bull, 1.5, 'Whales long vs retail short = smart money');
  a.hit(S.lsTopAcc !== null && S.lsGlobal !== null && S.lsTopAcc < 1 && S.lsGlobal > 0.6 && c.bear, 1.5, 'Whales short vs retail long = smart money');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('44.10', 44, 'Microstructure Verdict');
  const microBull = (S.takerRatio > 0.52 && S.oiDelta > -0.01 && S.funding < 0.0004) ? 1 : 0;
  const microBear = (S.takerRatio < 0.48 && S.oiDelta < 0.01 && S.funding > -0.0004) ? 1 : 0;
  a.hit(microBull && c.bull, 3, 'Bullish microstructure + price');
  a.hit(microBear && c.bear, 3, 'Bearish microstructure + price');
  a.hit(microBull && c.bear, -1.5, 'Bullish microstructure vs price');
  a.hit(microBear && c.bull, -1.5, 'Bearish microstructure vs price');
  a.hit(microBull && microBear, -1, 'Micro contradiction');
  a.hit(S.forceLiq && Math.abs(S.forceLiq.netBuy) > 0.0005 * S.price, -2, 'Forced order imbalance = chaos');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat45(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const f = S.funding;
  const fh = S.fundingHist || [];

  let a = new AgentEval('45.1', 45, 'Funding Rate Equilibrium');
  a.hit(f !== null && Math.abs(f) < 0.0001, 1.5, 'Funding neutral');
  a.hit(f !== null && f > 0.0001 && f <= 0.0003, 1, 'Mild long funding');
  a.hit(f !== null && f < -0.0001 && f >= -0.0003, 1, 'Mild short funding');
  a.hit(f !== null && Math.abs(f) > 0.0005, -2, 'Funding extreme both ways');
  a.hit(f !== null && Math.abs(f) < 0.00005 && c.range < atr * 0.5, 0.5, 'Flat funding + quiet = balanced');
  a.hit(f !== null && f > 0.0003 && S.regime === 'HIGH', -1.5, 'Positive funding during high vol');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('45.2', 45, 'Funding Crowding Detection');
  a.hit(f !== null && f > 0.0003 && S.bias15 === 'SHORT', 2, 'Crowded longs vs bear bias');
  a.hit(f !== null && f < -0.0003 && S.bias15 === 'LONG', 2, 'Crowded shorts vs bull bias');
  a.hit(f !== null && f > 0.0003 && c.bull, -2, 'Crowded longs + up = fuel spent');
  a.hit(f !== null && f < -0.0003 && c.bear, -2, 'Crowded shorts + down = fuel spent');
  a.hit(f !== null && f > 0.0005 && c.range > atr * 1.5, -1.5, 'Long crowd + expansion = squeeze risk');
  a.hit(f !== null && Math.abs(f) <= 0.0001 && S.liq.sweptL, 1, 'Neutral funding + sweep = spring ready');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('45.3', 45, 'Funding Trend');
  const ft = fh.length >= 2 ? fh[fh.length - 1] - fh[fh.length - 2] : 0;
  a.hit(ft > 0.00005 && c.bear, 1.5, 'Funding rising while price falls');
  a.hit(ft < -0.00005 && c.bull, 1.5, 'Funding falling while price rises');
  a.hit(ft > 0.00005 && c.bull, -1, 'Funding rising with price = long crowding');
  a.hit(ft < -0.00005 && c.bear, -1, 'Funding falling with price = short crowding');
  a.hit(ft === 0 && Math.abs(f) < 0.0001, 0.5, 'Funding flatlined');
  a.hit(ft > 0.0002 || ft < -0.0002, -1.5, 'Funding flipping hard = instability');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('45.4', 45, 'Funding & OI Combos');
  a.hit(f !== null && f > 0.0003 && S.oiDelta !== null && S.oiDelta > 0.03, -2, 'Funding up + OI up = stacked longs');
  a.hit(f !== null && f < -0.0003 && S.oiDelta !== null && S.oiDelta < -0.03, -1.5, 'Funding down + OI down = short cover');
  a.hit(f !== null && f > 0.0003 && S.oiDelta !== null && S.oiDelta < -0.03 && c.bear, 2, 'Funding high + OI falling + price down = flush');
  a.hit(f !== null && f < -0.0003 && S.oiDelta !== null && S.oiDelta > 0.03 && c.bull, 2, 'Funding low + OI rising + price up = squeeze');
  a.hit(f !== null && Math.abs(f) < 0.0001 && S.oiDelta !== null && Math.abs(S.oiDelta) < 0.01 && c.range < atr * 0.5, -1, 'No commitment anywhere');
  a.hit(f !== null && Math.abs(f) > 0.0008, -2.5, 'Funding catastrophe zone');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('45.5', 45, 'Funding & L/S Stack');
  a.hit(f !== null && f > 0.0003 && S.lsGlobal !== null && S.lsGlobal > 0.6, -2, 'Long funding + retail long = knife');
  a.hit(f !== null && f > 0.0003 && S.lsGlobal !== null && S.lsGlobal < 0.4 && c.bull, 1.5, 'Long funding, retail short, price up = squeeze');
  a.hit(f !== null && f < -0.0003 && S.lsGlobal !== null && S.lsGlobal < 0.4, -2, 'Short funding + retail short = rocket risk');
  a.hit(f !== null && f < -0.0003 && S.lsGlobal !== null && S.lsGlobal > 0.6 && c.bear, 1.5, 'Short funding, retail long, price down = cascade');
  a.hit(f !== null && S.lsTopAcc !== null && f > 0.0003 && S.lsTopAcc > 1.5, -1.5, 'Whales long + positive funding');
  a.hit(f !== null && S.lsTopAcc !== null && f < -0.0003 && S.lsTopAcc < 0.67, -1.5, 'Whales short + negative funding');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('45.6', 45, 'Funding Fade & Reversal');
  a.hit(f !== null && f > 0.0005 && c.bull && c.c < i.ema21, 2, 'Extreme funding + price below EMA21 = fade');
  a.hit(f !== null && f < -0.0005 && c.bear && c.c > i.ema21, 2, 'Extreme funding + price above EMA21 = fade');
  a.hit(f !== null && f > 0.0005 && S.liq.sweptH && c.bear, 2.5, 'Funding + swept high + reject = top');
  a.hit(f !== null && f < -0.0005 && S.liq.sweptL && c.bull, 2.5, 'Funding + swept low + reclaim = bottom');
  a.hit(f !== null && f > 0.0005 && S.bias1h === 'LONG', -1, 'Extreme funding + 1h long = late');
  a.hit(f !== null && f < -0.0005 && S.bias1h === 'SHORT', -1, 'Extreme funding + 1h short = late');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('45.7', 45, 'Funding Historical Pattern');
  const fMax = fh.length ? Math.max(...fh) : 0, fMin = fh.length ? Math.min(...fh) : 0;
  a.hit(fMax > 0.0008 && f !== null && f < fMax * 0.5, 1.5, 'Funding unwinding from top');
  a.hit(fMin < -0.0008 && f !== null && f > fMin * 0.5, 1.5, 'Funding unwinding from bottom');
  a.hit(fMax > 0.0008 && f !== null && f > fMax * 0.8, -2, 'Funding pinned at historical top');
  a.hit(fMin < -0.0008 && f !== null && f < fMin * 0.8, -2, 'Funding pinned at historical bottom');
  a.hit(fh.length >= 8 && Math.abs(fh[fh.length - 1]) < Math.abs(fh[0]) * 0.3 && Math.abs(f) < 0.0001, 1, 'Funding mean-reverting to zero');
  a.hit(fh.length >= 8 && Math.abs(fh[fh.length - 1]) > Math.abs(fh[0]) * 1.5, -1, 'Funding expanding trend');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('45.8', 45, 'Funding & Forced Orders');
  a.hit(f !== null && f > 0.0004 && S.forceLiq && S.forceLiq.netBuy < 0, 1.5, 'Long-funded + long liquidation');
  a.hit(f !== null && f < -0.0004 && S.forceLiq && S.forceLiq.netBuy > 0, 1.5, 'Short-funded + short liquidation');
  a.hit(f !== null && f > 0.0004 && S.forceLiq && S.forceLiq.netBuy > 0 && c.bull, -1.5, 'Long-funded + forced buyers = squeeze top');
  a.hit(f !== null && f < -0.0004 && S.forceLiq && S.forceLiq.netBuy < 0 && c.bear, -1.5, 'Short-funded + forced sellers = flush bottom');
  a.hit(f !== null && Math.abs(f) < 0.0001 && S.forceLiq && S.forceLiq.count > 50, -1, 'Burst liqs without funding skew');
  a.hit(f !== null && f > 0.0005 && S.forceLiq && S.forceLiq.count > 50, -2, 'Funding extreme + cascade = halt');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('45.9', 45, 'Funding Positioning');
  a.hit(f !== null && f >= -0.0001 && f <= 0.0001 && S.takerRatio !== null && S.takerRatio > 0.55 && c.bull, 1.5, 'Neutral funding + organic buyers');
  a.hit(f !== null && f >= -0.0001 && f <= 0.0001 && S.takerRatio !== null && S.takerRatio < 0.45 && c.bear, 1.5, 'Neutral funding + organic sellers');
  a.hit(f !== null && f > 0.0002 && S.takerRatio !== null && S.takerRatio > 0.55 && c.bull, -1.5, 'Paid longs + aggro buyers = late');
  a.hit(f !== null && f < -0.0002 && S.takerRatio !== null && S.takerRatio < 0.45 && c.bear, -1.5, 'Paid shorts + aggro sellers = late');
  a.hit(f !== null && f > 0.0002 && S.basisPct !== null && S.basisPct > 0.02 && c.bull, -1.5, 'Premium + funding + up = froth');
  a.hit(f !== null && f < -0.0002 && S.basisPct !== null && S.basisPct < -0.02 && c.bear, -1.5, 'Discount + funding + down = panic');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('45.10', 45, 'Funding Final Gate');
  const safe = f !== null && Math.abs(f) < 0.0005;
  a.hit(safe, 2, 'Funding gate clean');
  a.hit(!safe, -3, 'Funding gate fails');
  a.hit(f !== null && Math.abs(f) < 0.0001 && S.bias15 === 'LONG' && c.c > i.ema8, 1.5, 'Neutral funding + bull structure');
  a.hit(f !== null && Math.abs(f) < 0.0001 && S.bias15 === 'SHORT' && c.c < i.ema8, 1.5, 'Neutral funding + bear structure');
  a.hit(f !== null && Math.abs(f) > 0.0005 && Math.abs(S.sigSL ? S.sigSL - S.price : 0) < atr * 0.5, -1.5, 'Extreme funding + tight SL = squeeze out');
  a.hit(f !== null && f > 0.0005 && S.liq.sweptL, 1.5, 'Extreme funding + swept low = long squeeze fuel');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat46(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const pv = S.prevVotes || { long: 350, short: 300, neutral: 50 };
  const conf = S.conf || 0.55;

  let a = new AgentEval('46.1', 46, 'Consensus Strength');
  a.hit(pv.long >= 251, 2.5, 'Long quorum met');
  a.hit(pv.short >= 251, 2.5, 'Short quorum met');
  a.hit(pv.long < 251 && pv.short < 251, -2.5, 'No quorum');
  a.hit(conf >= 0.55 && conf < 0.65, 1, 'Confidence marginal');
  a.hit(conf >= 0.65, 2.5, 'Confidence strong');
  a.hit(pv.long > 400 || pv.short > 400, 1.5, 'Super-quorum');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('46.2', 46, 'Confluence Depth');
  const cons = [S.rsiDivBull, S.rsiDivBear, S.macdDivBull, S.macdDivBear, S.cvdDivBull, S.cvdDivBear].filter(Boolean).length;
  a.hit(cons >= 3, 2, '3+ divergence confirmations');
  a.hit(cons >= 5, 1, '5+ divergence confirmations');
  a.hit(S.liq.sweptL && S.rsiDivBull && S.bias15 === 'LONG', 2.5, 'Sweep + RSI div + bias');
  a.hit(S.liq.sweptH && S.rsiDivBear && S.bias15 === 'SHORT', 2.5, 'Sweep + RSI div + bias');
  a.hit(S.obs && S.obs.bull && S.price > S.obs.bull.low && S.bias15 === 'LONG', 1.5, 'OB + bias alignment');
  a.hit(S.fvgs && S.fvgs.bull && S.price > S.fvgs.bull && S.bias15 === 'LONG', 1, 'FVG + bias alignment');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('46.3', 46, 'Signal Compiler Sanity');
  a.hit(S.sigSL && S.sigTP && S.sigSL < S.sigTP && S.bias15 === 'LONG', 2, 'SL/TP geometry sane long');
  a.hit(S.sigSL && S.sigTP && S.sigSL > S.sigTP && S.bias15 === 'SHORT', 2, 'SL/TP geometry sane short');
  a.hit(S.sigRR && S.sigRR >= 1.5, 1.5, 'Compiler RR meets floor');
  a.hit(S.sigRR && S.sigRR > 3.5, -1.5, 'Compiler RR out of bounds');
  a.hit(S.sigSL && S.sigAge !== null && S.sigAge > 12, -2, 'Compiled signal expired');
  a.hit(S.sigSL && Math.abs(S.sigSL - S.price) > atr * 3, -2, 'Compiler SL beyond 3 ATR');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('46.4', 46, 'Divergence Compiler');
  a.hit(S.rsiDivBull && S.cciDivBull && S.macdDivBull, 2.5, 'Triple oscillator bull div');
  a.hit(S.rsiDivBear && S.cciDivBear && S.macdDivBear, 2.5, 'Triple oscillator bear div');
  a.hit(S.rsiDivBull && S.cvdDivBull, 2, 'Price + volume bull div');
  a.hit(S.rsiDivBear && S.cvdDivBear, 2, 'Price + volume bear div');
  a.hit(S.rsiDivBull && S.bias1h === 'SHORT', -1, 'Bull div vs HTF bear');
  a.hit(S.rsiDivBear && S.bias1h === 'LONG', -1, 'Bear div vs HTF bull');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('46.5', 46, 'Volatility Sanity Compiler');
  a.hit(S.atr15pct >= 0.0008 && S.atr15pct <= 0.0045, 2, 'ATR% gate acceptable');
  a.hit(S.atr15pct < 0.0008 || S.atr15pct > 0.0045, -2, 'ATR% gate fails');
  a.hit(S.spread < 0.15, 1.5, 'Spread gate acceptable');
  a.hit(S.spread >= 0.15, -1.5, 'Spread gate fails');
  a.hit(S.regime === 'HIGH' && S.atr15pct > 0.0035, -1.5, 'High regime + wide ATR = chop');
  a.hit(S.regime === 'LOW' && S.atr15pct < 0.001, -1, 'Low regime + tight ATR = dead');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('46.6', 46, 'Entry Zone Geometry');
  const zL = S.entryZone ? S.entryZone.low : null, zH = S.entryZone ? S.entryZone.high : null;
  a.hit(zL && zH && zH - zL > 0 && zH - zL <= atr * 0.8, 1.5, 'Entry zone width ≤ 0.8 ATR');
  a.hit(zL && zH && zH - zL > atr * 1.5, -1.5, 'Entry zone too wide');
  a.hit(zL && zH && S.price >= zL && S.price <= zH, 1.5, 'Price inside entry zone');
  a.hit(zL && zH && S.idealEntry && Math.abs(S.idealEntry - S.price) <= atr * 0.5, 1, 'Ideal entry within reach');
  a.hit(zL && zH && S.bias15 === 'LONG' && S.idealEntry && S.idealEntry < S.price, 1, 'Long entry below market = limit');
  a.hit(zL && zH && S.bias15 === 'SHORT' && S.idealEntry && S.idealEntry > S.price, 1, 'Short entry above market = limit');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('46.7', 46, 'Compiler Cross-Check');
  a.hit(pv.long >= 251 && S.rsiDivBull && S.bias15 === 'LONG', 3, 'Bull consensus + div + bias');
  a.hit(pv.short >= 251 && S.rsiDivBear && S.bias15 === 'SHORT', 3, 'Bear consensus + div + bias');
  a.hit(pv.long >= 251 && S.liq.sweptL && c.bull, 2.5, 'Bull consensus + sweep + candle');
  a.hit(pv.short >= 251 && S.liq.sweptH && c.bear, 2.5, 'Bear consensus + sweep + candle');
  a.hit(pv.long >= 251 && S.oiDelta !== null && S.oiDelta < -0.03, 1, 'Bull consensus + OI flush');
  a.hit(pv.short >= 251 && S.oiDelta !== null && S.oiDelta > 0.03, 1, 'Bear consensus + OI build');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('46.8', 46, 'Signal Age Compiler');
  a.hit(S.sigAge !== null && S.sigAge <= 3, 1.5, 'Signal fresh (< 3 min)');
  a.hit(S.sigAge !== null && S.sigAge > 3 && S.sigAge <= 12, 1, 'Signal usable');
  a.hit(S.sigAge !== null && S.sigAge > 12, -2.5, 'Signal stale');
  a.hit(S.sigAge !== null && S.sigAge > 12 && pv.long >= 251, -1.5, 'Stale bull consensus');
  a.hit(S.sigAge !== null && S.sigAge > 12 && pv.short >= 251, -1.5, 'Stale bear consensus');
  a.hit(S.sigAge !== null && S.sigAge <= 1 && c.range > atr * 1.5, 1, 'Flash signal with impulse');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('46.9', 46, 'Quality Score Build');
  const q = Math.round((conf * 100) + (pv.long >= 251 || pv.short >= 251 ? 30 : 0) + (S.sigRR ? S.sigRR * 40 : 0));
  a.hit(q >= 180, 2.5, 'Quality ≥ 180/1000 scale');
  a.hit(q >= 220, 1, 'Quality ≥ 220');
  a.hit(q < 150, -2, 'Quality weak');
  a.hit(S.liqVoids && S.liqVoids.length !== 0 && S.bias15 === 'LONG', 1, 'Void below = draw');
  a.hit(S.liqVoids && S.liqVoids.length !== 0 && S.bias15 === 'SHORT', 1, 'Void above = draw');
  a.hit(S.imbalance && S.imbalance.to !== 'NEUTRAL' && S.imbalance.to === 'BULL', 1, 'Imbalance net bull');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('46.10', 46, 'Final Compiler Verdict');
  const bullOK = pv.long >= 251 && conf >= 0.55 && S.sigRR >= 1.5;
  const bearOK = pv.short >= 251 && conf >= 0.55 && S.sigRR >= 1.5;
  a.hit(bullOK, 3, 'Compiler verdict LONG');
  a.hit(bearOK, 3, 'Compiler verdict SHORT');
  a.hit(pv.long < 251 && pv.short < 251, -3, 'Compiler verdict NO TRADE');
  a.hit(bullOK && S.spread > 0.5, -1.5, 'Compiler long vs wide spread');
  a.hit(bearOK && S.spread > 0.5, -1.5, 'Compiler short vs wide spread');
  a.hit(pv.long >= 251 && pv.short >= 251 && conf < 0.6, -2, 'Split crowd = no trade');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat47(S) {
  const out = [];
  const meta = S.meta || {};
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;

  let a = new AgentEval('47.1', 47, 'Data Freshness Monitor');
  a.hit(meta.lastFull !== undefined && Date.now() - meta.lastFull <= 60000, 2, 'Full data cycle fresh');
  a.hit(meta.lastFull !== undefined && Date.now() - meta.lastFull > 60000, -2, 'Full data cycle stale');
  a.hit(meta.wsConnected, 1.5, 'WS streams connected');
  a.hit(!meta.wsConnected, -1.5, 'WS streams down');
  a.hit(meta.lastTrade !== undefined && Date.now() - meta.lastTrade <= 10000, 1, 'Trade tape live');
  a.hit(meta.lastBook !== undefined && Date.now() - meta.lastBook <= 15000, 1, 'Book fresh');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('47.2', 47, 'API Health Check');
  a.hit(meta.apiOk, 2, 'API responsive');
  a.hit(!meta.apiOk, -3, 'API failing');
  a.hit(meta.cooldown, -2, 'API cooldown active');
  a.hit(meta.failedCount > 5, -2, 'Repeated API failures');
  a.hit(meta.failedCount === 0 && meta.apiOk, 1, 'Zero failures');
  a.hit(meta.rateLimited, -2, 'Rate limited');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('47.3', 47, 'Cycle Latency Guard');
  a.hit(meta.cycleMs !== undefined && meta.cycleMs < 3000, 1.5, 'Cycle latency under 3s');
  a.hit(meta.cycleMs !== undefined && meta.cycleMs > 8000, -2, 'Cycle latency over 8s');
  a.hit(meta.wsLag !== undefined && meta.wsLag < 2000, 1, 'WS lag acceptable');
  a.hit(meta.wsLag !== undefined && meta.wsLag > 6000, -2, 'WS lag severe');
  a.hit(meta.reconnects > 3, -1.5, 'Reconnect storm');
  a.hit(meta.cycleMs !== undefined && meta.cycleMs < 1000 && meta.apiOk, 0.5, 'Healthy fast cycle');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('47.4', 47, 'Interpolation Guard');
  a.hit(meta.interpRatio !== undefined && meta.interpRatio < 0.1, 1.5, 'Data interpolation minimal');
  a.hit(meta.interpRatio !== undefined && meta.interpRatio > 0.3, -2, 'Heavy interpolation = stale');
  a.hit(c.range > 0 ? (meta.lastCandleAge !== undefined && meta.lastCandleAge <= 60000) : false, 1, 'Last candle within 60s');
  a.hit(meta.lastCandleAge !== undefined && meta.lastCandleAge > 120000, -2, 'Candle data ancient');
  a.hit(meta.klineFresh !== undefined ? !meta.klineFresh : false, -1, 'Kline refresh lagging');
  a.hit(meta.votesRecount !== undefined ? meta.votesRecount : false, 1, 'Vote recount done');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('47.5', 47, 'System Cooldown State');
  a.hit(meta.cooldownUntil !== undefined && meta.cooldownUntil > Date.now(), -2, 'System in cooldown');
  a.hit(meta.cooldownUntil === undefined || meta.cooldownUntil <= Date.now(), 1.5, 'No cooldown');
  a.hit(meta.apiOk && !meta.paused, 1.5, 'System live');
  a.hit(meta.paused, -1.5, 'Swarm paused');
  a.hit(meta.failedCount > 3 && meta.cooldown, -2, 'Failing + cooling = degraded');
  a.hit(meta.apiOk && meta.failedCount === 0, 1, 'Clean operational state');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('47.6', 47, 'Alert & Signal History');
  a.hit(meta.historyCount !== undefined && meta.historyCount < 25, 1, 'History buffer healthy');
  a.hit(meta.historyCount !== undefined && meta.historyCount > 100, -1, 'History memory bloat');
  a.hit(meta.audioOn, 0.5, 'Audio alerts armed');
  a.hit(meta.lastSignalAt !== undefined && (Date.now() - meta.lastSignalAt) < 120000, 1, 'Recurring signal cadence');
  a.hit(meta.lastSignalAt !== undefined && (Date.now() - meta.lastSignalAt) > 3600000 && (pvL(S) < 251), 0.5, 'Long quiet = not forcing');
  a.hit(meta.forceDir === 'LONG', 0.5, 'Force-scan LONG active');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('47.7', 47, 'Process Monitor');
  a.hit(meta.heapMB !== undefined && meta.heapMB < 300, 1, 'Memory healthy');
  a.hit(meta.heapMB !== undefined && meta.heapMB > 800, -2, 'Memory balloon');
  a.hit(meta.uptime !== undefined && meta.uptime > 600000, 1, 'Long-lived process');
  a.hit(meta.uptime !== undefined && meta.uptime < 30000, -1, 'Just booted = warmup');
  a.hit(meta.evalMs !== undefined && meta.evalMs < 500, 1, 'Swarm eval fast');
  a.hit(meta.evalMs !== undefined && meta.evalMs > 3000, -1.5, 'Swarm eval slow');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('47.8', 47, 'Currency of Assumptions');
  a.hit(S.tf && S.tf['1m'].candles.length > 50, 1.5, '1m dataset deep');
  a.hit(S.tf && S.tf['1d'] && S.tf['1d'].candles.length > 30, 1.5, '1d dataset deep');
  a.hit(S.swings15 && (S.swings15.sh.length + S.swings15.sl.length) > 3, 1, 'Swing map populated');
  a.hit(S.vp && S.vp['15m'] && S.vp['15m'].poc !== undefined, 1, 'VP populated');
  a.hit(S.obs && (S.obs.bull || S.obs.bear), 1, 'OB map populated');
  a.hit(S.liqVoids && S.liqVoids.length, 1, 'Void map populated');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('47.9', 47, 'Operational Discipline');
  a.hit(meta.apiOk && meta.wsConnected && !meta.paused, 2.5, 'All systems nominal');
  a.hit(meta.apiOk && !meta.wsConnected, -1.5, 'REST ok but WS down');
  a.hit(!meta.apiOk && meta.wsConnected, -1.5, 'WS ok but REST down');
  a.hit(meta.rateLimited === false && meta.apiOk, 1, 'No rate limit pressure');
  a.hit(meta.failedCount > 10, -2.5, 'Failure runaway');
  a.hit(meta.apiRecheckAt !== undefined && meta.apiRecheckAt < Date.now() && meta.apiOk, 1.5, 'API verified this window');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('47.10', 47, 'Ops Final Readiness');
  const ready = meta.apiOk && meta.wsConnected && !meta.paused && (meta.uptime === undefined || meta.uptime > 20000);
  a.hit(ready, 3, 'Ops ready');
  a.hit(!ready, -3, 'Ops not ready');
  a.hit(meta.bootPhase >= 6, 1.5, 'Boot phases complete');
  a.hit(meta.bootPhase < 6, -1.5, 'Still booting');
  a.hit(meta.apiOk && S.price > 0 && S.atr15 > 0, 1.5, 'Core data sane');
  a.hit(meta.warnCount !== undefined && meta.warnCount > 10, -1, 'Warning storm');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function pvL(S) { const p = S.prevVotes || {}; return p.long || 0; }

function cat48(S) {
  const out = [];
  const ui = S.ui || {};
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const h = utcHour(S);

  let a = new AgentEval('48.1', 48, 'Command Interpreter');
  a.hit(ui.lastKey === 'R', 1.5, 'Force refresh commanded');
  a.hit(ui.lastKey === 'S' && ui.audio, 1, 'Audio toggled on');
  a.hit(ui.lastKey === 'S' && !ui.audio, -1, 'Audio toggled off');
  a.hit(ui.lastKey === 'C', 1, 'History cleared');
  a.hit(ui.lastKey === 'Q', -2, 'Quit requested = stand down');
  a.hit(ui.lastKey === '?', 0.5, 'Help requested');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('48.2', 48, 'Force Bias Command');
  a.hit(ui.force === 'LONG' && S.bias15 === 'LONG', 1.5, 'Force long agrees with bias');
  a.hit(ui.force === 'SHORT' && S.bias15 === 'SHORT', 1.5, 'Force short agrees with bias');
  a.hit(ui.force === 'LONG' && S.bias15 === 'SHORT', -2, 'Force long vs bear bias');
  a.hit(ui.force === 'SHORT' && S.bias15 === 'LONG', -2, 'Force short vs bull bias');
  a.hit(ui.force === 'LONG' && pvL(S) < 251, -1, 'Force long vs no quorum');
  a.hit(ui.force === 'SHORT' && pvS(S) < 251, -1, 'Force short vs no quorum');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('48.3', 48, 'Pause/Resume Logic');
  a.hit(ui.paused, -2, 'Swarm paused = no votes');
  a.hit(!ui.paused, 2, 'Swarm live');
  a.hit(ui.paused && c.range > atr * 2, -1, 'Missed move while paused');
  a.hit(!ui.paused && ui.lastKey === ' ', 1, 'Resumed after pause');
  a.hit(ui.paused && S.regime === 'HIGH', 0.5, 'Pause during chaos = wise');
  a.hit(!ui.paused && h >= 8 && h <= 16, 1, 'Live in prime hours');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('48.4', 48, 'Display Integrity');
  a.hit(ui.fullscreen, 0.5, 'Fullscreen terminal');
  a.hit(ui.hideHelp !== undefined ? !ui.hideHelp : true, 0.5, 'Help layer visible');
  a.hit(ui.showVotes, 1, 'Vote breakdown visible');
  a.hit(!ui.showVotes, -1, 'Vote breakdown hidden');
  a.hit(ui.showGates, 1, 'Gates visible');
  a.hit(!ui.showGates, -1, 'Gates hidden');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('48.5', 48, 'Keyboard Safety Bindings');
  a.hit(ui.lastKey === 'Q' && h >= 17 && h <= 21, 1, 'Quit in dead hours = OK');
  a.hit(ui.lastKey === 'Q' && h >= 8 && h <= 16, -1, 'Quit in prime hours = caution');
  a.hit(ui.lastKey === 'R' && metaCooldownActive(S), -1, 'Refresh during cooldown');
  a.hit(ui.lastKey === 'P', 0.5, 'Screenshot requested');
  a.hit(ui.lastKey === 'F', 0.5, 'Fullscreen toggled');
  a.hit(ui.lastKey === 'L' && S.bias15 === 'SHORT' && c.bear, -1.5, 'Forced long scan on bear tape');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('48.6', 48, 'Command Cadence');
  a.hit(ui.keysLastMin !== undefined && ui.keysLastMin < 10, 1, 'Calm key rate');
  a.hit(ui.keysLastMin !== undefined && ui.keysLastMin > 40, -1.5, 'Key mashing detected');
  a.hit(ui.lastKey === 'H' && pvS(S) >= 251, 1, 'Force short aligns');
  a.hit(ui.lastKey === 'H' && pvL(S) >= 251, -1.5, 'Force short vs bull quorum');
  a.hit(ui.lastKey === 'S' && S.regime === 'HIGH', 0.5, 'Audio on during high vol');
  a.hit(ui.lastKey === 'C' && S.sigAge !== null && S.sigAge < 12, -1, 'Cleared active signal');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('48.7', 48, 'Interface Feedback');
  a.hit(ui.lastKey === 'R' && metaLastFullAge(S) < 5000, 1.5, 'Refresh executed');
  a.hit(ui.lastKey === 'R' && metaLastFullAge(S) > 60000, -2, 'Refresh failed');
  a.hit(ui.lastKey === null || ui.lastKey === undefined, 0.5, 'Idle interface');
  a.hit(ui.lastKey === 'Q', 0, 'Confirm quit flow');
  a.hit(ui.errorCount !== undefined && ui.errorCount > 5, -1.5, 'UI errors stacking');
  a.hit(ui.renderedAt !== undefined && (Date.now() - ui.renderedAt) < 11000, 1, 'UI rendering current');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('48.8', 48, 'Semantic Commands');
  a.hit(ui.voiceCmd === 'long' && S.bias15 === 'LONG', 1, 'Voice long agrees');
  a.hit(ui.voiceCmd === 'short' && S.bias15 === 'SHORT', 1, 'Voice short agrees');
  a.hit(ui.voiceCmd === 'pause', -1.5, 'Voice paused swarm');
  a.hit(ui.voiceCmd === 'resume', 1.5, 'Voice resumed swarm');
  a.hit(ui.voiceCmd === 'clear' && S.sigAge !== null && S.sigAge < 5, -1, 'Voice cleared fresh signal');
  a.hit(ui.scanAll, 1, 'Full sweep commanded');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('48.9', 48, 'Operator State Mirror');
  a.hit(ui.operatorAway, -1, 'Operator away = skip');
  a.hit(ui.operatorAway === false, 1, 'Operator present');
  a.hit(ui.sessionMinutes !== undefined && ui.sessionMinutes > 300, 0.5, 'Long session = fatigue risk');
  a.hit(ui.sessionMinutes !== undefined && ui.sessionMinutes > 720, -1, 'Extended session = fatigue');
  a.hit(ui.lastInteraction !== undefined && (Date.now() - ui.lastInteraction) > 600000, -1, 'No recent interaction');
  a.hit(ui.lastInteraction !== undefined && (Date.now() - ui.lastInteraction) <= 60000, 0.5, 'Active operator');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('48.10', 48, 'Interface Final State');
  const voiceOK = !ui.paused && ui.operatorAway !== true;
  a.hit(voiceOK, 2, 'Interactive state healthy');
  a.hit(!voiceOK, -2, 'Interactive state blocked');
  a.hit(ui.force !== undefined && ui.force !== null, 0.5, 'Force mode engaged');
  a.hit(ui.audio && S.sigStreak >= 3, 0.5, 'Audio on hot streak');
  a.hit(ui.showGates && ui.showVotes, 1, 'Transparency panels on');
  a.hit(ui.lastKey === 'Q' || ui.quit, -2.5, 'Quit flag = stand down');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function metaLastFullAge(S) { const m = S.meta || {}; return m.lastFull !== undefined ? Date.now() - m.lastFull : 999999; }
function metaCooldownActive(S) { const m = S.meta || {}; return m.cooldownUntil !== undefined && m.cooldownUntil > Date.now(); }
function pvS(S) { const p = S.prevVotes || {}; return p.short || 0; }

function cat49(S) {
  const out = [];
  const meta = S.meta || {};
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;

  let a = new AgentEval('49.1', 49, 'API Failure Recovery');
  a.hit(meta.failedCount > 3, -2.5, 'Failure streak detected');
  a.hit(meta.failedCount > 3 && meta.cooldown, 1, 'Cooldown engaged correctly');
  a.hit(meta.failedCount > 3 && !meta.cooldown, -2, 'Failing without cooldown');
  a.hit(meta.apiOk && meta.failedCount <= 3, 2, 'Recovered clean');
  a.hit(meta.lastError && meta.lastError.includes('429'), -2, 'Rate-limit error present');
  a.hit(meta.lastError && meta.lastError.includes('timeout'), -1.5, 'Timeout errors present');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('49.2', 49, 'Stale Data Override');
  a.hit(meta.lastFull !== undefined && Date.now() - meta.lastFull > 120000, -3, 'Data tombstone > 2 min');
  a.hit(meta.lastFull !== undefined && Date.now() - meta.lastFull > 60000 && Date.now() - meta.lastFull <= 120000, -1.5, 'Data aging > 60s');
  a.hit(S.price <= 0 || S.atr15 <= 0, -3, 'Nonsense price state');
  a.hit(meta.fallbackPrice && meta.fallbackPrice !== S.price, -1, 'Fallback price active');
  a.hit(S.price > 0 && S.atr15 > 0 && !meta.fallbackPrice, 2, 'Live data verified');
  a.hit(meta.wsConnected === false && meta.lastTrade !== undefined && Date.now() - meta.lastTrade > 30000, -2, 'Stale trade tape');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('49.3', 49, 'Indicator Error Isolation');
  a.hit(i.rsi !== 0 || i.macd !== 0, 2, 'Indicators computed');
  a.hit(i.rsi === 0 && i.macd === 0, -2, 'Indicator math failed');
  a.hit(!isFinite(S.price), -3, 'NaN price detected');
  a.hit(!isFinite(S.atr15), -2.5, 'NaN ATR detected');
  a.hit(S.tf && S.tf['1m'].candles.length < 20, -1.5, '1m dataset too thin');
  a.hit(isFinite(S.price) && isFinite(S.atr15) && S.atr15 > 0, 1.5, 'Numeric health OK');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('49.4', 49, 'Recovery Escalation');
  a.hit(meta.failedCount >= 10 && meta.paused, 1, 'Auto-pause on runaway');
  a.hit(meta.failedCount >= 10 && !meta.paused, -2, 'Runaway without pause');
  a.hit(meta.apiRecheckDelay !== undefined && meta.apiRecheckDelay >= 10000, 1, 'Retry delay honoring cooldown');
  a.hit(meta.apiRecheckDelay !== undefined && meta.apiRecheckDelay < 2000 && meta.failedCount > 3, -1.5, 'Retry too eager');
  a.hit(meta.degradedMode, -1.5, 'Degraded mode active');
  a.hit(!meta.degradedMode && meta.apiOk, 1.5, 'Full mode restored');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('49.5', 49, 'Silent-Fail Scavenger');
  a.hit(meta.silentFails !== undefined && meta.silentFails > 5, -2, 'Silent failures detected');
  a.hit(meta.silentFails !== undefined && meta.silentFails === 0, 1, 'No silent failures');
  a.hit(meta.partialData, -1.5, 'Partial dataset detected');
  a.hit(meta.partialData && !meta.degradedMode, -1, 'Partial data without degrade flag');
  a.hit(meta.zeroClamps > 3, -1.5, 'Zero-clamped values in state');
  a.hit(meta.zeroClamps === 0, 1, 'No zero clamps');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('49.6', 49, 'Self-Heal Logic');
  a.hit(meta.healAttempts !== undefined && meta.healAttempts < 5, 1, 'Heal cadence sane');
  a.hit(meta.healAttempts !== undefined && meta.healAttempts > 15, -1.5, 'Heal loop spinning');
  a.hit(meta.lastHealAt !== undefined && (Date.now() - meta.lastHealAt) < 60000 && meta.apiOk, 1.5, 'Heal succeeded');
  a.hit(meta.lastHealAt !== undefined && (Date.now() - meta.lastHealAt) > 300000 && !meta.apiOk, -2, 'Heal stalled');
  a.hit(meta.cooldownUntil !== undefined && meta.cooldownUntil - Date.now() > 30000, -1, 'Long cooldown ahead');
  a.hit(meta.wsReconnectBackoff !== undefined && meta.wsReconnectBackoff > 10000, -1, 'WS backoff maxed');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('49.7', 49, 'Partial-Data Failsafe');
  a.hit(meta.missingKlines !== undefined && meta.missingKlines > 0, -2, 'Missing kline sets');
  a.hit(meta.missingDerivatives !== undefined && meta.missingDerivatives > 0, -1.5, 'Missing derivatives');
  a.hit(meta.missingOrderbook !== undefined && meta.missingOrderbook, -1, 'Missing order book');
  a.hit(meta.missingEverything, -3, 'Total data failure');
  a.hit(meta.missingKlines === 0 && meta.missingDerivatives === 0, 1.5, 'All datasets present');
  a.hit(c.range > 0 && S.book && S.book.bids && S.book.bids.length > 0, 1, 'Core price+book data OK');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('49.8', 49, 'Error Taxonomy Response');
  const e = String(meta.lastError || '');
  a.hit(e.includes('401') || e.includes('403'), -2.5, 'Auth zone error');
  a.hit(e.includes('5') && e.length <= 3 && !e.includes('500') && !e.includes('52'), -1, '5xx class error');
  a.hit(e.includes('ECONNRESET') || e.includes('socket hang'), -1.5, 'Socket reset');
  a.hit(e.includes('ETIMEDOUT'), -1.5, 'Connection timeout');
  a.hit(e === '', 1.5, 'Error log clean');
  a.hit(e.includes('rate') || e.includes('Rate'), -1.5, 'Rate message present');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('49.9', 49, 'Recovery Sequence Check');
  const seq = meta.recoverySeq || 0;
  a.hit(seq === 0 && meta.apiOk, 2, 'Recovery sequence nominal');
  a.hit(seq === 1, -1, 'Recovery stage 1: retry');
  a.hit(seq === 2, -1.5, 'Recovery stage 2: degrade');
  a.hit(seq === 3, -2, 'Recovery stage 3: pause');
  a.hit(seq === 4, -2.5, 'Recovery stage 4: halt');
  a.hit(seq >= 3 && meta.apiOk, 1.5, 'Recovered after halt');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('49.10', 49, 'Error Final Verdict');
  const sound = meta.apiOk && meta.failedCount <= 3 && (meta.missingKlines === 0) && isFinite(S.price) && S.atr15 > 0;
  a.hit(sound, 3, 'System sound');
  a.hit(!sound, -3, 'System unsound');
  a.hit(meta.fallbackPrice && Math.abs(meta.fallbackPrice - S.price) > atr * 5, -2.5, 'Fallback off-market');
  a.hit(meta.lastFull !== undefined && Date.now() - meta.lastFull < 15000, 1.5, 'Cycle freshly verified');
  a.hit(S.tf && S.tf['1m'].candles.length > 100, 1, 'Warm dataset in memory');
  a.hit(meta.warnCount !== undefined && meta.warnCount > 20, -1, 'Warning flood');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat50(S) {
  const out = [];
  const meta = S.meta || {};
  const tf = T(S), i = tf.i;

  let a = new AgentEval('50.1', 50, 'Boot Phase Tracker');
  a.hit(meta.bootPhase >= 2, 1.5, 'API connectivity passed');
  a.hit(meta.bootPhase >= 3, 1, 'Market data acquired');
  a.hit(meta.bootPhase >= 4, 1, 'Swarm booted');
  a.hit(meta.bootPhase >= 5, 1, 'Indicators calibrated');
  a.hit(meta.bootPhase >= 6, 1.5, 'Structure mapped');
  a.hit(meta.bootPhase >= 6 && meta.bootDone, 2, 'Boot complete');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('50.2', 50, 'Warmup State');
  const uptime = meta.uptime || 0;
  a.hit(uptime < 5000, -2, 'Cold boot: warming');
  a.hit(uptime >= 5000 && uptime < 60000, 1, 'Warmup done');
  a.hit(uptime >= 60000, 1.5, 'Fully warm');
  a.hit(meta.candlesReady, 1.5, 'Candle buffers primed');
  a.hit(!meta.candlesReady, -1.5, 'Candle buffers empty');
  a.hit(meta.warmReevalue !== undefined ? meta.warmReevalue : true, 0.5, 'Re-evaluation live');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('50.3', 50, 'Seed Data Integrity');
  a.hit(S.tf && S.tf['15m'].candles.length >= 100, 2, '15m seed deep enough');
  a.hit(S.tf && S.tf['1h'].candles.length >= 100, 1.5, '1h seed deep enough');
  a.hit(S.tf && S.tf['1d'] && S.tf['1d'].candles.length >= 7, 1, '1d seed present');
  a.hit(S.vp && S.vp['15m'] && S.vp['15m'].poc !== undefined, 1, 'VP seeded');
  a.hit(S.tf && S.tf['1m'].candles.length < 30, -1.5, '1m seed thin');
  a.hit(S.tf && S.tf['15m'].candles.length < 60, -2, '15m seed too thin');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('50.4', 50, 'Indicator Calibration');
  a.hit(i.rsi > 0 && i.rsi < 100, 1.5, 'RSI calibrated');
  a.hit(i.macd !== 0 || i.histogram !== 0, 1, 'MACD calibrated');
  a.hit(i.atr > 0 && S.atr15 > 0, 1.5, 'ATR calibrated');
  a.hit(isFinite(i.ema8) && isFinite(i.ema21) && isFinite(i.ema50), 1.5, 'EMA stack calibrated');
  a.hit(i.atr === 0 || S.atr15 === 0, -2.5, 'ATR failed to calibrate');
  a.hit(S.atr15pct >= 0.0005 && S.atr15pct <= 0.006, 1, 'ATR% sane range');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('50.5', 50, 'Structure Map Readiness');
  const sw = S.swings15 ? S.swings15.sh.length + S.swings15.sl.length : 0;
  a.hit(sw >= 4, 1.5, 'Swings mapped');
  a.hit(sw >= 2 && sw < 4, 0.5, 'Swings partial');
  a.hit((S.srHi && S.srHi.length) || (S.srLo && S.srLo.length), 1.5, 'S/R mapped');
  a.hit(S.obs && (S.obs.bull || S.obs.bear), 1, 'OBs mapped');
  a.hit(S.fvgs && (S.fvgs.bull || S.fvgs.bear), 1, 'FVGs mapped');
  a.hit(S.pivots && (S.pivots.r1 || S.pivots.s1), 1, 'Pivots mapped');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('50.6', 50, 'Derivatives Seed');
  a.hit(S.oi !== null && S.oi !== undefined, 1.5, 'OI seeded');
  a.hit(S.funding !== null && S.funding !== undefined, 1.5, 'Funding seeded');
  a.hit(S.lsGlobal !== null && S.lsGlobal !== undefined, 1, 'L/S seeded');
  a.hit(S.takerRatio !== null && S.takerRatio !== undefined, 1, 'Taker ratio seeded');
  a.hit(S.forceLiq && typeof S.forceLiq.count === 'number', 1, 'Force orders seeded');
  a.hit(S.book && S.book.bids && S.book.bids.length > 0, 1.5, 'Order book seeded');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('50.7', 50, 'Gate Pre-Arm');
  a.hit(meta.bootPhase >= 6 && meta.apiOk, 1.5, 'Gates armed post-boot');
  a.hit(meta.gatesReady, 2, 'Gate system verified');
  a.hit(!meta.gatesReady, -1.5, 'Gates not verified');
  a.hit(S.conf !== undefined, 0.5, 'Confidence pipeline live');
  a.hit(S.prevVotes !== undefined, 0.5, 'Vote pipeline live');
  a.hit(meta.evalCount !== undefined && meta.evalCount >= 3, 1, 'Swarm has run 3+ cycles');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('50.8', 50, 'Initialization Sequence');
  a.hit(meta.pingOk, 1.5, 'Ping OK');
  a.hit(meta.timeSynced, 1, 'Time synced');
  a.hit(meta.wsConnected, 1.5, 'WS connected at boot');
  a.hit(meta.bootErrors === 0, 1.5, 'Boot zero errors');
  a.hit(meta.bootErrors > 3, -2, 'Boot error storm');
  a.hit(meta.bootMs !== undefined && meta.bootMs < 30000, 1, 'Boot under 30s');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('50.9', 50, 'Rolling Validation');
  a.hit(meta.evalCount !== undefined ? meta.evalCount > 10 : false, 1, '10+ eval cycles');
  a.hit(meta.evalCount !== undefined && meta.evalCount < 3 && meta.uptime > 120000, -1.5, 'Evals stalled');
  a.hit(meta.cyclesOK !== undefined && meta.cyclesOK > 20, 1.5, 'Cycle reliability proven');
  a.hit(meta.cyclesOK > 0 && meta.cyclesFail > meta.cyclesOK, -2, 'Cycle failure dominance');
  a.hit(meta.consistency !== undefined && meta.consistency > 0.8, 1.5, 'State consistency high');
  a.hit(meta.hardReset, -2, 'Hard reset occurred');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('50.10', 50, 'Boot Final Checkpoint');
  const ok = meta.bootPhase >= 6 && meta.bootDone && meta.apiOk && meta.wsConnected && S.tf && S.tf['15m'].candles.length >= 100;
  a.hit(ok, 3, 'ALL SYSTEMS OPERATIONAL');
  a.hit(!ok, -3, 'Boot incomplete');
  a.hit(meta.bootDone && S.prevVotes !== undefined, 1.5, 'First swarm tally complete');
  a.hit(meta.bootBanner, 0.5, 'Boot banner displayed');
  a.hit(meta.bootErrors === 0 && meta.uptime > 30000, 1, 'Stable since boot');
  a.hit(meta.version === 'v22.0', 0.5, 'Version v22.0 confirmed');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

module.exports = { cat41, cat42, cat43, cat44, cat45, cat46, cat47, cat48, cat49, cat50 };