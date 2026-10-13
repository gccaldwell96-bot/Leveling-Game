'use strict';
// =====================================================================================
//  TEAM-LEAGUE ENGINE shared by basketball, hockey, soccer, baseball, rugby and esports.
//  A sport supplies a config (teams, positions, money, calendar, sim, awards, renderer);
//  the engine runs the league: schedule, standings, playoffs, awards, aging, contracts,
//  draft, free agency, trades, finances, and the owner's share.
//
//  Calendar (lg.wk, 0..51, week 0 = cfg.start week of the year):
//    0..R-1 regular season · R..R+P-1 playoffs · R+P season ends (awards, aging, contracts)
//    R+P+1 draft · R+P+3 free agency opens (AI signs for 6 weeks) · 50 camp · 52 → new season
// =====================================================================================
const LG = {}; // sport id -> config
const lg = sp => S.sports[sp];
const lgCfg = sp => LG[sp];
const lgTeam = (sp, tid) => lg(sp).teams[tid];
const lgPlayer = (sp, pid) => lg(sp).pmap[pid];
const lgRoster = (sp, tid) => lg(sp).players.filter(p => p.tid === tid);
const lgName = (p, short) => short ? `${p.fn[0]}. ${p.ln}` : `${p.fn} ${p.ln}`;
const lgTeamName = t => `${t.city} ${t.name}`;
const lgPayroll = (sp, tid) => lgRoster(sp, tid).reduce((a, p) => a + p.con.amt, 0);
const lgCapRoom = (sp, tid) => lg(sp).cap - lgPayroll(sp, tid);
const lgCtrl = sp => lg(sp).user != null && inCtrl(sp);
const lgR = sp => LG[sp].reg.weeks, lgP = sp => LG[sp].po ? LG[sp].po.rounds.length : 0;
const lgEnd = sp => lgR(sp) + lgP(sp);
const lgSeasonLabel = sp => { const L = lg(sp), c = LG[sp]; return c.start >= 30 ? `${L.season}-${String((L.season + 1) % 100).padStart(2, '0')}` : `${L.season}`; };
function lgIndex(sp){ const L = lg(sp); Object.defineProperty(L, 'pmap', {value:{}, enumerable:false, writable:true, configurable:true}); for(const p of L.players) L.pmap[p.id] = p; }
function lgAdd(sp, p){ lg(sp).players.push(p); lg(sp).pmap[p.id] = p; return p; }
function lgNewStats(sp){ const o = {gp:0}; for(const [k] of LG[sp].stats) o[k] = 0; for(const k of LG[sp].hiddenStats || []) o[k] = 0; return o; }
function lgSalary(sp, pos, ovr, age){ const c = LG[sp], base = c.money.maxSal * (c.posSal ? c.posSal[pos] || 1 : 1) * Math.pow(clamp((ovr - 40) / 55, .02, 1), 2.6); const ageF = age >= 32 ? .78 : age <= 23 ? .9 : 1; return Math.max(c.money.minSal, Math.round(base * ageF * 10) / 10); }
function lgNewPlayer(sp, pos, opts = {}){
  const c = LG[sp], age = opts.age ?? irand(c.ages[0], c.ages[1] - 4), [fn, ln] = (c.names ? c.names() : personName()).split(' ');
  const ovr = Math.round(clamp(opts.ovr ?? (58 + gauss() * 7), 30, 97)), upside = age <= c.peak - 5 ? irand(5, 20) : age <= c.peak - 2 ? irand(0, 9) : 0;
  const p = {id:uid(), fn, ln:ln || 'X', pos, age, ovr, pot:Math.min(99, ovr + upside), tid:opts.tid ?? -1, con:{amt:0, yrs:irand(1, 4)}, inj:0, st:lgNewStats(sp), car:lgNewStats(sp), hist:[], aw:[], dr:opts.dr || null, peak:ovr};
  if(c.extra) c.extra(p);
  p.con.amt = opts.amt ?? lgSalary(sp, pos, ovr, age); return p;
}
const lgPosList = sp => Object.keys(LG[sp].pos);

// ---------------- creating a league ----------------
function lgInit(sp){
  const c = LG[sp], off = ((S.week - c.start) % 52 + 52) % 52;
  const L = S.sports[sp] = {season:yearOf(S.week - off), wk:0, teams:[], players:[], sched:[], po:null, user:null, cap:c.money.cap, hist:{champs:[], awards:[], records:{}}, draft:null, resign:[], lastGame:null, scout:2, draftYear:0};
  lgIndex(sp);
  c.teams.forEach(([city, name, abbr, c1, c2, pop], i) => {
    const q = gauss() * 2.4;
    L.teams.push({id:i, city, name, abbr, c1, c2, pop, conf:c.confs ? Math.floor(i / (c.teams.length / c.confs.length)) : 0, w:0, l:0, t:0, otl:0, pf:0, pa:0, strk:'', hype:clamp(Math.round(50 + q * 5 + gauss() * 6), 25, 85), titles:0, seasons:[],
      coach:{name:personName(), r:irand(55, 86)}, arena:{cap:c.money.seats[0] + irand(0, c.money.seats[1] - c.money.seats[0]), lvl:1}, tix:'std', q, fac:{train:0, med:0, fan:0}, fin:{rev:0, exp:0, hist:[], last:[]}});
    for(const pos of lgPosList(sp)){ const [n, st] = c.pos[pos];
      for(let k = 0; k < n; k++){ const starter = k < st, ovr = starter ? 71 + q + gauss() * 6 - k * 1.5 : 61 + q * .5 + gauss() * 6 - (k - st) * 2; lgAdd(sp, lgNewPlayer(sp, pos, {tid:i, ovr, age:irand(c.ages[0] + 1, c.ages[1] - 3)})); } }
  });
  for(let k = 0; k < Math.round(c.teams.length * 1.5); k++) lgAdd(sp, lgNewPlayer(sp, pick(lgPosList(sp)), {tid:-1, ovr:50 + gauss() * 6}));
  lgFitCaps(sp); lgSchedule(sp); lgDraftClass(sp);
  quietly(() => { for(let k = 0; k < off; k++) lgWeekly(sp); }); // discovered mid-season: the league is already under way
}
function lgFitCaps(sp){ const L = lg(sp); for(const t of L.teams){ let over = lgPayroll(sp, t.id) - L.cap * .97; if(over <= 0) continue; const r = lgRoster(sp, t.id).sort((a, b) => b.con.amt - a.con.amt); for(const p of r){ if(over <= 0) break; const cut = Math.min(over, p.con.amt * .3); p.con.amt = Math.round((p.con.amt - cut) * 10) / 10; over -= cut; } } }

// ---------------- schedule: every week each team plays cfg.reg.gpw games ----------------
function lgSchedule(sp){
  const c = LG[sp], L = lg(sp), n = L.teams.length, R = c.reg.weeks, gpw = c.reg.gpw;
  L.sched = []; const ids = L.teams.map(t => t.id);
  // round-robin rounds (circle method), repeated and shuffled to fill the season
  const rounds = []; const arr = [...ids]; if(arr.length % 2) arr.push(-1);
  for(let r = 0; r < arr.length - 1; r++){ const pairs = []; for(let i = 0; i < arr.length / 2; i++){ const a = arr[i], b = arr[arr.length - 1 - i]; if(a >= 0 && b >= 0) pairs.push(r % 2 ? [a, b] : [b, a]); } rounds.push(pairs); arr.splice(1, 0, arr.pop()); }
  let pool = []; const need = R * gpw;
  if(c.reg.double){ for(let k = 0; pool.length < need; k++) pool.push(...rounds.map(rd => rd.map(([h, a]) => k % 2 ? [a, h] : [h, a]))); } // home & away (soccer-style tables)
  else while(pool.length < need) pool.push(...shuffle(rounds.map(rd => rd.map(([h, a]) => Math.random() < .5 ? [h, a] : [a, h]))));
  pool = pool.slice(0, need); if(c.reg.double && !c.reg.ordered) { const half = pool.length / 2; pool = [...shuffle(pool.slice(0, half)), ...shuffle(pool.slice(half))]; }
  for(let w = 0; w < R; w++){ const games = []; for(let k = 0; k < gpw; k++) for(const [h, a] of pool[w * gpw + k]) games.push({h, a, wk:w, d:k, s:null}); L.sched.push(games); }
}
const lgUserGames = sp => { const L = lg(sp), u = L.user; if(u == null) return []; if(L.wk < lgR(sp)) return (L.sched[L.wk] || []).filter(g => !g.s && (g.h === u || g.a === u)); return []; };

// ---------------- playing games ----------------
function lgLineup(sp, tid){ const r = lgRoster(sp, tid).filter(p => !p.inj).sort((a, b) => b.ovr - a.ovr); return {t:lgTeam(sp, tid), all:r, pos:Object.fromEntries(lgPosList(sp).map(pos => [pos, r.filter(p => p.pos === pos)]))}; }
function lgPlay(sp, g, record){
  const c = LG[sp], L = lg(sp), H = lgLineup(sp, g.h), A = lgLineup(sp, g.a);
  const res = c.sim(H, A, {record, po:!!g.po, sp, coachH:lgTeam(sp, g.h).coach.r, coachA:lgTeam(sp, g.a).coach.r});
  g.s = res.sc; g.ot = res.ot || false;
  // team records
  const th = lgTeam(sp, g.h), ta = lgTeam(sp, g.a);
  if(!g.po){ th.pf += res.sc[0]; th.pa += res.sc[1]; ta.pf += res.sc[1]; ta.pa += res.sc[0]; const [w, l] = res.sc[0] > res.sc[1] ? [th, ta] : res.sc[1] > res.sc[0] ? [ta, th] : [null, null];
    if(w){ w.w++; if(g.ot && c.otl) l.otl++; else l.l++; w.strk = w.strk[0] === 'W' ? 'W' + (+w.strk.slice(1) + 1) : 'W1'; l.strk = l.strk[0] === 'L' ? 'L' + (+l.strk.slice(1) + 1) : 'L1'; }
    else { th.t++; ta.t++; th.strk = ta.strk = 'T1'; } }
  // player stats (playoff stats are kept separately so season totals stay regular-season)
  for(const [pid, st] of Object.entries(res.box || {})){ const p = L.pmap[pid]; if(!p) continue; const tgt = g.po ? (p.pst = p.pst || lgNewStats(sp)) : p.st; tgt.gp++; for(const k in st) tgt[k] = (tgt[k] || 0) + st[k]; }
  // injuries
  for(const side of [H, A]) for(const p of side.all.slice(0, c.injPool || 12)){ if(Math.random() < (c.injRate || .004) * (1 - .2 * facOf(side.t, 'med'))){ p.inj = Math.random() < .1 ? irand(6, 16) : irand(1, 4); if(side.t.id === L.user) news(`🤕 ${lgName(p)} (${p.pos}) is hurt: out ${p.inj} week${p.inj > 1 ? 's' : ''}.`, 'bad', sp); } }
  if(g.h === L.user || g.a === L.user) lgUserResult(sp, g);
  return res;
}
function lgUserResult(sp, g){
  const L = lg(sp), u = L.user, mine = g.h === u ? 0 : 1, us = g.s[mine], them = g.s[1 - mine], opp = lgTeam(sp, mine ? g.h : g.a), won = us > them;
  L.lastGame = {ew:S.week, opp:opp.id, us, them, home:!mine, po:g.po || 0, ot:g.ot};
  const t = lgTeam(sp, u); t.hype = clamp(t.hype + (won ? 1.2 : us === them ? 0 : -1) * (g.po ? 2 : 1) * LG[sp].hypeMul, 5, 100);
  if(won) ach('win1');
}
function lgPendingGames(sp){ const L = lg(sp); return L.wk < lgR(sp) ? (L.sched[L.wk] || []).filter(g => !g.s) : []; }

// ---------------- standings & playoffs ----------------
const lgPts = (sp, t) => { const c = LG[sp]; return c.points ? t.w * c.points[0] + t.t * c.points[1] + t.otl * (c.points[2] || 0) : 0; };
const lgPct = t => { const g = t.w + t.l + t.t + t.otl; return g ? (t.w + t.t * .5) / g : 0; };
function lgStandings(sp, conf){ const L = lg(sp), c = LG[sp]; return L.teams.filter(t => conf == null || t.conf === conf).sort((a, b) => (c.points ? lgPts(sp, b) - lgPts(sp, a) : lgPct(b) - lgPct(a)) || (b.pf - b.pa) - (a.pf - a.pa) || b.pf - a.pf); }
function lgStartPlayoffs(sp){
  const c = LG[sp], L = lg(sp), n = c.po.teams;
  let seeds; if(c.confs && c.po.byConf) seeds = c.confs.map((_, i) => lgStandings(sp, i).slice(0, n / c.confs.length).map(t => t.id)); else seeds = [lgStandings(sp).slice(0, n).map(t => t.id)];
  L.po = {seeds, rounds:[], champ:null, alive:seeds.flat()};
  const pair = list => { const o = seedOrder(list.length), out = []; for(let i = 0; i < o.length; i += 2) out.push({h:list[o[i] - 1], a:list[o[i + 1] - 1], w:[0, 0], games:[], win:null}); return out; };
  L.po.rounds.push(seeds.flatMap((s, ci) => pair(s).map(x => ({...x, conf:ci}))));
  for(const t of L.teams) t.poRes = L.po.alive.includes(t.id) ? 'made' : null;
  const u = L.user; if(u != null){ const made = L.po.alive.includes(u); news(made ? `🎟️ ${lgTeamName(lgTeam(sp, u))} are in the ${c.po.name}!` : `${lgTeamName(lgTeam(sp, u))} missed the ${c.po.name} this year.`, made ? 'good' : 'bad', sp); }
}
const lgBestOf = (sp, r) => { const b = LG[sp].po.bestOf; return Array.isArray(b) ? b[r] : b; };
function lgPlaySeries(sp, sr, r, record){ // plays a whole series; returns recorded results for the user
  const need = Math.ceil(lgBestOf(sp, r) / 2), pattern = [0, 0, 1, 1, 0, 1, 0], out = [];
  for(let k = 0; sr.w[0] < need && sr.w[1] < need; k++){
    const hHome = pattern[k % 7] === 0, g = {h:hHome ? sr.h : sr.a, a:hHome ? sr.a : sr.h, po:r + 1, wk:lg(sp).wk};
    const res = lgPlay(sp, g, record); if(g.s[0] === g.s[1]) g.s = [g.s[0] + 1, g.s[1]]; // sims settle knockout games themselves; this is only a safety net
    const hw = g.s[0] > g.s[1] ? g.h : g.a; sr.w[hw === sr.h ? 0 : 1]++; sr.games.push({h:g.h, a:g.a, s:g.s, ot:g.ot}); if(record) out.push({g, res});
  }
  sr.win = sr.w[0] >= need ? sr.h : sr.a; const lose = sr.win === sr.h ? sr.a : sr.h, c = LG[sp], L = lg(sp);
  lgTeam(sp, lose).poRes = c.po.rounds[r]; L.po.alive = L.po.alive.filter(x => x !== lose);
  if(sr.win === L.user){ ach('playoffwin'); if(r === c.po.rounds.length - 2) ach('confchamp'); }
  if(lose === L.user) news(`😞 Eliminated in the ${c.po.rounds[r]} by the ${lgTeam(sp, sr.win).name} (${Math.max(...sr.w)}-${Math.min(...sr.w)}).`, 'bad', sp);
  else if(sr.win === L.user) news(`✅ ${lgTeamName(lgTeam(sp, sr.win))} win the ${c.po.rounds[r]} series ${Math.max(...sr.w)}-${Math.min(...sr.w)}!`, 'good', sp);
  return out;
}
function lgAdvanceRound(sp){ // after a round: pair the winners for the next round, or crown a champion
  const L = lg(sp), c = LG[sp], rs = L.po.rounds, cur = rs[rs.length - 1];
  if(cur.length === 1){ L.po.champ = cur[0].win; lgTeam(sp, cur[0].win).poRes = 'Champions'; lgTeam(sp, cur[0].win).titles++; return; }
  const next = []; for(let i = 0; i < cur.length; i += 2){ const a = cur[i].win, b = cur[i + 1].win, sa = L.po.seeds.flat().indexOf(a), sb = L.po.seeds.flat().indexOf(b); const [h, aw] = sa <= sb ? [a, b] : [b, a]; next.push({h, a:aw, w:[0, 0], games:[], win:null, conf:cur[i].conf === cur[i + 1].conf ? cur[i].conf : -1}); }
  rs.push(next);
}
// bracket order so 1 meets 8, then the 4/5 winner, etc.: [1,8,4,5,2,7,3,6]
function seedOrder(n){ let a = [1]; while(a.length < n){ const m = a.length * 2; a = a.flatMap(s => [s, m + 1 - s]); } return a; }
const lgUserSeries = sp => { const L = lg(sp); if(!L.po || L.wk < lgR(sp) || L.wk >= lgEnd(sp)) return null; const r = L.po.rounds[L.wk - lgR(sp)]; return r ? r.find(s => !s.win && (s.h === L.user || s.a === L.user)) || null : null; };

// ---------------- the weekly tick ----------------
function lgWeekly(sp){
  const c = LG[sp], L = lg(sp), wk = L.wk, R = lgR(sp), E = lgEnd(sp);
  if(wk < R){
    for(const g of lgPendingGames(sp)) lgPlay(sp, g, false);
    for(const p of L.players) if(p.inj > 0) p.inj--;
    if(wk === R - 1){ lgRegularSeasonEnd(sp); if(c.po) lgStartPlayoffs(sp); }
  } else if(wk < E){
    const r = wk - R, round = L.po.rounds[r]; if(round){ for(const sr of round) if(!sr.win) lgPlaySeries(sp, sr, r, false); lgAdvanceRound(sp); }
    for(const p of L.players) if(p.inj > 0) p.inj = Math.max(0, p.inj - 1);
  }
  if(wk === E) { lgSeasonEnd(sp); lgOffseasonStart(sp); }
  if(wk === E + 1) lgDraftStart(sp);
  if(wk === E + 3) lgFreeAgencyOpen(sp);
  if(wk >= E + 3 && wk <= E + 9) lgAIFreeAgency(sp, wk === E + 9 ? 1 : .35);
  if(wk === 50) lgCamp(sp);
  if(L.user != null) lgFinances(sp, wk);
  for(const t of L.teams) if(wk > E) t.hype += (50 - t.hype) * .01;
  L.wk++;
  if(L.wk >= 52) lgNewSeason(sp);
}
function lgRegularSeasonEnd(sp){ const L = lg(sp), u = L.user; if(u == null) return; const t = lgTeam(sp, u); if(t.w > t.l) ach('winseason'); const top = lgStandings(sp, LG[sp].confs ? t.conf : null)[0]; if(top.id === u) ach('divtitle'); }
function lgSeasonEnd(sp){
  const c = LG[sp], L = lg(sp);
  let champ;
  if(c.po) champ = lgTeam(sp, L.po.champ);
  else { champ = lgStandings(sp)[0]; champ.titles++; champ.poRes = 'Champions'; lgStandings(sp).forEach((t, i) => { if(i > 0) t.poRes = i < 4 ? `${ord(i + 1)} place` : null; }); }
  const runner = c.po ? (() => { const f = L.po.rounds[L.po.rounds.length - 1][0]; return lgTeam(sp, f.win === f.h ? f.a : f.h); })() : lgStandings(sp)[1];
  L.hist.champs.unshift({y:lgSeasonLabel(sp), tid:champ.id, name:lgTeamName(champ), rec:lgRecord(sp, champ), runner:runner.abbr});
  news(`🏆 ${lgTeamName(champ)} win the ${lgSeasonLabel(sp)} ${c.champName}!`, champ.id === L.user ? 'good' : 'info', sp);
  // awards
  const act = L.players.filter(p => p.tid >= 0 && p.st.gp >= c.awardMinGP);
  const row = {y:lgSeasonLabel(sp)};
  for(const a of c.awards){ let pool = act.filter(p => !a.pos || a.pos.includes(p.pos)); if(a.k === 'roy') pool = pool.filter(p => p.dr && p.dr.y === L.season); if(!pool.length) continue;
    const best = pool.sort((x, y) => a.score(y, lgTeam(sp, y.tid)) - a.score(x, lgTeam(sp, x.tid)))[0]; best.aw.push({y:row.y, a:a.k}); row[a.k] = {id:best.id, n:lgName(best), pos:best.pos, tid:best.tid, abbr:lgTeam(sp, best.tid).abbr};
    if(best.tid === L.user && a.k === 'mvp'){ ach('mvp'); if(best.dr && best.dr.tid === L.user) ach('draftstar'); } }
  L.hist.awards.unshift(row);
  if(row.mvp) news(`🏅 ${row.y} MVP: ${row.mvp.n} (${row.mvp.pos}, ${row.mvp.abbr})`, row.mvp.tid === L.user ? 'good' : 'info', sp);
  for(const t of L.teams) t.seasons.unshift({y:row.y, w:t.w, l:t.l, t:t.t, otl:t.otl, pf:t.pf, pa:t.pa, pts:lgPts(sp, t), po:t.poRes || ''});
  const u = L.user; if(u != null){ const t = lgTeam(sp, u);
    if(champ.id === u){ S.trophies.unshift({sport:sp, kind:'title', y:L.season, n:`${row.y} ${c.champName} champions`, team:lgTeamName(t)}); ach('title');
      const ts = t.seasons.filter(s => s.po === 'Champions'); if(t.seasons[1] && t.seasons[1].po === 'Champions') ach('b2b'); if(t.seasons.slice(0, 5).filter(s => s.po === 'Champions').length >= 3) ach('dynasty'); if(t.l === 0 && t.otl === 0 && !c.points) ach('perfect'); S.fame += 100; }
    else if(t.poRes && t.poRes !== 'made'){ S.fame += 15; }
    if(c.po && t.seasons[0].po === c.po.rounds[c.po.rounds.length - 1]) S.trophies.unshift({sport:sp, kind:'conf', y:L.season, n:`${row.y} ${c.po.rounds[c.po.rounds.length - 1]} runners-up`, team:lgTeamName(t)}); }
  // records
  const Rr = L.hist.records; for(const p of act) for(const [k, lab] of c.records){ const v = p.st[k]; if(!Rr[k] || v > Rr[k].v) Rr[k] = {v, n:lgName(p), abbr:lgTeam(sp, p.tid).abbr, y:row.y, lab}; }
}
const lgRecord = (sp, t) => LG[sp].points ? `${t.w}-${t.t}-${t.l} · ${lgPts(sp, t)} pts` : LG[sp].otl ? `${t.w}-${t.l}-${t.otl}` : `${t.w}-${t.l}${t.t ? '-' + t.t : ''}`;
function lgOffseasonStart(sp){
  const c = LG[sp], L = lg(sp);
  for(const p of L.players){ if(p.tid >= -1 && p.st.gp) p.hist.unshift({y:lgSeasonLabel(sp), tid:p.tid, ovr:p.ovr, st:{...p.st}}); for(const k in p.st) p.car[k] = (p.car[k] || 0) + p.st[k]; p.st = lgNewStats(sp); delete p.pst; }
  const retired = [];
  for(const p of L.players){ if(p.tid < -1) continue; p.age++;
    const coach = p.tid >= 0 ? (lgTeam(sp, p.tid).coach.r - 70) / 15 + facOf(lgTeam(sp, p.tid), 'train') * .35 : 0, a = p.age - c.peak;
    let d = a <= -6 ? irand(1, 7) : a <= -3 ? irand(0, 5) : a <= 1 ? irand(-1, 2) : a <= 4 ? irand(-4, 0) : irand(-7, -1);
    d = Math.round(d + coach + gauss() * .8); if(d > 0 && p.ovr + d > p.pot + 2) d = Math.max(0, p.pot + 2 - p.ovr);
    p.ovr = clamp(p.ovr + d, 30, 99); p.peak = Math.max(p.peak || 0, p.ovr); if(p.pot < p.ovr) p.pot = p.ovr;
    if(p.age >= c.ages[1] || (p.age >= c.ages[1] - 3 && Math.random() < .35) || (a >= 1 && p.ovr < 56 && Math.random() < .45) || (p.tid === -1 && a >= 2 && Math.random() < .5)) retired.push(p); }
  for(const p of retired){ const wasUser = p.tid === L.user; p.tid = -3; p.retY = L.season;
    const hof = lgHofScore(sp, p); if(hof >= 70){ p.hof = L.season + 1; news(`🏛️ ${lgName(p)} (${p.pos}) retires and is headed to the Hall of Fame!`, 'info', sp); if(p.hist.some(h => h.tid === L.user)) ach('hof'); }
    else if(wasUser) news(`👋 ${lgName(p)} (${p.pos}, ${p.age}) has retired.`, 'info', sp); }
  L.players = L.players.filter(p => p.tid !== -3 || p.hof); lgIndex(sp);
  L.resign = [];
  for(const p of L.players){ if(p.tid < 0) continue; p.con.yrs--; if(p.con.yrs > 0) continue;
    const ask = Math.round(lgSalary(sp, p.pos, p.ovr, p.age) * rand(1, 1.2) * 10) / 10;
    if(p.tid === L.user && lgCtrl(sp)){ L.resign.push({id:p.id, ask, yrs:p.age >= c.peak + 3 ? irand(1, 2) : irand(2, 5)}); continue; }
    const keep = p.ovr >= 64 && p.age <= c.peak + 4 && Math.random() < .75 && lgCapRoom(sp, p.tid) > ask; if(keep) p.con = {amt:ask, yrs:irand(1, 4)}; else { p.tid = -1; p.ask = ask; } }
  if(L.resign.length) news(`✍️ ${L.resign.length} of your players' contracts have expired. Re-sign them (Moves tab) before free agency opens.`, 'info', sp);
  L.cap = Math.round(L.cap * 1.04 * 10) / 10;
}
function lgHofScore(sp, p){ const aw = p.aw.filter(a => a.a === 'mvp').length * 22 + p.aw.filter(a => a.a !== 'mvp').length * 8; const great = p.hist.filter(h => h.ovr >= 86).length * 7; return aw + great + LG[sp].hofProd(p.car); }
function lgFreeAgencyOpen(sp){ const L = lg(sp);
  for(const r of L.resign){ const p = lgPlayer(sp, r.id); if(p && p.tid === L.user && p.con.yrs <= 0){ p.tid = -1; p.ask = r.ask; news(`${lgName(p)} (${p.pos}) left as a free agent.`, 'bad', sp); } }
  L.resign = []; for(const p of L.players) if(p.tid === -1 && !p.ask) p.ask = lgSalary(sp, p.pos, p.ovr, p.age);
  if(L.user != null) news(`📝 Free agency is open.`, 'info', sp); }
function lgNeeds(sp, tid){ const c = LG[sp], r = lgRoster(sp, tid), need = []; for(const pos of lgPosList(sp)){ const [n, st] = c.pos[pos], ps = r.filter(p => p.pos === pos).sort((a, b) => b.ovr - a.ovr); if(ps.length < n || ps.slice(0, st).some(p => p.ovr < 62)) need.push(pos); } return need; }
function lgAIFreeAgency(sp, frac){ const L = lg(sp), fa = L.players.filter(p => p.tid === -1).sort((a, b) => b.ovr - a.ovr), max = LG[sp].rosterMax;
  for(const t of shuffle([...L.teams])){ if(t.id === L.user && lgCtrl(sp)) continue; let room = lgCapRoom(sp, t.id), n = lgRoster(sp, t.id).length;
    for(const pos of lgNeeds(sp, t.id)){ if(Math.random() > frac || n >= max) continue; const p = fa.find(x => x.tid === -1 && x.pos === pos && x.ask <= room - .5); if(!p) continue; p.tid = t.id; p.con = {amt:p.ask, yrs:irand(1, 4)}; room -= p.ask; n++; } } }
function lgInterest(sp){ const t = lgTeam(sp, lg(sp).user); return clamp(1 + (t.hype - 50) / 250 + (lgPct(t) - .5) * .15 + Math.min(.08, fameTotal() / 2500) + (S.assets.some(a => a.id === 'jet') ? .03 : 0), .85, 1.3); }
function lgOfferFA(sp, pid, amt, yrs){ const L = lg(sp), p = lgPlayer(sp, pid); if(!p || p.tid !== -1) return 'gone';
  if(lgRoster(sp, L.user).length >= LG[sp].rosterMax) return 'roster'; if(amt > lgCapRoom(sp, L.user)) return 'cap';
  if(amt < p.ask / lgInterest(sp) * (yrs >= 4 && p.age >= LG[sp].peak + 2 ? 1.08 : 1) - .05) return 'low';
  p.tid = L.user; p.con = {amt, yrs}; p.ask = 0; news(`✍️ Signed ${lgName(p)} (${p.pos}, ${p.ovr}) for ${money(amt)}/yr × ${yrs}.`, 'good', sp); return 'ok'; }
function lgResign(sp, pid, accept){ const L = lg(sp), i = L.resign.findIndex(r => r.id === pid); if(i < 0) return; const r = L.resign[i], p = lgPlayer(sp, pid);
  if(accept){ if(r.ask > lgCapRoom(sp, L.user) + p.con.amt) return 'cap'; p.con = {amt:r.ask, yrs:r.yrs}; news(`✍️ Re-signed ${lgName(p)} for ${money(r.ask)}/yr × ${r.yrs}.`, 'good', sp); }
  else { p.tid = -1; p.ask = r.ask; news(`👋 Let ${lgName(p)} go.`, 'info', sp); }
  L.resign.splice(i, 1); return 'ok'; }
function lgCamp(sp){ const c = LG[sp], L = lg(sp);
  for(const t of L.teams){
    for(const pos of lgPosList(sp)){ const n = c.pos[pos][0]; let have = lgRoster(sp, t.id).filter(p => p.pos === pos).length; // fill every position group
      while(have < n){ const fa = L.players.filter(p => p.tid === -1 && p.pos === pos && (p.ask || 0) <= c.money.minSal * 2).sort((a, b) => b.ovr - a.ovr)[0]; const p = fa || lgAdd(sp, lgNewPlayer(sp, pos, {tid:-1, ovr:48 + gauss() * 5, age:irand(c.ages[0] + 2, c.peak)})); p.tid = t.id; p.con = {amt:c.money.minSal, yrs:1}; have++; } }
    let r = lgRoster(sp, t.id), cut = 0; // then trim to the roster limit, never below a position's starters + 1
    while(r.length > c.rosterMax){ const cnt = pos => r.filter(p => p.pos === pos).length, x = r.filter(p => cnt(p.pos) > c.pos[p.pos][1] + 1).sort((a, b) => a.ovr - b.ovr)[0]; if(!x) break; x.tid = -1; x.ask = lgSalary(sp, x.pos, x.ovr, x.age); r = r.filter(p => p !== x); cut++; }
    if(cut && t.id === L.user) news(`✂️ Roster trimmed to ${c.rosterMax}: released ${cut} of your lowest-rated players.`, 'info', sp); } }
function lgNewSeason(sp){
  const L = lg(sp); L.wk = 0; L.season++; L.po = null; L.lastGame = null;
  for(const t of L.teams) Object.assign(t, {w:0, l:0, t:0, otl:0, pf:0, pa:0, strk:'', poRes:null});
  for(const p of L.players) if(p.tid === -1 && p.age >= LG[sp].peak + 5) p.tid = -4;
  L.players = L.players.filter(p => p.tid !== -4); lgIndex(sp);
  lgSchedule(sp); lgDraftClass(sp);
  news(`${sportMeta(sp).icon} The ${lgSeasonLabel(sp)} ${LG[sp].seasonWord || 'season'} begins!`, 'info', sp);
}

// ---------------- draft ----------------
function lgDraftClass(sp){ const c = LG[sp], L = lg(sp); L.draftYear = L.season + (c.start >= 30 ? 1 : 0);
  for(const p of L.players.filter(x => x.tid === -2)) p.tid = -4; L.players = L.players.filter(p => p.tid !== -4);
  for(let i = 0; i < L.teams.length * (c.draftRounds + 1); i++){ const pos = pick(lgPosList(sp)), age = irand(c.ages[0], c.ages[0] + 3), talent = Math.random();
    const p = lgNewPlayer(sp, pos, {tid:-2, age, ovr:42 + talent * 22 + gauss() * 4}); p.pot = clamp(Math.round(p.ovr + 6 + talent * 18 + gauss() * 6), p.ovr + 2, 97); p.scout = gauss() * 6; p.con.amt = c.money.minSal; lgAdd(sp, p); } lgIndex(sp); }
function lgProspectRange(sp, p){ const s = lg(sp).scout, w = Math.round(12 - s * 2), mid = Math.round(p.pot + p.scout * (6 - s) / 5); return [clamp(mid - w, p.ovr, 99), clamp(mid + w, p.ovr, 99)]; }
function lgDraftValue(sp, p, tid){ const need = lgNeeds(sp, tid).includes(p.pos) ? 4 : 0; return p.pot + p.scout + p.ovr * .4 + need; }
function lgDraftStart(sp){ const c = LG[sp], L = lg(sp), order = [...L.teams].sort((a, b) => { const rank = t => t.poRes === 'Champions' ? 9 : t.poRes && t.poRes !== 'made' ? 2 + (c.po ? c.po.rounds.indexOf(t.poRes) : 0) : 0; return rank(a) - rank(b) || lgPct(a) - lgPct(b); }).map(t => t.id);
  const picks = []; for(let r = 1; r <= c.draftRounds; r++) order.forEach((tid, i) => picks.push({r, n:i + 1, tid, pid:null}));
  L.draft = {active:true, picks, at:0, onClock:null, y:L.draftYear}; lgDraftAdvance(sp);
  if(L.user != null) news(`🎓 The ${L.draftYear} draft is underway! Your first pick: #${picks.findIndex(p => p.tid === L.user) + 1}.`, 'info', sp); }
function lgDraftAdvance(sp){ const L = lg(sp), D = L.draft;
  while(D.at < D.picks.length){ const pk = D.picks[D.at]; if(pk.tid === L.user && lgCtrl(sp)){ D.onClock = L.user; return; }
    const pool = L.players.filter(p => p.tid === -2); if(!pool.length) break; lgDraftPick(sp, pool.sort((a, b) => lgDraftValue(sp, b, pk.tid) - lgDraftValue(sp, a, pk.tid))[0].id); }
  if(D.at >= D.picks.length) lgDraftEnd(sp); }
function lgDraftPick(sp, pid){ const L = lg(sp), D = L.draft, pk = D.picks[D.at], p = lgPlayer(sp, pid); p.tid = pk.tid; pk.pid = pid; p.dr = {y:D.y, r:pk.r, n:pk.n, tid:pk.tid}; p.con = {amt:Math.max(LG[sp].money.minSal, Math.round(LG[sp].money.minSal * (pk.r === 1 ? 4 - pk.n / 12 : 1.1) * 10) / 10), yrs:pk.r === 1 ? 4 : 2}; D.at++; D.onClock = null;
  if(pk.tid === L.user) news(`🎓 You drafted ${lgName(p)} (${p.pos}) at #${(pk.r - 1) * L.teams.length + pk.n}.`, 'good', sp); }
function lgDraftEnd(sp){ const L = lg(sp); L.draft.active = false; L.draft.onClock = null; for(const p of L.players) if(p.tid === -2){ p.tid = -1; p.ask = LG[sp].money.minSal; } }

// ---------------- trades ----------------
function lgTradeValue(sp, p){ const c = LG[sp], ageF = p.age <= c.peak - 3 ? 1.15 : p.age <= c.peak + 1 ? 1 : p.age <= c.peak + 4 ? .7 : .45; return Math.pow(Math.max(0, p.ovr - 45), 2) * ageF * (c.posSal ? c.posSal[p.pos] || 1 : 1) + Math.max(0, p.pot - p.ovr) * 6 * (p.age <= c.peak - 3) - p.con.amt * 400 / c.money.maxSal; }
function lgTradeEval(sp, give, get, tid){ const L = lg(sp), gv = give.reduce((a, id) => a + lgTradeValue(sp, lgPlayer(sp, id)), 0), tv = get.reduce((a, id) => a + lgTradeValue(sp, lgPlayer(sp, id)), 0);
  const sal = ids => ids.reduce((a, id) => a + lgPlayer(sp, id).con.amt, 0), userPay = lgPayroll(sp, L.user) - sal(give) + sal(get), theirPay = lgPayroll(sp, tid) + sal(give) - sal(get), max = LG[sp].rosterMax;
  const capOk = userPay <= L.cap * 1.02 && theirPay <= L.cap * 1.02, rostOk = lgRoster(sp, L.user).length - give.length + get.length <= max && lgRoster(sp, tid).length + give.length - get.length <= max;
  return {ok:capOk && rostOk && gv >= tv * 1.06 + 20, capOk, rostOk, margin:gv - tv * 1.06 - 20}; }
function lgDoTrade(sp, give, get, tid){ const L = lg(sp); for(const id of give) lgPlayer(sp, id).tid = tid; for(const id of get) lgPlayer(sp, id).tid = L.user; news(`🔁 Trade with the ${lgTeam(sp, tid).name}: got ${get.map(id => lgName(lgPlayer(sp, id))).join(', ') || 'nothing'} for ${give.map(id => lgName(lgPlayer(sp, id))).join(', ') || 'nothing'}.`, 'info', sp); }
const lgTradeOpen = sp => { const w = lg(sp).wk; return w < Math.round(lgR(sp) * .6) || w > lgEnd(sp); };

// ---------------- money ----------------
const LG_TICKETS = {cheap:{n:'Value', mul:.7, fill:.12}, std:{n:'Standard', mul:1, fill:0}, prem:{n:'Premium', mul:1.45, fill:-.14}};
function lgFill(sp, t){ return clamp(.5 + t.hype * .0055 + (lgPct(t) - .5) * .35 + LG_TICKETS[t.tix].fill + (t.pop - 3) * .02 + facOf(t, 'fan') * .03, .3, 1); }
function lgHomeGames(sp, wk){ const L = lg(sp), u = L.user; if(wk < lgR(sp)) return (L.sched[wk] || []).filter(g => g.h === u).length; const r = L.po && L.po.rounds[wk - lgR(sp)]; if(!r) return 0; const s = r.find(x => x.h === u || x.a === u); return s ? s.games.filter(g => g.h === u).length : 0; }
function lgFinances(sp, wk){
  const c = LG[sp], m = c.money, L = lg(sp), t = lgTeam(sp, L.user), f = t.fin, lines = [], C = lgCtrl(sp), grow = Math.pow(1.04, L.season - 2026);
  let rev = 0, exp = 0;
  const tv = m.tv / 52 * grow * (C ? ownerBoost('tv') : 1); rev += tv; lines.push(['TV & league share', tv]);
  const merch = m.merch / 52 * (.6 + t.hype / 120) * (.7 + t.pop * .15) * (1 + facOf(t, 'fan') * .12) * (C ? ownerBoost('merch') : 1); rev += merch; lines.push(['Merchandise & sponsors', merch]);
  const hg = lgHomeGames(sp, wk); if(hg){ const fill = lgFill(sp, t), fans = t.arena.cap * fill, gate = hg * fans * m.ticket * LG_TICKETS[t.tix].mul / 1e6 * (wk >= lgR(sp) ? 1.6 : 1) * grow, boxes = gate * .12 * (t.arena.lvl - 1); rev += gate + boxes; lines.push([`${hg} home ${hg > 1 ? c.gameWord + 's' : c.gameWord}: ${Math.round(fans).toLocaleString()} fans a night (${Math.round(fill * 100)}%)`, gate + boxes]); }
  const pay = lgPayroll(sp, L.user) / 52; exp += pay; lines.push(['Player payroll', -pay]);
  const staff = (t.coach.r * m.staff + L.scout * m.staff * 12) / 52; exp += staff; lines.push(['Coaches & scouts', -staff]);
  const ops = m.ops / 52 * (1 + facLevels(t) * .04) * (1 + (t.arena.lvl - 1) * .1); exp += ops; lines.push(['Arena & operations', -ops]);
  teamProfit(sp, rev - exp); f.rev += rev; f.exp += exp; f.last = lines;
  if(wk === 51){ f.hist.unshift({y:lgSeasonLabel(sp), rev:f.rev, exp:f.exp}); f.rev = 0; f.exp = 0; }
}
const lgArenaCost = (sp, lvl) => Math.round(LG[sp].money.arenaUp * (1 + lvl * .6));
function lgUpgradeArena(sp){ const t = lgTeam(sp, lg(sp).user), c = lgArenaCost(sp, t.arena.lvl); if(S.cash < c) return false; S.cash -= c; book('🏟️ Team upgrades', -c); t.arena.lvl++; t.arena.cap += LG[sp].money.seatStep; news(`🏟️ ${LG[sp].venue} expanded to ${t.arena.cap.toLocaleString()} seats with more premium boxes.`, 'good', sp); return true; }
function lgCoachPool(sp){ const L = lg(sp), m = LG[sp].money; if(!L.coachPool || L.coachPool.y !== L.season) L.coachPool = {y:L.season, list:Array.from({length:4}, () => { const r = irand(58, 94); return {name:personName(), r, fee:Math.max(1, Math.round((r - 50) * m.staff * 18))}; })}; return L.coachPool.list; }
function lgHireCoach(sp, i){ const L = lg(sp), c = lgCoachPool(sp)[i], t = lgTeam(sp, L.user); if(!c || S.cash < c.fee) return false; S.cash -= c.fee; book('🏟️ Team upgrades', -c.fee); t.coach = {name:c.name, r:c.r}; L.coachPool.list.splice(i, 1); news(`📋 Hired ${LG[sp].coachWord || 'head coach'} ${c.name} (${c.r}).`, 'good', sp); return true; }
function lgTeamValue(sp, tid){ const c = LG[sp], L = lg(sp), t = lgTeam(sp, tid), [p0, p1] = sportMeta(sp).price, f = clamp((t.pop - 1) / 4 * .7 + (t.hype - 25) / 70 * .3, 0, 1);
  return Math.round((p0 + (p1 - p0) * f) * (1 + t.titles * .03) * Math.pow(1.05, L.season - 2026) + facLevels(t) * facCost(sp, 0) * .8 + (t.arena.lvl - 1) * lgArenaCost(sp, 0) * .6); }
const lgOvr = (sp, tid) => { const c = LG[sp], r = lgRoster(sp, tid).sort((a, b) => b.ovr - a.ovr); let tot = 0, n = 0; for(const pos of lgPosList(sp)){ const st = c.pos[pos][1]; for(const p of r.filter(x => x.pos === pos).slice(0, st)){ tot += p.ovr; n++; } } return n ? Math.round(tot / n) : 0; };

// ---------------- the module wrapper every team sport registers ----------------
function lgModule(sp){
  return {
    init(){ lgInit(sp); },
    load(){ lgIndex(sp); },
    teamValue(tid){ return lgTeamValue(sp, tid); },
    teamName(tid){ return lgTeamName(lgTeam(sp, tid)); },
    team(tid){ return lgTeam(sp, tid); },
    follow(tid){ lg(sp).user = tid; lg(sp).resign = []; },
    logo(tid, size){ return crest(lgTeam(sp, tid), size, LG[sp].crest); },
    record(tid){ const t = lgTeam(sp, tid); return `${lgRecord(sp, t)} · ${t.titles} title${t.titles === 1 ? '' : 's'}`; },
    teams(){ const c = LG[sp]; return lg(sp).teams.map(t => ({id:t.id, name:lgTeamName(t), logo:crest(t, 44, c.crest), sub:`${c.confs ? c.confs[t.conf] + ' · ' : ''}${lgRecord(sp, t)} · market ${'★'.repeat(t.pop)}${'☆'.repeat(5 - t.pop)}`, ovr:lgOvr(sp, t.id)})); },
    blocker(){ const L = lg(sp); if(!lgCtrl(sp)) return null; if(L.draft && L.draft.active && L.draft.onClock === L.user) return 'draft'; return null; },
    weekly(){ lgWeekly(sp); },
    halt(){ const L = lg(sp); return lgCtrl(sp) && L.wk === lgEnd(sp) + 2 && L.resign.length && L.ack !== L.season ? 'contracts' : null; }, // stops a sim once so expiring players don't walk unseen
    goBlock(what){ if(what === 'contracts'){ lg(sp).ack = lg(sp).season; go(sp, 'moves', {lgmoves:'contracts'}); toast('✍️ Decide your expiring contracts before free agency'); return; } go(sp, 'moves', {lgmoves:'draft'}); toast('🎓 Draft day: you\'re on the clock!'); },
    tabs(){ return lgTabs(sp); }, view(tab){ return lgView(sp, tab); }, act(){ return lgAct(sp); },
    playUser(mode){ return lgPlayUser(sp, mode); }, lastLine(){ return lgLastLine(sp); }, simStops(){ return lgSimStops(sp); },
    click(b, d){ return lgClick(sp, b, d); }, change(t){ return lgChange(sp, t); },
  };
}
// a simple crest for team sports without a helmet: shield / roundel / hex
function crest(t, size = 40, shape = 'shield'){
  const c1 = t.c1, c2 = t.c2, tx = textOn(c1), h = Math.round(size * (shape === 'shield' ? 1.12 : 1));
  const body = shape === 'round' ? `<circle cx="32" cy="32" r="29" fill="${c1}" stroke="${c2}" stroke-width="5"/>` : shape === 'hex' ? `<path d="M32 3 58 17v30L32 61 6 47V17z" fill="${c1}" stroke="${c2}" stroke-width="5" stroke-linejoin="round"/>` : `<path d="M32 3 58 11v22c0 16-11 26-26 33C17 59 6 49 6 33V11z" fill="${c1}" stroke="${c2}" stroke-width="5" stroke-linejoin="round"/>`;
  const vb = shape === 'shield' ? '0 0 64 72' : '0 0 64 64';
  return `<svg class="helm" width="${size}" height="${h}" viewBox="${vb}" aria-hidden="true">${body}<text x="32" y="${shape === 'shield' ? 41 : 39}" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="${t.abbr.length > 3 ? 15 : 19}" fill="${tx}">${t.abbr}</text></svg>`;
}
