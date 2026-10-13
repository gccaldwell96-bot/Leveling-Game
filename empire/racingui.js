'use strict';
// =====================================================================================
//  MOTORSPORT SCREENS + live race viewer + the module wrapper the shell talks to
// =====================================================================================
function livery(t, size = 40){ const h = Math.round(size * .7), tx = textOn(t.c1);
  return `<svg class="helm" width="${size}" height="${h}" viewBox="0 0 64 44" aria-hidden="true"><rect x="2" y="2" width="60" height="40" rx="9" fill="${t.c1}" stroke="${t.c2}" stroke-width="3"/><path d="M2 30 L62 12 L62 22 L2 40z" fill="${t.c2}" opacity=".85"/><text x="32" y="27" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="${t.abbr.length > 3 ? 15 : 18}" fill="${tx}" stroke="${t.c1}" stroke-width=".6" paint-order="stroke">${t.abbr}</text></svg>`; }
const rcSub = (k, d) => VIEW.sub[k] || d;
function rcModule(sp){
  return {
    init(){ rcInit(sp); }, load(){ rcIndex(sp); },
    teamValue(tid){ return rcTeamValue(sp, tid); }, teamName(tid){ return rcTeam(sp, tid).name; }, team(tid){ return rcTeam(sp, tid); },
    follow(tid){ rc(sp).user = tid; rc(sp).resign = []; }, logo(tid, size){ return livery(rcTeam(sp, tid), size); },
    record(tid){ const t = rcTeam(sp, tid), pos = rcTeamStandings(sp).indexOf(t) + 1; return `P${pos} in the teams' table · ${t.wins} win${t.wins === 1 ? '' : 's'} · ${t.titles} title${t.titles === 1 ? '' : 's'}`; },
    teams(){ return rc(sp).teams.map(t => ({id:t.id, name:t.name, logo:livery(t, 44), sub:`Car ${rcCarOvr(sp, t)} · last season P${t.lastPos} · ${rcDrivers(sp, t.id).filter(d => d.seat < 2).map(d => d.ln).join(' & ')}`, ovr:rcCarOvr(sp, t)})); },
    marketNote(){ return `${RC[sp].teams.length} teams, two cars each. Your team's results come from the car you develop and the drivers you sign.`; },
    blocker(){ return null; },
    weekly(){ rcWeekly(sp); },
    halt(){ const R = rc(sp); return rcCtrl(sp) && R.wk === rcLastWeek(sp) + 2 && R.resign.length && R.ack !== R.season ? 'contracts' : null; },
    goBlock(){ rc(sp).ack = rc(sp).season; go(sp, 'drivers'); toast('✍️ Decide your drivers\' contracts before the market opens'); },
    tabs(){ return [['home', 'Home'], ['drivers', 'Drivers' + (rcCtrl(sp) && rc(sp).resign.length ? ' •' : '')], ['car', 'Car'], ['races', 'Races'], ['stand', 'Standings'], ['fran', 'Franchise'], ['hist', 'History']]; },
    view(tab){ return ({home:rcHome, drivers:rcDriversView, car:rcCarView, races:rcRacesView, stand:rcStandView, fran:rcFranView, hist:rcHistView}[tab] || rcHome)(sp); },
    act(){ const R = rc(sp), r = rcRaceNow(sp); if(r) return `▶ ${r.n}`; const nx = R.cal.find(x => !x.done); if(nx) return `▶ Next week · ${nx.n} in ${nx.wk - R.wk} wk${nx.wk - R.wk > 1 ? 's' : ''}`; const L = rcLastWeek(sp); return `▶ Next week · ${R.wk < L + 3 ? 'driver market soon' : 'new season in ' + (52 - R.wk) + ' wks'}`; },
    async playUser(mode){ const r = rcRaceNow(sp); if(!r) return; const watch = mode === 'watch' || (mode !== 'sim' && S.settings.watch); const res = rcSimRace(sp, r, watch); rcApply(sp, r, res); if(watch) await watchRace(sp, r, res); },
    lastLine(){ const L = rc(sp).lastRace; if(!L || L.ew !== S.week - 1) return ''; return `${sportMeta(sp).icon} ${L.mine.map(m => m.dnf ? 'DNF' : 'P' + m.pos).join(', ')} · ${L.n}`; },
    simStops(){ const R = rc(sp), c = RC[sp], left = R.cal.filter(r => !r.done).length;
      return [...(left ? [['race', 'Sim to the next race', 'Stops on race week', () => !!rcRaceNow(sp)]] : []), ...(c.chase && R.round < c.chase.start ? [['chase', 'Sim to the Playoffs', 'Through the regular season', () => R.round >= c.chase.start]] : []), ...(left ? [['end', 'Sim to the end of the season', 'Through the last race', () => R.wk > rcLastWeek(sp) + 1]] : []), ['next', 'Sim to next season', 'Stops for driver contracts', () => R.wk === 0]]; },
    click(b, d){ return rcClick(sp, b, d); }, change(){ return false; },
  };
}

// ---------------- home ----------------
function rcHome(sp){
  const R = rc(sp), c = RC[sp], t = rcTeam(sp, R.user), race = rcRaceNow(sp), nx = race || R.cal.find(x => !x.done), ds = rcDrivers(sp, R.user), pos = rcTeamStandings(sp).indexOf(t) + 1, dst = rcDriverStandings(sp);
  const alerts = rcCtrl(sp) && R.resign.length ? `<div class="card" style="border-color:var(--gold)"><b class="cond gold" style="font-size:18px">✍️ ${R.resign.length} driver contract${R.resign.length > 1 ? 's' : ''} to decide</b><button class="btn sm" data-gotab="${sp}:drivers" style="margin-top:8px">Drivers</button></div>` : '';
  const trk = nx ? `<div class="card" ${race ? 'style="border-color:var(--gold)"' : ''}><div class="cond ${race ? 'gold' : 'dim'}" style="text-transform:uppercase;font-weight:700">${race ? 'Race week' : `Round ${nx.i + 1} · in ${nx.wk - R.wk} week${nx.wk - R.wk > 1 ? 's' : ''}`}</div>
      <div style="display:flex;align-items:center;gap:12px;margin:8px 0">${trackThumb(sp, nx, 84)}<div class="grow"><b class="cond" style="font-size:22px">${nx.n}</b><div class="dim small">${c.tracks.types[nx.type].n} · ${nx.laps} laps</div>${R.chase && !R.chase.final ? '<div class="small gold">Playoffs</div>' : R.chase && R.chase.final ? '<div class="small gold">Championship race</div>' : ''}</div></div>
      ${race ? `<div style="display:flex;gap:8px"><button class="btn wide" data-play="watch">▶ Watch live</button><button class="btn ghost" data-play="sim">Sim</button></div>` : ''}</div>`
    : `<div class="card"><b class="cond" style="font-size:19px">Off-season</b><p class="small dim">${R.wk <= rcLastWeek(sp) + 2 ? 'The season is over. Driver contracts are being decided.' : 'The driver market is open. Sign drivers and develop next year\'s car.'}</p></div>`;
  const lr = R.cal.filter(r => r.done).slice(-1)[0], last = lr ? `<div class="card"><div class="cond dim" style="text-transform:uppercase;font-weight:700">Last race · ${lr.n}</div>${lr.res.slice(0, 3).map((id, i) => { const d = rcDriver(sp, id); return d ? `<div class="row small"><b style="width:26px">${['🥇', '🥈', '🥉'][i]}</b><span class="grow ${d.tid === R.user ? 'gold' : ''}">${esc(rcName(d))}</span><span class="dim">${d.tid >= 0 ? rcTeam(sp, d.tid).abbr : ''}</span></div>` : ''; }).join('')}
      ${ds.filter(d => d.seat < 2).map(d => { const i = lr.res.indexOf(d.id); return i > 2 || (i >= 0 && lr.out.includes(d.id)) ? `<div class="row small"><b style="width:26px">${lr.out.includes(d.id) ? 'DNF' : 'P' + (i + 1)}</b><span class="grow gold">${esc(rcName(d))}</span></div>` : ''; }).join('')}</div>` : '';
  const snap = `<div class="card"><div style="display:flex;align-items:center;gap:10px">${livery(t, 54)}<div class="grow"><b class="cond" style="font-size:21px">${esc(t.name)}</b><div class="dim small">${R.season} · P${pos} of ${R.teams.length} · ${c.coachWord} ${t.coach.name}</div></div><div class="cond num" style="font-size:26px;font-weight:800">${t.pts} pts</div></div>
    <div style="margin-top:10px">${statBox([['Car', rcCarOvr(sp, t)], ['Wins', t.wins], ['Pit crew', t.crew], ['Titles', t.titles]], 4)}</div>
    ${ds.filter(d => d.seat < 2).map(d => `<div class="row small"><div class="ovr" style="width:30px;height:30px;font-size:15px;background:${ovrColor(d.ovr)}">${d.ovr}</div><span class="grow"><b>#${t.nums[d.seat]} ${esc(rcName(d))}</b>${d.inj ? ' <span class="bad">injured</span>' : ''}</span><span class="num">P${dst.indexOf(d) + 1} · ${d.st.pts} pts</span></div>`).join('')}
    <div class="small dim" style="margin-top:8px">Fan hype</div><div class="bar"><i style="width:${t.hype}%;background:var(--gold)"></i></div></div>`;
  return alerts + trk + last + snap + `<h3>News</h3>` + newsList(sp);
}
function trackThumb(sp, race, size){ const pts = rcTrackPath(sp, race, size, size * .7, 6).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '); return `<svg width="${size}" height="${Math.round(size * .7)}" style="flex:none;background:#0d1426;border-radius:10px" aria-hidden="true"><polygon points="${pts}" fill="none" stroke="#9aa7c0" stroke-width="4" stroke-linejoin="round"/><polygon points="${pts}" fill="none" stroke="#2a3550" stroke-width="2" stroke-linejoin="round"/></svg>`; }
// every track gets its own shape from its name: ovals for stock cars, twisty loops for road courses
function rcTrackPath(sp, race, W, H, pad = 14){
  let seed = 0; for(const ch of race.n) seed = (seed * 31 + ch.charCodeAt(0)) % 9973; const rnd = k => (Math.sin(seed * 9.13 + k * 3.7) + 1) / 2;
  const cx = W / 2, cy = H / 2, rx = W / 2 - pad, ry = H / 2 - pad, out = [], N = 120;
  const oval = RC[sp].oval && race.type !== 'road';
  for(let i = 0; i < N; i++){ const a = i / N * Math.PI * 2;
    if(oval){ const sq = race.type === 'short' ? .55 : race.type === 'super' ? .9 : .75, c = Math.cos(a), s = Math.sin(a); out.push([cx + rx * Math.sign(c) * Math.pow(Math.abs(c), sq), cy + ry * Math.sign(s) * Math.pow(Math.abs(s), sq)]); }
    else { const r = 1 + .18 * Math.sin(2 * a + rnd(1) * 6) + .12 * Math.sin(3 * a + rnd(2) * 6) + .07 * Math.sin(5 * a + rnd(3) * 6); out.push([cx + rx * Math.cos(a) * r / 1.25, cy + ry * Math.sin(a) * r / 1.25]); } }
  return out;
}

// ---------------- drivers ----------------
function rcDriverRow(sp, d, extra = ''){ const s = d.st; return `<div class="row"><div class="ovr" style="background:${ovrColor(d.ovr)}">${d.ovr}</div><div class="grow"><b>${esc(rcName(d))}</b>${d.seat === 2 && d.tid >= 0 ? ' <span class="tag" style="background:var(--panel2);color:var(--dim)">Reserve</span>' : ''}${d.rookie ? ' <span class="tag" style="background:#38d98a22;color:var(--good)">Rookie</span>' : ''}${d.titles ? ` <span class="gold small">🏆×${d.titles}</span>` : ''}<div class="dim small">Age ${d.age} · Pot ${d.pot} · ${money(d.tid >= 0 ? d.con.amt : (d.ask || rcSalary(sp, d.ovr, d.age)))}${d.tid >= 0 ? ` × ${d.con.yrs}y` : '/yr'} · ${s.starts ? `${s.wins}W ${s.pod} podiums ${s.pts} pts` : `career ${d.car.wins} wins`}</div></div>${extra}</div>`; }
function rcDriversView(sp){ return rcCtrl(sp) ? rcDriversInner(sp) : lockNote(sp) + '<div class="ro">' + rcDriversInner(sp) + '</div>'; }
function rcDriversInner(sp){
  const R = rc(sp), t = rcTeam(sp, R.user), ds = rcDrivers(sp, R.user), free = rcSeatsFree(sp, R.user);
  const pend = R.resign.map(r => { const d = rcDriver(sp, r.id); return d ? rcDriverRow(sp, d, `<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end"><span class="small">asks ${money(r.ask)} × ${r.yrs}y</span><span style="display:flex;gap:4px"><button class="btn sm" data-x="resign:${d.id}">Re-sign</button><button class="btn ghost sm" data-x="letgo:${d.id}">Let go</button></span></div>`) : ''; }).join('');
  const fa = R.players.filter(p => p.tid === -1).sort((a, b) => b.ovr - a.ovr).slice(0, 30);
  return `${pend ? `<h3>Contracts up: decide now</h3><div class="card" style="padding:2px 12px">${pend}</div>` : ''}
    <h3>Your drivers</h3><div class="card" style="padding:2px 12px">${ds.map(d => rcDriverRow(sp, d, `<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end"><span class="small dim">${d.seat < 2 ? `Car #${t.nums[d.seat]}` : 'Reserve'}</span>${d.seat === 2 ? `<button class="btn sm" data-x="promote:${d.id}">Promote</button>` : ''}<button class="btn ghost sm" data-x="release:${d.id}">Release</button></div>`)).join('')}${free.length ? `<p class="small dim" style="padding:8px 0">Empty: ${free.map(s => s < 2 ? `car #${t.nums[s]}` : 'reserve seat').join(', ')}. Sign a driver below.</p>` : ''}</div>
    <h3>Driver market</h3><p class="small dim">${free.length ? 'Sign free agents into your empty seats.' : 'Release a driver to free a seat first.'} Rookies grow fast; veterans are ready now.</p>
    <div class="card" style="padding:2px 12px">${fa.map(d => rcDriverRow(sp, d, `<button class="btn sm" data-x="sign:${d.id}" ${free.length ? '' : 'disabled'}>Sign</button>`)).join('') || '<p class="dim small" style="padding:8px 0">Nobody available.</p>'}</div>`;
}
// ---------------- car ----------------
function rcCarView(sp){ return rcCtrl(sp) ? rcCarInner(sp) : lockNote(sp) + '<div class="ro">' + rcCarInner(sp) + '</div>'; }
function rcCarInner(sp){
  const R = rc(sp), c = RC[sp], t = rcTeam(sp, R.user), best = k => Math.max(...R.teams.map(x => x.car[k])), avg = k => R.teams.reduce((a, x) => a + x.car[k], 0) / R.teams.length;
  const rows = [['aero', 'Aerodynamics', 'Cornering speed: matters most on twisty tracks.'], ['eng', c.engWord, 'Straight-line speed: matters most on fast tracks.'], ['rel', 'Reliability', 'Fewer breakdowns and retirements.']].map(([k, n, d]) => { const used = t.dev[k], cost = rcUpCost(sp, k, used);
    return `<div class="card"><div class="row" style="border:0;padding:0"><span class="grow"><b>${n}</b> <span class="cond num gold" style="font-size:20px">${Math.round(t.car[k])}</span><div class="dim small">${d}</div></span><button class="btn sm" data-x="up:${k}" ${used >= c.devMax || S.cash < cost ? 'disabled' : ''}>${used >= c.devMax ? 'Limit reached' : `Upgrade · ${money(cost)}`}</button></div>
      <div style="position:relative;height:10px;background:var(--panel2);border-radius:9px;margin-top:8px"><i style="position:absolute;left:0;top:0;bottom:0;width:${t.car[k]}%;background:var(--gold);border-radius:9px"></i><i style="position:absolute;left:${avg(k)}%;top:-3px;bottom:-3px;width:2px;background:#fff8" title="field average"></i><i style="position:absolute;left:${best(k)}%;top:-3px;bottom:-3px;width:2px;background:var(--good)" title="best car"></i></div>
      <div class="small dim" style="margin-top:4px">Field average ${Math.round(avg(k))} · best ${Math.round(best(k))} · upgrades this season ${used}/${c.devMax}</div></div>`; }).join('');
  return `<div class="card"><b class="cond" style="font-size:19px">${esc(t.name)} · car rating ${rcCarOvr(sp, t)}</b><p class="small dim">${c.devNote} Rivals develop their cars during the season too, and new regulations pull everyone together each winter.</p></div>${rows}
    <div class="card"><div class="row" style="border:0;padding:0"><span class="grow"><b>Pit crew</b> <span class="cond num gold" style="font-size:20px">${t.crew}</span><div class="dim small">Faster stops gain places in the pits.</div></span><button class="btn sm" data-x="crew:1" ${t.crew >= 99 || S.cash < rcCrewCost(sp) ? 'disabled' : ''}>Train · ${money(rcCrewCost(sp))}</button></div></div>`;
}
// ---------------- races & standings ----------------
function rcRacesView(sp){ const R = rc(sp), c = RC[sp];
  return `<h3>${R.season} calendar</h3><div class="card" style="padding:2px 12px">${R.cal.map(r => { const w = r.done ? rcDriver(sp, r.winner) : null, mine = r.done ? rcDrivers(sp, R.user).map(d => r.res.indexOf(d.id)).filter(i => i >= 0) : [], best = mine.length ? Math.min(...mine) : -1;
    return `<div class="row small"${r.wk === R.wk && !r.done ? ' style="background:#ffb81c10"' : ''}><span class="num dim" style="width:22px">${r.i + 1}</span><span class="grow"><b>${r.n}</b><div class="dim">${c.tracks.types[r.type].n}${c.chase && r.i >= c.chase.start ? ' · Playoffs' : ''}</div></span>${r.done ? `<span style="text-align:right"><span class="${w && w.tid === R.user ? 'gold' : ''}">🏆 ${w ? esc(w.ln) : '-'}</span><div class="dim">you: ${best >= 0 ? (r.out.includes(r.res[best]) ? 'DNF' : 'P' + (best + 1)) : '-'}</div></span>` : `<span class="dim num">${weekDate(S.week - R.wk + r.wk)}</span>`}</div>`; }).join('')}</div>`; }
function rcStandView(sp){
  const R = rc(sp), m = rcSub('rcstand', 'drivers'), sg = seg('rcstand', [['drivers', 'Drivers'], ['teams', 'Teams']]);
  if(m === 'teams') return sg + `<div class="card"><table><tr><th>#</th><th style="text-align:left">Team</th><th>Car</th><th>Wins</th><th>PTS</th></tr>${rcTeamStandings(sp).map((t, i) => `<tr class="${t.id === R.user ? 'me' : ''}"><td class="dim">${i + 1}</td><td style="text-align:left"><b>${esc(t.name)}</b></td><td>${rcCarOvr(sp, t)}</td><td>${t.wins}</td><td><b>${t.pts}</b></td></tr>`).join('')}</table></div>`;
  const ch = R.chase, st = rcDriverStandings(sp).filter(d => d.st.starts || d.tid >= 0).slice(0, 40);
  return sg + (ch ? `<p class="small dim">${ch.final ? 'Championship 4: best finisher in the last race is champion.' : `Playoffs: ${ch.field.length - ch.out.length} drivers alive.`}</p>` : '') + `<div class="card"><div class="scroll"><table><tr><th>#</th><th style="text-align:left">Driver</th><th>Team</th><th>W</th><th>Pod</th><th>PTS</th></tr>${st.map((d, i) => { const alive = ch && ch.field.includes(d.id) && !ch.out.includes(d.id); return `<tr class="${d.tid === R.user ? 'me' : ''}"><td class="dim">${i + 1}</td><td style="text-align:left"><b>${esc(rcName(d, true))}</b>${alive ? ' <span class="gold">●</span>' : ch && ch.out.includes(d.id) ? ' <span class="dim">✕</span>' : ''}</td><td>${d.tid >= 0 ? rcTeam(sp, d.tid).abbr : 'FA'}</td><td>${d.st.wins}</td><td>${d.st.pod}</td><td><b>${ch && ch.field.includes(d.id) ? ch.pts[d.id] : d.st.pts}</b></td></tr>`; }).join('')}</table></div></div>`;
}
function rcFranView(sp){ return rcCtrl(sp) ? rcFranInner(sp) : lockNote(sp) + '<div class="ro">' + rcFranInner(sp) + '</div>'; }
function rcFranInner(sp){
  const R = rc(sp), c = RC[sp], t = rcTeam(sp, R.user), f = t.fin, pool = rcPrincipals(sp), lines = (f.last || []).map(([n, v]) => `<div class="row small"><span class="grow">${n}</span><b class="num ${v >= 0 ? 'good' : 'bad'}">${v >= 0 ? '+' : ''}${money(v)}</b></div>`).join('');
  return `<div class="card"><div style="display:flex;align-items:center;gap:10px">${livery(t, 50)}<div class="grow"><b class="cond" style="font-size:20px">${esc(t.name)}</b><div class="dim small">Team value <b class="gold">${money(rcTeamValue(sp, t.id))}</b> · ${t.titles} title${t.titles === 1 ? '' : 's'}</div></div></div>
      <div style="margin-top:10px">${statBox([['Season revenue', money(f.rev)], ['Season costs', money(f.exp)], ['Profit', money(f.rev - f.exp), f.rev - f.exp >= 0 ? 'good' : 'bad']])}</div><p class="small dim" style="margin-top:6px">Whole-team numbers; you receive ${stakeOf(sp)}% of the profit. Prize money grows with last season's finishing position (P${t.lastPos}).</p></div>
    <h3>Last week's books</h3><div class="card" style="padding:2px 12px">${lines || '<p class="dim small" style="padding:8px 0">Play a week to see the books.</p>'}</div>
    <h3>${c.coachWord[0].toUpperCase() + c.coachWord.slice(1)}</h3><div class="card"><div class="row" style="border:0"><div class="ovr" style="background:${ovrColor(t.coach.r)}">${t.coach.r}</div><span class="grow"><b>${t.coach.name}</b><div class="dim small">Race strategy, upgrade quality and driver development.</div></span></div>
      ${pool.map((k, i) => `<div class="row small"><div class="ovr" style="width:30px;height:30px;font-size:15px;background:${ovrColor(k.r)}">${k.r}</div><span class="grow">${k.name}</span><button class="btn ghost sm" data-x="hire:${i}" ${S.cash < k.fee || k.r <= t.coach.r ? 'disabled' : ''}>Hire · ${money(k.fee)}</button></div>`).join('')}</div>
    ${f.hist.length ? `<h3>Past seasons</h3><div class="card"><table><tr><th>Season</th><th>Revenue</th><th>Costs</th><th>Profit</th></tr>${f.hist.map(h => `<tr><td>${h.y}</td><td>${money(h.rev)}</td><td>${money(h.exp)}</td><td class="${h.rev - h.exp >= 0 ? 'good' : 'bad'}">${money(h.rev - h.exp)}</td></tr>`).join('')}</table></div>` : ''}`;
}
function rcPrincipals(sp){ const R = rc(sp), m = RC[sp].money; if(!R.coachPool || R.coachPool.y !== R.season) R.coachPool = {y:R.season, list:Array.from({length:4}, () => { const r = irand(58, 95); return {name:personName(), r, fee:Math.max(1, Math.round((r - 50) * m.staff * 1.2))}; })}; return R.coachPool.list; }
function rcHistView(sp){ const R = rc(sp), m = rcSub('rchist', 'champs'), u = rcTeam(sp, R.user), none = '<p class="dim small" style="padding:8px 0">Nothing yet. Finish a season!</p>';
  const sg = seg('rchist', [['champs', 'Champions'], ['mine', 'Your seasons'], ['records', 'Records'], ['hof', 'Hall of Fame']]);
  if(m === 'mine') return sg + `<div class="card"><table><tr><th>Season</th><th>Pos</th><th>Wins</th><th>Pts</th></tr>${u.seasons.map(s => `<tr><td>${s.y}</td><td class="${s.pos === 1 ? 'gold' : ''}">${s.pos === 1 ? '🏆 ' : ''}P${s.pos}</td><td>${s.wins}</td><td>${s.pts}</td></tr>`).join('')}</table>${u.seasons.length ? '' : none}</div>`;
  if(m === 'records') return sg + `<div class="card" style="padding:2px 12px">${Object.values(R.hist.records).map(r => `<div class="row small"><span class="grow"><span class="dim">${r.lab}</span><div><b>${r.n}</b> <span class="dim">${r.abbr}, ${r.y}</span></div></span><b class="cond num" style="font-size:20px">${r.v}</b></div>`).join('') || none}</div>`;
  if(m === 'hof'){ const hof = R.players.filter(p => p.hof).sort((a, b) => b.hof - a.hof); return sg + `<div class="card" style="padding:2px 12px">${hof.map(p => `<div class="row small">🏛️ <span class="grow"><b>${esc(rcName(p))}</b><div class="dim">Class of ${p.hof} · ${p.titles} titles · ${p.car.wins} wins</div></span></div>`).join('') || none}</div>`; }
  return sg + `<div class="card" style="padding:2px 12px">${R.hist.champs.map(ch => `<div class="row"><b class="num" style="width:44px">${ch.y}</b><span class="grow"><b class="${ch.dt === R.user ? 'gold' : ''}">${esc(ch.d)}</b> <span class="dim small">${ch.wins} wins</span><div class="dim small ${ch.tid === R.user ? 'gold' : ''}">Teams: ${esc(ch.team)}</div></span></div>`).join('') || none}</div>`; }

function rcClick(sp, b, d){
  if(!d.x) return false; const [k, v] = d.x.split(/:(.*)/s), id = +v, R = rc(sp), c = RC[sp];
  if(!rcCtrl(sp)){ closeModal(); toast('🔒 Own more than 50% to run the team'); return true; }
  const done = msg => { if(msg) toast(msg); persist(); render(); return true; };
  if(k === 'up'){ const r = rcUpgrade(sp, v); return done(r === 'ok' ? '🔧 Upgrade fitted' : r === 'max' ? 'Development limit reached this season' : '💸 Not enough cash'); }
  if(k === 'crew') return done(rcCrewTrain(sp) === 'ok' ? '⏱️ Pit crew sharper' : '💸 Not enough cash');
  if(k === 'hire'){ const p = rcPrincipals(sp)[id], t = rcTeam(sp, R.user); if(!p || S.cash < p.fee) return done('💸 Not enough cash'); S.cash -= p.fee; book('🏟️ Team upgrades', -p.fee); t.coach = {name:p.name, r:p.r}; R.coachPool.list.splice(id, 1); news(`📋 Hired ${c.coachWord} ${p.name} (${p.r}).`, 'good', sp); return done('📋 Hired'); }
  if(k === 'resign' || k === 'letgo'){ const i = R.resign.findIndex(r => r.id === id), r = R.resign[i], p = rcDriver(sp, id); if(i < 0) return true; if(k === 'resign'){ p.con = {amt:r.ask, yrs:r.yrs}; news(`✍️ Re-signed ${rcName(p)} for ${money(r.ask)}/yr × ${r.yrs}.`, 'good', sp); } else { p.tid = -1; p.ask = r.ask; news(`👋 Let ${rcName(p)} go.`, 'info', sp); } R.resign.splice(i, 1); return done(); }
  if(k === 'release'){ const p = rcDriver(sp, id); p.tid = -1; p.ask = rcSalary(sp, p.ovr, p.age); R.resign = R.resign.filter(r => r.id !== id); news(`✂️ Released ${rcName(p)}.`, 'info', sp); return done(); }
  if(k === 'promote'){ const p = rcDriver(sp, id), free = rcSeatsFree(sp, R.user).filter(s => s < 2); if(free.length){ p.seat = free[0]; return done('Promoted to a race seat'); } const ds = rcDrivers(sp, R.user).filter(x => x.seat < 2).sort((a, b) => a.ovr - b.ovr), out = ds[0]; [out.seat, p.seat] = [2, out.seat]; return done(`${rcName(p)} races; ${rcName(out)} is reserve`); }
  if(k === 'sign'){ const p = rcDriver(sp, id), free = rcSeatsFree(sp, R.user); if(!free.length) return done('No empty seat'); const ask = Math.round((p.ask || rcSalary(sp, p.ovr, p.age)) / clamp(1 + (rcTeam(sp, R.user).hype - 50) / 300 + Math.min(.08, fameTotal() / 2500), .9, 1.25) * 10) / 10;
    modal(`<h2>Sign ${esc(rcName(p))}</h2><p class="dim">${p.ovr} OVR · pot ${p.pot} · age ${p.age}. Asking <b>${money(ask)}</b> a year.</p><label class="small dim" for="sgYrs" style="display:block;margin-top:8px">Years</label><select id="sgYrs">${[1, 2, 3].map(y => `<option ${y === 2 ? 'selected' : ''}>${y}</option>`).join('')}</select><button class="btn wide" data-x="signyes:${p.id}:${ask}" style="margin-top:12px">Sign for ${money(ask)}/yr</button><button class="btn ghost wide" data-close style="margin-top:8px">Cancel</button>`); return true; }
  if(k === 'signyes'){ const [pid, ask] = v.split(':').map(Number), p = rcDriver(sp, pid), free = rcSeatsFree(sp, R.user); if(!free.length || p.tid !== -1){ closeModal(); return done('Too late'); } p.tid = R.user; p.seat = free[0]; p.con = {amt:ask, yrs:+$('sgYrs').value}; p.ask = 0; news(`✍️ Signed ${rcName(p)} (${p.ovr}) for ${money(ask)}/yr.`, 'good', sp); closeModal(); return done('✍️ Signed!'); }
  return false;
}

// ---------------- live race viewer ----------------
function watchRace(sp, race, res){
  return new Promise(resolve => {
    const R = rc(sp), c = RC[sp], el = $('watch'), log = res.log, me = R.user;
    el.innerHTML = `<div class="bug" style="background:#000"><div class="tm" style="background:#111;color:#fff;font-size:17px;flex:1"><span>${sportMeta(sp).icon} ${esc(race.n)}</span></div><div class="mid"><span id="wq">LAP</span><span id="wc" class="num">0/${race.laps}</span></div></div>
      <div class="dd"><span id="wdd">Lights out!</span><span>${c.tracks.types[race.type].n}</span></div>
      <div style="position:relative"><canvas id="field"></canvas><div class="banner" id="wban" style="opacity:0;top:36%"></div></div>
      <div id="lb" class="small" style="margin:6px 12px 0;display:grid;grid-template-columns:1fr 1fr;gap:0 10px"></div>
      <div id="pbp" aria-live="polite" style="margin-top:6px"></div>
      <div class="wctl"><button class="btn ghost sm" id="wspd">Speed 1×</button><button class="btn ghost sm" id="wskip" style="flex:1">Skip to finish ⏭</button></div>`;
    el.hidden = false; document.body.style.overflow = 'hidden';
    const cv = $('field'), ctx = cv.getContext('2d'), dpr = Math.min(3, window.devicePixelRatio || 1), W = Math.min(560, window.innerWidth), H = Math.round(W * .52);
    cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.width = W * dpr; cv.height = H * dpr; ctx.scale(dpr, dpr);
    const path = rcTrackPath(sp, race, W, H, 22), seglen = [], N = path.length; let tot = 0; for(let i = 0; i < N; i++){ const a = path[i], b = path[(i + 1) % N], l = Math.hypot(b[0] - a[0], b[1] - a[1]); seglen.push(l); tot += l; }
    const at = f => { let d = ((f % 1) + 1) % 1 * tot; for(let i = 0; i < N; i++){ if(d <= seglen[i]){ const a = path[i], b = path[(i + 1) % N], k = d / seglen[i]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; } d -= seglen[i]; } return path[0]; };
    const lapSec = c.lapSec, teamOf = id => { const d = rcDriver(sp, id); return d && d.tid >= 0 ? rcTeam(sp, d.tid) : {c1:'#888', c2:'#fff', abbr:'?'}; };
    WATCH.skip = false; WATCH.speed = S.settings.speed || 1; $('wspd').textContent = `Speed ${WATCH.speed}×`;
    $('wspd').onclick = () => { WATCH.speed = WATCH.speed === 1 ? 2 : WATCH.speed === 2 ? 4 : 1; S.settings.speed = WATCH.speed; $('wspd').textContent = `Speed ${WATCH.speed}×`; };
    $('wskip').onclick = () => { WATCH.skip = true; };
    const bg = () => { ctx.fillStyle = '#0d2a16'; ctx.fillRect(0, 0, W, H); ctx.lineJoin = 'round';
      const line = (w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); path.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.stroke(); };
      line(22, '#e8ecf3'); line(18, '#3a3f4a'); line(1, '#ffffff22');
      const [sx, sy] = path[0], [nx, ny] = path[2], ang = Math.atan2(ny - sy, nx - sx); ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang + Math.PI / 2); for(let k = -4; k < 4; k++){ ctx.fillStyle = (k % 2 + 2) % 2 ? '#fff' : '#111'; ctx.fillRect(k * 2.5, -2, 2.5, 4); } ctx.restore(); };
    const banner = (txt, col) => { const b = $('wban'); b.textContent = txt; b.style.color = col; b.style.opacity = 1; setTimeout(() => { b.style.opacity = 0; }, 1100 / WATCH.speed + 300); };
    const board = snap => { const rows = snap.order.slice(0, 10).map((id, i) => { const d = rcDriver(sp, id), t = teamOf(id); return `<div style="display:flex;gap:6px;align-items:center;padding:2px 0;${d && d.tid === me ? 'color:var(--gold);font-weight:700' : ''}"><b class="num" style="width:18px">${i + 1}</b><i style="width:4px;height:14px;background:${t.c1};border-radius:2px"></i><span class="grow">${d ? esc(rcName(d, true)) : '?'}</span><span class="dim num">${i ? '+' + snap.gaps[i].toFixed(1) : ''}</span></div>`; });
      const mine = snap.order.map((id, i) => [id, i]).filter(([id, i]) => i >= 10 && (rcDriver(sp, id) || {}).tid === me).map(([id, i]) => `<div style="display:flex;gap:6px;color:var(--gold);font-weight:700"><b class="num" style="width:18px">${i + 1}</b><span class="grow">${esc(rcDriver(sp, id).ln)}</span></div>`);
      const outs = snap.out.filter(id => (rcDriver(sp, id) || {}).tid === me).map(id => `<div class="bad">OUT ${esc(rcDriver(sp, id).ln)}</div>`);
      $('lb').innerHTML = rows.join('') + mine.join('') + outs.join(''); };
    let i = 0, prev = log[0] ? log[0].snap : null, vis = 0;
    const draw = (snapA, snapB, f, lapF) => { ctx.clearRect(0, 0, W, H); bg(); if(!snapB) return;
      const pos = {}; snapA.order.forEach((id, k) => { pos[id] = snapA.gaps[k]; }); const ids = snapB.order;
      for(let k = ids.length - 1; k >= 0; k--){ const id = ids[k], g = lerp2(pos[id] ?? snapB.gaps[k], snapB.gaps[k], f), [x, y] = at(lapF - g / lapSec), t = teamOf(id), mine = (rcDriver(sp, id) || {}).tid === me;
        dotP(ctx, x, y, mine ? 5.5 : 4.2, t.c1, mine ? '#ffd23f' : t.c2); if(k === 0){ ctx.fillStyle = '#fff'; ctx.font = CANVAS_FONT('700 11'); ctx.textAlign = 'center'; ctx.fillText('P1', x, y - 8); } } };
    function step(){
      if(i >= log.length || WATCH.skip){ finish(); return; }
      const e = log[i], dur = (e.big ? 1500 : 1100) / WATCH.speed, t0 = performance.now(), A = prev || e.snap, lap0 = A.lap, lap1 = e.snap.lap, v0 = vis, v1 = vis + .6; // the cars show about half a lap per update, however many real laps pass
      const tick = now => { if(WATCH.skip){ finish(); return; } const f = clamp((now - t0) / dur, 0, 1), lapF = lerp2(lap0, lap1, f);
        draw(A, e.snap, easeIO(f), lerp2(v0, v1, f)); $('wc').textContent = `${Math.min(race.laps, Math.round(lapF))}/${race.laps}`;
        if(f < 1){ WATCH.raf = requestAnimationFrame(tick); return; }
        prev = e.snap; vis = v1; board(e.snap); $('wdd').textContent = e.type === 'pit' ? 'Pit window' : e.type === 'crash' ? c.cautionWord || 'Incident' : 'Racing';
        const dv = document.createElement('div'); dv.textContent = `Lap ${e.lap} · ${e.txt}`; if(e.big) dv.className = 'big'; $('pbp').prepend(dv);
        if(e.type === 'crash') banner('Crash!', '#ff5b6b'); else if(e.type === 'lead') banner('New leader', '#fff'); else if(e.type === 'finish') banner('Chequered flag', '#fff');
        i++; setTimeout(step, 250 / WATCH.speed); };
      WATCH.raf = requestAnimationFrame(tick);
    }
    function finish(){ cancelAnimationFrame(WATCH.raf); const last = log[log.length - 1]; if(last){ draw(last.snap, last.snap, 1, vis); board(last.snap); }
      if(WATCH.skip) for(const e of log.slice(i).filter(x => x.big)){ const dv = document.createElement('div'); dv.className = 'big'; dv.textContent = `Lap ${e.lap} · ${e.txt}`; $('pbp').prepend(dv); }
      $('wq').textContent = 'FINAL'; $('wc').textContent = `${race.laps}/${race.laps}`;
      const mine = rcDrivers(sp, me).filter(d => d.seat < 2).map(d => race.res.indexOf(d.id)).filter(x => x >= 0), best = mine.length ? Math.min(...mine) : -1;
      banner(best === 0 ? 'Victory!' : best >= 0 && best < 3 ? 'Podium!' : 'Finish', best === 0 ? '#38d98a' : best >= 0 && best < 3 ? '#ffd23f' : '#fff'); $('wban').style.opacity = 1;
      $('wdd').textContent = `Winner: ${rcName(rcDriver(sp, race.winner))}`;
      document.querySelector('.wctl').innerHTML = `<button class="btn wide" id="wdone">Continue</button>`;
      $('wdone').onclick = () => { el.hidden = true; el.innerHTML = ''; document.body.style.overflow = ''; resolve(); }; }
    bg(); if(log[0]) board(log[0].snap); setTimeout(step, 500);
  });
}
