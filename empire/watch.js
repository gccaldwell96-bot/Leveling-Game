'use strict';
// =====================================================================================
//  LIVE VIEWER for every sport except football (which has its own field in field.js).
//  A sport passes a renderer: bg() draws the venue, frame() animates one log event,
//  hud() fills the clock / situation line, and big()/banner() mark the highlights.
// =====================================================================================
function teamCols(H, A){ const d = (a, b) => hex2rgb(a).reduce((s, v, i) => s + Math.abs(v - hex2rgb(b)[i]), 0); return [H.c1, d(H.c1, A.c1) < 150 ? A.c2 : A.c1]; }
function watchMatch(o){ // o: {H, A, title, log, R, res:{sc, ot}, userSide}
  return new Promise(resolve => {
    const {H, A, R, log, res} = o, el = $('watch'), cols = teamCols(H, A);
    el.innerHTML = `<div class="bug"><div class="tm" style="background:${cols[0]};color:${textOn(cols[0])}"><span class="poss" id="wp0"></span>${H.abbr}<span class="sc" id="ws0">0</span></div>
        <div class="mid"><span id="wq">${R.startPer || ''}</span><span id="wc" class="num">${R.startClk || ''}</span></div>
        <div class="tm" style="background:${cols[1]};color:${textOn(cols[1])}"><span class="sc" id="ws1" style="margin:0 auto 0 0">0</span>${A.abbr}<span class="poss" id="wp1"></span></div></div>
      <div class="dd"><span id="wdd">${R.startDd || ''}</span><span id="wtitle">${esc(o.title)}</span></div>
      <div style="position:relative"><canvas id="field"></canvas><div class="banner" id="wban" style="opacity:0;top:38%"></div></div>
      ${R.side ? `<div id="wside" class="small" style="margin:6px 12px 0"></div>` : ''}
      <div id="pbp" aria-live="polite"></div>
      <div class="wctl"><button class="btn ghost sm" id="wspd">Speed 1×</button><button class="btn ghost sm" id="wskip" style="flex:1">Skip to final ⏭</button></div>`;
    el.hidden = false; document.body.style.overflow = 'hidden';
    const cv = $('field'), ctx = cv.getContext('2d'), dpr = Math.min(3, window.devicePixelRatio || 1);
    const W = Math.min(560, window.innerWidth), Hh = Math.round(W * R.aspect); cv.style.width = W + 'px'; cv.style.height = Hh + 'px'; cv.width = W * dpr; cv.height = Hh * dpr; ctx.scale(dpr, dpr);
    const st = {W, H:Hh, cols, outl:[H.c2, A.c2], home:H, away:A}; if(R.init) R.init(st);
    WATCH.skip = false; WATCH.speed = S.settings.speed || 1; $('wspd').textContent = `Speed ${WATCH.speed}×`;
    $('wspd').onclick = () => { WATCH.speed = WATCH.speed === 1 ? 2 : WATCH.speed === 2 ? 4 : WATCH.speed === 4 ? 8 : 1; S.settings.speed = WATCH.speed; $('wspd').textContent = `Speed ${WATCH.speed}×`; };
    $('wskip').onclick = () => { WATCH.skip = true; };
    const pbp = $('pbp');
    const setScore = sc => { $('ws0').textContent = sc[0]; $('ws1').textContent = sc[1]; };
    const hud = (e, after) => { const h = R.hud(e, after, st); if(h.per != null) $('wq').textContent = h.per; if(h.clk != null) $('wc').textContent = h.clk; if(h.dd != null) $('wdd').textContent = h.dd;
      $('wp0').style.visibility = e.side === 0 ? 'visible' : 'hidden'; $('wp1').style.visibility = e.side === 1 ? 'visible' : 'hidden'; if(R.side && h.side != null) $('wside').innerHTML = h.side; };
    const line = e => { const d = document.createElement('div'); const h = R.hud(e, true, st); d.textContent = `${h.stamp || ''}${h.stamp ? ' · ' : ''}${e.txt}`; if(R.big(e)) d.className = 'big'; pbp.prepend(d); while(pbp.children.length > 80) pbp.lastChild.remove(); };
    function banner(txt, col){ const b = $('wban'); b.textContent = txt; b.style.color = col; b.style.opacity = 1; setTimeout(() => { b.style.opacity = 0; }, 900 / WATCH.speed + 300); }
    let i = 0, prevSc = [0, 0];
    function step(){
      if(i >= log.length || WATCH.skip){ finish(); return; }
      const e = log[i]; if(!e.txt){ i++; step(); return; }
      hud(e, false); setScore(prevSc);
      const dur = (R.dur ? R.dur(e) : 900) / WATCH.speed, t0 = performance.now();
      const tick = now => { if(WATCH.skip){ finish(); return; } const t = clamp((now - t0) / dur, 0, 1); // the first frame's timestamp can predate t0
        ctx.clearRect(0, 0, W, Hh); R.bg(ctx, st); R.frame(ctx, e, t, st);
        if(t < 1){ WATCH.raf = requestAnimationFrame(tick); return; }
        hud(e, true); setScore(e.sc); prevSc = e.sc; line(e);
        const bn = R.banner && R.banner(e, st); if(bn) banner(bn[0], bn[1]);
        i++; setTimeout(step, (R.big(e) ? 800 : R.gap || 250) / WATCH.speed); };
      WATCH.raf = requestAnimationFrame(tick);
    }
    function finish(){
      cancelAnimationFrame(WATCH.raf);
      if(WATCH.skip) for(const e of log.slice(i).filter(x => x.txt && R.big(x))){ const d = document.createElement('div'); d.className = 'big'; const h = R.hud(e, true, st); d.textContent = `${h.stamp || ''}${h.stamp ? ' · ' : ''}${e.txt}`; pbp.prepend(d); }
      setScore(res.sc); $('wq').textContent = 'FINAL'; $('wc').textContent = res.ot ? (R.otLabel || 'OT') : ''; $('wp0').style.visibility = $('wp1').style.visibility = 'hidden';
      ctx.clearRect(0, 0, W, Hh); R.bg(ctx, st); if(R.final) R.final(ctx, st);
      const me = o.userSide, won = me != null && res.sc[me] > res.sc[1 - me], tie = res.sc[0] === res.sc[1];
      banner(me == null ? 'Final' : tie ? 'Draw' : won ? 'Victory!' : 'Defeat', me == null || tie ? '#fff' : won ? '#38d98a' : '#ff5b6b'); $('wban').style.opacity = 1;
      $('wdd').textContent = 'Final' + (res.ot ? ` (${R.otLabel || 'OT'})` : '') + (o.after ? ` · ${o.after}` : '');
      const wctl = document.querySelector('.wctl'); wctl.innerHTML = `<button class="btn wide" id="wdone">Continue</button>`;
      $('wdone').onclick = () => { el.hidden = true; el.innerHTML = ''; document.body.style.overflow = ''; resolve(); };
    }
    ctx.clearRect(0, 0, W, Hh); R.bg(ctx, st); setTimeout(step, 400);
  });
}
// small drawing helpers shared by the renderers
function dotP(ctx, x, y, r, fill, stroke){ ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); if(stroke){ ctx.lineWidth = Math.max(1, r * .3); ctx.strokeStyle = stroke; ctx.stroke(); } }
const lerp2 = (a, b, t) => a + (b - a) * t;
const easeIO = t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
const CANVAS_FONT = w => `${w}px 'Barlow Condensed', 'Arial Narrow', sans-serif`;
