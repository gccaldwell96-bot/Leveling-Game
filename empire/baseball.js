'use strict';
// =====================================================================================
//  BASEBALL: Diamond League · 30 teams in two leagues, 156 games (6 a week), 8-team postseason
//  Plate-appearance sim: nine-man lineup with a DH, five-man rotation, a bullpen with a closer,
//  base running, double plays, sac flies, extra innings (runner on 2nd in the regular season).
// =====================================================================================
const BS_FIELD = [['C', 1], ['1B', 1], ['2B', 1], ['3B', 1], ['SS', 1], ['OF', 3]];
const BS_PW = {C:.9, '1B':1.12, '2B':.9, '3B':1.04, SS:.86, OF:1.04}; // power by position (x the player's own pw)
const bsArm = p => p.pos === 'SP' || p.pos === 'RP';
const bsWall = a => 400 - 72 * Math.pow(Math.min(45, Math.abs(a)) / 45, 1.6); // fence distance (ft) by spray angle, 0 = dead centre
const bsField = (a, d) => d < 150 ? (a < -24 ? 'third' : a < -5 ? 'short' : a < 14 ? 'second' : 'first') : a < -26 ? 'left' : a < -9 ? 'left-center' : a < 9 ? 'center' : a < 26 ? 'right-center' : 'right';
const bsOn = b => { const on = [1, 2, 3].filter((k, i) => b[i]); return on.length === 3 ? 'Bases loaded' : !on.length ? 'Bases empty' : on.length === 1 ? `Runner on ${ord(on[0])}` : `Runners on ${on.map(ord).join(' & ')}`; };
const bsERA = s => s.ip ? s.er * 27 / s.ip : 0, bsIP = o => `${Math.floor(o / 3)}.${o % 3}`;
const bsAvg = (h, ab) => ab ? (h / ab).toFixed(3).replace(/^0/, '') : '-';
const bsOPS = s => { const pa = s.ab + s.bb + (s.hbp || 0) + (s.sf || 0); if(!pa || !s.ab) return 0; return (s.h + s.bb + (s.hbp || 0)) / pa + (s.h + s.d + 2 * s.t + 3 * s.hr) / s.ab; };

// league-wide talent gap between the best bats and the best arms, refreshed weekly, so ratings drift doesn't drift the stats
const BS_NORM = {k:null, off:3.2, hit:70};
function bsNorm(sp){ const L = S.sports && S.sports[sp]; if(!L) return BS_NORM; const k = L.season * 100 + L.wk; if(BS_NORM.k === k) return BS_NORM;
  const g = {}; for(const p of L.players){ if(p.tid < 0) continue; const t = g[p.tid] || (g[p.tid] = {h:[], s:[], r:[]}); (p.pos === 'SP' ? t.s : p.pos === 'RP' ? t.r : t.h).push(p.ovr); }
  const top = (a, n) => { a.sort((x, y) => y - x); a = a.slice(0, n); return a.reduce((s, v) => s + v, 0) / Math.max(1, a.length); };
  let gap = 0, hit = 0, n = 0; for(const id in g){ const t = g[id], h = top(t.h, 9); gap += h - top(t.s, 5) * .67 - top(t.r, 3) * .33; hit += h; n++; }
  if(n) Object.assign(BS_NORM, {k, off:gap / n, hit:hit / n}); return BS_NORM; }
function bsSim(H, A, ctx){
  const rec = ctx.record, po = ctx.po, box = {}, log = [], sc = [0, 0], NM = bsNorm(ctx.sp || 'baseball'), norm = NM.off;
  const Bh = p => box[p.id] || (box[p.id] = {ab:0, h:0, hr:0, rbi:0, r:0, bb:0, so:0, d:0, t:0, hbp:0, sf:0});
  const Bp = p => { const b = box[p.id] || (box[p.id] = {}); if(b.ip === undefined) Object.assign(b, {gs:0, w:0, l:0, sv:0, ip:0, er:0, k:0, pbb:0, ha:0}); return b; };
  const side = (T, si) => {
    const used = new Set(), bat = [], all = T.all, bats = all.filter(p => !bsArm(p)), take = p => { used.add(p.id); bat.push(p); };
    for(const [pos, n] of BS_FIELD){ let k = 0; for(const p of T.pos[pos] || []){ if(k >= n) break; if(!used.has(p.id)){ take(p); k++; } }
      for(; k < n; k++){ const p = bats.find(x => !used.has(x.id)); if(!p) break; take(p); } }
    for(const p of bats) if(bat.length < 9 && !used.has(p.id)) take(p); // the DH: best bat left on the bench
    for(const p of all) if(bat.length < 9 && !used.has(p.id)) take(p); // injury crisis: anybody
    bat.sort((a, b) => b.ovr - a.ovr); for(const p of bat) Bh(p);
    const sps = (T.pos.SP || []).filter(p => !used.has(p.id)), rot = T.t.rot = ((T.t.rot || 0) + 1) % 840, rn = Math.min(po ? 4 : 5, sps.length); // the top five rotate
    let sp = rn ? sps[rot % rn] : null, rps = (T.pos.RP || []).filter(p => !used.has(p.id)), ru = T.t.ru || [[], []];
    let pen = rps.filter(p => !(ru[0].includes(p.id) && (ru[1].includes(p.id) || Math.random() < .7))); // arms that worked yesterday (or two days running) get a rest
    if(pen.length < Math.min(3, rps.length)) pen = rps;
    pen = pen.concat(sps.slice(rn).filter(p => !ru[0].includes(p.id))); if(!pen.length) pen = sps.filter(p => p !== sp); // spare starters work long relief
    if(!sp){ sp = pen[0] || all[0]; pen = pen.filter(p => p !== sp); }
    return {T, bat, sp, pen, nx:0, apps:[], cur:null, gone:new Set(), coach:si ? ctx.coachA : ctx.coachH, m:bat.reduce((a, p) => a + p.ovr, 0) / Math.max(1, bat.length)};
  };
  const S2 = [side(H, 0), side(A, 1)], wP = [null, null], lP = [null, null];
  for(const d of [0, 1]) S2[d].dz = Math.exp(-.075 * clamp((S2[d].m - S2[1 - d].m) / 10, -1, 1)); // the better fielding side turns more balls in play into outs
  const nm = p => p.ln;
  let inn = 1, bs = 1, outs = 0, ru = [null, null, null], rp = [null, null, null], ue = [0, 0, 0], walk = false, hrPlay = false, runs = 0, scored = null, mv = null, hh = 0, hr0 = 0;
  const bring = (D, p, d) => { const ap = {p, b:Bp(p), outs:0, bf:0, r:0, lead:sc[d] - sc[1 - d], lim:p === D.sp ? 24.5 + (p.ovr - 66) * .3 + gauss() * 2.5 : p.pos === 'SP' ? 13 : 4 + Math.random() * 4.5}; if(p === D.sp) ap.b.gs = 1; D.apps.push(ap); D.cur = ap; D.gone.add(p.id); return ap; };
  for(const d of [0, 1]) bring(S2[d], S2[d].sp, d);
  const ev = e => { log.push({inn, top:bs === 1, side:bs, outs, bases:[ru[0] ? 1 : 0, ru[1] ? 1 : 0, ru[2] ? 1 : 0], sc:[...sc], ...e}); };
  const relieve = (D, d) => { // pick the next arm out of the bullpen
    const fresh = D.pen.filter(p => !D.gone.has(p.id)); if(!fresh.length) return false;
    const lead = sc[d] - sc[1 - d], role = p => D.pen.indexOf(p), arms = fresh.filter(p => p.pos === 'RP'), long = fresh.find(p => p.pos === 'SP');
    const setup = arms.filter(p => role(p) >= 1 && role(p) <= 2); let mid = fresh.filter(p => role(p) >= 3); if(mid.length < 3) mid = fresh.filter(p => role(p) >= 1);
    const p = inn >= 9 && lead >= 0 && lead <= 3 ? fresh[0] // the closer (or the best arm left)
      : inn >= 7 && lead >= -1 && lead <= 3 && setup.length ? setup[0]
      : inn <= 5 && long ? long // the starter got knocked out early
      : mid.length ? pick(mid) : fresh[fresh.length - 1];
    bring(D, p, d); if(rec) ev({type:'pc', o0:outs, pre:[ru[0] ? 1 : 0, ru[1] ? 1 : 0, ru[2] ? 1 : 0], txt:`Pitching change: ${lgName(p)} takes the mound for the ${D.T.t.name}.`}); return true; };
  const run = (rn, rap, une, rbi, hb) => { // one runner crosses the plate
    if(walk && !hrPlay) return; // a walk-off single only needs the winning run
    sc[bs]++; runs++; Bh(rn).r++; if(rbi) hb.rbi++; if(rap){ rap.r++; if(!une && Math.random() > .07) rap.b.er++; } if(scored) scored.push(nm(rn));
    if(sc[bs] === sc[1 - bs] + 1){ wP[bs] = S2[bs].cur; lP[1 - bs] = rap || S2[1 - bs].cur; } // took the lead
    if(bs === 0 && inn >= 9 && sc[0] > sc[1]) walk = true;
  };
  const adv = (t1, t2, t3, bt, b, ap, rbi, hb) => { // where the runners on 1st, 2nd, 3rd and the batter end up (0 out, 4 home)
    const nr = [null, null, null], np = [null, null, null], nu = [0, 0, 0], to = [t1, t2, t3], r0 = ru, p0 = rp, u0 = ue;
    for(let i = 2; i >= 0; i--){ const rn = r0[i]; if(!rn) continue; const d = to[i]; if(mv) mv.push([i + 1, d]);
      if(d === 4) run(rn, p0[i], u0[i], rbi, hb); else if(d > 0){ nr[d - 1] = rn; np[d - 1] = p0[i]; nu[d - 1] = u0[i]; } }
    if(mv) mv.push([0, bt]);
    if(bt === 4) run(b, ap, 0, rbi, hb); else if(bt > 0){ nr[bt - 1] = b; np[bt - 1] = ap; }
    ru = nr; rp = np; ue = nu; };
  const out = (ap, n) => { outs += n; ap.outs += n; ap.b.ip += n; };
  const pa = () => {
    const O = S2[bs], D = S2[1 - bs], ap = D.cur, pit = ap.p, b = O.bat[O.nx], hb = box[b.id]; O.nx = (O.nx + 1) % O.bat.length; ap.bf++;
    const eff = pit.ovr - Math.min(12, Math.max(0, ap.bf - ap.lim) * 1.7), x0 = (b.ovr - eff - norm) / 10 + (bs === 0 ? .05 : -.05) + (O.coach - D.coach) / 220, x = 1.35 * x0 / (1 + Math.abs(x0) * .45), pw = (b.pw || 1) * (BS_PW[b.pos] || .6);
    const pk = .218 * Math.exp(-.23 * x), pbb = .083 * Math.exp(-.14 * x), phr = .0295 * Math.exp(.36 * x) * pw, p2 = .044 * Math.exp(.17 * x) * D.dz, p3 = .0045 * Math.exp(.12 * x) * D.dz, p1 = .143 * Math.exp(.15 * x) * (1.15 - .15 * pw) * D.dz;
    const o0 = outs, pre = rec ? [ru[0] ? 1 : 0, ru[1] ? 1 : 0, ru[2] ? 1 : 0] : null, on1 = !!ru[0], on2 = !!ru[1], on3 = !!ru[2];
    runs = 0; hrPlay = false; scored = rec ? [] : null; mv = rec ? [] : null;
    let r = Math.random(), type, txt = '', dir = 0, dist = 0, gb = false, hit = 0;
    const R = Math.random;
    if(r < pk){ type = 'k'; hb.ab++; hb.so++; ap.b.k++; out(ap, 1); if(rec){ mv.push(...[0, 1, 2].filter(i => ru[i]).map(i => [i + 1, i + 1]), [0, 0]); txt = `${nm(b)} strikes out ${R() < .27 ? 'looking' : 'swinging'}.`; } }
    else if((r -= pk) < pbb + .0095){ type = 'bb'; const hbp = r >= pbb; if(hbp) hb.hbp++; else { hb.bb++; ap.b.pbb++; }
      adv(2, on1 ? 3 : 2, on1 && on2 ? 4 : 3, 1, b, ap, true, hb); if(rec) txt = hbp ? `${nm(b)} is hit by a pitch.` : on1 && on2 && on3 ? `${nm(b)} walks with the bases loaded!` : `${nm(b)} draws a walk.`; }
    else if((r -= pbb + .0095) < p1 + p2 + p3 + phr){ hit = 1; hb.ab++; hb.h++; ap.b.ha++;
      if(r < phr){ type = 'hr'; hb.hr++; hrPlay = true; adv(4, 4, 4, 4, b, ap, true, hb); if(rec){ dir = rand(-42, 42); dist = bsWall(dir) + rand(12, 55); } }
      else if((r -= phr) < p2){ type = '2b'; hb.d++; adv(R() < (o0 === 2 ? .62 : .42) ? 4 : 3, 4, 4, 2, b, ap, true, hb); if(rec){ dir = pick([-37, -22, 21, 36]) + rand(-6, 6); dist = rand(255, 320); } }
      else if((r -= p2) < p3){ type = '3b'; hb.t++; adv(4, 4, 4, 3, b, ap, true, hb); if(rec){ dir = pick([-38, -16, 16, 38]) + rand(-5, 5); dist = rand(330, 375); } }
      else { type = '1b'; const t2 = R() < (o0 === 2 ? .8 : .58) ? 4 : 3, t1 = (!on2 || t2 === 4) && R() < (o0 === 2 ? .4 : .27) ? 3 : 2; adv(t1, t2, 4, 1, b, ap, true, hb);
        if(rec){ gb = R() < .45; dir = gb ? pick([-30, -12, 10, 28]) + rand(-5, 5) : rand(-40, 40); dist = gb ? rand(150, 200) : rand(165, 235); } } }
    else { // ball in play, out
      const k = R(); r = R();
      if(k < .46){ gb = true; if(rec){ dir = rand(-40, 40); dist = rand(95, 135); }
        if(on1 && o0 < 2 && r < .42){ type = 'dp'; hb.ab++; out(ap, 2); if(outs < 3) adv(0, 3, 4, 0, b, ap, false, hb); else if(mv) mv.push([1, 0], [0, 0]);
          if(rec){ dir = rand(-22, 24); txt = `${nm(b)} grounds into a double play.`; } }
        else if(on1 && o0 < 2 && r < .6){ type = 'out'; hb.ab++; out(ap, 1); const t3 = R() < .45 ? 4 : 3, t2 = !on3 || t3 === 4 ? 3 : 2; adv(0, t2, t3, 1, b, ap, true, hb); if(rec) txt = `${nm(b)} reaches on a fielder's choice; the lead runner is out at second.`; }
        else { type = 'out'; hb.ab++; out(ap, 1); if(outs < 3){ const t3 = R() < .48 ? 4 : 3, t2 = !on3 || t3 === 4 ? 3 : 2, t1 = !on2 || t2 === 3 ? 2 : 1; adv(t1, t2, t3, 0, b, ap, true, hb); } else if(mv) mv.push([0, 0]);
          if(rec) txt = `${nm(b)} grounds out to ${bsField(dir, dist)}.`; } }
      else if(k < .82){ type = 'out'; out(ap, 1); if(rec){ dir = rand(-42, 42); dist = rand(220, Math.min(345, bsWall(dir) - 12)); }
        const sf = on3 && o0 < 2 && R() < .62; if(sf){ hb.sf++; const t2 = R() < .3 ? 3 : 2; adv(1, t2, 4, 0, b, ap, true, hb); } else { hb.ab++; if(outs < 3){ const t2 = !on3 && on2 && o0 < 2 && R() < .3 ? 3 : 2; adv(1, t2, 3, 0, b, ap, true, hb); } else if(mv) mv.push([0, 0]); }
        if(rec) txt = sf ? `${nm(b)} lifts a sacrifice fly to ${bsField(dir, dist)}.` : `${nm(b)} flies out to ${bsField(dir, dist)}.`; }
      else { type = 'out'; hb.ab++; out(ap, 1); if(outs < 3) adv(1, 2, 3, 0, b, ap, true, hb); else if(mv) mv.push([0, 0]); const pop = k > .93;
        if(rec){ dir = rand(-40, 40); dist = pop ? rand(45, 140) : rand(120, 260); txt = pop ? `${nm(b)} pops out to ${dist < 75 ? 'the catcher' : bsField(dir, dist)}.` : `${nm(b)} lines out to ${bsField(dir, dist)}.`; } }
    }
    if(hit && rec){ const f = bsField(dir, Math.max(dist, 160));
      txt = type === 'hr' ? (runs === 4 ? `GRAND SLAM! ${nm(b)} clears the bases with a blast to ${f}!` : `${nm(b)} homers to ${f}!${runs > 1 ? ` ${runs} runs score.` : ''}`) : `${nm(b)} ${type === '1b' ? 'singles' : type === '2b' ? 'doubles' : 'triples'} to ${f}.`; }
    if(rec){ if(type !== 'hr' && scored.length) txt += scored.length === 1 ? ` ${scored[0]} scores.` : scored.length === 2 ? ` ${scored[0]} and ${scored[1]} score.` : ` ${scored.length} runs score.`;
      if(walk) txt += ` ${O.T.t.name} win it!`;
      ev({type, o0, pre, outs:Math.min(3, outs), txt, dir, dist, gb, mv, runs, wo:walk, hi:type === 'k' && outs >= 3 && (pre[1] || pre[2] || inn >= 9)}); }
    hh += hit; hr0 += runs;
  };
  for(;; inn++){
    for(let h = 0; h < 2; h++){
      bs = h ? 0 : 1; if(h && inn >= 9 && sc[0] > sc[1]) break; // the home side doesn't need its last at-bat
      const O = S2[bs], D = S2[1 - bs], d = 1 - bs, ap = D.cur;
      outs = 0; ru = [null, null, null]; rp = [null, null, null]; ue = [0, 0, 0]; hh = 0; hr0 = 0;
      if(inn > 1){ const st = ap.p === D.sp && D.apps.length === 1; if(st ? ap.bf >= ap.lim || ap.r >= 5 || (inn >= 8 && ap.r >= 3) || inn >= 10 : ap.outs >= 2 && (ap.bf + 4 > ap.lim || (inn >= 8 && Math.abs(sc[0] - sc[1]) <= 3))) relieve(D, d); }
      if(inn >= 10 && (!po || inn >= 14)){ ru[1] = O.bat[(O.nx + O.bat.length - 1) % O.bat.length]; rp[1] = D.cur; ue[1] = 1; } // automatic runner on second
      while(outs < 3 && !walk){ const c = D.cur; if(c.r >= (c.p === D.sp && D.apps.length === 1 ? 6 : 4) || c.bf >= c.lim + 7) relieve(D, d); pa(); }
      if(rec){ const fin = walk || (inn >= 9 && (h ? sc[0] !== sc[1] : sc[0] > sc[1])), rh = hr0 ? ` ${hr0} run${hr0 > 1 ? 's' : ''} on ${hh} hit${hh === 1 ? '' : 's'}.` : '';
        ru = [null, null, null]; ev({type:'end', o0:outs, pre:[0, 0, 0], outs:Math.min(3, outs), fin, txt:walk ? `Walk-off! The ${O.T.t.name} win it in the ${ord(inn)}!` : fin ? `That's the ballgame! The ${(sc[0] > sc[1] ? H : A).t.name} win.` : `${h ? 'End' : 'Middle'} of the ${ord(inn)}.${rh}`}); }
      if(walk) break;
    }
    if(walk || (inn >= 9 && sc[0] !== sc[1])) break;
  }
  for(const D of S2){ const ru = D.T.t.ru || [[], []]; D.T.t.ru = [D.apps.slice(1).map(a => a.p.id), ru[0]]; } // bullpen workload carries over
  // decisions: win, loss, save
  const w = sc[0] > sc[1] ? 0 : 1, W = S2[w];
  let wap = wP[w]; if(wap === W.apps[0] && wap.outs < 15 && W.apps.length > 1) wap = W.apps.slice(1).reduce((a, x) => x.outs > a.outs ? x : a);
  wap.b.w = 1; lP[1 - w].b.l = 1;
  const fin = W.apps[W.apps.length - 1]; if(fin !== wap && fin !== W.apps[0] && fin.outs >= 1 && fin.lead >= 1 && (fin.lead <= 3 || fin.outs >= 9)) fin.b.sv = 1;
  return {sc, ot:inn > 9, log, box, inn};
}

// ---------------- the ballpark ----------------
const BS_D2R = Math.PI / 180, BS_BASE = [[-4, 0], [63.6, 63.6], [0, 127.3], [-63.6, 63.6], [0, 0]];
const BS_SPOT = [[0, 58], [0, -9], [70, 92], [32, 146], [-70, 92], [-34, 142], [-150, 250], [0, 300], [150, 250]]; // P C 1B 2B 3B SS LF CF RF
const bsPt = (a, r) => [r * Math.sin(a * BS_D2R), r * Math.cos(a * BS_D2R)];
function bsMap(st){ if(st.bsm) return st.bsm; const s = Math.min(st.W / 520, st.H / 448), ox = st.W / 2, oy = st.H - (st.H - 440 * s) / 2 - 24 * s; return (st.bsm = {s, X:x => ox + x * s, Y:y => oy - y * s}); }
function bsPath(ctx, m, pts){ ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(m.X(x), m.Y(y)) : ctx.moveTo(m.X(x), m.Y(y))); ctx.closePath(); }
function bsDrawPark(ctx, st){
  const m = bsMap(st), {X, Y, s} = m, W = st.W, H = st.H, wall = []; for(let a = -45; a <= 45; a += 3) wall.push(bsPt(a, bsWall(a)));
  ctx.fillStyle = '#161d29'; ctx.fillRect(0, 0, W, H);
  for(let i = 0; i < 260; i++){ const a = -64 + ((i * 37) % 128), r = bsWall(a) + 16 + ((i * 53) % 97); const [x, y] = bsPt(a, r); ctx.fillStyle = ['#36415a', '#4a5772', '#5d6b85', '#2a3346', '#c9ced8', st.cols[0]][(i * 7) % 6]; ctx.fillRect(X(x), Y(y), 2.2, 2.2); }
  const pl = bsPt(-45, bsWall(45)), pr = bsPt(45, bsWall(45));
  bsPath(ctx, m, [[pl[0] - 26, pl[1] - 26], [-30, -24], [0, -46], [30, -24], [pr[0] + 26, pr[1] - 26], pr, ...wall.slice().reverse(), pl]); ctx.fillStyle = '#2b6634'; ctx.fill();
  ctx.save(); bsPath(ctx, m, [[0, 0], ...wall]); ctx.clip();
  for(let k = 15; k > 0; k--){ ctx.beginPath(); ctx.arc(X(0), Y(0), k * 28 * s, 0, Math.PI * 2); ctx.fillStyle = k % 2 ? '#3e8c45' : '#46974c'; ctx.fill(); }
  ctx.beginPath(); wall.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))); ctx.strokeStyle = '#a97a52'; ctx.lineWidth = 24 * s; ctx.stroke();
  ctx.font = CANVAS_FONT(800 + ' ' + Math.round(38 * s)); ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff1c'; ctx.fillText(st.home.abbr, X(0), Y(222)); ctx.restore();
  ctx.beginPath(); wall.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))); ctx.strokeStyle = '#0e3a22'; ctx.lineWidth = Math.max(3, 6 * s); ctx.stroke(); ctx.strokeStyle = '#e8c547'; ctx.lineWidth = 1; ctx.stroke();
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; for(const p of [pl, pr]){ ctx.beginPath(); ctx.moveTo(X(p[0]), Y(p[1])); ctx.lineTo(X(p[0]), Y(p[1]) - 16 * s); ctx.stroke(); }
  const arc = []; for(let a = 0; a <= 24; a++){ const th = (161.8 - a * 143.6 / 24) * BS_D2R; arc.push([95 * Math.cos(th), 60.5 + 95 * Math.sin(th)]); } // infield dirt: the 95 ft arc around the mound
  bsPath(ctx, m, [[0, 0], ...arc]); ctx.fillStyle = '#b8875c'; ctx.fill();
  bsPath(ctx, m, [[0, 10], [54, 63.6], [0, 117], [-54, 63.6]]); ctx.fillStyle = '#43924a'; ctx.fill();
  dotP(ctx, X(0), Y(0), 13 * s, '#b8875c'); dotP(ctx, X(0), Y(60.5), 9 * s, '#c29165'); ctx.fillStyle = '#fff'; ctx.fillRect(X(0) - 3 * s, Y(60.5) - .8, 6 * s, 1.6);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(X(pl[0]), Y(pl[1])); ctx.lineTo(X(0), Y(0)); ctx.lineTo(X(pr[0]), Y(pr[1])); ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeRect(X(-7), Y(3), 4 * s, 6 * s); ctx.strokeRect(X(3), Y(3), 4 * s, 6 * s);
  const bz = Math.max(3.5, 4.5 * s); ctx.fillStyle = '#fff'; for(const [x, y] of BS_BASE.slice(1, 4)){ ctx.save(); ctx.translate(X(x), Y(y)); ctx.rotate(Math.PI / 4); ctx.fillRect(-bz / 2, -bz / 2, bz, bz); ctx.restore(); }
  ctx.beginPath(); ctx.moveTo(X(0) - bz * .6, Y(0) - bz * .3); ctx.lineTo(X(0) + bz * .6, Y(0) - bz * .3); ctx.lineTo(X(0) + bz * .6, Y(0) + bz * .2); ctx.lineTo(X(0), Y(0) + bz * .7); ctx.lineTo(X(0) - bz * .6, Y(0) + bz * .2); ctx.fill();
}
const BS_RENDER = {
  aspect:.8, otLabel:'Extras', startPer:'▲1', startClk:'0 out', startDd:'Play ball!', gap:120,
  dur:e => e.type === 'end' ? 420 : e.type === 'pc' ? 520 : e.type === 'k' || e.type === 'bb' ? 560 : e.type === 'hr' ? 1250 : 900,
  hud(e, after, st){ const per = (e.top ? '▲' : '▼') + e.inn, o = after ? e.outs : e.o0;
    return {per, clk:`${o} out`, dd:e.type === 'end' && after ? (e.fin ? 'Final' : `${e.top ? 'Middle' : 'End'} of the ${ord(e.inn)}`) : bsOn(after ? e.bases : e.pre), stamp:per}; },
  big:e => e.type === 'hr' || e.runs > 0 || (e.type === 'end' && e.fin),
  banner(e){ if(e.wo) return [e.type === 'hr' ? 'WALK-OFF HOMER!' : 'WALK-OFF!', '#38d98a']; if(e.type === 'hr') return [e.runs === 4 ? 'GRAND SLAM!' : 'HOME RUN!', '#ffe14a']; if(e.type === 'k' && e.hi) return ['K', '#fff']; if(e.type === 'dp' && e.pre && (e.pre[1] || e.pre[2])) return ['Double play!', '#fff']; return null; },
  bg(ctx, st){ // the park is drawn once to an offscreen canvas, then blitted every frame
    if(st.bsbg === undefined){ st.bsbg = null; try{ const dpr = ctx.getTransform ? ctx.getTransform().a : 1, c = document.createElement('canvas'); c.width = Math.round(st.W * dpr); c.height = Math.round(st.H * dpr); const x = c.getContext('2d'); x.scale(dpr, dpr); bsDrawPark(x, st); st.bsbg = c; } catch(err){ st.bsbg = null; } }
    if(st.bsbg) ctx.drawImage(st.bsbg, 0, 0, st.W, st.H); else bsDrawPark(ctx, st); },
  frame(ctx, e, t, st){
    const m = bsMap(st), {X, Y, s} = m, W = st.W, H = st.H, off = e.side, def = 1 - off, r = Math.max(4, Math.min(7, 6.5 * s));
    const label = txt => { ctx.fillStyle = '#000a'; ctx.fillRect(0, H * .4, W, H * .17); ctx.fillStyle = '#fff'; ctx.font = CANVAS_FONT('700 ' + Math.round(H * .085)); ctx.textAlign = 'center'; ctx.fillText(txt, W / 2, H * .515); };
    if(e.type === 'end'){ label(e.fin ? 'Ballgame!' : `${e.top ? 'Middle' : 'End'} of the ${ord(e.inn)}`); return; }
    const land = bsPt(e.dir || 0, e.dist || 0), inPlay = e.dist > 0, tb = clamp((t - .22) / .5, 0, 1);
    if(inPlay && e._f == null){ let best = 0, bd = 1e9; BS_SPOT.forEach(([x, y], i) => { if(i === 1 && e.dist > 50) return; const dd = (x - land[0]) ** 2 + (y - land[1]) ** 2; if(dd < bd){ bd = dd; best = i; } }); e._f = best; }
    const fl = BS_SPOT.map(p => [...p]), out = e.type === 'out' || e.type === 'dp';
    if(inPlay && e.type !== 'hr'){ const f = e._f, k = easeIO(Math.min(1, tb * (out ? 1 : 1.1))) * (out ? 1 : .8); fl[f] = [lerp2(BS_SPOT[f][0], land[0], k), lerp2(BS_SPOT[f][1], land[1], k)]; }
    for(const [x, y] of fl) dotP(ctx, X(x), Y(y), r, st.cols[def], st.outl[def]);
    // runners (and the batter) move along the base paths
    const rt = easeIO(clamp((t - .25) / .7, 0, 1));
    const mv = e.mv || [1, 2, 3].filter(k => e.bases[k - 1]).map(k => [k, k]);
    for(const [a, b] of mv){ const dest = b === 0 ? a + (e.type === 'k' ? 0 : 1) : b, f = a === dest ? 0 : rt * (b === 0 ? .8 : 1), seg = (dest - a) * f, i = Math.min(dest - 1, a + Math.floor(seg)), fr = seg - Math.floor(seg);
      const P = f <= 0 ? BS_BASE[a] : f >= 1 ? BS_BASE[dest] : [lerp2(BS_BASE[i][0], BS_BASE[i + 1][0], fr), lerp2(BS_BASE[i][1], BS_BASE[i + 1][1], fr)];
      ctx.globalAlpha = b === 0 ? clamp(1 - (t - .55) * 2.5, 0, 1) : b === 4 ? clamp(1 - (t - .85) * 6, 0, 1) : 1;
      dotP(ctx, X(P[0]), Y(P[1]), r * (a === 0 ? 1.1 : 1), st.cols[off], st.outl[off]); ctx.globalAlpha = 1; }
    if(e.type === 'pc'){ label('Pitching change'); return; }
    // the pitch, then the ball in play
    const ball = (x, y, h) => { if(h > 0){ ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.ellipse(X(x), Y(y), r * .55, r * .3, 0, 0, Math.PI * 2); ctx.fill(); } dotP(ctx, X(x), Y(y) - h * s * .5, Math.max(2.4, r * .45), '#fff', '#888'); };
    if(t < .22){ const f = t / .22; ball(lerp2(0, e.type === 'bb' ? 6 : 0, f), lerp2(56, 1, f), 3 * Math.sin(f * Math.PI)); }
    else if(!inPlay){ if(e.type === 'k'){ ball(0, -8, 0); ctx.font = CANVAS_FONT('800 ' + Math.round(26 * s + 8)); ctx.textAlign = 'center'; ctx.fillStyle = '#ffe14a'; ctx.globalAlpha = clamp((t - .25) * 4, 0, 1); ctx.fillText('K', X(18), Y(18)); ctx.globalAlpha = 1; } else ball(0, -8, 0); }
    else {
      const air = !e.gb && e.type !== 'dp' && !(e.type === 'out' && e.dist < 140 && e.dist > 90), apex = e.type === 'hr' ? 150 : air ? e.dist * .32 : 0;
      if(tb < 1){ const h = apex * 4 * tb * (1 - tb); if(e.type !== 'hr' || tb < .98) ball(lerp2(0, land[0], tb), lerp2(2, land[1], tb), h); }
      else if(e.type === 'hr'){ if(t < .92){ ctx.globalAlpha = clamp(1 - (t - .72) * 5, 0, 1); dotP(ctx, X(land[0]), Y(land[1]), r * (1 + (t - .72) * 10), '#ffe14a66'); ctx.globalAlpha = 1; } }
      else if(e.type === 'out' && e.gb && t < .92){ const f = clamp((t - .72) / .2, 0, 1); ball(lerp2(land[0], BS_BASE[1][0], f), lerp2(land[1], BS_BASE[1][1], f), 0); }
      else if(e.type === 'dp'){ const tg = [[4, 127], [63.6, 63.6]], k = clamp((t - .72) / .26, 0, 1), leg = k < .5 ? 0 : 1, f = (k - leg * .5) * 2, from = leg ? tg[0] : land; ball(lerp2(from[0], tg[leg][0], f), lerp2(from[1], tg[leg][1], f), 0); }
      else ball(land[0], land[1], 0);
    }
  },
};

// ---------------- the league config ----------------
LG.baseball = {
  id:'baseball', start:13, seasonWord:'season', gameWord:'game', venue:'Ballpark', coachWord:'manager', crest:'round', starterWord:'Starter', pfWord:'Runs', pfShort:'RD',
  teams:[['New Harbor', 'Anchors', 'NHA', '#0c2340', '#c4ced4', 5], ['Kingsbridge', 'Monarchs', 'KNG', '#4b2e83', '#f2c75c', 5], ['Port Avalon', 'Clippers', 'PAV', '#00594f', '#f4e9cd', 4], ['Ashford', 'Foxes', 'ASH', '#c8102e', '#ffffff', 3], ['Brookhaven', 'Herons', 'BRK', '#5bc2e7', '#13294b', 3],
    ['Granite Falls', 'Ironmen', 'GRF', '#3d3d3d', '#e35205', 2], ['Elm City', 'Lanterns', 'ELM', '#ffb81c', '#1b365d', 4], ['Riverton', 'Rivermen', 'RIV', '#00843d', '#ffcd00', 2], ['Fairhaven', 'Gulls', 'FHV', '#0072ce', '#ffffff', 3], ['Lakeport', 'Pilots', 'LKP', '#8a1538', '#d6a461', 3],
    ['Capital City', 'Sentinels', 'CAP', '#002d72', '#d50032', 5], ['Millbrook', 'Owls', 'MLB', '#5f259f', '#b9b9b9', 1], ['Salt Harbor', 'Pelicans', 'SLT', '#e87722', '#003a70', 2], ['Ironvale', 'Forge', 'IRV', '#2d2926', '#c99700', 2], ['Bayview', 'Sharks', 'BAY', '#00a3ad', '#1d252d', 4],
    ['Sierra Vista', 'Condors', 'SVC', '#a6192e', '#ffc72c', 4], ['Redwood Bay', 'Sea Lions', 'RWB', '#004c45', '#c8a27a', 3], ['Mesa Grande', 'Roadrunners', 'MES', '#b24c1e', '#f1e6b2', 3], ['Copper Canyon', 'Prospectors', 'COP', '#b87333', '#1f2a44', 2], ['Silver Lake', 'Sundogs', 'SLK', '#f0b323', '#4a2c6d', 3],
    ['Pinecrest', 'Grizzlies', 'PIN', '#154734', '#ffb612', 2], ['Sunvale', 'Surfers', 'SUN', '#ff6f3c', '#00807a', 4], ['Bellmont', 'Thunderbirds', 'BEL', '#1e3a8a', '#f5f5f5', 5], ['Starlight City', 'Comets', 'STC', '#111827', '#e5b80b', 5], ['Cascadia', 'Lumberjacks', 'CAS', '#2f5d3a', '#e8dcc0', 3],
    ['Desert Springs', 'Rattlers', 'DSR', '#c2410c', '#1c1917', 2], ['Tidewater', 'Orcas', 'TDW', '#0f172a', '#38bdf8', 3], ['Monte Rosa', 'Mustangs', 'MRO', '#9f1239', '#fde68a', 2], ['Bonanza City', 'High Rollers', 'BON', '#1a1a1a', '#c4a24a', 4], ['Crescent Bay', 'Firebirds', 'CRB', '#dc2626', '#1e293b', 3]],
  confs:['Atlantic League', 'Pacific League'],
  pos:{SP:[5, 5], RP:[6, 4], C:[2, 1], '1B':[2, 1], '2B':[2, 1], '3B':[2, 1], SS:[2, 1], OF:[5, 3]},
  posNames:{SP:'Starting pitchers', RP:'Relief pitchers', C:'Catchers', '1B':'First basemen', '2B':'Second basemen', '3B':'Third basemen', SS:'Shortstops', OF:'Outfielders'},
  posSal:{SP:1.2, RP:.6, C:.9, '1B':1, '2B':.95, '3B':1, SS:1.05, OF:1},
  rosterMax:26, ages:[20, 40], peak:28, draftRounds:3, injRate:.0015, injPool:14, hypeMul:.2, awardMinGP:25,
  reg:{weeks:26, gpw:6}, po:{teams:8, byConf:true, bestOf:[5, 7, 7], name:'postseason', rounds:['Division Series', 'League Championship', 'Diamond Series']}, champName:'Diamond Series',
  money:{cap:190, maxSal:35, minSal:.7, tv:160, merch:35, ticket:42, seats:[33000, 48000], seatStep:2000, staff:.07, ops:40, arenaUp:110},
  extra(p){ if(!bsArm(p)) p.pw = Math.round(clamp(1 + gauss() * .2, .6, 1.45) * 100) / 100; }, // raw power, separate from the overall rating
  stats:[['ab', 'AB'], ['h', 'H'], ['hr', 'HR'], ['rbi', 'RBI'], ['r', 'R'], ['bb', 'BB'], ['so', 'SO'], ['d', '2B'], ['t', '3B'], ['gs', 'GS'], ['w', 'W'], ['l', 'L'], ['sv', 'SV'], ['ip', 'IP'], ['er', 'ER'], ['k', 'K'], ['pbb', 'BBA'], ['ha', 'HA']],
  hiddenStats:['hbp', 'sf'],
  statLine(s, p){ const era = s.ip ? bsERA(s).toFixed(2) : '-';
    if(p && p.pos === 'RP') return [['G', s.gp], ['SV', s.sv], ['ERA', era], ['K', s.k], ['W-L', `${s.w}-${s.l}`]];
    if(p && p.pos === 'SP') return [['G', s.gp], ['W-L', `${s.w}-${s.l}`], ['ERA', era], ['IP', bsIP(s.ip)], ['K', s.k]];
    const ops = bsOPS(s); return [['G', s.gp], ['AVG', bsAvg(s.h, s.ab)], ['HR', s.hr], ['RBI', s.rbi], ['OPS', s.ab ? ops.toFixed(3).replace(/^0/, '') : '-']]; },
  // a display function that returns an object sorts by valueOf and prints via toString, so the lowest ERA ranks first
  leaders:[['hr', 'Home runs', false], ['rbi', 'Runs batted in', false], ['h', 'Batting average', p => bsAvg(p.st.h, p.st.ab), p => p.st.ab >= 300], ['k', 'Strikeouts', false],
    ['er', 'Earned run average', p => { const e = bsERA(p.st); return {valueOf:() => -e, toString:() => e.toFixed(2)}; }, p => p.st.ip >= 300], ['w', 'Wins', false], ['sv', 'Saves', false]],
  records:[['hr', 'Home runs in a season'], ['rbi', 'RBI in a season'], ['h', 'Hits in a season'], ['k', 'Strikeouts in a season'], ['w', 'Wins in a season'], ['sv', 'Saves in a season']],
  awards:[
    {k:'mvp', n:'MVP', pos:['C', '1B', '2B', '3B', 'SS', 'OF'], score:(p, t) => p.st.ab < 350 ? -1e3 + p.st.ab : bsOPS(p.st) * 110 + p.st.hr * .3 + p.st.rbi * .1 + p.st.r * .06 + ({C:5, SS:5, '2B':3, '3B':2, OF:1}[p.pos] || 0) + lgPct(t) * 20},
    {k:'cy', n:'Cy Young', pos:['SP', 'RP'], score:p => { const s = p.st, ip = s.ip / 3; if(ip < 60) return -1e3 + ip; return s.w * 2.2 - s.l * .6 + s.k * .06 + ip * .12 + s.sv * .4 - bsERA(s) * 14; }},
    {k:'roy', n:'Rookie of the Year', score:p => { const s = p.st; if(bsArm(p)){ const ip = s.ip / 3; return ip * .08 + s.w * .8 + s.sv * .3 + (4.4 - bsERA(s)) * ip / 25; } return (bsOPS(s) - .65) * (s.ab + s.bb) / 6 + s.hr * .35 + s.ab / 45; }},
  ],
  hofProd:c => c.hr / 9 + c.h / 120 + c.rbi / 250 + c.w / 4 + c.k / 400 + c.sv / 18,
  sim:bsSim, render:BS_RENDER,
};
SPORTS.baseball = lgModule('baseball');
