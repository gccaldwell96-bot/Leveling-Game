'use strict';
// =====================================================================================
//  FOOTBALL MODULE: 32-team league, play-by-play sim, playoffs, awards, offseason, finances
//  Calendar: the football year runs on fb.wk (0..51), starting the first week of September.
//    0-16 regular season · 17 Wild Card · 18 Divisional · 19 Conference · 20 Championship
//    21 offseason begins (progression, retirements, contracts expire) · 27 free agency
//    33 draft · 45 training camp · 52 → new season
// =====================================================================================
const FB_TEAMS = [ // [city, nickname, abbr, colour 1, colour 2, market size 1-5]
  ['Toronto', 'Huskies', 'TOR', '#1d3d8f', '#e8e8f0', 4], ['Milwaukee', 'Thunderbirds', 'MIL', '#0e5c46', '#f2c14e', 2], ['Cleveland', 'Ironmen', 'CLE', '#5b2a1a', '#ff7a1a', 2], ['Detroit', 'Motors', 'DET', '#0b2f5c', '#9fb6cd', 3],
  ['Boston', 'Sentinels', 'BOS', '#0a2240', '#c8102e', 4], ['Brooklyn', 'Knights', 'BKN', '#111111', '#b9975b', 5], ['Philadelphia', 'Founders', 'PHI', '#004c54', '#a5acaf', 4], ['Baltimore', 'Mariners', 'BAL', '#241773', '#9e7c0c', 3],
  ['Atlanta', 'Firebirds', 'ATL', '#a71930', '#111111', 4], ['Orlando', 'Sharks', 'ORL', '#0089cf', '#c4ced4', 3], ['Charlotte', 'Copperheads', 'CHA', '#7a3b1c', '#d7a46a', 3], ['Nashville', 'Outlaws', 'NSH', '#2b2b2b', '#e8b500', 3],
  ['Denver', 'Peaks', 'DEN', '#fb4f14', '#0a2343', 3], ['Salt Lake', 'Pioneers', 'SLC', '#203731', '#c9a227', 2], ['Phoenix', 'Scorpions', 'PHX', '#97233f', '#ffb612', 4], ['Las Vegas', 'Jackpots', 'LV', '#000000', '#c4a24a', 3],
  ['Chicago', 'Blizzard', 'CHI', '#0b162a', '#7fb2e5', 5], ['Minneapolis', 'Voyageurs', 'MIN', '#4f2683', '#ffc62f', 3], ['St. Louis', 'Stallions', 'STL', '#002244', '#b8860b', 2], ['Columbus', 'Comets', 'CLB', '#c8102e', '#041e42', 3],
  ['New York', 'Empire', 'NYE', '#0b2265', '#a71930', 5], ['Pittsburgh', 'Forge', 'PIT', '#101820', '#ffb612', 3], ['Hartford', 'Admirals', 'HFD', '#00338d', '#c60c30', 1], ['Washington', 'Monuments', 'WAS', '#5a1414', '#ffb612', 4],
  ['Houston', 'Wildcatters', 'HOU', '#03202f', '#a71930', 5], ['Dallas', 'Rattlers', 'DAL', '#003594', '#869397', 5], ['New Orleans', 'Krewe', 'NO', '#3a2a5c', '#d3bc8d', 3], ['Miami', 'Barracudas', 'MIA', '#008e97', '#fc4c02', 4],
  ['Seattle', 'Orcas', 'SEA', '#002244', '#69be28', 4], ['San Diego', 'Tritons', 'SD', '#0080c6', '#ffc20e', 4], ['Los Angeles', 'Stars', 'LA', '#1a1a2e', '#e6007e', 5], ['Portland', 'Lumberjacks', 'POR', '#2e6b30', '#f2c14e', 2],
];
const FB_CONF = ['Liberty', 'Frontier'], FB_DIV = ['North', 'East', 'South', 'West'];
const FB_POS = {QB:[3, 1], RB:[3, 1], WR:[6, 3], TE:[3, 1], OL:[9, 5], DL:[8, 4], LB:[6, 3], CB:[6, 3], S:[4, 2], K:[1, 1], P:[1, 1]}; // [roster count, starters]
const FB_POS_ORDER = Object.keys(FB_POS);
const FB_SAL = {QB:1.6, RB:.55, WR:.8, TE:.6, OL:.72, DL:.85, LB:.65, CB:.78, S:.62, K:.25, P:.2};
const FB_ROUND_NAMES = {17:'Wild Card', 18:'Divisional round', 19:'Conference championship', 20:'Grand Bowl'};
const FB_TICKETS = {cheap:{n:'Value', price:85, fill:.12}, std:{n:'Standard', price:125, fill:0}, prem:{n:'Premium', price:185, fill:-.14}};

const fb = () => S.sports.football;
const fbTeam = tid => fb().teams[tid];
const fbPlayer = pid => fb().pmap[pid];
const fbRoster = tid => fb().players.filter(p => p.tid === tid);
const fbUser = () => fb().user;
const fbName = (p, short) => short ? `${p.fn[0]}. ${p.ln}` : `${p.fn} ${p.ln}`;
const fbTeamName = t => `${t.city} ${t.name}`;
const fbPayroll = tid => fbRoster(tid).reduce((a, p) => a + p.con.amt, 0);
const fbCapRoom = tid => fb().cap - fbPayroll(tid);

function fbSalary(pos, ovr, age){ const base = FB_SAL[pos] * Math.pow(Math.max(0.6, (ovr - 45) / 10), 2.2) * 0.92; const ageF = age >= 31 ? 0.8 : age <= 24 ? 0.95 : 1; return Math.max(0.8, Math.round(base * ageF * 10) / 10); }
function fbNewPlayer(pos, opts = {}){
  const age = opts.age ?? irand(21, 33), [fn, ln] = personName().split(' ');
  let ovr = Math.round(clamp(opts.ovr ?? (60 + gauss() * 7), 35, 97));
  const upside = age <= 23 ? irand(4, 18) : age <= 26 ? irand(0, 7) : 0;
  const p = {id:uid(), fn, ln, pos, age, ovr, pot:Math.min(99, ovr + upside), tid:opts.tid ?? -1, con:{amt:0, yrs:irand(1, 4)}, inj:0, st:fbNewStats(), car:fbNewStats(), hist:[], aw:[], dr:opts.dr || null, peak:ovr};
  p.con.amt = opts.amt ?? fbSalary(pos, ovr, age);
  return p;
}
const fbNewStats = () => ({gp:0, pa:0, pc:0, py:0, ptd:0, int:0, ra:0, ry:0, rtd:0, rec:0, rcy:0, rctd:0, sk:0, dint:0, fgm:0, fga:0, xpm:0});

// ---------------- module ----------------
SPORTS.football = {
  init(S){
    const L = S.sports.football = {season:2026, wk:-1, teams:[], players:[], sched:[], po:null, user:null, cap:260, hist:{champs:[], awards:[], records:{}}, draft:null, fa:[], resign:[], lastGame:null, scout:2};
    fbIndex();
    FB_TEAMS.forEach(([city, name, abbr, c1, c2, pop], i) => {
      const q = gauss() * 2.4;
      L.teams.push({id:i, city, name, abbr, c1, c2, pop, conf:Math.floor(i / 16), div:Math.floor(i / 4), w:0, l:0, t:0, pf:0, pa:0, strk:'', hype:clamp(Math.round(50 + q * 5 + gauss() * 6), 25, 85), titles:0, seasons:[],
        coach:{name:personName(), r:irand(55, 86)}, stad:{cap:irand(62, 72), lvl:1}, tix:'std', q, fin:{rev:0, exp:0, hist:[]}});
      for(const pos of FB_POS_ORDER){ const [n, st] = FB_POS[pos];
        for(let k = 0; k < n; k++){ const starter = k < st, ovr = starter ? 71 + q + gauss() * 6 - k * 1.5 : 60 + q * 0.5 + gauss() * 6 - (k - st) * 2; fbAdd(fbNewPlayer(pos, {tid:i, ovr})); } }
    });
    for(let k = 0; k < 70; k++) fbAdd(fbNewPlayer(pick(FB_POS_ORDER.slice(0, 9)), {tid:-1, ovr:52 + gauss() * 6}));
    fbFitCaps(); fbSchedule(); fbDraftClass();
  },
  value(S, own){ const t = fbTeam(own.tid); return Math.round(1500 + t.pop * 450 + t.hype * 9 + t.titles * 150 + (t.stad.cap - 60) * 25); },
  blocker(S){ const L = fb(); if(L.user == null) return null; if(L.draft && L.draft.active && L.draft.onClock === L.user) return 'draft'; return null; },
  weekly(S){ return fbWeekly(); },
  load(S){ fbIndex(); },
};
function fbIndex(){ const L = fb(); Object.defineProperty(L, 'pmap', {value:{}, enumerable:false, writable:true, configurable:true}); for(const p of L.players) L.pmap[p.id] = p; } // lookup table, rebuilt on load (never saved)
function fbAdd(p){ fb().players.push(p); fb().pmap[p.id] = p; return p; }
function fbFitCaps(){ // trim the AI payrolls under the cap by cutting salaries of their most overpaid depth players
  const L = fb();
  for(const t of L.teams){ let over = fbPayroll(t.id) - L.cap * 0.97; if(over <= 0) continue;
    const r = fbRoster(t.id).sort((a, b) => b.con.amt - a.con.amt); for(const p of r){ if(over <= 0) break; const cut = Math.min(p.con.amt * 0.35, over); p.con.amt = Math.round((p.con.amt - cut) * 10) / 10; over -= cut; } }
}

// ---------------- schedule: 6 division games + 11 others, 17 weeks ----------------
function fbSchedule(){
  const L = fb(), N = 32, weeks = [], met = Array.from({length:N}, () => new Set());
  const rr = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
  for(let leg = 0; leg < 2; leg++) for(const round of rr){ const wk = [];
    for(let d = 0; d < 8; d++) for(const [a, b] of round){ const x = d * 4 + a, y = d * 4 + b; wk.push(leg ? {h:y, a:x} : {h:x, a:y}); met[x].add(y); met[y].add(x); }
    weeks.push(wk); }
  for(let w = 0; w < 11; w++){
    let best = null;
    for(let tries = 0; tries < 300 && !best; tries++){
      const free = shuffle([...Array(N).keys()]), wk = [], used = new Set(); let ok = true;
      for(const x of free){ if(used.has(x)) continue; const y = free.find(z => z !== x && !used.has(z) && Math.floor(z / 4) !== Math.floor(x / 4) && !met[x].has(z));
        if(y == null){ ok = false; break; } used.add(x); used.add(y); wk.push({h:x, a:y}); }
      if(ok) best = wk; }
    if(!best){ const free = shuffle([...Array(N).keys()]); best = []; for(let i = 0; i < N; i += 2) best.push({h:free[i], a:free[i + 1]}); }
    for(const g of best){ met[g.h].add(g.a); met[g.a].add(g.h); }
    weeks.push(best);
  }
  L.sched = shuffle(weeks).map((wk, i) => wk.map(g => ({...g, wk:i, s:null})));
  // balance home games: flip some non-division games so everyone has 8 or 9 home games
  const homes = Array(N).fill(0); L.sched.flat().forEach(g => homes[g.h]++);
  for(const g of L.sched.flat()){ if(Math.floor(g.h / 4) === Math.floor(g.a / 4)) continue; if(homes[g.h] > 9 && homes[g.a] < 8){ homes[g.h]--; homes[g.a]++; [g.h, g.a] = [g.a, g.h]; } }
}

// ---------------- ratings ----------------
function fbDepth(tid){
  const by = {}; for(const pos of FB_POS_ORDER) by[pos] = [];
  for(const p of fbRoster(tid)) if(!p.inj) by[p.pos].push(p);
  for(const pos of FB_POS_ORDER) by[pos].sort((a, b) => b.ovr - a.ovr);
  return by;
}
function fbStarters(tid){ const d = fbDepth(tid), out = {}; for(const pos of FB_POS_ORDER){ const n = FB_POS[pos][1]; out[pos] = d[pos].slice(0, n); while(out[pos].length < n) out[pos].push({ovr:40, ghost:true, pos, fn:'Practice', ln:'Squad', id:0}); } return out; }
function fbRatings(tid){
  const s = fbStarters(tid), avg = a => a.reduce((x, p) => x + p.ovr, 0) / a.length, c = (fbTeam(tid).coach.r - 70) / 8;
  return {s, passO:.45 * s.QB[0].ovr + .3 * avg(s.WR) + .1 * s.TE[0].ovr + .15 * avg(s.OL) + c, runO:.35 * s.RB[0].ovr + .5 * avg(s.OL) + .15 * s.TE[0].ovr + c,
    passD:.3 * avg(s.DL) + .2 * avg(s.LB) + .3 * avg(s.CB) + .2 * avg(s.S) + c, runD:.45 * avg(s.DL) + .35 * avg(s.LB) + .2 * avg(s.S) + c, k:s.K[0].ovr, p:s.P[0].ovr};
}
function fbTeamOvr(tid){ const r = fbRatings(tid); return Math.round((r.passO * 1.2 + r.runO * .8 + r.passD + r.runD) / 4); }

// ---------------- the game engine: play by play ----------------
function fbSimGame(g, record){
  const L = fb(), T = [g.h, g.a], R = T.map(fbRatings), neutral = g.neutral;
  if(!neutral){ for(const k of ['passO', 'runO', 'passD', 'runD']) R[0][k] += 1.3; }
  const sc = [0, 0], log = [], box = {}, firstRecv = Math.random() < .5 ? 0 : 1, playoff = !!g.po;
  let q = 1, clk = 900, poss = firstRecv, yl = 25, down = 1, togo = 10, ot = false, done = false, otPossessions = 0;
  const st = (p, k, v = 1) => { if(!p || p.ghost) return; (box[p.id] = box[p.id] || fbNewStats())[k] += v; };
  const nm = p => p && !p.ghost ? fbName(p, true) : 'the backup';
  const push = (type, txt, extra = {}) => { if(record) log.push({q, clk, poss, yl, down, togo, type, txt, sc:[...sc], ...extra}); };
  const wPick = (arr, w) => { const tot = w.reduce((a, b) => a + b, 0); let r = Math.random() * tot; for(let i = 0; i < arr.length; i++){ r -= w[i]; if(r <= 0) return arr[i]; } return arr[arr.length - 1]; };
  const kickoff = to => { poss = to; down = 1; togo = 10; if(Math.random() < .004){ score(to, 6, 'kick return'); push('td', `🔥 ${fbTeam(T[to]).abbr} returns the kickoff all the way for a TOUCHDOWN!`); pat(to); return; } yl = Math.random() < .7 ? 25 : irand(15, 40); push('ko', `Kickoff. ${fbTeam(T[to]).abbr} takes over at their ${yl}.`); };
  function score(side, pts){ sc[side] += pts; }
  function pat(side){ const k = R[side].s.K[0]; if(Math.random() < clamp(.93 + (k.ovr - 75) * .003, .8, .995)){ score(side, 1); st(k, 'xpm'); push('xp', `Extra point is good.`); } else push('xp', `Extra point is NO GOOD!`); if(!ot) kickoff(1 - side); }
  function turnover(newYl, txt, type){ poss = 1 - poss; yl = clamp(newYl, 1, 99); down = 1; togo = Math.min(10, 100 - yl); push(type, txt); }
  function tick(s){ clk -= s; }
  while(!done){
    if(ot && sc[0] !== sc[1]){ done = true; break; } // overtime is sudden death
    if(clk <= 0){
      if(q === 2){ q = 3; clk = 900; push('half', 'Halftime.'); kickoff(1 - firstRecv); continue; }
      if(q === 4 || q >= 5){
        if(sc[0] !== sc[1] || (q >= 5 && !playoff)){ done = true; break; }
        q++; clk = playoff ? 900 : 600; ot = true; push('ot', 'We are going to OVERTIME!'); kickoff(Math.random() < .5 ? 0 : 1); continue; }
      q++; clk = 900; push('qtr', `End of quarter ${q - 1}.`); continue;
    }
    const O = R[poss], D = R[1 - poss], off = O.s, def = D.s, lead = sc[poss] - sc[1 - poss], late = q >= 4 && clk < 300;
    // ---- 4th down ----
    if(down === 4){
      const fgDist = 117 - yl, fgOk = fgDist <= 57, goForIt = (late && lead < 0 && (lead < -3 || !fgOk)) || (togo <= 1 && yl >= 45 && yl < 70 && Math.random() < .45);
      if(!goForIt){
        if(fgOk && yl >= 55){ const k = off.K[0], pr = clamp(1 - Math.max(0, fgDist - 22) * .013 - Math.max(0, fgDist - 45) * .03 + (k.ovr - 75) * .004, .05, .99); st(k, 'fga'); tick(5);
          if(Math.random() < pr){ score(poss, 3); st(k, 'fgm'); push('fg', `${nm(k)} ${fgDist}-yard field goal is GOOD!`, {dist:fgDist, good:true}); if(!ot) kickoff(1 - poss); }
          else { push('fg', `${nm(k)} ${fgDist}-yard field goal is NO GOOD.`, {dist:fgDist, good:false}); turnover(100 - Math.max(yl, 20), `${fbTeam(T[1 - poss]).abbr} takes over.`, 'chg'); }
          continue; }
        const p = off.P[0], dist = Math.round(44 + gauss() * 6 + (p.ovr - 70) * .15), ret = irand(0, 12); tick(10);
        if(yl + dist >= 100){ push('punt', `Punt, ${dist} yards into the end zone. Touchback.`, {dist}); turnover(20, '', 'chg'); }
        else { const land = 100 - (yl + dist) + ret; push('punt', `${nm(p)} punts ${dist} yards${ret ? `, returned ${ret}` : ', fair catch'}.`, {dist}); turnover(land, '', 'chg'); }
        continue; }
    }
    // ---- play call ----
    let passP = .58 + (down >= 2 && togo >= 7 ? .2 : 0) + (down === 3 && togo >= 4 ? .1 : 0) - (togo <= 2 ? .2 : 0) + (late && lead < 0 ? .25 : 0) - (late && lead > 0 ? .3 : 0);
    if(q === 2 && clk < 30 && yl >= 60 && down < 4 && 117 - yl <= 52){ down = 4; continue; } // kick before the half
    const startYl = yl;
    if(Math.random() < passP){
      const d = (O.passO - D.passD) / 13, qb = off.QB[0];
      const sackP = clamp(.065 - .012 * d, .02, .12), intP = clamp(.024 - .006 * d, .008, .05), compP = clamp(.645 + .03 * d, .45, .8);
      const r = Math.random();
      if(r < sackP){ const who = wPick([...def.DL, ...def.LB], [...def.DL.map(p => p.ovr * 1.6), ...def.LB.map(p => p.ovr)]), loss = irand(3, 9); st(who, 'sk'); yl -= loss; tick(38);
        if(yl <= 0){ score(1 - poss, 2); push('safety', `${nm(qb)} SACKED in the end zone by ${nm(who)}. SAFETY!`, {who:who.id}); kickoff(poss); continue; }
        push('sack', `${nm(qb)} sacked by ${nm(who)} for a loss of ${loss}.`, {yds:-loss, from:startYl}); }
      else if(r < sackP + intP){ st(qb, 'pa'); st(qb, 'int'); const who = wPick([...def.CB, ...def.S, ...def.LB], [...def.CB.map(p => p.ovr * 1.4), ...def.S.map(p => p.ovr * 1.2), ...def.LB.map(p => p.ovr * .4)]); st(who, 'dint');
        const air = irand(8, 30), spot = yl + air, back = irand(0, 25); tick(20);
        if(Math.random() < .05){ score(1 - poss, 6); push('pick6', `INTERCEPTED by ${nm(who)} and he takes it back for a TOUCHDOWN!`, {air, from:startYl}); poss = 1 - poss; pat(poss); continue; }
        turnover(100 - spot + back, `INTERCEPTED! ${nm(who)} picks off ${nm(qb)}.`, 'int'); log.length && (log[log.length - 1].air = air, log[log.length - 1].from = startYl); }
      else {
        const tgts = [...off.WR, off.TE[0], off.RB[0]], tw = [...off.WR.map((p, i) => [3.2, 2.4, 1.6][i] * (p.ovr / 70)), 1.5 * off.TE[0].ovr / 70, 1.1];
        const who = wPick(tgts, tw); st(qb, 'pa');
        if(Math.random() < compP){
          const rr = Math.random(); let yds = rr < .58 ? irand(3, 10) : rr < .9 ? irand(11, 20) : irand(21, 48); yds += Math.round(d * .7 + (who.ovr - 75) * .04 + (Math.random() < .035 ? irand(8, 35) : 0));
          yds = Math.max(-2, Math.min(yds, 100 - yl)); yl += yds; st(qb, 'pc'); st(qb, 'py', yds); st(who, 'rec'); st(who, 'rcy', yds); tick(irand(34, 44));
          if(yl >= 100){ st(qb, 'ptd'); st(who, 'rctd'); score(poss, 6); push('td', `${nm(qb)} hits ${nm(who)} for a ${yds}-yard TOUCHDOWN!`, {yds, from:startYl, who:who.id, pos:who.pos}); pat(poss); continue; }
          push('pass', `${nm(qb)} to ${nm(who)} for ${yds} yards.`, {yds, from:startYl, who:who.id, pos:who.pos}); down++; togo -= yds; }
        else { tick(12); push('inc', `${nm(qb)} incomplete, intended for ${nm(who)}.`, {from:startYl, air:irand(6, 22), pos:who.pos}); down++; }
      }
    } else {
      const d = (O.runO - D.runD) / 13, rb = Math.random() < .9 ? off.RB[0] : off.QB[0];
      let yds = Math.round(4.0 + .55 * d + gauss() * 3.6); if(Math.random() < .04) yds += irand(10, 55); yds = Math.max(-4, Math.min(yds, 100 - yl)); tick(irand(37, 46));
      st(rb, 'ra'); st(rb, 'ry', yds);
      if(Math.random() < .011){ yl += Math.max(0, yds); turnover(100 - yl, `FUMBLE! ${nm(rb)} coughs it up and the defense recovers.`, 'fum'); continue; }
      yl += yds;
      if(yl >= 100){ st(rb, 'rtd'); score(poss, 6); push('td', `${nm(rb)} runs it in from ${yds} yards out. TOUCHDOWN!`, {yds, from:startYl, run:true}); pat(poss); continue; }
      if(yl <= 0){ score(1 - poss, 2); push('safety', `${nm(rb)} tackled in the end zone. SAFETY!`, {from:startYl, run:true}); kickoff(poss); continue; }
      push('run', `${nm(rb)} runs for ${yds} yard${Math.abs(yds) === 1 ? '' : 's'}.`, {yds, from:startYl, run:true}); down++; togo -= yds;
    }
    if(togo <= 0){ down = 1; togo = Math.min(10, 100 - yl); if(record && log.length) log[log.length - 1].first = true; }
    else if(down > 4){ turnover(100 - yl, `Turnover on downs!`, 'downs'); }
  }
  return {sc, log, box, ot};
}
function fbApplyGame(g, res){
  const L = fb(), H = fbTeam(g.h), A = fbTeam(g.a); g.s = res.sc; g.ot = res.ot;
  for(const pid in res.box){ const p = fbPlayer(pid); if(!p) continue; const b = res.box[pid]; p.st.gp++; for(const k in b) p.st[k] += b[k]; }
  for(const tid of [g.h, g.a]) for(const p of Object.values(fbStarters(tid)).flat()) if(!p.ghost && !res.box[p.id]) p.st.gp++;
  // injuries
  for(const tid of [g.h, g.a]) for(const p of Object.values(fbStarters(tid)).flat()) if(!p.ghost && Math.random() < .011){ p.inj = Math.random() < .12 ? irand(8, 17) : irand(1, 5); if(tid === L.user) news(`🤕 ${fbName(p)} (${p.pos}) is injured: out ${p.inj} week${p.inj > 1 ? 's' : ''}.`, 'bad', 'football'); }
  if(g.po) return;
  const [hs, as] = res.sc; H.pf += hs; H.pa += as; A.pf += as; A.pa += hs;
  if(hs === as){ H.t++; A.t++; }
  else { const W = hs > as ? H : A, Lo = hs > as ? A : H; W.w++; Lo.l++; W.hype = clamp(W.hype + 1.6, 5, 100); Lo.hype = clamp(Lo.hype - 1.2, 5, 100); W.strk = W.strk[0] === 'W' ? 'W' + (+W.strk.slice(1) + 1) : 'W1'; Lo.strk = Lo.strk[0] === 'L' ? 'L' + (+Lo.strk.slice(1) + 1) : 'L1'; }
}
const fbPct = t => (t.w + t.t * .5) / Math.max(1, t.w + t.l + t.t);
function fbStandings(conf){ return fb().teams.filter(t => conf == null || t.conf === conf).sort((a, b) => fbPct(b) - fbPct(a) || (b.pf - b.pa) - (a.pf - a.pa) || b.pf - a.pf); }
function fbDivStandings(div){ return fbStandings().filter(t => t.div === div); }

// ---------------- playoffs ----------------
function fbSeeds(conf){
  const ts = fbStandings(conf), divWinners = [0, 1, 2, 3].map(d => fbDivStandings(conf * 4 + d)[0]);
  const top = [...divWinners].sort((a, b) => fbPct(b) - fbPct(a) || (b.pf - b.pa) - (a.pf - a.pa));
  const wild = ts.filter(t => !divWinners.includes(t)).slice(0, 3);
  return [...top, ...wild].map(t => t.id);
}
function fbStartPlayoffs(){
  const L = fb(); L.po = {seeds:[fbSeeds(0), fbSeeds(1)], rounds:{}, alive:[[], []], champ:null};
  for(let c = 0; c < 2; c++) L.po.alive[c] = [...L.po.seeds[c]];
  for(const t of L.teams) t.poRes = null;
  for(let c = 0; c < 2; c++) L.po.seeds[c].forEach((tid, i) => { fbTeam(tid).poRes = 'made'; if(i < 4) fbTeam(tid).divTitle = true; });
  L.po.rounds[17] = [];
  for(let c = 0; c < 2; c++){ const s = L.po.seeds[c]; for(const [a, b] of [[1, 6], [2, 5], [3, 4]]) L.po.rounds[17].push({h:s[a], a:s[b], po:17, c}); }
  const u = L.user; if(u != null){ const made = L.po.seeds.flat().includes(u); news(made ? `🎟️ ${fbTeamName(fbTeam(u))} are IN the playoffs as the #${L.po.seeds[fbTeam(u).conf].indexOf(u) + 1} seed!` : `${fbTeamName(fbTeam(u))} missed the playoffs this year.`, made ? 'good' : 'bad', 'football'); }
}
function fbNextRound(r){
  const L = fb(), seedOf = (c, tid) => L.po.seeds[c].indexOf(tid);
  if(r === 18){ L.po.rounds[18] = []; for(let c = 0; c < 2; c++){ const alive = L.po.alive[c].sort((a, b) => seedOf(c, a) - seedOf(c, b)); L.po.rounds[18].push({h:alive[0], a:alive[3], po:18, c}, {h:alive[1], a:alive[2], po:18, c}); } }
  if(r === 19){ L.po.rounds[19] = []; for(let c = 0; c < 2; c++){ const alive = L.po.alive[c].sort((a, b) => seedOf(c, a) - seedOf(c, b)); L.po.rounds[19].push({h:alive[0], a:alive[1], po:19, c}); } }
  if(r === 20){ L.po.rounds[20] = [{h:L.po.alive[0][0], a:L.po.alive[1][0], po:20, neutral:true}]; }
}
function fbFinishPlayoffGame(g){
  const L = fb(), win = g.s[0] > g.s[1] ? g.h : g.a, lose = win === g.h ? g.a : g.h;
  const c = g.c ?? null; if(c != null) L.po.alive[c] = L.po.alive[c].filter(t => t !== lose);
  fbTeam(lose).poRes = FB_ROUND_NAMES[g.po]; fbTeam(win).hype = clamp(fbTeam(win).hype + 4, 0, 100);
  if(g.po === 20){ L.po.champ = win; fbTeam(win).poRes = 'Champions'; fbTeam(win).titles++; fbTeam(win).hype = clamp(fbTeam(win).hype + 15, 0, 100); }
  if(win === L.user){ ach('playoffwin'); if(g.po === 19) ach('confchamp'); }
}

// ---------------- the weekly turn ----------------
function fbUserGame(){ const L = fb(), u = L.user; if(u == null) return null; const mine = g => g.h === u || g.a === u; if(L.wk >= 0 && L.wk <= 16) return L.sched[L.wk].find(mine) || null; const r = L.po && L.po.rounds[L.wk]; return r ? r.find(mine) || null : null; }
function fbPendingGames(){ const L = fb(); if(L.wk >= 0 && L.wk <= 16) return L.sched[L.wk].filter(g => !g.s); const r = L.po && L.po.rounds[L.wk]; return r ? r.filter(g => !g.s) : []; }
function fbPlayGame(g, record){ const res = fbSimGame(g, record); fbApplyGame(g, res); if(g.po) fbFinishPlayoffGame(g); if(g.h === fb().user || g.a === fb().user) fbUserResult(g); return res; }
function fbUserResult(g){
  const L = fb(), u = L.user, mine = g.h === u ? 0 : 1, us = g.s[mine], them = g.s[1 - mine], opp = fbTeam(mine ? g.h : g.a), won = us > them;
  L.lastGame = {wk:L.wk, opp:opp.id, us, them, home:!mine, po:g.po || 0, ot:g.ot};
  news(`${won ? '✅ WIN' : us === them ? '🤝 TIE' : '❌ LOSS'} ${us}-${them} ${mine ? '@' : 'vs'} ${opp.abbr}${g.ot ? ' (OT)' : ''}${g.po ? ` · ${FB_ROUND_NAMES[g.po]}` : ''}`, won ? 'good' : 'bad', 'football');
  if(won) ach('win1');
}
function fbWeekly(){
  const L = fb(), wk = L.wk, rep = {sport:'football', lines:[]};
  if(wk >= 0 && wk <= 20){
    for(const g of fbPendingGames()) fbPlayGame(g, false);
    for(const p of L.players) if(p.inj > 0) p.inj--;
    if(wk === 16){ fbRegularSeasonEnd(); fbStartPlayoffs(); } // next week's games exist a week ahead, so you can watch them
    else if(wk >= 17 && wk <= 19) fbNextRound(wk + 1);
    if(wk === 20) fbSeasonEnd();
  }
  if(wk === 21) fbOffseasonStart();
  if(wk === 27) fbFreeAgencyOpen();
  if(wk >= 27 && wk <= 32) fbAIFreeAgency(wk === 32 ? 1 : 0.35);
  if(wk === 33) fbDraftStart();
  if(wk === 45) fbTrainingCamp();
  if(L.user != null) fbFinances(wk);
  for(const t of L.teams) if(wk > 21) t.hype += (50 - t.hype) * 0.01;
  L.wk++;
  if(L.wk >= 52) fbNewSeason();
  return rep;
}
function fbRegularSeasonEnd(){
  const L = fb(), u = L.user; if(u == null) return; const t = fbTeam(u);
  if(t.w > t.l) ach('winseason');
  const divWin = fbDivStandings(t.div)[0].id === u; if(divWin) ach('divtitle');
}
function fbSeasonEnd(){
  const L = fb(), champ = fbTeam(L.po.champ);
  L.hist.champs.unshift({y:L.season, tid:champ.id, name:fbTeamName(champ), abbr:champ.abbr, c1:champ.c1, rec:`${champ.w}-${champ.l}${champ.t ? '-' + champ.t : ''}`, runner:fbTeam(L.po.rounds[20][0].h === champ.id ? L.po.rounds[20][0].a : L.po.rounds[20][0].h).abbr, score:L.po.rounds[20][0].s});
  news(`🏆 ${fbTeamName(champ)} win the ${L.season} Grand Bowl!`, champ.id === L.user ? 'good' : 'info', 'football');
  // awards
  const score = p => { const s = p.st, t = fbTeam(p.tid) || {w:0}; if(p.pos === 'QB') return s.py / 45 + s.ptd * 4 - s.int * 3 + t.w * 4; if(p.pos === 'RB') return (s.ry + s.rcy) / 18 + (s.rtd + s.rctd) * 4 + t.w * 2; if(['WR', 'TE'].includes(p.pos)) return s.rcy / 17 + s.rctd * 4 + t.w * 1.5; return 0; };
  const dscore = p => p.st.sk * 4 + p.st.dint * 5 + p.ovr / 6 + (fbTeam(p.tid) || {w:0}).w;
  const act = L.players.filter(p => p.tid >= 0 && p.st.gp > 6);
  const best = (arr, f) => arr.sort((a, b) => f(b) - f(a))[0];
  const mvp = best(act.filter(p => ['QB', 'RB', 'WR', 'TE'].includes(p.pos)), score), opoy = best(act.filter(p => ['RB', 'WR', 'TE'].includes(p.pos) && p !== mvp), score), dpoy = best(act.filter(p => ['DL', 'LB', 'CB', 'S'].includes(p.pos)), dscore);
  const rooks = act.filter(p => p.dr && p.dr.y === L.season), roy = best(rooks, p => ['DL', 'LB', 'CB', 'S'].includes(p.pos) ? dscore(p) * 1.4 : score(p));
  const aw = {y:L.season, mvp, opoy, dpoy, roy};
  const row = {y:L.season}; for(const k of ['mvp', 'opoy', 'dpoy', 'roy']){ const p = aw[k]; if(!p) continue; p.aw.push({y:L.season, a:k}); row[k] = {id:p.id, n:fbName(p), pos:p.pos, tid:p.tid, abbr:fbTeam(p.tid).abbr};
    if(p.tid === L.user && k === 'mvp'){ ach('mvp'); if(p.dr && p.dr.tid === L.user) ach('draftstar'); } }
  L.hist.awards.unshift(row);
  if(mvp) news(`🏅 ${L.season} MVP: ${fbName(mvp)} (${mvp.pos}, ${fbTeam(mvp.tid).abbr})`, mvp.tid === L.user ? 'good' : 'info', 'football');
  // team seasons + owner trophies
  for(const t of L.teams) t.seasons.unshift({y:L.season, w:t.w, l:t.l, t:t.t, pf:t.pf, pa:t.pa, po:t.poRes || ''});
  const u = L.user; if(u != null){ const t = fbTeam(u);
    if(champ.id === u){ S.trophies.unshift({sport:'football', kind:'title', y:L.season, n:`${L.season} Grand Bowl champions`, team:fbTeamName(t)}); ach('title');
      const titles = t.seasons.filter(s => s.po === 'Champions').map(s => s.y); if(titles.includes(L.season - 1)) ach('b2b'); if(titles.filter(y => y > L.season - 5).length >= 3) ach('dynasty'); if(t.l === 0 && t.t === 0) ach('perfect');
      S.fame += 100; }
    else if(t.poRes){ S.fame += 15; }
    if(t.seasons[0].po === 'Grand Bowl') S.trophies.unshift({sport:'football', kind:'conf', y:L.season, n:`${L.season} ${FB_CONF[t.conf]} Conference champions`, team:fbTeamName(t)}); }
  // records
  const R = L.hist.records; for(const p of act){ for(const [k, lab] of [['py', 'Passing yards'], ['ptd', 'Passing TDs'], ['ry', 'Rushing yards'], ['rcy', 'Receiving yards'], ['sk', 'Sacks'], ['dint', 'Interceptions']]){ if(!R[k] || p.st[k] > R[k].v) R[k] = {v:p.st[k], n:fbName(p), abbr:fbTeam(p.tid).abbr, y:L.season, lab}; } }
}
function fbOffseasonStart(){
  const L = fb();
  // archive season stats, age & progress, retire
  for(const p of L.players){
    if(p.tid >= -1 && p.st.gp) p.hist.unshift({y:L.season, tid:p.tid, ovr:p.ovr, st:{...p.st}});
    for(const k in p.st) p.car[k] += p.st[k]; p.st = fbNewStats();
  }
  const retired = [];
  for(const p of L.players){
    if(p.tid < -1) continue;
    p.age++;
    const coach = p.tid >= 0 ? (fbTeam(p.tid).coach.r - 70) / 15 : 0, late = ['QB', 'K', 'P'].includes(p.pos) ? 3 : p.pos === 'RB' ? -2 : 0, a = p.age - late;
    let d = a <= 22 ? irand(1, 6) : a <= 25 ? irand(0, 5) : a <= 29 ? irand(-1, 2) : a <= 32 ? irand(-4, 0) : irand(-7, -1);
    d = Math.round(d + coach + gauss() * .8); if(d > 0 && p.ovr + d > p.pot + 2) d = Math.max(0, p.pot + 2 - p.ovr);
    p.ovr = clamp(p.ovr + d, 30, 99); p.peak = Math.max(p.peak || 0, p.ovr); if(p.pot < p.ovr) p.pot = p.ovr;
    const old = p.age - late;
    if(old >= 36 || (old >= 33 && Math.random() < .35) || (old >= 30 && p.ovr < 58 && Math.random() < .5) || (p.tid === -1 && p.age >= 30 && Math.random() < .5)) retired.push(p);
  }
  for(const p of retired){ const wasUser = p.tid === L.user; p.tid = -3; p.retY = L.season;
    const hof = fbHofScore(p); if(hof >= 70){ p.hof = L.season + 1; news(`🏛️ ${fbName(p)} (${p.pos}) retires and is headed to the Hall of Fame!`, 'info', 'football'); if(p.hist.some(h => h.tid === L.user)) ach('hof'); }
    else if(wasUser) news(`👋 ${fbName(p)} (${p.pos}, ${p.age}) has retired.`, 'info', 'football'); }
  L.players = L.players.filter(p => p.tid !== -3 || p.hof); fbIndex();
  // contracts tick down; expiring deals
  L.resign = [];
  for(const p of L.players){ if(p.tid < 0) continue; p.con.yrs--; if(p.con.yrs > 0) continue;
    const ask = Math.round(fbSalary(p.pos, p.ovr, p.age) * rand(1, 1.2) * 10) / 10;
    if(p.tid === L.user){ L.resign.push({id:p.id, ask, yrs:p.age >= 30 ? irand(1, 2) : irand(2, 5)}); continue; }
    const keep = p.ovr >= 66 && p.age <= 31 && Math.random() < .75 && fbCapRoom(p.tid) > ask; if(keep){ p.con = {amt:ask, yrs:irand(1, 4)}; } else { p.tid = -1; p.ask = ask; } }
  if(L.user != null && L.resign.length) news(`✍️ ${L.resign.length} of your players' contracts have expired. Re-sign them in the Offseason tab before free agency opens.`, 'info', 'football');
  L.cap = Math.round(L.cap * 1.04);
}
function fbHofScore(p){ const c = p.car, aw = p.aw.filter(a => a.a === 'mvp').length * 20 + p.aw.filter(a => a.a !== 'mvp').length * 8;
  const seasons90 = p.hist.filter(h => h.ovr >= 88).length * 6, prod = c.py / 1200 + c.ptd * .6 + (c.ry + c.rcy) / 450 + (c.rtd + c.rctd) * 1.1 + c.sk * 1.4 + c.dint * 2.2; return aw + seasons90 + prod; }
function fbFreeAgencyOpen(){
  const L = fb();
  for(const r of L.resign){ const p = fbPlayer(r.id); if(p && p.tid === L.user && p.con.yrs <= 0){ p.tid = -1; p.ask = r.ask; news(`${fbName(p)} (${p.pos}) left as a free agent.`, 'bad', 'football'); } }
  L.resign = [];
  for(const p of L.players) if(p.tid === -1 && !p.ask) p.ask = fbSalary(p.pos, p.ovr, p.age);
  news('📝 Free agency is open! Sign players in the Offseason tab.', 'info', 'football');
}
function fbNeeds(tid){ const d = fbDepth(tid), need = []; for(const pos of FB_POS_ORDER){ const [n, st] = FB_POS[pos]; const have = d[pos].length, weak = st - d[pos].slice(0, st).filter(p => p.ovr >= 62).length; if(have < n || weak > 0) need.push(pos); } return need; }
function fbAIFreeAgency(frac){
  const L = fb(), fa = L.players.filter(p => p.tid === -1).sort((a, b) => b.ovr - a.ovr);
  for(const t of shuffle([...L.teams])){ if(t.id === L.user) continue;
    let room = fbCapRoom(t.id), roster = fbRoster(t.id).length;
    for(const pos of fbNeeds(t.id)){ if(Math.random() > frac || roster >= 53) continue; const p = fa.find(x => x.tid === -1 && x.pos === pos && x.ask <= room - 2); if(!p) continue;
      p.tid = t.id; p.con = {amt:p.ask, yrs:irand(1, 4)}; room -= p.ask; roster++; } }
}
function fbFreeAgentInterest(p){ const t = fbTeam(fb().user); return clamp(1 + (t.hype - 50) / 250 + (fbPct(t) - .5) * .15, .85, 1.2); }
function fbOfferFA(pid, amt, yrs){ const L = fb(), p = fbPlayer(pid); if(!p || p.tid !== -1) return 'gone';
  if(fbRoster(L.user).length >= 53) return 'roster'; if(amt > fbCapRoom(L.user)) return 'cap';
  const needed = p.ask / fbFreeAgentInterest(p); if(amt < needed * (yrs >= 4 && p.age >= 29 ? .95 : 1)) return 'low';
  p.tid = L.user; p.con = {amt, yrs}; p.ask = 0; news(`✍️ Signed ${fbName(p)} (${p.pos}, ${p.ovr}) for ${money(amt)}/yr × ${yrs}.`, 'good', 'football'); return 'ok'; }
function fbResign(pid, accept){ const L = fb(), r = L.resign.find(x => x.id === pid), p = fbPlayer(pid); if(!r || !p) return;
  if(accept){ if(r.ask > fbCapRoom(L.user) + p.con.amt) return 'cap'; p.con = {amt:r.ask, yrs:r.yrs}; news(`✍️ Re-signed ${fbName(p)} for ${money(r.ask)}/yr × ${r.yrs}.`, 'good', 'football'); }
  else { p.tid = -1; p.ask = r.ask; news(`${fbName(p)} will test free agency.`, 'info', 'football'); }
  L.resign = L.resign.filter(x => x.id !== pid); return 'ok'; }

// ---------------- draft ----------------
function fbDraftClass(){ const L = fb(), cls = [];
  for(let k = 0; k < 190; k++){ const pos = pick(['QB', 'RB', 'WR', 'WR', 'TE', 'OL', 'OL', 'DL', 'DL', 'LB', 'CB', 'CB', 'S', 'K', 'P', 'WR', 'OL', 'DL', 'LB', 'RB']);
    const top = Math.random() < .12, p = fbNewPlayer(pos, {tid:-2, age:irand(21, 23), ovr:top ? 64 + gauss() * 5 : 50 + gauss() * 7}); p.pot = clamp(p.ovr + irand(top ? 8 : 4, top ? 30 : 24), p.ovr, 99); p.scoutErr = gauss() * 4; cls.push(p); fbAdd(p); }
  L.draftYear = L.season + 1; }
function fbProspectRange(p){ const err = Math.max(1, 11 - fb().scout * 2.2), mid = p.pot + p.scoutErr * (err / 6); return [Math.round(clamp(mid - err, p.ovr, 99)), Math.round(clamp(mid + err, p.ovr, 99))]; }
function fbDraftStart(){
  const L = fb(), order = [...L.teams].sort((a, b) => { const rank = t => t.poRes === 'Champions' ? 6 : t.poRes === 'Grand Bowl' ? 5 : t.poRes === 'Conference championship' ? 4 : t.poRes === 'Divisional round' ? 3 : t.poRes === 'Wild Card' ? 2 : t.poRes === 'made' ? 2 : 0;
    return rank(a) - rank(b) || fbPct(a) - fbPct(b) || (a.pf - a.pa) - (b.pf - b.pa); }).map(t => t.id);
  const picks = []; for(let r = 1; r <= 4; r++) order.forEach((tid, i) => picks.push({r, n:i + 1, tid, pid:null}));
  L.draft = {active:true, picks, at:0, onClock:null, y:L.draftYear};
  fbDraftAdvance();
  news(`🎓 ${L.draftYear} Draft is underway! ${L.user != null ? `Your first pick: #${picks.findIndex(p => p.tid === L.user) + 1}.` : ''}`, 'info', 'football');
}
function fbDraftValue(p, tid){ const need = fbNeeds(tid).includes(p.pos) ? 6 : 0, posAdj = {QB:4, K:-12, P:-14}[p.pos] || 0; return p.pot * .62 + p.ovr * .45 + need + posAdj + gauss() * 3; }
function fbDraftAdvance(){ // let AI teams pick until it's the user's turn (or the draft ends)
  const L = fb(), D = L.draft;
  while(D.at < D.picks.length){ const pk = D.picks[D.at];
    if(pk.tid === L.user){ D.onClock = L.user; return; }
    const pool = L.players.filter(p => p.tid === -2); if(!pool.length) break;
    const best = pool.sort((a, b) => fbDraftValue(b, pk.tid) - fbDraftValue(a, pk.tid))[0]; fbDraftPick(best.id); }
  if(D.at >= D.picks.length) fbDraftEnd();
}
function fbDraftPick(pid){ const L = fb(), D = L.draft, pk = D.picks[D.at], p = fbPlayer(pid); if(!p || p.tid !== -2) return;
  const slot = (pk.r - 1) * 32 + pk.n; p.tid = pk.tid; p.dr = {y:D.y, r:pk.r, n:pk.n, tid:pk.tid}; p.con = {amt:Math.round(Math.max(.9, pk.r === 1 ? 10 - slot * .22 : 1.6 - pk.r * .15) * 10) / 10, yrs:4};
  pk.pid = pid; D.at++; D.onClock = null;
  if(pk.tid === L.user) news(`🎓 You drafted ${fbName(p)} (${p.pos}) at #${slot}, round ${pk.r}.`, 'good', 'football'); }
function fbDraftEnd(){ const L = fb(); L.draft.active = false; L.draft.onClock = null;
  for(const p of L.players) if(p.tid === -2){ p.tid = -1; p.ask = .9; } // undrafted → free agents
  news('🎓 The draft is complete. Undrafted rookies are now free agents.', 'info', 'football'); }
function fbTrainingCamp(){ // rosters to 46–53
  const L = fb();
  for(const t of L.teams){ let r = fbRoster(t.id);
    if(r.length > 53){ r.sort((a, b) => a.ovr - b.ovr).slice(0, r.length - 53).forEach(p => { p.tid = -1; p.ask = fbSalary(p.pos, p.ovr, p.age); }); if(t.id === L.user) news(`✂️ Roster cut to 53: released your lowest-rated players.`, 'info', 'football'); }
    for(const pos of FB_POS_ORDER){ const n = FB_POS[pos][0]; let have = fbRoster(t.id).filter(p => p.pos === pos).length;
      while(have < Math.max(FB_POS[pos][1] + 1, n - 1)){ const fa = L.players.filter(p => p.tid === -1 && p.pos === pos && (p.ask || 0) <= 1.5).sort((a, b) => b.ovr - a.ovr)[0]; const p = fa || fbAdd(fbNewPlayer(pos, {tid:-1, ovr:48 + gauss() * 5, age:irand(22, 27)})); p.tid = t.id; p.con = {amt:.9, yrs:1}; have++; } } }
}
function fbNewSeason(){
  const L = fb(); L.wk = 0; L.season++; L.po = null; L.lastGame = null;
  for(const t of L.teams){ Object.assign(t, {w:0, l:0, t:0, pf:0, pa:0, strk:'', poRes:null, divTitle:false}); }
  for(const p of L.players) if(p.tid === -1 && p.age >= 33) p.tid = -4; // old free agents quietly retire
  L.players = L.players.filter(p => p.tid !== -4); fbIndex();
  fbSchedule(); fbDraftClass();
  news(`🏈 The ${L.season} season kicks off!`, 'info', 'football');
}

// ---------------- trades ----------------
function fbTradeValue(p){ const ageF = p.age <= 25 ? 1.15 : p.age <= 29 ? 1 : p.age <= 32 ? .7 : .45, posF = {QB:1.6, K:.3, P:.25, RB:.8}[p.pos] || 1;
  return Math.pow(Math.max(0, p.ovr - 45), 2) * ageF * posF + Math.max(0, p.pot - p.ovr) * 6 * (p.age <= 25) - p.con.amt * 6; }
function fbTradeEval(give, get, tid){ // give: user players, get: their players
  const L = fb(), gv = give.reduce((a, id) => a + fbTradeValue(fbPlayer(id)), 0), tv = get.reduce((a, id) => a + fbTradeValue(fbPlayer(id)), 0);
  const userPay = fbPayroll(L.user) - get.reduce((a, id) => a - fbPlayer(id).con.amt, 0) - give.reduce((a, id) => a + fbPlayer(id).con.amt, 0);
  const theirPay = fbPayroll(tid) + give.reduce((a, id) => a + fbPlayer(id).con.amt, 0) - get.reduce((a, id) => a + fbPlayer(id).con.amt, 0);
  const capOk = userPay <= L.cap && theirPay <= L.cap, rostOk = fbRoster(L.user).length - give.length + get.length <= 53 && fbRoster(tid).length + give.length - get.length <= 53;
  return {gv, tv, ok:capOk && rostOk && gv >= tv * 1.06 + 20, capOk, rostOk, margin:gv - (tv * 1.06 + 20)}; }
function fbDoTrade(give, get, tid){ const L = fb(); for(const id of give) fbPlayer(id).tid = tid; for(const id of get) fbPlayer(id).tid = L.user;
  news(`🔁 Trade with ${fbTeam(tid).abbr}: sent ${give.map(id => fbName(fbPlayer(id), true)).join(', ')} for ${get.map(id => fbName(fbPlayer(id), true)).join(', ')}.`, 'info', 'football'); }
const fbTradeOpen = () => { const w = fb().wk; return w < 9 || w > 21; };

// ---------------- franchise finances (your team only; all amounts in $M) ----------------
function fbHomeGame(wk){ const L = fb(); if(wk >= 0 && wk <= 16) return L.sched[wk].some(g => g.h === L.user); const r = L.po && L.po.rounds[wk]; return !!(r && r.some(g => g.h === L.user && !g.neutral)); }
function fbFill(t){ const tk = FB_TICKETS[t.tix]; return clamp(.5 + t.hype * .0055 + (fbPct(t) - .5) * .35 + tk.fill + (t.pop - 3) * .02, .3, 1); }
function fbFinances(wk){
  const L = fb(), t = fbTeam(L.user), f = t.fin, lines = [];
  let rev = 0, exp = 0;
  const tv = 300 / 52; rev += tv; lines.push(['TV & league share', tv]);
  const merch = (.6 + t.hype / 70) * (.6 + t.pop * .2); rev += merch; lines.push(['Merchandise', merch]);
  if(fbHomeGame(wk)){ const fill = fbFill(t), seats = t.stad.cap * 1000 * fill, gate = seats * FB_TICKETS[t.tix].price / 1e6 * (wk > 16 ? 1.6 : 1), boxes = (t.stad.lvl - 1) * 1.5; rev += gate + boxes; lines.push([`Home game: ${Math.round(seats).toLocaleString()} fans (${Math.round(fill * 100)}%)`, gate + boxes]); }
  if(wk >= 0 && wk <= 16){ const pay = fbPayroll(L.user) / 17; exp += pay; lines.push(['Player payroll', -pay]); }
  const staff = (t.coach.r * .09 + L.scout * 1.2 + 4) / 52; exp += staff; lines.push(['Coaches & scouts', -staff]);
  const ops = .55 + t.stad.cap * .007; exp += ops; lines.push(['Stadium & operations', -ops]);
  S.cash += rev - exp; f.rev += rev; f.exp += exp; f.last = lines;
  if(wk === 51){ f.hist.unshift({y:L.season, rev:f.rev, exp:f.exp}); f.rev = 0; f.exp = 0; }
}
const FB_STADIUM_UP = lvl => 120 + lvl * 80;
function fbUpgradeStadium(){ const t = fbTeam(fb().user), c = FB_STADIUM_UP(t.stad.lvl); if(S.cash < c) return false; S.cash -= c; t.stad.lvl++; t.stad.cap += 5; news(`🏟️ Stadium expanded to ${t.stad.cap},000 seats with new luxury boxes.`, 'good', 'football'); return true; }
function fbCoachCandidates(){ const L = fb(); if(!L.coachPool || L.coachPool.y !== L.season) L.coachPool = {y:L.season, list:Array.from({length:4}, () => { const r = irand(58, 94); return {name:personName(), r, fee:Math.round((r - 50) * 1.4)}; })}; return L.coachPool.list; }
function fbHireCoach(i){ const L = fb(), c = fbCoachCandidates()[i], t = fbTeam(L.user); if(!c || S.cash < c.fee) return false; S.cash -= c.fee; news(`📋 Hired head coach ${c.name} (${c.r}).`, 'good', 'football'); t.coach = {name:c.name, r:c.r}; L.coachPool.list.splice(i, 1); return true; }
