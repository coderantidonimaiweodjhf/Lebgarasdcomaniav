'use strict';
/* OMNISCIENT SCALPER v22.0 — Agent Categories 1–10: Candlestick Masters (100 agents) */

const { AgentEval, finish, lastPin, lastCandle, lastEngulf, fibRetrace } = require('./rulebook');

const T = S => S.tf['15m'];

function cat1(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), p = lastPin(tf.candles);
  const i = tf.i, atr = S.atr15 || 1;
  const volMult = c.v / (i.volAvg || 1);
  const sup = S.srLo && S.srLo[0], res = S.srHi && S.srHi[0];
  const e61 = fibRetrace(S.prevDay.h, S.prevDay.l, 1 - 0.618);
  const bidWall = S.book.bidWalls && S.book.bidWalls[0], askWall = S.book.askWalls && S.book.askWalls[0];

  let a = new AgentEval('1.1', 1, 'Pin Bar Support Specialist');
  a.hit(p.bull && sup && S.price <= sup * 1.003, 2, 'Bullish pin at demand zone');
  a.hit(p.bull && p.bodyPct <= 25, 1, 'Pin body in upper 25% of range');
  a.hit(p.bull && S.liq.sweptL, 2, 'Sweep of support then reclaim');
  a.hit(p.bull && S.price <= e61 * 1.003, 1.5, 'Pin at 0.618 retracement');
  a.hit(p.bull && c.c < i.ema50 && i.ema8 > i.ema21, 1, 'Pin rejecting EMA-50 from below');
  a.hit(volMult < 0.8 && p.bull, -1, 'Low volume pin = weak');
  a.hit(bidWall && p.bull && p.lower > bidWall.p * 0.999, 1.5, 'Bid wall under pin wick');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('1.2', 1, 'Pin Bar Resistance Specialist');
  a.hit(p.bear && res && S.price >= res * 0.997, 2, 'Bearish pin at supply zone');
  a.hit(p.bear && p.bodyPct <= 25, 1, 'Pin body in lower 25% of range');
  a.hit(p.bear && S.liq.sweptH, 2, 'Sweep of resistance then reject');
  a.hit(p.bear && S.price >= S.prevDay.h * 0.997, 1.5, 'Pin at session high');
  a.hit(p.bear && c.c > i.ema50 && i.ema8 < i.ema21, 1, 'Pin rejecting EMA-50 from above');
  a.hit(volMult < 0.8 && p.bear, -1, 'Low volume pin = weak');
  a.hit(askWall && p.bear && p.upper < askWall.p * 1.001, 1.5, 'Ask wall at pin wick');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('1.3', 1, 'Pin Bar Volume Analyst');
  a.hit(volMult > 2 && (p.bull || p.bear), 2, 'RVOL > 2 on pin');
  a.hit(volMult < 0.5 && (p.bull || p.bear), -1.5, 'Retail noise volume');
  a.hit(c.v >= Math.max(...tf.candles.slice(-5).map(x => Number(x[5]))) && (p.bull || p.bear), 1, 'Volume climax pin');
  a.hit(volMult > 3 && (p.bull || p.bear), 1.5, 'Stop-hunt volume spike');
  a.hit(i.rvol > 2.5 && (p.bull || p.bear), 1, 'RVOL > 2.5 smart money');
  a.hit(c.v < i.volAvg && (p.bull || p.bear), -1, 'Volume below average');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('1.4', 1, 'Pin Bar EMA Confluence');
  const ribbonUp = i.ema8 > i.ema21 && i.ema21 > i.ema50;
  const ribbonDn = i.ema8 < i.ema21 && i.ema21 < i.ema50;
  a.hit(p.bull && ribbonUp && Math.abs(c.c - i.ema8) < atr * 0.5, 2, 'Bullish pin at EMA-8 in uptrend');
  a.hit(p.bear && ribbonDn && Math.abs(c.c - i.ema8) < atr * 0.5, 2, 'Bearish pin at EMA-8 in downtrend');
  a.hit(p.bull && c.prev.c < i.ema21 && c.c > i.ema21, 1.5, 'Pin crossing EMA-21 continuation');
  a.hit(p.bear && c.prev.c > i.ema21 && c.c < i.ema21, 1.5, 'Pin crossing EMA-21 rejection');
  a.hit(ribbonUp && p.bull, 1, 'Ribbon aligned bullish');
  a.hit(ribbonDn && p.bear, 1, 'Ribbon aligned bearish');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('1.5', 1, 'Multi-Timeframe Pin Analyst');
  const pin3 = lastPin(S.tf['3m'].candles), pin1h = lastPin(S.tf['1h'].candles);
  const t15b = S.bias15 === 'LONG', t15s = S.bias15 === 'SHORT';
  a.hit(pin3.bull && t15b, 1.5, '3m pin + 15m bullish structure');
  a.hit(pin3.bear && t15s, 1.5, '3m pin + 15m bearish structure');
  a.hit(pin1h.bull && p.bull, 2, 'Nested 1h + 15m bullish pins');
  a.hit(pin1h.bear && p.bear, 2, 'Nested 1h + 15m bearish pins');
  a.hit(pin3.bull && t15s, -1.5, 'Counter-trend 3m pin');
  a.hit(pin3.bear && t15b, -1.5, 'Counter-trend 3m pin');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('1.6', 1, 'False Break Pin Hunter');
  a.hit(S.liq.sweptH && p.bear, 2.5, 'Wick above resistance, close inside = trap');
  a.hit(S.liq.sweptL && p.bull, 2.5, 'Wick below support, close inside = trap');
  a.hit(S.liq.sweptH && volMult > 3, 1.5, 'Stop hunt with massive volume');
  a.hit(S.liq.sweptL && S.cvd !== null && S.cvdPrev !== null && S.cvd > S.cvdPrev, 1.5, 'Sweep + CVD reversal');
  a.hit(S.liq.sweptH && i.rsi && i.rsi < 55, 1, 'Sweep high with RSI < 55');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('1.7', 1, 'Exhaustion Pin Specialist');
  const reds = [...tf.candles].slice(-8).reverse().reduce((n, x) => (Number(x[4]) < Number(x[1]) ? n + 1 : n), 0);
  const greens = [...tf.candles].slice(-8).reverse().reduce((n, x) => (Number(x[4]) > Number(x[1]) ? n + 1 : n), 0);
  a.hit(p.bull && reds >= 6, 2.5, 'Exhaustion after 6+ red candles');
  a.hit(p.bear && greens >= 6, 2.5, 'Exhaustion after 6+ green candles');
  a.hit((p.bull || p.bear) && (i.rsi > 75 || i.rsi < 25), 1.5, 'RSI extreme exhaustion');
  a.hit(p.bull && i.bb && c.c <= i.bb.lower, 1, 'Band extreme mean reversion');
  a.hit(p.bear && i.bb && c.c >= i.bb.upper, 1, 'Band extreme mean reversion');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('1.8', 1, 'Squeeze Pin Specialist');
  const sq = i.bb && i.bb.bw < 0.08;
  a.hit(sq && (p.bull || p.bear), 1.5, 'Pin inside squeeze = precursor');
  a.hit(sq && volMult > 1.5, 1, 'Squeeze apex with volume tick');
  a.hit(sq && i.adx && i.adx.adx < 20, -1, 'ADX < 20 compression');
  a.hit(sq && i.adx && i.adx.adx > 25, 1.5, 'ADX > 25 momentum building');
  a.hit(sq && S.funding !== null && Math.abs(S.funding) < 0.0001, 1, 'Funding flip pressure');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('1.9', 1, 'Wick Mathematics Specialist');
  a.hit(p.bull && p.ratio >= 3, 2, 'Lower-wick ratio >= 3');
  a.hit(p.bear && p.ratio >= 3, 2, 'Upper-wick ratio >= 3');
  a.hit(p.upper === p.lower && p.body < atr * 0.3, -1, 'Equal wicks = indecision');
  a.hit(p.bull && i.vwap && c.l <= i.vwap && c.c > i.vwap, 1.5, 'VWAP wick rejection');
  a.hit(p.bear && i.vwap && c.h >= i.vwap && c.c < i.vwap, 1.5, 'VWAP wick rejection');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('1.10', 1, 'Rejection Speed Analyst');
  const m1 = lastCandle(S.tf['1m'].candles);
  a.hit(p.bull && m1.bull && m1.range > atr * 0.15, 1.5, '1m aggressive rejection inside pin');
  a.hit(p.bear && m1.bear && m1.range > atr * 0.15, 1.5, '1m aggressive rejection inside pin');
  a.hit(p.bull && p.lower > atr * 1.2, 1.5, 'Wick > 1.2 ATR extreme rejection');
  a.hit(p.bear && p.upper > atr * 1.2, 1.5, 'Wick > 1.2 ATR extreme rejection');
  a.hit(volMult < 1 && (p.bull || p.bear), -1, 'Slow rejection, no interest');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat2(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), e = lastEngulf(tf.candles);
  const i = tf.i, atr = S.atr15 || 1;
  const volMult = c.v / (i.volAvg || 1);
  const e15 = lastEngulf(S.tf['1h'].candles);
  const sup = S.srLo && S.srLo[0], res = S.srHi && S.srHi[0];
  const up = S.bias15 === 'LONG', dn = S.bias15 === 'SHORT';

  let a = new AgentEval('2.1', 2, 'Bullish Engulfing Specialist');
  a.hit(e.bullE && sup && c.c >= sup, 2, 'Bullish engulfing at demand');
  a.hit(e.strong && e.bullE, 1.5, 'Body covers prior body + 50% wick');
  a.hit(e.bullE && up && c.c > i.ema21, 1.5, 'Engulfing at EMA-21 in uptrend');
  a.hit(e.bullE && volMult > 1.5, 1, 'Engulfing volume > 150%');
  a.hit(e.bullE && i.rsi && i.rsi > 25 && i.rsi < 40, 1, 'RSI leaving oversold');
  out.push(finish(a, S, { entry: S.price - atr * 0.1 }));

  a = new AgentEval('2.2', 2, 'Bearish Engulfing Specialist');
  a.hit(e.bearE && res && c.c <= res, 2, 'Bearish engulfing at supply');
  a.hit(e.strong && e.bearE, 1.5, 'Body covers prior body + 50% wick');
  a.hit(e.bearE && dn && c.c < i.ema21, 1.5, 'Engulfing at EMA-21 in downtrend');
  a.hit(e.bearE && volMult > 1.5, 1, 'Engulfing volume > 150%');
  a.hit(e.bearE && i.rsi && i.rsi > 60 && i.rsi < 75, 1, 'RSI leaving overbought');
  out.push(finish(a, S, { entry: S.price + atr * 0.1 }));

  a = new AgentEval('2.3', 2, 'Engulfing Volume Analyst');
  a.hit(i.rvol > 2 && (e.bullE || e.bearE), 2, 'RVOL > 2 institutional');
  a.hit((e.bullE || e.bearE) && c.v < c.prev.v, -1.5, 'Volume weaker than prior');
  a.hit(c.v >= Math.max(...tf.candles.slice(-20).map(x => Number(x[5]))) && (e.bullE || e.bearE), 1.5, '20-candle volume climax');
  a.hit(c.v > (c.prev.v || 1) * 3 && (e.bullE || e.bearE), 1.5, 'Power move volume');
  a.hit(volMult < 0.6 && (e.bullE || e.bearE), -1, 'Declining volume = trap risk');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('2.4', 2, 'Inside-Engulfing Combo');
  const p1 = tf.candles[tf.candles.length - 3], p2 = tf.candles[tf.candles.length - 2];
  const inside = p1 && p2 && Number(p2[2]) <= Number(p1[2]) && Number(p2[3]) >= Number(p1[3]);
  a.hit(inside && e.bullE, 2, 'Coiled spring bullish');
  a.hit(inside && e.bearE, 2, 'Coiled spring bearish');
  a.hit(inside && c.v < i.volAvg * 0.5 && c.v > i.volAvg * 0.3, 0.5, 'Inside bar compression');
  a.hit(e.bullE && i.bb && i.bb.bw < 0.08, 1, 'Squeeze breakout engulf');
  a.hit(inside && !e.bullE && !e.bearE, -1, 'Coil broken, no confirmation');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('2.5', 2, 'Multi-Timeframe Engulfing');
  const e3 = lastEngulf(S.tf['3m'].candles), e5 = lastEngulf(S.tf['5m'].candles);
  a.hit(e3.bullE && up, 1.5, '3m engulf + 15m trend');
  a.hit(e3.bearE && dn, 1.5, '3m engulf + 15m trend');
  a.hit(e15.bullE && e.bullE, 2.5, 'Nested 15m+1h bullish power move');
  a.hit(e15.bearE && e.bearE, 2.5, 'Nested 15m+1h bearish power move');
  a.hit((e3.bullE && dn) || (e3.bearE && up), -1.5, 'Counter-trend engulf');
  a.hit(e5.bullE && e3.bullE, 1, 'Engulfing cascade 3m->5m');
  a.hit(e5.bearE && e3.bearE, 1, 'Engulfing cascade 3m->5m');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('2.6', 2, 'Failed Engulfing Hunter');
  a.hit(e.bullE && c.c < i.ema8 && i.ema8 < i.ema21, -1.5, 'Bullish engulf failed vs EMAs');
  a.hit(e.bearE && c.c > i.ema8 && i.ema8 > i.ema21, -1.5, 'Bearish engulf failed vs EMAs');
  a.hit(e.bullE && sup && c.c < sup, -1.5, 'Demand broken = fake engulf');
  a.hit(e.bearE && res && c.c > res, -1.5, 'Supply broken = fake engulf');
  a.hit(e.bullE && volMult < 0.5, -1, 'No-volume engulf = trap');
  a.hit(e.bearE && volMult < 0.5, -1, 'No-volume engulf = trap');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('2.7', 2, 'Engulfing at Key Levels');
  a.hit(S.pivots && Math.abs(c.c - S.pivots.p) < atr * 0.5 && (e.bullE || e.bearE), 1.5, 'Engulfing at pivot');
  a.hit(e.bullE && c.l <= i.ema50 && c.c > i.ema50, 1.5, 'Engulfing reclaim of EMA-50');
  a.hit(e.bearE && c.h >= i.ema50 && c.c < i.ema50, 1.5, 'Engulfing reject of EMA-50');
  a.hit(S.vp['15m'] && Math.abs(c.c - S.vp['15m'].poc) < atr * 0.5 && (e.bullE || e.bearE), 1, 'Engulfing at POC');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('2.8', 2, 'Engulfing Size & Range');
  const body = Math.abs(c.c - c.o), prevBody = Math.abs(c.prev.c - c.prev.o);
  a.hit((e.bullE || e.bearE) && body > prevBody * 2, 1.5, 'Engulfing > 2x prior body');
  a.hit((e.bullE || e.bearE) && c.range < body * 2.2, 1, 'Clean body-dominated engulf');
  a.hit((e.bullE || e.bearE) && body > atr * 0.8, 1.5, 'Body >= 0.8 ATR power move');
  a.hit(e.bullE && c.l < c.prev.l && c.h > c.prev.h, 1, 'Full-range wrap');
  a.hit(e.bearE && c.l < c.prev.l && c.h > c.prev.h, 1, 'Full-range wrap');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('2.9', 2, 'Engulfing EMA Dynamics');
  a.hit(e.bullE && c.c > i.ema50 && i.ema50 > i.ema200, 1.5, 'Engulf above rising EMA-50');
  a.hit(e.bearE && c.c < i.ema50 && i.ema50 < i.ema200, 1.5, 'Engulf below falling EMA-50');
  a.hit(e.bullE && i.macd && i.macd.macd > i.macd.signal, 1, 'MACD agreement');
  a.hit(e.bearE && i.macd && i.macd.macd < i.macd.signal, 1, 'MACD agreement');
  a.hit(e.bullE && c.c > i.ema200, 0.5, 'Above macro EMA-200');
  a.hit(e.bearE && c.c < i.ema200, 0.5, 'Below macro EMA-200');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('2.10', 2, 'Engulfing Momentum Confluence');
  const st = i.stoch;
  a.hit(e.bullE && st && st.k > st.d, 1, 'Stochastic cross up');
  a.hit(e.bearE && st && st.k < st.d, 1, 'Stochastic cross down');
  a.hit(e.bullE && i.adx && i.adx.plusDI > i.adx.minusDI, 1, 'ADX bullish pressure');
  a.hit(e.bearE && i.adx && i.adx.minusDI > i.adx.plusDI, 1, 'ADX bearish pressure');
  a.hit(e.bullE && i.macd && i.macd.histogram > 0 && i.macd.rising, 1, 'MACD histogram expanding');
  a.hit(e.bearE && i.macd && i.macd.histogram < 0, 1, 'MACD histogram contracting');
  a.hit((e.bullE || e.bearE) && i.macd && Math.abs(i.macd.histogram) < 0.5, -0.5, 'No momentum = uncertain');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat3(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const body = Math.abs(c.c - c.o), range = c.range || 1;
  const doji = body <= range * 0.12;
  const dragon = doji && c.c > (c.o + c.l) / 2 && (c.h - Math.max(c.o, c.c)) < range * 0.08;
  const grave = doji && c.c < (c.o + c.h) / 2 && (Math.min(c.o, c.c) - c.l) < range * 0.08;
  const longLeg = doji && c.h - c.l > atr * 1.2;
  const volMult = c.v / (i.volAvg || 1);
  const sup = S.srLo && S.srLo[0], res = S.srHi && S.srHi[0];

  let a = new AgentEval('3.1', 3, 'Dragonfly Doji Specialist');
  a.hit(dragon && sup, 2, 'Dragonfly at support');
  a.hit(dragon && c.prev.bear && sup, 1.5, 'Dragonfly after bear candle at demand');
  a.hit(dragon && c.l <= i.ema50 && c.c > i.ema50, 1.5, 'Dragonfly reclaim EMA-50');
  a.hit(dragon && S.liq.sweptL, 2, 'Dragonfly sweeping buy-side pool');
  a.hit(dragon && i.rsi && i.rsi < 35, 1, 'Oversold dragonfly');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('3.2', 3, 'Gravestone Doji Specialist');
  a.hit(grave && res, 2, 'Gravestone at resistance');
  a.hit(grave && c.prev.bull && res, 1.5, 'Gravestone after bull candle at supply');
  a.hit(grave && c.h >= i.ema50 && c.c < i.ema50, 1.5, 'Gravestone reject EMA-50');
  a.hit(grave && S.liq.sweptH, 2, 'Gravestone sweeping sell-side pool');
  a.hit(grave && i.rsi && i.rsi > 65, 1, 'Overbought gravestone');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('3.3', 3, 'Long-Legged Doji Analyst');
  a.hit(longLeg, -1, 'Indecision, long legs');
  a.hit(longLeg && S.liq.sweptH, 1.5, 'Long wick above = rejection');
  a.hit(longLeg && S.liq.sweptL, 1.5, 'Long wick below = rejection');
  a.hit(longLeg && c.c > (c.h + c.l) / 2, 1, 'Close upper half = mild bull');
  a.hit(longLeg && c.c < (c.h + c.l) / 2, 1, 'Close lower half = mild bear');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('3.4', 3, 'Four-Price Doji & Spinning Top');
  a.hit(doji && range === 0, -1.5, 'Four-price doji, total indecision');
  a.hit(doji && c.h - c.l < atr * 0.5, -1, 'Spinning top = compression');
  a.hit(doji && c.prev.bull && i.rsi && i.rsi > 70, -1, 'Doji after strong rally = stall');
  a.hit(doji && c.prev.bear && i.rsi && i.rsi < 30, 1, 'Doji after strong drop = stall');
  a.hit(doji && volMult > 1.5, 1.5, 'High-volume doji = absorption');
  a.hit(doji && sup && c.c >= sup, 0.5, 'Doji holding support');
  a.hit(doji && res && c.c <= res, 0.5, 'Doji holding resistance');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('3.5', 3, 'Morning Star Specialist');
  const p1 = tf.candles[tf.candles.length - 3], p2 = tf.candles[tf.candles.length - 2];
  const p1o = p1 && Number(p1[1]), p1c = p1 && Number(p1[4]);
  const p2o = p2 && Number(p2[1]), p2c = p2 && Number(p2[4]);
  const star1 = p1 && p2 && p1c < p1o && Math.abs(p1c - p1o) > atr * 0.5 && Math.abs(p2c - p2o) <= atr * 0.4 && c.c > (p1o + p1c) / 2;
  a.hit(star1, 2.5, 'Morning star formation');
  a.hit(star1 && sup, 1.5, 'Morning star at support');
  a.hit(star1 && i.rsi && i.rsi < 35, 1, 'Morning star in oversold');
  a.hit(star1 && c.v > i.volAvg, 1, 'Morning star with volume');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('3.6', 3, 'Evening Star Specialist');
  const star2 = p1 && p2 && p1c > p1o && Math.abs(p1c - p1o) > atr * 0.5 && Math.abs(p2c - p2o) <= atr * 0.4 && c.c < (p1o + p1c) / 2;
  a.hit(star2, 2.5, 'Evening star formation');
  a.hit(star2 && res, 1.5, 'Evening star at resistance');
  a.hit(star2 && i.rsi && i.rsi > 65, 1, 'Evening star in overbought');
  a.hit(star2 && c.v > i.volAvg, 1, 'Evening star with volume');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('3.7', 3, 'Harami Pattern Specialist');
  a.hit(p2 && p2c > p2o && c.bear && c.o <= p2o, 1, 'Bearish harami');
  a.hit(p2 && p2c < p2o && c.bull && c.o >= p2o, 1, 'Bullish harami');
  a.hit(p2 && p2c > p2o && c.bear && sup, 1.5, 'Harami at support');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('3.8', 3, 'Doji at Key Levels');
  a.hit(doji && sup && c.c >= sup * 0.999, 1.5, 'Doji at support');
  a.hit(doji && res && c.c <= res * 1.001, 1.5, 'Doji at resistance');
  a.hit(doji && S.pivots && Math.abs(c.c - S.pivots.p) < atr * 0.5, 1, 'Doji at pivot');
  a.hit(doji && S.vp['15m'] && Math.abs(c.c - S.vp['15m'].poc) < atr * 0.5, 1, 'Doji at POC');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('3.9', 3, 'Doji Volume Profile');
  a.hit(doji && volMult > 1.5, 1.5, 'High volume doji = absorption');
  a.hit(doji && volMult < 0.5, -1, 'Dead volume doji');
  a.hit(doji && c.v >= Math.max(...tf.candles.slice(-20).map(x => Number(x[5]))), 1.5, 'Climax doji = reversal watch');
  a.hit(doji && i.adx && i.adx.adx < 20, -1, 'Squeeze doji, no trend');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('3.10', 3, 'Doji Momentum Context');
  const up = S.bias15 === 'LONG', dn = S.bias15 === 'SHORT';
  a.hit(doji && up && c.c > i.ema21, 0.5, 'Doji in uptrend = pause');
  a.hit(doji && dn && c.c < i.ema21, 0.5, 'Doji in downtrend = pause');
  a.hit(doji && i.macd && i.macd.histogram > 0 && up, 1, 'Doji + rising momentum');
  a.hit(doji && i.macd && i.macd.histogram < 0 && dn, 1, 'Doji + falling momentum');
  a.hit(doji && !up && !dn, -1, 'Range doji, no edge');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat4(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), p = lastPin(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const sup = S.srLo && S.srLo[0], res = S.srHi && S.srHi[0];
  const hammer = p.bull && c.prev.bear;
  const star = p.bear && c.prev.bull;
  const inverted = p.bull && p.upper > p.lower && c.prev.bear;
  const hanging = p.bear && c.prev.bull && c.c < i.ema21;

  let a = new AgentEval('4.1', 4, 'Hammer Support Specialist');
  a.hit(hammer && sup, 2.5, 'Hammer at support');
  a.hit(hammer && c.l <= i.ema50 && c.c > i.ema50, 1.5, 'Hammer on EMA-50');
  a.hit(hammer && S.liq.sweptL, 2, 'Hammer sweeping buy-side pool');
  a.hit(hammer && p.ratio >= 2, 1.5, 'Hammer wick >= 2x body');
  a.hit(hammer && c.c > i.ema8, 1, 'Hammer closes above EMA-8');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('4.2', 4, 'Shooting Star Resistance Specialist');
  a.hit(star && res, 2.5, 'Shooting star at resistance');
  a.hit(star && c.h >= i.ema50, 1.5, 'Shooting star on EMA-50');
  a.hit(star && S.liq.sweptH, 2, 'Shooting star sweeping sell-side pool');
  a.hit(star && p.ratio >= 2, 1.5, 'Star wick >= 2x body');
  a.hit(star && c.c < i.ema8, 1, 'Star closes below EMA-8');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('4.3', 4, 'Inverted Hammer Specialist');
  a.hit(inverted && sup, 2, 'Inverted hammer at support');
  a.hit(inverted && p.ratio >= 2, 1.5, 'Long upper wick = buy probe');
  a.hit(inverted && i.rsi && i.rsi < 35, 1, 'Oversold inverted hammer');
  a.hit(inverted && c.v > i.volAvg * 1.3, 1, 'Inverted hammer volume');
  a.hit(inverted && c.c > c.o, 1, 'Closes green = confirmed');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('4.4', 4, 'Hanging Man Specialist');
  a.hit(hanging && res, -2, 'Hanging man at resistance');
  a.hit(hanging && i.rsi && i.rsi > 65, -1.5, 'Hanging man in overbought');
  a.hit(hanging && c.v < i.volAvg, -1, 'Low volume hanging man');
  a.hit(hanging && c.prev.c > i.ema21, -1, 'After extended rally');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('4.5', 4, 'Hammer/Star Volume Analysis');
  a.hit((hammer || star || inverted) && c.v > i.volAvg * 1.5, 2, 'Reversal candle with 150% volume');
  a.hit((hammer || star) && c.v >= Math.max(...tf.candles.slice(-10).map(x => Number(x[5]))), 1.5, '10-candle volume climax');
  a.hit((hammer || star) && c.v < i.volAvg * 0.5, -1.5, 'Dead volume reversal = false');
  a.hit((hammer || star) && c.v > (c.prev.v || 1) * 2, 1, 'Volume > 2x prior candle');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('4.6', 4, 'Multi-Timeframe Hammer/Star');
  const h3 = lastPin(S.tf['3m'].candles).bull || lastEngulf(S.tf['3m'].candles).bullE;
  const s3 = lastPin(S.tf['3m'].candles).bear || lastEngulf(S.tf['3m'].candles).bearE;
  a.hit(hammer && h3, 2, '15m hammer + 3m bullish action');
  a.hit(star && s3, 2, '15m star + 3m bearish action');
  a.hit(hammer && S.bias1h === 'LONG', 1, 'Hammer aligned with 1h bias');
  a.hit(star && S.bias1h === 'SHORT', 1, 'Star aligned with 1h bias');
  a.hit(hammer && S.bias1h === 'SHORT', -1, 'Hammer against 1h trend');
  a.hit(star && S.bias1h === 'LONG', -1, 'Star against 1h trend');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('4.7', 4, 'Hammer/Star EMA Confluence');
  a.hit(hammer && i.ema8 > i.ema21, 1, 'Hammer in rising EMA structure');
  a.hit(star && i.ema8 < i.ema21, 1, 'Star in falling EMA structure');
  a.hit(hammer && c.c > i.ema21, 1, 'Hammer holds EMA-21');
  a.hit(star && c.c < i.ema21, 1, 'Star holds EMA-21');
  a.hit(hammer && c.c > i.ema200, 0.5, 'Above EMA-200 macro bull');
  a.hit(star && c.c < i.ema200, 0.5, 'Below EMA-200 macro bear');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('4.8', 4, 'Hammer/Star False Signals');
  a.hit(hammer && sup && c.c < sup, -1.5, 'Support broken = false hammer');
  a.hit(star && res && c.c > res, -1.5, 'Resistance broken = false star');
  a.hit(hammer && c.c < i.ema50 && i.ema8 < i.ema21, -1, 'Hammer below EMA-50 in downtrend');
  a.hit(hammer && c.o < c.prev.l, -1, 'Gap-down hammer = continuation risk');
  a.hit(star && c.o > c.prev.h, -1, 'Gap-up star = continuation risk');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('4.9', 4, 'Wick Ratio Mathematics');
  a.hit(p.bull && p.ratio >= 3, 2, 'Ratio >= 3 high conviction');
  a.hit(p.bear && p.ratio >= 3, 2, 'Ratio >= 3 high conviction');
  a.hit(inverted && p.upper > atr * 1.5, -1, 'Huge upper wick = supply above');
  a.hit(hammer && p.lower >= 1.5 * (c.h - c.c), 1, 'Wick >= 1.5x body');
  a.hit(star && p.upper >= 1.5 * (c.o - c.l), 1, 'Wick >= 1.5x body');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('4.10', 4, 'Exhaustion Hammer/Star');
  const greens = [...tf.candles].slice(-6).reverse().reduce((n, x) => (Number(x[4]) > Number(x[1]) ? n + 1 : n), 0);
  const reds = [...tf.candles].slice(-6).reverse().reduce((n, x) => (Number(x[4]) < Number(x[1]) ? n + 1 : n), 0);
  a.hit(star && greens >= 5, 2, 'Star after 5+ green candles');
  a.hit(hanging && greens >= 5, 2, 'Hanging man after 5+ green candles');
  a.hit(hammer && reds >= 5, 2, 'Hammer after 5+ red candles');
  a.hit(star && i.bb && c.prev.c > i.bb.upper && c.c < i.bb.upper, 1, 'Star from band extreme');
  a.hit(hammer && i.bb && c.prev.c < i.bb.lower && c.c > i.bb.lower, 1, 'Hammer from band extreme');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat5(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const cand = n => tf.candles[tf.candles.length - n];
  const c1 = cand(3), c2 = cand(2), c3 = cand(1);
  const g = n => Number(cand(n)[4]) > Number(cand(n)[1]);
  const r = n => Number(cand(n)[4]) < Number(cand(n)[1]);

  let a = new AgentEval('5.1', 5, 'Three White Soldiers');
  const soldiers = c1 && c2 && c3 && g(3) && g(2) && g(1) && Number(c2[4]) > Number(c1[4]) && Number(c3[4]) > Number(c2[4]);
  a.hit(soldiers && i.ema8 > i.ema21, 2.5, 'Three white soldiers in uptrend');
  a.hit(soldiers && c.c > i.ema21, 1.5, 'Soldiers above EMA-21');
  a.hit(soldiers && Number(cand(1)[5]) > Number(cand(2)[5]), 1, 'Soldiers with rising volume');
  a.hit(soldiers && i.rsi && i.rsi > 70, -1, 'Soldiers overextended');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('5.2', 5, 'Three Black Crows');
  const crows = c1 && c2 && c3 && r(3) && r(2) && r(1) && Number(c2[4]) < Number(c1[4]) && Number(c3[4]) < Number(c2[4]);
  a.hit(crows && i.ema8 < i.ema21, 2.5, 'Three black crows in downtrend');
  a.hit(crows && c.c < i.ema21, 1.5, 'Crows below EMA-21');
  a.hit(crows && Number(cand(1)[5]) > Number(cand(2)[5]), 1, 'Crows with rising volume');
  a.hit(crows && i.rsi && i.rsi < 30, -1, 'Crows oversold');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('5.3', 5, 'Rising Three Methods');
  const p4 = cand(4), p5 = cand(5);
  const rising3 = p4 && p5 && g(5) && r(4) && g(3) && r(2) && g(1) && Number(cand(1)[4]) > Number(p5[4]);
  a.hit(rising3, 2.5, 'Rising three methods continuation');
  a.hit(rising3 && c.c > i.ema21, 1.5, 'Rising three above EMA-21');
  a.hit(rising3 && S.bias15 === 'LONG', 1, 'Aligned with 15m bias');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('5.4', 5, 'Falling Three Methods');
  const falling3 = p4 && p5 && r(5) && g(4) && r(3) && g(2) && r(1) && Number(cand(1)[4]) < Number(p5[4]);
  a.hit(falling3, 2.5, 'Falling three methods continuation');
  a.hit(falling3 && c.c < i.ema21, 1.5, 'Falling three below EMA-21');
  a.hit(falling3 && S.bias15 === 'SHORT', 1, 'Aligned with 15m bias');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('5.5', 5, 'Tweezer Tops/Bottoms');
  const tweezT = c1 && Math.abs(c.h - Number(c1[2])) < atr * 0.15 && c.bear && g(2);
  const tweezB = c1 && Math.abs(c.l - Number(c1[3])) < atr * 0.15 && c.bull && r(2);
  a.hit(tweezT && S.srHi && S.srHi[0], 2, 'Tweezer top at resistance');
  a.hit(tweezB && S.srLo && S.srLo[0], 2, 'Tweezer bottom at support');
  a.hit(tweezB && i.rsi && i.rsi < 40, 1, 'Tweezer bottom oversold');
  a.hit(tweezT && i.rsi && i.rsi > 60, 1, 'Tweezer top overbought');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('5.6', 5, 'Counter-Attack Lines');
  const caBull = c.bull && c.prev.bear && Math.abs(c.c - c.prev.o) < atr * 0.2;
  const caBear = c.bear && c.prev.bull && Math.abs(c.c - c.prev.o) < atr * 0.2;
  a.hit(caBull && S.bias15 === 'LONG', 2, 'Bullish counter-attack in uptrend');
  a.hit(caBear && S.bias15 === 'SHORT', 2, 'Bearish counter-attack in downtrend');
  a.hit(caBull && c.v > c.prev.v, 1, 'Counter-attack with volume');
  a.hit(caBear && c.v > c.prev.v, 1, 'Counter-attack with volume');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('5.7', 5, 'Separating Lines');
  a.hit(c.bull && c.prev.bear && Math.abs(c.o - c.prev.c) < atr * 0.1 && S.bias15 === 'LONG', 2, 'Bullish separating line');
  a.hit(c.bear && c.prev.bull && Math.abs(c.o - c.prev.c) < atr * 0.1 && S.bias15 === 'SHORT', 2, 'Bearish separating line');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('5.8', 5, 'Mat Hold Pattern');
  const matHold = p4 && p5 && g(5) && r(4) && r(3) && g(2) && g(1) && Number(cand(1)[4]) > Number(p5[4]);
  a.hit(matHold && c.c > i.ema21, 2.5, 'Mat hold above EMA-21');
  a.hit(matHold && c.v > i.volAvg, 1, 'Mat hold volume confirmation');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('5.9', 5, 'Side-by-Side White/Black');
  a.hit(g(2) && g(1) && Math.abs(c.o - Number(c2[1])) < atr * 0.15, 1.5, 'Side-by-side white lines');
  a.hit(r(2) && r(1) && Math.abs(c.o - Number(c2[1])) < atr * 0.15, 1.5, 'Side-by-side black lines');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('5.10', 5, 'Advance Block / Descent Block');
  const b1 = c1 && Math.abs(Number(c1[4]) - Number(c1[1]));
  const b2 = c2 && Math.abs(Number(c2[4]) - Number(c2[1]));
  const b3 = c3 && Math.abs(Number(c3[4]) - Number(c3[1]));
  const advBlock = g(3) && g(2) && g(1) && b1 >= b2 && b2 >= b3 && b3 > 0;
  const desBlock = r(3) && r(2) && r(1) && b1 >= b2 && b2 >= b3 && b3 > 0;
  a.hit(advBlock, -1.5, 'Advance block = fading rally');
  a.hit(desBlock, 1.5, 'Descent block = fading drop');
  a.hit(advBlock && i.rsi && i.rsi > 65, -1, 'Advance block + overbought');
  a.hit(desBlock && i.rsi && i.rsi < 35, 1, 'Descent block + oversold');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat6(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const swh = S.swings15.sh || [], swl = S.swings15.sl || [];
  const pd = S.prevDay || {};
  const lvl = p => Math.abs(p - S.price);

  let a = new AgentEval('6.1', 6, 'Swing High Cartographer');
  const lastSH = swh[0];
  a.hit(lastSH && lvl(lastSH) < atr * 1.5, 1.5, 'Price near recent swing high');
  a.hit(lastSH && S.liq.sweptH && Math.abs(S.liq.sweptH - lastSH) < atr * 0.8, 2, 'Swing high swept');
  a.hit(lastSH && c.c > lastSH && S.bias15 === 'LONG', 2, 'Swing high broken in uptrend');
  a.hit(lastSH && c.c < lastSH && S.bias15 === 'SHORT', 1.5, 'Swing high held in downtrend');
  a.hit(S.pivots && lvl(S.pivots.r1) < atr, 0.5, 'Pivot R1 nearby');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('6.2', 6, 'Swing Low Cartographer');
  const lastSL = swl[0];
  a.hit(lastSL && lvl(lastSL) < atr * 1.5, 1.5, 'Price near recent swing low');
  a.hit(lastSL && S.liq.sweptL && Math.abs(S.liq.sweptL - lastSL) < atr * 0.8, 2, 'Swing low swept');
  a.hit(lastSL && c.c < lastSL && S.bias15 === 'SHORT', 2, 'Swing low broken in downtrend');
  a.hit(lastSL && c.c > lastSL && S.bias15 === 'LONG', 1.5, 'Swing low held in uptrend');
  a.hit(S.pivots && lvl(S.pivots.s1) < atr, 0.5, 'Pivot S1 nearby');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('6.3', 6, 'Equal Highs/Lows Hunter');
  const eqH = S.liq.eqH || [], eqL = S.liq.eqL || [];
  a.hit(eqH.length && lvl(eqH[0]) < atr * 2, 2, 'Equal highs pool above');
  a.hit(eqL.length && lvl(eqL[0]) < atr * 2, 2, 'Equal lows pool below');
  a.hit(eqH.length >= 3 && S.liq.sweptH, 1.5, 'Triple highs swept');
  a.hit(eqL.length >= 3 && S.liq.sweptL, 1.5, 'Triple lows swept');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('6.4', 6, 'Previous Day High/Low');
  a.hit(pd.h && lvl(pd.h) < atr * 1.5, 1.5, 'Near previous day high');
  a.hit(pd.l && lvl(pd.l) < atr * 1.5, 1.5, 'Near previous day low');
  a.hit(pd.h && S.liq.sweptH && Math.abs(S.liq.sweptH - pd.h) < atr, 2, 'PDH swept = session trap');
  a.hit(pd.l && S.liq.sweptL && Math.abs(S.liq.sweptL - pd.l) < atr, 2, 'PDL swept = session trap');
  a.hit(pd.h && c.c > pd.h && S.bias15 === 'LONG', 1, 'PDH break with trend');
  a.hit(pd.l && c.c < pd.l && S.bias15 === 'SHORT', 1, 'PDL break with trend');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('6.5', 6, 'Asian Session Levels');
  a.hit(S.sessions && S.sessions.asianHigh && lvl(S.sessions.asianHigh) < atr * 2, 1.5, 'Asian high zone');
  a.hit(S.sessions && S.sessions.asianLow && lvl(S.sessions.asianLow) < atr * 2, 1.5, 'Asian low zone');
  a.hit(S.sessions && S.sessions.asianHigh && S.liq.sweptH && S.liq.sweptH >= S.sessions.asianHigh * 0.999, 2, 'Asian high swept = London reversal');
  a.hit(S.sessions && S.sessions.asianLow && S.liq.sweptL && S.liq.sweptL <= S.sessions.asianLow * 1.001, 2, 'Asian low swept = London reversal');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('6.6', 6, 'Round Number Magnetism');
  const rnd = Math.round(S.price / 10) * 10;
  a.hit(Math.abs(S.price - rnd) < atr * 0.8, 1.5, 'Round number proximity');
  a.hit(S.price > rnd && S.bias15 === 'LONG', 1, 'Round number support');
  a.hit(S.price < rnd && S.bias15 === 'SHORT', 1, 'Round number resistance');
  a.hit(S.liq.sweptH && Math.abs(S.liq.sweptH - rnd) < atr, 1.5, 'Sweep of psychological level');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('6.7', 6, 'Fibonacci Retracement');
  const fRange = pd.h - pd.l;
  const fLvls = [0.236, 0.382, 0.5, 0.618, 0.786].map(f => pd.h - fRange * f);
  const nearF = fLvls.filter(l => lvl(l) < atr * 0.7).length;
  a.hit(nearF >= 1, 1.5, 'Price at Fib retracement level');
  a.hit(fLvls[3] && lvl(fLvls[3]) < atr * 0.3, 1, '0.618 golden level');
  a.hit(fLvls[2] && lvl(fLvls[2]) < atr * 0.3 && S.bias15 === 'LONG', 1, '0.5 retracement in uptrend');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('6.8', 6, 'Fibonacci Extension');
  const ext = i.ema8 > i.ema21 ? pd.l - fRange * 1.272 : pd.h + fRange * 1.272;
  a.hit(S.bias15 === 'LONG' && lvl(ext) < atr * 1.5, 1.5, 'Near 1.272 extension target');
  a.hit(S.bias15 === 'SHORT' && lvl(ext) < atr * 1.5, 1.5, 'Near 1.272 extension target');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('6.9', 6, 'Gap Analysis');
  const gapUp = c.l > c.prev.h, gapDn = c.h < c.prev.l;
  a.hit(gapUp && c.bull, 1.5, 'Gap up holding = strength');
  a.hit(gapDn && c.bear, 1.5, 'Gap down holding = weakness');
  a.hit(gapUp && c.bear, -1.5, 'Gap up fading = exhaustion');
  a.hit(gapDn && c.bull, -1.5, 'Gap down fading = exhaustion');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('6.10', 6, 'Level Confluence Engine');
  const zone = [];
  for (const l of [pd.h, pd.l, S.pivots && S.pivots.r1, S.pivots && S.pivots.s1, S.vp['15m'] && S.vp['15m'].poc, i.ema50]) {
    if (l && lvl(l) < atr * 0.8) zone.push(l);
  }
  a.hit(zone.length >= 3, 2.5, '3+ levels confluent nearby');
  a.hit(zone.length >= 2 && S.bias15 === 'LONG', 1, 'Confluence holding as support');
  a.hit(zone.length >= 2 && S.bias15 === 'SHORT', 1, 'Confluence holding as resistance');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat7(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const pv = S.pivots || {}, pd = S.prevDay || {};
  const pdh = pd.h || S.price, pdl = pd.l || S.price, pdc = pd.c || S.price;
  const classicP = (pdh + pdl + pdc) / 3;
  const camP = classicP;
  const crng = pdh - pdl;
  const camR = [camP + crng * 0.0916, camP + crng * 0.1832, camP + crng * 0.3664, camP + crng * 0.55];
  const camS = [camP - crng * 0.0916, camP - crng * 0.1832, camP - crng * 0.3664, camP - crng * 0.55];
  const woodP = (pdh + pdl + 2 * pdc) / 4;
  const fibP = pv.p || classicP;
  const near = l => l && Math.abs(l - S.price) < atr * 0.8;

  let a = new AgentEval('7.1', 7, 'Classic Pivot Calculator');
  a.hit(near(classicP), 1.5, 'At classic pivot');
  a.hit(near(pv.r1), 1, 'At pivot R1');
  a.hit(near(pv.s1), 1, 'At pivot S1');
  a.hit(near(pv.r2), 1, 'At pivot R2');
  a.hit(near(pv.s2), 1, 'At pivot S2');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('7.2', 7, 'Camarilla Pivot Specialist');
  a.hit(near(camR[3]), 2, 'Camarilla R4 extreme');
  a.hit(near(camS[3]), 2, 'Camarilla S4 extreme');
  a.hit(near(camR[1]), 1, 'Camarilla R1');
  a.hit(near(camS[1]), 1, 'Camarilla S1');
  a.hit(near(camR[2]) && c.prev.bull, 1, 'Camarilla R2 with momentum');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('7.3', 7, 'Woodie Pivot Specialist');
  a.hit(near(woodP), 1.5, 'Woodie pivot');
  a.hit(near(woodP + crng), 1, 'Woodie R1');
  a.hit(near(woodP - crng), 1, 'Woodie S1');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('7.4', 7, 'Fibonacci Pivot Specialist');
  a.hit(near(fibP), 1.5, 'Fib pivot');
  a.hit(near(fibP + crng * 0.382), 1, 'Fib pivot R1');
  a.hit(near(fibP - crng * 0.382), 1, 'Fib pivot S1');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('7.5', 7, 'Pivot Confluence Engine');
  const inst = [classicP, camP, woodP, fibP].filter(l => near(l));
  const pcc = [...new Set(inst.map(l => Math.round(l * 100)))].length;
  a.hit(pcc >= 3, 2.5, '3+ pivot systems agree');
  a.hit(pcc >= 2 && S.bias15 === 'LONG', 1, 'Pivot cluster support');
  a.hit(pcc >= 2 && S.bias15 === 'SHORT', 1, 'Pivot cluster resistance');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('7.6', 7, 'Pivot Breakout Specialist');
  const r1b = pv.r1, s1b = pv.s1;
  a.hit(r1b && c.c > r1b && c.prev.c <= r1b && c.v > i.volAvg, 2, 'R1 breakout with volume');
  a.hit(s1b && c.c < s1b && c.prev.c >= s1b && c.v > i.volAvg, 2, 'S1 breakdown with volume');
  a.hit(r1b && c.h > r1b && c.c < r1b, -1.5, 'R1 fakeout');
  a.hit(s1b && c.l < s1b && c.c > s1b, -1.5, 'S1 fakeout');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('7.7', 7, 'Pivot Range Analyst');
  const mid = pv.r1 && pv.s1 ? (pv.r1 + pv.s1) / 2 : null;
  a.hit(mid && S.price > mid && S.price < pv.r1, 1, 'Upper pivot range = short zone');
  a.hit(mid && S.price < mid && S.price > pv.s1, 1, 'Lower pivot range = long zone');
  a.hit(pv.r1 && S.liq.sweptH && Math.abs(S.liq.sweptH - pv.r1) < atr, 1.5, 'R1 swept = range magnet');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('7.8', 7, 'Multi-Timeframe Pivot');
  const p1h = S.pivots1h || {};
  a.hit(near(p1h.r1), 1.5, '1h pivot R1');
  a.hit(near(p1h.s1), 1.5, '1h pivot S1');
  a.hit(near(pv.r1) && near(p1h.r1), 2, '15m+1h R1 confluence');
  a.hit(near(pv.s1) && near(p1h.s1), 2, '15m+1h S1 confluence');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('7.9', 7, 'Pivot Volume Profile');
  const poc15 = S.vp['15m'] && S.vp['15m'].poc;
  a.hit(near(poc15) && near(classicP), 2, 'POC + pivot confluence');
  a.hit(S.vp['1h'] && near(S.vp['1h'].poc), 1, '1h POC proximity');
  a.hit(near(poc15) && c.v > i.volAvg * 1.5, 1, 'POC + high volume');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('7.10', 7, 'Pivot Session Context');
  a.hit(S.sessions && S.sessions.isNY, 1, 'NY session pivot setup');
  a.hit(S.sessions && S.sessions.isAsian && near(classicP), 1, 'Asian pivot drift');
  a.hit(S.sessions && S.sessions.isLondon && near(mid), 1, 'London pivot expansion');
  a.hit(S.sessions && S.sessions.isWeekend && S.regime === 'LOW', -1, 'Weekend low liquidity');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat8(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;

  let a = new AgentEval('8.1', 8, 'EMA-8 Micro Scalper');
  a.hit(c.c > i.ema8 && c.prev.c <= i.ema8 && S.bias15 === 'LONG', 2, 'EMA-8 reclaim in uptrend');
  a.hit(c.c < i.ema8 && c.prev.c >= i.ema8 && S.bias15 === 'SHORT', 2, 'EMA-8 break down');
  a.hit(Math.abs(c.c - i.ema8) < atr * 0.3 && S.price > i.ema8, 1, 'EMA-8 micro pullback long');
  a.hit(Math.abs(c.c - i.ema8) < atr * 0.3 && S.price < i.ema8, 1, 'EMA-8 micro pullback short');
  a.hit(c.c > i.ema8 && i.rvol > 1.5, 0.5, 'EMA-8 with volume support');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('8.2', 8, 'EMA-21 Trend Filter');
  a.hit(c.c > i.ema21 && c.prev.c < i.ema21, 1.5, 'EMA-21 reclaim');
  a.hit(c.c < i.ema21 && c.prev.c > i.ema21, 1.5, 'EMA-21 loss');
  a.hit(S.price > i.ema21 && i.ema21 > i.ema50 && S.price < i.ema21 + atr * 0.5, 1, 'Bullish EMA-21 pullback');
  a.hit(S.price < i.ema21 && i.ema21 < i.ema50 && S.price > i.ema21 - atr * 0.5, 1, 'Bearish EMA-21 pullback');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('8.3', 8, 'EMA-50 Major Divider');
  a.hit(S.price > i.ema50 && i.ema50 > i.ema200, 1.5, 'Above EMA-50 bull structure');
  a.hit(S.price < i.ema50 && i.ema50 < i.ema200, 1.5, 'Below EMA-50 bear structure');
  a.hit(Math.abs(S.price - i.ema50) < atr * 0.5 && S.bias15 === 'LONG' && c.c > i.ema50, 2, 'EMA-50 support bounce');
  a.hit(Math.abs(S.price - i.ema50) < atr * 0.5 && S.bias15 === 'SHORT' && c.c < i.ema50, 2, 'EMA-50 resistance reject');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('8.4', 8, 'EMA-200 Macro Trend');
  a.hit(c.c > i.ema200 && i.ema200 < i.ema50, 1.5, 'Above EMA-200 macro bullish');
  a.hit(c.c < i.ema200 && i.ema200 > i.ema50, 1.5, 'Below EMA-200 macro bearish');
  a.hit(Math.abs(S.price - i.ema200) < atr * 0.8 && c.c > i.ema200, 1, 'EMA-200 reclaim');
  a.hit(Math.abs(S.price - i.ema200) < atr * 0.8 && c.c < i.ema200, 1, 'EMA-200 reject');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('8.5', 8, 'VWAP Session Analyst');
  const v = S.vwap15;
  a.hit(v && c.c > v && c.prev.c < v, 2, 'VWAP reclaim');
  a.hit(v && c.c < v && c.prev.c > v, 2, 'VWAP loss');
  a.hit(v && S.price > v && Math.abs(S.price - v) < atr * 0.4, 1.5, 'VWAP support in uptrend');
  a.hit(v && S.price < v && Math.abs(S.price - v) < atr * 0.4, 1.5, 'VWAP resistance in downtrend');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('8.6', 8, 'VWAP Standard Deviation');
  a.hit(v && S.price > v + 2 * atr, -1.5, '2 ATR above VWAP = extended');
  a.hit(v && S.price < v - 2 * atr, 1.5, '2 ATR below VWAP = extended');
  a.hit(v && S.price > v + 3 * atr, -1, '3 ATR blow-off');
  a.hit(v && S.price < v - 3 * atr, 1, '3 ATR blow-off');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('8.7', 8, 'Opening Range Specialist');
  const or = S.openingRange;
  a.hit(or && Math.abs(S.price - or.high) < atr * 0.7, 1, 'At opening range high');
  a.hit(or && Math.abs(S.price - or.low) < atr * 0.7, 1, 'At opening range low');
  a.hit(or && c.c > or.high && c.v > i.volAvg, 1.5, 'OR breakout with volume');
  a.hit(or && c.c < or.low && c.v > i.volAvg, 1.5, 'OR breakdown with volume');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('8.8', 8, 'ATR Dynamic Envelope');
  a.hit(Math.abs(S.price - i.ema21) > atr * 2.5, -1, '>2.5 ATR from EMA-21 stretched');
  a.hit(Math.abs(S.price - i.ema21) > atr * 1.5 && S.bias15 === 'LONG' && c.c < i.ema21, 1, 'ATR envelope reversion long');
  a.hit(Math.abs(S.price - i.ema21) > atr * 1.5 && S.bias15 === 'SHORT' && c.c > i.ema21, 1, 'ATR envelope reversion short');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('8.9', 8, 'Keltner Dynamic S/R');
  const kc = i.kc;
  a.hit(kc && Math.abs(c.l - kc.lower) < atr * 0.25 && c.c > kc.lower && S.bias15 === 'LONG', 2, 'Keltner lower bounce');
  a.hit(kc && Math.abs(c.h - kc.upper) < atr * 0.25 && c.c < kc.upper && S.bias15 === 'SHORT', 2, 'Keltner upper reject');
  a.hit(kc && c.c > kc.upper && c.prev.c < kc.upper && c.v > i.volAvg, 1.5, 'Keltner breakout');
  a.hit(kc && c.c < kc.lower && c.prev.c > kc.lower && c.v > i.volAvg, 1.5, 'Keltner breakdown');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('8.10', 8, 'Previous Candle Micro Levels');
  const pc = c.prev;
  a.hit(Math.abs(S.price - pc.h) < atr * 0.3 && c.c < pc.h, 1, 'Prior high resistance');
  a.hit(Math.abs(S.price - pc.l) < atr * 0.3 && c.c > pc.l, 1, 'Prior low support');
  a.hit(c.c > pc.h && pc.bull, 1.5, 'Break of prior bullish high');
  a.hit(c.c < pc.l && pc.bear, 1.5, 'Break of prior bearish low');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat9(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const swh = S.swings15.sh || [], swl = S.swings15.sl || [];

  const upLine = swl.length >= 2 ? (swl[0] - swl[1]) / 3 : null;
  const dnLine = swh.length >= 2 ? (swh[0] - swh[1]) / 3 : null;
  const upVal = upLine !== null ? swl[0] + upLine * 3 : null;
  const dnVal = dnLine !== null ? swh[0] + dnLine * 3 : null;

  let a = new AgentEval('9.1', 9, 'Ascending Trendline Trader');
  a.hit(upVal !== null && S.price >= upVal - atr * 0.5 && S.price <= upVal + atr * 0.5, 2, 'Price on ascending trendline');
  a.hit(upVal !== null && S.price > upVal + atr * 0.5, 1, 'Above ascending trendline');
  a.hit(upVal !== null && c.c < upVal - atr, -1.5, 'Trendline break');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('9.2', 9, 'Descending Trendline Trader');
  a.hit(dnVal !== null && S.price >= dnVal - atr * 0.5 && S.price <= dnVal + atr * 0.5, 2, 'Price on descending trendline');
  a.hit(dnVal !== null && S.price < dnVal - atr * 0.5, 1, 'Below descending trendline');
  a.hit(dnVal !== null && c.c > dnVal + atr, -1.5, 'Trendline break');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('9.3', 9, 'Trendline Confluence');
  a.hit(upVal !== null && S.pivots && Math.abs(upVal - S.pivots.s1) < atr, 1.5, 'Trendline + pivot S1');
  a.hit(dnVal !== null && S.pivots && Math.abs(dnVal - S.pivots.r1) < atr, 1.5, 'Trendline + pivot R1');
  a.hit(upVal !== null && S.srLo && S.srLo[0] && Math.abs(upVal - S.srLo[0]) < atr, 1, 'Trendline + S/R confluence');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('9.4', 9, 'Trendline Break Dynamics');
  a.hit(upVal !== null && c.c < upVal - atr * 0.3 && c.v > i.volAvg * 1.3, 2, 'Break with volume');
  a.hit(dnVal !== null && c.c > dnVal + atr * 0.3 && c.v > i.volAvg * 1.3, 2, 'Break with volume');
  a.hit(upVal !== null && c.l < upVal && c.c > upVal, -1, 'Failed break back inside');
  a.hit(dnVal !== null && c.h > dnVal && c.c < dnVal, -1, 'Failed break back inside');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('9.5', 9, 'Trendline Fan Principle');
  const fans = swl.slice(0, 3);
  a.hit(fans.length >= 2 && S.bias15 === 'LONG' && S.price > fans[0], 1.5, 'Fan 1 intact bullish');
  a.hit(fans.length >= 3 && S.price < fans[1], -1, 'Multiple fan lines broken');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('9.6', 9, 'Internal Trendlines');
  a.hit(swl.length >= 4 && Math.abs(upVal - swl[0]) < atr, 1.5, 'Internal line held by 4 swings');
  a.hit(swh.length >= 4 && Math.abs(dnVal - swh[0]) < atr, 1.5, 'Internal line held by 4 swings');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('9.7', 9, 'Trendline Touch Quality');
  a.hit(upVal !== null && Math.abs(c.l - upVal) < atr * 0.2 && c.bull, 2, 'Clean touch with bullish candle');
  a.hit(dnVal !== null && Math.abs(c.h - dnVal) < atr * 0.2 && c.bear, 2, 'Clean touch with bearish candle');
  a.hit(upVal !== null && Math.abs(c.l - upVal) < atr * 0.2 && c.bear, -0.5, 'Weak touch candle');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('9.8', 9, 'Trendline Slope Analysis');
  a.hit(upLine !== null && upLine > 0.02, 1, 'Steep ascending slope');
  a.hit(dnLine !== null && dnLine < -0.02, 1, 'Steep descending slope');
  a.hit(upLine !== null && Math.abs(upLine) < 0.002 && S.bias15 === 'LONG', -1, 'Flat slope losing value');
  a.hit(dnLine !== null && Math.abs(dnLine) < 0.002 && S.bias15 === 'SHORT', -1, 'Flat slope losing value');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('9.9', 9, 'Multi-Timeframe Trendlines');
  const t1h = S.tf['1h'].i, t1d = S.tf['1d'].i;
  a.hit(upVal !== null && S.bias1h === 'LONG', 1.5, '15m + 1h ascending alignment');
  a.hit(dnVal !== null && S.bias1h === 'SHORT', 1.5, '15m + 1h descending alignment');
  a.hit(upVal !== null && t1h.ema50 > t1d.ema50, 1, 'Macro tailwind');
  a.hit(dnVal !== null && t1h.ema50 < t1d.ema50, 1, 'Macro headwind');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('9.10', 9, 'Trendline Volume Profile');
  a.hit(upVal !== null && c.bull && c.v > i.volAvg * 1.5, 1, 'Ascending line + volume surge');
  a.hit(dnVal !== null && c.bear && c.v > i.volAvg * 1.5, 1, 'Descending line + volume surge');
  a.hit(upVal !== null && c.v < i.volAvg * 0.6 && Math.abs(c.l - upVal) < atr * 0.3, -1, 'Quiet touch = weak');
  a.hit(dnVal !== null && c.v < i.volAvg * 0.6 && Math.abs(c.h - dnVal) < atr * 0.3, -1, 'Quiet touch = weak');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat10(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const ch = S.channel;

  let a = new AgentEval('10.1', 10, 'Parallel Channel Trader');
  a.hit(ch && ch.type !== 'flat' && c.c >= ch.lower && c.c <= ch.upper, 1.5, 'Inside channel');
  a.hit(ch && ch.type === 'up' && Math.abs(c.l - ch.lower) < atr * 0.3, 1.5, 'Channel lower touch (buy)');
  a.hit(ch && ch.type === 'dn' && Math.abs(c.h - ch.upper) < atr * 0.3, 1.5, 'Channel upper touch (sell)');
  a.hit(ch && ch.type === 'flat', -0.5, 'Flat channel = range');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('10.2', 10, 'Channel Breakout Specialist');
  a.hit(ch && ch.type === 'up' && c.c > ch.upper && c.prev.c <= ch.upper, 2, 'Up-channel breakout');
  a.hit(ch && ch.type === 'dn' && c.c < ch.lower && c.prev.c >= ch.lower, 2, 'Down-channel breakdown');
  a.hit(ch && c.c > ch.upper && c.v > i.volAvg * 1.5, 1.5, 'Breakout with volume');
  a.hit(ch && c.h > ch.upper && c.c < ch.upper, -1.5, 'Fake channel breakout');
  a.hit(ch && c.l < ch.lower && c.c > ch.lower, -1.5, 'Fake channel breakdown');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('10.3', 10, 'Channel Squeeze Detector');
  const width = ch ? (ch.upper - ch.lower) / S.price : 0;
  a.hit(ch && width < 0.002, 1.5, 'Channel squeeze (<0.2%)');
  a.hit(ch && width < 0.002 && c.v > i.volAvg, 1.5, 'Squeeze with volume onset');
  a.hit(ch && width > 0.01, -1, 'Wide channel = chop risk');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('10.4', 10, 'Channel EMA Dynamics');
  a.hit(ch && ch.type === 'up' && i.ema8 > i.ema21, 1, 'Ascending channel + EMA bull');
  a.hit(ch && ch.type === 'dn' && i.ema8 < i.ema21, 1, 'Descending channel + EMA bear');
  a.hit(ch && ch.type === 'flat' && i.ema8 > i.ema21, 1, 'Flat channel + EMA bias up');
  a.hit(ch && ch.type === 'flat' && i.ema8 < i.ema21, 1, 'Flat channel + EMA bias down');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('10.5', 10, 'Channel Volume Analysis');
  a.hit(ch && c.prev.v < i.volAvg && c.v > i.volAvg, 1, 'Dry-up + expansion');
  a.hit(ch && c.v < i.volAvg * 0.5, -0.5, 'Dead volume in channel');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('10.6', 10, 'Trend Channel vs Range Channel');
  a.hit(ch && ch.type === 'up' && ch.slope > 0.0003, 1.5, 'Genuine ascending channel');
  a.hit(ch && ch.type === 'dn' && ch.slope < -0.0003, 1.5, 'Genuine descending channel');
  a.hit(ch && ch.type === 'flat' && S.regime === 'LOW', -1, 'Flat low-vol channel = fade only');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('10.7', 10, 'Channel Pattern Combinations');
  const p = lastPin(tf.candles), e = lastEngulf(tf.candles);
  a.hit(ch && ch.type === 'up' && p.bull, 1.5, 'Channel + pin combination');
  a.hit(ch && ch.type === 'dn' && p.bear, 1.5, 'Channel + pin combination');
  a.hit(ch && ch.type === 'up' && e.bullE, 1, 'Channel + engulfing');
  a.hit(ch && ch.type === 'dn' && e.bearE, 1, 'Channel + engulfing');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('10.8', 10, 'Channel Time Analysis');
  const inside = ch ? [Number(tf.candles[tf.candles.length - 1][4]), Number(tf.candles[tf.candles.length - 2][4]), Number(tf.candles[tf.candles.length - 3][4])].filter(p => p >= ch.lower && p <= ch.upper).length : 0;
  a.hit(ch && inside >= 3, 1, 'Long time inside channel');
  a.hit(ch && inside >= 2 && c.v > i.volAvg, 1.5, 'Channel move with volume');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('10.9', 10, 'Channel Microstructure');
  const vol = S.book;
  a.hit(ch && ch.type === 'up' && vol.imbalBid > 0.55, 1, 'Bid imbalance confirms up');
  a.hit(ch && ch.type === 'dn' && vol.imbalBid < 0.45, 1, 'Ask imbalance confirms down');
  a.hit(ch && ch.type === 'up' && vol.imbalBid < 0.4, -1, 'Imbalance against channel');
  a.hit(ch && ch.type === 'dn' && vol.imbalBid > 0.6, -1, 'Imbalance against channel');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('10.10', 10, 'Channel Risk Management');
  const stopDist = ch ? Math.min(Math.abs(S.price - ch.lower), Math.abs(ch.upper - S.price)) : atr;
  a.hit(stopDist > atr * 1.9, -1, 'Stop distance > 1.9 ATR');
  a.hit(stopDist < atr * 0.8, 1, 'Stop distance < 0.8 ATR');
  a.hit(S.regime === 'HIGH' && stopDist > atr * 2, -1.5, 'Wide stops in high vol');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

module.exports = { cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9, cat10 };