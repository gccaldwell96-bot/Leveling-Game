'use strict';
// =====================================================================================
//  SOCCER: Premier Football Union · 20 clubs, 38 matches (home & away), no playoffs
//  Minute-by-minute sim of a 4-4-2: chances, shots, saves, corners, penalties, cards and
//  sendings-off, three substitutions; extra time and a shootout if a knockout is level.
// =====================================================================================
const SC_ROLE = ['GK', 'DF', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'MF', 'FW', 'FW']; // the XI's slots
const SC_SH = {GK:0, DF:.35, MF:1, FW:3}, SC_AS = {GK:.05, DF:.75, MF:2, FW:1.3}, SC_BK = {GK:.15, DF:1.5, MF:1.2, FW:.65}, SC_HD = {GK:0, DF:1.6, MF:.5, FW:1.4}, SC_OFF = {DF:.8, MF:2, FW:2.6};
const SC_GV = ['fires home', 'slots it into the corner', 'smashes it in', 'curls it into the top corner', 'finishes coolly', 'tucks it away', 'drills it low past the keeper', 'lifts it over the keeper'];
const SC_FOUL = ['a late tackle', 'dissent', 'a shirt pull', 'time-wasting', 'a cynical foul', 'a deliberate handball', 'a reckless challenge'];
function scSim(H, A, ctx){
  const T = [H, A], rec = ctx.record, log = [], box = {}, sc = [0, 0];
  const B = p => box[p.id] || (box[p.id] = {g:0, a:0, sh:0, yc:0, rc:0, cs:0, sv:0, ga:0});
  const nm = p => `${p.fn[0]}. ${p.ln}`, score = () => `${H.t.abbr} ${sc[0]}-${sc[1]} ${A.t.abbr}`;
  const wpick = (arr, w) => { const ws = arr.map(w), tot = ws.reduce((a, b) => a + b, 0); let r = Math.random() * tot; for(let i = 0; i < arr.length; i++){ r -= ws[i]; if(r <= 0) return arr[i]; } return arr[arr.length - 1]; };
  const sd = T.map((X, s) => { const used = new Set();
    const xi = SC_ROLE.map(role => { const p = (X.pos[role] || []).find(x => !used.has(x.id)) || X.all.find(x => !used.has(x.id) && (x.pos === 'GK') === (role === 'GK')) || X.all.find(x => !used.has(x.id)); if(p) used.add(p.id); return p || null; });
    if(!xi[0]){ const j = xi.findIndex(Boolean); if(j > 0){ xi[0] = xi[j]; xi[j] = null; } }
    const rest = X.all.filter(p => !used.has(p.id)), gk2 = rest.find(p => p.pos === 'GK'), bench = [...(gk2 ? [gk2] : []), ...rest.filter(p => p.pos !== 'GK').slice(0, 8)];
    return {t:X.t, xi, bench, subs:0, at:[irand(56, 65), irand(66, 76), irand(77, 87)], yel:new Set(), gone:xi.map((p, i) => p ? -1 : i).filter(i => i >= 0), played:new Set(xi.filter(Boolean)), coach:s ? ctx.coachA : ctx.coachH}; });
  for(const x of sd) for(const p of x.played) B(p);
  let per = 1, min = 0, st = 0;
  const push = e => { if(!rec) return; const o = {per, min, st, sc:[...sc], ...e}; if(sd[0].gone.length || sd[1].gone.length) o.gone = sd.map(x => [...x.gone]); log.push(o); };
  const on = s => { const o = []; sd[s].xi.forEach((p, i) => { if(p) o.push(i); }); return o; };
  const str = s => { const x = sd[s].xi, f = role => { let t = 0, n = 0; x.forEach((p, i) => { if(p && SC_ROLE[i] === role){ t += p.ovr; n++; } }); return n ? t / n : 45; };
    return {att:f('FW') * .42 + f('MF') * .4 + f('DF') * .18, def:f('DF') * .45 + f('MF') * .25 + f('GK') * .3, men:x.filter(Boolean).length}; };
  const edge = s => { const a = str(s), d = str(1 - s); let e = (a.att - d.def) * .065 + (s ? -.12 : .12) + (sd[s].coach - sd[1 - s].coach) * .004 + (a.men - d.men) * .2;
    if(min >= 70){ const df = sc[s] - sc[1 - s]; if(df < 0) e += .18; else if(df > 0) e -= .1; } return e; };
  const shoot = (s, E, kind) => { // kind: '' open play · 'hd' header from a corner · 'pk' penalty
    const x = sd[s], o = sd[1 - s], G = o.xi[0], sl = on(s).filter(i => i > 0); if(!sl.length || !G) return '';
    const i = kind === 'pk' ? [...sl].sort((a, b) => (SC_ROLE[b] !== 'DF') - (SC_ROLE[a] !== 'DF') || x.xi[b].ovr - x.xi[a].ovr)[0] : wpick(sl, j => (kind === 'hd' ? SC_HD : SC_SH)[SC_ROLE[j]] * Math.max(10, x.xi[j].ovr - 25));
    const sh = x.xi[i], k = [Math.random(), Math.random()]; B(sh).sh++;
    const onT = kind === 'pk' ? .82 : clamp((kind === 'hd' ? .36 : .38) + E * .05 + (sh.ovr - 70) / 250, .2, .6);
    const conv = kind === 'pk' ? clamp(.93 + (sh.ovr - G.ovr) / 300, .82, .98) : clamp((kind === 'hd' ? .27 : .3) + (sh.ovr - G.ovr) / 350 + E * .05, .1, .55);
    const pre = kind === 'pk' ? 'Penalty! ' : '';
    if(Math.random() < onT){
      if(Math.random() < conv){ sc[s]++; B(sh).g++; B(G).ga++; let ai = -1;
        if(kind !== 'pk' && Math.random() < (kind === 'hd' ? .85 : .74)){ const pool = sl.filter(j => j !== i); if(pool.length){ ai = wpick(pool, j => SC_AS[SC_ROLE[j]] * Math.max(4, x.xi[j].ovr - 45)); B(x.xi[ai]).a++; } }
        push({type:'goal', side:s, i, ai, kind, k, nm:sh.ln, txt:`${pre}GOAL! ${nm(sh)} ${kind === 'pk' ? 'converts from the spot' : kind === 'hd' ? 'heads it in' : pick(SC_GV)}${ai >= 0 ? ` (assist ${nm(x.xi[ai])})` : ''}. ${score()}`}); return 'goal'; }
      B(G).sv++; push({type:'save', side:s, i, kind, k, nm:sh.ln, txt:kind === 'pk' ? `Penalty saved! ${nm(G)} denies ${nm(sh)}.` : Math.random() < .3 ? `What a stop! ${nm(G)} keeps out ${nm(sh)}.` : `${nm(sh)} ${kind === 'hd' ? 'heads' : 'shoots'}, ${nm(G)} saves.`}); return 'save'; }
    const dfs = on(1 - s).filter(j => j > 0 && SC_ROLE[j] !== 'FW'), blk = kind !== 'pk' && dfs.length && Math.random() < .45, bi = blk ? pick(dfs) : -1;
    push({type:'chance', side:s, i, kind, k, blk, bi, nm:sh.ln, txt:kind === 'pk' ? `Penalty missed! ${nm(sh)} puts it wide.` : blk ? `${nm(sh)}'s shot is blocked by ${nm(o.xi[bi])}.` : kind === 'hd' ? `${nm(sh)} heads it over.` : `${nm(sh)} ${pick(['drags it wide', 'fires over the bar', 'curls it just wide', 'skies it'])}.`});
    return blk ? 'blk' : 'wide';
  };
  const sendOff = (s, i) => { const x = sd[s]; x.xi[i] = null; x.gone.push(i); if(i) return;
    const outs = on(s).filter(j => j > 0); if(!outs.length) return; const g2 = x.subs < 3 && x.bench.find(p => p.pos === 'GK');
    const j = g2 ? outs.filter(j => SC_ROLE[j] === 'FW').pop() ?? outs[outs.length - 1] : outs.find(j => SC_ROLE[j] === 'DF') ?? outs[0], out = x.xi[j];
    x.gone = x.gone.filter(g => g !== 0); x.gone.push(j); x.xi[j] = null;
    if(g2){ x.xi[0] = g2; x.bench = x.bench.filter(p => p !== g2); x.subs++; x.played.add(g2); B(g2); push({type:'sub', side:s, i:0, txt:`${x.t.abbr} sacrifice ${nm(out)} to bring on keeper ${nm(g2)}.`}); }
    else { x.xi[0] = out; push({type:'sub', side:s, i:0, txt:`${nm(out)} goes in goal for ${x.t.abbr}.`}); } };
  const book = () => { const s = Math.random() < .47 ? 0 : 1, x = sd[s], sl = on(s); if(!sl.length) return;
    const i = wpick(sl, j => SC_BK[SC_ROLE[j]] * (x.yel.has(x.xi[j].id) ? .15 : 1)), p = x.xi[i]; B(p).yc++;
    if(x.yel.has(p.id)){ B(p).rc++; push({type:'rc', side:s, i, txt:`Second yellow! ${nm(p)} is sent off. ${x.t.abbr} down to ${sl.length - 1}.`}); sendOff(s, i); }
    else { x.yel.add(p.id); push({type:'yc', side:s, i, txt:`Yellow card: ${nm(p)} for ${pick(SC_FOUL)}.`}); } };
  const red = () => { const s = Math.random() < .5 ? 0 : 1, x = sd[s], sl = on(s); if(sl.length < 8) return; const i = wpick(sl, j => SC_BK[SC_ROLE[j]] * (j ? 1 : .5)), p = x.xi[i];
    B(p).rc++; push({type:'rc', side:s, i, txt:`Straight red! ${nm(p)} is off for ${pick(['a two-footed lunge', 'denying a clear goal-scoring chance', 'violent conduct', 'a dangerous high tackle'])}.`}); sendOff(s, i); };
  const sub = s => { const x = sd[s], sl = on(s).filter(i => i > 0), cand = x.bench.filter(p => p.pos !== 'GK'); x.subs++; if(!sl.length || !cand.length) return;
    const i = wpick(sl, j => SC_OFF[SC_ROLE[j]] * (x.yel.has(x.xi[j].id) ? 2 : 1) * Math.max(1, 100 - x.xi[j].ovr)), want = sc[s] < sc[1 - s] && min >= 70 ? 'FW' : SC_ROLE[i];
    const inP = cand.find(p => p.pos === want) || cand.find(p => p.pos === SC_ROLE[i]) || cand[0], out = x.xi[i];
    x.xi[i] = inP; x.bench = x.bench.filter(p => p !== inP); x.played.add(inP); B(inP); push({type:'sub', side:s, i, txt:`${x.t.abbr} change: ${nm(inP)} on, ${nm(out)} off.`}); };
  const minute = () => {
    if(per >= 2) for(const s of [0, 1]){ const x = sd[s]; if(x.subs < 3 && min >= x.at[x.subs] && !st) sub(s); }
    if(Math.random() < .036) book();
    if(Math.random() < .0008) red();
    for(const s of Math.random() < .5 ? [0, 1] : [1, 0]){ const E = edge(s);
      if(Math.random() < .0014 * Math.exp(E * .5)){ shoot(s, E, 'pk'); continue; }
      if(Math.random() > .108 * Math.exp(E * .55)) continue;
      const r = shoot(s, E, '');
      if((r === 'blk' && Math.random() < .5) || (r === 'save' && Math.random() < .3)){ const x = sd[s], wings = on(s).filter(j => SC_ROLE[j] === 'MF'), ci = wings.length ? pick(wings) : -1;
        push({type:'corner', side:s, i:ci, k:[Math.random(), Math.random()], txt:`Corner to ${x.t.abbr}${ci >= 0 ? `, ${nm(x.xi[ci])} to take` : ''}.`});
        if(Math.random() < .3) shoot(s, E, 'hd'); }
    }
  };
  const half = (p, m0, len, add) => { per = p; for(let m = 1; m <= len + add; m++){ min = m0 + Math.min(m, len); st = Math.max(0, m - len); minute(); } };
  push({type:'half', side:-1, lab:'KICK-OFF', txt:`Kick-off: ${lgTeamName(H.t)} v ${lgTeamName(A.t)}.`});
  half(1, 0, 45, irand(1, 3)); push({type:'half', side:-1, lab:'HALF-TIME', txt:`Half-time: ${score()}.`});
  half(2, 45, 45, irand(2, 6));
  let so = null;
  if(ctx.po && sc[0] === sc[1]){
    push({type:'half', side:-1, lab:'EXTRA TIME', txt:`Full-time: ${score()}. Extra time!`}); half(3, 90, 15, irand(0, 1));
    push({type:'half', side:-1, lab:'ET HALF-TIME', txt:`End of the first period of extra time: ${score()}.`}); half(4, 105, 15, irand(0, 2));
    if(sc[0] === sc[1]){ push({type:'half', side:-1, lab:'PENALTIES', txt:`Still level after 120 minutes. Penalties!`}); so = [0, 0]; per = 5;
      const takers = sd.map((x, s) => on(s).filter(i => i > 0).sort((a, b) => SC_SH[SC_ROLE[b]] - SC_SH[SC_ROLE[a]] || x.xi[b].ovr - x.xi[a].ovr).concat([0]));
      const n = [0, 0]; let done = false;
      for(let r = 0; r < 40 && !done; r++) for(const s of [0, 1]){ const i = takers[s][r % takers[s].length], tk = sd[s].xi[i], G = sd[1 - s].xi[0], ok = Math.random() < clamp(.76 + (tk.ovr - G.ovr) / 300, .6, .9);
        if(ok) so[s]++; n[s]++; push({type:'pen', side:s, i, ok, so:[...so], k:[Math.random(), Math.random()], txt:`${nm(tk)} ${ok ? pick(['scores', 'buries it', 'sends the keeper the wrong way']) : Math.random() < .6 ? `is saved by ${nm(G)}` : 'misses the target'}. Penalties ${so[0]}-${so[1]}.`});
        if(r < 5 ? so[0] + 5 - n[0] < so[1] || so[1] + 5 - n[1] < so[0] : s === 1 && so[0] !== so[1]){ done = true; break; } }
      if(so[0] === so[1]) so[Math.random() < .5 ? 0 : 1]++; }
  }
  for(const s of [0, 1]) if(sc[1 - s] === 0) for(const p of sd[s].played) if(p.pos === 'GK' || p.pos === 'DF') B(p).cs = 1;
  const w = so ? (so[0] > so[1] ? 0 : 1) : -1;
  if(so) sc[w]++;
  push({type:'end', side:-1, lab:'FULL-TIME', txt:so ? `${lgTeamName(T[w].t)} win ${Math.max(...so)}-${Math.min(...so)} on penalties!` : per >= 3 ? `Full-time after extra time: ${score()}.` : `Full-time: ${score()}.`});
  return {sc, ot:per >= 3, log, box, pens:so};
}

// ---------------- the pitch (105 × 68, home attacks right) ----------------
// shapes in "attacking right" coordinates: neutral, pushed up, sitting deep
const SC_N = [[5, 34], [19, 10], [17, 26], [17, 42], [19, 58], [35, 10], [33, 27], [33, 41], [35, 58], [47, 29], [47, 39]];
const SC_A = [[16, 34], [44, 9], [38, 26], [38, 42], [44, 59], [70, 8], [62, 26], [62, 42], [70, 60], [86, 29], [86, 40]];
const SC_D = [[3, 34], [12, 19], [10, 30], [10, 38], [12, 49], [23, 15], [21, 29], [21, 39], [23, 53], [36, 28], [38, 40]];
const scL = (a, b, f) => [lerp2(a[0], b[0], f), lerp2(a[1], b[1], f)];
const SC_RENDER = {
  aspect:.62, otLabel:'ET', startPer:'1H', startClk:"0'", startDd:'Kick-off', gap:220,
  dur:e => e.type === 'goal' ? 1700 : e.type === 'save' || e.type === 'chance' ? 1300 : e.type === 'corner' ? 1000 : e.type === 'pen' ? 1100 : e.type === 'sub' ? 700 : 900,
  hud(e, after, st){ const per = e.per === 5 ? 'PENS' : e.per >= 3 ? 'ET' : e.per === 2 ? '2H' : '1H', clk = `${e.min}${e.st ? '+' + e.st : ''}'`, tm = e.side === 0 ? st.home : e.side === 1 ? st.away : null;
    const dd = e.so ? `Penalties ${e.so[0]}-${e.so[1]}` : e.type === 'half' || e.type === 'end' ? e.lab[0] + e.lab.slice(1).toLowerCase() : !tm ? '' : e.type === 'yc' || e.type === 'rc' ? `${tm.abbr} booking` : e.type === 'sub' ? `${tm.abbr} substitution` : `${tm.abbr} attacking`;
    return {per, clk:e.per === 5 ? 'SO' : clk, dd, stamp:e.per === 5 ? 'Pens' : clk}; },
  big:e => e.type === 'goal' || e.type === 'yc' || e.type === 'rc' || (e.type === 'half' && e.lab !== 'KICK-OFF') || e.type === 'end',
  banner(e){ if(e.type === 'goal') return ['GOAL!', '#ffe14a']; if(e.type === 'rc') return ['Red card!', '#ff4b4b']; if(e.type === 'yc') return ['Booked', '#ffd400']; if(e.type === 'pen') return e.ok ? ['Scored', '#fff'] : ['Missed!', '#ff9b9b']; return null; },
  geo(st){ const W = st.W, H = st.H; return {X:x => (x + 4) / 113 * W, Y:y => (y + 2.5) / 73 * H, r:Math.max(3.6, W * .012)}; },
  bg(ctx, st){ const W = st.W, H = st.H, {X, Y} = SC_RENDER.geo(st), sx = X(1) - X(0), sy = Y(1) - Y(0);
    ctx.fillStyle = '#23662a'; ctx.fillRect(0, 0, W, H);
    for(let i = 0; i < 14; i++){ ctx.fillStyle = i % 2 ? '#2f8a37' : '#348f3c'; ctx.fillRect(X(i * 7.5), Y(0), sx * 7.5 + .5, sy * 68); }
    ctx.strokeStyle = '#ffffffd9'; ctx.lineWidth = Math.max(1.2, W / 300); ctx.fillStyle = '#ffffffd9';
    ctx.strokeRect(X(0), Y(0), sx * 105, sy * 68);
    ctx.beginPath(); ctx.moveTo(X(52.5), Y(0)); ctx.lineTo(X(52.5), Y(68)); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(X(52.5), Y(34), sx * 9.15, sy * 9.15, 0, 0, Math.PI * 2); ctx.stroke(); dotP(ctx, X(52.5), Y(34), 1.6, '#ffffffd9');
    for(const side of [0, 1]){ const gx = side ? 105 : 0, d = side ? -1 : 1, bx = x => X(gx + d * x);
      ctx.strokeRect(Math.min(bx(0), bx(16.5)), Y(13.84), sx * 16.5, sy * 40.32); ctx.strokeRect(Math.min(bx(0), bx(5.5)), Y(24.84), sx * 5.5, sy * 18.32);
      dotP(ctx, bx(11), Y(34), 1.4, '#ffffffd9');
      const a = Math.acos(5.5 / 9.15); ctx.beginPath(); ctx.ellipse(bx(11), Y(34), sx * 9.15, sy * 9.15, 0, side ? Math.PI - a : -a, side ? Math.PI + a : a); ctx.stroke();
      for(const cy of [0, 68]){ const a0 = side ? (cy ? Math.PI : Math.PI / 2) : (cy ? -Math.PI / 2 : 0); ctx.beginPath(); ctx.ellipse(X(gx), Y(cy), sx * 1.2, sy * 1.2, 0, a0, a0 + Math.PI / 2); ctx.stroke(); }
      const nx = side ? X(105) : X(-2.4), ny = Y(30.34), nw = sx * 2.4, nh = sy * 7.32; ctx.fillStyle = '#ffffff30'; ctx.fillRect(nx, ny, nw, nh);
      ctx.save(); ctx.lineWidth = .5; ctx.strokeStyle = '#ffffff55'; ctx.beginPath(); for(let k = 1; k < 4; k++){ ctx.moveTo(nx, ny + nh * k / 4); ctx.lineTo(nx + nw, ny + nh * k / 4); } ctx.moveTo(nx + nw / 2, ny); ctx.lineTo(nx + nw / 2, ny + nh); ctx.stroke(); ctx.restore();
      ctx.strokeRect(nx, ny, nw, nh); ctx.fillStyle = '#ffffffd9'; }
  },
  frame(ctx, e, t, st){
    t = clamp(t, 0, 1); // the first animation frame can land a hair before t0
    const W = st.W, H = st.H, {X, Y, r} = SC_RENDER.geo(st), s = e.side === 1 ? 1 : 0, ks = e.k || [.5, .5];
    const F = p => s ? [105 - p[0], 68 - p[1]] : p, M = p => [105 - p[0], 68 - p[1]]; // to the canvas · the other team's frame
    const play = ['goal', 'save', 'chance', 'corner'].includes(e.type), k = easeIO(clamp(t / .45, 0, 1)), wob = (i, tm) => [Math.sin(t * 5 + i * 1.7 + tm * 3) * .5, Math.cos(t * 4 + i * 2.3 + tm) * .5];
    const pts = [[], []]; // pts[0] = side s (attacking right in this frame), pts[1] = the other side
    for(let i = 0; i < 11; i++){ const w0 = wob(i, 0), w1 = wob(i, 1), a = play ? scL(SC_N[i], SC_A[i], k) : SC_N[i], d = M(play ? scL(SC_N[i], SC_D[i], k) : SC_N[i]);
      pts[0][i] = [a[0] + w0[0], a[1] + w0[1]]; pts[1][i] = [d[0] + w1[0], d[1] + w1[1]]; }
    let ball = null, bh = 0, alpha = null, card = null, label = null, flash = false;
    const i = e.i ?? 9;
    if(e.type === 'goal' || e.type === 'save' || e.type === 'chance'){
      const pk = e.kind === 'pk', hd = e.kind === 'hd';
      const spot = pk ? [94, 34] : hd ? [93 + ks[0] * 3, 29 + ks[1] * 10] : [83 + ks[0] * 11, 34 + (ks[1] - .5) * 24];
      const k2 = easeIO(clamp((t - .1) / .45, 0, 1)), wide = !pk && !hd && ks[0] < .45;
      let cr = e.ai >= 0 ? e.ai : 5 + Math.floor(ks[1] * 3.99); if(cr === i) cr = i === 6 ? 7 : 6;
      const cspot = hd ? [104, ks[0] < .5 ? 1 : 67] : wide ? [90 + ks[1] * 4, spot[1] < 34 ? 60 : 8] : [72, 34 + (ks[1] - .5) * 12];
      if(pk){ for(let n = 0; n < 11; n++){ if(n){ pts[0][n] = [Math.min(84, pts[0][n][0]), pts[0][n][1]]; pts[1][n] = [Math.min(84, pts[1][n][0]), pts[1][n][1]]; } } pts[0][i] = scL(pts[0][i], spot, k2); pts[1][0] = [104.4, 34]; }
      else { pts[0][i] = scL(pts[0][i], spot, k2); if(cr !== i) pts[0][cr] = scL(pts[0][cr], cspot, k2); }
      const gk = pts[1][0], sh = pts[0][i];
      const tgt = e.type === 'goal' ? [106.4, 34 + (ks[1] - .5) * 6] : e.type === 'save' ? [103.4, 34 + (ks[0] - .5) * 6] : e.blk ? pts[1][e.bi > 0 ? e.bi : 2] : [107.6, 34 + (ks[1] > .5 ? 1 : -1) * (5 + ks[0] * 5)];
      if(e.blk && e.bi > 0) pts[1][e.bi] = scL(pts[1][e.bi], [spot[0] + 4, spot[1] + (34 - spot[1]) * .2], k2);
      if(t < .6){ if(pk) ball = [94, 34]; else { const ch = [pts[0][2 + Math.floor(ks[0] * 1.99)], pts[0][6 + Math.floor(ks[1] * 1.99)], pts[0][cr], sh], f = t / .6 * 3, n = Math.min(2, Math.floor(f)); ball = scL(ch[n], ch[n + 1], easeIO(f - n)); if(n === 2 && (wide || hd)) bh = Math.sin((f - n) * Math.PI) * 3.5; } }
      else if(t < .8){ const f = (t - .6) / .2; ball = scL(sh, tgt, f); if(e.type === 'save') pts[1][0] = scL(gk, [103.4, tgt[1]], Math.min(1, f * 1.4)); if(hd) bh = (1 - f) * 1.2; }
      else { const f = (t - .8) / .2;
        if(e.type === 'goal'){ ball = [106.4 + f * .6, tgt[1]]; flash = true; }
        else if(e.type === 'save'){ pts[1][0] = [103.4, tgt[1]]; ball = [102.6, tgt[1]]; }
        else if(e.blk) ball = scL(tgt, [tgt[0] - 6, tgt[1] + (ks[0] > .5 ? 9 : -9)], f);
        else ball = scL(tgt, [108.6, tgt[1] + (tgt[1] - 34) * .2], f); }
      if(e.type === 'goal' && t > .55) label = [e.nm, pts[0][i]];
    } else if(e.type === 'corner'){
      const fl = [104.6, ks[0] < .5 ? .6 : 67.4], tk = e.i >= 0 ? e.i : 5, box = [[92, 30], [95, 37], [90, 36], [96, 32]], k2 = easeIO(clamp(t / .3, 0, 1));
      pts[0][tk] = scL(pts[0][tk], [fl[0] + .8, fl[1] + (fl[1] < 34 ? -1 : 1)], k2); [2, 3, 9, 10].forEach((n, j) => { if(n !== tk) pts[0][n] = scL(pts[0][n], box[j], k2); });
      for(const n of [1, 2, 3, 4]) pts[1][n] = scL(pts[1][n], [96 - (n % 2) * 3, 28 + n * 3], k2); pts[1][0] = [104, 34];
      const land = [93 + ks[1] * 3, 30 + ks[1] * 8]; if(t < .35) ball = fl; else { const f = Math.min(1, (t - .35) / .45); ball = scL(fl, land, f); bh = Math.sin(f * Math.PI) * 5; }
    } else if(e.type === 'pen'){
      for(let n = 0; n < 11; n++){ pts[0][n] = [50 + (n % 4) * 1.5, 26 + n * 1.3]; pts[1][n] = [55 + (n % 4) * 1.5, 26 + n * 1.3]; }
      pts[0][i] = [93, 34]; pts[1][0] = [104.4, 34];
      const tgt = [e.ok ? 106.2 : ks[0] < .6 ? 103.4 : 107.4, 34 + (ks[1] - .5) * (e.ok ? 6 : ks[0] < .6 ? 5 : 12)];
      if(t < .4) ball = [94, 34]; else { const f = Math.min(1, (t - .4) / .3); ball = scL([94, 34], tgt, f); if(!e.ok && ks[0] < .6) pts[1][0] = scL([104.4, 34], [103.4, tgt[1]], f); }
      if(e.ok && t > .7) flash = true;
    } else if(e.type === 'yc' || e.type === 'rc'){
      const ref = scL([52.5, 34], pts[0][i], easeIO(clamp(t / .4, 0, 1)) * .8); dotP(ctx, X(F(ref)[0]), Y(F(ref)[1]), r * .75, '#111', '#ddd');
      if(t > .35) card = [pts[0][i], e.type === 'rc' ? '#e5262b' : '#ffd400']; if(e.type === 'rc' && t > .55) alpha = [0, i, 1 - (t - .55) / .45];
    } else if(e.type === 'sub'){
      const tl = [52.5, 69.5], f = clamp(t * 2, 0, 1), g = clamp(t * 2 - 1, 0, 1), home = pts[0][i];
      pts[0][i] = t < .5 ? scL(home, tl, easeIO(f)) : scL(tl, home, easeIO(g));
      const bx = F(tl); ctx.fillStyle = '#111c'; ctx.fillRect(X(bx[0]) - r * 3, Y(bx[1]) - r * 1.2, r * 6, r * 2.4); ctx.fillStyle = '#7CFC00'; ctx.font = CANVAS_FONT('800 ' + Math.round(r * 2)); ctx.textAlign = 'center'; ctx.fillText('SUB', X(bx[0]), Y(bx[1]) + r * .7);
    }
    const gone = e.gone || [[], []];
    for(const tm of [1, 0]){ const team = tm ? 1 - s : s, g = gone[team] || [];
      for(let n = 0; n < 11; n++){ if(g.includes(n)) continue; const p = F(pts[tm][n]), keep = n === 0;
        if(alpha && alpha[0] === tm && alpha[1] === n){ if(alpha[2] <= 0) continue; ctx.globalAlpha = alpha[2]; }
        dotP(ctx, X(p[0]), Y(p[1]), r * (tm === 0 && n === i && e.side >= 0 && e.type !== 'corner' ? 1.2 : 1), keep ? st.outl[team] : st.cols[team], keep ? (st.outl[team] === st.cols[team] ? '#fff' : st.cols[team]) : st.outl[team]); ctx.globalAlpha = 1; } }
    if(flash){ const gx = s ? X(-2.4) : X(105); ctx.fillStyle = (st.cols[s] || '#fff') + '88'; ctx.fillRect(gx, Y(30.34), X(2.4) - X(0), Y(37.66) - Y(30.34)); }
    if(ball){ const b = F(ball); ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.ellipse(X(b[0]) + 1, Y(b[1]) + 1, r * .55, r * .4, 0, 0, Math.PI * 2); ctx.fill(); dotP(ctx, X(b[0]), Y(b[1]) - bh * H / 73, r * .58, '#fff', '#222'); }
    if(card){ const p = F(card[0]), cx = X(p[0]) + r * 1.3, cy = Y(p[1]) - r * 3.2; ctx.save(); ctx.translate(cx, cy); ctx.rotate(.18); ctx.fillStyle = card[1]; ctx.strokeStyle = '#0008'; ctx.lineWidth = 1; ctx.fillRect(-r * .85, -r * 1.2, r * 1.7, r * 2.4); ctx.strokeRect(-r * .85, -r * 1.2, r * 1.7, r * 2.4); ctx.restore(); }
    if(label){ const p = F(label[1]); ctx.font = CANVAS_FONT('700 ' + Math.max(11, Math.round(H * .055))); ctx.textAlign = 'center'; ctx.fillStyle = '#000a'; ctx.fillText(label[0], X(p[0]) + 1, Y(p[1]) - r * 1.8 + 1); ctx.fillStyle = '#fff'; ctx.fillText(label[0], X(p[0]), Y(p[1]) - r * 1.8); }
    if(e.type === 'half' || e.type === 'end'){ ctx.fillStyle = '#0009'; ctx.fillRect(0, H * .36, W, H * .28); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = CANVAS_FONT('800 ' + Math.round(H * .1)); ctx.fillText(e.lab, W / 2, H * .48);
      ctx.font = CANVAS_FONT('700 ' + Math.round(H * .075)); ctx.fillText(`${st.home.abbr} ${e.sc[0]} - ${e.sc[1]} ${st.away.abbr}`, W / 2, H * .59); }
  },
  final(ctx, st){ const {X, Y, r} = SC_RENDER.geo(st); for(let n = 0; n < 11; n++){ const a = SC_N[n], b = [105 - SC_N[n][0], 68 - SC_N[n][1]]; dotP(ctx, X(b[0]), Y(b[1]), r, n ? st.cols[1] : st.outl[1], n ? st.outl[1] : st.cols[1]); dotP(ctx, X(a[0]), Y(a[1]), r, n ? st.cols[0] : st.outl[0], n ? st.outl[0] : st.cols[0]); } },
};

// ---------------- the league config ----------------
LG.soccer = {
  id:'soccer', start:32, seasonWord:'season', gameWord:'match', venue:'Stadium', coachWord:'manager', crest:'shield', starterWord:'Starting XI', pfWord:'Goals', pfShort:'GD',
  teams:[['Northbridge', 'Athletic', 'NBR', '#1b3a8c', '#f4c430', 5], ['Kingsmere', 'United', 'KGM', '#7a1f2b', '#e8c27a', 5], ['Crownhill', 'Monarchs', 'CRH', '#5a2d91', '#ffbe0b', 5], ['Port Royal', 'FC', 'PRY', '#0b6e4f', '#ffffff', 4],
    ['Redhaven', 'City', 'RDH', '#c8102e', '#0f1d3a', 4], ['Fairport', 'Dynamo', 'FPD', '#00539f', '#ff6a13', 4], ['Silverbay', 'Dolphins', 'SVB', '#3fb8e0', '#0a2d6e', 4], ['Westhaven', 'Mariners', 'WHV', '#0d5c75', '#f6f1e9', 3],
    ['Brackenfield', 'Sporting', 'BRK', '#2d2d2d', '#e94f8a', 3], ['Oakhurst', 'Olympic', 'OKH', '#f2f2f2', '#2c5f2d', 3], ['Marlowe', 'Phoenix', 'MRL', '#d9480f', '#2b2b2b', 3], ['Ashford Vale', 'Rovers', 'ASV', '#f08c00', '#14213d', 2],
    ['Greywater', 'Wanderers', 'GRW', '#5b5f6b', '#ffd23f', 2], ['Elmstead', 'Harriers', 'ELM', '#3c7d22', '#f0e6c8', 2], ['Stonemoor', 'Borough', 'STB', '#9e1b32', '#d9d9d9', 2], ['Ironvale', 'Foundry', 'IRV', '#3d4a5c', '#9fd3c7', 2],
    ['Glenmouth', 'Swifts', 'GLS', '#ffd23f', '#1d3557', 2], ['Saltmarsh', 'Town', 'SMT', '#7fc8f8', '#1b263b', 1], ['Lowmoor', 'Miners', 'LWM', '#1a1a1a', '#e0b000', 1], ['Duncastle', 'County', 'DNC', '#264653', '#e9c46a', 1]],
  pos:{GK:[3, 1], DF:[8, 4], MF:[8, 4], FW:[5, 2]}, posNames:{GK:'Goalkeepers', DF:'Defenders', MF:'Midfielders', FW:'Forwards'}, posSal:{GK:.75, DF:.9, MF:1.05, FW:1.2},
  rosterMax:25, ages:[17, 37], peak:27, draftRounds:2, injRate:.004, injPool:16, hypeMul:1, awardMinGP:15, points:[3, 1, 0],
  reg:{weeks:38, gpw:1, double:true}, po:null, champName:'Union title',
  money:{cap:130, maxSal:25, minSal:.6, tv:130, merch:60, ticket:65, seats:[24000, 60000], seatStep:2500, staff:.06, ops:30, arenaUp:120},
  stats:[['g', 'G'], ['a', 'A'], ['sh', 'SH'], ['yc', 'YC'], ['rc', 'RC'], ['cs', 'CS'], ['sv', 'SV'], ['ga', 'GA']],
  statLine(s, p){ return p && p.pos === 'GK' ? [['Apps', s.gp], ['CS', s.cs], ['GA', s.ga], ['SV', s.sv]] : [['Apps', s.gp], ['G', s.g], ['A', s.a], ['YC', s.yc]]; },
  leaders:[['g', 'Goals', false], ['a', 'Assists', false], ['cs', 'Clean sheets', false, p => p.pos === 'GK'], ['yc', 'Yellow cards', false]],
  records:[['g', 'Goals in a season'], ['a', 'Assists in a season'], ['cs', 'Clean sheets in a season']],
  awards:[
    {k:'mvp', n:'Player of the Year', score:(p, t) => (p.st.g + p.st.a * .7 + (p.pos === 'GK' ? p.st.cs * .5 : p.pos === 'DF' ? p.st.cs * .3 : 0)) / p.st.gp * 10 + p.ovr / 8 + lgPct(t) * 8},
    {k:'boot', n:'Golden Boot', score:p => p.st.g + p.st.a * .01 - p.st.gp * .001},
    {k:'glove', n:'Golden Glove', pos:['GK'], score:p => p.st.cs - p.st.ga * .01},
    {k:'roy', n:'Young Player', score:p => (p.st.g + p.st.a * .7 + p.st.cs * .3) / p.st.gp * 10 + p.ovr / 8},
  ],
  hofProd:c => c.g / 4.5 + c.a / 9 + c.cs / 5 + c.gp / 40,
  sim:scSim, render:SC_RENDER,
};
SPORTS.soccer = lgModule('soccer');
