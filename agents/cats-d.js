'use strict';
/* OMNISCIENT SCALPER v22.0 — Agent Categories 31–40: Volatility & Market Structure Masters (100 agents) */

const { AgentEval, finish, lastCandle, lastPin } = require('./rulebook');

const T = S => S.tf['15m'];

function cat31(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const atrPct = S.atr15pct || 0;

  let a = new AgentEval('31.1', 31, 'ATR Baseline');
  a.hit(atrPct > 0.0008 && atrPct < 0.0045, 1.5, 'ATR% in scalp band');
  a.hit(atrPct < 0.0008, -1, 'ATR% too low');
  a.hit(atrPct > 0.0045, -1, 'ATR% too high');
  a.hit(c.range > atr * 1.8 && c.bull, 1, 'Expansion candle vs ATR');
  a.hit(c.range < atr * 0.3, 0.5, 'Contraction candle vs ATR');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('31.2', 31, 'ATR Percent Regime');
  a.hit(atrPct < 0.0012, -1, 'Low ATR% regime');
  a.hit(atrPct > 0.0035, -1, 'High ATR% regime');
  a.hit(atrPct >= 0.0012 && atrPct <= 0.0035, 1.5, 'Healthy scalp regime');
  a.hit(atrPct > 0.0045 && S.forceLiq && S.forceLiq.count > 30, -1.5, 'Liquidation-driven vol = skip');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('31.3', 31, 'ATR Position Sizing');
  a.hit(atrPct > 0.002 && atrPct < 0.0035, 1.5, 'Size per 1% risk fits');
  a.hit(atrPct > 0.0035, 0.5, 'Reduce size for wide ATR');
  a.hit(atrPct < 0.0012, 0.5, 'Increase size tight ATR');
  a.hit(S.spread > 0.5 && atrPct < 0.0015, -1.5, 'Spread eats tight ATR edge');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('31.4', 31, 'ATR Take Profit');
  a.hit(S.prevDay && atr * 2.5 < S.prevDay.h - S.prevDay.l, 1.5, '2.5 ATR TP within day range');
  a.hit(S.prevDay && atr * 3.5 > S.prevDay.h - S.prevDay.l, 1, 'TP reachable in session');
  a.hit(S.prevDay && atr * 4 > S.prevDay.h - S.prevDay.l, -0.5, 'TP may need multi-session');
  a.hit(S.sessions && S.sessions.isLondon && atr * 2 < S.prevDay.h - S.prevDay.l, 1, 'London can carry 2 ATR');
  a.hit(S.sessions && S.sessions.isNY && atr * 3 < S.prevDay.h - S.prevDay.l, 1, 'NY can carry 3 ATR');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('31.5', 31, 'ATR Envelope Trading');
  a.hit(Math.abs(S.price - i.ema21) > atr * 1.2 && S.bias15 === 'LONG', 1, 'Inside +1.2 ATR envelope');
  a.hit(Math.abs(S.price - i.ema21) > atr * 1.2 && S.bias15 === 'SHORT', 1, 'Inside -1.2 ATR envelope');
  a.hit(Math.abs(S.price - i.ema21) > atr * 2, -1, 'Outside 2 ATR = stretched');
  a.hit(c.range > atr * 2.2, -1, 'Wick spike vs envelope');
  a.hit(S.liq.sweptL && Math.abs(S.price - i.ema21) < atr * 1, 1.5, 'Sweep inside envelope = recover');
  a.hit(S.liq.sweptH && Math.abs(S.price - i.ema21) < atr * 1, 1.5, 'Sweep inside envelope = recover');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('31.6', 31, 'ATR Trailing Stop');
  a.hit(S.bias15 === 'LONG' && c.c > c.prev.c - atr * 0.5, 1, 'Trail 0.5 ATR intact');
  a.hit(S.bias15 === 'SHORT' && c.c < c.prev.c + atr * 0.5, 1, 'Trail 0.5 ATR intact');
  a.hit(S.bias15 === 'LONG' && c.c < c.prev.c - atr * 1, -1.5, 'Trail 1 ATR broken');
  a.hit(S.bias15 === 'SHORT' && c.c > c.prev.c + atr * 1, -1.5, 'Trail 1 ATR broken');
  a.hit(c.prev.prev && Number(tf.candles[tf.candles.length - 3][4]) < c.c - atr * 1.5 && S.bias15 === 'LONG', 1, 'Higher swing trail hold');
  a.hit(c.prev.prev && Number(tf.candles[tf.candles.length - 3][4]) > c.c + atr * 1.5 && S.bias15 === 'SHORT', 1, 'Lower swing trail hold');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('31.7', 31, 'ATR & Candle Patterns');
  const p = lastPin(tf.candles);
  a.hit(p.bull && p.lower > atr * 1.5, 2, 'Pin wick > 1.5 ATR');
  a.hit(p.bear && p.upper > atr * 1.5, 2, 'Pin wick > 1.5 ATR');
  a.hit(c.range > atr * 1.5 && c.bull, 1.5, 'Engulf-style range vs ATR');
  a.hit(c.range < atr * 0.4 && c.bull, 1, 'Harami tight vs ATR');
  a.hit(p.bull && S.liq.sweptL && p.lower > atr, 1.5, 'Sweep pin with ATR wick');
  a.hit(p.bear && S.liq.sweptH && p.upper > atr, 1.5, 'Sweep pin with ATR wick');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('31.8', 31, 'ATR Multi-Timeframe');
  const atr3 = S.tf['3m'].i.atr, atr1h = S.tf['1h'].i.atr;
  a.hit(atr1h && atr / atr1h > 0.35 && atr / atr1h < 0.6, 1, '15m ATR healthy vs 1h');
  a.hit(atr1h && atr / atr1h < 0.2, 1, '15m ATR compressed vs 1h');
  a.hit(atr3 && atr3 / atr > 0.5, -1, '3m vol burning out');
  a.hit(atr1h && atr1h > S.tf['1h'].i.ema21 - S.tf['1h'].i.ema50 && S.regime === 'HIGH', -1, '1h vol extreme');
  a.hit(atr1h && atr1h < (S.prevDay.h - S.prevDay.l) * 0.15, 1, '1h ATR vs day range sane');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('31.9', 31, 'ATR & Derivatives');
  a.hit(S.funding !== null && Math.abs(S.funding) > 0.0003 && atrPct > 0.0035, -1, 'Extreme funding + vol = flush');
  a.hit(S.oiDelta !== null && S.oiDelta > 0.05 && atrPct > 0.004, -1, 'OI spike + vol spike = squeeze');
  a.hit(S.lsGlobal !== null && S.lsGlobal > 0.7 && atrPct < 0.0015, -1, 'Crowded + quiet = trap');
  a.hit(S.forceLiq && S.forceLiq.count > 20 && atrPct > 0.0045, -1.5, 'Liq cascade = skip');
  a.hit(S.basisPct !== null && S.basisPct > 0.0005 && atrPct > 0.004, -1, 'Basis blowout + vol = unwind');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('31.10', 31, 'ATR Risk');
  a.hit(atrPct > 0.0045, -2, 'ATR% exceeds gate');
  a.hit(atrPct < 0.0008, -2, 'ATR% below gate');
  a.hit(S.spread > atr * 0.2, -1.5, 'Spread > 20% of ATR');
  a.hit(S.regime === 'HIGH' && c.range > atr * 2.5, -1.5, '2.5 ATR candle = skip');
  a.hit(S.sessions && S.sessions.isWeekend && atrPct < 0.0012, -1, 'Weekend thin vol = skip');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat32(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const bb = i.bb;

  let a = new AgentEval('32.1', 32, 'Bollinger Band Touch');
  a.hit(bb && c.l <= bb.lower && c.c > bb.lower, 1.5, 'Lower band touch reclaim');
  a.hit(bb && c.h >= bb.upper && c.c < bb.upper, 1.5, 'Upper band touch reject');
  a.hit(bb && c.c <= bb.lower, 1.5, 'Close below lower band');
  a.hit(bb && c.c >= bb.upper, 1.5, 'Close above upper band');
  a.hit(bb && S.liq.sweptL && c.l <= bb.lower, 2, 'Sweep + lower band = spring');
  a.hit(bb && S.liq.sweptH && c.h >= bb.upper, 2, 'Sweep + upper band = trap');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('32.2', 32, 'Bollinger Squeeze');
  a.hit(bb && bb.bw < 0.06, 1.5, 'BB squeeze');
  a.hit(bb && bb.bw < 0.04, 2, 'Extreme BB squeeze');
  a.hit(bb && bb.bw < 0.06 && c.v > i.volAvg * 1.5, 2, 'Squeeze + volume = expansion');
  a.hit(bb && bb.bw < 0.06 && i.adx && i.adx.adx < 18, 1, 'Squeeze + low ADX = coiled');
  a.hit(bb && bb.bw > 0.1, -0.5, 'Wide bands = no squeeze');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('32.3', 32, 'Bollinger Expansion');
  a.hit(bb && bb.bw > 0.09 && c.bull, 1, 'Expansion + green = run');
  a.hit(bb && bb.bw > 0.09 && c.bear, 1, 'Expansion + red = slide');
  a.hit(bb && bb.bw > 0.09 && S.liq.sweptH && c.bear, 1.5, 'Expansion into sweep = trend');
  a.hit(bb && bb.bw > 0.12, -0.5, 'Bands blown out = fade zone');
  a.hit(bb && bb.bw > 0.09 && S.forceLiq && S.forceLiq.count > 30, -1.5, 'Liq expansion = skip');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('32.4', 32, 'Bollinger %B');
  const pctB = bb ? (S.price - bb.lower) / (bb.upper - bb.lower || 1) : null;
  a.hit(pctB !== null && pctB > 1, -1, '%B above 1 = overbought');
  a.hit(pctB !== null && pctB < 0, 1, '%B below 0 = oversold');
  a.hit(pctB !== null && pctB > 0.8 && c.bear, -1.5, '%B 0.8 + red = fade');
  a.hit(pctB !== null && pctB < 0.2 && c.bull, 1.5, '%B 0.2 + green = buy');
  a.hit(pctB !== null && pctB > 0.95 && S.liq.sweptH, -1.5, '%B extreme + sweep = top');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('32.5', 32, 'Bollinger Bandwidth');
  a.hit(bb && bb.bw < 0.06 && i.prevBb && i.prevBb.bw > 0.07, 1.5, 'Bandwidth contracting');
  a.hit(bb && bb.bw > 0.09 && i.prevBb && i.prevBb.bw < 0.08, 1.5, 'Bandwidth expanding');
  a.hit(bb && i.prevBb && Math.abs(bb.bw - i.prevBb.bw) < 0.005, -0.5, 'Bandwidth flat');
  a.hit(bb && bb.bw < 0.04 && S.range && S.range.type === 'flat', 1.5, 'BB + price range tight');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('32.6', 32, 'Bollinger & Price Action');
  a.hit(bb && c.bull && c.c > bb.mid && c.prev.c < bb.mid, 1.5, 'Candle reclaim mid band');
  a.hit(bb && c.bear && c.c < bb.mid && c.prev.c > bb.mid, 1.5, 'Candle loss of mid band');
  a.hit(bb && c.l <= bb.lower && lastPin(tf.candles).bull, 2, 'Pin at lower band');
  a.hit(bb && c.h >= bb.upper && lastPin(tf.candles).bear, 2, 'Pin at upper band');
  a.hit(bb && c.c > bb.upper && c.prev.c > bb.upper, 1, 'Riding upper band trend');
  a.hit(bb && c.c < bb.lower && c.prev.c < bb.lower, 1, 'Riding lower band trend');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('32.7', 32, 'Bollinger Multi-Timeframe');
  const bb1h = S.tf['1h'].i.bb;
  a.hit(bb1h && c.l <= bb1h.lower && c.c > bb1h.lower, 1.5, '1h lower band hold');
  a.hit(bb1h && c.h >= bb1h.upper && c.c < bb1h.upper, 1.5, '1h upper band reject');
  a.hit(bb1h && bb && S.price > bb1h.mid && S.price < bb.mid, 0.5, '15m below 1h mid');
  a.hit(bb1h && bb1h.bw < 0.05 && bb && bb.bw < 0.06, 1.5, '1h + 15m squeeze stacked');
  a.hit(bb1h && c.c > bb1h.upper && bb && c.c > bb.upper, -1, 'Both bands = blow-off');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('32.8', 32, 'Bollinger & Volume');
  const v = c.v / (i.volAvg || 1);
  a.hit(bb && v > 2 && c.c > bb.upper, -1.5, 'Climax volume at upper band');
  a.hit(bb && v > 2 && c.c < bb.lower, 1.5, 'Climax volume at lower band');
  a.hit(bb && v > 2 && c.c > bb.mid && c.bull, 1, 'Volume push from mid up');
  a.hit(bb && v < 0.5 && c.c < bb.mid, -0.5, 'Dead volume below mid');
  a.hit(bb && v > 2 && S.liq.sweptL && c.c > bb.lower, 1.5, 'Volume + sweep + band hold');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('32.9', 32, 'Bollinger Mean Reversion');
  a.hit(bb && c.c > bb.upper && i.ema8 < i.ema21, -2, 'Upper band + downtrend = fade');
  a.hit(bb && c.c < bb.lower && i.ema8 > i.ema21, 2, 'Lower band + uptrend = buy');
  a.hit(bb && c.c > bb.upper + atr * 0.5, -1.5, 'Beyond band by 0.5 ATR');
  a.hit(bb && c.c < bb.lower - atr * 0.5, 1.5, 'Beyond band by 0.5 ATR');
  a.hit(bb && c.c > bb.upper && S.liq.sweptH, -1.5, 'Band + sweep = reversal');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('32.10', 32, 'Bollinger Risk');
  a.hit(bb && bb.bw < 0.03 && S.regime === 'LOW', -1, 'Bandwidth too tight = no room');
  a.hit(bb && bb.bw > 0.14, -1.5, 'Bandwidth extreme = panic');
  a.hit(bb && c.range > (bb.upper - bb.lower) * 0.9, -1, 'Candle = band width = blow-off');
  a.hit(bb === null, -1.5, 'No BB data');
  a.hit(S.spread > 0.5 && bb && bb.bw < 0.05, -1.5, 'Tight bands + wide spread = skip');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat33(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const kc = i.kc;

  let a = new AgentEval('33.1', 33, 'Keltner Touch');
  a.hit(kc && c.l <= kc.lower && c.c > kc.lower, 1.5, 'Lower band touch');
  a.hit(kc && c.h >= kc.upper && c.c < kc.upper, 1.5, 'Upper band touch');
  a.hit(kc && S.liq.sweptL && c.l <= kc.lower, 2, 'Sweep + lower touch');
  a.hit(kc && S.liq.sweptH && c.h >= kc.upper, 2, 'Sweep + upper touch');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('33.2', 33, 'Keltner Walk');
  a.hit(kc && c.c > kc.upper && c.prev.c > kc.upper, 1.5, 'Walking upper band up');
  a.hit(kc && c.c < kc.lower && c.prev.c < kc.lower, 1.5, 'Walking lower band down');
  a.hit(kc && c.c > kc.upper && i.adx && i.adx.adx > 25, 1.5, 'Band walk + strong ADX');
  a.hit(kc && c.c > kc.upper && c.bear, -1, 'Upper walk + red = rejection');
  a.hit(kc && c.c < kc.lower && c.bull, -1, 'Lower walk + green = rejection');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('33.3', 33, 'Keltner Breakout');
  a.hit(kc && c.c > kc.upper && c.prev.c < kc.upper && c.v > i.volAvg * 1.3, 2, 'Breakout with volume');
  a.hit(kc && c.c < kc.lower && c.prev.c > kc.lower && c.v > i.volAvg * 1.3, 2, 'Breakdown with volume');
  a.hit(kc && c.h > kc.upper && c.c < kc.upper, -1.5, 'Failed band breakout');
  a.hit(kc && c.l < kc.lower && c.c > kc.lower, -1.5, 'Failed band breakdown');
  a.hit(kc && c.c > kc.upper && c.c > c.prev.c + atr, 1, 'Displacement beyond band');
  a.hit(kc && c.c < kc.lower && c.c < c.prev.c - atr, 1, 'Displacement beyond band');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('33.4', 33, 'Keltner Compression');
  const kw = kc ? (kc.upper - kc.lower) / S.price : 1;
  a.hit(kc && kw < 0.004, 1.5, 'Keltner compression');
  a.hit(kc && kw < 0.004 && c.v > i.volAvg * 1.5, 2, 'Compression + volume = pop');
  a.hit(kc && kw < 0.004 && i.bb && i.bb.bw < 0.08, 2, 'KC + BB dual squeeze');
  a.hit(kc && kw < 0.004 && S.liq.sweptL, 1.5, 'Compression + sweep = launch');
  a.hit(kc && kw < 0.004 && S.liq.sweptH, 1.5, 'Compression + sweep = trap');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('33.5', 33, 'Keltner & Price Action');
  const p = lastPin(tf.candles);
  a.hit(kc && p.bull && c.l <= kc.lower, 2, 'Pin at lower band');
  a.hit(kc && p.bear && c.h >= kc.upper, 2, 'Pin at upper band');
  a.hit(kc && c.bull && c.c > kc.mid && c.prev.c < kc.mid, 1, 'Mid band reclaim');
  a.hit(kc && c.bear && c.c < kc.mid && c.prev.c > kc.mid, 1, 'Mid band loss');
  a.hit(kc && c.range < (kc.upper - kc.lower) * 0.4, 1, 'Quiet inside band');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('33.6', 33, 'Keltner Multi-Timeframe');
  const kc1h = S.tf['1h'].i.kc;
  a.hit(kc1h && c.c > kc1h.upper && kc && c.c > kc.upper, 1.5, '1h + 15m upper walk');
  a.hit(kc1h && c.c < kc1h.lower && kc && c.c < kc.lower, 1.5, '1h + 15m lower walk');
  a.hit(kc1h && c.l <= kc1h.lower && c.c > kc1h.lower, 1.5, '1h lower band hold');
  a.hit(kc1h && c.h >= kc1h.upper && c.c < kc1h.upper, 1.5, '1h upper band reject');
  a.hit(kc1h && S.price > kc1h.upper && S.bias1h === 'LONG', 1, '1h band + bias up');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('33.7', 33, 'Keltner & Volume');
  const v = c.v / (i.volAvg || 1);
  a.hit(kc && v > 2 && c.c > kc.upper, -1.5, 'Climax at upper band');
  a.hit(kc && v > 2 && c.c < kc.lower, 1.5, 'Climax at lower band');
  a.hit(kc && v > 1.5 && c.bull && c.c > kc.mid, 1, 'Volume push above mid');
  a.hit(kc && v > 1.5 && c.bear && c.c < kc.mid, 1, 'Volume push below mid');
  a.hit(kc && v < 0.5 && c.c > kc.upper, -0.5, 'Band walk no volume');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('33.8', 33, 'Keltner Mean Reversion');
  a.hit(kc && c.c > kc.upper && i.ema8 < i.ema21, -2, 'Upper band fade in downtrend');
  a.hit(kc && c.c < kc.lower && i.ema8 > i.ema21, 2, 'Lower band buy in uptrend');
  a.hit(kc && c.c > kc.upper + atr * 0.5, -1.5, 'Beyond band + 0.5 ATR');
  a.hit(kc && c.c < kc.lower - atr * 0.5, 1.5, 'Beyond band - 0.5 ATR');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('33.9', 33, 'Keltner Bandwidth');
  a.hit(kc && kw > 0.01, -1, 'Keltner wide = chop');
  a.hit(kc && kw < 0.003, 1.5, 'Keltner ultra tight');
  a.hit(kc && i.prevKc && kw < i.prevKc.bw * 0.8, 1, 'Keltner compressing');
  a.hit(kc && i.prevKc && kw > i.prevKc.bw * 1.3, 1, 'Keltner expanding');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('33.10', 33, 'Keltner Risk');
  a.hit(kc === null, -1.5, 'No KC data');
  a.hit(kc && kw > 0.012 && S.spread > 0.5, -1.5, 'Wide band + spread = skip');
  a.hit(kc && S.regime === 'HIGH' && kw > 0.012, -1, 'High vol wide band = whip');
  a.hit(kc && c.range > kw * 3, -1, 'Candle 3x band width');
  a.hit(kc && Math.abs(S.price - kc.mid) > (kc.upper - kc.lower), -0.5, 'Stretched from KC mid');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat34(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const atrPct = S.atr15pct || 0;

  let a = new AgentEval('34.1', 34, 'Regime Classification');
  a.hit(S.regime === 'LOW', -0.5, 'Low vol regime');
  a.hit(S.regime === 'NORM', 1, 'Normal regime = scalp ideal');
  a.hit(S.regime === 'HIGH', -1, 'High vol regime = caution');
  a.hit(atrPct >= 0.0012 && atrPct <= 0.0035, 1.5, 'ATR% in scalp band');
  a.hit(S.regime === 'LOW' && S.range && S.range.type === 'flat', -0.5, 'Low vol range');
  a.hit(S.regime === 'HIGH' && S.forceLiq && S.forceLiq.count > 30, -1.5, 'Vol + liquidations = skip');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('34.2', 34, 'Low Volatility Trading');
  a.hit(S.regime === 'LOW' && i.adx && i.adx.adx > 25, 1.5, 'Low vol but trending = grind');
  a.hit(S.regime === 'LOW' && c.bull && c.c > i.ema21, 1, 'Quiet uptrend ride');
  a.hit(S.regime === 'LOW' && S.liq.sweptL, 1.5, 'Quiet sweep = spring');
  a.hit(S.regime === 'LOW' && Math.abs(S.price - i.ema21) < atr * 0.5, 1, 'Low vol at mean = set entry');
  a.hit(S.regime === 'LOW' && c.range > atr * 1.2, 1, 'Expansion from low vol');
  a.hit(S.regime === 'LOW' && S.range && S.range.width > 0.004, -1, 'Low vol + wide range = false');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('34.3', 34, 'Normal Volatility Trading');
  a.hit(S.regime === 'NORM' && S.bias15 === 'LONG' && c.c > i.ema21, 1.5, 'Normal vol trend long');
  a.hit(S.regime === 'NORM' && S.bias15 === 'SHORT' && c.c < i.ema21, 1.5, 'Normal vol trend short');
  a.hit(S.regime === 'NORM' && c.l <= i.ema21 && c.c > i.ema21, 1.5, 'Normal vol pullback entry');
  a.hit(S.regime === 'NORM' && c.h >= i.ema21 && c.c < i.ema21, 1.5, 'Normal vol pullback entry');
  a.hit(S.regime === 'NORM' && Math.abs(S.price - i.ema21) < atr * 0.3, 1, 'At EMA-21 in normal vol');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('34.4', 34, 'High Volatility Trading');
  a.hit(S.regime === 'HIGH' && S.liq.sweptL && c.c > i.ema8, 1.5, 'High vol sweep + reclaim');
  a.hit(S.regime === 'HIGH' && S.liq.sweptH && c.c < i.ema8, 1.5, 'High vol sweep + reject');
  a.hit(S.regime === 'HIGH' && Math.abs(S.price - i.ema21) > atr * 2.5, -1.5, 'High vol stretched = fade only');
  a.hit(S.regime === 'HIGH' && S.forceLiq && S.forceLiq.count > 40, -2, 'High vol + liq cascade = no trade');
  a.hit(S.regime === 'HIGH' && S.spread > 0.5, -1.5, 'High vol + spread = skip');
  a.hit(S.regime === 'HIGH' && c.range > atr * 2, -1.5, 'High vol monster candle');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('34.5', 34, 'Volatility Transition');
  a.hit(S.regime === 'LOW' && c.range > atr * 1.5, 1.5, 'Leaving low vol = entry now');
  a.hit(S.regime === 'HIGH' && c.range < atr * 0.6 && i.adx && i.adx.adx < 20, 1.5, 'High vol cooling = fade');
  a.hit(S.regime === 'LOW' && S.liq.sweptL && c.v > i.volAvg * 2, 2, 'Squeeze break from low vol');
  a.hit(S.regime === 'HIGH' && S.liq.sweptH && c.v < i.volAvg * 0.5, 1.5, 'High vol drying = exhaustion');
  a.hit(S.regime === 'NORM' && c.range > atr * 2, -0.5, 'Normal vol jump = one-off');
  a.hit(S.regime === 'LOW' && c.range < atr * 0.4, -0.5, 'Still dead');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('34.6', 34, 'Volatility & Derivatives');
  a.hit(S.oiDelta !== null && S.oiDelta > 0.05 && S.regime === 'HIGH', -1.5, 'OI + vol spike = squeeze');
  a.hit(S.oiDelta !== null && S.oiDelta < -0.05 && S.regime === 'HIGH', 1.5, 'OI flush + vol = end of squeeze');
  a.hit(S.funding !== null && Math.abs(S.funding) > 0.0004 && S.regime === 'HIGH', -1, 'Funding + vol = crowded');
  a.hit(S.lsGlobal !== null && Math.abs(S.lsGlobal - 0.5) > 0.3 && S.regime === 'HIGH', -1, 'Extreme positioning + vol');
  a.hit(S.forceLiq && S.forceLiq.count > 50 && S.regime === 'HIGH', -1.5, 'Mass liquidations');
  a.hit(S.basisPct !== null && Math.abs(S.basisPct) > 0.001 && S.regime === 'HIGH', -1, 'Basis blowout');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('34.7', 34, 'Volatility Time Analysis');
  a.hit(S.sessions && S.sessions.isLondon && S.regime === 'LOW', 1.5, 'Low vol before London = setup');
  a.hit(S.sessions && S.sessions.isNY && S.regime === 'NORM', 1, 'NY normal vol = scalp');
  a.hit(S.sessions && S.sessions.isAsian && S.regime === 'HIGH', -1.5, 'Asian high vol = anomaly');
  a.hit(S.sessions && S.sessions.isWeekend && S.regime === 'HIGH', -1.5, 'Weekend high vol = news');
  a.hit(S.sessions && S.sessions.isNY && S.regime === 'HIGH', -0.5, 'NY high vol = respect');
  a.hit(S.sessions && S.sessions.isAsian && S.regime === 'LOW', -0.5, 'Asian dead = skip');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('34.8', 34, 'Volatility Pattern');
  const vols = tf.candles.slice(-10).map(x => Number(x[5]));
  const rising = vols[9] > vols[0] * 1.5;
  const falling = vols[9] < vols[0] * 0.6;
  a.hit(rising && c.bull && c.c > i.ema21, 1.5, 'Vol ramp + up trend');
  a.hit(rising && c.bear && c.c < i.ema21, 1.5, 'Vol ramp + down trend');
  a.hit(falling && S.liq.sweptL, 1, 'Vol decay + sweep = bounce');
  a.hit(rising && S.forceLiq && S.forceLiq.count > 30, -1.5, 'Vol ramp + liquidations');
  a.hit(falling && S.range && S.range.type === 'flat', -0.5, 'Vol decay in range = wait');
  a.hit(rising && S.liq.sweptH && c.bear, 1, 'Vol ramp into sweep = flush');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('34.9', 34, 'Volatility Comparative');
  const v1h = S.tf['1h'].i.atr, v1d = S.tf['1d'].i.atr;
  a.hit(v1h && atr > v1h * 0.5, 1, '15m ATR vs 1h ATR healthy');
  a.hit(v1d && atr > v1d * 0.25, 1, '15m ATR vs daily ATR active');
  a.hit(v1h && atr < v1h * 0.15, -1, '15m ATR dead vs 1h');
  a.hit(v1d && atr > v1d * 0.5, -1, '15m ATR huge vs daily = spike');
  a.hit(S.tf['4h'].i.atr && v1d && S.tf['4h'].i.atr > v1d * 0.4 && S.regime === 'HIGH', -1, '4h vol elevated');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('34.10', 34, 'Volatility Risk');
  a.hit(atrPct > 0.0045, -2, 'ATR% over gate');
  a.hit(atrPct < 0.0008, -2, 'ATR% under gate');
  a.hit(S.regime === 'HIGH' && S.liq.sweptL && c.c < S.liq.sweptL, -2, 'Sweep failed in high vol');
  a.hit(S.regime === 'HIGH' && S.liq.sweptH && c.c > S.liq.sweptH, -2, 'Sweep failed in high vol');
  a.hit(S.spread > 1, -2, 'Spread > $1');
  a.hit(S.regime === 'HIGH' && S.forceLiq && S.forceLiq.count > 60, -2, 'Cascade = full skip');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat35(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const atrPct = S.atr15pct || 0;

  let a = new AgentEval('35.1', 35, 'Base Risk');
  a.hit(1, 0.5, 'Base risk 1% per trade');
  a.hit(S.sigStreak !== null && S.sigStreak <= -2, 1, '2+ losses = auto 0.5% risk');
  a.hit(S.sigStreak !== null && S.sigStreak >= 3, -0.5, '3 wins = maintain, no raise');
  a.hit(S.sigStreak !== null && S.sigStreak >= 5, 0.5, 'Hot streak discipline');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('35.2', 35, 'Volatility Adjusted Size');
  a.hit(atrPct > 0.003, 0.5, 'Reduce size high ATR');
  a.hit(atrPct > 0.004, -0.5, 'Skip sizing high vol');
  a.hit(atrPct < 0.0015, 0.5, 'Room for full size low ATR');
  a.hit(S.spread > 0.5, -1, 'Spread > 0.5 = half size');
  a.hit(S.spread > 1, -1.5, 'Spread > 1 = skip');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('35.3', 35, 'Leverage Management');
  const lev = Math.min(10, 0.01 / (atrPct * 1.5 || 0.01));
  a.hit(lev <= 5, 1.5, 'Leverage <= 5x fits risk');
  a.hit(lev > 5 && lev <= 10, 0.5, 'Leverage 5-10x manageable');
  a.hit(lev > 10, -1.5, 'Leverage would exceed 10x = reject');
  a.hit(S.regime === 'HIGH' && lev > 5, -1, 'High vol = cap leverage');
  a.hit(S.sigStreak !== null && S.sigStreak <= -2 && lev > 3, -1, 'Loss streak = cut leverage');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('35.4', 35, 'Drawdown Control');
  a.hit(S.sigStreak !== null && S.sigStreak <= -4, -1.5, '4+ losses = pause');
  a.hit(S.sigStreak !== null && S.sigStreak === -3, -1, '3 losses = half risk');
  a.hit(S.sigStreak !== null && S.sigStreak >= 0, 0.5, 'Clean slate = full risk');
  a.hit(S.sigStreak !== null && S.sigStreak === -1, 0, 'Single loss = normal');
  a.hit(S.sigStreak !== null && S.sigStreak <= -6, -2, '6+ losses = full stop day');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('35.5', 35, 'R:R Optimization');
  const rr = S.sigRR;
  a.hit(rr !== null && rr >= 2, 1.5, 'R:R >= 2');
  a.hit(rr !== null && rr >= 1.5 && rr < 2, 1, 'R:R >= 1.5');
  a.hit(rr !== null && rr < 1.5, -2, 'R:R below 1.5 = reject');
  a.hit(rr !== null && rr > 3.5, -0.5, 'R:R too good = suspect level');
  a.hit(rr !== null && rr >= 2 && S.regime === 'NORM', 1, 'Quality RR in normal vol');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('35.6', 35, 'Position Scaling');
  a.hit(S.conf && S.conf >= 0.65, 1, 'High confidence = full size');
  a.hit(S.conf && S.conf >= 0.55 && S.conf < 0.65, 0.5, 'Moderate conf = half size');
  a.hit(S.conf && S.conf < 0.55, -1, 'Low conf = no size');
  a.hit(S.sigStreak !== null && S.sigStreak >= 3, -0.5, 'Anti-martingale: no scaling up');
  a.hit(S.spread > 0.5, -0.5, 'Spread penalty 50%');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('35.7', 35, 'Correlation Check');
  a.hit(S.corrBTC && Math.abs(S.corrBTC) > 0.5, -0.5, 'BTC correlation = diversify');
  a.hit(S.corrBTC && S.corrBTC > 0.6 && S.bias15 === 'LONG', 1, 'BTC tailwind for gold longs');
  a.hit(S.corrBTC && S.corrBTC < -0.6 && S.bias15 === 'SHORT', 1, 'BTC headwind = gold shorts fine');
  a.hit(S.corrBTC && Math.abs(S.corrBTC) < 0.2, 1, 'Low correlation = clean setup');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('35.8', 35, 'Time Validity');
  a.hit(1, 0.5, '12-min signal validity');
  a.hit(S.sigAge !== null && S.sigAge > 12, -2, 'Signal > 12 min old = void');
  a.hit(S.sigAge !== null && S.sigAge > 8, -1, 'Signal aging');
  a.hit(S.sigAge !== null && S.sigAge < 2, 0.5, 'Fresh signal');
  a.hit(S.sessions && S.sessions.minToNY < 30 && S.sigAge !== null && S.sigAge > 5, -1, 'NY open = re-eval');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('35.9', 35, 'Invalidation Rules');
  a.hit(S.bias15 === 'LONG' && c.c < S.sigSL, -2, '15m close beyond SL = cancel');
  a.hit(S.bias15 === 'SHORT' && c.c > S.sigSL, -2, '15m close beyond SL = cancel');
  a.hit(S.bias15 === 'LONG' && c.c < i.ema21 - atr * 1.5, -1, 'Deep EMA break = invalid');
  a.hit(S.bias15 === 'SHORT' && c.c > i.ema21 + atr * 1.5, -1, 'Deep EMA break = invalid');
  a.hit(S.liq.sweptH && S.bias15 === 'LONG', -0.5, 'Bias flip after sweep high');
  a.hit(S.liq.sweptL && S.bias15 === 'SHORT', -0.5, 'Bias flip after sweep low');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('35.10', 35, 'Position Risk Summary');
  const slDist = S.sigSL ? Math.abs(S.sigSL - S.price) : atr;
  a.hit(slDist <= atr * 1.5, 1.5, 'SL within 1.5 ATR');
  a.hit(slDist > atr * 2, -1.5, 'SL beyond 2 ATR = reject');
  a.hit(slDist > atr * 1.5 && slDist <= atr * 2, -1, 'SL 1.5-2 ATR = warn');
  a.hit(S.regime === 'HIGH' && slDist > atr * 1.2, -1, 'High vol tight SL need');
  a.hit(S.sigStreak !== null && S.sigStreak <= -2, 0.5, 'Loss streak = tighter stops');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat36(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const obs = S.obs || { bull: [], bear: [] };
  const p = lastPin(tf.candles);

  let a = new AgentEval('36.1', 36, 'Bullish Order Block');
  const b = obs.bull[0];
  a.hit(b && S.price <= b.top && S.price >= b.bot, 2, 'Inside bull OB');
  a.hit(b && Math.abs(S.price - b.bot) < atr * 0.4, 2, 'At bull OB bottom');
  a.hit(b && c.l <= b.bot && c.c > b.bot, 2, 'OB bottom swept & held');
  a.hit(b && c.c > b.top, 1, 'Above bull OB = active');
  a.hit(b && S.liq.sweptL && S.price <= b.top + atr * 0.5, 1.5, 'Sweep into bull OB');
  a.hit(b && c.c < b.bot - atr * 1.5, -1.5, 'Bull OB destroyed');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('36.2', 36, 'Bearish Order Block');
  const b2 = obs.bear[0];
  a.hit(b2 && S.price <= b2.top && S.price >= b2.bot, 2, 'Inside bear OB');
  a.hit(b2 && Math.abs(S.price - b2.top) < atr * 0.4, 2, 'At bear OB top');
  a.hit(b2 && c.h >= b2.top && c.c < b2.top, 2, 'OB top swept & held');
  a.hit(b2 && c.c < b2.bot, 1, 'Below bear OB = active');
  a.hit(b2 && S.liq.sweptH && S.price >= b2.bot - atr * 0.5, 1.5, 'Sweep into bear OB');
  a.hit(b2 && c.c > b2.top + atr * 1.5, -1.5, 'Bear OB destroyed');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('36.3', 36, 'Order Block Confluence');
  a.hit(b && S.srLo && S.srLo[0] && Math.abs(b.bot - S.srLo[0]) < atr, 2, 'OB + support confluence');
  a.hit(b2 && S.srHi && S.srHi[0] && Math.abs(b2.top - S.srHi[0]) < atr, 2, 'OB + resistance confluence');
  a.hit(b && S.liq.sweptL && S.liq.sweptL <= b.top, 1.5, 'OB + sweep confluence');
  a.hit(b2 && S.liq.sweptH && S.liq.sweptH >= b2.bot, 1.5, 'OB + sweep confluence');
  a.hit(b && i.ema50 && Math.abs(b.bot - i.ema50) < atr, 1.5, 'OB + EMA-50 confluence');
  a.hit(b2 && i.ema50 && Math.abs(b2.top - i.ema50) < atr, 1.5, 'OB + EMA-50 confluence');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('36.4', 36, 'Order Block Time');
  a.hit(b && b.at && tf.candles.length - b.at < 10, 1.5, 'Fresh bull OB (10 bars)');
  a.hit(b2 && b2.at && tf.candles.length - b2.at < 10, 1.5, 'Fresh bear OB (10 bars)');
  a.hit(b && b.at && tf.candles.length - b.at > 40, -1, 'Stale bull OB');
  a.hit(b2 && b2.at && tf.candles.length - b2.at > 40, -1, 'Stale bear OB');
  a.hit(b && S.price <= b.top && S.price >= b.bot && tf.candles.length - b.at < 5, 1.5, 'Untouched fresh OB');
  a.hit(b2 && S.price <= b2.top && S.price >= b2.bot && tf.candles.length - b2.at < 5, 1.5, 'Untouched fresh OB');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('36.5', 36, 'Order Block Volume');
  const v = c.v / (i.volAvg || 1);
  a.hit(b && v > 2 && S.price <= b.top && c.bull, 1.5, 'Volume confirming OB hold');
  a.hit(b2 && v > 2 && S.price >= b2.bot && c.bear, 1.5, 'Volume confirming OB hold');
  a.hit(b && v > 2 && c.c > b.top, 1, 'Volume through bull OB');
  a.hit(b2 && v > 2 && c.c < b2.bot, 1, 'Volume through bear OB');
  a.hit(b && v < 0.5, -0.5, 'Quiet at bull OB');
  a.hit(b2 && v < 0.5, -0.5, 'Quiet at bear OB');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('36.6', 36, 'Order Block Breaker');
  a.hit(b && c.c < b.bot && c.prev.c >= b.bot, 1.5, 'Bull OB broken = breaker');
  a.hit(b2 && c.c > b2.top && c.prev.c <= b2.top, 1.5, 'Bear OB broken = breaker');
  a.hit(b && c.c < b.bot - atr * 0.5 && S.bias15 === 'LONG', -1, 'Breaker vs long bias');
  a.hit(b2 && c.c > b2.top + atr * 0.5 && S.bias15 === 'SHORT', -1, 'Breaker vs short bias');
  a.hit(b && c.l < b.bot && c.c > b.bot, 2, 'Sweep of OB + reclaim = best long');
  a.hit(b2 && c.h > b2.top && c.c < b2.top, 2, 'Sweep of OB + reject = best short');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('36.7', 36, 'Mitigation Block');
  a.hit(b && S.price <= b.top + atr * 0.3 && S.price >= b.bot - atr * 0.3, 1.5, 'Bull OB mitigation zone');
  a.hit(b2 && S.price <= b2.top + atr * 0.3 && S.price >= b2.bot - atr * 0.3, 1.5, 'Bear OB mitigation zone');
  a.hit(b && c.l <= b.top && c.c > b.top, 1.5, 'Bull OB mitigating now');
  a.hit(b2 && c.h >= b2.bot && c.c < b2.bot, 1.5, 'Bear OB mitigating now');
  a.hit(b && S.price > b.top + atr * 2, -1, 'Missed bull OB = chase');
  a.hit(b2 && S.price < b2.bot - atr * 2, -1, 'Missed bear OB = chase');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('36.8', 36, 'Order Block Microstructure');
  a.hit(b && S.book.imbalBid > 0.55 && S.price <= b.top, 1.5, 'Bull OB + bid book');
  a.hit(b2 && S.book.imbalBid < 0.45 && S.price >= b2.bot, 1.5, 'Bear OB + ask book');
  a.hit(b && S.book.askWalls && S.book.askWalls[0] && S.book.askWalls[0].p <= b.top, -1, 'Wall inside bull OB = sell');
  a.hit(b2 && S.book.bidWalls && S.book.bidWalls[0] && S.book.bidWalls[0].p >= b2.bot, -1, 'Wall inside bear OB = buy');
  a.hit(b && S.cvd !== null && S.cvd > S.cvdPrev && S.price <= b.top, 1.5, 'Bull OB + CVD rising');
  a.hit(b2 && S.cvd !== null && S.cvd < S.cvdPrev && S.price >= b2.bot, 1.5, 'Bear OB + CVD falling');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('36.9', 36, 'Multi-Timeframe Order Blocks');
  const obs1h = S.obs1h || { bull: [], bear: [] };
  const hb = (obs1h.bull || [])[0], hb2 = (obs1h.bear || [])[0];
  a.hit(hb && S.price <= hb.top && S.price >= hb.bot, 2, 'Inside 1h bull OB');
  a.hit(hb2 && S.price <= hb2.top && S.price >= hb2.bot, 2, 'Inside 1h bear OB');
  a.hit(b && hb && Math.abs(b.bot - hb.bot) < atr, 2, '15m + 1h OB stacked');
  a.hit(b2 && hb2 && Math.abs(b2.top - hb2.top) < atr, 2, '15m + 1h OB stacked');
  a.hit(hb && S.price < hb.bot - atr * 2, -1, 'Below 1h OB = weak');
  a.hit(hb2 && S.price > hb2.top + atr * 2, -1, 'Above 1h OB = weak');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('36.10', 36, 'Order Block Risk');
  a.hit(b && S.price < b.bot - atr * 2.5, -1.5, 'Bull OB far below = no edge');
  a.hit(b2 && S.price > b2.top + atr * 2.5, -1.5, 'Bear OB far above = no edge');
  a.hit(b && c.c < b.bot && c.c < b.bot - atr * 0.5, -1, 'Bull OB broken hard');
  a.hit(b2 && c.c > b2.top && c.c > b2.top + atr * 0.5, -1, 'Bear OB broken hard');
  a.hit(obs.bull.length === 0 && obs.bear.length === 0, -1, 'No OB data');
  a.hit(S.regime === 'HIGH' && b && c.range > atr * 2, -1, 'OB useless in panic');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat37(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const fvgs = S.fvgs || { bull: [], bear: [] };
  const p = lastPin(tf.candles);

  let a = new AgentEval('37.1', 37, 'Bullish FVG Specialist');
  const f = fvgs.bull[0];
  a.hit(f && S.price >= f.bot && S.price <= f.top, 2, 'Inside bull FVG');
  a.hit(f && Math.abs(S.price - f.mid) < atr * 0.3, 2, 'At bull FVG mid');
  a.hit(f && S.price < f.bot && c.c > f.bot, 2, 'FVG retest reclaim');
  a.hit(f && S.price > f.top, 1, 'Above FVG = continuation');
  a.hit(f && S.liq.sweptL && S.price <= f.top + atr * 0.5, 1.5, 'Sweep into bull FVG');
  a.hit(f && S.price < f.bot - atr * 2, -1, 'Bull FVG invalidated');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('37.2', 37, 'Bearish FVG Specialist');
  const f2 = fvgs.bear[0];
  a.hit(f2 && S.price >= f2.bot && S.price <= f2.top, 2, 'Inside bear FVG');
  a.hit(f2 && Math.abs(S.price - f2.mid) < atr * 0.3, 2, 'At bear FVG mid');
  a.hit(f2 && S.price > f2.top && c.c < f2.top, 2, 'FVG retest reject');
  a.hit(f2 && S.price < f2.bot, 1, 'Below FVG = continuation');
  a.hit(f2 && S.liq.sweptH && S.price >= f2.bot - atr * 0.5, 1.5, 'Sweep into bear FVG');
  a.hit(f2 && S.price > f2.top + atr * 2, -1, 'Bear FVG invalidated');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('37.3', 37, 'FVG Confluence');
  a.hit(f && S.srLo && S.srLo[0] && Math.abs(f.bot - S.srLo[0]) < atr, 2, 'FVG + support confluence');
  a.hit(f2 && S.srHi && S.srHi[0] && Math.abs(f2.top - S.srHi[0]) < atr, 2, 'FVG + resistance confluence');
  a.hit(f && S.obs.bull && S.obs.bull[0] && Math.abs(f.bot - S.obs.bull[0].bot) < atr, 2, 'FVG + OB confluence');
  a.hit(f2 && S.obs.bear && S.obs.bear[0] && Math.abs(f2.top - S.obs.bear[0].top) < atr, 2, 'FVG + OB confluence');
  a.hit(f && i.ema50 && Math.abs(f.bot - i.ema50) < atr, 1.5, 'FVG + EMA-50');
  a.hit(f2 && i.ema50 && Math.abs(f2.top - i.ema50) < atr, 1.5, 'FVG + EMA-50');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('37.4', 37, 'FVG Time');
  a.hit(f && f.at && tf.candles.length - f.at < 5, 1.5, 'Fresh bull FVG');
  a.hit(f2 && f2.at && tf.candles.length - f2.at < 5, 1.5, 'Fresh bear FVG');
  a.hit(f && f.at && tf.candles.length - f.at > 30, -1, 'Stale bull FVG');
  a.hit(f2 && f2.at && tf.candles.length - f2.at > 30, -1, 'Stale bear FVG');
  a.hit(f && S.price >= f.bot && S.price <= f.top && tf.candles.length - f.at < 8, 1.5, 'Untouched fresh FVG');
  a.hit(f2 && S.price >= f2.bot && S.price <= f2.top && tf.candles.length - f2.at < 8, 1.5, 'Untouched fresh FVG');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('37.5', 37, 'FVG Volume');
  const v = c.v / (i.volAvg || 1);
  a.hit(f && v > 1.5 && S.price >= f.bot, 1, 'Volume confirming FVG');
  a.hit(f2 && v > 1.5 && S.price <= f2.top, 1, 'Volume confirming FVG');
  a.hit(f && v > 2 && c.c > f.top, 1, 'Volume through bull FVG');
  a.hit(f2 && v > 2 && c.c < f2.bot, 1, 'Volume through bear FVG');
  a.hit(f && v < 0.5 && S.price >= f.bot, -0.5, 'Quiet FVG retest');
  a.hit(f2 && v < 0.5 && S.price <= f2.top, -0.5, 'Quiet FVG retest');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('37.6', 37, 'FVG Retest Dynamics');
  a.hit(f && c.l <= f.bot && c.c > f.bot, 2, 'Bull FVG swept & reclaimed');
  a.hit(f2 && c.h >= f2.top && c.c < f2.top, 2, 'Bear FVG swept & rejected');
  a.hit(f && c.l <= f.mid && c.c > f.mid, 1.5, 'FVG partial fill + reclaim');
  a.hit(f2 && c.h >= f2.mid && c.c < f2.mid, 1.5, 'FVG partial fill + reject');
  a.hit(f && c.l < f.bot - atr * 0.5 && c.c > f.bot, 1.5, 'Deep sweep of FVG');
  a.hit(f2 && c.h > f2.top + atr * 0.5 && c.c < f2.top, 1.5, 'Deep sweep of FVG');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('37.7', 37, 'FVG Invalidation');
  a.hit(f && c.c < f.bot - atr * 0.3, -1.5, 'Bull FVG closed = invalid');
  a.hit(f2 && c.c > f2.top + atr * 0.3, -1.5, 'Bear FVG closed = invalid');
  a.hit(f && S.liq.sweptL && c.c < f.bot, -1, 'FVG + sweep = trap');
  a.hit(f2 && S.liq.sweptH && c.c > f2.top, -1, 'FVG + sweep = trap');
  a.hit(f && c.c < f.bot && S.bias15 === 'LONG', -1, 'Bull FVG lost vs bias');
  a.hit(f2 && c.c > f2.top && S.bias15 === 'SHORT', -1, 'Bear FVG lost vs bias');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('37.8', 37, 'Multi-Timeframe FVG');
  const fvgs1h = S.fvgs1h || { bull: [], bear: [] };
  const hf = fvgs1h.bull[0], hf2 = fvgs1h.bear[0];
  a.hit(hf && S.price >= hf.bot && S.price <= hf.top, 2, 'Inside 1h bull FVG');
  a.hit(hf2 && S.price >= hf2.bot && S.price <= hf2.top, 2, 'Inside 1h bear FVG');
  a.hit(f && hf && Math.abs(f.bot - hf.bot) < atr, 2, '15m + 1h FVG stacked');
  a.hit(f2 && hf2 && Math.abs(f2.top - hf2.top) < atr, 2, '15m + 1h FVG stacked');
  a.hit(hf && S.price < hf.bot - atr * 2, -1, 'Below 1h FVG = weak');
  a.hit(hf2 && S.price > hf2.top + atr * 2, -1, 'Above 1h FVG = weak');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('37.9', 37, 'FVG & Price Action');
  a.hit(f && p.bull && S.price >= f.bot - atr * 0.2, 2, 'Bull pin at FVG');
  a.hit(f2 && p.bear && S.price <= f2.top + atr * 0.2, 2, 'Bear pin at FVG');
  a.hit(f && c.bull && c.c > f.mid, 1, 'Green candle through FVG');
  a.hit(f2 && c.bear && c.c < f2.mid, 1, 'Red candle through FVG');
  a.hit(f && S.liq.sweptL && p.bull && S.price >= f.bot - atr * 0.3, 1.5, 'Sweep + pin at FVG');
  a.hit(f2 && S.liq.sweptH && p.bear && S.price <= f2.top + atr * 0.3, 1.5, 'Sweep + pin at FVG');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('37.10', 37, 'FVG Risk');
  a.hit(f && S.price > f.top + atr * 2.5, -1.5, 'FVG far below = chase');
  a.hit(f2 && S.price < f2.bot - atr * 2.5, -1.5, 'FVG far above = chase');
  a.hit(f && (f.top - f.bot) > atr * 2.5, -1, 'FVG too wide = wide stop');
  a.hit(f2 && (f2.top - f2.bot) > atr * 2.5, -1, 'FVG too wide = wide stop');
  a.hit(fvgs.bull.length === 0 && fvgs.bear.length === 0, -1, 'No FVG data');
  a.hit(S.regime === 'HIGH' && (f || f2) && c.range > atr * 2, -1, 'FVG useless in panic');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat38(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const voids = S.liqVoids || [];
  const imb2 = S.imbalance;

  let a = new AgentEval('38.1', 38, 'Liquidity Void Identification');
  const v1 = voids[0];
  a.hit(v1 && S.price >= v1.low && S.price <= v1.high, 1.5, 'Inside void zone');
  a.hit(v1 && S.price < v1.low && c.c > v1.low, 1.5, 'Void below = gap fuel');
  a.hit(v1 && S.price > v1.high && c.c < v1.high, 1.5, 'Void above = gap fuel');
  a.hit(v1 && (v1.high - v1.low) > atr * 3, 1.5, 'Massive void = speed');
  a.hit(v1 && S.liq.sweptL && S.price < v1.low, 1, 'Sweep into void low');
  a.hit(v1 && S.liq.sweptH && S.price > v1.high, 1, 'Sweep into void high');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('38.2', 38, 'Imbalance Identification');
  a.hit(imb2 && imb2.bull && S.price >= imb2.bot - atr * 0.3 && S.price <= imb2.top + atr * 0.3, 1.5, 'At bullish imbalance');
  a.hit(imb2 && imb2.bear && S.price >= imb2.bot - atr * 0.3 && S.price <= imb2.top + atr * 0.3, 1.5, 'At bearish imbalance');
  a.hit(imb2 && imb2.ratio > 2, 1, 'High ratio imbalance');
  a.hit(imb2 && imb2.bull && c.bull, 1, 'Bull imbalance + green');
  a.hit(imb2 && imb2.bear && c.bear, 1, 'Bear imbalance + red');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('38.3', 38, 'Void Fill Dynamics');
  a.hit(v1 && S.price < v1.low && c.c > v1.high, 2, 'Full void fill up');
  a.hit(v1 && S.price > v1.high && c.c < v1.low, 2, 'Full void fill down');
  a.hit(v1 && S.price < v1.low && c.h > v1.mid, 1, 'Half void fill up');
  a.hit(v1 && S.price > v1.high && c.l < v1.mid, 1, 'Half void fill down');
  a.hit(v1 && S.price < v1.low && c.c > v1.mid, 1.5, 'Void fill + close mid = control');
  a.hit(v1 && S.price > v1.high && c.c < v1.mid, 1.5, 'Void fill + close mid = control');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('38.4', 38, 'Imbalance Fill Dynamics');
  a.hit(imb2 && imb2.bull && S.price > imb2.top, 1.5, 'Imbalance below = pullback target');
  a.hit(imb2 && imb2.bear && S.price < imb2.bot, 1.5, 'Imbalance above = pullback target');
  a.hit(imb2 && imb2.bull && c.l <= imb2.top && c.c > imb2.top, 1.5, 'Imbalance touched & held');
  a.hit(imb2 && imb2.bear && c.h >= imb2.bot && c.c < imb2.bot, 1.5, 'Imbalance touched & held');
  a.hit(imb2 && imb2.bull && c.c < imb2.bot, -1, 'Imbalance failed');
  a.hit(imb2 && imb2.bear && c.c > imb2.top, -1, 'Imbalance failed');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('38.5', 38, 'Void & Structure');
  a.hit(v1 && S.srLo && S.srLo[0] && Math.abs(v1.low - S.srLo[0]) < atr, 1.5, 'Void low + support');
  a.hit(v1 && S.srHi && S.srHi[0] && Math.abs(v1.high - S.srHi[0]) < atr, 1.5, 'Void high + resistance');
  a.hit(v1 && S.obs.bull && S.obs.bull[0] && Math.abs(v1.low - S.obs.bull[0].bot) < atr, 1.5, 'Void + OB');
  a.hit(v1 && S.obs.bear && S.obs.bear[0] && Math.abs(v1.high - S.obs.bear[0].top) < atr, 1.5, 'Void + OB');
  a.hit(v1 && i.ema50 && Math.abs(v1.mid - i.ema50) < atr, 1, 'Void + EMA-50');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('38.6', 38, 'Imbalance & Volume');
  const v = c.v / (i.volAvg || 1);
  a.hit(imb2 && imb2.bull && v > 2 && c.bull, 1.5, 'Imbalance + volume + green');
  a.hit(imb2 && imb2.bear && v > 2 && c.bear, 1.5, 'Imbalance + volume + red');
  a.hit(imb2 && imb2.bull && v < 0.5 && S.price >= imb2.bot, -0.5, 'Imbalance dry = weak');
  a.hit(imb2 && imb2.bear && v < 0.5 && S.price <= imb2.top, -0.5, 'Imbalance dry = weak');
  a.hit(v1 && v > 2 && S.price > v1.low && S.price < v1.high, 1.5, 'Volume inside void = fast');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('38.7', 38, 'Multi-Timeframe Void');
  const voids1h = S.liqVoids1h || [];
  const v1h = voids1h[0];
  a.hit(v1h && S.price >= v1h.low && S.price <= v1h.high, 1.5, 'Inside 1h void');
  a.hit(v1 && v1h && v1.low === v1h.low && v1.high === v1h.high, 1.5, '15m + 1h void aligned');
  a.hit(v1h && S.price > v1h.high && c.bear, 1, '1h void above = drop target');
  a.hit(v1h && S.price < v1h.low && c.bull, 1, '1h void below = pop target');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('38.8', 38, 'Void Pattern');
  a.hit(v1 && S.price > v1.high && c.prev.c < v1.high, 1.5, 'Void top break');
  a.hit(v1 && S.price < v1.low && c.prev.c > v1.low, 1.5, 'Void bottom break');
  a.hit(v1 && S.price > v1.high + atr && S.bias15 === 'LONG', 1, 'Expanding above void');
  a.hit(v1 && S.price < v1.low - atr && S.bias15 === 'SHORT', 1, 'Expanding below void');
  a.hit(v1 && S.price >= v1.low && S.price <= v1.high && c.range > atr * 2, 1.5, 'Speed candle inside void');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('38.9', 38, 'Imbalance Pattern');
  a.hit(imb2 && imb2.bull && S.price < imb2.bot - atr * 3, 1, 'Imbalance = magnet below');
  a.hit(imb2 && imb2.bear && S.price > imb2.top + atr * 3, 1, 'Imbalance = magnet above');
  a.hit(imb2 && imb2.bull && S.liq.sweptL, 1.5, 'Sweep toward imbalance');
  a.hit(imb2 && imb2.bear && S.liq.sweptH, 1.5, 'Sweep toward imbalance');
  a.hit(imb2 && imb2.bull && c.c > imb2.top && c.v > i.volAvg * 1.3, 1.5, 'Through imbalance + volume');
  a.hit(imb2 && imb2.bear && c.c < imb2.bot && c.v > i.volAvg * 1.3, 1.5, 'Through imbalance + volume');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('38.10', 38, 'Void & Imbalance Risk');
  a.hit(v1 && S.price < v1.low - atr * 4, -1, 'Void too far below');
  a.hit(v1 && S.price > v1.high + atr * 4, -1, 'Void too far above');
  a.hit(v1 && (v1.high - v1.low) > atr * 5, -1.5, 'Void width > 5 ATR = no entry');
  a.hit(S.regime === 'HIGH' && v1 && c.range > atr * 2, -1, 'Panic voids = whip');
  a.hit(voids.length === 0 && !imb2, -1, 'No void data');
  a.hit(S.spread > 0.5 && v1, -1, 'Wide spread + void = skip');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat39(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const brk = S.breaker || null;

  let a = new AgentEval('39.1', 39, 'Breaker Block Formation');
  a.hit(brk && brk.bull, 1, 'Bullish breaker formed');
  a.hit(brk && brk.bear, 1, 'Bearish breaker formed');
  a.hit(brk && brk.bull && S.price <= brk.top, 1.5, 'Bull breaker zone active');
  a.hit(brk && brk.bear && S.price >= brk.bot, 1.5, 'Bear breaker zone active');
  a.hit(brk && brk.bull && S.liq.sweptL, 1, 'Breaker + sweep');
  a.hit(brk && brk.bear && S.liq.sweptH, 1, 'Breaker + sweep');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('39.2', 39, 'Breaker Block Trade');
  a.hit(brk && brk.bull && S.price >= brk.bot && S.price <= brk.top + atr * 0.5, 2, 'Trade bull breaker retest');
  a.hit(brk && brk.bear && S.price <= brk.top && S.price >= brk.bot - atr * 0.5, 2, 'Trade bear breaker retest');
  a.hit(brk && brk.bull && c.l <= brk.top && c.c > brk.top, 2, 'Bull breaker held');
  a.hit(brk && brk.bear && c.h >= brk.bot && c.c < brk.bot, 2, 'Bear breaker held');
  a.hit(brk && brk.bull && c.c < brk.bot, -1.5, 'Bull breaker failed');
  a.hit(brk && brk.bear && c.c > brk.top, -1.5, 'Bear breaker failed');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('39.3', 39, 'Mitigation Block Trade');
  a.hit(brk && brk.mitig && S.price <= brk.mitig.top && S.price >= brk.mitig.bot, 2, 'In mitigation zone');
  a.hit(brk && brk.mitig && brk.bull && c.l <= brk.mitig.top && c.c > brk.mitig.top, 1.5, 'Mitigation touched & held');
  a.hit(brk && brk.mitig && brk.bear && c.h >= brk.mitig.bot && c.c < brk.mitig.bot, 1.5, 'Mitigation touched & held');
  a.hit(brk && brk.mitig && brk.bull && S.price > brk.mitig.top + atr, -1, 'Missed mitigation');
  a.hit(brk && brk.mitig && brk.bear && S.price < brk.mitig.bot - atr, -1, 'Missed mitigation');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('39.4', 39, 'Breaker Volume');
  const v = c.v / (i.volAvg || 1);
  a.hit(brk && brk.bull && v > 1.5 && c.bull, 1.5, 'Breaker + volume + green');
  a.hit(brk && brk.bear && v > 1.5 && c.bear, 1.5, 'Breaker + volume + red');
  a.hit(brk && brk.bull && v > 2 && c.c > brk.top, 1.5, 'Volume through breaker');
  a.hit(brk && brk.bear && v > 2 && c.c < brk.bot, 1.5, 'Volume through breaker');
  a.hit(brk && brk.bull && v < 0.5, -0.5, 'Breaker dry volume');
  a.hit(brk && brk.bear && v < 0.5, -0.5, 'Breaker dry volume');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('39.5', 39, 'Breaker Time');
  a.hit(brk && brk.at && tf.candles.length - brk.at < 8, 1.5, 'Fresh breaker');
  a.hit(brk && brk.at && tf.candles.length - brk.at > 40, -1, 'Stale breaker');
  a.hit(brk && brk.bull && tf.candles.length - brk.at < 4 && S.price <= brk.top, 1.5, 'Untouched fresh breaker');
  a.hit(brk && brk.bear && tf.candles.length - brk.at < 4 && S.price >= brk.bot, 1.5, 'Untouched fresh breaker');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('39.6', 39, 'Breaker Confluence');
  a.hit(brk && brk.bull && S.srLo && S.srLo[0] && Math.abs(brk.bot - S.srLo[0]) < atr, 2, 'Breaker + support');
  a.hit(brk && brk.bear && S.srHi && S.srHi[0] && Math.abs(brk.top - S.srHi[0]) < atr, 2, 'Breaker + resistance');
  a.hit(brk && brk.bull && S.liq.sweptL && S.liq.sweptL >= brk.bot, 1.5, 'Breaker + sweep below');
  a.hit(brk && brk.bear && S.liq.sweptH && S.liq.sweptH <= brk.top, 1.5, 'Breaker + sweep above');
  a.hit(brk && brk.bull && i.ema50 && Math.abs(brk.bot - i.ema50) < atr, 1.5, 'Breaker + EMA-50');
  a.hit(brk && brk.bear && i.ema50 && Math.abs(brk.top - i.ema50) < atr, 1.5, 'Breaker + EMA-50');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('39.7', 39, 'Breaker Multi-Timeframe');
  const brk1h = S.breaker1h;
  a.hit(brk1h && brk1h.bull && S.price <= brk1h.top, 1.5, '1h bull breaker zone');
  a.hit(brk1h && brk1h.bear && S.price >= brk1h.bot, 1.5, '1h bear breaker zone');
  a.hit(brk && brk1h && brk.bull && brk1h.bull, 1.5, '15m + 1h breaker stack');
  a.hit(brk && brk1h && brk.bear && brk1h.bear, 1.5, '15m + 1h breaker stack');
  a.hit(brk1h && S.price < brk1h.bot - atr * 2, -1, 'Below 1h breaker');
  a.hit(brk1h && S.price > brk1h.top + atr * 2, -1, 'Above 1h breaker');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('39.8', 39, 'Breaker & Price Action');
  const p = lastPin(tf.candles);
  a.hit(brk && brk.bull && p.bull && S.price <= brk.top + atr * 0.5, 2, 'Pin at bull breaker');
  a.hit(brk && brk.bear && p.bear && S.price >= brk.bot - atr * 0.5, 2, 'Pin at bear breaker');
  a.hit(brk && brk.bull && c.bull && c.c > brk.mid, 1.5, 'Green through breaker');
  a.hit(brk && brk.bear && c.bear && c.c < brk.mid, 1.5, 'Red through breaker');
  a.hit(brk && brk.bull && S.liq.sweptL && p.bull, 1.5, 'Sweep + pin at breaker');
  a.hit(brk && brk.bear && S.liq.sweptH && p.bear, 1.5, 'Sweep + pin at breaker');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('39.9', 39, 'Breaker Derivatives');
  a.hit(brk && brk.bull && S.cvd !== null && S.cvd > S.cvdPrev, 1, 'Breaker + CVD rising');
  a.hit(brk && brk.bear && S.cvd !== null && S.cvd < S.cvdPrev, 1, 'Breaker + CVD falling');
  a.hit(brk && brk.bull && S.book.imbalBid > 0.55, 1, 'Breaker + bid book');
  a.hit(brk && brk.bear && S.book.imbalBid < 0.45, 1, 'Breaker + ask book');
  a.hit(brk && brk.bull && S.funding !== null && S.funding < -0.0002, 1, 'Breaker + negative funding');
  a.hit(brk && brk.bear && S.funding !== null && S.funding > 0.0002, 1, 'Breaker + positive funding');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('39.10', 39, 'Breaker Risk');
  a.hit(brk && brk.bull && S.price > brk.top + atr * 2.5, -1.5, 'Breaker too far below');
  a.hit(brk && brk.bear && S.price < brk.bot - atr * 2.5, -1.5, 'Breaker too far above');
  a.hit(brk && brk.bull && S.price < brk.bot - atr * 1.5, -1, 'Bull breaker destroyed');
  a.hit(brk && brk.bear && S.price > brk.top + atr * 1.5, -1, 'Bear breaker destroyed');
  a.hit(!brk, -1, 'No breaker data');
  a.hit(S.regime === 'HIGH' && brk && c.range > atr * 2, -1, 'Breaker useless in panic');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat40(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const eqH = S.liq.eqH || [], eqL = S.liq.eqL || [];

  let a = new AgentEval('40.1', 40, 'Inducement Identification');
  a.hit(S.liq.sweptL && c.c > S.liq.sweptL + atr * 0.3, 1.5, 'Buy-side inducement done');
  a.hit(S.liq.sweptH && c.c < S.liq.sweptH - atr * 0.3, 1.5, 'Sell-side inducement done');
  a.hit(S.liq.sweptL && S.bias15 === 'LONG', 2, 'Inducement + long bias');
  a.hit(S.liq.sweptH && S.bias15 === 'SHORT', 2, 'Inducement + short bias');
  a.hit(S.liq.sweptL && !c.bull, -1, 'Inducement failed');
  a.hit(S.liq.sweptH && !c.bear, -1, 'Inducement failed');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('40.2', 40, 'Stop Hunt Inducement');
  a.hit(S.liq.sweptL && c.l === S.liq.sweptL && c.c > S.liq.sweptL + atr * 0.2, 2, 'Exact stop hunt + reclaim');
  a.hit(S.liq.sweptH && c.h === S.liq.sweptH && c.c < S.liq.sweptH - atr * 0.2, 2, 'Exact stop hunt + reject');
  a.hit(S.liq.sweptL && c.v > i.volAvg * 2, 1.5, 'Stop hunt with volume');
  a.hit(S.liq.sweptH && c.v > i.volAvg * 2, 1.5, 'Stop hunt with volume');
  a.hit(S.liq.sweptAt > 3, -1, 'Hunt stale');
  a.hit(S.liq.sweptL && c.c < S.liq.sweptL, -1.5, 'Hunt broke through');
  a.hit(S.liq.sweptH && c.c > S.liq.sweptH, -1.5, 'Hunt broke through');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('40.3', 40, 'Liquidity Grab');
  a.hit(S.liq.sweptL && S.liq.sweptAt <= 2 && c.bull, 2, 'Fresh grab + green');
  a.hit(S.liq.sweptH && S.liq.sweptAt <= 2 && c.bear, 2, 'Fresh grab + red');
  a.hit(S.liq.sweptL && c.v > i.volAvg * 1.5, 1.5, 'Grab with volume');
  a.hit(S.liq.sweptH && c.v > i.volAvg * 1.5, 1.5, 'Grab with volume');
  a.hit(S.liq.sweptL && S.obs.bull && S.obs.bull[0] && S.price <= S.obs.bull[0].top, 1.5, 'Grab into OB');
  a.hit(S.liq.sweptH && S.obs.bear && S.obs.bear[0] && S.price >= S.obs.bear[0].bot, 1.5, 'Grab into OB');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('40.4', 40, 'Manipulation Detection');
  a.hit(S.liq.sweptL && S.liq.sweptAt <= 1 && c.c > S.liq.sweptL + atr * 0.5, 2.5, 'Sweep + displace up = manipulation');
  a.hit(S.liq.sweptH && S.liq.sweptAt <= 1 && c.c < S.liq.sweptH - atr * 0.5, 2.5, 'Sweep + displace down = manipulation');
  a.hit(S.liq.sweptL && S.funding !== null && S.funding > 0.0003, 1, 'Manip + funding crowded longs');
  a.hit(S.liq.sweptH && S.funding !== null && S.funding < -0.0003, 1, 'Manip + funding crowded shorts');
  a.hit(S.liq.sweptL && S.lsGlobal !== null && S.lsGlobal > 0.7, 1, 'Manip + retail long crowded');
  a.hit(S.liq.sweptH && S.lsGlobal !== null && S.lsGlobal < 0.3, 1, 'Manip + retail short crowded');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('40.5', 40, 'Inducement Volume');
  const v = c.v / (i.volAvg || 1);
  a.hit(S.liq.sweptL && v < 0.6, 1.5, 'Quiet sweep = spring');
  a.hit(S.liq.sweptH && v < 0.6, 1.5, 'Quiet sweep = trap');
  a.hit(S.liq.sweptL && v > 3, 1, 'Loud flush = climax');
  a.hit(S.liq.sweptH && v > 3, 1, 'Loud flush = climax');
  a.hit(S.liq.sweptL && c.v < c.prev.v && c.bull, 1, 'Volume decay after sweep');
  a.hit(S.liq.sweptH && c.v < c.prev.v && c.bear, 1, 'Volume decay after sweep');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('40.6', 40, 'Inducement Time');
  a.hit(S.sessions && S.sessions.isAsian && S.liq.sweptL && S.liq.sweptAt <= 2, 1.5, 'Asian sweep = London setup');
  a.hit(S.sessions && S.sessions.isLondon && S.liq.sweptL && S.liq.sweptAt <= 2, 2, 'London sweep = prime');
  a.hit(S.sessions && S.sessions.isNY && S.liq.sweptH && S.liq.sweptAt <= 2, 2, 'NY sweep = prime');
  a.hit(S.liq.sweptAt > 4 && S.regime === 'LOW', -1, 'Stale sweep low vol');
  a.hit(S.sessions && S.sessions.isWeekend && S.liq.sweptL, -1, 'Weekend sweep = noise');
  a.hit(S.sessions && S.sessions.minToLondon < 30 && S.liq.sweptL, 1.5, 'Sweep before London open');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('40.7', 40, 'Inducement Multi-Timeframe');
  const c3 = S.tf['3m'].candles;
  const low3 = Math.min(...c3.slice(-3).map(x => Number(x[3])));
  const hi3 = Math.max(...c3.slice(-3).map(x => Number(x[2])));
  a.hit(S.liq.sweptL && low3 === S.liq.sweptL, 1.5, '3m confirms sweep low');
  a.hit(S.liq.sweptH && hi3 === S.liq.sweptH, 1.5, '3m confirms sweep high');
  a.hit(S.liq.sweptL && c3[c3.length - 1] && Number(c3[c3.length - 1][4]) > S.liq.sweptL + atr * 0.2, 1.5, '3m reclaim after sweep');
  a.hit(S.liq.sweptH && c3[c3.length - 1] && Number(c3[c3.length - 1][4]) < S.liq.sweptH - atr * 0.2, 1.5, '3m reject after sweep');
  a.hit(S.liq.sweptL && S.bias1h === 'LONG', 1, 'Sweep + 1h long bias');
  a.hit(S.liq.sweptH && S.bias1h === 'SHORT', 1, 'Sweep + 1h short bias');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('40.8', 40, 'Inducement & Derivatives');
  a.hit(S.liq.sweptL && S.forceLiq && S.forceLiq.netBuy > 0, 1.5, 'Longs liquidated at bottom = fuel');
  a.hit(S.liq.sweptH && S.forceLiq && S.forceLiq.netBuy < 0, 1.5, 'Shorts liquidated at top = fuel');
  a.hit(S.liq.sweptL && S.oiDelta !== null && S.oiDelta < -0.03, 1.5, 'OI drop at sweep = flush done');
  a.hit(S.liq.sweptH && S.oiDelta !== null && S.oiDelta < -0.03, 1.5, 'OI drop at sweep = flush done');
  a.hit(S.liq.sweptL && S.oiDelta !== null && S.oiDelta > 0.05, -1, 'OI up at sweep = continuation');
  a.hit(S.liq.sweptH && S.oiDelta !== null && S.oiDelta > 0.05, -1, 'OI up at sweep = continuation');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('40.9', 40, 'Inducement Pattern');
  a.hit(S.liq.sweptL && S.rsiDivBull, 2.5, 'Sweep + RSI divergence = triple');
  a.hit(S.liq.sweptH && S.rsiDivBear, 2.5, 'Sweep + RSI divergence = triple');
  a.hit(S.liq.sweptL && p2b(S, tf, 'bull') && c.c > i.ema8, 2, 'Sweep + pin + EMA-8 = full');
  a.hit(S.liq.sweptH && p2b(S, tf, 'bear') && c.c < i.ema8, 2, 'Sweep + pin + EMA-8 = full');
  a.hit(S.liq.sweptL && c.c > i.ema21, 1, 'Sweep + EMA-21 reclaim');
  a.hit(S.liq.sweptH && c.c < i.ema21, 1, 'Sweep + EMA-21 loss');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('40.10', 40, 'Inducement Risk');
  a.hit(S.liq.sweptL && S.liq.sweptAt > 5, -1.5, 'Sweep stale');
  a.hit(S.liq.sweptH && S.liq.sweptAt > 5, -1.5, 'Sweep stale');
  a.hit(S.liq.sweptL && S.price < S.liq.sweptL - atr * 2, -2, 'Sweep failed hard');
  a.hit(S.liq.sweptH && S.price > S.liq.sweptH + atr * 2, -2, 'Sweep failed hard');
  a.hit(S.regime === 'HIGH' && S.liq.sweptL && c.range > atr * 2.5, -1.5, 'Panic sweep = trap');
  a.hit(S.spread > 0.5 && S.liq.sweptL, -1, 'Wide spread + sweep = skip');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function p2b(S, tf, dir) {
  return lastPin(tf.candles)[dir === 'bull' ? 'bull' : 'bear'];
}

module.exports = { cat31, cat32, cat33, cat34, cat35, cat36, cat37, cat38, cat39, cat40 };