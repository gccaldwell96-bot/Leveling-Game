'use strict';
// =====================================================================================
//  SCREENS for every team sport that runs on the league engine (league.js)
// =====================================================================================
const lgSub = (k, d) => VIEW.sub[k] || d;
function lgTabs(sp){ const L = lg(sp), alert = lgCtrl(sp) && ((L.resign && L.resign.length) || (L.draft && L.draft.active && L.draft.onClock === L.user));
  return [['home', 'Home'], ['roster', 'Roster'], ['games', LG[sp].po ? 'Games' : 'Fixtures'], ['stand', LG[sp].points && !LG[sp].otl ? 'Table' : 'Standings'], ['stats', 'Stats'], ['moves', 'Moves' + (alert ? ' •' : '')], ['fran', 'Franchise'], ['hist', 'History']]; }
function lgView(sp, tab){ return ({home:lgHome, roster:lgRosterView, games:lgGamesView, stand:lgStandView, stats:lgStatsView, moves:lgMovesView, fran:lgFranView, hist:lgHistView}[tab] || lgHome)(sp); }
function lgNextEvent(sp){ const w = lg(sp).wk, E = lgEnd(sp), ev = [[E, 'Season ends'], [E + 1, 'Draft'], [E + 3, 'Free agency'], [50, 'Camp'], [52, 'New season']]; for(const [k, n] of ev) if(w < k) return `${n} in ${k - w} wk${k - w > 1 ? 's' : ''}`; return ''; }
function lgAct(sp){ const L = lg(sp), c = LG[sp], wk = L.wk, R = lgR(sp);
  if(wk < R){ const n = lgUserGames(sp).length; return `▶ Play week ${wk + 1}${n > 1 ? ` · ${n} ${c.gameWord}s` : n === 0 ? ' · bye' : ''}`; }
  if(wk < lgEnd(sp)){ const r = c.po.rounds[wk - R]; return lgUserSeries(sp) ? `▶ ${r}` : `▶ Next week · ${r}`; }
  const nx = lgNextEvent(sp); return `▶ Next week${nx ? ` · ${nx}` : ''}`; }
function lgLastLine(sp){ const lg0 = lg(sp).lastGame; if(!lg0 || lg0.ew !== S.week - 1) return ''; return `${sportMeta(sp).icon} ${lg0.us > lg0.them ? 'W' : lg0.us < lg0.them ? 'L' : 'D'} ${lg0.us}-${lg0.them} ${lg0.home ? 'vs' : '@'} ${lgTeam(sp, lg0.opp).abbr}`; }
function lgSimStops(sp){ const L = lg(sp), R = lgR(sp), E = lgEnd(sp), c = LG[sp];
  return [...(L.wk < R && c.po ? [['po', `Sim to the ${c.po.name}`, 'Finish the regular season', () => L.wk >= R]] : []), ...(L.wk < E ? [['end', 'Sim to the end of the season', c.po ? `Through the ${c.po.rounds[c.po.rounds.length - 1]}` : 'Final day', () => L.wk > E]] : []),
    ...(L.wk <= E + 1 ? [['draft', 'Sim to the draft', 'Stops when you\'re on the clock', () => L.wk > E + 1 || (L.draft && L.draft.active)]] : []), ['next', 'Sim to next season', 'Stops for the draft', () => L.wk === 0]]; }
async function lgPlayUser(sp, mode){
  const L = lg(sp), c = LG[sp], watch = mode === 'watch' || (mode !== 'sim' && S.settings.watch), R = lgR(sp);
  if(L.wk < R){ const gs = lgUserGames(sp); if(!gs.length) return; const g = gs[0], res = lgPlay(sp, g, watch);
    if(watch) await watchMatch({H:lgTeam(sp, g.h), A:lgTeam(sp, g.a), title:`Week ${L.wk + 1}${gs.length > 1 ? ` · ${c.gameWord} 1 of ${gs.length}` : ''}`, log:res.log, R:c.render, res, userSide:g.h === L.user ? 0 : 1, after:gs.length > 1 ? `${gs.length - 1} more ${c.gameWord}${gs.length > 2 ? 's' : ''} this week` : ''});
    return; }
  if(L.wk < lgEnd(sp)){ const r = L.wk - R, round = L.po.rounds[r]; if(!round) return; let sr = lgUserSeries(sp); const finalRound = round.length === 1;
    if(!sr && !(finalRound && watch)) return; if(!sr) sr = round[0]; if(sr.win) return;
    const out = lgPlaySeries(sp, sr, r, watch);
    if(watch && out.length){ const last = out[out.length - 1], bo = lgBestOf(sp, r), me = last.g.h === L.user ? 0 : last.g.a === L.user ? 1 : null;
      await watchMatch({H:lgTeam(sp, last.g.h), A:lgTeam(sp, last.g.a), title:`${c.po.rounds[r]}${bo > 1 ? ` · game ${out.length}` : ''}`, log:last.res.log, R:c.render, res:last.res, userSide:me, after:bo > 1 ? `${lgTeam(sp, sr.win).abbr} win the series ${Math.max(...sr.w)}-${Math.min(...sr.w)}` : ''}); } }
}

// ---------------- home ----------------
function lgHome(sp){
  const L = lg(sp), c = LG[sp], u = lgTeam(sp, L.user), wk = L.wk, R = lgR(sp), alerts = [];
  if(lgCtrl(sp) && L.draft && L.draft.active && L.draft.onClock === L.user) alerts.push(`<div class="card" style="border-color:var(--gold)"><b class="cond gold" style="font-size:19px">🎓 YOU'RE ON THE CLOCK</b><p class="small">Pick #${L.draft.at + 1} in the ${L.draft.y} draft.</p><button class="btn sm" data-x="goto:moves:draft" style="margin-top:8px">Go to the draft</button></div>`);
  if(lgCtrl(sp) && L.resign.length) alerts.push(`<div class="card" style="border-color:var(--gold)"><b class="cond gold" style="font-size:18px">✍️ ${L.resign.length} contract${L.resign.length > 1 ? 's' : ''} to decide</b><p class="small dim">Re-sign or let them go before free agency opens.</p><button class="btn sm" data-x="goto:moves:contracts" style="margin-top:8px">Review contracts</button></div>`);
  let next = '';
  const side = (t, flip) => `<div style="flex:1;text-align:center">${crest(t, 60, c.crest)}<div class="cond" style="font-size:20px;font-weight:800">${t.abbr}</div><div class="dim small num">${lgRecord(sp, t).split(' · ')[0]} · OVR ${lgOvr(sp, t.id)}</div></div>`;
  if(wk < R){ const gs = lgUserGames(sp); if(gs.length){ const g = gs[0], H = lgTeam(sp, g.h), A = lgTeam(sp, g.a);
      next = `<div class="card"><div class="cond dim" style="text-transform:uppercase;font-weight:700">Week ${wk + 1} · ${weekDate(S.week)}${gs.length > 1 ? ` · ${gs.length} ${c.gameWord}s this week` : ''}</div><div style="display:flex;align-items:center;margin:10px 0">${side(H)}<div class="cond dim" style="font-size:22px;font-weight:800">VS</div>${side(A)}</div>
        <div style="display:flex;gap:8px"><button class="btn wide" data-play="watch">▶ Watch live</button><button class="btn ghost" data-play="sim">Sim</button></div>${gs.length > 1 ? `<p class="small dim" style="margin-top:6px">You watch the first; the rest of the week plays out after.</p>` : ''}</div>`; }
    else next = `<div class="card"><b class="cond" style="font-size:19px">Bye week</b><p class="dim small">No ${c.gameWord} for you this week.</p></div>`; }
  else if(wk < lgEnd(sp)){ const sr = lgUserSeries(sp), r = c.po.rounds[wk - R];
    next = sr ? `<div class="card" style="border-color:var(--gold)"><div class="cond gold" style="text-transform:uppercase;font-weight:700">${c.po.name} · ${r}</div><div style="display:flex;align-items:center;margin:10px 0">${side(lgTeam(sp, sr.h))}<div class="cond dim" style="font-size:22px;font-weight:800">VS</div>${side(lgTeam(sp, sr.a))}</div><p class="small dim" style="margin-bottom:8px">${lgBestOf(sp, wk - R) > 1 ? `Best of ${lgBestOf(sp, wk - R)}. The whole series plays this week; you watch the deciding game.` : 'One game, winner goes through.'}</p><div style="display:flex;gap:8px"><button class="btn wide" data-play="watch">▶ Play the series</button><button class="btn ghost" data-play="sim">Sim</button></div></div>`
      : `<div class="card"><b class="cond" style="font-size:19px">${u.poRes === 'Champions' ? '🏆 CHAMPIONS' : u.poRes && u.poRes !== 'made' ? `Season over: out in the ${u.poRes}` : 'Playoffs'}</b><p class="dim small">The ${r} is on${c.po.rounds.length - 1 === wk - R ? '; Watch it live from the Play button' : ''}.</p></div>`; }
  else next = `<div class="card"><b class="cond" style="font-size:19px">Offseason</b><p class="dim small">${lgOffText(sp)}</p></div>`;
  const lg0 = L.lastGame, last = lg0 ? `<div class="card"><div class="cond dim" style="text-transform:uppercase;font-weight:700">Last ${c.gameWord}</div><div class="row" style="border:0">${crest(lgTeam(sp, lg0.opp), 32, c.crest)}<div class="grow"><b>${lg0.home ? 'vs' : '@'} ${lgTeamName(lgTeam(sp, lg0.opp))}</b><div class="dim small">${lg0.po ? c.po.rounds[lg0.po - 1] : 'Regular season'}${lg0.ot ? ' · ' + (c.render.otLabel || 'OT') : ''}</div></div><b class="cond num ${lg0.us > lg0.them ? 'good' : lg0.us < lg0.them ? 'bad' : ''}" style="font-size:22px">${lg0.us > lg0.them ? 'W' : lg0.us < lg0.them ? 'L' : 'D'} ${lg0.us}-${lg0.them}</b></div></div>` : '';
  const stand = lgStandings(sp, c.confs ? u.conf : null), rank = stand.indexOf(u) + 1;
  const snap = `<div class="card"><div style="display:flex;align-items:center;gap:10px">${crest(u, 54, c.crest)}<div class="grow"><b class="cond" style="font-size:22px">${lgTeamName(u)}</b><div class="dim small">${lgSeasonLabel(sp)} · ${ord(rank)} in ${c.confs ? c.confs[u.conf] : 'the ' + (c.points ? 'table' : 'league')} · ${c.coachWord || 'coach'} ${u.coach.name}</div></div><div class="cond num" style="font-size:26px;font-weight:800">${lgRecord(sp, u).split(' · ')[0]}</div></div>
    <div style="margin-top:10px">${statBox([['Team OVR', lgOvr(sp, u.id)], [c.pfWord || 'Points', `${u.pf}-${u.pa}`], ['Streak', u.strk || '-'], ['Cap room', money(lgCapRoom(sp, u.id))]], 4)}</div>
    <div class="small dim" style="margin-top:10px">Fan hype</div><div class="bar"><i style="width:${u.hype}%;background:var(--gold)"></i></div></div>`;
  return alerts.join('') + next + last + snap + `<h3>News</h3>` + newsList(sp);
}
function lgOffText(sp){ const w = lg(sp).wk, E = lgEnd(sp); if(w <= E + 1) return 'The season is over. Awards are out, players aged, and the draft is next.'; if(w < E + 3) return 'Contracts have expired. Re-sign the players you want before free agency opens.'; if(w < E + 10) return 'Free agency is open. AI teams are shopping too.'; return 'Quiet weeks before camp. Make trades and sign free agents to get ready.'; }

// ---------------- roster & player card ----------------
function lgRosterView(sp){
  const L = lg(sp), c = LG[sp], r = lgRoster(sp, L.user), posL = lgPosList(sp), start = new Set();
  for(const pos of posL) r.filter(p => p.pos === pos && !p.inj).sort((a, b) => b.ovr - a.ovr).slice(0, c.pos[pos][1]).forEach(p => start.add(p.id));
  return `<div class="card small" style="display:flex;justify-content:space-between"><span>Roster <b class="num">${r.length}/${c.rosterMax}</b></span><span>Payroll <b class="num">${money(lgPayroll(sp, L.user))}</b> / ${money(L.cap)}</span></div>` +
    posL.map(pos => { const ps = r.filter(p => p.pos === pos).sort((a, b) => b.ovr - a.ovr); return `<h3>${c.posNames ? c.posNames[pos] : pos} <span class="small">(${ps.length})</span></h3><div class="card" style="padding:2px 12px">${ps.map(p => lgRow(sp, p, start.has(p.id))).join('') || '<p class="dim small" style="padding:8px 0">Nobody here.</p>'}</div>`; }).join('');
}
function lgRow(sp, p, starter, extra = '', potTxt){
  return `<div class="row" data-lgp="${p.id}" style="cursor:pointer"><div class="ovr" style="background:${ovrColor(p.ovr)}">${p.ovr}</div><div class="grow"><b>${esc(lgName(p))}</b> <span class="pos">${p.pos}</span>${starter ? ` <span class="tag" style="background:#ffb81c26;color:var(--gold)">${LG[sp].starterWord || 'Starter'}</span>` : ''}${p.inj ? ` <span class="tag" style="background:#ff5b6b26;color:var(--bad)">Out ${p.inj}w</span>` : ''}
    <div class="dim small">Age ${p.age} · Pot ${potTxt || p.pot} · ${money(p.con.amt)} × ${p.con.yrs}y${p.dr && p.dr.y ? ` · R${p.dr.r} '${String(p.dr.y).slice(2)}` : ''}</div></div>${extra}</div>`; }
function lgStatLine(sp, p, st){ return LG[sp].statLine(st || p.st, p); }
function lgPlayerModal(sp, pid){
  const L = lg(sp), c = LG[sp], p = lgPlayer(sp, pid); if(!p) return; const t = p.tid >= 0 ? lgTeam(sp, p.tid) : null, mine = p.tid === L.user && lgCtrl(sp);
  const line = lgStatLine(sp, p), aw = p.aw.map(a => `${a.y} ${a.a.toUpperCase()}`).join(' · ');
  modal(`<div style="display:flex;gap:12px;align-items:center">${t ? crest(t, 48, c.crest) : ''}<div class="grow"><h2 style="margin:0">${esc(lgName(p))}</h2><div class="dim">${p.pos} · Age ${p.age} · ${t ? lgTeamName(t) : p.tid === -1 ? 'Free agent' : p.tid === -2 ? 'Draft prospect' : 'Retired'}</div></div>
      <div style="text-align:center"><div class="ovr" style="width:52px;height:52px;font-size:26px;background:${ovrColor(p.ovr)}">${p.ovr}</div><div class="small dim">POT ${p.tid === -2 ? lgProspectRange(sp, p).join('–') : p.pot}</div></div></div>
    ${p.tid >= 0 ? `<div class="small" style="margin-top:8px">Contract <b>${money(p.con.amt)}</b> a year · ${p.con.yrs} year${p.con.yrs === 1 ? '' : 's'} left${p.dr ? ` · drafted ${p.dr.y}, round ${p.dr.r}` : ''}</div>` : ''}
    ${p.inj ? `<div class="small bad">Injured: out ${p.inj} more week${p.inj > 1 ? 's' : ''}</div>` : ''}${aw ? `<div class="small gold">🏅 ${aw}</div>` : ''}
    <h3>${lgSeasonLabel(sp)} season</h3>${statBox(line, Math.min(line.length, 5))}
    ${p.hist.length ? `<h3>Career</h3><div class="scroll"><table><tr><th>Year</th><th>Team</th><th>OVR</th>${lgStatLine(sp, p).map(([a]) => `<th>${a}</th>`).join('')}</tr>${p.hist.map(h => `<tr><td>${h.y}</td><td>${(lgTeam(sp, h.tid) || {abbr:'FA'}).abbr}</td><td>${h.ovr}</td>${lgStatLine(sp, p, h.st).map(([, b]) => `<td>${b}</td>`).join('')}</tr>`).join('')}</table></div>` : ''}
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">${mine ? `<button class="btn ghost sm" data-x="rel:${p.id}">Release</button><button class="btn ghost sm" data-x="tradeaway:${p.id}">Shop in a trade</button>` : ''}${t && p.tid !== L.user && lgCtrl(sp) && lgTradeOpen(sp) ? `<button class="btn ghost sm" data-x="tradefor:${p.id}">Trade for him</button>` : ''}<button class="btn sm" data-close style="margin-left:auto">Close</button></div>`);
}

// ---------------- games ----------------
function lgGamesView(sp){
  const L = lg(sp), c = LG[sp], u = L.user, res = (g, home) => { const us = g.s[home ? 0 : 1], them = g.s[home ? 1 : 0]; return `<b class="cond num ${us > them ? 'good' : us < them ? 'bad' : ''}">${us > them ? 'W' : us < them ? 'L' : 'D'} ${us}-${them}${g.ot ? ' ' + (c.render.otLabel || 'OT') : ''}</b>`; };
  const rows = L.sched.map((wk, i) => { const gs = wk.filter(g => g.h === u || g.a === u); if(!gs.length) return ''; return gs.map((g, k) => { const home = g.h === u, o = lgTeam(sp, home ? g.a : g.h);
    return `<div class="row"${i === L.wk ? ' style="background:#ffb81c10"' : ''}><span class="num dim" style="width:26px">${k === 0 ? i + 1 : ''}</span>${crest(o, 26, c.crest)}<div class="grow">${home ? 'vs' : '@'} <b>${o.city} ${o.name}</b></div>${g.s ? res(g, home) : `<span class="dim small num">${weekDate(S.week - L.wk + i)}</span>`}</div>`; }).join(''); }).join('');
  let po = '';
  if(L.po){ po = `<h3>${c.po.name}</h3>` + L.po.rounds.map((rd, r) => `<div class="card"><b class="cond gold">${c.po.rounds[r]}</b>${rd.map(sr => { const H = lgTeam(sp, sr.h), A = lgTeam(sp, sr.a); return `<div class="row small"><span class="grow ${sr.h === u || sr.a === u ? 'gold' : ''}">${H.abbr} vs ${A.abbr}</span>${sr.win != null ? `<b class="num">${lgTeam(sp, sr.win).abbr} ${lgBestOf(sp, r) > 1 ? `${Math.max(...sr.w)}-${Math.min(...sr.w)}` : `${sr.games[0].s[0]}-${sr.games[0].s[1]}`}</b>` : '<span class="dim">upcoming</span>'}</div>`; }).join('')}</div>`).join(''); }
  return `<h3>${lgSeasonLabel(sp)} ${c.points ? 'fixtures' : 'schedule'}</h3><div class="card" style="padding:2px 12px">${rows}</div>${po}`;
}
function lgStandView(sp){
  const L = lg(sp), c = LG[sp], u = L.user, cols = c.points ? [['P', t => t.w + t.l + t.t + t.otl], ['W', t => t.w], ...(c.otl ? [['L', t => t.l], ['OTL', t => t.otl]] : [['D', t => t.t], ['L', t => t.l]]), [c.pfShort || 'GD', t => (t.pf - t.pa > 0 ? '+' : '') + (t.pf - t.pa)], ['PTS', t => lgPts(sp, t)]]
    : [['W', t => t.w], ['L', t => t.l], ['PCT', t => lgPct(t).toFixed(3).replace(/^0/, '')], ['DIFF', t => (t.pf - t.pa > 0 ? '+' : '') + (t.pf - t.pa)], ['STRK', t => t.strk || '-']];
  const n0 = c.po ? c.po.teams / (c.confs && c.po.byConf ? c.confs.length : 1) : 1;
  const table = ts => `<div class="scroll"><table><tr><th>#</th><th style="text-align:left">Team</th>${cols.map(([h]) => `<th>${h}</th>`).join('')}</tr>${ts.map((t, i) => `<tr class="${t.id === u ? 'me' : ''}"><td class="dim">${i + 1}</td><td style="text-align:left;${i === n0 - 1 ? 'border-bottom:2px solid var(--gold)' : ''}"><b>${t.abbr}</b> <span class="dim small">${t.name}</span></td>${cols.map(([, f]) => `<td>${f(t)}</td>`).join('')}</tr>`).join('')}</table></div>`;
  const note = c.po ? `<p class="small dim">Top ${n0}${c.confs && c.po.byConf ? ' in each conference' : ''} make the ${c.po.name} (gold line).</p>` : `<p class="small dim">Most points wins the title.</p>`;
  if(c.confs) return note + c.confs.map((cn, i) => `<h3>${cn}</h3><div class="card">${table(lgStandings(sp, i))}</div>`).join('');
  return note + `<div class="card">${table(lgStandings(sp))}</div>`;
}
function lgStatsView(sp){
  const L = lg(sp), c = LG[sp], m = lgSub('lgstats', 'leaders'), act = L.players.filter(p => p.tid >= 0);
  const sg = seg('lgstats', [['leaders', 'League leaders'], ['team', 'Your team']]);
  if(m === 'team'){ const r = lgRoster(sp, L.user).filter(p => p.st.gp).sort((a, b) => b.ovr - a.ovr);
    return sg + `<div class="card" style="padding:2px 12px">${r.map(p => `<div class="row small" data-lgp="${p.id}" style="cursor:pointer"><span class="pos">${p.pos}</span><span class="grow">${esc(lgName(p, true))}</span><span class="dim num">${lgStatLine(sp, p).slice(0, 4).map(([a, b]) => `${b} ${a}`).join(' · ')}</span></div>`).join('') || '<p class="dim small" style="padding:8px 0">No games played yet.</p>'}</div>`; }
  return sg + c.leaders.map(([k, n, per, minf]) => { const val = p => typeof per === 'function' ? +per(p) : per ? p.st[k] / Math.max(1, p.st.gp) : p.st[k]; const top = act.filter(p => p.st[k] > 0 && (!minf || minf(p))).sort((a, b) => val(b) - val(a)).slice(0, 5);
    return `<h3>${n}</h3><div class="card" style="padding:2px 12px">${top.map((p, i) => `<div class="row small ${p.tid === L.user ? 'gold' : ''}" data-lgp="${p.id}" style="cursor:pointer"><b class="num" style="width:16px">${i + 1}</b><span class="grow">${esc(lgName(p))} <span class="dim">${lgTeam(sp, p.tid).abbr}</span></span><b class="cond num" style="font-size:17px">${per ? (typeof per === 'function' ? per(p) : val(p).toFixed(1)) : p.st[k]}</b></div>`).join('') || '<p class="dim small" style="padding:8px 0">No stats yet.</p>'}</div>`; }).join('');
}

// ---------------- moves: contracts, free agents, trades, draft ----------------
function lgMovesView(sp){ return lgCtrl(sp) ? lgMovesInner(sp) : lockNote(sp) + '<div class="ro">' + lgMovesInner(sp) + '</div>'; }
function lgMovesInner(sp){
  const L = lg(sp), c = LG[sp], m = lgSub('lgmoves', 'contracts');
  const sg = seg('lgmoves', [['contracts', 'Contracts' + (L.resign.length ? ` (${L.resign.length})` : '')], ['fa', 'Free agents'], ['trade', 'Trade'], ['draft', 'Draft' + (L.draft && L.draft.active ? ' •' : '')]]);
  if(m === 'contracts'){
    const pend = L.resign.map(r => { const p = lgPlayer(sp, r.id); return p ? lgRow(sp, p, false, `<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end"><span class="small">asks <b>${money(r.ask)}</b> × ${r.yrs}y</span><span style="display:flex;gap:4px"><button class="btn sm" data-x="resign:${p.id}">Re-sign</button><button class="btn ghost sm" data-x="letgo:${p.id}">Let go</button></span></div>`) : ''; }).join('');
    const r = lgRoster(sp, L.user).sort((a, b) => b.con.amt - a.con.amt);
    return sg + `<div class="card small" style="display:flex;justify-content:space-between"><span>Cap room <b class="num ${lgCapRoom(sp, L.user) < 0 ? 'bad' : 'good'}">${money(lgCapRoom(sp, L.user))}</b></span><span>Roster ${r.length}/${c.rosterMax}</span></div>${pend ? `<h3>Expiring: decide now</h3><div class="card" style="padding:2px 12px">${pend}</div>` : ''}<h3>Payroll</h3><div class="card" style="padding:2px 12px">${r.map(p => lgRow(sp, p, false)).join('')}</div>`;
  }
  if(m === 'fa'){ const pos = VIEW.faPos && lgPosList(sp).includes(VIEW.faPos) ? VIEW.faPos : 'ALL', fa = L.players.filter(p => p.tid === -1 && (pos === 'ALL' || p.pos === pos)).sort((a, b) => b.ovr - a.ovr).slice(0, 50);
    return sg + `<div class="seg">${['ALL', ...lgPosList(sp)].map(k => `<button class="${pos === k ? 'on' : ''}" data-x="fapos:${k}">${k}</button>`).join('')}</div><p class="small dim">Cap room ${money(lgCapRoom(sp, L.user))}. Winning, hype and fame make players cheaper to sign.</p>
      <div class="card" style="padding:2px 12px">${fa.map(p => lgRow(sp, p, false, `<button class="btn sm" data-x="offer:${p.id}">${money(p.ask || lgSalary(sp, p.pos, p.ovr, p.age))}</button>`)).join('') || '<p class="dim small" style="padding:8px 0">No free agents.</p>'}</div>`; }
  if(m === 'trade'){ if(!lgTradeOpen(sp)) return sg + `<div class="card"><b>Trade deadline has passed.</b><p class="small dim">Trades reopen after the season.</p></div>`;
    const T = VIEW.trade; if(T.sp !== sp || T.tid == null || T.tid === L.user){ VIEW.trade = {sp, tid:L.teams.find(t => t.id !== L.user).id, give:new Set(), get:new Set()}; }
    const T2 = VIEW.trade, ev = lgTradeEval(sp, [...T2.give], [...T2.get], T2.tid), side = (tid, set, key) => lgRoster(sp, tid).sort((a, b) => b.ovr - a.ovr).map(p => `<label class="row small" style="cursor:pointer"><input type="checkbox" style="width:auto" data-tsel="${key}:${p.id}" ${set.has(p.id) ? 'checked' : ''}><div class="ovr" style="width:30px;height:30px;font-size:15px;background:${ovrColor(p.ovr)}">${p.ovr}</div><span class="grow">${esc(lgName(p, true))} <span class="pos">${p.pos}</span><div class="dim">age ${p.age} · ${money(p.con.amt)}</div></span></label>`).join('');
    const verdict = !T2.give.size && !T2.get.size ? 'Pick players from both sides.' : ev.ok ? '✅ They would accept this trade.' : !ev.capOk ? '❌ This breaks the salary cap.' : !ev.rostOk ? '❌ A roster would be too big.' : ev.margin > -150 ? '🤏 Close: add a little more.' : '❌ They want a lot more value.';
    return sg + `<label class="dim small" for="tradeTeam">Trade with</label><select id="tradeTeam">${L.teams.filter(t => t.id !== L.user).map(t => `<option value="${t.id}" ${t.id === T2.tid ? 'selected' : ''}>${lgTeamName(t)}</option>`).join('')}</select>
      <div class="card" style="margin-top:10px;display:flex;align-items:center;gap:10px"><span class="grow ${ev.ok ? 'good' : ''}">${verdict}</span><button class="btn sm" id="lgPropose" ${ev.ok && (T2.give.size || T2.get.size) ? '' : 'disabled'}>Propose</button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><h3>You give</h3><div class="card" style="padding:2px 8px;max-height:420px;overflow:auto">${side(L.user, T2.give, 'give')}</div></div><div><h3>You get</h3><div class="card" style="padding:2px 8px;max-height:420px;overflow:auto">${side(T2.tid, T2.get, 'get')}</div></div></div>`; }
  const D = L.draft;
  if(D && D.active){ const onClock = D.onClock === L.user, pool = L.players.filter(p => p.tid === -2).sort((a, b) => { const ra = lgProspectRange(sp, a), rb = lgProspectRange(sp, b); return (rb[0] + rb[1]) / 2 + b.ovr * .4 - (ra[0] + ra[1]) / 2 - a.ovr * .4; }).slice(0, 50);
    return sg + `<div class="card" style="${onClock ? 'border-color:var(--gold)' : ''}"><b class="cond ${onClock ? 'gold' : ''}" style="font-size:20px">${onClock ? `🎓 YOU'RE ON THE CLOCK: pick #${D.at + 1}` : 'Draft in progress'}</b><p class="dim small">Round ${D.picks[D.at] ? D.picks[D.at].r : '-'}. Scouting level ${L.scout}: potential shows as a range.</p>${onClock ? '<button class="btn sm ghost" id="lgAutoPick" style="margin-top:6px">Auto-pick best available</button>' : ''}</div>
      <div class="card" style="padding:2px 12px">${pool.map(p => lgRow(sp, p, false, onClock ? `<button class="btn sm" data-x="draft:${p.id}">Draft</button>` : '', lgProspectRange(sp, p).join('–'))).join('')}</div>`; }
  const cls = L.players.filter(p => p.tid === -2).sort((a, b) => lgProspectRange(sp, b)[1] - lgProspectRange(sp, a)[1]).slice(0, 30);
  const done = D && !D.active ? `<h3>${D.y} draft: your picks</h3><div class="card" style="padding:2px 12px">${D.picks.filter(p => p.tid === L.user && p.pid).map(pk => { const p = lgPlayer(sp, pk.pid); return p ? lgRow(sp, p, false, `<span class="small dim">#${(pk.r - 1) * L.teams.length + pk.n}</span>`) : ''; }).join('') || '<p class="dim small" style="padding:8px 0">None.</p>'}</div>` : '';
  return sg + `<div class="card"><b class="cond" style="font-size:18px">${L.draftYear} draft class</b><p class="dim small">${c.draftRounds} rounds, right after the season (${lgNextEvent(sp) || 'soon'}).</p></div>${done}<h3>Top prospects</h3><div class="card" style="padding:2px 12px">${cls.map(p => lgRow(sp, p, false, '', lgProspectRange(sp, p).join('–'))).join('')}</div>`;
}

// ---------------- franchise ----------------
function lgFranView(sp){ return lgCtrl(sp) ? lgFranInner(sp) : lockNote(sp) + '<div class="ro">' + lgFranInner(sp) + '</div>'; }
function lgFranInner(sp){
  const L = lg(sp), c = LG[sp], t = lgTeam(sp, L.user), f = t.fin, fill = lgFill(sp, t), up = lgArenaCost(sp, t.arena.lvl);
  const lines = (f.last || []).map(([n, v]) => `<div class="row small"><span class="grow">${n}</span><b class="num ${v >= 0 ? 'good' : 'bad'}">${v >= 0 ? '+' : ''}${money(v)}</b></div>`).join('');
  return `<div class="card"><div style="display:flex;align-items:center;gap:10px">${crest(t, 48, c.crest)}<div class="grow"><b class="cond" style="font-size:20px">${lgTeamName(t)}</b><div class="dim small">Team value <b class="gold">${money(lgTeamValue(sp, t.id))}</b> · ${t.titles} title${t.titles === 1 ? '' : 's'}</div></div></div>
      <div style="margin-top:10px">${statBox([['Season revenue', money(f.rev)], ['Season costs', money(f.exp)], ['Profit', money(f.rev - f.exp), f.rev - f.exp >= 0 ? 'good' : 'bad']])}</div><p class="small dim" style="margin-top:6px">Whole-team numbers; you receive ${stakeOf(sp)}% of the profit.</p></div>
    <h3>Last week's books</h3><div class="card" style="padding:2px 12px">${lines || '<p class="dim small" style="padding:8px 0">Play a week to see the books.</p>'}</div>
    <h3>Ticket prices</h3><div class="card"><div class="seg" style="margin:0 0 8px">${Object.entries(LG_TICKETS).map(([k, v]) => `<button class="${t.tix === k ? 'on' : ''}" data-x="tix:${k}">${v.n} $${Math.round(c.money.ticket * v.mul)}</button>`).join('')}</div><div class="small dim">Expected crowd: <b class="num" style="color:var(--text)">${Math.round(t.arena.cap * fill).toLocaleString()}</b> (${Math.round(fill * 100)}% full).</div></div>
    <h3>${c.venue}</h3><div class="card"><div class="row" style="border:0"><span class="grow">${t.arena.cap.toLocaleString()} seats · premium level ${t.arena.lvl}</span><button class="btn sm" data-x="arena:1" ${S.cash < up ? 'disabled' : ''}>Expand · ${money(up)}</button></div><p class="dim small">+${c.money.seatStep.toLocaleString()} seats and more premium boxes: bigger gates every home ${c.gameWord}.</p></div>
    <h3>${c.coachWord ? c.coachWord[0].toUpperCase() + c.coachWord.slice(1) : 'Head coach'}</h3><div class="card"><div class="row" style="border:0"><div class="ovr" style="background:${ovrColor(t.coach.r)}">${t.coach.r}</div><span class="grow"><b>${t.coach.name}</b><div class="dim small">Better coaching wins close games and develops young players.</div></span></div>
      ${lgCoachPool(sp).map((k, i) => `<div class="row small"><div class="ovr" style="width:30px;height:30px;font-size:15px;background:${ovrColor(k.r)}">${k.r}</div><span class="grow">${k.name}</span><button class="btn ghost sm" data-x="hire:${i}" ${S.cash < k.fee || k.r <= t.coach.r ? 'disabled' : ''}>Hire · ${money(k.fee)}</button></div>`).join('')}</div>
    <h3>Scouting</h3><div class="card"><div class="row" style="border:0"><span class="grow">Level ${L.scout} of 5 <div class="dim small">Sharper draft potential ranges.</div></span><button class="btn sm" data-x="scout:1" ${L.scout >= 5 || S.cash < lgScoutCost(sp) ? 'disabled' : ''}>${L.scout >= 5 ? 'Maxed' : `Upgrade · ${money(lgScoutCost(sp))}`}</button></div></div>
    ${f.hist.length ? `<h3>Past seasons</h3><div class="card"><table><tr><th>Season</th><th>Revenue</th><th>Costs</th><th>Profit</th></tr>${f.hist.map(h => `<tr><td>${h.y}</td><td>${money(h.rev)}</td><td>${money(h.exp)}</td><td class="${h.rev - h.exp >= 0 ? 'good' : 'bad'}">${money(h.rev - h.exp)}</td></tr>`).join('')}</table></div>` : ''}`;
}
const lgScoutCost = sp => Math.max(1, Math.round(LG[sp].money.staff * 160 * lg(sp).scout));

// ---------------- history ----------------
function lgHistView(sp){
  const L = lg(sp), c = LG[sp], m = lgSub('lghist', 'champs'), u = lgTeam(sp, L.user), none = '<p class="dim small" style="padding:8px 0">Nothing yet. Play a season!</p>';
  const sg = seg('lghist', [['champs', 'Champions'], ['awards', 'Awards'], ['mine', 'Your seasons'], ['records', 'Records'], ['hof', 'Hall of Fame']]);
  if(m === 'awards') return sg + `<div class="card" style="padding:2px 12px">${L.hist.awards.map(a => `<div class="row small"><b class="num" style="width:54px">${a.y}</b><div class="grow">${c.awards.filter(x => a[x.k]).map(x => `<div><span class="dim">${x.n}:</span> <b class="${a[x.k].tid === L.user ? 'gold' : ''}">${a[x.k].n}</b> <span class="dim">${a[x.k].pos}, ${a[x.k].abbr}</span></div>`).join('')}</div></div>`).join('') || none}</div>`;
  if(m === 'mine') return sg + `<div class="card"><table><tr><th>Season</th><th>Record</th><th>Result</th></tr>${u.seasons.map(s => `<tr><td>${s.y}</td><td>${c.points ? `${s.w}-${s.t || s.otl}-${s.l} (${s.pts})` : `${s.w}-${s.l}`}</td><td class="${s.po === 'Champions' ? 'gold' : ''}">${s.po === 'Champions' ? '🏆 Champions' : s.po === 'made' ? c.po.name : s.po ? (c.po ? `Out: ${s.po}` : s.po) : (c.po ? 'Missed' : '-')}</td></tr>`).join('')}</table>${u.seasons.length ? '' : none}</div>`;
  if(m === 'records') return sg + `<div class="card" style="padding:2px 12px">${Object.values(L.hist.records).map(r => `<div class="row small"><span class="grow"><span class="dim">${r.lab}</span><div><b>${r.n}</b> <span class="dim">${r.abbr}, ${r.y}</span></div></span><b class="cond num" style="font-size:20px">${r.v}</b></div>`).join('') || none}</div>`;
  if(m === 'hof'){ const hof = L.players.filter(p => p.hof).sort((a, b) => b.hof - a.hof); return sg + `<div class="card" style="padding:2px 12px">${hof.map(p => `<div class="row small" data-lgp="${p.id}" style="cursor:pointer">🏛️ <span class="grow"><b>${esc(lgName(p))}</b> <span class="pos">${p.pos}</span><div class="dim">Class of ${p.hof} · peak ${p.peak}</div></span></div>`).join('') || none}</div>`; }
  return sg + `<div class="card" style="padding:2px 12px">${L.hist.champs.map(ch => `<div class="row"><b class="num" style="width:54px">${ch.y}</b>${crest(lgTeam(sp, ch.tid), 28, c.crest)}<span class="grow ${ch.tid === L.user ? 'gold' : ''}"><b>${ch.name}</b><div class="dim small">${ch.rec} · runner-up ${ch.runner}</div></span></div>`).join('') || none}</div>`;
}

// ---------------- clicks ----------------
function lgClick(sp, b, d){
  const L = lg(sp), c = LG[sp];
  if(d.lgp){ lgPlayerModal(sp, +d.lgp); return true; }
  if(b.id === 'lgPropose' || b.id === 'lgAutoPick') d = {x:b.id === 'lgPropose' ? 'propose:0' : 'autopick:0'};
  if(!d.x) return false;
  const [k, v] = d.x.split(/:(.*)/s), id = +v;
  if(k === 'goto'){ const [tab, sub] = v.split(':'); go(sp, tab, sub ? {['lg' + tab]:sub} : null); return true; }
  if(k === 'fapos'){ VIEW.faPos = v; render(); return true; }
  if(!lgCtrl(sp)){ closeModal(); toast('🔒 Own more than 50% to run the team'); return true; }
  const done = msg => { if(msg) toast(msg); persist(); render(); return true; };
  if(k === 'rel'){ const p = lgPlayer(sp, id); modal(`<h2>Release ${esc(lgName(p))}?</h2><p class="dim">He becomes a free agent and his ${money(p.con.amt)} salary comes off your books.</p><button class="btn wide" data-x="relyes:${p.id}" style="margin-top:12px">Release</button><button class="btn ghost wide" data-close style="margin-top:8px">Keep him</button>`); return true; }
  if(k === 'relyes'){ const p = lgPlayer(sp, id); p.tid = -1; p.ask = lgSalary(sp, p.pos, p.ovr, p.age); news(`✂️ Released ${lgName(p)} (${p.pos}).`, 'info', sp); closeModal(); return done(); }
  if(k === 'tradeaway' || k === 'tradefor'){ const p = lgPlayer(sp, id); VIEW.trade = k === 'tradefor' ? {sp, tid:p.tid, get:new Set([p.id]), give:new Set()} : {sp, tid:VIEW.trade.sp === sp && VIEW.trade.tid != null ? VIEW.trade.tid : L.teams.find(t => t.id !== L.user).id, give:new Set([p.id]), get:new Set()}; closeModal(); go(sp, 'moves', {lgmoves:'trade'}); return true; }
  if(k === 'propose'){ const T = VIEW.trade, ev = lgTradeEval(sp, [...T.give], [...T.get], T.tid); if(!ev.ok) return done('They turned it down'); lgDoTrade(sp, [...T.give], [...T.get], T.tid); T.give = new Set(); T.get = new Set(); return done('🔁 Trade complete!'); }
  if(k === 'resign' || k === 'letgo'){ const r = lgResign(sp, id, k === 'resign'); return done(r === 'cap' ? '💸 Not enough cap room' : ''); }
  if(k === 'offer'){ const p = lgPlayer(sp, id), ask = Math.round(p.ask / lgInterest(sp) * 10) / 10;
    modal(`<h2>Offer ${esc(lgName(p))}</h2><p class="dim">${p.pos} · ${p.ovr} OVR · age ${p.age}. He's asking about <b>${money(ask)}</b> a year from you.</p>
      <label class="small dim" for="offAmt" style="display:block;margin-top:10px">Salary per year ($M)</label><input id="offAmt" type="number" step="0.1" min="${c.money.minSal}" value="${ask}">
      <label class="small dim" for="offYrs" style="display:block;margin-top:8px">Years</label><select id="offYrs">${[1, 2, 3, 4, 5].map(y => `<option ${y === (p.age >= c.peak + 2 ? 1 : 3) ? 'selected' : ''}>${y}</option>`).join('')}</select>
      <p class="small dim" style="margin-top:8px">Cap room: ${money(lgCapRoom(sp, L.user))}</p><button class="btn wide" data-x="sendoffer:${p.id}" style="margin-top:10px">Send offer</button><button class="btn ghost wide" data-close style="margin-top:8px">Cancel</button>`); return true; }
  if(k === 'sendoffer'){ const r = lgOfferFA(sp, id, +$('offAmt').value, +$('offYrs').value); toast({ok:'✍️ Signed!', low:'He wants more money', cap:'💸 Not enough cap room', roster:'Roster is full', gone:'He already signed elsewhere'}[r]); if(r === 'ok'){ closeModal(); persist(); render(); } return true; }
  if(k === 'draft'){ lgDraftPick(sp, id); lgDraftAdvance(sp); return done(); }
  if(k === 'autopick'){ const pool = L.players.filter(p => p.tid === -2).sort((a, b) => lgDraftValue(sp, b, L.user) - lgDraftValue(sp, a, L.user)); lgDraftPick(sp, pool[0].id); lgDraftAdvance(sp); return done(); }
  if(k === 'tix'){ lgTeam(sp, L.user).tix = v; return done(); }
  if(k === 'arena') return done(lgUpgradeArena(sp) ? `🏟️ ${c.venue} expanded!` : '💸 Not enough cash');
  if(k === 'hire') return done(lgHireCoach(sp, id) ? '📋 New coach hired' : '💸 Not enough cash');
  if(k === 'scout'){ const cost = lgScoutCost(sp); if(S.cash >= cost && L.scout < 5){ S.cash -= cost; book('🏟️ Team upgrades', -cost); L.scout++; return done('🔭 Scouting upgraded'); } return done('💸 Not enough cash'); }
  return false;
}
function lgChange(sp, t){
  if(t.id === 'tradeTeam'){ VIEW.trade = {sp, tid:+t.value, give:new Set(), get:new Set()}; render(); return true; }
  if(t.dataset.tsel){ const [k, id] = t.dataset.tsel.split(':'); const set = VIEW.trade[k]; t.checked ? set.add(+id) : set.delete(+id); render(); return true; }
  return false;
}
