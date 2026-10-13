'use strict';
// =====================================================================================
//  MOTORSPORT ENGINE (Formula racing + stock car racing). You own a racing team: two cars,
//  drivers on contracts, a car you develop (aero / power / reliability), a pit crew, and a
//  season of races on a calendar. Stock cars add a 16-driver elimination playoff.
//  Calendar (rc.wk 0..51, week 0 = cfg.start week of the year): races on cfg.raceWeeks,
//  then season end (titles, aging, contracts) → driver market → new season at 52.
// =====================================================================================
const RC = {};
const rc = sp => S.sports[sp];
const rcTeam = (sp, tid) => rc(sp).teams[tid];
const rcDriver = (sp, pid) => rc(sp).pmap[pid];
const rcDrivers = (sp, tid) => rc(sp).players.filter(p => p.tid === tid).sort((a, b) => a.seat - b.seat);
const rcCtrl = sp => rc(sp).user != null && inCtrl(sp);
const rcName = (p, short) => short ? `${p.fn[0]}. ${p.ln}` : `${p.fn} ${p.ln}`;
const rcAbbr = p => p.ln.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
const rcNewStats = () => ({starts:0, wins:0, pod:0, top10:0, pts:0, poles:0, dnf:0});
function rcIndex(sp){ const R = rc(sp); Object.defineProperty(R, 'pmap', {value:{}, enumerable:false, writable:true, configurable:true}); for(const p of R.players) R.pmap[p.id] = p; }
function rcSalary(sp, ovr, age){ const c = RC[sp]; return Math.max(c.money.minSal, Math.round(c.money.maxSal * Math.pow(clamp((ovr - 45) / 50, .02, 1), 2.4) * (age >= 36 ? .75 : 1) * 10) / 10); }
function rcNewDriver(sp, opts = {}){ const age = opts.age ?? irand(20, 36), [fn, ln] = personName().split(' '), ovr = Math.round(clamp(opts.ovr ?? 62 + gauss() * 8, 35, 97));
  const p = {id:uid(), fn, ln, age, ovr, pot:Math.min(99, ovr + (age <= 22 ? irand(5, 18) : age <= 25 ? irand(0, 8) : 0)), tid:opts.tid ?? -1, seat:opts.seat ?? 0, con:{amt:0, yrs:irand(1, 3)}, st:rcNewStats(), car:rcNewStats(), hist:[], aw:[], titles:0, peak:ovr, inj:0};
  p.con.amt = rcSalary(sp, ovr, age); rc(sp).players.push(p); rc(sp).pmap[p.id] = p; return p; }
const rcPerf = (sp, t, type) => { const w = RC[sp].tracks.types[type] || {aero:.5, eng:.5}; return t.car.aero * w.aero + t.car.eng * w.eng; };

// ---------------- creating a championship ----------------
function rcInit(sp){
  const c = RC[sp], off = ((S.week - c.start) % 52 + 52) % 52;
  const R = S.sports[sp] = {season:yearOf(S.week - off), wk:0, teams:[], players:[], cal:[], round:0, user:null, hist:{champs:[], records:{}}, resign:[], lastRace:null, chase:null};
  rcIndex(sp);
  c.teams.forEach(([name, abbr, c1, c2, pop, q], i) => {
    const base = 60 + q * 6 + gauss() * 3;
    R.teams.push({id:i, name, abbr, city:'', c1, c2, pop, car:{aero:Math.round(clamp(base + gauss() * 3, 40, 95)), eng:Math.round(clamp(base + gauss() * 3, 40, 95)), rel:Math.round(clamp(base + 8 + gauss() * 4, 45, 98))}, crew:Math.round(clamp(62 + q * 5 + gauss() * 5, 45, 95)),
      coach:{name:personName(), r:irand(55, 88)}, hype:clamp(Math.round(50 + q * 7 + gauss() * 5), 20, 90), titles:0, dtitles:0, pts:0, wins:0, seasons:[], fin:{rev:0, exp:0, hist:[], last:[]}, fac:{train:0, med:0, fan:0}, dev:{aero:0, eng:0, rel:0}, nums:c.nums ? c.nums[i] : [i * 2 + 1, i * 2 + 2], lastPos:i + 1});
    for(const seat of [0, 1]) rcNewDriver(sp, {tid:i, seat, ovr:68 + q * 4 + gauss() * 6 - seat * 3, age:irand(21, 35)});
  });
  for(let k = 0; k < c.teams.length; k++) rcNewDriver(sp, {tid:-1, ovr:58 + gauss() * 7, age:irand(19, 36)});
  for(let k = 0; k < 4; k++) rcNewDriver(sp, {tid:-1, ovr:56 + gauss() * 4, age:irand(18, 20)});
  rcCalendar(sp);
  quietly(() => { for(let k = 0; k < off; k++) rcWeekly(sp); });
}
function rcCalendar(sp){ const c = RC[sp], R = rc(sp); R.cal = c.raceWeeks.map((wk, i) => { const tr = c.tracks.list[i % c.tracks.list.length]; return {wk, n:tr[0], type:tr[1], laps:tr[2], i, done:false, res:null}; }); R.round = 0; R.chase = null; }
const rcRaceNow = sp => { const R = rc(sp); return R.cal.find(r => r.wk === R.wk && !r.done) || null; };
const rcLastWeek = sp => RC[sp].raceWeeks[RC[sp].raceWeeks.length - 1];

// ---------------- the race ----------------
function rcSimRace(sp, race, record){
  const c = RC[sp], R = rc(sp), cars = [];
  for(const t of R.teams){ const ds = rcDrivers(sp, t.id); let spare = ds.find(x => x.seat === 2 && !x.inj); // an injured driver's seat goes to the reserve
    for(const seat of [0, 1]){ let d = ds.find(x => x.seat === seat); if(!d) continue; if(d.inj && spare){ d = spare; spare = null; } cars.push({d, t, perf:rcPerf(sp, t, race.type), out:false}); } }
  const tr = c.tracks.types[race.type], pace = x => x.perf * c.carW + x.d.ovr * (1 - c.carW) + (x.t.coach.r - 70) * .03 + x.form;
  for(const x of cars) x.form = gauss() * c.formNoise; // setup, strategy and luck for this weekend
  // qualifying
  for(const x of cars) x.q = pace(x) + gauss() * c.qNoise; cars.sort((a, b) => b.q - a.q); const pole = cars[0]; cars.forEach((x, i) => { x.gap = i * c.gridGap; }); // grid slots
  let order = [...cars]; const log = [], segs = c.segs, lapsPer = race.laps / segs, out = [];
  const snap = (lap, extra) => ({lap:Math.round(lap), order:order.map(x => x.d.id), gaps:order.map((x, i) => i === 0 ? 0 : Math.max(.2, (x.gap || 0))), out:out.map(x => x.d.id), ...extra});
  const push = (lap, txt, type, big) => { if(record) log.push({lap:Math.round(lap), txt, type, big:!!big, snap:snap(lap)}); };
  if(record) push(0, `${rcName(pole.d)} takes pole for ${pole.t.name}.`, 'start', true);
  let caution = 0;
  for(let s = 0; s < segs; s++){
    const lap = (s + 1) * lapsPer;
    // incidents & reliability
    const big = c.bigOne && race.type === 'super' && Math.random() < .045 ? irand(3, 8) : 0;
    if(big){ const start = irand(0, Math.max(0, order.length - big)); const hit = order.slice(start, start + big); for(const x of hit){ if(Math.random() < .55){ x.out = true; x.why = 'crash'; } } caution = 2; push(lap, `💥 THE BIG ONE! A ${big}-car wreck${hit.filter(x => x.out).length ? `: ${hit.filter(x => x.out).map(x => x.d.ln).join(', ')} out` : ''}.`, 'crash', true); }
    for(const x of order){ if(x.out) continue; const rel = (100 - x.t.car.rel) / 100 * c.relRisk, err = (100 - x.d.ovr) / 100 * c.crashRisk * (tr.crash || 1);
      if(Math.random() < rel){ x.out = true; x.why = 'mechanical'; push(lap, `🔧 ${rcName(x.d)} pulls off with a ${pick(['gearbox', 'engine', 'hydraulics', 'brake', 'power unit', 'suspension'])} failure.`, 'dnf', true); }
      else if(Math.random() < err){ x.out = true; x.why = 'crash'; caution = c.caution; push(lap, `💥 ${rcName(x.d)} crashes out!${c.caution ? ` ${c.cautionWord} deployed.` : ''}`, 'crash', true); } }
    for(const x of order.filter(y => y.out)) if(!out.includes(x)) out.push(x);
    order = order.filter(x => !x.out);
    // racing: faster cars try to pass the car ahead; track position matters (more on street circuits)
    const passes = c.passes + (caution ? 2 : 0), hard = c.passHard * (tr.pass || 1);
    for(let k = 0; k < passes; k++) for(let i = order.length - 1; i > 0; i--){ const a = order[i - 1], b = order[i], pa = pace(a) + gauss() * c.raceNoise, pb = pace(b) + gauss() * c.raceNoise;
      if(pb - pa > hard){ order[i - 1] = b; order[i] = a; if(i === 1 && record) push(lap, `${rcName(b.d)} takes the lead from ${rcName(a.d)}!`, 'lead', true); else if(record && i <= 3 && Math.random() < .5) push(lap, `${rcName(b.d)} passes ${rcName(a.d)} for P${i}.`, 'pass'); } }
    // pit stops: the crew can win or lose places
    if(c.pitSegs.includes(s)){ for(let i = 1; i < order.length; i++){ const a = order[i - 1], b = order[i]; if(b.t.crew + gauss() * 8 > a.t.crew + gauss() * 8 + 12){ order[i - 1] = b; order[i] = a; } } push(lap, c.pitText, 'pit'); }
    // gaps to the car ahead for the live view
    for(let i = 0; i < order.length; i++) order[i].gap = i === 0 ? 0 : order[i - 1].gap + Math.max(.15, (caution ? .2 : c.gapBase) + (pace(order[i - 1]) - pace(order[i])) * c.gapK + gauss() * .3);
    if(caution){ caution--; if(record && caution === 0 && c.caution) push(lap, `🟢 Green flag! Racing resumes.`, 'green'); }
    if(record && s % 3 === 1) push(lap, `Lap ${Math.round(lap)}/${race.laps}: ${rcName(order[0].d)} leads ${rcName(order[1].d)} by ${(order[1].gap).toFixed(1)}s.`, 'tick');
  }
  push(race.laps, `🏁 ${rcName(order[0].d)} wins the ${race.n}!`, 'finish', true);
  return {order:order.map(x => x.d.id), out:out.map(x => x.d.id), pole:pole.d.id, log, why:Object.fromEntries(out.map(x => [x.d.id, x.why]))};
}
function rcApply(sp, race, res){
  const c = RC[sp], R = rc(sp), fin = [...res.order, ...res.out.reverse()], pts = c.points;
  race.done = true; race.res = fin; race.out = res.out; race.pole = res.pole; race.winner = res.order[0];
  fin.forEach((pid, i) => { const d = rcDriver(sp, pid); if(!d) return; const st = d.st, dnf = res.out.includes(pid); st.starts++; if(dnf) st.dnf++; if(i === 0){ st.wins++; rcTeam(sp, d.tid).wins++; } if(i < 3 && !dnf) st.pod++; if(i < 10 && !dnf) st.top10++; const p = dnf && !c.dnfPts ? 0 : (pts[i] || 0); st.pts += p; rcTeam(sp, d.tid).pts += p;
    if(R.chase && R.chase.field.includes(pid)) R.chase.pts[pid] = (R.chase.pts[pid] || 0) + p;
    if(dnf && res.why[pid] === 'crash' && Math.random() < .08 * (1 - .2 * facOf(rcTeam(sp, d.tid), 'med'))){ d.inj = irand(1, 3); } });
  rcDriver(sp, res.pole).st.poles++;
  for(const t of R.teams){ const best = Math.min(...rcDrivers(sp, t.id).filter(d => d.seat < 2).map(d => fin.indexOf(d.id)).filter(i => i >= 0)); t.hype = clamp(t.hype + (best === 0 ? 2.5 : best < 3 ? 1.2 : best < 10 ? .2 : -.6) * c.hypeMul, 5, 100); }
  if(R.user != null){ const mine = rcDrivers(sp, R.user).filter(d => d.seat < 2).map(d => ({d, pos:fin.indexOf(d.id) + 1, dnf:res.out.includes(d.id)})).sort((a, b) => a.pos - b.pos);
    R.lastRace = {ew:S.week, n:race.n, mine:mine.map(m => ({id:m.d.id, pos:m.pos, dnf:m.dnf})), win:res.order[0]};
    if(mine.length && mine[0].pos === 1){ ach('win1'); news(`🏆 ${rcName(mine[0].d)} WINS the ${race.n} for the ${rcTeam(sp, R.user).name}!`, 'good', sp); }
    else if(mine.length) news(`🏁 ${race.n}: ${mine.map(m => `${m.d.ln} ${m.dnf ? 'DNF' : 'P' + m.pos}`).join(', ')}. Won by ${rcName(rcDriver(sp, res.order[0]))}.`, mine[0].pos <= 3 ? 'good' : 'info', sp); }
  R.round = race.i + 1;
  if(c.chase) rcChaseStep(sp, race);
  rcPurse(sp, race, fin);
}
// ---------------- stock-car playoff: 16 drivers, cut to 12 / 8 / 4, then winner-takes-all ----------------
function rcChaseStep(sp, race){ const c = RC[sp], R = rc(sp), ch = c.chase, n = race.i + 1;
  if(n === ch.start){ const field = rcDriverStandings(sp).slice(0, 16).map(d => d.id); R.chase = {field, pts:Object.fromEntries(field.map(id => [id, 2000 + rcDriver(sp, id).st.wins * 5])), out:[], final:false}; if(R.user != null){ const mine = field.filter(id => rcDriver(sp, id).tid === R.user); news(mine.length ? `🎟️ ${mine.map(id => rcName(rcDriver(sp, id))).join(' & ')} made the Playoffs!` : `None of your drivers made the Playoffs.`, mine.length ? 'good' : 'bad', sp); } return; }
  if(!R.chase) return; const cut = ch.cuts.find(x => x[0] === n);
  if(cut){ const alive = R.chase.field.filter(id => !R.chase.out.includes(id)), roundStart = ch.cuts[ch.cuts.indexOf(cut) - 1] ? ch.cuts[ch.cuts.indexOf(cut) - 1][0] : ch.start, wins = new Set(R.cal.slice(roundStart, n).map(r => r.winner).filter(id => alive.includes(id)));
    const keep = [...wins, ...alive.filter(id => !wins.has(id)).sort((a, b) => R.chase.pts[b] - R.chase.pts[a])].slice(0, cut[1]);
    for(const id of alive) if(!keep.includes(id)){ R.chase.out.push(id); if(rcDriver(sp, id).tid === R.user) news(`❌ ${rcName(rcDriver(sp, id))} is eliminated from the Playoffs.`, 'bad', sp); }
    for(const id of keep) R.chase.pts[id] = 3000 + 1000 * ch.cuts.indexOf(cut) + (cut[1] === 4 ? 0 : rcDriver(sp, id).st.wins); if(cut[1] === 4){ R.chase.final = true; news(`🏁 Championship 4: ${keep.map(id => rcDriver(sp, id).ln).join(', ')}. Best finish in the last race wins the title!`, 'info', sp); } }
}
function rcDriverStandings(sp){ const R = rc(sp), act = R.players.filter(p => p.tid >= 0 || p.st.starts); const ch = R.chase;
  if(ch){ const alive = id => ch.field.includes(id) && !ch.out.includes(id); return act.sort((a, b) => (alive(b.id) - alive(a.id)) || (ch.field.includes(b.id) - ch.field.includes(a.id)) || ((ch.pts[b.id] || 0) - (ch.pts[a.id] || 0)) || b.st.pts - a.st.pts); }
  return act.sort((a, b) => b.st.pts - a.st.pts || b.st.wins - a.st.wins); }
const rcTeamStandings = sp => [...rc(sp).teams].sort((a, b) => b.pts - a.pts || b.wins - a.wins);

// ---------------- money ----------------
function rcPurse(sp, race, fin){ const R = rc(sp); if(R.user == null) return; const c = RC[sp], m = c.money, grow = Math.pow(1.04, R.season - 2026);
  let purse = 0; for(const d of rcDrivers(sp, R.user).filter(x => x.seat < 2)){ const i = fin.indexOf(d.id); purse += m.purse * (i < 0 ? .3 : Math.max(.3, 1 - i / fin.length) * (i === 0 ? 2.2 : 1)) * grow; }
  R.purse = (R.purse || 0) + purse; }
function rcFinances(sp, wk){
  const c = RC[sp], m = c.money, R = rc(sp), t = rcTeam(sp, R.user), f = t.fin, lines = [], C = rcCtrl(sp), grow = Math.pow(1.04, R.season - 2026);
  let rev = 0, exp = 0;
  const tv = (m.tv + Math.max(0, (c.teams.length - t.lastPos)) * m.prizeStep) / 52 * grow * (C ? ownerBoost('tv') : 1); rev += tv; lines.push(['Prize fund & TV share', tv]);
  const spons = m.sponsor / 52 * (.55 + t.hype / 110) * (.7 + t.pop * .15) * (1 + facOf(t, 'fan') * .12) * (C ? ownerBoost('merch') : 1); rev += spons; lines.push(['Sponsors & merchandise', spons]);
  if(R.purse){ rev += R.purse; lines.push(['Race winnings', R.purse]); R.purse = 0; }
  const pay = rcDrivers(sp, R.user).reduce((a, d) => a + d.con.amt, 0) / 52; exp += pay; lines.push(['Driver salaries', -pay]);
  const ops = m.ops / 52 * grow * (1 + facLevels(t) * .03); exp += ops; lines.push(['Factory, travel & crew', -ops]);
  const staff = t.coach.r * m.staff / 52; exp += staff; lines.push([c.coachWord[0].toUpperCase() + c.coachWord.slice(1), -staff]);
  teamProfit(sp, rev - exp); f.rev += rev; f.exp += exp; f.last = lines;
  if(wk === 51){ f.hist.unshift({y:R.season, rev:f.rev, exp:f.exp}); f.rev = 0; f.exp = 0; }
}
const rcUpCost = (sp, k, used) => Math.round(RC[sp].money.upgrade * (k === 'rel' ? .6 : 1) * (1 + used * .35) * 10) / 10;
function rcUpgrade(sp, k){ const R = rc(sp), t = rcTeam(sp, R.user), c = RC[sp], used = t.dev[k]; if(used >= c.devMax) return 'max'; const cost = rcUpCost(sp, k, used); if(S.cash < cost) return 'cash';
  S.cash -= cost; book('🏟️ Team upgrades', -cost); t.dev[k]++; const gain = Math.max(.4, (2.6 + t.coach.r / 60 + facOf(t, 'train') * .3 + gauss() * .8) * (1 - t.car[k] / 115)); t.car[k] = Math.min(99, Math.round((t.car[k] + gain) * 10) / 10);
  news(`🔧 New ${({aero:'aero package', eng:'power upgrade', rel:'reliability fixes'})[k]} for the ${t.name}: +${gain.toFixed(1)} (${Math.round(t.car[k])}).`, 'good', sp); return 'ok'; }
const rcCrewCost = sp => Math.round(RC[sp].money.upgrade * .5 * 10) / 10;
function rcCrewTrain(sp){ const t = rcTeam(sp, rc(sp).user), cost = rcCrewCost(sp); if(S.cash < cost || t.crew >= 99) return 'cash'; S.cash -= cost; book('🏟️ Team upgrades', -cost); t.crew = Math.min(99, t.crew + irand(2, 4)); return 'ok'; }

// ---------------- the weekly tick ----------------
function rcWeekly(sp){
  const c = RC[sp], R = rc(sp), wk = R.wk;
  const race = rcRaceNow(sp); if(race) rcApply(sp, race, rcSimRace(sp, race, false));
  // AI teams develop their cars through the season
  if(race) for(const t of R.teams){ if(t.id === R.user && rcCtrl(sp)) continue; if(Math.random() < .28 + t.pop * .04){ const k = pick(['aero', 'eng', 'rel']); t.car[k] = Math.min(99, t.car[k] + rand(.5, 2.2) * (1 - t.car[k] / 115)); } }
  for(const p of R.players) if(p.inj > 0 && !race) p.inj--;
  const last = rcLastWeek(sp);
  if(wk === last + 1) rcSeasonEnd(sp);
  if(wk === last + 3) rcMarketOpen(sp);
  if(wk >= last + 3 && wk <= last + 8) rcAIMarket(sp, wk === last + 8 ? 1 : .4);
  if(R.user != null) rcFinances(sp, wk);
  R.wk++;
  if(R.wk >= 52) rcNewSeason(sp);
}
function rcSeasonEnd(sp){
  const c = RC[sp], R = rc(sp);
  let champ; if(R.chase){ const fin = R.cal[R.cal.length - 1].res, alive = R.chase.field.filter(id => !R.chase.out.includes(id)); champ = rcDriver(sp, fin.find(id => alive.includes(id)) || alive[0]); } else champ = rcDriverStandings(sp)[0];
  const tchamp = c.chase ? rcTeam(sp, champ.tid) : rcTeamStandings(sp)[0];
  champ.titles++; champ.aw.push({y:R.season, a:'champ'}); tchamp.titles++; if(champ.tid >= 0) rcTeam(sp, champ.tid).dtitles++;
  R.hist.champs.unshift({y:R.season, d:rcName(champ), did:champ.id, dt:champ.tid, team:tchamp.name, tid:tchamp.id, wins:champ.st.wins});
  news(`🏆 ${rcName(champ)} is the ${R.season} ${c.champName} champion!${c.chase ? '' : ` The ${tchamp.name} take the teams' title.`}`, champ.tid === R.user || tchamp.id === R.user ? 'good' : 'info', sp);
  rcTeamStandings(sp).forEach((t, i) => { t.lastPos = i + 1; t.seasons.unshift({y:R.season, pos:i + 1, pts:t.pts, wins:t.wins, dchamp:champ.tid === t.id}); });
  const u = R.user; if(u != null){ const t = rcTeam(sp, u);
    if(tchamp.id === u){ S.trophies.unshift({sport:sp, kind:'title', y:R.season, n:`${R.season} ${c.teamTitle}`, team:t.name}); ach('title'); S.fame += 80; if(t.seasons[1] && t.seasons[1].pos === 1) ach('b2b'); if(t.seasons.slice(0, 5).filter(s => s.pos === 1).length >= 3) ach('dynasty'); }
    if(champ.tid === u && !c.chase){ S.trophies.unshift({sport:sp, kind:'title', y:R.season, n:`${R.season} Drivers' champion: ${rcName(champ)}`, team:t.name}); ach('mvp'); S.fame += 40; }
    if(t.wins) ach('playoffwin'); }
  // records
  const Rr = R.hist.records; for(const p of R.players.filter(x => x.st.starts)) for(const [k, lab] of [['wins', 'Wins in a season'], ['poles', 'Poles in a season'], ['pts', 'Points in a season'], ['pod', 'Podiums in a season']]) if(!Rr[k] || p.st[k] > Rr[k].v) Rr[k] = {v:p.st[k], n:rcName(p), abbr:p.tid >= 0 ? rcTeam(sp, p.tid).abbr : '-', y:R.season, lab};
  // aging, retirement, contracts
  for(const p of R.players){ if(p.st.starts) p.hist.unshift({y:R.season, tid:p.tid, ovr:p.ovr, st:{...p.st}}); for(const k in p.st) p.car[k] += p.st[k]; p.st = rcNewStats(); p.age++;
    const coach = p.tid >= 0 ? (rcTeam(sp, p.tid).coach.r - 70) / 18 + facOf(rcTeam(sp, p.tid), 'train') * .35 : 0, a = p.age - c.peak;
    let d = a <= -8 ? irand(1, 6) : a <= -4 ? irand(0, 4) : a <= 2 ? irand(-1, 2) : a <= 6 ? irand(-3, 0) : irand(-6, -1); d = Math.round(d + coach + gauss() * .7); if(d > 0 && p.ovr + d > p.pot + 2) d = Math.max(0, p.pot + 2 - p.ovr);
    p.ovr = clamp(p.ovr + d, 30, 99); p.peak = Math.max(p.peak, p.ovr); if(p.pot < p.ovr) p.pot = p.ovr; }
  const retire = R.players.filter(p => p.age >= c.ages[1] || (p.age >= c.ages[1] - 5 && Math.random() < .3) || (p.tid === -1 && p.age >= c.peak + 3 && Math.random() < .5));
  for(const p of retire){ const hof = p.titles * 30 + p.car.wins * 1.2 + p.car.poles * .3; if(hof >= 70){ p.hof = R.season + 1; news(`🏛️ ${rcName(p)} retires and enters the Hall of Fame (${p.titles} titles, ${p.car.wins} wins).`, 'info', sp); if(p.hist.some(h => h.tid === R.user)) ach('hof'); } else if(p.tid === R.user) news(`👋 ${rcName(p)} retires.`, 'info', sp); p.tid = -3; }
  R.players = R.players.filter(p => p.tid !== -3 || p.hof); rcIndex(sp);
  R.resign = []; for(const p of R.players){ if(p.tid < 0) continue; p.con.yrs--; if(p.con.yrs > 0) continue; const ask = Math.round(rcSalary(sp, p.ovr, p.age) * rand(1, 1.2) * 10) / 10;
    if(p.tid === R.user && rcCtrl(sp)) R.resign.push({id:p.id, ask, yrs:irand(1, 3)}); else if(p.ovr >= 66 && Math.random() < .7){ p.con = {amt:ask, yrs:irand(1, 3)}; } else { p.tid = -1; p.ask = ask; } }
  if(R.resign.length) news(`✍️ ${R.resign.length} of your drivers' contracts are up. Re-sign or release them (Drivers tab) before the driver market opens.`, 'info', sp);
  for(let k = 0; k < 4; k++){ const p = rcNewDriver(sp, {tid:-1, age:irand(18, 20), ovr:54 + gauss() * 5}); p.pot = clamp(p.ovr + irand(10, 30), p.ovr, 97); p.ask = rcSalary(sp, p.ovr, p.age); p.rookie = true; }
}
function rcMarketOpen(sp){ const R = rc(sp); for(const r of R.resign){ const p = rcDriver(sp, r.id); if(p && p.tid === R.user && p.con.yrs <= 0){ p.tid = -1; p.ask = r.ask; news(`${rcName(p)} left your team.`, 'bad', sp); } } R.resign = []; for(const p of R.players) if(p.tid === -1 && !p.ask) p.ask = rcSalary(sp, p.ovr, p.age); }
function rcSeatsFree(sp, tid){ const ds = rcDrivers(sp, tid); return [0, 1, 2].filter(s => !ds.some(d => d.seat === s)); }
function rcAIMarket(sp, frac){ const R = rc(sp); const fa = R.players.filter(p => p.tid === -1).sort((a, b) => (b.ovr + (b.pot - b.ovr) * .3) - (a.ovr + (a.pot - a.ovr) * .3));
  for(const t of shuffle([...R.teams])){ if(t.id === R.user && rcCtrl(sp) && frac < 1) continue; for(const seat of rcSeatsFree(sp, t.id).filter(s => s < 2)){ if(Math.random() > frac) continue; const p = fa.find(x => x.tid === -1); if(!p) break; p.tid = t.id; p.seat = seat; p.con = {amt:p.ask || rcSalary(sp, p.ovr, p.age), yrs:irand(1, 3)}; if(t.id === R.user) news(`📝 With a seat empty, the team signed ${rcName(p)}.`, 'info', sp); } } }
function rcNewSeason(sp){ const c = RC[sp], R = rc(sp); R.wk = 0; R.season++; R.lastRace = null;
  for(const t of R.teams){ t.pts = 0; t.wins = 0; t.dev = {aero:0, eng:0, rel:0}; for(const k of ['aero', 'eng', 'rel']) t.car[k] = Math.round((t.car[k] * .75 + (60 + t.pop * 3) * .25 + gauss() * 2) * 10) / 10; } // new regulations pull the field together
  for(const p of R.players){ p.inj = 0; delete p.rookie; } rcAIMarket(sp, 1); for(const t of R.teams) for(const s of rcSeatsFree(sp, t.id).filter(s => s < 2)){ const p = rcNewDriver(sp, {tid:t.id, seat:s, ovr:55 + gauss() * 4, age:irand(19, 24)}); p.con.amt = c.money.minSal; }
  rcCalendar(sp); news(`${sportMeta(sp).icon} The ${R.season} ${c.champName} season starts at the ${R.cal[0].n} in ${c.raceWeeks[0]} week${c.raceWeeks[0] === 1 ? '' : 's'}!`, 'info', sp); }
function rcTeamValue(sp, tid){ const R = rc(sp), t = rcTeam(sp, tid), [p0, p1] = sportMeta(sp).price, n = RC[sp].teams.length, f = clamp((t.pop - 1) / 4 * .45 + (n - t.lastPos) / (n - 1) * .35 + (t.hype - 25) / 70 * .2, 0, 1);
  return Math.round((p0 + (p1 - p0) * f) * (1 + t.titles * .04) * Math.pow(1.05, R.season - 2026) + facLevels(t) * facCost(sp, 0) * .8); }
const rcCarOvr = (sp, t) => Math.round((t.car.aero + t.car.eng + t.car.rel * .5) / 2.5);
