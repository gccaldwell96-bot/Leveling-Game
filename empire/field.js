'use strict';
// =====================================================================================
//  Football visuals: team helmets (SVG) and the live game viewer (canvas field, 11 v 11)
// =====================================================================================
function helmet(t, size = 40, flip = false){
  const c1 = t.c1, c2 = t.c2;
  return `<svg class="helm" width="${size}" height="${Math.round(size * .82)}" viewBox="0 0 64 52" aria-hidden="true" style="${flip ? 'transform:scaleX(-1)' : ''}">
    <path d="M8 30C8 12 22 4 36 4c14 0 22 10 22 22v6H46l-2 8-14 4C16 46 8 40 8 30z" fill="${c1}" stroke="#00000055" stroke-width="1.5"/>
    <path d="M18 8c10-4 24-4 33 3" stroke="${c2}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M44 30h15M46 36h13M58 25v15" stroke="#d6dbe6" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <circle cx="27" cy="27" r="3.2" fill="${c2}"/>
    <text x="22" y="22" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="11" fill="${c2}" ${flip ? 'transform="scale(-1,1) translate(-48,0)"' : ''}>${t.abbr}</text>
  </svg>`;
}
const ovrColor = o => o >= 85 ? '#38d98a' : o >= 75 ? '#b8e05a' : o >= 65 ? '#ffb81c' : o >= 55 ? '#ff9045' : '#ff5b6b';

// ---------------- live game viewer ----------------
const WATCH = {speed:1, skip:false, raf:0};
function watchGame(g, res){
  return new Promise(resolve => {
    const H = fbTeam(g.h), A = fbTeam(g.a), el = $('watch');
    const dc = (a, b) => { const d = hex2rgb(a).map((v, i) => Math.abs(v - hex2rgb(b)[i])).reduce((x, y) => x + y, 0); return d < 140 ? b === a ? a : null : a; };
    const awayCol = dc(A.c1, H.c1) ? A.c1 : A.c2; // keep the two teams visually distinct
    el.innerHTML = `<div class="bug"><div class="tm" style="background:${H.c1};color:${textOn(H.c1)}"><span class="poss" id="wp0"></span>${H.abbr}<span class="sc" id="ws0">0</span></div>
        <div class="mid"><span id="wq">Q1</span><span id="wc" class="num">15:00</span></div>
        <div class="tm" style="background:${awayCol};color:${textOn(awayCol)}"><span class="sc" id="ws1" style="margin:0 auto 0 0">0</span>${A.abbr}<span class="poss" id="wp1"></span></div></div>
      <div class="dd"><span id="wdd">Kickoff</span><span id="wtitle">${g.po ? FB_ROUND_NAMES[g.po] : `Week ${g.wk + 1}`}</span></div>
      <div style="position:relative"><canvas id="field"></canvas><div class="banner" id="wban" style="opacity:0;top:38%"></div></div>
      <div id="pbp" aria-live="polite"></div>
      <div class="wctl"><button class="btn ghost sm" id="wspd">Speed 1×</button><button class="btn ghost sm" id="wskip" style="flex:1">Skip to final ⏭</button></div>`;
    el.hidden = false; document.body.style.overflow = 'hidden';
    const cv = $('field'), ctx = cv.getContext('2d'), dpr = Math.min(3, window.devicePixelRatio || 1);
    const W = Math.min(560, window.innerWidth), Hh = Math.round(W * .52); cv.style.width = W + 'px'; cv.style.height = Hh + 'px'; cv.width = W * dpr; cv.height = Hh * dpr; ctx.scale(dpr, dpr);
    const sx = W / 120, sy = Hh / 53.3, X = yd => (10 + yd) * sx, Y = yd => yd * sy;
    const cols = [H.c1, awayCol], outl = [H.c2, A.c2];
    WATCH.skip = false; WATCH.speed = S.settings.speed || 1; $('wspd').textContent = `Speed ${WATCH.speed}×`;
    $('wspd').onclick = () => { WATCH.speed = WATCH.speed === 1 ? 2 : WATCH.speed === 2 ? 4 : 1; S.settings.speed = WATCH.speed; $('wspd').textContent = `Speed ${WATCH.speed}×`; };
    $('wskip').onclick = () => { WATCH.skip = true; };
    // ---- drawing ----
    function drawField(){
      for(let i = 0; i < 24; i++){ ctx.fillStyle = i % 2 ? '#2f8a3c' : '#2a7f37'; ctx.fillRect(X(i * 5 - 10), 0, 5 * sx, Hh); }
      ctx.fillStyle = H.c1; ctx.fillRect(0, 0, 10 * sx, Hh); ctx.fillStyle = awayCol; ctx.fillRect(X(100), 0, 10 * sx, Hh);
      ctx.save(); ctx.fillStyle = textOn(H.c1); ctx.font = `800 ${Math.round(sx * 6)}px 'Barlow Condensed', 'Arial Narrow', sans-serif`; ctx.textAlign = 'center'; ctx.translate(5 * sx, Hh / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(H.name.toUpperCase(), 0, sx * 2); ctx.restore();
      ctx.save(); ctx.fillStyle = textOn(awayCol); ctx.font = `800 ${Math.round(sx * 6)}px 'Barlow Condensed', 'Arial Narrow', sans-serif`; ctx.textAlign = 'center'; ctx.translate(X(105), Hh / 2); ctx.rotate(Math.PI / 2); ctx.fillText(A.name.toUpperCase(), 0, sx * 2); ctx.restore();
      ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = 1; for(let y = 0; y <= 100; y += 5){ ctx.beginPath(); ctx.moveTo(X(y), 0); ctx.lineTo(X(y), Hh); ctx.stroke(); }
      ctx.fillStyle = '#ffffffd0'; for(let y = 1; y < 100; y++){ if(y % 5) { ctx.fillRect(X(y), Y(22.9), 1, 3); ctx.fillRect(X(y), Y(30.4) - 3, 1, 3); ctx.fillRect(X(y), 1, 1, 3); ctx.fillRect(X(y), Hh - 4, 1, 3); } }
      ctx.font = `700 ${Math.round(sx * 3.4)}px 'Barlow Condensed', 'Arial Narrow', sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffffb0';
      for(let y = 10; y < 100; y += 10){ const n = y <= 50 ? y : 100 - y; ctx.fillText(n, X(y), Y(8)); ctx.fillText(n, X(y), Y(47.5)); }
      ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 2; for(const gx of [X(0) - 2, X(100) + 2]){ ctx.beginPath(); ctx.moveTo(gx, Y(23.6)); ctx.lineTo(gx, Y(29.7)); ctx.stroke(); }
    }
    function dot(x, y, side, r = 1.15){ ctx.beginPath(); ctx.arc(X(x), Y(y), r * sx, 0, Math.PI * 2); ctx.fillStyle = cols[side]; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = outl[side]; ctx.stroke(); }
    function ball(x, y, h = 0){ ctx.beginPath(); ctx.ellipse(X(x), Y(y) - h * sy, .75 * sx, .5 * sx, 0, 0, Math.PI * 2); ctx.fillStyle = '#7a3d14'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = .8; ctx.stroke(); }
    function lines(los, fd){ ctx.lineWidth = 2.2; ctx.strokeStyle = '#3d8bff'; ctx.beginPath(); ctx.moveTo(X(los), 0); ctx.lineTo(X(los), Hh); ctx.stroke(); if(fd != null && fd > 0 && fd < 100){ ctx.strokeStyle = '#ffe14a'; ctx.beginPath(); ctx.moveTo(X(fd), 0); ctx.lineTo(X(fd), Hh); ctx.stroke(); } }
    // formation offsets (yards behind the line for offence, ahead for defence)
    const OFF = [[-1, -4], [-1, -2], [-1, 0], [-1, 2], [-1, 4], [-1, 6.2], [-1.2, -18], [-1.2, 17], [-1.6, -11], [-4.5, 0], [-6.5, 1.2]]; // OL×5, TE, WR×3, QB, RB
    const DEF = [[1.3, -5], [1.3, -1.7], [1.3, 1.7], [1.3, 5], [5, -6], [5, 0], [5, 6], [6, -18], [6, 17], [6, -11], [12, -5]];
    const lerp = (a, b, t) => a + (b - a) * t, ease = t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    function frame(e, t){ // t: 0..1 progress through this play's animation
      ctx.clearRect(0, 0, W, Hh); drawField();
      const side = e.poss, dir = side === 0 ? 1 : -1, abs = yl => side === 0 ? yl : 100 - yl;
      const from = e.from != null ? e.from : e.yl, los = abs(from), fd = e.down ? abs(Math.min(100, from + e.togo)) : null;
      const kick = ['punt', 'fg', 'ko', 'xp'].includes(e.type);
      if(!kick) lines(los, e.type === 'pass' || e.type === 'run' || e.type === 'inc' || e.type === 'sack' ? fd : null);
      const yds = e.yds || 0, end = abs(from + (e.type === 'sack' ? yds : yds));
      const o = OFF.map(([dx, y]) => [los + dx * dir, 26.65 + y]), d = DEF.map(([dx, y]) => [los + dx * dir, 26.65 + y]);
      let bx = los, by = 26.65, bh = 0, carrier = null;
      const k = ease(Math.min(1, t));
      if(e.type === 'run' || (e.type === 'td' && e.run) || e.type === 'fum' || (e.type === 'safety' && e.run)){
        const tgt = e.type === 'fum' ? abs(from + 2) : end; carrier = 10; o[10] = [lerp(o[10][0], tgt, k), lerp(o[10][1], 26.65 + Math.sin(t * 5) * 2, k)]; [bx, by] = o[10];
        for(let i = 0; i < 11; i++) d[i] = [lerp(d[i][0], bx + dir * .8, k * .85), lerp(d[i][1], by, k * .7)];
        for(let i = 0; i < 5; i++) o[i][0] += dir * k * 1.5;
      } else if(['pass', 'inc', 'td', 'int', 'pick6'].includes(e.type)){
        const ri = e.pos === 'TE' ? 5 : e.pos === 'RB' ? 10 : e.pos === 'WR' ? [6, 7, 8][(e.who || 0) % 3] : 6;
        const air = e.type === 'pass' || e.type === 'td' ? Math.max(1, yds - 3) : (e.air || 12), catchX = los + dir * air;
        o[9] = [los - dir * lerp(4.5, 7, Math.min(1, t * 3)), 26.65];
        const ry = e.type === 'td' || e.type === 'pass' ? o[ri][1] * .6 + 26.65 * .4 : o[ri][1];
        o[ri] = [lerp(o[ri][0], (e.type === 'pass' || e.type === 'td') ? end : catchX, k), lerp(o[ri][1], ry, k)];
        if(t < .35){ [bx, by] = o[9]; }
        else if(t < .8){ const f = (t - .35) / .45; bx = lerp(o[9][0], catchX, f); by = lerp(26.65, o[ri][1], f); bh = Math.sin(f * Math.PI) * (3 + Math.abs(air) * .12); }
        else { if(e.type === 'inc'){ bx = catchX + dir * (t - .8) * 6; by = o[ri][1] + 1; bh = 0; } else if(e.type === 'int' || e.type === 'pick6'){ d[7] = [lerp(catchX, catchX - dir * 8, (t - .8) / .2), o[ri][1]]; [bx, by] = d[7]; } else { [bx, by] = o[ri]; } }
        for(let i = 7; i < 11; i++) d[i] = [lerp(d[i][0], o[ri][0] + dir, k * .8), lerp(d[i][1], o[ri][1], k * .6)];
        for(let i = 0; i < 4; i++) d[i] = [lerp(d[i][0], o[9][0] + dir, k * .55), lerp(d[i][1], 26.65 + (i - 1.5) * 1.6, k * .5)];
      } else if(e.type === 'sack' || (e.type === 'safety' && !e.run)){
        o[9] = [lerp(o[9][0], end, k), 26.65]; [bx, by] = o[9];
        for(let i = 0; i < 6; i++) d[i] = [lerp(d[i][0], bx + dir * .9, k), lerp(d[i][1], 26.65 + (i - 2.5) * .8, k)];
      } else if(kick){
        const start = e.type === 'ko' ? abs(35) : los - dir * (e.type === 'punt' ? 12 : 7);
        const land = e.type === 'fg' || e.type === 'xp' ? (side === 0 ? 100 : 0) + dir * 4 : e.type === 'punt' ? abs(from + (e.dist || 40)) : abs(100 - (e.yl || 25));
        bx = lerp(start, land, k); by = 26.65; bh = Math.sin(k * Math.PI) * (e.type === 'punt' ? 12 : 8);
        if(e.type === 'fg' && e.good === false) by += k * 5;
      }
      if(!kick) for(let i = 0; i < 11; i++) dot(d[i][0], d[i][1], 1 - side);
      if(!kick) for(let i = 0; i < 11; i++) dot(o[i][0], o[i][1], side, i === carrier ? 1.35 : 1.15);
      ball(bx, by, bh);
    }
    // ---- playback ----
    const log = res.log, pbp = $('pbp'), fmt = s => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;
    const big = e => ['td', 'int', 'pick6', 'fum', 'safety', 'downs'].includes(e.type) || (e.type === 'fg' && e.good) || (e.yds >= 25);
    function hud(e, after){
      const sc = after ? e.sc : (log[log.indexOf(e) - 1] || {sc:[0, 0]}).sc;
      $('ws0').textContent = sc[0]; $('ws1').textContent = sc[1];
      $('wq').textContent = e.q > 4 ? 'OT' : 'Q' + e.q; $('wc').textContent = fmt(e.clk);
      $('wp0').style.visibility = e.poss === 0 ? 'visible' : 'hidden'; $('wp1').style.visibility = e.poss === 1 ? 'visible' : 'hidden';
      const side = e.poss === 0 ? H : A, yl = !after && e.from != null ? e.from : e.yl, spot = yl <= 50 ? `own ${yl}` : `opp ${100 - yl}`; // log entries hold the spot after the play, the down before it
      $('wdd').textContent = e.down && !['ko', 'xp', 'qtr', 'half', 'ot', 'chg'].includes(e.type) ? `${side.abbr} · ${ord(e.down)} & ${yl + e.togo >= 100 ? 'goal' : e.togo} · ${spot}` : side.abbr + ' ball';
    }
    function banner(txt, col){ const b = $('wban'); b.textContent = txt; b.style.color = col; b.style.opacity = 1; setTimeout(() => { b.style.opacity = 0; }, 900 / WATCH.speed + 300); }
    let i = 0;
    function step(){
      if(i >= log.length || WATCH.skip){ finish(); return; }
      const e = log[i];
      if(!e.txt){ i++; step(); return; }
      hud(e, false);
      const animated = ['run', 'pass', 'inc', 'sack', 'int', 'pick6', 'td', 'fum', 'safety', 'punt', 'fg', 'ko', 'xp'].includes(e.type) && !(e.type === 'td' && !e.from && !e.run && !e.pos);
      const dur = animated ? 1050 / WATCH.speed : 350 / WATCH.speed, t0 = performance.now();
      const tickA = now => { if(WATCH.skip){ finish(); return; } const t = Math.min(1, (now - t0) / dur); if(animated) frame(e, t); else { ctx.clearRect(0, 0, W, Hh); drawField(); }
        if(t < 1){ WATCH.raf = requestAnimationFrame(tickA); return; }
        hud(e, true); const d = document.createElement('div'); d.textContent = `${e.q > 4 ? 'OT' : 'Q' + e.q} ${fmt(e.clk)} · ${e.txt}`; if(big(e)) d.className = 'big'; pbp.prepend(d);
        if(e.type === 'td' || e.type === 'pick6') banner('Touchdown!', e.type === 'pick6' ? cols[1 - e.poss] : cols[e.poss] === '#000000' ? '#fff' : '#fff');
        else if(e.type === 'int') banner('Intercepted!', '#fff'); else if(e.type === 'fum') banner('Fumble!', '#fff'); else if(e.type === 'safety') banner('Safety!', '#fff'); else if(e.type === 'fg' && e.good) banner('It\'s good!', '#ffe14a');
        i++; setTimeout(step, (big(e) ? 900 : 380) / WATCH.speed); };
      WATCH.raf = requestAnimationFrame(tickA);
    }
    function finish(){
      cancelAnimationFrame(WATCH.raf); const fin = log[log.length - 1] || {sc:res.sc};
      $('ws0').textContent = res.sc[0]; $('ws1').textContent = res.sc[1]; $('wq').textContent = 'FINAL'; $('wp0').style.visibility = $('wp1').style.visibility = 'hidden'; $('wc').textContent = res.ot ? 'OT' : '';
      ctx.clearRect(0, 0, W, Hh); drawField();
      const u = fb().user, mine = g.h === u ? 0 : 1, won = res.sc[mine] > res.sc[1 - mine], tie = res.sc[0] === res.sc[1];
      banner(tie ? 'Tie game' : won ? 'Victory!' : 'Defeat', won ? '#38d98a' : tie ? '#fff' : '#ff5b6b'); $('wban').style.opacity = 1;
      $('wdd').textContent = 'Final' + (res.ot ? ' (OT)' : '');
      const wctl = document.querySelector('.wctl'); wctl.innerHTML = `<button class="btn wide" id="wdone">Continue</button>`;
      $('wdone').onclick = () => { el.hidden = true; el.innerHTML = ''; document.body.style.overflow = ''; resolve(); };
      if(WATCH.skip){ for(const e of log.slice(i).filter(x => x.txt && big(x))){ const d = document.createElement('div'); d.className = 'big'; d.textContent = `${e.q > 4 ? 'OT' : 'Q' + e.q} ${fmt(e.clk)} · ${e.txt}`; pbp.prepend(d); } }
    }
    drawField(); setTimeout(step, 400);
  });
}
