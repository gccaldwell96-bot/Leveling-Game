'use strict';
// =====================================================================================
//  HOCKEY: Ice Hockey League · 24 teams, 78 games (3 a week), best-of-7 playoffs
//  Minute-by-minute sim with line changes, shots, saves, goals, penalties and power plays,
//  3-on-3 overtime and shootouts in the regular season, sudden-death overtime in the playoffs.
// =====================================================================================
const HK_SHOOT = {C:1.15, LW:1.2, RW:1.2, D:.55, G:0};
function hkSim(H, A, ctx){
  const lines = T => { const f = pos => T.pos[pos] || [], C = f('C'), LW = f('LW'), RW = f('RW'), D = f('D'), all = T.all.filter(p => p.pos !== 'G');
    const fill = (arr, k) => arr[k] || all.find(p => p.pos !== 'D') || all[0];
    return {F:[0, 1, 2].map(k => [fill(C, k), fill(LW, k), fill(RW, k)]), D:[0, 1, 2].map(k => [D[k * 2] || all[0], D[k * 2 + 1] || all[1]]), G:(T.pos.G || [])[Math.random() < .2 && (T.pos.G || [])[1] ? 1 : 0] || T.all[0]}; }; // the backup starts about one game in five
  const sides = [lines(H), lines(A)], coach = [ctx.coachH, ctx.coachA], sc = [0, 0], log = [], box = {}, rec = ctx.record, sog = [0, 0];
  const B = p => box[p.id] || (box[p.id] = {g:0, a:0, pts:0, sog:0, pim:0, w:0, sv:0, ga:0, so:0, gs:0});
  const nm = p => `${p.fn[0]}. ${p.ln}`, avg = a => a.reduce((s, p) => s + p.ovr, 0) / a.length;
  const wpick = (arr, w) => { const ws = arr.map(w), tot = ws.reduce((a, b) => a + b, 0); let r = Math.random() * tot; for(let i = 0; i < arr.length; i++){ r -= ws[i]; if(r <= 0) return arr[i]; } return arr[arr.length - 1]; };
  let per = 1, min = 0, pp = [0, 0], over = false; // pp = penalty minutes left for each side (they're short-handed)
  const push = e => { if(rec) log.push({per, min, sc:[...sc], ...e}); };
  for(const s of sides){ B(s.G).gs++; for(const p of [...s.F.flat(), ...s.D.flat()]) B(p); } // everyone dressed gets a game played
  const onIce = (s, m) => { const L = sides[s], fl = m % 3 === 0 ? 0 : m % 3 === 1 ? 1 : (Math.random() < .35 ? 0 : 2), dl = m % 2 ? 1 : (Math.random() < .7 ? 0 : 2); return [...L.F[fl], ...L.D[dl]]; };
  const shift = (s, m, sd) => { // one team's attack in one minute
    const att = onIce(s, m), def = onIce(1 - s, m), G = sides[1 - s].G, edge = (avg(att) - avg(def)) / 20 + (s === 0 ? .05 : -.05) + (coach[s] - coach[1 - s]) / 300;
    const man = pp[1 - s] > 0 ? 1.8 : pp[s] > 0 ? .45 : 1, rate = (.5 + edge * .12) * man * (sd ? 1.35 : 1);
    if(Math.random() > rate) return;
    const sh = wpick(att, p => HK_SHOOT[p.pos] * Math.max(5, p.ovr - 40)); B(sh).sog++; sog[s]++;
    const pg = clamp(.094 + (sh.ovr - G.ovr) / 650 + edge * .02 + (man > 1.5 ? .03 : 0), .03, .22);
    if(Math.random() < pg){ sc[s]++; B(sh).g++; B(sh).pts++; B(G).ga++; const ast = att.filter(p => p !== sh), as = []; if(Math.random() < .9){ const a1 = wpick(ast, p => p.ovr - 40); as.push(a1); if(Math.random() < .7){ const a2 = wpick(ast.filter(p => p !== a1), p => p.ovr - 40); as.push(a2); } } for(const a of as){ B(a).a++; B(a).pts++; }
      const pptag = pp[1 - s] > 0 ? ' Power-play goal!' : pp[s] > 0 ? ' Short-handed!' : '';
      push({type:'goal', side:s, sh:sh.pos, txt:`GOAL! ${nm(sh)} scores${as.length ? ` (${as.map(nm).join(', ')})` : ' unassisted'}.${pptag}`}); if(pp[1 - s] > 0) pp[1 - s] = 0; return 'goal'; }
    B(G).sv++; push({type:'shot', side:s, sh:sh.pos, txt:Math.random() < .25 ? `${nm(G)} robs ${nm(sh)}!` : `${nm(sh)} shoots, ${nm(G)} saves.`});
  };
  while(!over){
    for(min = 0; min < 20; min++){
      for(const s of [0, 1]) if(pp[s] > 0) pp[s]--;
      if(Math.random() < .055){ const s = Math.random() < .5 ? 0 : 1, p = pick(onIce(s, min)); B(p).pim += 2; pp[s] = 2; push({type:'pen', side:s, txt:`${nm(p)} goes to the box for ${pick(['tripping', 'hooking', 'slashing', 'holding', 'interference', 'high-sticking'])}. Power play!`}); }
      const order = Math.random() < .5 ? [0, 1] : [1, 0]; for(const s of order) shift(s, min, false);
    }
    push({type:'end', side:-1, txt:per < 3 ? `End of the ${ord(per)} period.` : sc[0] === sc[1] ? 'Tied after regulation!' : 'Final horn!'});
    if(per >= 3 && sc[0] !== sc[1]) break;
    if(per === 3 && sc[0] === sc[1] && !ctx.po){ // 5 minutes of 3-on-3, then a shootout
      per = 4; pp = [0, 0];
      for(min = 0; min < 5 && sc[0] === sc[1]; min++){ for(const s of Math.random() < .5 ? [0, 1] : [1, 0]){ if(shift(s, min, true) === 'goal') break; } }
      if(sc[0] !== sc[1]){ push({type:'end', side:-1, txt:'Overtime winner!'}); return {sc, ot:true, log, box:hkFinish(box, sides, sc), shootout:false}; }
      const so = [0, 0]; push({type:'end', side:-1, txt:'Still tied. Shootout!'});
      for(let r = 0; r < 10; r++){ for(const s of [0, 1]){ const sh = sides[s].F[0][r % 3], G = sides[1 - s].G, ok = Math.random() < .33 + (sh.ovr - G.ovr) / 300; if(ok) so[s]++; push({type:ok ? 'sogoal' : 'sosave', side:s, so:[...so], txt:`Shootout: ${nm(sh)} ${ok ? 'scores!' : `is stopped by ${nm(G)}.`}`}); }
        if(r >= 2 && so[0] !== so[1]) break; }
      if(so[0] === so[1]) so[Math.random() < .5 ? 0 : 1]++;
      sc[so[0] > so[1] ? 0 : 1]++; push({type:'end', side:-1, txt:`${so[0] > so[1] ? H.t.name : A.t.name} win the shootout!`});
      return {sc, ot:true, log, box:hkFinish(box, sides, sc), shootout:true};
    }
    per++; pp = [0, 0];
    if(per > 3){ // playoff overtime: sudden death, full periods
      for(min = 0; min < 20 && sc[0] === sc[1]; min++){ for(const s of Math.random() < .5 ? [0, 1] : [1, 0]) if(shift(s, min, false) === 'goal') break; }
      if(sc[0] !== sc[1]){ push({type:'end', side:-1, txt:'Sudden-death winner in overtime!'}); break; }
      push({type:'end', side:-1, txt:`Still tied after overtime ${per - 3}.`});
      if(per > 8){ sc[0]++; break; } continue;
    }
  }
  return {sc, ot:per > 3, log, box:hkFinish(box, sides, sc)};
}
function hkFinish(box, sides, sc){ const wg = sc[0] > sc[1] ? 0 : 1; box[sides[wg].G.id].w = 1; if(sc[1 - wg] === 0) box[sides[wg].G.id].so = 1; return box; }

// ---------------- the rink ----------------
const HK_RENDER = {
  aspect:.46, otLabel:'OT', startPer:'1st', startClk:'20:00', startDd:'Opening faceoff', gap:200,
  dur:e => e.type === 'end' ? 500 : e.type === 'pen' ? 700 : 1000,
  hud(e, after, st){ const per = e.per > 3 ? (e.per === 4 ? 'OT' : `${e.per - 3}OT`) : ['', '1st', '2nd', '3rd'][e.per], left = Math.max(0, (e.per === 4 && !e.so ? 5 : 20) - e.min - (after ? 1 : 0)), clk = e.so ? 'SO' : `${left}:00`;
    const tm = e.side === 0 ? st.home : e.side === 1 ? st.away : null; return {per, clk, dd:e.so ? `Shootout ${e.so[0]}-${e.so[1]}` : tm ? `${tm.abbr} attacking` : '', stamp:e.so ? 'SO' : `${per} ${String(e.min + 1).padStart(2, '0')}'`}; },
  big:e => e.type === 'goal' || e.type === 'sogoal' || e.type === 'end' || e.type === 'pen',
  banner(e){ if(e.type === 'goal' || e.type === 'sogoal') return ['Goal!', '#ff3b3b']; if(e.type === 'pen') return ['Penalty', '#fff']; return null; },
  bg(ctx, st){ const W = st.W, H = st.H, X = x => x / 200 * W, Y = y => y / 85 * H, R = Y(28);
    ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.beginPath(); ctx.roundRect(1, 1, W - 2, H - 2, R); ctx.fillStyle = '#eef4fb'; ctx.fill(); ctx.clip();
    ctx.fillStyle = '#d8e6f5'; for(let i = 0; i < 6; i++) ctx.fillRect(0, Y(i * 15 + 3), W, Y(5));
    ctx.fillStyle = '#c8102e'; ctx.fillRect(X(99.5), 0, X(1.2), H); ctx.fillStyle = '#1d4ed8'; ctx.fillRect(X(74), 0, X(1.4), H); ctx.fillRect(X(124.6), 0, X(1.4), H);
    ctx.fillStyle = '#c8102e'; ctx.fillRect(X(11), 0, 1.5, H); ctx.fillRect(X(189) - 1.5, 0, 1.5, H);
    ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(100), Y(42.5), Y(15), 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#c8102e'; for(const [x, y] of [[31, 20.5], [31, 64.5], [169, 20.5], [169, 64.5]]){ ctx.beginPath(); ctx.arc(X(x), Y(y), Y(15), 0, Math.PI * 2); ctx.stroke(); }
    for(const side of [0, 1]){ const gx = side ? 189 : 11, d = side ? -1 : 1; ctx.fillStyle = '#7fb2ff88'; ctx.beginPath(); ctx.arc(X(gx), Y(42.5), Y(6), d > 0 ? -Math.PI / 2 : Math.PI / 2, d > 0 ? Math.PI / 2 : Math.PI * 1.5); ctx.fill(); ctx.strokeStyle = '#c8102e'; ctx.lineWidth = 2; ctx.strokeRect(side ? X(189) : X(7), Y(39.5), X(4), Y(6)); }
    ctx.font = CANVAS_FONT(800 + ' ' + Math.round(H * .13)); ctx.textAlign = 'center'; ctx.fillStyle = st.cols[0] + '33'; ctx.fillText(st.home.abbr, X(100), Y(48)); ctx.restore();
    ctx.strokeStyle = '#9aa7c0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(1, 1, W - 2, H - 2, R); ctx.stroke();
  },
  frame(ctx, e, t, st){
    if(e.type === 'end' || e.type === 'pen') { if(e.type === 'pen'){ ctx.fillStyle = '#0008'; ctx.fillRect(0, st.H * .4, st.W, st.H * .2); ctx.fillStyle = '#fff'; ctx.font = CANVAS_FONT('700 ' + Math.round(st.H * .1)); ctx.textAlign = 'center'; ctx.fillText(`${(e.side === 0 ? st.home : st.away).abbr} penalty · 2:00`, st.W / 2, st.H * .53); } return; }
    const W = st.W, H = st.H, X = x => x / 200 * W, Y = y => y / 85 * H, s = e.side, d = s === 0 ? 1 : -1, gx = s === 0 ? 189 : 11, so = e.type === 'sogoal' || e.type === 'sosave';
    const k = easeIO(Math.min(1, t * 1.3)), r = Math.max(4, W * .013);
    const base = so ? [[100, 42.5]] : [[150, 42], [140, 22], [140, 63], [118, 30], [118, 55]].map(([x, y]) => [s === 0 ? x : 200 - x, y]);
    const att = base.map(([x, y], i) => [lerp2(x, x + d * (i < 3 ? 14 : 6), k), y + Math.sin(t * 6 + i) * 1.5]);
    const def = so ? [] : base.map(([x, y]) => [x + d * 6, y + (42.5 - y) * .25]);
    const shooter = so ? 0 : e.sh === 'D' ? 3 : e.sh === 'LW' ? 1 : e.sh === 'RW' ? 2 : 0;
    if(so) att[0] = [lerp2(100, gx - d * 12, k), 42.5 + Math.sin(t * 9) * 3];
    for(const p of def) dotP(ctx, X(p[0]), Y(p[1]), r, st.cols[1 - s], st.outl[1 - s]);
    for(const [i, p] of att.entries()) dotP(ctx, X(p[0]), Y(p[1]), r * (i === shooter ? 1.2 : 1), st.cols[s], st.outl[s]);
    const gy = e.type === 'goal' || e.type === 'sogoal' ? 42.5 + Math.sin(t * 4) * 2 : 42.5; dotP(ctx, X(gx - d * 2.5), Y(gy), r * 1.3, st.cols[1 - s], '#fff');
    let px, py; const sh = att[shooter]; const tgt = [gx, 42.5 + (e.type === 'goal' || e.type === 'sogoal' ? (Math.random() < .5 ? -1.5 : 1.5) : 0)];
    if(t < .55){ px = sh[0] + d * 1.5; py = sh[1]; } else { const f = Math.min(1, (t - .55) / .3); px = lerp2(sh[0], e.type === 'shot' || e.type === 'sosave' ? gx - d * 3 : tgt[0], f); py = lerp2(sh[1], tgt[1], f); }
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(X(px), Y(py), r * .55, r * .4, 0, 0, Math.PI * 2); ctx.fill();
    if((e.type === 'goal' || e.type === 'sogoal') && t > .85){ ctx.fillStyle = '#ff3b3b88'; ctx.fillRect(s === 0 ? X(189) : X(7), Y(39.5), X(4), Y(6)); }
  },
};

LG.hockey = {
  id:'hockey', start:41, seasonWord:'season', gameWord:'game', venue:'Arena', coachWord:'head coach', crest:'shield', starterWord:'Top line', pfWord:'Goals', pfShort:'GD',
  teams:[['Montreal', 'Voyageurs', 'MTL', '#af1e2d', '#192168', 5], ['Toronto', 'Stags', 'TOR', '#00205b', '#ffffff', 5], ['Boston', 'Grizzlies', 'BOS', '#111111', '#fcb514', 4], ['New York', 'Rangers', 'NYC', '#0038a8', '#ce1126', 5], ['Philadelphia', 'Flyers', 'PHI', '#f74902', '#111111', 4], ['Pittsburgh', 'Steelhawks', 'PIT', '#111111', '#cfc493', 3],
    ['Detroit', 'Rivermen', 'DET', '#ce1126', '#ffffff', 3], ['Chicago', 'Bisons', 'CHI', '#cf0a2c', '#111111', 4], ['Ottawa', 'Senators', 'OTT', '#c52032', '#c2912c', 2], ['Buffalo', 'Blizzard', 'BUF', '#002654', '#fcb514', 2], ['Tampa', 'Tarpons', 'TB', '#002868', '#ffffff', 3], ['Washington', 'Eagles', 'WSH', '#041e42', '#c8102e', 3],
    ['Edmonton', 'Drillers', 'EDM', '#041e42', '#ff4c00', 3], ['Calgary', 'Stampede', 'CGY', '#c8102e', '#f1be48', 3], ['Vancouver', 'Orcas', 'VAN', '#00205b', '#00843d', 4], ['Seattle', 'Kraken', 'SEA', '#001628', '#99d9d9', 3], ['Los Angeles', 'Monarchs', 'LA', '#111111', '#a2aaad', 5], ['Las Vegas', 'Knights', 'VGK', '#333f42', '#b4975a', 3],
    ['Denver', 'Avalanche', 'DEN', '#6f263d', '#236192', 3], ['Dallas', 'Stars', 'DAL', '#006847', '#8f8f8c', 4], ['Minnesota', 'Lumberjacks', 'MIN', '#154734', '#a6192e', 3], ['Winnipeg', 'Jets', 'WPG', '#041e42', '#7b303e', 2], ['St. Louis', 'Blues', 'STL', '#002f87', '#fcb514', 2], ['Phoenix', 'Coyotes', 'PHX', '#8c2633', '#e2d6b5', 2]],
  confs:['Eastern Conference', 'Western Conference'],
  pos:{C:[4, 2], LW:[4, 2], RW:[4, 2], D:[7, 4], G:[3, 1]}, posNames:{C:'Centres', LW:'Left wings', RW:'Right wings', D:'Defence', G:'Goalies'}, posSal:{C:1.05, LW:1, RW:1, D:.95, G:1.1},
  rosterMax:23, ages:[19, 39], peak:27, draftRounds:3, injRate:.0025, injPool:20, hypeMul:.45, awardMinGP:40, otl:true, points:[2, 0, 1],
  reg:{weeks:26, gpw:3}, po:{teams:16, byConf:true, bestOf:7, name:'playoffs', rounds:['First round', 'Second round', 'Conference final', 'Cup Final']}, champName:'Frost Cup',
  money:{cap:76, maxSal:16, minSal:.8, tv:120, merch:22, ticket:85, seats:[17000, 19800], seatStep:800, staff:.05, ops:22, arenaUp:70},
  stats:[['g', 'G'], ['a', 'A'], ['pts', 'PTS'], ['sog', 'SOG'], ['pim', 'PIM'], ['w', 'W'], ['sv', 'SV'], ['ga', 'GA'], ['so', 'SO'], ['gs', 'GS']],
  statLine(s, p){ if(p && p.pos === 'G'){ const sh = s.sv + s.ga; return [['GS', s.gs], ['W', s.w], ['SV%', sh ? (s.sv / sh).toFixed(3).replace(/^0/, '') : '-'], ['GAA', s.gs ? (s.ga / s.gs).toFixed(2) : '-'], ['SO', s.so]]; } return [['GP', s.gp], ['G', s.g], ['A', s.a], ['PTS', s.pts], ['SOG', s.sog]]; },
  leaders:[['g', 'Goals', false], ['a', 'Assists', false], ['pts', 'Points', false], ['pim', 'Penalty minutes', false], ['w', 'Goalie wins', false], ['sv', 'Save percentage', p => ((p.st.sv / Math.max(1, p.st.sv + p.st.ga))).toFixed(3).replace(/^0/, ''), p => p.pos === 'G' && p.st.gs >= 20], ['so', 'Shutouts', false]],
  records:[['g', 'Goals in a season'], ['a', 'Assists in a season'], ['pts', 'Points in a season'], ['w', 'Goalie wins in a season'], ['so', 'Shutouts in a season']],
  awards:[
    {k:'mvp', n:'MVP', pos:['C', 'LW', 'RW', 'D'], score:(p, t) => (p.st.pts * 1 + p.st.g * .5) / p.st.gp * 30 + lgPct(t) * 15},
    {k:'goalie', n:'Top goalie', pos:['G'], score:(p, t) => p.st.gs < 25 ? 0 : (p.st.sv / Math.max(1, p.st.sv + p.st.ga)) * 400 + p.st.w * .5},
    {k:'dman', n:'Top defenceman', pos:['D'], score:p => p.st.pts / p.st.gp * 30 + p.ovr / 4},
    {k:'roy', n:'Rookie of the Year', score:p => p.pos === 'G' ? p.st.w : p.st.pts},
  ],
  hofProd:c => c.g / 22 + c.a / 35 + c.w / 18 + c.so / 3,
  sim:hkSim, render:HK_RENDER,
};
SPORTS.hockey = lgModule('hockey');
