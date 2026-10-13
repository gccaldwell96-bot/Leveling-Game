'use strict';
// =====================================================================================
//  MMA: Fighting Championship. You own a fight camp. The promotion runs an event every two
//  weeks; fighters in eight weight classes are ranked by results (Elo), champions defend
//  belts in five-round main events. Owners sign fighters, book fights, call for title shots.
//  Calendar: mm.wk = week of the year; events on even weeks; the year ends at week 51.
// =====================================================================================
const MM_WC = [['FLY', 'Flyweight'], ['BW', 'Bantamweight'], ['FW', 'Featherweight'], ['LW', 'Lightweight'], ['WW', 'Welterweight'], ['MW', 'Middleweight'], ['LHW', 'Light heavyweight'], ['HW', 'Heavyweight']];
const MM_NICK = 'The Hammer|Bulldozer|Cyclone|The Viper|Iceman|Showtime|The Reaper|Lionheart|Thunder|The Machine|Bonecrusher|Silk|The Natural|Smokin|Wolf|Venom|Titan|Ghost|Hurricane|Spider|Rhino|The Surgeon|Blaze|Mad Dog|Sniper|Dynamite|Steel|Phantom|Diablo|Gladiator|Samurai|Tank|The Prodigy|Kong|Falcon|Razor|The Butcher|Stormborn|Jaws|Wildcard'.split('|');
const MM_TEAMS = [['Iron Lion MMA', 'ILN', '#c8102e', '#ffd23f', 5, 1.4], ['Apex Fight Club', 'AFC', '#111111', '#e5e7eb', 5, 1.2], ['Black Mamba Gym', 'BMG', '#1a1a1a', '#00a86b', 4, 1], ['Tiger Muay Lab', 'TML', '#ff7a00', '#111111', 4, .8],
  ['Silverback Combat', 'SBC', '#6b7280', '#38bdf8', 3, .6], ['Desert Wolves', 'DWV', '#c2a878', '#5a3825', 3, .4], ['Northstar Grappling', 'NSG', '#0b3d91', '#ffffff', 3, .3], ['Red Dragon Dojo', 'RDD', '#a50021', '#f5c400', 3, .1],
  ['Blue Steel Academy', 'BSA', '#1d4ed8', '#c0c0c0', 2, 0], ['Viking Fight Co', 'VFC', '#2f4f4f', '#d4af37', 2, -.2], ['Atlas Combat Center', 'ACC', '#4b2e83', '#e5e7eb', 2, -.4], ['Cobra Kai-ser', 'CKS', '#14532d', '#facc15', 2, -.6],
  ['Southside Boxing & MMA', 'SBX', '#7c2d12', '#fde68a', 1, -.8], ['Harbor Fight Lab', 'HFL', '#0e7490', '#f8fafc', 2, -1], ['Granite Gym', 'GRG', '#57534e', '#f97316', 1, -1.2], ['Phoenix Combat', 'PHX', '#ea580c', '#fef08a', 2, -1.4]];
const mm = () => S.sports.mma;
const mmTeam = tid => mm().teams[tid];
const mmF = pid => mm().pmap[pid];
const mmRoster = tid => mm().players.filter(p => p.tid === tid);
const mmCtrl = () => mm().user != null && inCtrl('mma');
const mmName = (p, short) => short ? `${p.fn[0]}. ${p.ln}` : `${p.fn} ${p.ln}`;
const mmRec = p => `${p.rec.w}-${p.rec.l}${p.rec.d ? '-' + p.rec.d : ''}`;
const mmWCName = wc => MM_WC.find(w => w[0] === wc)[1];
function mmIndex(){ const M = mm(); Object.defineProperty(M, 'pmap', {value:{}, enumerable:false, writable:true, configurable:true}); for(const p of M.players) M.pmap[p.id] = p; }
function mmPurse(ovr, age){ return Math.max(.03, Math.round(.9 * Math.pow(clamp((ovr - 45) / 50, .02, 1), 2.5) * (age >= 37 ? .7 : 1) * 100) / 100); }
function mmNew(opts = {}){ const age = opts.age ?? irand(22, 35), [fn, ln] = personName().split(' '), ovr = Math.round(clamp(opts.ovr ?? 64 + gauss() * 8, 35, 97)), style = pick(['striker', 'wrestler', 'bjj', 'allround']);
  const b = k => Math.round(clamp(ovr + (style === k ? 7 : style === 'allround' ? 2 : -4) + gauss() * 4, 30, 99));
  const p = {id:uid(), fn, ln, nick:pick(MM_NICK), age, wc:opts.wc || pick(MM_WC)[0], ovr, style, str:b('striker'), wre:b('wrestler'), bjj:b('bjj'), chin:Math.round(clamp(60 + gauss() * 12, 30, 99)), card:Math.round(clamp(ovr + gauss() * 6, 30, 99)),
    pot:Math.min(99, ovr + (age <= 24 ? irand(5, 18) : age <= 27 ? irand(0, 8) : 0)), tid:opts.tid ?? -1, con:{amt:0, yrs:irand(1, 4)}, rec:{w:irand(4, 14), l:irand(0, 5), d:0}, elo:1400 + (ovr - 60) * 12 + gauss() * 40, st:{w:0, l:0, ko:0, sub:0, dec:0, sl:0, td:0, fights:0}, car:{w:0, l:0, ko:0, sub:0, dec:0, sl:0, td:0, fights:0}, hist:[], aw:[], peak:ovr, inj:0, last:-99, champ:false, def:0, streak:0};
  p.con.amt = mmPurse(ovr, age); mm().players.push(p); mm().pmap[p.id] = p; return p; }
const mmRank = wc => mm().players.filter(p => p.wc === wc && p.tid >= -1 && !p.ret).sort((a, b) => b.champ - a.champ || b.elo - a.elo);
const mmRankOf = p => p.champ ? 'C' : mmRank(p.wc).filter(x => !x.champ).indexOf(p) + 1;

// ---------------- the promotion ----------------
function mmInit(){
  const back = 20, M = S.sports.mma = {season:yearOf(S.week - back), wk:((S.week - back) % 52 + 52) % 52, t:0, teams:[], players:[], events:[], evNo:300 + irand(0, 40), user:null, hist:{champs:[], awards:[], records:{}}, resign:[], req:[], lastEvent:null};
  mmIndex();
  MM_TEAMS.forEach(([name, abbr, c1, c2, pop, q], i) => { M.teams.push({id:i, name, abbr, city:'', c1, c2, pop, q, hype:clamp(Math.round(50 + q * 8 + gauss() * 5), 20, 90), coach:{name:personName(), r:irand(55, 88)}, titles:0, wins:0, losses:0, seasons:[], fin:{rev:0, exp:0, hist:[], last:[]}, fac:{train:0, med:0, fan:0}, gym:{lvl:1}});
    for(let k = 0; k < 7; k++) mmNew({tid:i, wc:MM_WC[(i + k * 3) % 8][0], ovr:66 + q * 3.5 + gauss() * 7}); });
  for(let k = 0; k < 40; k++) mmNew({tid:-1, ovr:58 + gauss() * 7});
  for(const [wc] of MM_WC){ const top = mmRank(wc)[0]; top.champ = true; top.def = irand(0, 4); }
  quietly(() => { for(let k = 0; k < back; k++) mmWeekly(); }); // a promotion with some recent history
}
// matchmaking: user requests first, then a title fight in rotation, then ranked pairings in every division
function mmCard(){
  const M = mm();
  const used = new Set(), bouts = [];
  const ok = p => p && !used.has(p.id) && !p.inj && !p.ret && M.t - p.last >= 6; // at least six weeks between fights
  const add = (a, b, title, main) => { used.add(a.id); used.add(b.id); bouts.push({a:a.id, b:b.id, wc:a.wc, title:!!title, main:!!main}); };
  for(const r of M.req.splice(0)){ const p = mmF(r.pid); if(!ok(p)) continue; const R = mmRank(p.wc);
    if(r.type === 'title'){ const ch = R.find(x => x.champ); if(ch && ok(ch) && ch !== p){ add(ch, p, true, true); news(`🥊 Title shot! ${mmName(p)} gets ${mmName(ch)} for the ${mmWCName(p.wc)} belt.`, 'good', 'mma'); continue; } }
    const opp = R.filter(x => x !== p && ok(x) && !x.champ).sort((x, y) => Math.abs(x.elo - p.elo) - Math.abs(y.elo - p.elo))[0]; if(opp) add(p, opp); }
  const wcs = shuffle(MM_WC.map(w => w[0]));
  if(!bouts.some(b => b.title)) for(const wc of wcs){ const R = mmRank(wc), ch = R.find(x => x.champ), con = R.filter(x => !x.champ && ok(x)).slice(0, 3); if(ch && ok(ch) && con.length && M.t - ch.last >= 12){ add(ch, con[0], true, true); break; } }
  for(const wc of wcs){ const R = mmRank(wc).filter(x => !x.champ && ok(x) && x.tid >= 0 || !x.champ && ok(x) && x.tid === -1 && Math.random() < .3);
    for(let i = 0; i + 1 < R.length && bouts.length < 13; i += 2){ if(Math.random() < .55) add(R[i], R[i + 1]); } }
  if(!bouts.some(b => b.main) && bouts.length) bouts[bouts.length > 1 ? 1 : 0].main = true;
  return bouts.sort((x, y) => (y.title - x.title) || (y.main - x.main));
}
// ---------------- one fight ----------------
function mmSimFight(A, B, rounds, record){
  const F = [A, B], dmg = [0, 0], score = [0, 0], log = [], st = [{sl:0, td:0}, {sl:0, td:0}], nm = p => p.ln;
  const coachA = A.tid >= 0 ? mmTeam(A.tid).coach.r : 65, coachB = B.tid >= 0 ? mmTeam(B.tid).coach.r : 65, cb = [coachA, coachB];
  const push = (r, sec, side, type, txt, extra) => { if(record) log.push({r, sec, side, type, txt, hp:[Math.max(0, 100 - dmg[0]), Math.max(0, 100 - dmg[1])], sc:[...score], ...extra}); };
  let res = null;
  for(let r = 1; r <= rounds && !res; r++){
    const rs = [0, 0]; let ground = -1; // side on top when on the mat
    push(r, 0, -1, 'round', `Round ${r}!`);
    for(let k = 0; k < 10 && !res; k++){ const sec = (k + 1) * 30;
      const fat = s => 1 - Math.max(0, (r - 1) * .08 - (F[s].card - 60) / 400) - dmg[s] / 300;
      if(ground < 0){
        const s = Math.random() < .5 ? 0 : 1, o = 1 - s, me = F[s], op = F[o];
        if(Math.random() < (me.wre - 40) / 260 * (me.style === 'wrestler' || me.style === 'bjj' ? 1.5 : .7)){ // takedown attempt
          if(Math.random() < .35 + (me.wre - op.wre) / 120){ ground = s; st[s].td++; rs[s] += 1.2; push(r, sec, s, 'td', `${nm(me)} shoots and gets the takedown!`); } else push(r, sec, s, 'tdx', `${nm(op)} stuffs the takedown.`); continue; }
        for(const a of [0, 1]){ const me2 = F[a], op2 = F[1 - a], land = Math.max(0, Math.round((me2.str - 30) / 9 * fat(a) + gauss() * 1.5 + (cb[a] - cb[1 - a]) / 40)); st[a].sl += land; rs[a] += land * .25; dmg[1 - a] += land * (me2.str / 80) * (1.1 - op2.chin / 200) * .9; }
        const big = Math.random() < .07 ? (Math.random() < (F[0].str * fat(0)) / (F[0].str * fat(0) + F[1].str * fat(1)) ? 0 : 1) : -1;
        if(big >= 0){ const hit = 1 - big, pow = F[big].str / 70; dmg[hit] += 14 * pow; rs[big] += 3;
          if(Math.random() < (dmg[hit] - 40) / 70 * (1.3 - F[hit].chin / 120)){ res = {w:big, how:'KO', r, sec}; push(r, sec, big, 'ko', `${nm(F[big])} lands a ${pick(['left hook', 'right hand', 'head kick', 'knee', 'uppercut', 'spinning back fist'])}... ${nm(F[hit])} is OUT! KO!`, {big:true}); break; }
          push(r, sec, big, 'kd', `${nm(F[big])} drops ${nm(F[hit])} with a ${pick(['counter left', 'stiff jab', 'body kick', 'overhand right', 'elbow'])}!`, {big:true});
          if(Math.random() < .35){ ground = big; } }
        else if(Math.random() < .5) push(r, sec, st[0].sl > st[1].sl ? 0 : 1, 'str', `${pick(['Busy exchange in the center', 'Leg kicks traded', 'Jabs finding the target', 'Clinch work against the cage', 'Combination lands'])}.`);
        if(dmg[0] > 92 || dmg[1] > 92){ const w = dmg[0] > dmg[1] ? 1 : 0; res = {w, how:'TKO', r, sec}; push(r, sec, w, 'ko', `${nm(F[w])} swarms and the referee stops it! TKO!`, {big:true}); }
      } else {
        const s = ground, o = 1 - s, me = F[s], op = F[o];
        const gnp = Math.max(0, Math.round((me.wre + me.str) / 30 * fat(s) + gauss() * 1.2)); st[s].sl += gnp; dmg[o] += gnp * 1.1; rs[s] += 1 + gnp * .2;
        if(Math.random() < (me.bjj - 45) / 200 * (me.style === 'bjj' ? 1.6 : 1) * (1 + dmg[o] / 120)){ const subName = pick(['rear-naked choke', 'armbar', 'triangle choke', 'guillotine', 'kimura', 'arm-triangle']);
          if(Math.random() < .3 + (me.bjj - op.bjj) / 100){ res = {w:s, how:'SUB', r, sec}; push(r, sec, s, 'sub', `${nm(me)} locks in a ${subName}... ${nm(op)} TAPS!`, {big:true}); break; }
          push(r, sec, s, 'subx', `${nm(me)} hunts a ${subName}, ${nm(op)} escapes!`); }
        else if(gnp > 4) push(r, sec, s, 'gnp', `${nm(me)} rains down ground-and-pound!`);
        if(dmg[o] > 92){ res = {w:s, how:'TKO', r, sec}; push(r, sec, s, 'ko', `The ref waves it off! ${nm(me)} wins by TKO on the ground!`, {big:true}); }
        if(Math.random() < .3 + (op.wre - me.wre) / 150){ ground = -1; push(r, sec, o, 'up', `${nm(op)} scrambles back to the feet.`); }
      }
    }
    if(!res){ const w = rs[0] === rs[1] ? (Math.random() < .5 ? 0 : 1) : rs[0] > rs[1] ? 0 : 1; score[w] += 10; score[1 - w] += rs[w] - rs[1 - w] > 6 ? 8 : 9; dmg[0] = Math.max(0, dmg[0] - 6); dmg[1] = Math.max(0, dmg[1] - 6);
      push(r, 300, w, 'rend', `End of round ${r}: ${nm(F[w])} takes it ${10}-${rs[w] - rs[1 - w] > 6 ? 8 : 9} on our card.`); }
  }
  if(!res){ let w = score[0] > score[1] ? 0 : 1, split = Math.abs(score[0] - score[1]) <= 1; if(score[0] === score[1]){ w = Math.random() < .2 ? -1 : Math.random() < .5 ? 0 : 1; split = true; } // level cards: the judges split, rarely a draw
    res = w < 0 ? {w:-1, how:'DRAW', r:rounds, sec:300} : {w, how:split ? 'Split decision' : 'Decision', r:rounds, sec:300};
    push(rounds, 300, w, 'dec', w < 0 ? `It's a DRAW on the judges' cards!` : `${nm(F[w])} wins by ${res.how.toLowerCase()} (${score[w]}-${score[1 - w]}).`, {big:true}); }
  res.st = st; res.log = log; return res;
}
function mmApply(b, res){
  const M = mm(), A = mmF(b.a), B = mmF(b.b), F = [A, B];
  b.res = {w:res.w < 0 ? null : F[res.w].id, how:res.how, r:res.r};
  for(const s of [0, 1]){ const p = F[s], o = F[1 - s]; p.last = M.t; p.st.fights++; p.st.sl += res.st[s].sl; p.st.td += res.st[s].td;
    if(res.w === s){ p.rec.w++; p.st.w++; p.streak = Math.max(1, p.streak + 1); if(res.how === 'KO' || res.how === 'TKO') p.st.ko++; else if(res.how === 'SUB') p.st.sub++; else p.st.dec++; if(p.tid >= 0) mmTeam(p.tid).wins++; }
    else if(res.w < 0) { p.rec.d++; }
    else { p.rec.l++; p.st.l++; p.streak = Math.min(-1, p.streak - 1); if(p.tid >= 0) mmTeam(p.tid).losses++; if(res.how === 'KO' || res.how === 'TKO') p.inj = irand(4, 10); else if(Math.random() < .25) p.inj = irand(2, 6); if(p.tid >= 0) p.inj = Math.round(p.inj * (1 - .15 * facOf(mmTeam(p.tid), 'med'))); } }
  if(res.w >= 0){ const w = F[res.w], l = F[1 - res.w], exp = 1 / (1 + Math.pow(10, (l.elo - w.elo) / 400)), k = b.title ? 48 : 36; w.elo += k * (1 - exp) * (res.how === 'Decision' || res.how === 'Split decision' ? 1 : 1.25); l.elo -= k * (1 - exp);
    if(b.title){ if(l.champ){ l.champ = false; w.champ = true; w.def = 0; news(`👑 NEW CHAMPION! ${mmName(w)} takes the ${mmWCName(w.wc)} title from ${mmName(l)}.`, w.tid === M.user ? 'good' : l.tid === M.user ? 'bad' : 'info', 'mma'); if(w.tid === M.user){ S.trophies.unshift({sport:'mma', kind:'title', y:M.season, n:`${M.season} ${mmWCName(w.wc)} champion: ${mmName(w)}`, team:mmTeam(w.tid).name}); ach('title'); S.fame += 40; mmTeam(w.tid).titles++; } }
      else if(w.champ){ w.def++; news(`🏆 ${mmName(w)} defends the ${mmWCName(w.wc)} belt (${w.def} defence${w.def > 1 ? 's' : ''}).`, w.tid === M.user ? 'good' : 'info', 'mma'); if(w.tid === M.user){ S.fame += 15; if(w.def >= 3) ach('b2b'); if(w.def >= 5) ach('dynasty'); } } } }
  // purses: the camp keeps a share of what its fighters earn
  for(const s of [0, 1]){ const p = F[s]; if(p.tid < 0) continue; const purse = p.con.amt * (res.w === s ? 2 : 1) * (b.title ? 3 : b.main ? 1.6 : 1) + (res.w === s && res.how !== 'Decision' && res.how !== 'Split decision' ? .05 : 0); mmTeam(p.tid).purse = (mmTeam(p.tid).purse || 0) + purse * .25 + (b.title ? .6 : 0); }
  if(A.tid === M.user || B.tid === M.user){ const mine = A.tid === M.user ? A : B, won = res.w >= 0 && F[res.w] === mine; if(won) ach('win1'); mmTeam(M.user).hype = clamp(mmTeam(M.user).hype + (won ? 2 : res.w < 0 ? 0 : -1.5) * (b.title ? 2 : 1), 5, 100);
    news(`${won ? '✅' : res.w < 0 ? '🤝' : '❌'} ${mmName(mine)} ${won ? 'beats' : res.w < 0 ? 'draws with' : 'loses to'} ${mmName(mine === A ? B : A)} by ${res.how}${res.how === 'Decision' || res.how === 'Split decision' || res.how === 'DRAW' ? '' : ` in round ${res.r}`}.`, won ? 'good' : 'bad', 'mma'); }
}
function mmEvent(watch){ const M = mm(), card = mmCard(); M.evNo++; const ev = {no:M.evNo, wk:M.wk, ew:S.week, bouts:card}; let rec = null;
  for(const b of card){ const A = mmF(b.a), B = mmF(b.b), mine = A.tid === M.user || B.tid === M.user, res = mmSimFight(A, B, b.title || b.main ? 5 : 3, watch && mine && !rec); if(watch && mine && !rec) rec = {b, res}; mmApply(b, res); }
  M.events.unshift(ev); if(M.events.length > 30) M.events.length = 30; M.lastEvent = ev; return rec; }

// ---------------- the year ----------------
function mmWeekly(){ const M = mm();
  if(M.wk % 2 === 0 && !M.done) mmEvent(false); M.done = false;
  for(const p of M.players) if(p.inj > 0) p.inj--;
  if(M.user != null) mmFinances();
  if(M.wk === 51) mmYearEnd();
  M.t++; M.wk = (M.wk + 1) % 52; if(M.wk === 0){ M.season++; M.ack = null; }
  if(M.wk === 2 && M.resign.length) mmMarket(); }
function mmFinances(){ const M = mm(), t = mmTeam(M.user), f = t.fin, lines = [], C = mmCtrl(), grow = Math.pow(1.04, M.season - 2026), champs = mmRoster(t.id).filter(p => p.champ).length;
  let rev = 0, exp = 0;
  const gym = (3.6 + t.pop * 1.2) * (1 + (t.gym.lvl - 1) * .25) * (1 + facOf(t, 'fan') * .1) / 52 * grow; rev += gym; lines.push(['Gym memberships & classes', gym]);
  const sp = (3 + t.hype / 10 + champs * 2.5) / 52 * grow * (C ? ownerBoost('merch') : 1); rev += sp; lines.push(['Sponsors & merch', sp]);
  const media = 2.5 / 52 * grow * (C ? ownerBoost('tv') : 1); rev += media; lines.push(['Media & content', media]);
  if(t.purse){ rev += t.purse; lines.push(['Camp share of fight purses', t.purse]); t.purse = 0; }
  const train = mmRoster(t.id).length * .22 / 52; exp += train; lines.push(['Fighter camps & travel', -train]);
  const staff = t.coach.r * .03 / 52; exp += staff; lines.push(['Coaches', -staff]);
  const ops = (4 + t.gym.lvl * 1.5) / 52 * grow * (1 + facLevels(t) * .04); exp += ops; lines.push(['Gym rent & operations', -ops]);
  teamProfit('mma', rev - exp); f.rev += rev; f.exp += exp; f.last = lines;
  if(M.wk === 51){ f.hist.unshift({y:M.season, rev:f.rev, exp:f.exp}); f.rev = 0; f.exp = 0; } }
function mmYearEnd(){ const M = mm();
  const act = M.players.filter(p => p.st.fights), score = p => p.st.w * 10 - p.st.l * 6 + p.st.ko * 4 + p.st.sub * 4 + (p.champ ? 25 : 0) + (p.elo - 1400) / 20;
  const foty = act.sort((a, b) => score(b) - score(a))[0], ko = [...act].sort((a, b) => (b.st.ko + b.st.sub) - (a.st.ko + a.st.sub))[0];
  const row = {y:M.season}; if(foty){ foty.aw.push({y:M.season, a:'foty'}); row.foty = {n:mmName(foty), tid:foty.tid, wc:foty.wc}; if(foty.tid === M.user) ach('mvp'); } if(ko){ ko.aw.push({y:M.season, a:'finisher'}); row.fin = {n:mmName(ko), tid:ko.tid, wc:ko.wc, v:ko.st.ko + ko.st.sub}; }
  M.hist.awards.unshift(row); M.hist.champs.unshift({y:M.season, list:MM_WC.map(([wc]) => { const c = mmRank(wc).find(p => p.champ); return c ? {wc, n:mmName(c), tid:c.tid, def:c.def} : null; }).filter(Boolean)});
  if(foty) news(`🏅 ${M.season} Fighter of the Year: ${mmName(foty)} (${mmRec(foty)}).`, foty.tid === M.user ? 'good' : 'info', 'mma');
  for(const t of M.teams){ t.seasons.unshift({y:M.season, w:t.wins, l:t.losses, champs:mmRoster(t.id).filter(p => p.champ).length}); t.wins = 0; t.losses = 0; }
  if(M.user != null){ const t = mmTeam(M.user); if(t.seasons[0].w > t.seasons[0].l) ach('winseason'); }
  const Rr = M.hist.records; for(const p of act) for(const [k, lab] of [['w', 'Wins in a year'], ['ko', 'KO/TKO wins in a year'], ['sub', 'Submission wins in a year']]) if(!Rr[k] || p.st[k] > Rr[k].v) Rr[k] = {v:p.st[k], n:mmName(p), abbr:p.tid >= 0 ? mmTeam(p.tid).abbr : 'FA', y:M.season, lab};
  for(const p of M.players){ for(const k in p.st) p.car[k] += p.st[k]; if(p.st.fights) p.hist.unshift({y:M.season, tid:p.tid, ovr:p.ovr, rec:`${p.st.w}-${p.st.l}`, wc:p.wc, champ:p.champ}); p.st = {w:0, l:0, ko:0, sub:0, dec:0, sl:0, td:0, fights:0}; p.age++;
    const coach = p.tid >= 0 ? (mmTeam(p.tid).coach.r - 70) / 18 + facOf(mmTeam(p.tid), 'train') * .35 : 0, a = p.age - 29;
    let d = a <= -6 ? irand(1, 6) : a <= -3 ? irand(0, 4) : a <= 2 ? irand(-1, 2) : a <= 5 ? irand(-4, 0) : irand(-7, -1); d = Math.round(d + coach + gauss() * .7); if(d > 0 && p.ovr + d > p.pot + 2) d = Math.max(0, p.pot + 2 - p.ovr);
    p.ovr = clamp(p.ovr + d, 30, 99); for(const k of ['str', 'wre', 'bjj', 'card']) p[k] = clamp(p[k] + d + irand(-1, 1), 30, 99); if(a >= 4) p.chin = Math.max(25, p.chin - irand(1, 4)); p.peak = Math.max(p.peak, p.ovr); if(p.pot < p.ovr) p.pot = p.ovr; }
  const retire = M.players.filter(p => p.age >= 41 || (p.age >= 36 && Math.random() < .3) || (p.streak <= -3 && p.age >= 32 && Math.random() < .4) || (p.tid === -1 && p.age >= 33 && Math.random() < .4));
  for(const p of retire){ if(p.champ){ p.champ = false; const nx = mmRank(p.wc).filter(x => x !== p && x.tid >= -1)[0]; if(nx){ nx.champ = true; nx.def = 0; news(`👑 ${mmName(p)} retires as champion; ${mmName(nx)} is promoted to ${mmWCName(p.wc)} champion.`, 'info', 'mma'); } }
    const hof = p.aw.length * 12 + (p.car.w - p.car.l) * 1.5 + p.hist.filter(h => h.champ).length * 12; if(hof >= 70){ p.hof = M.season + 1; news(`🏛️ ${mmName(p)} retires and enters the Hall of Fame.`, 'info', 'mma'); if(p.hist.some(h => h.tid === M.user)) ach('hof'); } else if(p.tid === M.user) news(`👋 ${mmName(p)} hangs up the gloves.`, 'info', 'mma'); p.tid = -3; p.ret = true; }
  M.players = M.players.filter(p => !p.ret || p.hof); mmIndex();
  M.resign = []; for(const p of M.players){ if(p.tid < 0) continue; p.con.yrs--; if(p.con.yrs > 0) continue; const ask = Math.round(mmPurse(p.ovr, p.age) * rand(1, 1.2) * 100) / 100;
    if(p.tid === M.user && mmCtrl()) M.resign.push({id:p.id, ask, yrs:irand(1, 4)}); else if(p.ovr >= 62 && Math.random() < .75) p.con = {amt:ask, yrs:irand(1, 4)}; else { p.tid = -1; p.ask = ask; } }
  if(M.resign.length) news(`✍️ ${M.resign.length} of your fighters' contracts are up. Re-sign them (Fighters tab) in the next two weeks.`, 'info', 'mma');
  for(let k = 0; k < 18; k++){ const p = mmNew({tid:-1, age:irand(20, 24), ovr:55 + gauss() * 6}); p.rec = {w:irand(3, 9), l:irand(0, 2), d:0}; p.elo = 1330 + gauss() * 30; p.ask = mmPurse(p.ovr, p.age); p.prospect = true; }
  for(const t of M.teams){ if(t.id === M.user && mmCtrl()) continue; while(mmRoster(t.id).length < 6){ const fa = M.players.filter(p => p.tid === -1).sort((a, b) => b.ovr + (b.pot - b.ovr) * .4 - a.ovr - (a.pot - a.ovr) * .4)[0]; if(!fa) break; fa.tid = t.id; fa.con = {amt:fa.ask || mmPurse(fa.ovr, fa.age), yrs:irand(1, 4)}; } }
}
function mmMarket(){ const M = mm(); for(const r of M.resign){ const p = mmF(r.id); if(p && p.tid === M.user && p.con.yrs <= 0){ p.tid = -1; p.ask = r.ask; news(`${mmName(p)} left the camp.`, 'bad', 'mma'); } } M.resign = []; }
function mmTeamValue(tid){ const t = mmTeam(tid), M = mm(), [p0, p1] = sportMeta('mma').price, champs = mmRoster(tid).filter(p => p.champ).length, f = clamp((t.pop - 1) / 4 * .45 + (t.hype - 25) / 70 * .35 + champs * .07, 0, 1);
  return Math.round((p0 + (p1 - p0) * f) * Math.pow(1.05, M.season - 2026) + facLevels(t) * facCost('mma', 0) * .8 + (t.gym.lvl - 1) * 12); }
const mmCampOvr = tid => { const r = mmRoster(tid).sort((a, b) => b.ovr - a.ovr).slice(0, 6); return r.length ? Math.round(r.reduce((a, p) => a + p.ovr, 0) / r.length) : 0; };
