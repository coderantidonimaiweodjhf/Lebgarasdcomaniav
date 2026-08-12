'use strict';
/* OMNISCIENT SCALPER v22.0 — Agent Categories 21–30: Momentum & Moving Average Masters (100 agents) */

const { AgentEval, finish, lastCandle, lastPin, divergence } = require('./rulebook');

const T = S => S.tf['15m'];

function cat21(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const r = i.rsi;

  let a = new AgentEval('21.1', 21, 'RSI Overbought/Oversold');
  a.hit(r !== null && r > 70 && i.ema8 < i.ema21 && c.bear, -2, 'RSI > 70 in downtrend = short');
  a.hit(r !== null && r < 30 && i.ema8 > i.ema21 && c.bull, 2, 'RSI < 30 in uptrend = long');
  a.hit(r !== null && r > 80, -1.5, 'RSI > 80 extreme');
  a.hit(r !== null && r < 20, 1.5, 'RSI < 20 extreme');
  a.hit(r !== null && r > 70 && r < 75 && i.ema8 > i.ema21, 0.5, 'RSI strong but trending = hold');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('21.2', 21, 'RSI Divergence');
  const d = divergence(tf.candles, [null].concat([...Array(Math.max(0, tf.candles.length - 1))].map(() => 50)), 0) || { bull: null, bear: null };
  a.hit(S.rsiDivBull, 2.5, 'RSI bullish divergence');
  a.hit(S.rsiDivBear, 2.5, 'RSI bearish divergence');
  a.hit(S.rsiDivBull && S.liq.sweptL, 1.5, 'Divergence + sweep = legendary');
  a.hit(S.rsiDivBear && S.liq.sweptH, 1.5, 'Divergence + sweep = legendary');
  a.hit(S.rsiDivBull && c.bull, 1, 'Divergence resolving up');
  a.hit(S.rsiDivBear && c.bear, 1, 'Divergence resolving down');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('21.3', 21, 'RSI Trend & Level');
  a.hit(r !== null && r > 50 && r < 60 && S.bias15 === 'LONG', 1, 'RSI 50-60 bullish zone');
  a.hit(r !== null && r < 50 && r > 40 && S.bias15 === 'SHORT', 1, 'RSI 40-50 bearish zone');
  a.hit(r !== null && r > 40 && r < 60 && i.ema8 > i.ema21, 0.5, 'RSI mid + bull EMAs');
  a.hit(r !== null && r > 40 && r < 60 && i.ema8 < i.ema21, 0.5, 'RSI mid + bear EMAs');
  a.hit(r !== null && r > 45 && r < 55, -0.5, 'RSI equilibrium');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('21.4', 21, 'RSI Multi-Timeframe');
  const r3 = S.tf['3m'].i.rsi, r1h = S.tf['1h'].i.rsi, r1d = S.tf['1d'].i.rsi;
  a.hit(r !== null && r3 !== null && r > 50 && r3 > 50 && S.bias15 === 'LONG', 1.5, '15m + 3m RSI aligned');
  a.hit(r !== null && r3 !== null && r < 50 && r3 < 50 && S.bias15 === 'SHORT', 1.5, '15m + 3m RSI aligned');
  a.hit(r !== null && r1h !== null && r1h > 50 && r !== null && r < 50, -1, '1h RSI up, 15m RSI down = pullback');
  a.hit(r !== null && r1d !== null && r1d > 50 && r !== null && r > 50, 1, 'Daily + 15m RSI up');
  a.hit(r !== null && r1d !== null && r1d < 50 && r !== null && r < 50, 1, 'Daily + 15m RSI down');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('21.5', 21, 'RSI & Price Action');
  const p = lastPin(tf.candles);
  a.hit(p.bull && (r === null || r < 50), 1.5, 'Pin + RSI below 50');
  a.hit(p.bear && (r === null || r > 50), 1.5, 'Pin + RSI above 50');
  a.hit(p.bull && r !== null && r > 70, -1, 'Pin in overbought = fake');
  a.hit(p.bear && r !== null && r < 30, -1, 'Pin in oversold = fake');
  a.hit(S.liq.sweptL && r !== null && r < 45, 1.5, 'Sweep + RSI room up');
  a.hit(S.liq.sweptH && r !== null && r > 55, 1.5, 'Sweep + RSI room down');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('21.6', 21, 'RSI Rate of Change');
  const rPrev = S.rsiPrev;
  a.hit(r !== null && rPrev !== null && r - rPrev > 5 && c.bull, 1.5, 'RSI accelerating up');
  a.hit(r !== null && rPrev !== null && r - rPrev < -5 && c.bear, 1.5, 'RSI accelerating down');
  a.hit(r !== null && rPrev !== null && Math.abs(r - rPrev) < 0.5, -0.5, 'RSI flat');
  a.hit(r !== null && rPrev !== null && r > 50 && rPrev < 50, 1.5, 'RSI cross above 50');
  a.hit(r !== null && rPrev !== null && r < 50 && rPrev > 50, 1.5, 'RSI cross below 50');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('21.7', 21, 'RSI Pattern Recognition');
  a.hit(r !== null && r > 69 && r < 72 && c.bull, 0.5, 'RSI at 70 wall');
  a.hit(r !== null && r < 25 && S.liq.sweptL, 2, 'RSI capitulation + sweep');
  a.hit(r !== null && r > 75 && S.liq.sweptH, 2, 'RSI blow-off + sweep');
  a.hit(r !== null && S.rsiDivBull, 1.5, 'RSI HL after price LL');
  a.hit(r !== null && S.rsiDivBear, 1.5, 'RSI LH after price HH');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('21.8', 21, 'RSI & Volume');
  const v = c.v / (i.volAvg || 1);
  a.hit(r !== null && v > 2 && r > 70 && c.bear, -2, 'Volume climax + RSI top = distribution');
  a.hit(r !== null && v > 2 && r < 30 && c.bull, 2, 'Volume climax + RSI bottom = accumulation');
  a.hit(v > 2 && r !== null && r > 50 && S.bias15 === 'LONG', 1, 'Volume confirming up RSI');
  a.hit(v > 2 && r !== null && r < 50 && S.bias15 === 'SHORT', 1, 'Volume confirming down RSI');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('21.9', 21, 'RSI Adaptive');
  const atrPct = S.atr15pct || 1;
  a.hit(atrPct > 0.003 && r !== null && r > 65 && i.ema8 < i.ema21, -1.5, 'High-vol RSI 65 = real overbought');
  a.hit(atrPct < 0.0012 && r !== null && r > 75, -1, 'Low-vol RSI 75 = normal noise');
  a.hit(atrPct < 0.0012 && r !== null && r > 85, -1.5, 'Low-vol RSI 85 = real extreme');
  a.hit(atrPct > 0.003 && r !== null && r < 35 && i.ema8 > i.ema21, 1.5, 'High-vol RSI 35 = real oversold');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('21.10', 21, 'RSI Risk');
  a.hit(r !== null && r > 80 && S.bias15 === 'LONG', -1.5, 'Chasing long in exhaustion');
  a.hit(r !== null && r < 20 && S.bias15 === 'SHORT', -1.5, 'Chasing short in capitulation');
  a.hit(S.regime === 'HIGH' && r !== null && Math.abs(r - 50) > 35, -1, 'Panic RSI = whipsaw risk');
  a.hit(r !== null && r > 65 && r < 68 && c.bull, -0.5, 'RSI at 67 = cliff zone');
  a.hit(r !== null && r < 35 && r > 32 && c.bear, -0.5, 'RSI at 33 = cliff zone');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat22(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const m = i.macd;

  let a = new AgentEval('22.1', 22, 'MACD Crossover');
  a.hit(m && m.macd > m.signal && m.prevMacd <= m.signal, 2, 'MACD bullish crossover');
  a.hit(m && m.macd < m.signal && m.prevMacd >= m.signal, 2, 'MACD bearish crossover');
  a.hit(m && m.macd > m.signal && S.bias15 === 'LONG', 1, 'MACD above signal in uptrend');
  a.hit(m && m.macd < m.signal && S.bias15 === 'SHORT', 1, 'MACD below signal in downtrend');
  a.hit(m && S.liq.sweptL && m.macd > m.signal, 1.5, 'Sweep + MACD flip = reversal');
  a.hit(m && S.liq.sweptH && m.macd < m.signal, 1.5, 'Sweep + MACD flip = reversal');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('22.2', 22, 'MACD Histogram');
  a.hit(m && m.histogram > 0 && m.rising, 1.5, 'Histogram expanding positive');
  a.hit(m && m.histogram < 0 && !m.rising, 1.5, 'Histogram expanding negative');
  a.hit(m && m.rising && m.histogram < 0 && m.histogram > -0.5, 1, 'Histogram contracting = reversal');
  a.hit(m && !m.rising && m.histogram > 0 && m.histogram < 0.5, 1, 'Histogram contracting = reversal');
  a.hit(m && Math.abs(m.histogram) < 0.1, -0.5, 'Flat histogram = no momentum');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('22.3', 22, 'MACD Divergence');
  a.hit(S.macdDivBull, 2.5, 'MACD bullish divergence');
  a.hit(S.macdDivBear, 2.5, 'MACD bearish divergence');
  a.hit(S.macdDivBull && S.liq.sweptL, 1.5, 'MACD divergence + sweep');
  a.hit(S.macdDivBear && S.liq.sweptH, 1.5, 'MACD divergence + sweep');
  a.hit(S.macdDivBull && c.bull && c.v > i.volAvg, 1, 'MACD divergence resolving');
  a.hit(S.macdDivBear && c.bear && c.v > i.volAvg, 1, 'MACD divergence resolving');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('22.4', 22, 'MACD Zero Line');
  a.hit(m && m.macd > 0 && m.prevMacd <= 0, 1.5, 'MACD cross above zero');
  a.hit(m && m.macd < 0 && m.prevMacd >= 0, 1.5, 'MACD cross below zero');
  a.hit(m && m.macd > 0 && c.c > i.ema50, 1, 'MACD positive + above EMA-50');
  a.hit(m && m.macd < 0 && c.c < i.ema50, 1, 'MACD negative + below EMA-50');
  a.hit(m && i.ema50 && Math.abs(m.macd) > i.ema50 * 0.001, 1, 'MACD strong vs price scale');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('22.5', 22, 'MACD Multi-Timeframe');
  const m3 = S.tf['3m'].i.macd, m1h = S.tf['1h'].i.macd, m1d = S.tf['1d'].i.macd;
  a.hit(m && m3 && m.macd > m.signal && m3.macd > m3.signal, 1.5, '3m + 15m MACD aligned');
  a.hit(m && m3 && m.macd < m.signal && m3.macd < m3.signal, 1.5, '3m + 15m MACD aligned');
  a.hit(m && m1h && m1h.macd > m1h.signal && m && m.macd < m.signal, -1, '1h up, 15m down = counter');
  a.hit(m1d && m && m1d.macd > 0 && m.macd > 0, 1, 'Daily + 15m positive');
  a.hit(m1d && m && m1d.macd < 0 && m.macd < 0, 1, 'Daily + 15m negative');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('22.6', 22, 'MACD & Price Action');
  a.hit(m && m.macd > m.signal && c.c > i.ema8, 1, 'MACD + price above EMA-8');
  a.hit(m && m.macd < m.signal && c.c < i.ema8, 1, 'MACD + price below EMA-8');
  a.hit(m && m.rising && c.bull && c.v > i.volAvg, 1.5, 'Histogram rise + green volume candle');
  a.hit(m && !m.rising && c.bear && c.v > i.volAvg, 1.5, 'Histogram fall + red volume candle');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('22.7', 22, 'MACD Squeeze');
  a.hit(m && m.prevHistogram !== undefined && Math.abs(m.histogram) < Math.abs(m.prevHistogram) * 0.3 && Math.abs(m.histogram) < 0.3, 1.5, 'MACD squeeze');
  a.hit(m && Math.abs(m.histogram) < 0.15 && i.bb && i.bb.bw < 0.08, 2, 'MACD + BB squeeze');
  a.hit(m && Math.abs(m.histogram) < 0.15 && S.liq.sweptL, 1.5, 'Squeeze + sweep = launch');
  a.hit(m && Math.abs(m.histogram) < 0.15 && S.liq.sweptH, 1.5, 'Squeeze + sweep = launch');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('22.8', 22, 'MACD Rate of Change');
  const roc = m ? m.histogram - m.prevHistogram : 0;
  a.hit(m && roc > 0.5 && c.bull, 1.5, 'MACD momentum surging up');
  a.hit(m && roc < -0.5 && c.bear, 1.5, 'MACD momentum surging down');
  a.hit(m && Math.abs(roc) < 0.05, -0.5, 'MACD momentum flat');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('22.9', 22, 'MACD & Volume');
  const v = c.v / (i.volAvg || 1);
  a.hit(m && v > 2 && m.macd > m.signal && c.bull, 1.5, 'MACD + volume + green');
  a.hit(m && v > 2 && m.macd < m.signal && c.bear, 1.5, 'MACD + volume + red');
  a.hit(m && v > 2 && m.macd > m.signal && c.bear, -1, 'MACD up but price down = absorption');
  a.hit(m && v < 0.5 && m.rising, -0.5, 'MACD rising on no volume');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('22.10', 22, 'MACD Risk');
  a.hit(m && m.macd > 0 && m.macd > i.ema50 * 0.002, -0.5, 'MACD stretched vs price');
  a.hit(m && S.regime === 'HIGH' && Math.abs(m.histogram) > 2, -1, 'Panic MACD = whip risk');
  a.hit(m && i.adx && i.adx.adx < 18 && Math.abs(m.macd) < i.ema50 * 0.0004, -1, 'No trend MACD = chop');
  a.hit(m && S.liq.sweptH && m.macd < m.signal && c.c < i.ema50, -1, 'Sweep + MACD short below EMA-50 = chase');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat23(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const st = i.stoch;
  const st3 = S.tf['3m'].i.stoch, st1h = S.tf['1h'].i.stoch;

  let a = new AgentEval('23.1', 23, 'Stochastic Overbought/Oversold');
  a.hit(st && st.k > 80 && i.ema8 < i.ema21 && c.bear, -2, 'Stoch > 80 in downtrend');
  a.hit(st && st.k < 20 && i.ema8 > i.ema21 && c.bull, 2, 'Stoch < 20 in uptrend');
  a.hit(st && st.k > 85, -1, 'Stoch extreme overbought');
  a.hit(st && st.k < 15, 1, 'Stoch extreme oversold');
  a.hit(st && st.k < 20 && st.k > st.d, 1, 'Stoch leaving oversold');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('23.2', 23, 'Stochastic Crossover');
  a.hit(st && st.k > st.d && st.prevK <= st.prevD && st.k < 50, 2, 'Stoch cross up below 50');
  a.hit(st && st.k < st.d && st.prevK >= st.prevD && st.k > 50, 2, 'Stoch cross down above 50');
  a.hit(st && st.k > st.d && S.bias15 === 'LONG', 1, 'Stoch bull alignment');
  a.hit(st && st.k < st.d && S.bias15 === 'SHORT', 1, 'Stoch bear alignment');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('23.3', 23, 'Stochastic Divergence');
  a.hit(S.stochDivBull, 2.5, 'Stoch bullish divergence');
  a.hit(S.stochDivBear, 2.5, 'Stoch bearish divergence');
  a.hit(S.stochDivBull && S.liq.sweptL, 1.5, 'Stoch divergence + sweep');
  a.hit(S.stochDivBear && S.liq.sweptH, 1.5, 'Stoch divergence + sweep');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('23.4', 23, 'Stochastic Multi-Timeframe');
  a.hit(st && st3 && st.k > st.d && st3.k > st3.d, 1.5, '3m + 15m stoch aligned up');
  a.hit(st && st3 && st.k < st.d && st3.k < st3.d, 1.5, '3m + 15m stoch aligned down');
  a.hit(st && st1h && st.k > 50 && st1h.k > 50, 1, '1h + 15m stoch above 50');
  a.hit(st && st1h && st.k < 50 && st1h.k < 50, 1, '1h + 15m stoch below 50');
  a.hit(st3 && st && st.k > 80 && st3.k < 50, -1, 'Micro cool-off vs 15m heat');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('23.5', 23, 'Stochastic & Price Action');
  const p = lastPin(tf.candles);
  a.hit(p.bull && st && st.k < 50, 1.5, 'Pin + stoch below 50');
  a.hit(p.bear && st && st.k > 50, 1.5, 'Pin + stoch above 50');
  a.hit(S.liq.sweptL && st && st.k < 30 && c.bull, 2, 'Sweep + oversold stoch + green');
  a.hit(S.liq.sweptH && st && st.k > 70 && c.bear, 2, 'Sweep + overbought stoch + red');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('23.6', 23, 'Stochastic Midline');
  a.hit(st && st.k > 50 && st.prevK <= 50 && S.bias15 === 'LONG', 2, 'Midline cross up');
  a.hit(st && st.k < 50 && st.prevK >= 50 && S.bias15 === 'SHORT', 2, 'Midline cross down');
  a.hit(st && st.k > 50 && c.c > i.ema21, 1, 'Above midline + EMA-21');
  a.hit(st && st.k < 50 && c.c < i.ema21, 1, 'Below midline + EMA-21');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('23.7', 23, 'Stochastic Pattern');
  a.hit(st && st.k > 80 && st.k < 85 && c.prev.bear && c.bear, -1, 'Double-tap at 80 = rejection');
  a.hit(st && st.k < 20 && st.k > 15 && c.prev.bull && c.bull, 1, 'Double-tap at 20 = acceptance');
  a.hit(st && st.k > 80 && S.liq.sweptH, 1.5, 'Stoch top + sweep = trap');
  a.hit(st && st.k < 20 && S.liq.sweptL, 1.5, 'Stoch bottom + sweep = spring');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('23.8', 23, 'Stochastic & Volume');
  const v = c.v / (i.volAvg || 1);
  a.hit(st && v > 2 && st.k < 20 && c.bull, 2, 'Volume climax + stoch bottom');
  a.hit(st && v > 2 && st.k > 80 && c.bear, 2, 'Volume climax + stoch top');
  a.hit(st && v > 2 && st.k > st.d && c.bull, 1, 'Volume + stoch bull')
  a.hit(st && v < 0.5 && st.k > st.d, -0.5, 'Stoch cross without volume')
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('23.9', 23, 'Stochastic Smoothing');
  a.hit(st && st.k > st.d && st.k - st.d > 15, 1, 'Wide stoch spread = strong trend');
  a.hit(st && st.k < st.d && st.d - st.k > 15, 1, 'Wide stoch spread = strong trend');
  a.hit(st && Math.abs(st.k - st.d) < 3, -0.5, 'Stoch converged = indecision');
  a.hit(st && st.k > st.d && st.d > 50, 1, 'Bull cluster above 50');
  a.hit(st && st.k < st.d && st.d < 50, 1, 'Bear cluster below 50');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('23.10', 23, 'Stochastic Risk');
  a.hit(st && st.k > 80 && S.bias15 === 'LONG', -1, 'Chasing overbought');
  a.hit(st && st.k < 20 && S.bias15 === 'SHORT', -1, 'Chasing oversold');
  a.hit(S.regime === 'LOW' && st && Math.abs(st.k - 50) > 25, -1, 'Low-vol stoch extreme = fake');
  a.hit(S.regime === 'HIGH' && st && Math.abs(st.k - 50) > 40, -1, 'Panic wave stoch = whip');
  a.hit(st === null, -1, 'No stoch data');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat24(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const ci = i.cci, wr = i.wr;

  let a = new AgentEval('24.1', 24, 'CCI Overbought/Oversold');
  a.hit(ci !== null && ci > 100 && c.bear, -2, 'CCI > 100 + red candle');
  a.hit(ci !== null && ci < -100 && c.bull, 2, 'CCI < -100 + green candle');
  a.hit(ci !== null && ci > 200, -1.5, 'CCI extreme overbought');
  a.hit(ci !== null && ci < -200, 1.5, 'CCI extreme oversold');
  a.hit(ci !== null && ci > 100 && i.ema8 > i.ema21, 0.5, 'CCI strong in uptrend = continuation');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('24.2', 24, 'CCI Zero Line');
  a.hit(ci !== null && ci > 0 && ci < 100 && S.bias15 === 'LONG', 1.5, 'CCI above zero in uptrend');
  a.hit(ci !== null && ci < 0 && ci > -100 && S.bias15 === 'SHORT', 1.5, 'CCI below zero in downtrend');
  a.hit(ci !== null && ci > 0 && c.prev.ci !== undefined && c.prev.ci >= 0 && ci < 100, 1, 'CCI zero cross up');
  a.hit(ci !== null && ci < 0 && c.prev.ci !== undefined && c.prev.ci <= 0, 1, 'CCI zero cross down');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('24.3', 24, 'CCI Divergence');
  a.hit(S.cciDivBull, 2.5, 'CCI bullish divergence');
  a.hit(S.cciDivBear, 2.5, 'CCI bearish divergence');
  a.hit(S.cciDivBull && S.liq.sweptL, 1.5, 'CCI divergence + sweep');
  a.hit(S.cciDivBear && S.liq.sweptH, 1.5, 'CCI divergence + sweep');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('24.4', 24, 'Williams %R Overbought/Oversold');
  a.hit(wr !== null && wr > -10 && c.bear, -2, '%R > -10 + red candle');
  a.hit(wr !== null && wr < -90 && c.bull, 2, '%R < -90 + green candle');
  a.hit(wr !== null && wr > -5, -1.5, '%R extreme overbought');
  a.hit(wr !== null && wr < -95, 1.5, '%R extreme oversold');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('24.5', 24, 'Williams %R Failure Swing');
  a.hit(wr !== null && wr > -20 && wr < -10 && c.bear, -1.5, '%R failure above -20');
  a.hit(wr !== null && wr < -80 && wr > -90 && c.bull, 1.5, '%R failure below -80');
  a.hit(wr !== null && wr > -20 && c.prev.wr !== undefined && c.prev.wr <= -20, -1.5, '%R break above -20');
  a.hit(wr !== null && wr < -80 && c.prev.wr !== undefined && c.prev.wr >= -80, 1.5, '%R break below -80');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('24.6', 24, 'CCI & Williams Combined');
  a.hit(ci !== null && wr !== null && ci > 100 && wr > -20, -2, 'CCI + %R both overbought');
  a.hit(ci !== null && wr !== null && ci < -100 && wr < -80, 2, 'CCI + %R both oversold');
  a.hit(ci !== null && wr !== null && ci > 0 && wr > -50, 1, 'Both above mid');
  a.hit(ci !== null && wr !== null && ci < 0 && wr < -50, 1, 'Both below mid');
  a.hit(ci !== null && wr !== null && ((ci > 100 && wr < -50) || (ci < -100 && wr > -50)), -1, 'CCI/%R disagreement');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('24.7', 24, 'CCI/%R & Price Action');
  const p = lastPin(tf.candles);
  a.hit(p.bull && ci !== null && ci < 100, 1.5, 'Pin + CCI under 100');
  a.hit(p.bear && ci !== null && ci > -100, 1.5, 'Pin + CCI over -100');
  a.hit(S.liq.sweptL && ci !== null && ci < -100 && c.bull, 2, 'Sweep + CCI bottom');
  a.hit(S.liq.sweptH && ci !== null && ci > 100 && c.bear, 2, 'Sweep + CCI top');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('24.8', 24, 'Multi-Timeframe CCI/%R');
  const c3 = S.tf['3m'].i;
  a.hit(ci !== null && c3.cci !== null && ci > 0 && c3.cci > 0, 1.5, '3m + 15m CCI positive');
  a.hit(ci !== null && c3.cci !== null && ci < 0 && c3.cci < 0, 1.5, '3m + 15m CCI negative');
  a.hit(ci !== null && c3.cci !== null && ci > 100 && c3.cci < 0, -1, 'Micro overshoot vs 15m');
  a.hit(ci !== null && c3.cci !== null && ci < -100 && c3.cci > 0, -1, 'Micro overshoot vs 15m');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('24.9', 24, 'CCI/%R Rate of Change');
  const ciPrev = S.cciPrev;
  a.hit(ci !== null && ciPrev !== null && ci - ciPrev > 40, 1.5, 'CCI surging');
  a.hit(ci !== null && ciPrev !== null && ci - ciPrev < -40, 1.5, 'CCI plunging');
  a.hit(ci !== null && ciPrev !== null && Math.abs(ci - ciPrev) < 5, -0.5, 'CCI flat');
  a.hit(ci !== null && ciPrev !== null && ci > 100 && ciPrev < 100, 1.5, 'CCI break above 100');
  a.hit(ci !== null && ciPrev !== null && ci < -100 && ciPrev > -100, 1.5, 'CCI break below -100');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('24.10', 24, 'CCI/%R Risk');
  a.hit(ci !== null && ci > 200 && S.bias15 === 'LONG', -1.5, 'Chasing CCI 200+');
  a.hit(ci !== null && ci < -200 && S.bias15 === 'SHORT', -1.5, 'Chasing CCI -200');
  a.hit(S.regime === 'HIGH' && ci !== null && Math.abs(ci) > 250, -1, 'Panic CCI = whip risk');
  a.hit(ci === null || wr === null, -1, 'Insufficient data');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat25(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const r = i.rsi, m = i.macd, st = i.stoch, ci = i.cci, adxO = i.adx;

  let a = new AgentEval('25.1', 25, 'Minimum Momentum Alignment');
  const bull = (r !== null && r > 55) + (m && m.macd > m.signal ? 1 : 0) + (st && st.k > 50 ? 1 : 0);
  const bear = (r !== null && r < 45) + (m && m.macd < m.signal ? 1 : 0) + (st && st.k < 50 ? 1 : 0);
  a.hit(bull >= 3 && S.bias15 === 'LONG', 2, 'All momentum bullish');
  a.hit(bear >= 3 && S.bias15 === 'SHORT', 2, 'All momentum bearish');
  a.hit(bull >= 2, 1, 'Momentum lean bullish');
  a.hit(bear >= 2, 1, 'Momentum lean bearish');
  a.hit(bull === 2 && bear === 2, -1, 'Momentum split');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('25.2', 25, 'Momentum Divergence Matrix');
  a.hit(S.rsiDivBull && S.macdDivBull, 2.5, 'RSI + MACD double divergence bull');
  a.hit(S.rsiDivBear && S.macdDivBear, 2.5, 'RSI + MACD double divergence bear');
  a.hit(S.rsiDivBull && S.cciDivBear, -1, 'Mixed divergence signals');
  a.hit(S.rsiDivBear && S.cciDivBull, -1, 'Mixed divergence signals');
  a.hit(S.rsiDivBull && S.macdDivBull && S.liq.sweptL, 1.5, 'Triple-agreed reversal');
  a.hit(S.rsiDivBear && S.macdDivBear && S.liq.sweptH, 1.5, 'Triple-agreed reversal');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('25.3', 25, 'Momentum Trend Alignment');
  a.hit(S.bias15 === 'LONG' && i.ema8 > i.ema21 && r !== null && r > 50, 1.5, 'Trend + momentum aligned up');
  a.hit(S.bias15 === 'SHORT' && i.ema8 < i.ema21 && r !== null && r < 50, 1.5, 'Trend + momentum aligned down');
  a.hit(S.bias15 === 'LONG' && r !== null && r < 40, 1, 'Bull trend, momentum dip = entry');
  a.hit(S.bias15 === 'SHORT' && r !== null && r > 60, 1, 'Bear trend, momentum pop = entry');
  a.hit(S.bias15 === 'RANGE' && adxO && adxO.adx < 20, -0.5, 'No trend momentum')
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('25.4', 25, 'Momentum & Volume');
  const v = c.v / (i.volAvg || 1);
  a.hit(v > 1.5 && c.bull && r !== null && r > 55, 1.5, 'Momentum + volume + green');
  a.hit(v > 1.5 && c.bear && r !== null && r < 45, 1.5, 'Momentum + volume + red');
  a.hit(v < 0.5 && c.bull && r !== null && r > 60, -1, 'Rise on dying volume');
  a.hit(v < 0.5 && S.liq.sweptL, 1, 'Quiet sweep = spring');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('25.5', 25, 'Momentum & Structure');
  a.hit(S.bias15 === 'LONG' && S.swings15.sh && S.swings15.sh[0] && c.c > S.swings15.sh[0] && r !== null && r > 55, 2, 'Structural high + momentum = run');
  a.hit(S.bias15 === 'SHORT' && S.swings15.sl && S.swings15.sl[0] && c.c < S.swings15.sl[0] && r !== null && r < 45, 2, 'Structural low + momentum = slide');
  a.hit(S.range && S.range.type === 'flat' && Math.abs(r - 50) > 25, -1, 'Range + extreme momentum = fake');
  a.hit(S.liq.sweptL && r !== null && r > 40 && c.bull, 1.5, 'Sweep + momentum recovery');
  a.hit(S.liq.sweptH && r !== null && r < 60 && c.bear, 1.5, 'Sweep + momentum rejection');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('25.6', 25, 'Momentum Time Analysis');
  a.hit(S.sessions && S.sessions.isLondon && r !== null && r > 60 && c.bull, 1, 'London momentum up');
  a.hit(S.sessions && S.sessions.isNY && r !== null && r < 40 && c.bear, 1, 'NY momentum down');
  a.hit(S.sessions && S.sessions.isAsian && Math.abs((r || 50) - 50) > 25, -1, 'Asian momentum extreme = fake');
  a.hit(S.sessions && S.sessions.isWeekend && c.v < i.volAvg, -0.5, 'Weekend no momentum');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('25.7', 25, 'Momentum Microstructure');
  const buyPct = S.aggBuyPct;
  a.hit(buyPct > 0.55 && c.bull && r !== null && r > 50, 1.5, 'Tape + momentum aligned');
  a.hit(buyPct < 0.45 && c.bear && r !== null && r < 50, 1.5, 'Tape + momentum aligned');
  a.hit(buyPct > 0.55 && c.bear && r !== null && r < 45, -1, 'Buy tape vs momentum down');
  a.hit(buyPct < 0.45 && c.bull && r !== null && r > 55, -1, 'Sell tape vs momentum up');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('25.8', 25, 'Adaptive Momentum');
  const atrPct = S.atr15pct || 1;
  a.hit(atrPct < 0.0012 && r !== null && Math.abs(r - 50) < 10, -1, 'Low vol, flat momentum = chop');
  a.hit(atrPct > 0.003 && r !== null && Math.abs(r - 50) > 25, 1, 'High vol + real momentum');
  a.hit(adxO && adxO.adx > 30 && r !== null && Math.abs(r - 50) > 25, 1.5, 'ADX 30+ = trending momentum');
  a.hit(adxO && adxO.adx < 15 && r !== null && Math.abs(r - 50) > 30, -1, 'No trend = spike only')
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('25.9', 25, 'Momentum Pattern');
  a.hit(S.rsiDivBull && st && st.k < 30 && c.bull && c.v > i.volAvg, 2.5, 'RSI + Stoch bottom combo');
  a.hit(S.rsiDivBear && st && st.k > 70 && c.bear && c.v > i.volAvg, 2.5, 'RSI + Stoch top combo');
  a.hit(m && m.rising && r !== null && r > 50 && c.bull && c.c > i.ema21, 2, 'MACD + RSI + price triple');
  a.hit(m && !m.rising && r !== null && r < 50 && c.bear && c.c < i.ema21, 2, 'MACD + RSI + price triple');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('25.10', 25, 'Momentum Risk');
  a.hit(r !== null && Math.abs(r - 50) > 45, -1, 'Momentum blow-off');
  a.hit(m && Math.abs(m.histogram) > atr * 0.01, -0.5, 'MACD stretched vs ATR');
  a.hit(S.regime === 'HIGH' && Math.abs((r || 50) - 50) > 40, -1, 'Panic momentum = whip');
  a.hit(S.spread > 0.5, -1, 'Wide spread kills momentum edge');
  a.hit(r === null || m === null, -1, 'Insufficient momentum data');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat26(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;

  let a = new AgentEval('26.1', 26, 'Golden Cross Scalp');
  a.hit(i.ema8 > i.ema21 && i.prevEma8 <= i.prevEma21, 2.5, 'EMA-8/21 golden cross');
  a.hit(i.ema8 > i.ema21 && i.ema21 > i.ema50 && S.bias15 === 'LONG', 2, 'EMA stack bullish');
  a.hit(i.ema8 > i.ema21 && c.c > i.ema8, 1, 'Price above EMA-8 after cross');
  a.hit(i.ema8 > i.ema21 && c.c < i.ema8 && Math.abs(c.c - i.ema8) < atr * 0.3, 1.5, 'Post-cross pullback entry');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('26.2', 26, 'Death Cross Scalp');
  a.hit(i.ema8 < i.ema21 && i.prevEma8 >= i.prevEma21, 2.5, 'EMA-8/21 death cross');
  a.hit(i.ema8 < i.ema21 && i.ema21 < i.ema50 && S.bias15 === 'SHORT', 2, 'EMA stack bearish');
  a.hit(i.ema8 < i.ema21 && c.c < i.ema8, 1, 'Price below EMA-8 after cross');
  a.hit(i.ema8 < i.ema21 && c.c > i.ema8 && Math.abs(c.c - i.ema8) < atr * 0.3, 1.5, 'Post-cross pullback entry');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('26.3', 26, 'EMA-50 Cross');
  a.hit(c.c > i.ema50 && c.prev.c < i.ema50 && i.ema8 > i.ema21, 2, 'Bullish EMA-50 cross with stack');
  a.hit(c.c < i.ema50 && c.prev.c > i.ema50 && i.ema8 < i.ema21, 2, 'Bearish EMA-50 cross with stack');
  a.hit(c.c > i.ema50 && i.ema50 <= i.prevEma50, 1.5, 'EMA-50 turning up');
  a.hit(c.c < i.ema50 && i.ema50 >= i.prevEma50, 1.5, 'EMA-50 turning down');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('26.4', 26, 'EMA-200 Cross');
  a.hit(c.c > i.ema200 && c.prev.c < i.ema200 && i.ema8 > i.ema21, 2.5, 'EMA-200 reclaim with trend');
  a.hit(c.c < i.ema200 && c.prev.c > i.ema200 && i.ema8 < i.ema21, 2.5, 'EMA-200 loss with trend');
  a.hit(i.ema200 > i.prevEma200 && c.c > i.ema200 && S.bias1h === 'LONG', 1, 'Rising EMA-200 macro bull');
  a.hit(i.ema200 < i.prevEma200 && c.c < i.ema200 && S.bias1h === 'SHORT', 1, 'Falling EMA-200 macro bear');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('26.5', 26, 'EMA Fan Expansion');
  a.hit(i.ema8 > i.ema21 && i.ema21 > i.ema50 && (i.ema8 - i.ema21) > (i.prevEma8 - i.prevEma21), 1.5, 'Fan opening up');
  a.hit(i.ema8 < i.ema21 && i.ema21 < i.ema50 && (i.ema8 - i.ema21) < (i.prevEma8 - i.prevEma21), 1.5, 'Fan opening down');
  a.hit(i.ema8 > i.ema21 && (i.ema8 - i.ema21) < (i.prevEma8 - i.prevEma21) && S.bias15 === 'SHORT', -1, 'Fan closing = trend tired');
  a.hit(i.ema8 < i.ema21 && (i.ema8 - i.ema21) > (i.prevEma8 - i.prevEma21) && S.bias15 === 'LONG', -1, 'Fan closing = trend tired');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('26.6', 26, 'EMA Compression');
  const comp = (i.ema8 - i.ema21) / (i.ema21 || 1);
  a.hit(Math.abs(comp) < 0.00005, 1.5, 'EMA-8/21 compression');
  a.hit(Math.abs(comp) < 0.00005 && c.v > i.volAvg * 1.5, 2, 'Compression + volume = expansion');
  a.hit(Math.abs(comp) < 0.00005 && i.bb && i.bb.bw < 0.08, 2, 'EMA + BB squeeze combo');
  a.hit(Math.abs(comp) < 0.00005 && c.range < atr * 0.4, 1, 'Tight candles in compression');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('26.7', 26, 'EMA Retest Specialist');
  a.hit(c.l <= i.ema21 && c.c > i.ema21 && i.ema8 > i.ema21, 2, 'EMA-21 retest hold');
  a.hit(c.h >= i.ema21 && c.c < i.ema21 && i.ema8 < i.ema21, 2, 'EMA-21 retest reject');
  a.hit(c.l <= i.ema50 && c.c > i.ema50 && S.bias15 === 'LONG', 2, 'EMA-50 retest hold in uptrend');
  a.hit(c.h >= i.ema50 && c.c < i.ema50 && S.bias15 === 'SHORT', 2, 'EMA-50 retest reject in downtrend');
  a.hit(Math.abs(c.c - i.ema21) < atr * 0.2, 0.5, 'At EMA-21 knife edge');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('26.8', 26, 'EMA Slope Analysis');
  const slope8 = i.ema8 - i.prevEma8;
  a.hit(slope8 > atr * 0.05 && c.c > i.ema8, 1.5, 'EMA-8 steep up + price above');
  a.hit(slope8 < -atr * 0.05 && c.c < i.ema8, 1.5, 'EMA-8 steep down + price below');
  a.hit(Math.abs(slope8) < atr * 0.005 && S.bias15 !== 'RANGE', -0.5, 'Flat EMA-8 = no momentum');
  a.hit(slope8 > atr * 0.05 && c.c < i.ema8, -1, 'Steep up + price below = pullback risk');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('26.9', 26, 'EMA Distance Analysis');
  const d = (c.c - i.ema21) / (atr || 1);
  a.hit(d > 2.5, -1, 'Price stretched 2.5 ATR above EMA-21');
  a.hit(d < -2.5, 1, 'Price stretched 2.5 ATR below EMA-21');
  a.hit(d > 1.2 && d < 2 && c.bull, 1, 'Strong but not overdone');
  a.hit(d < -1.2 && d > -2 && c.bear, 1, 'Strong but not overdone');
  a.hit(Math.abs(d) < 0.3, -0.5, 'Price hugging EMA-21');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('26.10', 26, 'EMA Multi-Timeframe Stack');
  const i3 = S.tf['3m'].i, i1h = S.tf['1h'].i, i1d = S.tf['1d'].i;
  const bullStack = (tf) => tf.ema8 > tf.ema21 && tf.ema21 > tf.ema50;
  const bearStack = (tf) => tf.ema8 < tf.ema21 && tf.ema21 < tf.ema50;
  a.hit(bullStack(i) && bullStack(i3) && bullStack(i1h), 2.5, '3m+15m+1h EMA stack bull');
  a.hit(bearStack(i) && bearStack(i3) && bearStack(i1h), 2.5, '3m+15m+1h EMA stack bear');
  a.hit(bullStack(i) && bearStack(i3), -1, 'Micro vs macro stack conflict');
  a.hit(bullStack(i) && i1d !== null && i1d.ema50 !== null && i.ema8 > i1d.ema50, 1, 'Daily EMA support');
  a.hit(bearStack(i) && i1d !== null && i1d.ema50 !== null && i.ema8 < i1d.ema50, 1, 'Daily EMA resistance');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat27(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;

  let a = new AgentEval('27.1', 27, 'Dynamic Support Precision');
  a.hit(c.l <= i.ema8 && c.c > i.ema8 && i.ema8 > i.ema21, 1.5, 'EMA-8 bounce precision long');
  a.hit(c.l <= i.ema21 && c.c > i.ema21 && S.bias15 === 'LONG', 1.5, 'EMA-21 bounce long');
  a.hit(i.kc && c.l <= i.kc.lower && c.c > i.kc.lower, 1.5, 'Keltner lower bounce');
  a.hit(i.bb && c.l <= i.bb.lower && c.c > i.bb.lower, 1.5, 'BB lower bounce');
  a.hit(S.vwap15 && c.l <= S.vwap15 && c.c > S.vwap15, 1.5, 'VWAP bounce');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('27.2', 27, 'Dynamic Resistance Precision');
  a.hit(c.h >= i.ema8 && c.c < i.ema8 && i.ema8 < i.ema21, 1.5, 'EMA-8 reject short');
  a.hit(c.h >= i.ema21 && c.c < i.ema21 && S.bias15 === 'SHORT', 1.5, 'EMA-21 reject short');
  a.hit(i.kc && c.h >= i.kc.upper && c.c < i.kc.upper, 1.5, 'Keltner upper reject');
  a.hit(i.bb && c.h >= i.bb.upper && c.c < i.bb.upper, 1.5, 'BB upper reject');
  a.hit(S.vwap15 && c.h >= S.vwap15 && c.c < S.vwap15, 1.5, 'VWAP reject');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('27.3', 27, 'VWAP Dynamic Levels');
  const v = S.vwap15;
  a.hit(v && Math.abs(S.price - v) < atr * 0.3, 1, 'At VWAP');
  a.hit(v && c.c > v && S.bias15 === 'LONG', 1, 'Bullish control above VWAP');
  a.hit(v && c.c < v && S.bias15 === 'SHORT', 1, 'Bearish control below VWAP');
  a.hit(v && S.price > v + atr * 2 && c.bear, 1, 'Fade back to VWAP');
  a.hit(v && S.price < v - atr * 2 && c.bull, 1, 'Fade back to VWAP');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('27.4', 27, 'Opening Range Dynamics');
  const or = S.openingRange;
  a.hit(or && c.c > or.high, 1.5, 'Above OR high = bullish day');
  a.hit(or && c.c < or.low, 1.5, 'Below OR low = bearish day');
  a.hit(or && c.l <= or.low && c.c > or.low, 1.5, 'OR low retest hold');
  a.hit(or && c.h >= or.high && c.c < or.high, 1.5, 'OR high retest reject');
  a.hit(or && c.c > or.mid, 1, 'Upper half of OR');
  a.hit(or && c.c < or.mid, 1, 'Lower half of OR');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('27.5', 27, 'ATR Dynamic Envelope');
  a.hit(S.price < i.ema21 - atr * 1.5 && S.bias15 === 'LONG', 1, 'Envelope bottom = long zone');
  a.hit(S.price > i.ema21 + atr * 1.5 && S.bias15 === 'SHORT', 1, 'Envelope top = short zone');
  a.hit(Math.abs(S.price - i.ema21) > atr * 2.5, -1, 'Beyond 2.5 ATR = stretched');
  a.hit(c.l <= i.ema21 - atr && c.c > i.ema21, 1.5, 'Envelope hold recover');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('27.6', 27, 'Keltner Dynamic Levels');
  const kc = i.kc;
  a.hit(kc && c.range < atr * 0.5 && S.price > kc.mid + atr * 0.5, 1, 'Keltner mid = magnet');
  a.hit(kc && c.c > kc.upper && S.bias15 === 'LONG', 1.5, 'Riding upper band (trend)');
  a.hit(kc && c.c < kc.lower && S.bias15 === 'SHORT', 1.5, 'Riding lower band (trend)');
  a.hit(kc && S.price < kc.mid && Math.abs(S.price - kc.lower) < atr * 0.4, 1, 'Lower band pullback');
  a.hit(kc && S.price > kc.mid && Math.abs(S.price - kc.upper) < atr * 0.4, 1, 'Upper band pullback');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('27.7', 27, 'Previous Candle Dynamics');
  const pc = c.prev;
  a.hit(c.l <= pc.l && c.c > pc.l && c.bull, 1.5, 'Prior low reclaimed');
  a.hit(c.h >= pc.h && c.c < pc.h && c.bear, 1.5, 'Prior high rejected');
  a.hit(S.price > pc.h && i.ema8 > i.ema21, 1, 'Break of prior high');
  a.hit(S.price < pc.l && i.ema8 < i.ema21, 1, 'Break of prior low');
  a.hit(c.range < pc.range * 0.5 && c.bull, 1, 'Expansion after contraction');
  a.hit(c.range < pc.range * 0.5 && c.bear, 1, 'Expansion after contraction');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('27.8', 27, 'Pivot Dynamic S/R');
  const pv = S.pivots;
  a.hit(pv && Math.abs(S.price - pv.p) < atr * 0.5, 1, 'Pivot equilibrium');
  a.hit(pv && c.c > pv.p && c.prev.c < pv.p, 1.5, 'Pivot reclaim');
  a.hit(pv && c.c < pv.p && c.prev.c > pv.p, 1.5, 'Pivot loss');
  a.hit(pv && c.c > pv.r1, 1.5, 'Above R1 = strength');
  a.hit(pv && c.c < pv.s1, 1.5, 'Below S1 = weakness');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('27.9', 27, 'Fibonacci Dynamic Levels');
  const pd = S.prevDay, fRange = pd.h - pd.l;
  const f618 = pd.h - fRange * 0.618, f382 = pd.h - fRange * 0.382;
  a.hit(Math.abs(S.price - f618) < atr * 0.5 && S.bias15 === 'LONG', 1.5, '0.618 support in uptrend');
  a.hit(Math.abs(S.price - f382) < atr * 0.5 && S.bias15 === 'SHORT', 1.5, '0.382 resistance in downtrend');
  a.hit(Math.abs(S.price - f618) < atr * 0.5 && S.bias15 === 'SHORT', -1, '0.618 broken support');
  a.hit(fRange > 0 && S.price === S.prevDay.h, 1, 'Fibo extreme = day high');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('27.10', 27, 'Dynamic Level Risk');
  a.hit(S.bias15 === 'LONG' && Math.abs(S.price - i.ema21) > atr * 2.2, -1, 'Long chasing stretch');
  a.hit(S.bias15 === 'SHORT' && Math.abs(S.price - i.ema21) > atr * 2.2, -1, 'Short chasing stretch');
  a.hit(i.kc && S.price < i.kc.mid - atr * 2, 1, 'Deep discount to mid');
  a.hit(S.regime === 'HIGH' && S.price < i.ema21 - atr * 2, -0.5, 'High-vol gap risk');
  a.hit(S.spread > 0.5, -1, 'Wide spread at dynamic level');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat28(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const rb = [i.ema8, i.ema21, i.ema50, i.ema200].filter(v => v !== null);
  const flat = rb.length >= 2 && (rb[rb.length - 1] - rb[0]) < atr * 0.3;
  const spread = rb.length >= 2 ? rb[rb.length - 1] - rb[0] : 0;

  let a = new AgentEval('28.1', 28, 'Ribbon Expansion');
  a.hit(rb.length >= 3 && rb[0] > rb[1] && rb[1] > rb[2] && spread > atr * 0.6, 1.5, 'Ribbon expanding up');
  a.hit(rb.length >= 3 && rb[0] < rb[1] && rb[1] < rb[2] && spread < -atr * 0.6, 1.5, 'Ribbon expanding down');
  a.hit(spread > atr * 1.2 && spread > 0, 1, 'Extended bullish ribbon');
  a.hit(spread < -atr * 1.2, 1, 'Extended bearish ribbon');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('28.2', 28, 'Ribbon Compression');
  a.hit(flat, 1.5, 'Ribbon compressed');
  a.hit(flat && c.v > i.volAvg * 1.5, 2, 'Compression + volume = launch');
  a.hit(flat && i.bb && i.bb.bw < 0.08, 1.5, 'Ribbon + BB squeeze');
  a.hit(flat && S.liq.sweptL, 1.5, 'Compression + sweep = spring');
  a.hit(flat && S.liq.sweptH, 1.5, 'Compression + sweep = trap');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('28.3', 28, 'Ribbon Flip');
  a.hit(i.prevEma8 <= i.prevEma21 && i.ema8 > i.ema21 && i.ema21 > i.prevEma21, 2, 'Ribbon flip bullish');
  a.hit(i.prevEma8 >= i.prevEma21 && i.ema8 < i.ema21 && i.ema21 < i.prevEma21, 2, 'Ribbon flip bearish');
  a.hit(i.ema8 > i.ema21 && c.c > i.ema8, 1, 'Flip + price confirmation');
  a.hit(i.ema8 < i.ema21 && c.c < i.ema8, 1, 'Flip + price confirmation');
  a.hit(i.ema8 > i.ema21 && c.c < i.ema21, -1, 'Flip but price failed');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('28.4', 28, 'Ribbon Walk');
  a.hit(rb.length >= 3 && rb[0] > rb[1] && rb[1] > rb[2] && c.l > rb[1] && c.c > rb[0], 2, 'Clean bullish ribbon walk');
  a.hit(rb.length >= 3 && rb[0] < rb[1] && rb[1] < rb[2] && c.h < rb[1] && c.c < rb[0], 2, 'Clean bearish ribbon walk');
  a.hit(c.l <= rb[1] && rb[0] > rb[1] && c.c > rb[0], 1.5, 'Walk pullback to ribbon');
  a.hit(c.h >= rb[1] && rb[0] < rb[1] && c.c < rb[0], 1.5, 'Walk pullback to ribbon');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('28.5', 28, 'Ribbon Twist');
  a.hit(i.ema8 > i.ema21 && i.prevEma8 < i.prevEma21 && spread < atr * 0.2, 1.5, 'Fresh twist = early move');
  a.hit(rb.length >= 2 && Math.abs(spread) < atr * 0.1 && Math.abs(i.ema8 - rb[rb.length - 1]) < atr * 0.15, 1, 'Twist converging');
  a.hit(rb.length >= 2 && Math.abs(spread) > atr * 1 && Math.abs(i.ema8 - rb[rb.length - 1]) > atr * 0.3, -0.5, 'Ribbon looping = chop');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('28.6', 28, 'Multi-Timeframe Ribbon');
  const i3 = S.tf['3m'].i;
  const up3 = i3.ema8 && i3.ema21 && i3.ema8 > i3.ema21;
  const dn3 = i3.ema8 && i3.ema21 && i3.ema8 < i3.ema21;
  a.hit(up3 && rb[0] > rb[1], 1.5, '3m + 15m ribbon aligned up');
  a.hit(dn3 && rb[0] < rb[1], 1.5, '3m + 15m ribbon aligned down');
  a.hit(up3 && rb[0] < rb[1], -1, 'Micro up vs 15m down');
  a.hit(dn3 && rb[0] > rb[1], -1, 'Micro down vs 15m up');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('28.7', 28, 'Ribbon & Price Action');
  const p = lastPin(tf.candles);
  a.hit(p.bull && rb[0] > rb[1] && c.c > rb[0], 2, 'Pin + bullish ribbon');
  a.hit(p.bear && rb[0] < rb[1] && c.c < rb[0], 2, 'Pin + bearish ribbon');
  a.hit(c.range < atr * 0.4 && rb[0] > rb[1] && c.c > rb[0], 1, 'Quiet candle above ribbon');
  a.hit(c.range < atr * 0.4 && rb[0] < rb[1] && c.c < rb[0], 1, 'Quiet candle below ribbon');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('28.8', 28, 'Ribbon & Volume');
  const v = c.v / (i.volAvg || 1);
  a.hit(v > 1.5 && rb[0] > rb[1] && c.bull, 1.5, 'Ribbon + volume + green');
  a.hit(v > 1.5 && rb[0] < rb[1] && c.bear, 1.5, 'Ribbon + volume + red');
  a.hit(v < 0.5 && rb[0] > rb[1] && c.bull, -0.5, 'Ribbon up without volume');
  a.hit(v < 0.5 && rb[0] < rb[1] && c.bear, -0.5, 'Ribbon down without volume');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('28.9', 28, 'Ribbon Slope');
  const slope = i.ema8 - i.prevEma8;
  a.hit(slope > atr * 0.04 && rb[0] > rb[1], 1.5, 'Ribbon steep up');
  a.hit(slope < -atr * 0.04 && rb[0] < rb[1], 1.5, 'Ribbon steep down');
  a.hit(Math.abs(slope) < atr * 0.005, -0.5, 'Ribbon flat');
  a.hit(slope > atr * 0.04 && c.c < rb[0], -1, 'Steep up but price below');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('28.10', 28, 'Ribbon Risk');
  a.hit(flat && S.regime === 'LOW', -0.5, 'Flat ribbon low vol = fade only');
  a.hit(spread > atr * 2, -1, 'Ribbon overextended');
  a.hit(spread < -atr * 2, -1, 'Ribbon overextended');
  a.hit(rb.length < 2, -1.5, 'Ribbon incomplete');
  a.hit(S.regime === 'HIGH' && Math.abs(spread) > atr * 1.5, -1, 'High vol ribbon = whipsaw');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat29(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const hv = i.hull;

  let a = new AgentEval('29.1', 29, 'Hull MA Color Change');
  a.hit(hv !== null && hv > 0 && i.prevHull !== null && i.prevHull <= 0, 2, 'Hull flip up');
  a.hit(hv !== null && hv < 0 && i.prevHull !== null && i.prevHull >= 0, 2, 'Hull flip down');
  a.hit(hv !== null && hv > 0 && c.c > i.ema21, 1, 'Hull up + price above EMA-21');
  a.hit(hv !== null && hv < 0 && c.c < i.ema21, 1, 'Hull down + price below EMA-21');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('29.2', 29, 'Hull MA Slope');
  a.hit(hv !== null && i.prevHull !== null && hv - i.prevHull > atr * 0.1, 1.5, 'Hull slope up');
  a.hit(hv !== null && i.prevHull !== null && hv - i.prevHull < -atr * 0.1, 1.5, 'Hull slope down');
  a.hit(hv !== null && i.prevHull !== null && Math.abs(hv - i.prevHull) < atr * 0.01, -0.5, 'Hull flat');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('29.3', 29, 'Adaptive MA Direction');
  const hvA = i.ema8 > i.ema21 ? i.ema8 : i.ema21;
  a.hit(i.ema8 > i.ema21 && c.c > hvA, 1.5, 'Adaptive up bias');
  a.hit(i.ema8 < i.ema21 && c.c < hvA, 1.5, 'Adaptive down bias');
  a.hit(c.c > i.ema8 && i.ema8 > i.ema21, 1, 'Fast MA leading up');
  a.hit(c.c < i.ema8 && i.ema8 < i.ema21, 1, 'Fast MA leading down');
  a.hit(Math.abs(i.ema8 - i.ema21) < atr * 0.05, -0.5, 'Adaptive indecision');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('29.4', 29, 'Hull + EMA Confluence');
  a.hit(hv !== null && hv > 0 && i.ema8 > i.ema21, 2, 'Hull + EMA stack bull');
  a.hit(hv !== null && hv < 0 && i.ema8 < i.ema21, 2, 'Hull + EMA stack bear');
  a.hit(hv !== null && hv > 0 && c.l <= i.ema21 && c.c > i.ema21, 1.5, 'Hull + EMA-21 support');
  a.hit(hv !== null && hv < 0 && c.h >= i.ema21 && c.c < i.ema21, 1.5, 'Hull + EMA-21 resistance');
  a.hit(hv !== null && hv > 0 && i.ema8 < i.ema21, -1, 'Hull vs EMA conflict');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('29.5', 29, 'Adaptive + Volatility');
  const atrPct = S.atr15pct || 1;
  a.hit(atrPct < 0.0012 && i.ema8 > i.ema21 && c.c > i.ema8, 1, 'Low vol + adaptive up = grind');
  a.hit(atrPct > 0.003 && i.ema8 > i.ema21 && c.c > i.ema8, 1.5, 'High vol + adaptive up = expansion');
  a.hit(atrPct > 0.004 && Math.abs(i.ema8 - i.ema21) > atr * 1.5, -1, 'Overextended adaptive in panic');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('29.6', 29, 'Hull Pattern Recognition');
  a.hit(hv !== null && hv > 0 && c.prev.h === undefined && c.v > i.volAvg * 1.3, 1, 'Hull + volume surge')
  a.hit(hv !== null && hv > 0 && Math.abs(c.c - i.ema21) < atr * 0.3, 1.5, 'Hull + price at EMA-21 = coil');
  a.hit(hv !== null && hv > 0 && c.prev.c < i.ema21 && c.c > i.ema21, 1.5, 'Hull + EMA-21 reclaim');
  a.hit(hv !== null && hv < 0 && c.prev.c > i.ema21 && c.c < i.ema21, 1.5, 'Hull + EMA-21 loss');
  a.hit(hv !== null && hv > 0 && S.liq.sweptL, 1, 'Hull + sweep = spring');
  a.hit(hv !== null && hv < 0 && S.liq.sweptH, 1, 'Hull + sweep = trap');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('29.7', 29, 'Adaptive Pattern Recognition');
  a.hit(i.ema8 > i.ema21 && c.prev.ema8 !== undefined && i.prevEma8 > i.prevEma21 && c.c > i.ema8, 1.5, 'Sustained adaptive run up');
  a.hit(i.ema8 < i.ema21 && c.prev.ema8 !== undefined && i.prevEma8 < i.prevEma21 && c.c < i.ema8, 1.5, 'Sustained adaptive run down');
  a.hit(i.ema8 > i.ema21 && c.range < atr * 0.4, 1, 'Quiet above adaptive = tight');
  a.hit(i.ema8 < i.ema21 && c.range < atr * 0.4, 1, 'Quiet below adaptive = tight');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('29.8', 29, 'Hull & Volume');
  const v = c.v / (i.volAvg || 1);
  a.hit(hv !== null && hv > 0 && v > 2 && c.bull, 2, 'Hull + volume climax up');
  a.hit(hv !== null && hv < 0 && v > 2 && c.bear, 2, 'Hull + volume climax down');
  a.hit(hv !== null && hv > 0 && v < 0.5, -0.5, 'Hull up dry volume');
  a.hit(hv !== null && hv < 0 && v < 0.5, -0.5, 'Hull down dry volume');
  a.hit(hv !== null && v > 2 && S.liq.sweptL && hv > 0, 1.5, 'Volume flush into sweep, hull up');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('29.9', 29, 'Adaptive Multi-Timeframe');
  const i3 = S.tf['3m'].i, i1h = S.tf['1h'].i;
  a.hit(i3.ema8 > i3.ema21 && i.ema8 > i.ema21 && i1h.ema8 > i1h.ema21, 2.5, '3m+15m+1h adaptive stack up');
  a.hit(i3.ema8 < i3.ema21 && i.ema8 < i.ema21 && i1h.ema8 < i1h.ema21, 2.5, '3m+15m+1h adaptive stack down');
  a.hit(i3.ema8 > i3.ema21 && i.ema8 < i.ema21, -1, 'Micro up vs 15m down');
  a.hit(i1h.ema8 > i1h.ema21 && i.ema8 < i.ema21, -1, '15m down vs 1h up = pullback');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('29.10', 29, 'Hull/Adaptive Risk');
  a.hit(hv !== null && hv > 0 && Math.abs(c.c - i.ema21) > atr * 2.5, -1, 'Chasing hull extension');
  a.hit(hv !== null && i.prevHull !== null && Math.abs(hv - i.prevHull) > atr * 0.3, -1, 'Hull whipsaw spike');
  a.hit(S.regime === 'HIGH' && Math.abs(i.ema8 - i.ema21) > atr * 1.8, -1, 'Adaptive blown out = skip');
  a.hit(hv === null, -1.5, 'No hull data');
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

function cat30(S) {
  const out = [];
  const tf = T(S), c = lastCandle(tf.candles), i = tf.i, atr = S.atr15 || 1;
  const i3 = S.tf['3m'].i, i5 = S.tf['5m'].i, i1h = S.tf['1h'].i, i4h = S.tf['4h'].i, i1d = S.tf['1d'].i;

  let a = new AgentEval('30.1', 30, '3m/15m Alignment');
  a.hit(i3.ema8 > i3.ema21 && i.ema8 > i.ema21, 1.5, '3m + 15m EMA up');
  a.hit(i3.ema8 < i3.ema21 && i.ema8 < i.ema21, 1.5, '3m + 15m EMA down');
  a.hit(i3.ema8 > i3.ema21 && i.ema8 < i.ema21, -1.5, '3m up vs 15m down');
  a.hit(i3.ema8 < i3.ema21 && i.ema8 > i.ema21, -1.5, '3m down vs 15m up');
  a.hit(i3.c_b && c.c > i.ema21 && i.ema8 > i.ema21, 1, '3m confirm + 15m up')
  a.hit(i3.c_b === false && c.c < i.ema21 && i.ema8 < i.ema21, 1, '3m confirm + 15m down')
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('30.2', 30, '15m/1h Alignment');
  a.hit(i.ema8 > i.ema21 && i1h.ema8 > i1h.ema21, 2, '15m + 1h EMA up');
  a.hit(i.ema8 < i.ema21 && i1h.ema8 < i1h.ema21, 2, '15m + 1h EMA down');
  a.hit(i.ema8 > i.ema21 && i1h.ema8 < i1h.ema21, -1, '15m up vs 1h down = counter');
  a.hit(i.ema8 < i.ema21 && i1h.ema8 > i1h.ema21, -1, '15m down vs 1h up = pullback');
  a.hit(i.ema8 > i.ema21 && i1h.ema8 > i1h.ema21 && c.c > i.ema8, 1.5, 'Aligned + price confirm')
  a.hit(i.ema8 < i.ema21 && i1h.ema8 < i1h.ema21 && c.c < i.ema8, 1.5, 'Aligned + price confirm')
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('30.3', 30, '1h/4h Alignment');
  a.hit(i1h.ema8 > i1h.ema21 && i4h.ema8 > i4h.ema21, 1.5, '1h + 4h EMA up');
  a.hit(i1h.ema8 < i1h.ema21 && i4h.ema8 < i4h.ema21, 1.5, '1h + 4h EMA down');
  a.hit(i1h.ema8 > i1h.ema21 && i.ema8 > i.ema21 && i4h.ema8 > i4h.ema21, 2, '15m+1h+4h triple up');
  a.hit(i1h.ema8 < i1h.ema21 && i.ema8 < i.ema21 && i4h.ema8 < i4h.ema21, 2, '15m+1h+4h triple down');
  a.hit(i1h.ema8 > i1h.ema21 && i4h.ema8 < i4h.ema21, -1, '1h vs 4h conflict')
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('30.4', 30, 'All EMA Green/Red');
  const g = [i, i3, i5, i1h, i4h, i1d].filter(x => x && x.ema8 !== null && x.ema21 !== null);
  const allUp = g.length >= 4 && g.every(x => x.ema8 > x.ema21);
  const allDn = g.length >= 4 && g.every(x => x.ema8 < x.ema21);
  a.hit(allUp, 2.5, 'All TFs EMA green');
  a.hit(allDn, 2.5, 'All TFs EMA red');
  a.hit(allUp && c.c > i.ema8, 1.5, 'Green stack + price above');
  a.hit(allDn && c.c < i.ema8, 1.5, 'Red stack + price below');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('30.5', 30, 'EMA Hierarchy');
  const order = g.filter(x => x.ema8 !== null && x.ema21 !== null && x.ema50 !== null);
  const okUp = order.every(x => x.ema8 > x.ema21 && x.ema21 > x.ema50);
  const okDn = order.every(x => x.ema8 < x.ema21 && x.ema21 < x.ema50);
  a.hit(okUp, 2, 'Perfect bull hierarchy');
  a.hit(okDn, 2, 'Perfect bear hierarchy');
  a.hit(order.length >= 3 && order.filter(x => x.ema8 > x.ema21).length === order.length - 1, 1, 'One TF lagging up');
  a.hit(order.length >= 3 && order.filter(x => x.ema8 < x.ema21).length === order.length - 1, 1, 'One TF lagging down');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('30.6', 30, 'Macro Support Scalp');
  a.hit(i1h.ema50 !== null && c.l <= i1h.ema50 && c.c > i1h.ema50, 2, '1h EMA-50 support hold');
  a.hit(i1h.ema50 !== null && c.h >= i1h.ema50 && c.c < i1h.ema50, 2, '1h EMA-50 resistance reject');
  a.hit(i4h.ema50 !== null && c.l <= i4h.ema50 && c.c > i4h.ema50, 1.5, '4h EMA-50 support hold');
  a.hit(i1d.ema50 !== null && c.c > i1d.ema50 && S.bias15 === 'LONG', 1, 'Daily EMA-50 above = macro bull');
  a.hit(i1d.ema50 !== null && c.c < i1d.ema50 && S.bias15 === 'SHORT', 1, 'Daily EMA-50 below = macro bear');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('30.7', 30, 'EMA Confluence Count');
  let bullCt = 0, bearCt = 0;
  for (const x of [i3, i5, i, i1h, i4h, i1d]) {
    if (x && x.ema8 !== null && x.ema21 !== null) {
      if (x.ema8 > x.ema21) bullCt++; else bearCt++;
    }
  }
  a.hit(bullCt >= 5, 2, '5+ TFs bullish');
  a.hit(bearCt >= 5, 2, '5+ TFs bearish');
  a.hit(bullCt === 4, 1, '4 TFs bullish');
  a.hit(bearCt === 4, 1, '4 TFs bearish');
  a.hit(bullCt === 3 && bearCt === 3, -1, 'EMAs split 3-3');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('30.8', 30, 'EMA Time Analysis');
  a.hit(S.sessions && S.sessions.isLondon && i1h.ema8 > i1h.ema21 && i.ema8 > i.ema21, 1, 'London aligned sweep');
  a.hit(S.sessions && S.sessions.isNY && i1h.ema8 < i1h.ema21 && i.ema8 < i.ema21, 1, 'NY aligned push');
  a.hit(S.sessions && S.sessions.isAsian && Math.abs(i.ema8 - i.ema21) < atr * 0.05, -0.5, 'Asian EMA flat')
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('30.9', 30, 'EMA Microstructure');
  const bk = S.book;
  a.hit(i.ema8 > i.ema21 && bk.imbalBid > 0.55, 1.5, 'EMA up + bid book');
  a.hit(i.ema8 < i.ema21 && bk.imbalBid < 0.45, 1.5, 'EMA down + ask book');
  a.hit(i.ema8 > i.ema21 && S.aggBuyPct !== null && S.aggBuyPct > 0.55, 1.5, 'EMA up + buy tape');
  a.hit(i.ema8 < i.ema21 && S.aggBuyPct !== null && S.aggBuyPct < 0.45, 1.5, 'EMA down + sell tape');
  a.hit(i.ema8 > i.ema21 && bk.imbalBid < 0.45, -1, 'EMA up vs ask book');
  a.hit(i.ema8 < i.ema21 && bk.imbalBid > 0.55, -1, 'EMA down vs bid book');
  out.push(finish(a, S, { entry: S.price }));

  a = new AgentEval('30.10', 30, 'EMA Risk');
  const sd = (i.ema8 - i.ema21) / (atr || 1);
  a.hit(sd > 1.5 && S.bias15 === 'LONG', -1, '15m EMA stretched long');
  a.hit(sd < -1.5 && S.bias15 === 'SHORT', -1, '15m EMA stretched short');
  a.hit(S.regime === 'HIGH' && Math.abs(sd) > 2, -1.5, 'High vol EMA gap = skip');
  a.hit(S.regime === 'LOW' && Math.abs(sd) < 0.05, -0.5, 'Low vol flat = no edge');
  a.hit(i1h.ema50 !== null && Math.abs(c.c - i1h.ema50) > atr * 3, -1, 'Far from 1h EMA-50')
  out.push(finish(a, S, { entry: S.price }));
  return out;
}

module.exports = { cat21, cat22, cat23, cat24, cat25, cat26, cat27, cat28, cat29, cat30 };