'use strict';
/* OMNISCIENT SCALPER v22.0 — Agent Categories 11–20: Volume & Order Flow Masters (100 agents) */

const { AgentEval, finish, lastPin, lastCandle, lastEngulf, equalPools, divergence } = require('./rulebook');

const T = S => S.tf['15m'];

function cat11(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const rng = S.range;

  let a = new AgentEval('11.1', 11, 'Range Identification');
  a.hit(rng && rng.type === 'flat' && rng.width < atr * 1.2, 1.5, 'Tight range identified');
  a.hit(rng && rng.type === 'flat', 0.5, 'Range regime confirmed');
  a.hit(rng && rng.type === 'trending', -0.5, 'Trending = no range edge');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('11.2', 11, 'Rectangle Specialist');
  a.hit(rng && rng.type === 'flat' && Math.abs(S.price - rng.top) < atr * 0.4, -1.5, 'Rectangle top = short zone');
  a.hit(rng && rng.type === 'flat' && Math.abs(S.price - rng.bot) < atr * 0.4, 1.5, 'Rectangle bottom = long zone');
  a.hit(rng && Math.abs(S.price - rng.mid) < atr * 0.3, -0.5, 'Rectangle middle = no edge');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('11.3', 11, 'Triangle Specialist');
  a.hit(rng && rng.type === 'tri' && Math.abs(S.price - rng.apex) < atr * 2, 1, 'Near triangle apex');
  a.hit(rng && rng.type === 'tri' && c.c > rng.top && c.prev.c < rng.top, 1.5, 'Triangle upside break');
  a.hit(rng && rng.type === 'tri' && c.c < rng.bot && c.prev.c > rng.bot, 1.5, 'Triangle downside break');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('11.4', 11, 'Flag & Pennant');
  a.hit(rng && rng.type === 'flag' && c.c > rng.top, 1.5, 'Flag continuation bounce');
  a.hit(rng && rng.type === 'pennant' && Math.abs(S.price - rng.apex) < atr, 1, 'Pennant tip = squeeze');
  a.hit(rng && rng.type === 'flag' && c.c < rng.bot, -1.5, 'Flag break down = failure');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('11.5', 11, 'Wedge Specialist');
  a.hit(rng && rng.type === 'wedgeUp' && c.c < rng.top, 0.5, 'Rising wedge = bearish bias');
  a.hit(rng && rng.type === 'wedgeDn' && c.c > rng.bot, 0.5, 'Falling wedge = bullish bias');
  a.hit(rng && rng.type === 'wedgeUp' && c.c < rng.bot, 1.5, 'Wedge breakdown');
  a.hit(rng && rng.type === 'wedgeDn' && c.c > rng.top, 1.5, 'Wedge breakout');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('11.6', 11, 'Diamond & Broadening');
  a.hit(rng && rng.type === 'broadening', -1, 'Broadening = volatile chop');
  a.hit(rng && rng.type === 'diamond' && S.regime === 'LOW', 1, 'Diamond = reversal precursor');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('11.7', 11, 'Consolidation Volume Profile');
  const poc15 = S.vp['15m'] && S.vp['15m'].poc;
  a.hit(rng && rng.type === 'flat' && poc15 && rng.bot <= poc15 && rng.top >= poc15, 1, 'POC inside range');
  a.hit(rng && rng.type === 'flat' && poc15 && Math.abs(S.price - poc15) < atr * 0.4, -0.5, 'At POC = equilibrium');
  a.hit(rng && c.v > i.volAvg * 1.5 && Math.abs(S.price - rng.top) < atr * 0.5, 1, 'Volume at range top');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('11.8', 11, 'Consolidation Time Analysis');
  const bars = rng ? tf.candles.slice(-40).filter(x => x[4] >= rng.bot && x[4] <= rng.top).length : 0;
  a.hit(bars >= 30, 1.5, '30+ bars consolidating = coiled');
  a.hit(bars >= 12 && bars < 30 && S.regime === 'NORM', 0.5, 'Moderate consolidation');
  a.hit(bars >= 30 && c.v > i.volAvg * 1.5, 2, 'Squeeze break with volume');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('11.9', 11, 'Consolidation Breakout Quality');
  a.hit(rng && rng.type === 'flat' && c.c > rng.top && c.v > i.volAvg * 1.5, 2, 'High-volume range breakout');
  a.hit(rng && rng.type === 'flat' && c.c < rng.bot && c.v > i.volAvg * 1.5, 2, 'High-volume range breakdown');
  a.hit(rng && rng.type === 'flat' && c.h > rng.top && c.c < rng.top, -1.5, 'Range top fakeout');
  a.hit(rng && rng.type === 'flat' && c.l < rng.bot && c.c > rng.bot, -1.5, 'Range bottom fakeout');
  a.hit(rng && rng.type === 'flat' && c.c > rng.top + atr, 1, 'Displacement beyond range');
  a.hit(rng && rng.type === 'flat' && c.c < rng.bot - atr, 1, 'Displacement beyond range');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('11.10', 11, 'Consolidation Risk Framework');
  const w = rng ? (rng.top - rng.bot) / S.price : 1;
  a.hit(w > 0.006, -1, 'Range width > 0.6% = wide stops');
  a.hit(w < 0.002 && S.regime === 'LOW', 1.5, 'Tiny range = precision entry');
  a.hit(w > 0.006 && S.spread > 0.5, -2, 'Wide range + poor spread = no trade');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat12(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const rng = S.range;
  const lvlTop = rng && rng.top, lvlBot = rng && rng.bot;
  const upB = lvlTop && c.c > lvlTop && c.prev.c <= lvlTop;
  const dnB = lvlBot && c.c < lvlBot && c.prev.c >= lvlBot;
  const fakeUp = lvlTop && c.h > lvlTop && c.c < lvlTop;
  const fakeDn = lvlBot && c.l < lvlBot && c.c > lvlBot;

  let a = new AgentEval('12.1', 12, 'Breakout Confirmation');
  a.hit(upB && c.v > i.volAvg * 1.3, 2, 'Breakout + volume confirmation');
  a.hit(dnB && c.v > i.volAvg * 1.3, 2, 'Breakdown + volume confirmation');
  a.hit(upB && S.book.imbalBid > 0.55, 1, 'Breakout + bid imbalance');
  a.hit(dnB && S.book.imbalBid < 0.45, 1, 'Breakdown + ask imbalance');
  a.hit(upB && c.c > lvlTop + atr * 0.4, 1.5, 'Displacement beyond breakout');
  a.hit(dnB && c.c < lvlBot - atr * 0.4, 1.5, 'Displacement beyond breakdown');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('12.2', 12, 'Fakeout Detection');
  a.hit(fakeUp && c.bear, -1.5, 'Wick above, close inside = fake');
  a.hit(fakeDn && c.bull, 2, 'Sweep below then reclaim = LONG');
  a.hit(fakeUp && c.v > i.volAvg * 1.5, -1.5, 'High-volume fakeout');
  a.hit(fakeDn && c.v > i.volAvg * 1.5, 1.5, 'High-volume fakeout');
  a.hit(fakeUp && c.c < lvlTop - atr * 0.5, -1.5, 'Fakeout resolution down');
  a.hit(fakeDn && c.c > lvlBot + atr * 0.5, 1.5, 'Fakeout resolution up');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('12.3', 12, 'Breakout Volume Dynamics');
  a.hit((upB || dnB) && i.rvol > 2, 2, 'RVOL > 2 breakout');
  a.hit((upB || dnB) && c.v < i.volAvg, -1.5, 'Quiet breakout = untrustworthy');
  a.hit((upB || dnB) && c.v >= Math.max(...tf.candles.slice(-10).map(x => Number(x[5]))), 1.5, '10-bar climax breakout');
  a.hit((upB || dnB) && c.v > (c.prev.v || 1) * 2, 1, 'Volume doubling');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('12.4', 12, 'Breakout Microstructure');
  a.hit(upB && S.cvd !== null && S.cvdPrev !== null && S.cvd > S.cvdPrev, 1.5, 'CVD confirms breakout');
  a.hit(dnB && S.cvd !== null && S.cvdPrev !== null && S.cvd < S.cvdPrev, 1.5, 'CVD confirms breakdown');
  a.hit(upB && S.forceLiq && S.forceLiq.netBuy > 0, 1, 'Longs liquidating into breakout');
  a.hit(dnB && S.forceLiq && S.forceLiq.netBuy < 0, 1, 'Shorts liquidating into breakdown');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('12.5', 12, 'Multi-Timeframe Breakout');
  const c3 = lastCandle(S.tf['3m'].candles), c5 = lastCandle(S.tf['5m'].candles);
  const upB3 = c3.c > c3.prev.c, upB5 = c5.c > c5.prev.c;
  const dnB3 = c3.c < c3.prev.c, dnB5 = c5.c < c5.prev.c;
  a.hit(upB && upB3 && upB5, 2, '3m+5m aligned up');
  a.hit(dnB && dnB3 && dnB5, 2, '3m+5m aligned down');
  a.hit(upB && S.bias1h === 'SHORT', -1, 'Breakout against 1h bias');
  a.hit(dnB && S.bias1h === 'LONG', -1, 'Breakdown against 1h bias');
  a.hit(upB && S.bias1h === 'LONG', 1, 'Breakout with 1h tailwind');
  a.hit(dnB && S.bias1h === 'SHORT', 1, 'Breakdown with 1h tailwind');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('12.6', 12, 'Breakout Momentum');
  const mom = i.macd ? i.macd.histogram : 0;
  a.hit(upB && mom > 0 && i.macd.rising, 1.5, 'Breakout with rising MACD');
  a.hit(dnB && mom < 0, 1.5, 'Breakdown with falling MACD');
  a.hit(upB && i.adx && i.adx.adx > 25, 1, 'Breakout in strong trend');
  a.hit(dnB && i.adx && i.adx.adx > 25, 1, 'Breakdown in strong trend');
  a.hit((upB || dnB) && i.adx && i.adx.adx < 18, -1, 'Breakout without ADX');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('12.7', 12, 'Breakout Measured Moves');
  const rangeH = rng ? (rng.top - rng.bot) : atr * 5;
  a.hit(upB && c.c < lvlTop + rangeH, 1, 'Room to measured move');
  a.hit(dnB && c.c > lvlBot - rangeH, 1, 'Room to measured move');
  a.hit(S.price > lvlTop + rangeH * 2, -1, 'Beyond 2x measured = extended');
  a.hit(S.price < lvlBot - rangeH * 2, -1, 'Beyond 2x measured = extended');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('12.8', 12, 'Breakout Timing');
  a.hit(S.sessions && S.sessions.isLondon, 1, 'London = prime breakout window');
  a.hit(S.sessions && S.sessions.isNY, 1, 'NY volume window');
  a.hit(S.sessions && S.sessions.isAsian && S.regime === 'LOW', -1, 'Asian low vol = fake breaks');
  a.hit(S.sessions && S.sessions.isWeekend, -1, 'Weekend = low conviction');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('12.9', 12, 'Breakout Risk Management');
  const bkStop = rng ? Math.max(atr, (rng.top - rng.bot) * 0.3) : atr;
  a.hit(bkStop > atr * 1.5, -1, 'Wide stop required');
  a.hit(bkStop < atr * 0.7, 1, 'Tight stop available');
  a.hit(S.regime === 'HIGH' && bkStop > atr * 2, -1.5, 'High vol stop-hunt risk');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('12.10', 12, 'Breakout Derivatives Context');
  a.hit(upB && S.funding !== null && S.funding > 0.00015, 0.5, 'Positive funding aligns long');
  a.hit(dnB && S.funding !== null && S.funding < -0.00015, 0.5, 'Negative funding aligns short');
  a.hit(upB && S.oiDelta !== null && S.oiDelta > 0, 1, 'OI rising into breakout');
  a.hit(dnB && S.oiDelta !== null && S.oiDelta > 0, 1, 'OI rising into breakdown');
  a.hit(upB && S.oiDelta !== null && S.oiDelta < 0, -1, 'OI falling = weak conviction');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat13(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const poolH = S.liq.eqH && S.liq.eqH.length ? S.liq.eqH[0] : null;
  const poolL = S.liq.eqL && S.liq.eqL.length ? S.liq.eqL[0] : null;

  let a = new AgentEval('13.1', 13, 'Equal Highs Liquidity');
  a.hit(poolH && poolH >= S.price, 2, 'Sell-side pool above');
  a.hit(S.liq.eqH && S.liq.eqH.length >= 3 && poolH >= S.price, 1.5, 'Triple equal highs');
  a.hit(S.liq.sweptH && poolH && Math.abs(S.liq.sweptH - poolH) < atr, 2, 'Pool swept = fuel spent');
  a.hit(poolH && S.price < poolH - atr * 1.5, 1, 'Distance premium to pool');
  a.hit(poolH && S.funding !== null && S.funding > 0.0003, 1, 'Positive funding = long stops above');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('13.2', 13, 'Equal Lows Liquidity');
  a.hit(poolL && poolL <= S.price, 2, 'Buy-side pool below');
  a.hit(S.liq.eqL && S.liq.eqL.length >= 3 && poolL <= S.price, 1.5, 'Triple equal lows');
  a.hit(S.liq.sweptL && poolL && Math.abs(S.liq.sweptL - poolL) < atr, 2, 'Pool swept = fuel spent');
  a.hit(poolL && S.price > poolL + atr * 1.5, 1, 'Distance premium to pool');
  a.hit(poolL && S.funding !== null && S.funding < -0.0003, 1, 'Negative funding = short stops below');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('13.3', 13, 'Stop Hunt Detector');
  a.hit(S.liq.sweptH && c.c < S.liq.sweptH - atr * 0.2, 2, 'Sweep high + displacement down');
  a.hit(S.liq.sweptL && c.c > S.liq.sweptL + atr * 0.2, 2, 'Sweep low + displacement up');
  a.hit(S.liq.sweptH && c.v > i.volAvg * 2, 1.5, 'Massive volume stop hunt');
  a.hit(S.liq.sweptH && i.rsi && i.rsi < 55, 1, 'Sweep + RSI not overbought');
  a.hit(S.liq.sweptL && i.rsi && i.rsi > 45, 1, 'Sweep + RSI not oversold');
  a.hit(S.liq.sweptL && S.forceLiq && S.forceLiq.netBuy > 0, 1, 'Liquidation flow into sweep');
  a.hit(S.liq.sweptH && S.forceLiq && S.forceLiq.netBuy < 0, 1, 'Liquidation flow into sweep');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('13.4', 13, 'Liquidity Sweep Patterns');
  a.hit(S.liq.sweptL && c.c > S.liq.sweptL + atr * 0.5 && S.liq.sweptAt <= 2, 2, 'Reclaim within 2 candles');
  a.hit(S.liq.sweptH && c.c < S.liq.sweptH - atr * 0.5 && S.liq.sweptAt <= 2, 2, 'Reject within 2 candles');
  a.hit(S.liq.sweptL && S.obs.bull.length && S.obs.bull.some(o => o.bot <= S.price), 1, 'Sweep into bull OB');
  a.hit(S.liq.sweptH && S.obs.bear.length && S.obs.bear.some(o => o.top >= S.price), 1, 'Sweep into bear OB');
  a.hit(S.liq.sweptL && S.cvd !== null && S.cvdPrev !== null && S.cvd > S.cvdPrev, 1.5, 'Sweep + CVD flip');
  a.hit(S.liq.sweptH && S.cvd !== null && S.cvdPrev !== null && S.cvd < S.cvdPrev, 1.5, 'Sweep + CVD flip');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('13.5', 13, 'Inducement Hunter');
  a.hit(poolH && S.price < poolH - atr * 1.8 && S.bias15 === 'SHORT', 1.5, 'Induced toward pool above');
  a.hit(poolL && S.price > poolL + atr * 1.8 && S.bias15 === 'LONG', 1.5, 'Induced toward pool below');
  a.hit(S.liq.sweptL && S.bias15 === 'LONG' && c.c > i.ema8, 1, 'Inducement complete, resume');
  a.hit(S.liq.sweptH && S.bias15 === 'SHORT' && c.c < i.ema8, 1, 'Inducement complete, resume');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('13.6', 13, 'Liquidity Void Hunter');
  const voids = S.liqVoids || [];
  const inVoid = voids.filter(v => v.high >= S.price && v.low <= S.price && (v.high - v.low) > atr * 1.5);
  a.hit(inVoid.length > 0, 1, 'Inside void = ferocity');
  a.hit(voids.length && Math.abs(S.price - voids[0].low) < atr * 0.5 && S.bias15 === 'LONG', 1, 'Below void = expansion long');
  a.hit(voids.length && Math.abs(S.price - voids[0].high) < atr * 0.5 && S.bias15 === 'SHORT', 1, 'Above void = expansion short');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('13.7', 13, 'Internal Range Liquidity');
  const rng = S.range;
  a.hit(rng && rng.top && S.price > rng.mid && poolH && poolH > rng.top, 1, 'Internal range offering to pool');
  a.hit(rng && S.price < rng.mid && poolL && poolL < rng.bot, 1, 'Internal range offering to pool');
  a.hit(rng && S.liq.sweptH && S.price < rng.top, 1.5, 'Sweep of internal high = fade');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('13.8', 13, 'External Range Liquidity');
  const pdh = S.prevDay.h, pdl = S.prevDay.l;
  a.hit(pdh && S.price < pdh && Math.abs(S.price - pdh) < atr * 1.2 && S.bias15 === 'SHORT', 1.5, 'Offered toward PDH');
  a.hit(pdl && S.price > pdl && Math.abs(S.price - pdl) < atr * 1.2 && S.bias15 === 'LONG', 1.5, 'Offered toward PDL');
  a.hit(S.sessions && S.sessions.asianHigh && S.price < S.sessions.asianHigh && Math.abs(S.price - S.sessions.asianHigh) < atr, 1, 'Asian high = external liquidity');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('13.9', 13, 'Smart Money Concepts');
  a.hit(S.liq.sweptL && c.c > i.ema8 && S.bias15 === 'LONG', 2, 'Sweep + reclaim EMA-8 = SMC long');
  a.hit(S.liq.sweptH && c.c < i.ema8 && S.bias15 === 'SHORT', 2, 'Sweep + reject EMA-8 = SMC short');
  a.hit(S.liq.sweptL && S.obs.bull.length && S.obs.bull[0].bot <= S.liq.sweptL * 1.001, 1.5, 'Sweep into bull OB');
  a.hit(S.liq.sweptH && S.obs.bear.length && S.obs.bear[0].top >= S.liq.sweptH * 0.999, 1.5, 'Sweep into bear OB');
  a.hit(S.cvd !== null && S.cvdPrev !== null && S.cvd > S.cvdPrev && S.liq.sweptL, 1, 'Smart money CVD entry');
  a.hit(S.cvd !== null && S.cvdPrev !== null && S.cvd < S.cvdPrev && S.liq.sweptH, 1, 'Smart money CVD entry');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('13.10', 13, 'Liquidity Risk Framework');
  a.hit(poolH && poolH - S.price > atr * 4, -1, 'Pool too far = chase risk');
  a.hit(poolL && S.price - poolL > atr * 4, -1, 'Pool too far = chase risk');
  a.hit(S.liq.sweptH && c.c > S.liq.sweptH - atr * 0.2, -1, 'No displacement after sweep');
  a.hit(S.liq.sweptL && c.c < S.liq.sweptL + atr * 0.2, -1, 'No displacement after sweep');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat14(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const vp = S.vp['15m'], vp1h = S.vp['1h'];

  let a = new AgentEval('14.1', 14, 'POC Analyst');
  a.hit(vp && Math.abs(S.price - vp.poc) < atr * 0.5, 1, 'At 15m POC');
  a.hit(vp1h && Math.abs(S.price - vp1h.poc) < atr * 0.5, 1.5, 'At 1h POC');
  a.hit(vp && S.price > vp.poc + atr * 2 && c.bear, 1, 'Below POC rejection');
  a.hit(vp && S.price < vp.poc - atr * 2 && c.bull, 1, 'Above POC rejection');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('14.2', 14, 'Value Area Specialist');
  a.hit(vp && S.price > vp.vah, -1, 'Above value area = extended');
  a.hit(vp && S.price < vp.val, 1, 'Below value area = value hunting');
  a.hit(vp && Math.abs(S.price - vp.vah) < atr * 0.4 && c.bear, 1.5, 'VAH rejection');
  a.hit(vp && Math.abs(S.price - vp.val) < atr * 0.4 && c.bull, 1.5, 'VAL acceptance');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('14.3', 14, 'Volume Node Hierarchy');
  a.hit(vp && vp.poc && vp.poc > S.price && S.price > vp.val, 1, 'Structured below POC');
  a.hit(vp && vp.poc && vp.poc < S.price && S.price < vp.vah, 1, 'Structured above POC');
  a.hit(vp1h && vp1h.poc && Math.abs(S.price - vp1h.poc) > atr * 3, -1, 'Far from 1h POC = chase');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('14.4', 14, 'Volume Profile Shape');
  a.hit(vp && vp.vah - vp.val > atr * 3, 1, 'Wide value = strong acceptance');
  a.hit(vp && vp.vah - vp.val < atr, 1.5, 'Narrow value = compression');
  a.hit(vp && S.book && S.book.imbalBid > 0.6 && S.price < vp.poc, 0.5, 'Bid-heavy below POC');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('14.5', 14, 'Developing Volume Profile');
  a.hit(vp && vp.poc && S.price > vp.poc && c.prev.v < i.volAvg && c.v > i.volAvg, 1.5, 'Developing POC + expansion');
  a.hit(vp && vp.poc && Math.abs(S.price - vp.poc) < atr && c.v > i.volAvg, 1, 'At POC with heavy volume');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('14.6', 14, 'Fixed Range Volume Profile');
  a.hit(vp1h && vp1h.val && Math.abs(S.price - vp1h.val) < atr * 0.5, 1.5, '1h VAL retest');
  a.hit(vp1h && vp1h.vah && Math.abs(S.price - vp1h.vah) < atr * 0.5, 1.5, '1h VAH retest');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('14.7', 14, 'Volume Profile & Price Action');
  a.hit(vp && vp.poc && c.c > vp.poc && S.bias15 === 'LONG', 1, 'Candle structure above POC');
  a.hit(vp && vp.poc && c.c < vp.poc && S.bias15 === 'SHORT', 1, 'Candle structure below POC');
  a.hit(vp && vp.poc && c.prev.c < vp.poc && c.c > vp.poc, 1.5, 'POC reclaim');
  a.hit(vp && vp.poc && c.prev.c > vp.poc && c.c < vp.poc, 1.5, 'POC loss');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('14.8', 14, 'Session Volume Profile');
  a.hit(S.sessions && S.sessions.isNY && vp1h && vp1h.poc && S.price < vp1h.poc, 0.5, 'NY below POC = demand building');
  a.hit(S.sessions && S.sessions.isLondon && vp && vp.poc && S.price > vp.poc, 0.5, 'London above POC = supply');
  a.hit(S.sessions && S.sessions.isAsian && vp && vp.poc && Math.abs(S.price - vp.poc) < atr * 0.5, -0.5, 'Asian POC drift');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('14.9', 14, 'Relative Volume Analysis');
  a.hit(i.rvol > 2, 1.5, 'RVOL > 2 = institutional day');
  a.hit(i.rvol < 0.5, -1, 'RVOL < 0.5 = dead tape');
  a.hit(i.rvol > 2 && c.bull && vp && vp.poc && S.price > vp.poc, 1, 'RVOL confirming POC structure');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('14.10', 14, 'Volume Profile Risk');
  a.hit(vp && S.price > vp.vah + atr * 2, -1, 'Far above value = reversion risk');
  a.hit(vp && S.price < vp.val - atr * 2, 1, 'Far below value = reversion entry');
  a.hit(vp && vp.vah - vp.val > atr * 6, -1, 'Extreme wide profile = chop');
  a.hit(vp1h && vp1h.poc && Math.abs(S.price - vp1h.poc) > atr * 4, -1, '2h+ from 1h POC = chase');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat15(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const vMax10 = Math.max(...tf.candles.slice(-10).map(x => Number(x[5])));
  const vMax20 = Math.max(...tf.candles.slice(-20).map(x => Number(x[5])));
  const spikeUp = c.v > i.volAvg * 1.8;

  let a = new AgentEval('15.1', 15, 'Volume Spike Identification');
  a.hit(spikeUp && c.bull, 1.5, 'Bullish volume spike');
  a.hit(spikeUp && c.bear, 1.5, 'Bearish volume spike');
  a.hit(c.v > vMax10 && c.bull, 1.5, '10-bar high volume spike');
  a.hit(c.v > vMax10 && c.bear, 1.5, '10-bar high volume spike');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('15.2', 15, 'Volume Climax');
  a.hit(c.v >= vMax20 && c.bear && i.rsi && i.rsi < 30, 2, 'Selling climax');
  a.hit(c.v >= vMax20 && c.bull && i.rsi && i.rsi > 70, 2, 'Buying climax');
  a.hit(c.v >= vMax20 && c.bull && S.price > S.prevDay.h, -1, 'Climax at highs = blow-off');
  a.hit(c.v >= vMax20 && c.bear && S.price < S.prevDay.l, 1, 'Climax at lows = capitulation');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('15.3', 15, 'Volume Dry-Up');
  const dry = c.v < i.volAvg * 0.4;
  a.hit(dry && c.bull && S.price > i.ema21, -0.5, 'Dry-up in rally = exhaustion');
  a.hit(dry && c.bear && S.price < i.ema21, -0.5, 'Dry-up in sell-off = pause');
  a.hit(dry && Math.abs(S.price - i.ema50) < atr * 0.5, 0.5, 'Dry-up at support = spring');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('15.4', 15, 'Volume Trend Analysis');
  const vAvg5 = tf.candles.slice(-5).reduce((s, x) => s + Number(x[5]), 0) / 5;
  const vAvg20 = i.volAvg || 1;
  const rising = vAvg5 > vAvg20 * 1.3;
  const falling = vAvg5 < vAvg20 * 0.7;
  a.hit(rising && S.bias15 === 'LONG', 1.5, 'Volume trend rising with price');
  a.hit(rising && S.bias15 === 'SHORT', 1.5, 'Volume trend rising with price');
  a.hit(falling && S.bias15 !== 'RANGE', -1, 'Falling volume = trend tiring');
  a.hit(rising && c.bull && S.price > i.ema50, 1, 'Rising volume confirms up move');
  a.hit(rising && c.bear && S.price < i.ema50, 1, 'Rising volume confirms down move');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('15.5', 15, 'Comparative Volume');
  a.hit(S.tf['1h'].i && c.v > (S.tf['1h'].i.volAvg || 1) * 0.25, 0.5, '15m volume share of 1h healthy');
  a.hit(i.rvol > 2 && S.tf['5m'].i && S.tf['5m'].i.rvol > 1.5, 1, 'RVOL rising across timeframes');
  a.hit(S.tf['3m'].i && S.tf['3m'].i.rvol > 2 && i.rvol < 1, 1.5, 'Micro volume diverging from macro');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('15.6', 15, 'Volume & Candle Body');
  const body = Math.abs(c.c - c.o), range = c.range || 1;
  a.hit(body > range * 0.7 && spikeUp && c.bull, 2, 'Big body + volume = conviction');
  a.hit(body > range * 0.7 && spikeUp && c.bear, 2, 'Big body + volume = conviction');
  a.hit(body < range * 0.3 && spikeUp, -1, 'Long wick + volume = rejection');
  a.hit(body > atr * 0.6 && c.v > i.volAvg * 1.5, 1.5, 'ATR body + volume');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('15.7', 15, 'Volume & Price Speed');
  const chg = Math.abs(c.c - c.prev.c) / c.prev.c;
  const speed = chg > atr / S.price * 1.5;
  a.hit(speed && spikeUp && c.bull, 2, 'Fast up move + volume');
  a.hit(speed && spikeUp && c.bear, 2, 'Fast down move + volume');
  a.hit(speed && c.v < i.volAvg, -1.5, 'Fast move without volume = trap');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('15.8', 15, 'Volume Distribution');
  a.hit(c.prev.v < i.volAvg && c.v > i.volAvg * 2, 1.5, 'Contraction-expansion rhythm');
  a.hit(c.prev.v > i.volAvg * 1.5 && c.v < i.volAvg * 0.6, -1, 'Expansion-contraction pause');
  a.hit(c.prev.prev && Number(tf.candles[tf.candles.length - 3][5]) < i.volAvg && c.v > i.volAvg * 2, 1.5, 'Volume vacuum then burst');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('15.9', 15, 'Volume Divergence');
  const disc = divergence(tf.candles, tf.candles.map(x => Number(x[5])), 8);
  a.hit(disc && disc.bear, -1.5, 'Price high, volume lower = weak thrust');
  a.hit(disc && disc.bull, 1.5, 'Price low, volume lower = weak sell');
  const up3 = tf.candles.slice(-3).every(x => Number(x[4]) > Number(x[1]));
  const dn3 = tf.candles.slice(-3).every(x => Number(x[4]) < Number(x[1]));
  a.hit(up3 && vAvg5 < vAvg20 * 0.8, -1.5, 'Rally on shrinking volume = fake');
  a.hit(dn3 && vAvg5 < vAvg20 * 0.8, 1.5, 'Sell-off on shrinking volume = spring');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('15.10', 15, 'Volume Risk Framework');
  a.hit(S.regime === 'HIGH' && spikeUp, -0.5, 'High-vol spikes = wide stops');
  a.hit(spikeUp && S.liq.sweptH, 1, 'Spike into sweep = exhaustion');
  a.hit(spikeUp && S.liq.sweptL, 1, 'Spike into sweep = exhaustion');
  a.hit(c.v > vMax20 && S.forceLiq && S.forceLiq.count > 0, 1.5, 'Climax + liquidations = flush');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat16(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const cvd = S.cvd, cvdPrev = S.cvdPrev, cvdRate = S.cvdRate;

  let a = new AgentEval('16.1', 16, 'CVD Trend Alignment');
  a.hit(cvd !== null && cvdPrev !== null && cvd > cvdPrev && S.bias15 === 'LONG', 2, 'CVD rising with uptrend');
  a.hit(cvd !== null && cvdPrev !== null && cvd < cvdPrev && S.bias15 === 'SHORT', 2, 'CVD falling with downtrend');
  a.hit(cvd !== null && cvdPrev !== null && Math.abs(cvd - cvdPrev) > atr * 50 && c.bull, 1.5, 'Aggressive delta thrust');
  a.hit(cvd !== null && cvdPrev !== null && Math.abs(cvd - cvdPrev) > atr * 50 && c.bear, 1.5, 'Aggressive delta thrust');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('16.2', 16, 'CVD Divergence Specialist');
  const d = divergence(tf.candles, tf.candles.map((x, idx) => idx === 0 ? 0 : (S.cvdBucket && S.cvdBucket[idx] !== undefined ? S.cvdBucket[idx] : 0)), 8);
  a.hit(S.cvdDivBear, 2.5, 'Price HH, CVD LH = bearish divergence');
  a.hit(S.cvdDivBull, 2.5, 'Price LL, CVD HL = bullish divergence');
  a.hit(S.cvdDivBear && S.liq.sweptH, 1, 'CVD divergence + sweep = top');
  a.hit(S.cvdDivBull && S.liq.sweptL, 1, 'CVD divergence + sweep = bottom');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('16.3', 16, 'Delta Analysis');
  const dBuy = S.aggBuyPct !== null ? S.aggBuyPct : 0.5;
  a.hit(dBuy > 0.58 && c.bull, 1.5, 'Buy-side aggressor dominance');
  a.hit(dBuy < 0.42 && c.bear, 1.5, 'Sell-side aggressor dominance');
  a.hit(dBuy > 0.58 && c.bear, -1, 'Price down but buyers aggressive = absorb');
  a.hit(dBuy < 0.42 && c.bull, -1, 'Price up but sellers aggressive = distribute');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('16.4', 16, 'Footprint Patterns');
  a.hit(S.delta15 && S.delta15[0] && S.delta15[0] > 0 && c.bull, 1.5, 'Positive 15m delta series');
  a.hit(S.delta15 && S.delta15[0] && S.delta15[0] < 0 && c.bear, 1.5, 'Negative 15m delta series');
  a.hit(S.delta15 && S.delta15.slice(0, 4).every(v => v > 0) && S.delta15[4] < 0, -1, 'Delta exhaustion at top');
  a.hit(S.delta15 && S.delta15.slice(0, 4).every(v => v < 0) && S.delta15[4] > 0, 1, 'Delta exhaustion at bottom');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('16.5', 16, 'CVD & Key Levels');
  a.hit(cvd !== null && cvdPrev !== null && cvd > cvdPrev && S.srLo && S.srLo[0] && Math.abs(S.price - S.srLo[0]) < atr * 0.6, 2, 'CVD rising at support');
  a.hit(cvd !== null && cvdPrev !== null && cvd < cvdPrev && S.srHi && S.srHi[0] && Math.abs(S.price - S.srHi[0]) < atr * 0.6, 2, 'CVD falling at resistance');
  a.hit(cvd !== null && cvdPrev !== null && cvd > cvdPrev && S.liq.sweptL, 1.5, 'CVD confirmation after sweep');
  a.hit(cvd !== null && cvdPrev !== null && cvd < cvdPrev && S.liq.sweptH, 1.5, 'CVD confirmation after sweep');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('16.6', 16, 'Multi-Timeframe CVD');
  a.hit(S.cvd1h !== null && S.cvd1hPrev !== null && S.cvd1h > S.cvd1hPrev && cvd > cvdPrev, 2, '1h + 15m CVD aligned');
  a.hit(S.cvd1h !== null && S.cvd1hPrev !== null && S.cvd1h < S.cvd1hPrev && cvd < cvdPrev, 2, '1h + 15m CVD aligned');
  a.hit(S.cvd1h !== null && S.cvd1hPrev !== null && S.cvd1h > S.cvd1hPrev && cvd < cvdPrev, -1, 'TF CVD conflict');
  a.hit(S.cvd1h !== null && S.cvd1hPrev !== null && S.cvd1h < S.cvd1hPrev && cvd > cvdPrev, -1, 'TF CVD conflict');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('16.7', 16, 'CVD Rate of Change');
  a.hit(cvdRate !== null && cvdRate > 1.5 && c.bull, 1.5, 'CVD accelerating up');
  a.hit(cvdRate !== null && cvdRate < -1.5 && c.bear, 1.5, 'CVD accelerating down');
  a.hit(cvdRate !== null && Math.abs(cvdRate) > 3 && S.liq.sweptH && c.bear, 1, 'CVD blow-off into sweep');
  a.hit(cvdRate !== null && Math.abs(cvdRate) > 3 && S.liq.sweptL && c.bull, 1, 'CVD blow-off into sweep');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('16.8', 16, 'Delta & Spread');
  a.hit(S.delta15 && S.delta15[0] > 0 && S.spread < 0.15, 1, 'Positive delta with tight spread');
  a.hit(S.delta15 && S.delta15[0] < 0 && S.spread > 0.5, -1, 'Negative delta with wide spread');
  a.hit(S.delta15 && S.delta15[0] > 0 && S.book.imbalBid > 0.55, 1, 'Delta + book alignment');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('16.9', 16, 'CVD Pattern Recognition');
  a.hit(S.cvdDivBull && c.bull && c.v > i.volAvg, 2, 'CVD bottom + volume + green candle');
  a.hit(S.cvdDivBear && c.bear && c.v > i.volAvg, 2, 'CVD top + volume + red candle');
  a.hit(S.cvdDivBull && !c.bull, -0.5, 'CVD bottom but no follow-through');
  a.hit(S.cvdDivBear && !c.bear, -0.5, 'CVD top but no follow-through');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('16.10', 16, 'CVD Risk Framework');
  a.hit(cvd !== null && cvdPrev !== null && cvd > cvdPrev && S.price > S.prevDay.h + atr * 2, -1, 'CVD long extended above PDH');
  a.hit(cvd !== null && cvdPrev !== null && cvd < cvdPrev && S.price < S.prevDay.l - atr * 2, 1, 'CVD short extended below PDL');
  a.hit(S.regime === 'HIGH' && cvdRate !== null && Math.abs(cvdRate) > 4, -1, 'Extreme CVD = churn');
  a.hit(S.aggTrades && S.aggTrades.length < 100, -1, 'Thin tape = unreliable delta');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat17(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const bk = S.book;

  let a = new AgentEval('17.1', 17, 'Bid Wall Analyst');
  const bw = bk.bidWalls && bk.bidWalls[0];
  a.hit(bw && Math.abs(bw.p - S.price) < atr * 0.5, 2, 'Large bid wall below price');
  a.hit(bw && bw.sizePct > 0.25, 1.5, 'Bid wall > 25% of total bids');
  a.hit(bw && bw.sizePct > 0.4, 1.5, 'Massive bid wall');
  a.hit(bw && c.l <= bw.p && c.c > bw.p, 1.5, 'Wall defended (wick held)');
  a.hit(bw && c.l < bw.p - atr * 0.2, -1.5, 'Bid wall swept');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('17.2', 17, 'Ask Wall Analyst');
  const aw = bk.askWalls && bk.askWalls[0];
  a.hit(aw && Math.abs(aw.p - S.price) < atr * 0.5, 2, 'Large ask wall above price');
  a.hit(aw && aw.sizePct > 0.25, 1.5, 'Ask wall > 25% of total asks');
  a.hit(aw && aw.sizePct > 0.4, 1.5, 'Massive ask wall');
  a.hit(aw && c.h >= aw.p && c.c < aw.p, 1.5, 'Wall defended (wick held)');
  a.hit(aw && c.h > aw.p + atr * 0.2, -1.5, 'Ask wall swept');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('17.3', 17, 'Wall Dynamics');
  a.hit(aw && bw && Math.abs(aw.p - bw.p) < atr * 1.5, 1.5, 'Two walls = battle zone');
  a.hit(aw && bw && Math.abs(aw.p - bw.p) < atr * 1.5 && c.range < atr * 0.5, 1, 'Walls compressing price');
  a.hit(bw && Math.abs(bw.p - S.price) < atr * 0.2 && c.bull, 1, 'Price pushing into bid wall');
  a.hit(aw && Math.abs(aw.p - S.price) < atr * 0.2 && c.bear, 1, 'Price pushing into ask wall');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('17.4', 17, 'Depth Imbalance');
  const imb = bk.imbalBid;
  a.hit(imb > 0.6, 1.5, 'Bid-heavy depth');
  a.hit(imb < 0.4, 1.5, 'Ask-heavy depth');
  a.hit(imb > 0.7 && c.bull, 1.5, 'Bid-heavy + bullish candle');
  a.hit(imb < 0.3 && c.bear, 1.5, 'Ask-heavy + bearish candle');
  a.hit(imb > 0.7 && c.bear, -1.5, 'Bid-heavy but price falling = sell wall absorption');
  a.hit(imb < 0.3 && c.bull, -1.5, 'Ask-heavy but price rising = buy wall absorption');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('17.5', 17, 'Order Book Slope');
  a.hit(Math.abs(imb - 0.5) < 0.03, -0.5, 'Flat book = no edge');
  a.hit(bk.slopeUp !== null && bk.slopeUp > 0.15 && c.bull, 1, 'Steep bid slope easing');
  a.hit(bk.slopeUp !== null && bk.slopeUp < -0.15 && c.bear, 1, 'Steep ask slope easing');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('17.6', 17, 'Hidden Order Detection');
  a.hit(bw && aw && Math.abs(bw.p - aw.p) < atr * 0.3, 1, 'Narrow band = hidden orders probing');
  a.hit(c.range < atr * 0.35 && bk.vol24 && bk.vol24 > 1e6, 1, 'Quiet price, heavy volume = absorption');
  a.hit(c.range > atr * 2 && bk.imbalBid > 0.6, -1, 'Big move with bid book = trap');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('17.7', 17, 'Order Book Refresh Rate');
  a.hit(bk.askQtyChange && bk.askQtyChange > 0.3, -0.5, 'Ask side churning');
  a.hit(bk.bidQtyChange && bk.bidQtyChange > 0.3 && c.bull, 0.5, 'Bid side building');
  a.hit(bk.askQtyChange && bk.askQtyChange > 0.3 && c.bear, 0.5, 'Ask side building');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('17.8', 17, 'Depth By Price Level');
  const l3 = bk.top3Bid / (bk.top3Ask || 1);
  a.hit(l3 > 1.3 && c.bull, 1.5, 'Near-bid depth heavier');
  a.hit(l3 < 0.77 && c.bear, 1.5, 'Near-ask depth heavier');
  a.hit(l3 < 0.77 && c.bull, -1, 'NaP price rising vs ask-heavy = absorption');
  a.hit(l3 > 1.3 && c.bear, -1, 'Pricer falling vs bid-heavy = absorption');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('17.9', 17, 'Order Book & Price Action');
  a.hit(bw && lastPin(tf.candles).bull && c.l >= bw.p - atr * 0.1, 2, 'Pin + bid wall defense');
  a.hit(aw && lastPin(tf.candles).bear && c.h <= aw.p + atr * 0.1, 2, 'Pin + ask wall defense');
  a.hit(bw && p2b(S, tf, 'bull') && c.c > i.ema8, 1.5, 'Bullish candle carving bid wall');
  a.hit(aw && p2b(S, tf, 'bear') && c.c < i.ema8, 1.5, 'Bearish candle carving ask wall');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('17.10', 17, 'Order Book Risk');
  a.hit(bw && bw.sizePct > 0.4 && bw.p > S.price, -1.5, 'Ask wall above = resistance risk');
  a.hit(bk.spread > 0.5, -2, 'Spread > $0.50 = liquidity risk');
  a.hit(bk.spread > 1, -2.5, 'Spread > $1 = extreme illiquidity');
  a.hit(bk.bidVol < 100 && bk.askVol < 100, -1, 'Empty book = no liquidity');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function p2b(S, tf, dir) {
  const p = lastPin(tf.candles);
  if (dir === 'bull') return p.bull;
  return p.bear;
}

function cat18(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const bk = S.book, imb = bk.imbalBid;

  let a = new AgentEval('18.1', 18, 'Real-Time Imbalance Tracker');
  a.hit(imb > 0.55 && imb < 0.8, 1, 'Moderate bid imbalance');
  a.hit(imb < 0.45 && imb > 0.2, 1, 'Moderate ask imbalance');
  a.hit(imb >= 0.8, 1.5, 'Extreme bid imbalance');
  a.hit(imb <= 0.2, 1.5, 'Extreme ask imbalance');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('18.2', 18, 'Imbalance Flip Detector');
  a.hit(bk.imbalPrev !== null && bk.imbalPrev < 0.45 && imb > 0.55, 2, 'Flip to bid-heavy');
  a.hit(bk.imbalPrev !== null && bk.imbalPrev > 0.55 && imb < 0.45, 2, 'Flip to ask-heavy');
  a.hit(bk.imbalPrev !== null && Math.abs(bk.imbalPrev - imb) < 0.02, -0.5, 'Stale imbalance');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('18.3', 18, 'Imbalance & Key Levels');
  a.hit(imb > 0.55 && S.srLo && S.srLo[0] && Math.abs(S.price - S.srLo[0]) < atr * 0.6, 2, 'Bid-heavy at support');
  a.hit(imb < 0.45 && S.srHi && S.srHi[0] && Math.abs(S.price - S.srHi[0]) < atr * 0.6, 2, 'Ask-heavy at resistance');
  a.hit(imb > 0.55 && S.pivots && Math.abs(S.price - S.pivots.s1) < atr * 0.6, 1, 'Bid-heavy at pivot S1');
  a.hit(imb < 0.45 && S.pivots && Math.abs(S.price - S.pivots.r1) < atr * 0.6, 1, 'Ask-heavy at pivot R1');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('18.4', 18, 'Imbalance During Breakouts');
  const rng = S.range;
  const upB = rng && c.c > rng.top && c.prev.c <= rng.top;
  const dnB = rng && c.c < rng.bot && c.prev.c >= rng.bot;
  a.hit(upB && imb > 0.55, 2, 'Breakout with bid imbalance');
  a.hit(dnB && imb < 0.45, 2, 'Breakdown with ask imbalance');
  a.hit(upB && imb < 0.4, -1.5, 'Breakout against book = trap risk');
  a.hit(dnB && imb > 0.6, -1.5, 'Breakdown against book = trap risk');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('18.5', 18, 'Imbalance Divergence');
  a.hit(imb > 0.6 && c.bear, -1.5, 'Price down vs bid-heavy = distribution');
  a.hit(imb < 0.4 && c.bull, -1.5, 'Price up vs ask-heavy = accumulation');
  a.hit(imb > 0.6 && c.bull && S.cvd > S.cvdPrev, 1.5, 'Bid-heavy + CVD + green = strong');
  a.hit(imb < 0.4 && c.bear && S.cvd < S.cvdPrev, 1.5, 'Ask-heavy + CVD + red = strong');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('18.6', 18, 'Imbalance Time Analysis');
  a.hit(S.sessions && S.sessions.isLondon && bk.spread < 0.15 && Math.abs(imb - 0.5) > 0.15, 1.5, 'London liquid, strong imbalance');
  a.hit(S.sessions && S.sessions.isAsian && Math.abs(imb - 0.5) > 0.25, -1, 'Asian fake imbalance');
  a.hit(bk.spread > 0.35 && imb > 0.65, -1, 'Wide spread + heavy bid = stale');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('18.7', 18, 'Imbalance & Microstructure');
  a.hit(imb > 0.55 && S.aggBuyPct !== null && S.aggBuyPct > 0.55, 1.5, 'Book + tape aligned bullish');
  a.hit(imb < 0.45 && S.aggBuyPct !== null && S.aggBuyPct < 0.45, 1.5, 'Book + tape aligned bearish');
  a.hit(imb > 0.55 && S.aggBuyPct !== null && S.aggBuyPct < 0.45, -1, 'Book vs tape conflict');
  a.hit(imb < 0.45 && S.aggBuyPct !== null && S.aggBuyPct > 0.55, -1, 'Book vs tape conflict');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('18.8', 18, 'Multi-Level Imbalance');
  a.hit(bk.l1Bid > bk.l1Ask * 1.5 && imb > 0.5, 1, 'Level-1 bid stacked');
  a.hit(bk.l1Ask > bk.l1Bid * 1.5 && imb < 0.5, 1, 'Level-1 ask stacked');
  a.hit(bk.top3Bid > bk.top3Ask * 1.5 && imb > 0.5, 1, 'Top-3 bid stacked');
  a.hit(bk.top3Ask > bk.top3Bid * 1.5 && imb < 0.5, 1, 'Top-3 ask stacked');
  a.hit(bk.l1Bid > bk.l1Ask * 2 && bk.top3Bid < bk.top3Ask, -1, 'Spoofed level-1 wall');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('18.9', 18, 'Imbalance Decay Patterns');
  a.hit(bk.imbalPrev !== null && imb > bk.imbalPrev + 0.1 && c.bull, 1, 'Bid imbalance building');
  a.hit(bk.imbalPrev !== null && imb < bk.imbalPrev - 0.1 && c.bear, 1, 'Ask imbalance building');
  a.hit(bk.imbalPrev !== null && imb < bk.imbalPrev - 0.15 && c.bull, -1, 'Bid imbalance decaying');
  a.hit(bk.imbalPrev !== null && imb > bk.imbalPrev + 0.15 && c.bear, -1, 'Ask imbalance decaying');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('18.10', 18, 'Imbalance Risk');
  a.hit(imb > 0.8, -1, 'Extreme bid = wall removal risk');
  a.hit(imb < 0.2, -1, 'Extreme ask = wall removal risk');
  a.hit(bk.spread > 0.5 && Math.abs(imb - 0.5) > 0.3, -1.5, 'Wide spread + extreme = no trade');
  a.hit(bk.bidVol < 50 || bk.askVol < 50, -1.5, 'Low book liquidity = skip');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat19(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const trades = S.aggTrades || [];
  const large = S.largeTrades ? S.largeTrades.count : 0;
  const buyPct = S.aggBuyPct;

  let a = new AgentEval('19.1', 19, 'Large Print Detector');
  a.hit(large === 0 && trades.length > 0, -1, 'No large prints');
  a.hit(large > 0 && large < 5, 0.5, 'Few large prints');
  a.hit(large >= 5 && buyPct > 0.55, 2, 'Large buyer prints');
  a.hit(large >= 5 && buyPct < 0.45, 2, 'Large seller prints');
  a.hit(large >= 10 && buyPct > 0.6, 2, 'Whale accumulation');
  a.hit(large >= 10 && buyPct < 0.4, 2, 'Whale distribution');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('19.2', 19, 'Tape Speed Analyst');
  const tps = trades.length;
  a.hit(tps > 150 && c.bull, 1.5, 'Fast tape + up move');
  a.hit(tps > 150 && c.bear, 1.5, 'Fast tape + down move');
  a.hit(tps < 30, -1, 'Dead tape');
  a.hit(tps > 150 && S.liq.sweptL && buyPct > 0.55, 1.5, 'Fast tape after sweep');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('19.3', 19, 'Trade Sequence Analyst');
  const seq = S.tradeSeq || 0;
  a.hit(seq > 0.3 && c.bull, 1.5, 'Consecutive buy sequence');
  a.hit(seq < -0.3 && c.bear, 1.5, 'Consecutive sell sequence');
  a.hit(Math.abs(seq) < 0.05, -0.5, 'Mixed tape');
  a.hit(seq > 0.3 && c.bear, -1, 'Buy sequence but price falling');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('19.4', 19, 'Aggressive vs Passive');
  a.hit(buyPct > 0.6, 2, 'Aggressive buying');
  a.hit(buyPct < 0.4, 2, 'Aggressive selling');
  a.hit(buyPct > 0.6 && S.price < i.ema21, 1, 'Aggressive buying below EMA = demand');
  a.hit(buyPct < 0.4 && S.price > i.ema21, 1, 'Aggressive selling above EMA = supply');
  a.hit(Math.abs(buyPct - 0.5) < 0.02, -1, 'Passive equilibrium');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('19.5', 19, 'Tape Pattern Recognition');
  const absorbUp = buyPct > 0.55 && c.bear;
  const absorbDn = buyPct < 0.45 && c.bull;
  a.hit(absorbUp, -1.5, 'Buying into red = absorption');
  a.hit(absorbDn, -1.5, 'Selling into green = absorption');
  a.hit(buyPct > 0.55 && c.bull && c.range < atr * 0.5, 1.5, 'Quiet grind with buy tape = accumulation');
  a.hit(buyPct < 0.45 && c.bear && c.range < atr * 0.5, 1.5, 'Quiet grind with sell tape = distribution');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('19.6', 19, 'Trade Size Distribution');
  a.hit(S.tradeAggPct !== null && S.tradeAggPct > 0.2, 1.5, '20%+ of volume in prints');
  a.hit(S.tradeAggPct !== null && S.tradeAggPct > 0.2 && buyPct > 0.55, 1.5, 'Institutional + buying');
  a.hit(S.tradeAggPct !== null && S.tradeAggPct > 0.2 && buyPct < 0.45, 1.5, 'Institutional + selling');
  a.hit(S.tradeAggPct !== null && S.tradeAggPct < 0.02, -1, 'All retail flow');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('19.7', 19, 'Time & Sales Context');
  a.hit(c.range > atr && buyPct > 0.55, 1.5, 'Range expansion + buy flow');
  a.hit(c.range > atr && buyPct < 0.45, 1.5, 'Range expansion + sell flow');
  a.hit(c.range < atr * 0.3 && trades.length > 80, -1, 'Chop with heavy tape');
  a.hit(i.rvol > 2 && buyPct > 0.55 && c.bull, 1.5, 'RVOL + buys + green');
  a.hit(i.rvol > 2 && buyPct < 0.45 && c.bear, 1.5, 'RVOL + sells + red');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('19.8', 19, 'Tape & Key Levels');
  a.hit(buyPct > 0.55 && S.srLo && S.srLo[0] && Math.abs(S.price - S.srLo[0]) < atr * 0.6, 2, 'Buy tape at support');
  a.hit(buyPct < 0.45 && S.srHi && S.srHi[0] && Math.abs(S.price - S.srHi[0]) < atr * 0.6, 2, 'Sell tape at resistance');
  a.hit(buyPct > 0.55 && S.liq.sweptL, 1.5, 'Buy tape after sweep low');
  a.hit(buyPct < 0.45 && S.liq.sweptH, 1.5, 'Sell tape after sweep high');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('19.9', 19, 'Multi-Timeframe Tape');
  const c3 = lastCandle(S.tf['3m'].candles);
  a.hit(c3.range < atr * 0.4 && buyPct > 0.55, 1, '3m quiet + 15m buy tape');
  a.hit(c3.range < atr * 0.4 && buyPct < 0.45, 1, '3m quiet + 15m sell tape');
  a.hit(c3.range > atr * 0.9 && Math.abs(buyPct - 0.5) < 0.03, -1, '5m busy but indecisive');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('19.10', 19, 'Tape Risk');
  a.hit(trades.length < 20, -2, 'Too few trades for analysis');
  a.hit(S.forceLiq && S.forceLiq.count > 30 && buyPct < 0.45, -1, 'Liquidation cascade distorting tape');
  a.hit(S.regime === 'HIGH' && Math.abs(buyPct - 0.5) > 0.25, -1, 'Extreme tape in panic');
  a.hit(S.spread > 0.5, -1, 'Wide spread = tape meaningless');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat20(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const buyPct = S.aggBuyPct;
  const volMult = c.v / (i.volAvg || 1);

  let a = new AgentEval('20.1', 20, 'Absorption at Resistance');
  a.hit(S.srHi && S.srHi[0] && Math.abs(S.price - S.srHi[0]) < atr * 0.6 && buyPct > 0.55 && c.bear, -2, 'Buying absorbed at resistance = supply');
  a.hit(S.srHi && S.srHi[0] && Math.abs(S.price - S.srHi[0]) < atr * 0.6 && buyPct > 0.6 && c.bull, 1.5, 'Buy pressure melting resistance');
  a.hit(S.srHi && S.srHi[0] && c.h > S.srHi[0] && c.c < S.srHi[0] && volMult > 1.5, -1.5, 'Sweep + heavy volume = reversion');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('20.2', 20, 'Absorption at Support');
  a.hit(S.srLo && S.srLo[0] && Math.abs(S.price - S.srLo[0]) < atr * 0.6 && buyPct < 0.45 && c.bull, 2, 'Selling absorbed at support = demand');
  a.hit(S.srLo && S.srLo[0] && Math.abs(S.price - S.srLo[0]) < atr * 0.6 && buyPct < 0.4 && c.bear, -1.5, 'Sell pressure melting support');
  a.hit(S.srLo && S.srLo[0] && c.l < S.srLo[0] && c.c > S.srLo[0] && volMult > 1.5, 1.5, 'Sweep + heavy volume = reversion');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('20.3', 20, 'Exhaustion Volume');
  a.hit(volMult > 2.5 && c.bull && i.rsi && i.rsi > 72, -2, 'Volume climax + RSI > 72 = exhaustion');
  a.hit(volMult > 2.5 && c.bear && i.rsi && i.rsi < 28, 2, 'Volume climax + RSI < 28 = exhaustion');
  a.hit(volMult > 2.5 && c.range < atr * 0.4, -1.5, 'Huge volume, small range = absorption');
  a.hit(volMult > 2.5 && S.liq.sweptH, -1.5, 'Climax volume into sweep high');
  a.hit(volMult > 2.5 && S.liq.sweptL, 1.5, 'Climax volume into sweep low');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('20.4', 20, 'Exhaustion Price Action');
  const p = lastPin(tf.candles);
  a.hit(p.bull && S.liq.sweptL && volMult < 0.5, 1.5, 'Quiet sweep = spring');
  a.hit(p.bear && S.liq.sweptH && volMult < 0.5, 1.5, 'Quiet sweep = trap');
  a.hit(p.bull && volMult > 1.5 && c.c > i.ema8, 1, 'Pin with volume reclaim');
  a.hit(p.bear && volMult > 1.5 && c.c < i.ema8, 1, 'Pin with volume reject');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('20.5', 20, 'Absorption Pattern Combo');
  a.hit(Math.abs(buyPct - 0.5) < 0.03 && c.prev.bear && c.bull, 1.5, 'Imbalance resolution bullish');
  a.hit(Math.abs(buyPct - 0.5) < 0.03 && c.prev.bull && c.bear, 1.5, 'Imbalance resolution bearish');
  a.hit(Math.abs(buyPct - 0.5) < 0.03 && S.liq.sweptL, 2, 'Quiet absorption + sweep = fuel');
  a.hit(Math.abs(buyPct - 0.5) < 0.03 && S.liq.sweptH, 2, 'Quiet absorption + sweep = fuel');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('20.6', 20, 'Exhaustion Derivatives');
  a.hit(S.funding !== null && S.funding > 0.0004 && c.bull && i.rsi > 65, -2, 'Extreme funding + rally = crowded');
  a.hit(S.funding !== null && S.funding < -0.0004 && c.bear && i.rsi < 35, 2, 'Extreme funding + sell-off = crowded');
  a.hit(S.lsGlobal !== null && S.lsGlobal > 0.75 && S.price > S.prevDay.h, -1, '75%+ longs = pacing');
  a.hit(S.lsGlobal !== null && S.lsGlobal < 0.25 && S.price < S.prevDay.l, 1, '75%+ shorts = pacing');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('20.7', 20, 'Micro-Exhaustion');
  const c3 = lastCandle(S.tf['3m'].candles);
  const c5 = lastCandle(S.tf['5m'].candles);
  a.hit(c3.bull && c3.range > atr * 0.6 && c5.bear, -1, '3m thrust reversed on 5m');
  a.hit(c3.bear && c3.range > atr * 0.6 && c5.bull, 1, '3m dump reversed on 5m');
  a.hit(c3.range < atr * 0.2 && S.liq.sweptL && c3.bull, 1, 'Micro spring');
  a.hit(c3.range < atr * 0.2 && S.liq.sweptH && c3.bear, 1, 'Micro trap');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('20.8', 20, 'Absorption Time');
  a.hit(S.sessions && S.sessions.isLondon && Math.abs(buyPct - 0.5) < 0.03 && c.range < atr * 0.3, 1, 'London absorption = setup');
  a.hit(S.sessions && S.sessions.isNY && Math.abs(buyPct - 0.5) < 0.03 && c.range < atr * 0.3, 1, 'NY absorption = setup');
  a.hit(S.sessions && S.sessions.isAsian && Math.abs(buyPct - 0.5) < 0.03 && c.range < atr * 0.3, -0.5, 'Asian absorption = noise');
  a.hit(Math.abs(buyPct - 0.5) < 0.03 && bkVol(S) > i.volAvg * 2, 1.5, 'Heavy volume absorption');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('20.9', 20, 'Exhaustion Recovery');
  a.hit(c8reds(tf) && c.bull && volMult > 1.3, 2, 'Recovery candle after sell-off');
  a.hit(c8greens(tf) && c.bear && volMult > 1.3, 2, 'Fail candle after rally');
  a.hit(c8reds(tf) && p.bull && buyPct > 0.55, 2, 'Exhausted + buy tape = reversal');
  a.hit(c8greens(tf) && p.bear && buyPct < 0.45, 2, 'Exhausted + sell tape = reversal');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('20.10', 20, 'Exhaustion Risk');
  a.hit(S.regime === 'HIGH' && volMult > 3, -1, 'Panic volume = wide risk');
  a.hit(S.forceLiq && S.forceLiq.count > 50, -1, 'Cascade liquidations = skipping');
  a.hit(S.liq.sweptL && S.liq.sweptAt > 2, -1, 'Sweep too long ago = stale');
  a.hit(S.liq.sweptH && S.liq.sweptAt > 2, -1, 'Sweep too long ago = stale');
  a.hit(S.spread > 0.5 && volMult > 2.5, -1.5, 'Wide spread in climax = skip');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function bkVol(S) {
  const k = S.tf['3m'].candles;
  const last = k[k.length - 1];
  return last ? Number(last[5]) : 0;
}

function c8reds(tf) {
  return tf.candles.slice(-7).every(x => Number(x[4]) <= Number(x[1]));
}

function c8greens(tf) {
  return tf.candles.slice(-7).every(x => Number(x[4]) >= Number(x[1]));
}

module.exports = { cat11, cat12, cat13, cat14, cat15, cat16, cat17, cat18, cat19, cat20 };