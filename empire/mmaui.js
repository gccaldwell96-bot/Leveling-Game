'use strict';
// =====================================================================================
//  MMA SCREENS + octagon viewer + module wrapper
// =====================================================================================
const mmMyBouts = () => { const M = mm(), u = M.user; return u == null ? [] : (M.next || []).filter(b => mmF(b.a) && mmF(b.b) && (mmF(b.a).tid === u || mmF(b.b).tid === u)); };
SPORTS.mma = {
  init(){ mmInit(); }, load(){ mmIndex(); },
  teamValue(tid){ return mmTeamValue(tid); }, teamName(tid){ return mmTeam(tid).name; }, team(tid){ return mmTeam(tid); },
  follow(tid){ mm().user = tid; mm().resign = []; }, logo(tid, size){ return crest(mmTeam(tid), size, 'hex'); },
  record(tid){ const r = mmRoster(tid); return `${r.length} fighters · ${r.filter(p => p.champ).length} champion${r.filter(p => p.champ).length === 1 ? '' : 's'} · ${r.reduce((a, p) => a + p.st.w, 0)}-${r.reduce((a, p) => a + p.st.l, 0)} this year`; },
  teams(){ return mm().teams.map(t => { const r = mmRoster(t.id), ch = r.filter(p => p.champ); return {id:t.id, name:t.name, logo:crest(t, 44, 'hex'), sub:`${r.length} fighters${ch.length ? ` · 👑 ${ch.map(p => p.ln).join(', ')}` : ''} · market ${'★'.repeat(t.pop)}${'☆'.repeat(5 - t.pop)}`, ovr:mmCampOvr(t.id)}; }); },
  marketNote(){ return 'A fight camp earns from gym memberships, sponsors and a share of its fighters\' purses. Champions make a camp famous.'; },
  blocker(){ return null; },
  weekly(){ mmWeekly(); },
  halt(){ const M = mm(); return mmCtrl() && M.wk === 1 && M.resign.length && M.ack !== M.season ? 'contracts' : null; },
  goBlock(){ mm().ack = mm().season; go('mma', 'fighters'); toast('✍️ Decide your fighters\' contracts'); },
  tabs(){ return [['home', 'Home'], ['fighters', 'Fighters' + (mmCtrl() && mm().resign.length ? ' •' : '')], ['events', 'Events'], ['ranks', 'Rankings'], ['fran', 'Franchise'], ['hist', 'History']]; },
  view(tab){ return ({home:mmHome, fighters:mmFightersView, events:mmEventsView, ranks:mmRanksView, fran:mmFranView, hist:mmHistView}[tab] || mmHome)(); },
  act(){ const M = mm(); return M.wk % 2 === 0 ? `▶ FC ${M.evNo + 1} fight night` : '▶ Next week · fight night'; },
  async playUser(mode){ const M = mm(); if(M.wk % 2 !== 0) return; const watch = mode === 'watch' || (mode !== 'sim' && S.settings.watch); const rec = mmEvent(watch); M.done = true; if(watch && rec) await watchFight(rec.b, rec.res); },
  lastLine(){ const ev = mm().lastEvent; if(!ev || ev.ew !== S.week - 1) return ''; const u = mm().user, mine = ev.bouts.filter(b => [b.a, b.b].some(id => (mmF(id) || {}).tid === u)); if(!mine.length) return ''; return `🥊 ${mine.map(b => { const me = (mmF(b.a) || {}).tid === u ? b.a : b.b; return b.res.w === me ? 'W' : b.res.w == null ? 'D' : 'L'; }).join(' ')} at FC ${ev.no}`; },
  simStops(){ const M = mm(); return [['event', 'Sim to the next fight night', 'Every two weeks', () => M.wk % 2 === 0], ['year', 'Sim to the end of the year', 'Awards and contracts', () => M.wk === 0]]; },
  click(b, d){ return mmClick(b, d); }, change(){ return false; },
};
function mmFRow(p, extra = ''){ const r = mmRankOf(p);
  return `<div class="row" data-x="fighter:${p.id}" style="cursor:pointer"><div class="ovr" style="background:${ovrColor(p.ovr)}">${p.ovr}</div><div class="grow"><b>${esc(mmName(p))}</b> <span class="pos">${p.wc}</span>${p.champ ? ' <span class="tag" style="background:#ffb81c33;color:var(--gold)">👑 Champ</span>' : r && r <= 15 ? ` <span class="tag" style="background:var(--panel2);color:var(--text)">#${r}</span>` : ''}${p.inj ? ` <span class="tag" style="background:#ff5b6b26;color:var(--bad)">Hurt ${p.inj}w</span>` : ''}${p.prospect ? ' <span class="tag" style="background:#38d98a22;color:var(--good)">Prospect</span>' : ''}
    <div class="dim small">"${esc(p.nick)}" · ${mmRec(p)} · age ${p.age} · ${p.style} · ${money(p.tid >= 0 ? p.con.amt : (p.ask || mmPurse(p.ovr, p.age)))}/fight${p.tid >= 0 ? ` × ${p.con.yrs}y` : ''}</div></div>${extra}</div>`; }
function mmHome(){
  const M = mm(), t = mmTeam(M.user), r = mmRoster(t.id).sort((a, b) => b.champ - a.champ || b.elo - a.elo), ev = M.lastEvent;
  const alerts = mmCtrl() && M.resign.length ? `<div class="card" style="border-color:var(--gold)"><b class="cond gold" style="font-size:18px">✍️ ${M.resign.length} contract${M.resign.length > 1 ? 's' : ''} to decide</b><button class="btn sm" data-gotab="mma:fighters" style="margin-top:8px">Fighters</button></div>` : '';
  const night = M.wk % 2 === 0 ? `<div class="card" style="border-color:var(--gold)"><div class="cond gold" style="text-transform:uppercase;font-weight:700">Fight night · FC ${M.evNo + 1}</div><p class="small dim" style="margin:6px 0 10px">The card is made on the night. ${M.req.length ? `Your requests: ${M.req.map(q => `${mmF(q.pid) ? mmF(q.pid).ln : '?'} (${q.type === 'title' ? 'title shot' : 'fight'})`).join(', ')}.` : 'Book fights for your fighters on the Fighters tab.'}</p><div style="display:flex;gap:8px"><button class="btn wide" data-play="watch">▶ Watch your fight</button><button class="btn ghost" data-play="sim">Sim</button></div></div>`
    : `<div class="card"><b class="cond" style="font-size:19px">Fight week next week</b><p class="small dim">FC ${M.evNo + 1} is next week. ${M.req.length ? `Booked: ${M.req.map(q => mmF(q.pid) ? mmF(q.pid).ln : '?').join(', ')}.` : 'Book fights for your fighters now.'}</p></div>`;
  const last = ev ? `<div class="card"><div class="cond dim" style="text-transform:uppercase;font-weight:700">FC ${ev.no} results</div>${ev.bouts.slice(0, 6).map(b => mmBoutRow(b)).join('')}</div>` : '';
  const snap = `<div class="card"><div style="display:flex;align-items:center;gap:10px">${crest(t, 52, 'hex')}<div class="grow"><b class="cond" style="font-size:21px">${esc(t.name)}</b><div class="dim small">${M.season} · head coach ${t.coach.name} · gym level ${t.gym.lvl}</div></div><div class="cond num" style="font-size:24px;font-weight:800">${t.wins}-${t.losses}</div></div>
    <div style="margin-top:10px">${statBox([['Fighters', r.length], ['Champions', r.filter(p => p.champ).length], ['Ranked', r.filter(p => { const k = mmRankOf(p); return k === 'C' || k <= 15; }).length], ['Camp OVR', mmCampOvr(t.id)]], 4)}</div>
    <div class="small dim" style="margin-top:10px">Fan hype</div><div class="bar"><i style="width:${t.hype}%;background:var(--gold)"></i></div></div>`;
  return alerts + night + `<h3>Your fighters</h3><div class="card" style="padding:2px 12px">${r.map(p => mmFRow(p)).join('')}</div>` + last + snap + `<h3>News</h3>` + newsList('mma');
}
function mmBoutRow(b){ const A = mmF(b.a), B = mmF(b.b), u = mm().user; if(!A || !B) return ''; const w = b.res && b.res.w, mine = A.tid === u || B.tid === u;
  return `<div class="row small ${mine ? 'gold' : ''}"><span class="grow">${b.title ? '👑 ' : ''}<b class="${w === A.id ? 'good' : ''}">${esc(A.ln)}</b> vs <b class="${w === B.id ? 'good' : ''}">${esc(B.ln)}</b> <span class="dim">${b.wc}</span></span><span class="dim">${b.res ? (w ? `${(w === A.id ? A : B).ln} · ${b.res.how}${b.res.how === 'Decision' || b.res.how === 'Split decision' ? '' : ` R${b.res.r}`}` : 'Draw') : ''}</span></div>`; }
function mmFightersView(){ return mmCtrl() ? mmFightersInner() : lockNote('mma') + '<div class="ro">' + mmFightersInner() + '</div>'; }
function mmFightersInner(){
  const M = mm(), r = mmRoster(M.user).sort((a, b) => MM_WC.findIndex(w => w[0] === a.wc) - MM_WC.findIndex(w => w[0] === b.wc) || b.elo - a.elo), max = 12;
  const pend = M.resign.map(x => { const p = mmF(x.id); return p ? mmFRow(p, `<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end"><span class="small">asks ${money(x.ask)}/fight × ${x.yrs}y</span><span style="display:flex;gap:4px"><button class="btn sm" data-x="resign:${p.id}">Re-sign</button><button class="btn ghost sm" data-x="letgo:${p.id}">Let go</button></span></div>`) : ''; }).join('');
  const fa = M.players.filter(p => p.tid === -1 && !p.ret).sort((a, b) => b.ovr + (b.pot - b.ovr) * .3 - a.ovr - (a.pot - a.ovr) * .3).slice(0, 30);
  return `${pend ? `<h3>Contracts up</h3><div class="card" style="padding:2px 12px">${pend}</div>` : ''}<p class="small dim">Tap a fighter for details. Book a fight and the promotion finds a ranked opponent at the next fight night; top-5 contenders can call out the champion.</p>
    <h3>Your camp (${r.length}/${max})</h3><div class="card" style="padding:2px 12px">${r.map(p => { const k = mmRankOf(p), req = M.req.find(q => q.pid === p.id); return mmFRow(p, req ? `<span class="tag" style="background:#ffb81c26;color:var(--gold)">${req.type === 'title' ? 'Title shot' : 'Booked'}</span>` : `<div style="display:flex;flex-direction:column;gap:4px">${!p.champ && k && k <= 5 ? `<button class="btn sm" data-x="title:${p.id}">Title shot</button>` : ''}<button class="btn ghost sm" data-x="book:${p.id}" ${p.inj ? 'disabled' : ''}>Book</button></div>`); }).join('')}</div>
    <h3>Free agents & prospects</h3><div class="card" style="padding:2px 12px">${fa.map(p => mmFRow(p, `<button class="btn sm" data-x="sign:${p.id}" ${r.length >= max ? 'disabled' : ''}>Sign</button>`)).join('')}</div>`;
}
function mmEventsView(){ const M = mm(); return M.events.map(ev => `<div class="card"><div class="cond gold" style="text-transform:uppercase;font-weight:700">FC ${ev.no} <span class="dim">· ${weekDate(ev.ew)}</span></div>${ev.bouts.map(b => mmBoutRow(b)).join('')}</div>`).join('') || '<p class="dim">No events yet.</p>'; }
function mmRanksView(){ const m = VIEW.sub.mmwc || 'LW', u = mm().user, R = mmRank(m).slice(0, 16);
  return `<div class="seg">${MM_WC.map(([k]) => `<button class="${m === k ? 'on' : ''}" data-sub="mmwc:${k}">${k}</button>`).join('')}</div><h3>${mmWCName(m)}</h3><div class="card" style="padding:2px 12px">${R.map((p, i) => `<div class="row small ${p.tid === u ? 'gold' : ''}" data-x="fighter:${p.id}" style="cursor:pointer"><b class="num" style="width:26px">${p.champ ? '👑' : '#' + i}</b><span class="grow"><b>${esc(mmName(p))}</b> <span class="dim">${mmRec(p)}${p.champ ? ` · ${p.def} defence${p.def === 1 ? '' : 's'}` : ''}</span></span><span class="dim">${p.tid >= 0 ? mmTeam(p.tid).abbr : 'FA'}</span></div>`).join('')}</div>`; }
function mmFranView(){ return mmCtrl() ? mmFranInner() : lockNote('mma') + '<div class="ro">' + mmFranInner() + '</div>'; }
const mmGymCost = l => Math.round(6 * (1 + l * .7));
function mmCoachPool(){ const M = mm(); if(!M.coachPool || M.coachPool.y !== M.season) M.coachPool = {y:M.season, list:Array.from({length:4}, () => { const r = irand(58, 95); return {name:personName(), r, fee:Math.max(.5, Math.round((r - 50) * .12 * 10) / 10)}; })}; return M.coachPool.list; }
function mmFranInner(){ const M = mm(), t = mmTeam(M.user), f = t.fin, lines = (f.last || []).map(([n, v]) => `<div class="row small"><span class="grow">${n}</span><b class="num ${v >= 0 ? 'good' : 'bad'}">${v >= 0 ? '+' : ''}${money(v)}</b></div>`).join('');
  return `<div class="card"><div style="display:flex;align-items:center;gap:10px">${crest(t, 48, 'hex')}<div class="grow"><b class="cond" style="font-size:20px">${esc(t.name)}</b><div class="dim small">Camp value <b class="gold">${money(mmTeamValue(t.id))}</b></div></div></div>
      <div style="margin-top:10px">${statBox([['Year revenue', money(f.rev)], ['Year costs', money(f.exp)], ['Profit', money(f.rev - f.exp), f.rev - f.exp >= 0 ? 'good' : 'bad']])}</div><p class="small dim" style="margin-top:6px">Whole-camp numbers; you receive ${stakeOf('mma')}% of the profit.</p></div>
    <h3>Last week's books</h3><div class="card" style="padding:2px 12px">${lines || '<p class="dim small" style="padding:8px 0">Play a week to see the books.</p>'}</div>
    <h3>Gym</h3><div class="card"><div class="row" style="border:0"><span class="grow">Level ${t.gym.lvl} <div class="dim small">Bigger gyms sell more memberships.</div></span><button class="btn sm" data-x="gym:1" ${S.cash < mmGymCost(t.gym.lvl) ? 'disabled' : ''}>Expand · ${money(mmGymCost(t.gym.lvl))}</button></div></div>
    <h3>Head coach</h3><div class="card"><div class="row" style="border:0"><div class="ovr" style="background:${ovrColor(t.coach.r)}">${t.coach.r}</div><span class="grow"><b>${t.coach.name}</b><div class="dim small">Better corners win close rounds and develop fighters.</div></span></div>
      ${mmCoachPool().map((k, i) => `<div class="row small"><div class="ovr" style="width:30px;height:30px;font-size:15px;background:${ovrColor(k.r)}">${k.r}</div><span class="grow">${k.name}</span><button class="btn ghost sm" data-x="hire:${i}" ${S.cash < k.fee || k.r <= t.coach.r ? 'disabled' : ''}>Hire · ${money(k.fee)}</button></div>`).join('')}</div>
    ${f.hist.length ? `<h3>Past years</h3><div class="card"><table><tr><th>Year</th><th>Revenue</th><th>Costs</th><th>Profit</th></tr>${f.hist.map(h => `<tr><td>${h.y}</td><td>${money(h.rev)}</td><td>${money(h.exp)}</td><td class="${h.rev - h.exp >= 0 ? 'good' : 'bad'}">${money(h.rev - h.exp)}</td></tr>`).join('')}</table></div>` : ''}`; }
function mmHistView(){ const M = mm(), m = VIEW.sub.mmhist || 'champs', none = '<p class="dim small" style="padding:8px 0">Nothing yet. Finish a year!</p>', u = M.user;
  const sg = seg('mmhist', [['champs', 'Champions'], ['awards', 'Awards'], ['records', 'Records'], ['hof', 'Hall of Fame']]);
  if(m === 'awards') return sg + `<div class="card" style="padding:2px 12px">${M.hist.awards.map(a => `<div class="row small"><b class="num" style="width:44px">${a.y}</b><div class="grow">${a.foty ? `<div><span class="dim">Fighter of the Year:</span> <b class="${a.foty.tid === u ? 'gold' : ''}">${a.foty.n}</b> <span class="dim">${a.foty.wc}</span></div>` : ''}${a.fin ? `<div><span class="dim">Top finisher:</span> <b class="${a.fin.tid === u ? 'gold' : ''}">${a.fin.n}</b> <span class="dim">${a.fin.v} finishes</span></div>` : ''}</div></div>`).join('') || none}</div>`;
  if(m === 'records') return sg + `<div class="card" style="padding:2px 12px">${Object.values(M.hist.records).map(r => `<div class="row small"><span class="grow"><span class="dim">${r.lab}</span><div><b>${r.n}</b> <span class="dim">${r.abbr}, ${r.y}</span></div></span><b class="cond num" style="font-size:20px">${r.v}</b></div>`).join('') || none}</div>`;
  if(m === 'hof'){ const h = M.players.filter(p => p.hof); return sg + `<div class="card" style="padding:2px 12px">${h.map(p => `<div class="row small">🏛️ <span class="grow"><b>${esc(mmName(p))}</b> <span class="dim">"${esc(p.nick)}"</span><div class="dim">Class of ${p.hof} · ${p.rec.w}-${p.rec.l}</div></span></div>`).join('') || none}</div>`; }
  return sg + (M.hist.champs.map(y => `<div class="card"><b class="cond gold">${y.y} champions (end of year)</b>${y.list.map(c => `<div class="row small ${c.tid === u ? 'gold' : ''}"><span class="pos">${c.wc}</span><span class="grow">${esc(c.n)}</span><span class="dim">${c.def} defences</span></div>`).join('')}</div>`).join('') || `<div class="card">${none}</div>`); }
function mmFighterModal(p){ const M = mm(), t = p.tid >= 0 ? mmTeam(p.tid) : null, k = mmRankOf(p);
  modal(`<div style="display:flex;gap:12px;align-items:center">${t ? crest(t, 46, 'hex') : ''}<div class="grow"><h2 style="margin:0">${esc(mmName(p))}</h2><div class="dim">"${esc(p.nick)}" · ${mmWCName(p.wc)} · age ${p.age} · ${t ? esc(t.name) : 'Free agent'}</div></div><div class="ovr" style="width:52px;height:52px;font-size:26px;background:${ovrColor(p.ovr)}">${p.ovr}</div></div>
    <div style="margin-top:10px">${statBox([['Record', mmRec(p)], ['Rank', k === 'C' ? '👑' : k ? '#' + k : '-'], ['KO/SUB', `${p.car.ko + p.st.ko}/${p.car.sub + p.st.sub}`], ['Streak', p.streak > 0 ? 'W' + p.streak : p.streak < 0 ? 'L' + -p.streak : '-']], 4)}</div>
    <div style="margin-top:8px">${statBox([['Striking', p.str], ['Wrestling', p.wre], ['Jiu-jitsu', p.bjj], ['Cardio', p.card], ['Chin', p.chin]], 5)}</div>
    <p class="small dim" style="margin-top:8px">Style: ${p.style}. Potential ${p.pot}.${p.champ ? ` ${p.def} title defence${p.def === 1 ? '' : 's'}.` : ''}${p.aw.length ? ` 🏅 ${p.aw.map(a => `${a.y} ${a.a === 'foty' ? 'Fighter of the Year' : 'Top finisher'}`).join(', ')}` : ''}</p>
    <div style="display:flex;gap:8px;margin-top:12px">${p.tid === M.user && mmCtrl() ? `<button class="btn ghost sm" data-x="release:${p.id}">Release</button>` : ''}<button class="btn sm" data-close style="margin-left:auto">Close</button></div>`); }
function mmClick(b, d){
  if(!d.x) return false; const [k, v] = d.x.split(/:(.*)/s), id = +v, M = mm();
  if(k === 'fighter'){ mmFighterModal(mmF(id)); return true; }
  if(!mmCtrl()){ closeModal(); toast('🔒 Own more than 50% to run the camp'); return true; }
  const done = msg => { if(msg) toast(msg); persist(); render(); return true; };
  if(k === 'book' || k === 'title'){ M.req = M.req.filter(q => q.pid !== id); M.req.push({pid:id, type:k === 'title' ? 'title' : 'fight'}); return done(k === 'title' ? '👑 Title shot requested for the next fight night' : '🥊 Booked for the next fight night'); }
  if(k === 'sign'){ const p = mmF(id); if(mmRoster(M.user).length >= 12) return done('Camp is full (12)'); const ask = p.ask || mmPurse(p.ovr, p.age); p.tid = M.user; p.con = {amt:ask, yrs:irand(2, 4)}; p.ask = 0; news(`✍️ Signed ${mmName(p)} "${p.nick}" (${p.wc}, ${mmRec(p)}).`, 'good', 'mma'); return done('✍️ Signed!'); }
  if(k === 'release'){ const p = mmF(id); p.tid = -1; p.ask = mmPurse(p.ovr, p.age); M.req = M.req.filter(q => q.pid !== id); closeModal(); news(`✂️ Released ${mmName(p)}.`, 'info', 'mma'); return done(); }
  if(k === 'resign' || k === 'letgo'){ const i = M.resign.findIndex(r => r.id === id), r = M.resign[i], p = mmF(id); if(i < 0) return true; if(k === 'resign') p.con = {amt:r.ask, yrs:r.yrs}; else { p.tid = -1; p.ask = r.ask; } M.resign.splice(i, 1); return done(); }
  if(k === 'gym'){ const t = mmTeam(M.user), c = mmGymCost(t.gym.lvl); if(S.cash < c) return done('💸 Not enough cash'); S.cash -= c; book('🏟️ Team upgrades', -c); t.gym.lvl++; news(`🏋️ ${t.name} gym expanded to level ${t.gym.lvl}.`, 'good', 'mma'); return done('🏋️ Gym expanded'); }
  if(k === 'hire'){ const c = mmCoachPool()[id], t = mmTeam(M.user); if(!c || S.cash < c.fee) return done('💸 Not enough cash'); S.cash -= c.fee; book('🏟️ Team upgrades', -c.fee); t.coach = {name:c.name, r:c.r}; M.coachPool.list.splice(id, 1); return done('📋 New head coach'); }
  return false;
}

// ---------------- octagon viewer ----------------
function watchFight(b, res){
  return new Promise(resolve => {
    const A = mmF(b.a), B = mmF(b.b), TA = A.tid >= 0 ? mmTeam(A.tid) : {c1:'#c8102e', c2:'#fff', abbr:'FA'}, TB = B.tid >= 0 ? mmTeam(B.tid) : {c1:'#1d4ed8', c2:'#fff', abbr:'FA'}, cols = teamCols(TA, TB), log = res.log, el = $('watch'), rounds = b.title || b.main ? 5 : 3, me = mm().user;
    el.innerHTML = `<div class="bug"><div class="tm" style="background:${cols[0]};color:${textOn(cols[0])};font-size:18px">${esc(A.ln.toUpperCase())}</div><div class="mid"><span id="wq">R1</span><span id="wc" class="num">5:00</span></div><div class="tm" style="background:${cols[1]};color:${textOn(cols[1])};font-size:18px;justify-content:flex-end">${esc(B.ln.toUpperCase())}</div></div>
      <div style="display:flex;gap:10px;margin:8px 12px 0"><div class="bar" style="flex:1;height:9px"><i id="hp0" style="width:100%;background:var(--good)"></i></div><div class="bar" style="flex:1;height:9px;transform:scaleX(-1)"><i id="hp1" style="width:100%;background:var(--good)"></i></div></div>
      <div class="dd"><span id="wdd">${b.title ? '👑 ' + mmWCName(b.wc) + ' title' : mmWCName(b.wc)} · ${rounds} rounds</span><span>${mmRec(A)} vs ${mmRec(B)}</span></div>
      <div style="position:relative"><canvas id="field"></canvas><div class="banner" id="wban" style="opacity:0;top:36%"></div></div><div id="pbp" aria-live="polite"></div>
      <div class="wctl"><button class="btn ghost sm" id="wspd">Speed 1×</button><button class="btn ghost sm" id="wskip" style="flex:1">Skip to result ⏭</button></div>`;
    el.hidden = false; document.body.style.overflow = 'hidden';
    const cv = $('field'), ctx = cv.getContext('2d'), dpr = Math.min(3, window.devicePixelRatio || 1), W = Math.min(560, window.innerWidth), H = Math.round(W * .62); cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.width = W * dpr; cv.height = H * dpr; ctx.scale(dpr, dpr);
    WATCH.skip = false; WATCH.speed = S.settings.speed || 1; $('wspd').textContent = `Speed ${WATCH.speed}×`;
    $('wspd').onclick = () => { WATCH.speed = WATCH.speed === 1 ? 2 : WATCH.speed === 2 ? 4 : 1; S.settings.speed = WATCH.speed; $('wspd').textContent = `Speed ${WATCH.speed}×`; }; $('wskip').onclick = () => { WATCH.skip = true; };
    const cx = W / 2, cy = H / 2, R = H * .46;
    const bg = () => { ctx.fillStyle = '#0a0d16'; ctx.fillRect(0, 0, W, H); ctx.beginPath(); for(let i = 0; i < 8; i++){ const a = Math.PI / 8 + i * Math.PI / 4; ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); } ctx.closePath(); ctx.fillStyle = '#d9dde4'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#111'; ctx.stroke();
      ctx.fillStyle = cols[0] + '33'; ctx.beginPath(); ctx.arc(cx, cy, R * .38, 0, Math.PI * 2); ctx.fill(); ctx.font = CANVAS_FONT('800 ' + Math.round(H * .09)); ctx.textAlign = 'center'; ctx.fillStyle = '#00000022'; ctx.fillText('FC', cx, cy + H * .03); };
    let ang = 0;
    const draw = (e, t) => { ctx.clearRect(0, 0, W, H); bg(); ang += .01 * WATCH.speed;
      let p0 = [cx + Math.cos(ang) * R * .3, cy + Math.sin(ang) * R * .3], p1 = [cx - Math.cos(ang) * R * .3, cy - Math.sin(ang) * R * .3]; const s = e ? e.side : -1;
      const ground = e && ['td', 'gnp', 'sub', 'subx'].includes(e.type);
      if(e && ['str', 'kd', 'ko'].includes(e.type) && s >= 0){ const atk = s === 0 ? p0 : p1, def = s === 0 ? p1 : p0, k = Math.sin(Math.min(1, t * 2) * Math.PI); const mid = [lerp2(atk[0], def[0], .4 * k), lerp2(atk[1], def[1], .4 * k)]; if(s === 0) p0 = mid; else p1 = mid; if(t > .3 && t < .7){ ctx.fillStyle = e.type === 'str' ? '#ffd23faa' : '#ff3b3bcc'; ctx.beginPath(); ctx.arc(def[0], def[1], (e.type === 'str' ? 10 : 22) * (1 - Math.abs(t - .5) * 2), 0, Math.PI * 2); ctx.fill(); } }
      if(ground && s >= 0){ const bot = s === 0 ? p1 : p0; if(s === 0) p0 = [bot[0] + 5, bot[1] - 4]; else p1 = [bot[0] + 5, bot[1] - 4]; if(e.type === 'sub' || e.type === 'subx'){ ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bot[0], bot[1], 16 + Math.sin(t * 20) * 3, 0, Math.PI * 2); ctx.stroke(); } }
      const r = Math.max(10, W * .03), down = e && e.type === 'ko' && t > .6 ? (s === 0 ? 1 : 0) : -1;
      dotP(ctx, p1[0], p1[1], r, down === 1 ? cols[1] + '66' : cols[1], '#fff'); dotP(ctx, p0[0], p0[1], r, down === 0 ? cols[0] + '66' : cols[0], '#fff');
      ctx.font = CANVAS_FONT('700 12'); ctx.textAlign = 'center'; ctx.fillStyle = '#111'; ctx.fillText(A.ln, p0[0], p0[1] - r - 4); ctx.fillText(B.ln, p1[0], p1[1] - r - 4); };
    const banner = (txt, col) => { const bn = $('wban'); bn.textContent = txt; bn.style.color = col; bn.style.opacity = 1; setTimeout(() => { bn.style.opacity = 0; }, 1000 / WATCH.speed + 300); };
    const hud = e => { $('wq').textContent = 'R' + e.r; const left = Math.max(0, 300 - e.sec); $('wc').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; $('hp0').style.width = e.hp[0] + '%'; $('hp1').style.width = e.hp[1] + '%'; for(const k of [0, 1]) $('hp' + k).style.background = e.hp[k] > 60 ? 'var(--good)' : e.hp[k] > 30 ? 'var(--gold)' : 'var(--bad)'; };
    let i = 0;
    function step(){ if(i >= log.length || WATCH.skip){ finish(); return; } const e = log[i], dur = (e.big ? 1500 : e.type === 'round' || e.type === 'rend' ? 900 : 800) / WATCH.speed, t0 = performance.now();
      const tick = now => { if(WATCH.skip){ finish(); return; } const t = clamp((now - t0) / dur, 0, 1); draw(e, t); if(t < 1){ WATCH.raf = requestAnimationFrame(tick); return; }
        hud(e); const dv = document.createElement('div'); const lf = Math.max(0, 300 - e.sec); dv.textContent = `R${e.r} ${e.type === 'round' ? '' : `${Math.floor(lf / 60)}:${String(lf % 60).padStart(2, '0')} · `}${e.txt}`; // time left, like the clock if(e.big || e.type === 'kd' || e.type === 'td') dv.className = 'big'; $('pbp').prepend(dv);
        if(e.type === 'ko') banner(e.txt.includes('TKO') ? 'TKO!' : 'KO!', '#ff3b3b'); else if(e.type === 'sub') banner('Tap out!', '#ff3b3b'); else if(e.type === 'kd') banner('Knockdown!', '#fff'); else if(e.type === 'round') banner(`Round ${e.r}`, '#fff');
        i++; setTimeout(step, 200 / WATCH.speed); };
      WATCH.raf = requestAnimationFrame(tick); }
    function finish(){ cancelAnimationFrame(WATCH.raf); const last = log[log.length - 1]; if(last) hud(last); draw(null, 0);
      if(WATCH.skip) for(const e of log.slice(i).filter(x => x.big)){ const dv = document.createElement('div'); dv.className = 'big'; dv.textContent = `R${e.r} · ${e.txt}`; $('pbp').prepend(dv); }
      const w = res.w < 0 ? null : [A, B][res.w], mine = w && w.tid === me, theirs = w && w.tid !== me && (A.tid === me || B.tid === me);
      $('wq').textContent = 'FINAL'; $('wdd').textContent = w ? `${mmName(w)} wins by ${res.how}${res.how.includes('ecision') ? '' : ` (R${res.r})`}` : 'Draw';
      banner(w ? (mine ? 'Victory!' : theirs ? 'Defeat' : `${w.ln} wins`) : 'Draw', mine ? '#38d98a' : theirs ? '#ff5b6b' : '#fff'); $('wban').style.opacity = 1;
      document.querySelector('.wctl').innerHTML = `<button class="btn wide" id="wdone">Continue</button>`; $('wdone').onclick = () => { el.hidden = true; el.innerHTML = ''; document.body.style.overflow = ''; resolve(); }; }
    draw(null, 0); setTimeout(step, 400);
  });
}
