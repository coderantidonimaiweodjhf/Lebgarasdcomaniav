'use strict';
/* OMNISCIENT SCALPER v22.0 — terminal UI: live SSE render. */

const $ = id => document.getElementById(id);
const fmt = (v, d = 2) => v === null || v === undefined || !isFinite(v) ? '--' : v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const sign = v => v > 0 ? '+' + fmt(v) : fmt(v);
const pct = v => v === null || v === undefined || !isFinite(v) ? '--' : (v * 100).toFixed(4) + '%';

const state = {
  last: null, prevPrice: null,
  oiRing: [], deltaRing: [], book: null,
  events: [], lastSigTs: null, lastGatesAll: null, lastStructure: null, loggedOutcomes: {},
  chartTF: '15m'
};

function spark(key, fn) {
  const cv = $(key);
  const ctx = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  ctx.clearRect(0, 0, w, h);
  const data = fn();
  if (!data || !data.length) return;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const step = w / (data.length - 1 || 1);
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = i * step, y = h - 4 - ((v - min) / span) * (h - 10);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const mid = (min + max) / 2;
  ctx.beginPath();
  ctx.moveTo(0, h - 4 - ((mid - min) / span) * (h - 10));
  ctx.lineTo(w, h - 4 - ((mid - min) / span) * (h - 10));
  ctx.strokeStyle = '#1b2434';
  ctx.stroke();
}

function drawBook(S) {
  const cv = $('bookCv');
  const ctx = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  ctx.fillStyle = '#060a12';
  ctx.fillRect(0, 0, w, h);
  const bids = (S.book && S.book.bids) || [];
  const asks = (S.book && S.book.asks) || [];
  const all = bids.concat(asks);
  if (!all.length) return;
  const maxV = Math.max(...all.map(x => x.v), 1);
  const minP = Math.min(...all.map(x => x.p)), maxP = Math.max(...all.map(x => x.p));
  const span = maxP - minP || 1;
  const bw = w / 2 / Math.max(bids.length, asks.length, 1);
  const barH = size => (size / maxV) * (h - 10);
  bids.forEach((x, i) => {
    const px = (x.p - minP) / span * (w / 2 - 4);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(px, h - barH(x.v), bw, barH(x.v));
  });
  asks.forEach((x, i) => {
    const px = w / 2 + 4 + (x.p - minP) / span * (w / 2 - 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(px, h - barH(x.v), bw, barH(x.v));
  });
  ctx.fillStyle = '#1b2434';
  ctx.fillRect(w / 2 - 1, 0, 2, h);
}

function render(p) {
  const S = p.S;
  if (!S) return;
  state.last = p;

  /* event log — signal fire */
  if (p.signal && p.signal.ts !== state.lastSigTs) {
    state.lastSigTs = p.signal.ts;
    pushEvent(`▲ ${p.signal.direction} @ ${fmt(p.signal.idealEntry, 2)} · conf ${(p.signal.conf * 100).toFixed(1)}% · Q${p.signal.quality || 0}`, p.signal.direction === 'LONG' ? 'up' : 'down');
  }
  /* event log — gate transitions */
  if (p.gates && p.gates.all !== state.lastGatesAll) {
    state.lastGatesAll = p.gates.all;
    if (p.gates.all) pushEvent('GATES GREEN — trading enabled', 'up');
    else {
      const blocked = ['g1','g2','g3','g4','g5','g6','g8'].filter(k => p.gates[k] && !p.gates[k].pass);
      pushEvent('GATES BLOCKED: ' + blocked.join(', '), 'down');
    }
  }
  /* event log — structure flip */
  if (S.structure && S.structure !== state.lastStructure) {
    state.lastStructure = S.structure;
    pushEvent(`STRUCTURE → ${S.structure} ×${S.structureAge || 1}`, S.structure === 'UP' ? 'up' : S.structure === 'DOWN' ? 'down' : 'neu');
  }
  /* event log — trade outcomes */
  if (S.history && S.history.length) {
    S.history.forEach(h => {
      if (h.outcome === 1 || h.outcome === -1) {
        const k = h.ts + ':' + h.outcome;
        if (!state.loggedOutcomes[k]) {
          state.loggedOutcomes[k] = true;
          pushEvent(`TRADE ${h.outcome === 1 ? 'WIN' : 'LOSS'} · ${h.direction} @ ${fmt(h.entry, 2)} · ${fmt(h.rr, 2)}R`, h.outcome === 1 ? 'up' : 'down');
        }
      }
    });
  }

  /* header */
  if (S.price !== null) {
    const el = $('hdrPrice');
    el.textContent = fmt(S.price, 2);
    if (state.prevPrice !== null && S.price !== state.prevPrice) {
      el.className = 'price ' + (S.price > state.prevPrice ? 'up' : 'down');
      setTimeout(() => el.className = 'price', 900);
    }
    state.prevPrice = S.price;
  }
  const t24 = S.ticker24;
  if (t24) {
    const c = Number(t24.priceChangePercent);
    $('hdrChg').textContent = sign(c) + '%';
    $('hdrChg').className = 'chg ' + (c >= 0 ? 'up' : 'down');
  }

  /* freshness */
  $('hdrMeta').textContent =
    `cycles ${p.cycles} · cycle ${p.cycleMs}ms · fresh ${p.S ? fmt(p.S.metaFreshAge / 1000, 1) : '--'}s` +
    (p.err ? ' · ERR ' + p.err.slice(0, 60) : '');

  /* price panel */
  $('v-bid').textContent = fmt(S.bid, 2);
  $('v-ask').textContent = fmt(S.ask, 2);
  $('v-spread').textContent = fmt(S.spread, 2);
  $('v-mark').textContent = fmt(S.mark, 2);
  $('v-index').textContent = fmt(S.index, 2);
  $('v-basis').textContent = (S.basisPct === null || S.basisPct === undefined) ? '--' : pct(S.basisPct);
  $('v-funding').textContent = S.funding === null ? '--' : (S.funding * 100).toFixed(4) + '%';
  $('v-regime').textContent = S.regime || '--';
  $('v-structure').textContent = S.structure || '--';

  /* book */
  if (S.book && S.book.bids && S.book.asks) {
    state.book = S.book;
    drawBook(S);
    $('v-bidWalls').textContent = (S.book.bidWalls || []).map(x => fmt(x.p, 2)).join(', ') || 'none';
    $('v-askWalls').textContent = (S.book.askWalls || []).map(x => fmt(x.p, 2)).join(', ') || 'none';
    $('v-imbal').textContent = fmt(S.book.imbalBid, 3);
    $('imbal').textContent = S.book.imbalPrev !== null ? 'prev ' + fmt(S.book.imbalPrev, 3) : '--';
  }

  /* swarm */
  const tally = p.tally || {};
  const tot = tally.total || 1;
  const l = tally.LONG || 0, s = tally.SHORT || 0, n = tally.NEUTRAL || 0;
  $('barLong').style.width = (l / tot * 100) + '%';
  $('barShort').style.width = (s / tot * 100) + '%';
  $('t-long').textContent = `LONG ${l} (${Math.round(l / tot * 100)}%)`;
  $('t-neu').textContent = `NEU ${n}`;
  $('t-short').textContent = `SHORT ${s} (${Math.round(s / tot * 100)}%)`;
  if (p.perCat && p.perCat.length) {
    $('perCat').innerHTML = p.perCat
      .filter(d => (d.long || 0) + (d.short || 0) > 0)
      .map(d => {
        const t = (d.long || 0) + (d.short || 0) + (d.neutral || 0);
        const cls = (d.long || 0) >= (d.short || 0) ? 'up' : 'down';
        return `${(d.title || d.cat).replace(' MASTERS', '')}: <span class="${cls}">${d.long || 0}L/${d.short || 0}S</span> (${((t ? (d.long + d.short) / t : 0) * 100).toFixed(0)}%)`;
      })
      .join(' · ') || '<span class="dim">no directional votes</span>';
  }

  /* OI */
  $('v-oi').textContent = S.oi === null ? '--' : fmt(S.oi, 0);
  $('v-oiDelta').textContent = S.oiDelta === null ? '--' : pct(S.oiDelta);
  $('v-oiDelta').className = S.oiDelta > 0 ? '' : S.oiDelta < 0 ? 'down' : '';
  if (S.oiHist && S.oiHist.length) {
    state.oiRing = S.oiHist.slice(-28).map(Number);
    spark('oiCv', () => state.oiRing);
  }

  /* delta / cvd */
  $('v-deltaCur').textContent = fmt(S.delta15Cur, 2);
  $('v-deltaCur').className = S.delta15Cur > 0 ? 'up' : S.delta15Cur < 0 ? 'down' : '';
  $('v-cvd1h').textContent = fmt(S.cvd1h, 0);
  const cr = S.cvdRate;
  $('v-cvdRate').textContent = cr === null ? '--' : cr.toFixed(2);
  $('v-cvdRate').className = cr > 0 ? 'up' : cr < 0 ? 'down' : '';
  if (S.delta15 && S.delta15.length) {
    state.deltaRing = S.delta15.slice(-28);
    spark('deltaCv', () => state.deltaRing);
  }

  /* geometry */
  $('v-entry').textContent = fmt(S.price, 2);
  $('v-sl').textContent = fmt(S.sigSL, 2);
  $('v-tp').textContent = fmt(S.sigTP, 2);
  $('v-rr').textContent = S.sigRR !== null && S.sigRR !== undefined && S.sigRR !== 0 ? fmt(S.sigRR, 2) : '--';
  $('v-conf').textContent = S.conf !== null ? (S.conf * 100).toFixed(1) + '%' : '--';
  $('v-streak').textContent = S.sigStreak || 0;

  /* levels */
  if (S.prevDay) {
    $('v-pdH').textContent = fmt(S.prevDay.h, 2);
    $('v-pdL').textContent = fmt(S.prevDay.l, 2);
    $('v-pp').textContent = S.pivots ? fmt(S.pivots.pp, 2) : '--';
  }
  if (S.sessions) {
    $('v-sessH').textContent = fmt(S.sessions.asianHigh, 2);
    $('v-sessL').textContent = fmt(S.sessions.asianLow, 2);
  }
  const liq = S.liq;
  const liqTxt = liq && (liq.sweptH || liq.sweptL)
    ? `${liq.sweptH ? 'H@' + fmt(liq.sweptH, 2) : ''}${liq.sweptH && liq.sweptL ? ' ' : ''}${liq.sweptL ? 'L@' + fmt(liq.sweptL, 2) : ''}`
    : 'none';
  $('v-liq').textContent = liqTxt;
  $('v-corr').textContent = S.corrBTC === null ? '--' : S.corrBTC.toFixed(2);

  /* divergences */
  const flags = [];
  if (S.rsiDivBull) flags.push('RSI bull');
  if (S.rsiDivBear) flags.push('RSI bear');
  if (S.macdDivBull) flags.push('MACD bull');
  if (S.macdDivBear) flags.push('MACD bear');
  if (S.stochDivBull) flags.push('STOCH bull');
  if (S.stochDivBear) flags.push('STOCH bear');
  if (S.cciDivBull) flags.push('CCI bull');
  if (S.cciDivBear) flags.push('CCI bear');
  if (S.cvdDivBull) flags.push('CVD bull');
  if (S.cvdDivBear) flags.push('CVD bear');
  $('divFlags').innerHTML = flags.length ? flags.map(f => `<div class="${f.includes('bull') ? 'up' : 'down'}">◆ ${f}</div>`).join('') : '<div class="dim">none</div>';

  /* microstructure */
  $('v-aggBuy').textContent = (S.aggBuyPct * 100).toFixed(1) + '%';
  $('v-large').textContent = S.largeTrades ? `n=${S.largeTrades.count} net=${sign(S.largeTrades.net)}` : '--';
  $('v-seq').textContent = S.tradeSeq !== undefined && S.tradeSeq !== null ? S.tradeSeq.toFixed(2) : '--';

  /* signal banner */
  const sig = p.signal;
  const banner = $('signal');
  if (sig) {
    banner.className = 'signal ' + (sig.direction === 'LONG' ? 'long' : 'short');
    $('sigDir').textContent = (sig.direction === 'LONG' ? '▲ LONG' : '▼ SHORT') + ' · Q' + (sig.quality || 0);
    $('sigConf').textContent = `conf ${(sig.conf * 100).toFixed(1)}% · cluster ${sig.count} · lev ${sig.lev}x · ${sig.timeframe || ''}`;
    $('sigGeo').textContent = `ENTRY ${fmt(sig.idealEntry, 2)} (${fmt(sig.entryZone && sig.entryZone[0], 2)}–${fmt(sig.entryZone && sig.entryZone[1], 2)}) / SL ${fmt(sig.sl, 2)} / TP ${fmt(sig.tp, 2)} / RR ${fmt(sig.rr, 2)}`;
    const w = (sig.warnings || []).slice(0, 3).join(' · ');
    $('sigReason').textContent = w || ((sig.topCats || []).join(', ') + (sig.keyAgents ? ' · key ' + sig.keyAgents.join(',') : ''));
  } else if (p.gates && !p.gates.all) {
    banner.className = 'signal neutral';
    $('sigDir').textContent = 'NO SIGNAL';
    $('sigConf').textContent = 'gates blocked';
    $('sigGeo').textContent = `conf ${((S.conf || 0) * 100).toFixed(1)}%`;
    $('sigReason').textContent = S.noTradeReason || '';
  } else {
    banner.className = 'signal neutral';
    $('sigDir').textContent = 'NO SIGNAL';
    $('sigConf').textContent = '';
    $('sigGeo').textContent = '';
    $('sigReason').textContent = S.noTradeReason || 'warming up…';
  }

  /* gates */
  if (p.gates) {
    $('gateList').innerHTML = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g8'].map(k => {
      const g = p.gates[k];
      if (!g) return '';
      return `<div class="gate"><span>${k.toUpperCase()} · ${g.note || ''}</span><span class="${g.pass ? 'ok' : 'fail'}">${g.pass ? 'PASS' : 'FAIL'}</span></div>`;
    }).join('');
  }

  /* history */
  if (S.history && S.history.length) {
    $('histTable').querySelector('tbody').innerHTML = S.history.slice().reverse().slice(0, 12).map(h =>
      `<tr><td>${new Date(h.ts).toLocaleTimeString()}</td>` +
      `<td class="${h.direction === 'LONG' ? 'up' : 'down'}">${h.direction}</td>` +
      `<td>${(h.conf * 100).toFixed(0)}%</td><td>${fmt(h.idealEntry)}</td><td>${fmt(h.sl)}</td><td>${fmt(h.tp)}</td><td>${fmt(h.rr)}</td>` +
      `<td>${h.outcome === 1 ? 'WIN' : h.outcome === -1 ? 'LOSS' : h.outcome === 99 ? 'EXP' : '—'}</td></tr>`
    ).join('');
  }

  /* faults */
  if (p.faults && p.faults.length) {
    $('faults').textContent = p.faults.slice(0, 15).map(f => `[${f.cat}] ${f.id} ${f.msg}`).join('\n');
  }

  drawChart(S, p.signal);
}

function emaSeries(arr, n) {
  const k = 2 / (n + 1);
  let e = null;
  return arr.map(v => { e = e === null ? v : v * k + e * (1 - k); return e; });
}

/* fractal swing detection: bar whose high/low is extreme within ±w bars */
function detectSwings(candles, w = 3) {
  const out = [];
  for (let i = w; i < candles.length - w; i++) {
    const h = Number(candles[i][2]), l = Number(candles[i][3]);
    let hi = h, lo = l;
    for (let k = i - w; k <= i + w; k++) {
      hi = Math.max(hi, Number(candles[k][2]));
      lo = Math.min(lo, Number(candles[k][3]));
    }
    if (h === hi) out.push({ t: 'H', p: h });
    if (l === lo) out.push({ t: 'L', p: l });
  }
  /* collapse consecutive same-type (keep the extreme) */
  const coll = [];
  for (const s of out) {
    const last = coll[coll.length - 1];
    if (last && last.t === s.t) {
      if (s.t === 'H' ? s.p >= last.p : s.p <= last.p) coll[coll.length - 1] = s;
    } else coll.push(s);
  }
  return coll;
}

function drawChart(S, sig) {
  const cv = $('chartCv');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  ctx.fillStyle = '#060a12';
  ctx.fillRect(0, 0, w, h);

  let tfName = state.chartTF;
  let tf = S.tf && S.tf[tfName];
  if (!tf) { tfName = '15m'; tf = S.tf && S.tf['15m']; }
  const c = tf && tf.candles;
  if (!c || c.length < 2) {
    ctx.fillStyle = '#56617a'; ctx.font = '12px monospace';
    ctx.fillText('waiting for ' + state.chartTF + ' candles…', 14, h / 2);
    return;
  }
  const n = c.length;
  const toN = x => Number(x);
  const cs = c.map(x => toN(x[4]));
  const hs = c.map(x => toN(x[2])), ls = c.map(x => toN(x[3]));
  let lo = Math.min(...ls), hi = Math.max(...hs);
  const addLv = v => { if (isFinite(v) && v) { lo = Math.min(lo, v); hi = Math.max(hi, v); } };
  addLv(S.price);
  if (sig) { addLv(sig.sl); addLv(sig.tp); addLv(sig.idealEntry); }
  const pad = (hi - lo) * 0.06 || 1;
  lo -= pad; hi += pad;

  const V = h * 0.76, volTop = h * 0.82;
  const y = p => V - ((p - lo) / (hi - lo)) * V;
  const bw = w / n;
  const maxV = Math.max(...c.map(x => toN(x[5])), 1);

  /* volume strip */
  c.forEach((x, i) => {
    const vv = toN(x[5]) / maxV * (h - volTop - 8);
    const upC = toN(x[4]) >= toN(x[1]);
    ctx.fillStyle = upC ? 'rgba(34,197,94,.22)' : 'rgba(239,68,68,.22)';
    ctx.fillRect(i * bw + 1, volTop, bw - 2, vv);
  });

  /* grid + price tags */
  ctx.strokeStyle = '#0d1420'; ctx.lineWidth = 1;
  ctx.fillStyle = '#56617a'; ctx.font = '10px monospace';
  for (let g = 0; g <= 4; g++) {
    const p = lo + (hi - lo) * g / 4, gy = y(p);
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    ctx.fillText(p.toFixed(1), 4, gy - 3);
  }

  /* candles */
  c.forEach((x, i) => {
    const o = y(toN(x[1])), cl = y(toN(x[4])), hh = y(toN(x[2])), ll = y(toN(x[3]));
    const upC = toN(x[4]) >= toN(x[1]);
    ctx.strokeStyle = upC ? '#22c55e' : '#ef4444';
    ctx.beginPath(); ctx.moveTo(i * bw + bw / 2, hh); ctx.lineTo(i * bw + bw / 2, ll); ctx.stroke();
    ctx.fillStyle = upC ? '#22c55e' : '#ef4444';
    ctx.fillRect(i * bw + bw * 0.2, Math.min(o, cl), bw * 0.6, Math.max(1, Math.abs(cl - o)));
  });

  /* EMAs */
  [[21, '#eab308'], [50, '#38bdf8'], [200, '#a78bfa']].forEach(([nn, col]) => {
    const s = emaSeries(cs, nn);
    ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath();
    s.forEach((v, i) => {
      const yy = y(v);
      i ? ctx.lineTo(i * bw + bw / 2, yy) : ctx.moveTo(i * bw + bw / 2, yy);
    });
    ctx.stroke();
  });

  /* structure zones — swing levels */
  const sw = detectSwings(c);
  const swingH = sw.filter(x => x.t === 'H').slice(-2);
  const swingL = sw.filter(x => x.t === 'L').slice(-2);
  const zPts = [...swingH.map(x => x.p), ...swingL.map(x => x.p)];
  if (zPts.length) {
    const zTop = Math.max(...zPts), zBot = Math.min(...zPts);
    const zoneColor = S.structure === 'UP' ? 'rgba(34,197,94,.08)'
      : S.structure === 'DOWN' ? 'rgba(239,68,68,.08)'
      : 'rgba(234,179,8,.05)';
    ctx.fillStyle = zoneColor;
    ctx.fillRect(0, y(zTop), w, Math.max(1, y(zBot) - y(zTop)));
  }
  swingH.forEach((s, k) => lvl(s.p, '#f472b6', `SH${swingH.length - k} ${fmt(s.p, 2)}`, true));
  swingL.forEach((s, k) => lvl(s.p, '#22d3ee', `SL${swingL.length - k} ${fmt(s.p, 2)}`, true));

  /* signal levels */
  const lvl = (v, col, txt, left) => {
    if (!isFinite(v) || !v) return;
    const yy = y(v);
    ctx.strokeStyle = col; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = col;
    ctx.fillText(txt, left ? 4 : w - 110, yy - 3);
  };
  if (sig) {
    lvl(sig.sl, '#ef4444', 'SL ' + fmt(sig.sl, 2));
    lvl(sig.tp, '#22c55e', 'TP ' + fmt(sig.tp, 2));
    lvl(sig.idealEntry, '#eab308', 'ENTRY ' + fmt(sig.idealEntry, 2));
  }
  lvl(S.price, '#c8d6e5', 'PX ' + fmt(S.price, 2));

  /* meta */
  const lastTs = new Date(toN(c[n - 1][0]));
  $('chartMeta').textContent = `${tfName} · ${lastTs.toLocaleTimeString()} · ${n} bars · ${S.structure || '--'} · EMA21/50/200`;
}

/* --------------------------- event log --------------------------- */
function pushEvent(txt, cls) {
  state.events.unshift({ t: Date.now(), txt, cls });
  if (state.events.length > 80) state.events.pop();
  renderEvents();
}
function renderEvents() {
  const list = $('evtList');
  if (!list) return;
  list.innerHTML = state.events.slice(0, 30)
    .map(e => `<div class="${e.cls}">${new Date(e.t).toLocaleTimeString()} ${e.txt}</div>`).join('')
    || '<div class="dim">--</div>';
}

function boot() {
  const es = new EventSource('/stream');
  es.onmessage = ev => {
    try { render(JSON.parse(ev.data)); } catch (e) { console.error(e); }
  };
  es.onerror = () => {
    $('hdrMeta').textContent = 'STREAM DOWN — reconnecting…';
  };
}

document.addEventListener('DOMContentLoaded', boot);

/* tf selector */
document.getElementById('tfbtns').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  state.chartTF = b.dataset.tf;
  document.querySelectorAll('#tfbtns button').forEach(x => x.classList.toggle('active', x === b));
  if (state.last) drawChart(state.last.S, state.last.signal);
});