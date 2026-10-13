'use strict';
// =====================================================================================
//  FOOTBALL SCREENS + the football module's UI hooks (tabs, play button, sim stops, clicks)
// =====================================================================================
function fbNextEvent(){ const w = fb().wk, ev = [[21, 'Offseason'], [27, 'Free agency'], [33, 'Draft'], [45, 'Training camp'], [52, 'Kickoff']]; for(const [k, n] of ev) if(w < k) return `${n} in ${k - w} wk${k - w > 1 ? 's' : ''}`; return ''; }

// ---------------- football: home ----------------
function fbHome(){
  const L = fb(), u = fbTeam(L.user), g = fbUserGame(), wk = L.wk, alerts = [];
  if(L.draft && L.draft.active && L.draft.onClock === L.user) alerts.push(`<div class="card" style="border-color:var(--gold)"><b class="cond gold" style="font-size:19px">🎓 YOU'RE ON THE CLOCK</b><p class="small">Pick #${L.draft.at + 1} in the ${L.draft.y} Draft.</p><button class="btn sm" data-goto="moves:draft" style="margin-top:8px">Go to the draft</button></div>`);
  if(L.resign && L.resign.length) alerts.push(`<div class="card" style="border-color:var(--gold)"><b class="cond gold" style="font-size:18px">✍️ ${L.resign.length} contract${L.resign.length > 1 ? 's' : ''} to decide</b><p class="small dim">Re-sign or let them go before free agency opens${wk < 27 ? ` in ${27 - wk} weeks` : ''}.</p><button class="btn sm" data-goto="moves:contracts" style="margin-top:8px">Review contracts</button></div>`);
  let next = '';
  if(g && !g.s){ const H = fbTeam(g.h), A = fbTeam(g.a), side = t => `<div style="flex:1;text-align:center">${helmet(t, 64, t === A)}<div class="cond" style="font-size:20px;font-weight:800">${t.abbr}</div><div class="dim small num">${t.w}-${t.l}${t.t ? '-' + t.t : ''} · OVR ${fbTeamOvr(t.id)}</div></div>`;
    next = `<div class="card"><div class="cond dim" style="text-transform:uppercase;font-weight:700">${g.po ? FB_ROUND_NAMES[g.po] : `Week ${wk + 1}`} · ${weekDate(S.week)}${g.neutral ? ' · neutral site' : ''}</div>
      <div style="display:flex;align-items:center;margin:10px 0">${side(H)}<div class="cond dim" style="font-size:22px;font-weight:800">VS</div>${side(A)}</div>
      <div style="display:flex;gap:8px"><button class="btn wide" data-play="watch">▶ Watch live</button><button class="btn ghost" data-play="sim">Sim</button></div></div>`; }
  else if(wk >= 17 && wk <= 20) next = `<div class="card"><b class="cond" style="font-size:19px">${u.poRes && u.poRes !== 'made' ? `Season over: lost in the ${u.poRes}` : u.poRes === 'Champions' ? '🏆 CHAMPIONS' : 'Playoffs'}</b><p class="dim small">${L.po && L.po.alive ? 'The playoffs continue without you.' : ''}</p></div>`;
  else if(wk > 20 || wk < 0) next = `<div class="card"><b class="cond" style="font-size:19px">${wk < 0 ? 'Preseason' : 'Offseason'}</b><p class="dim small">${fbOffseasonText()}</p></div>`;
  const lg = L.lastGame, last = lg ? `<div class="card"><div class="cond dim" style="text-transform:uppercase;font-weight:700">Last game</div><div class="row" style="border:0">${helmet(fbTeam(lg.opp), 34)}<div class="grow"><b>${lg.home ? 'vs' : '@'} ${fbTeamName(fbTeam(lg.opp))}</b><div class="dim small">${lg.po ? FB_ROUND_NAMES[lg.po] : `Week ${lg.wk + 1}`}${lg.ot ? ' · OT' : ''}</div></div><b class="cond num ${lg.us > lg.them ? 'good' : lg.us < lg.them ? 'bad' : ''}" style="font-size:22px">${lg.us > lg.them ? 'W' : lg.us < lg.them ? 'L' : 'T'} ${lg.us}-${lg.them}</b></div></div>` : '';
  const div = fbDivStandings(u.div), rank = div.indexOf(u) + 1;
  const snap = `<div class="card"><div style="display:flex;align-items:center;gap:10px">${helmet(u, 56)}<div class="grow"><b class="cond" style="font-size:22px">${fbTeamName(u)}</b><div class="dim small">${L.season} · ${ord(rank)} in ${FB_CONF[u.conf]} ${FB_DIV[u.div % 4]} · coach ${u.coach.name}</div></div><div class="cond num" style="font-size:30px;font-weight:800">${u.w}-${u.l}${u.t ? '-' + u.t : ''}</div></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px;text-align:center">${[['Team OVR', fbTeamOvr(u.id)], ['Points', `${u.pf}-${u.pa}`], ['Streak', u.strk || '-'], ['Cap room', money(fbCapRoom(u.id))]].map(([a, b]) => `<div style="background:var(--panel2);border-radius:8px;padding:6px 2px"><div class="dim small">${a}</div><b class="cond num" style="font-size:18px">${b}</b></div>`).join('')}</div>
    <div class="small dim" style="margin-top:10px">Fan hype</div><div class="bar"><i style="width:${u.hype}%;background:var(--gold)"></i></div></div>`;
  const nws = S.news.filter(n => !n.s || n.s === 'football').slice(0, 10);
  return alerts.join('') + next + last + snap + `<h3>News</h3><div class="card" style="padding:4px 12px">${nws.length ? nws.map(n => `<div class="row small"><span class="grow ${n.k === 'good' ? 'good' : n.k === 'bad' ? 'bad' : n.k === 'ach' ? 'gold' : ''}">${esc(n.t)}</span><span class="dim num" style="flex:none">${weekDate(n.w)}</span></div>`).join('') : '<p class="dim small" style="padding:8px 0">No news yet.</p>'}</div>`;
}
function fbOffseasonText(){ const w = fb().wk; if(w < 0) return 'Your first season kicks off next week. Check your roster and franchise settings.'; if(w < 27) return 'Contracts expire now. Re-sign the players you want to keep before free agency opens.'; if(w < 33) return 'Free agency is open. Sign veterans to fill holes; AI teams are shopping too.'; if(w < 45) return 'Draft done. Rookies are developing; you can still sign free agents and make trades.'; return 'Training camp: rosters are set to 53. The new season starts soon.'; }

// ---------------- football: roster & player card ----------------
function fbRosterView(){
  const L = fb(), r = fbRoster(L.user).sort((a, b) => FB_POS_ORDER.indexOf(a.pos) - FB_POS_ORDER.indexOf(b.pos) || b.ovr - a.ovr);
  const st = fbStarters(L.user), starterIds = new Set(Object.values(st).flat().map(p => p.id));
  return `<div class="card small" style="display:flex;justify-content:space-between"><span>Roster <b class="num">${r.length}/53</b></span><span>Payroll <b class="num">${money(fbPayroll(L.user))}</b> / ${money(L.cap)}</span></div>` +
    FB_POS_ORDER.map(pos => { const ps = r.filter(p => p.pos === pos); return `<h3>${pos} <span class="small">(${ps.length})</span></h3><div class="card" style="padding:2px 12px">${ps.map(p => playerRow(p, starterIds.has(p.id))).join('') || '<p class="dim small" style="padding:8px 0">Nobody at this position.</p>'}</div>`; }).join('');
}
function playerRow(p, starter, extra = ''){
  return `<button class="row" style="width:100%;text-align:left" data-player="${p.id}"><div class="ovr" style="background:${ovrColor(p.ovr)}">${p.ovr}</div><div class="grow"><b>${esc(fbName(p))}</b> <span class="pos">${p.pos}</span>${starter ? ' <span class="tag" style="background:#ffb81c26;color:var(--gold)">Starter</span>' : ''}${p.inj ? ` <span class="tag" style="background:#ff5b6b26;color:var(--bad)">Out ${p.inj}w</span>` : ''}
    <div class="dim small">Age ${p.age} · Pot ${p.pot} · ${money(p.con.amt)} × ${p.con.yrs}y${p.dr && p.dr.y ? ` · R${p.dr.r} '${String(p.dr.y).slice(2)}` : ''}</div></div>${extra}</button>`; }
function statLine(p, st){ const s = st || p.st; if(p.pos === 'QB') return [['CMP', `${s.pc}/${s.pa}`], ['YDS', s.py], ['TD', s.ptd], ['INT', s.int], ['RUSH', s.ry]];
  if(p.pos === 'RB') return [['CAR', s.ra], ['YDS', s.ry], ['TD', s.rtd], ['REC', s.rec], ['RCY', s.rcy]];
  if(p.pos === 'WR' || p.pos === 'TE') return [['REC', s.rec], ['YDS', s.rcy], ['TD', s.rctd], ['YPC', s.rec ? (s.rcy / s.rec).toFixed(1) : '-']];
  if(p.pos === 'K') return [['FG', `${s.fgm}/${s.fga}`], ['XP', s.xpm]];
  if(p.pos === 'P') return [['GP', s.gp]];
  return [['GP', s.gp], ['SACKS', s.sk], ['INT', s.dint]]; }
function playerModal(pid){
  const L = fb(), p = fbPlayer(pid); if(!p) return; const t = p.tid >= 0 ? fbTeam(p.tid) : null, mine = p.tid === L.user;
  const line = statLine(p), aw = p.aw.map(a => `${a.y} ${a.a.toUpperCase()}`).join(' · ');
  modal(`<div style="display:flex;gap:12px;align-items:center">${t ? helmet(t, 52) : ''}<div class="grow"><h2 style="margin:0">${esc(fbName(p))}</h2><div class="dim">${p.pos} · Age ${p.age} · ${t ? fbTeamName(t) : p.tid === -1 ? 'Free agent' : p.tid === -2 ? 'Draft prospect' : 'Retired'}</div></div>
      <div style="text-align:center"><div class="ovr" style="width:52px;height:52px;font-size:26px;background:${ovrColor(p.ovr)}">${p.ovr}</div><div class="small dim">POT ${p.tid === -2 ? fbProspectRange(p).join('–') : p.pot}</div></div></div>
    ${p.tid >= 0 ? `<div class="small" style="margin-top:8px">Contract <b>${money(p.con.amt)}</b> per year · ${p.con.yrs} year${p.con.yrs === 1 ? '' : 's'} left${p.dr ? ` · Drafted ${p.dr.y}, round ${p.dr.r} pick ${p.dr.n}` : ''}</div>` : ''}
    ${p.inj ? `<div class="small bad">Injured: out ${p.inj} more week${p.inj > 1 ? 's' : ''}</div>` : ''}${aw ? `<div class="small gold">🏅 ${aw}</div>` : ''}
    <h3>${L.season} season</h3><div style="display:grid;grid-template-columns:repeat(${line.length},1fr);gap:6px;text-align:center">${line.map(([a, b]) => `<div style="background:var(--panel2);border-radius:8px;padding:6px 2px"><div class="dim small">${a}</div><b class="cond num" style="font-size:18px">${b}</b></div>`).join('')}</div>
    ${p.hist.length ? `<h3>Career</h3><div class="scroll"><table><tr><th>Year</th><th>Team</th><th>OVR</th>${statLine(p).map(([a]) => `<th>${a}</th>`).join('')}</tr>${p.hist.map(h => `<tr><td>${h.y}</td><td>${(fbTeam(h.tid) || {abbr:'FA'}).abbr}</td><td>${h.ovr}</td>${statLine(p, h.st).map(([, b]) => `<td>${b}</td>`).join('')}</tr>`).join('')}</table></div>` : ''}
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">${mine ? `<button class="btn ghost sm" data-release="${p.id}">Release</button><button class="btn ghost sm" data-tradeaway="${p.id}">Shop in a trade</button>` : ''}${t && !mine && fbTradeOpen() ? `<button class="btn ghost sm" data-tradefor="${p.id}">Trade for him</button>` : ''}<button class="btn sm" data-close style="margin-left:auto">Close</button></div>`);
}

// ---------------- football: games, standings, stats ----------------
function fbGamesView(){
  const L = fb(), u = L.user, rows = L.sched.map((wk, i) => { const g = wk.find(x => x.h === u || x.a === u); if(!g) return ''; const home = g.h === u, o = fbTeam(home ? g.a : g.h);
    const res = g.s ? (() => { const us = g.s[home ? 0 : 1], them = g.s[home ? 1 : 0]; return `<b class="cond num ${us > them ? 'good' : us < them ? 'bad' : ''}">${us > them ? 'W' : us < them ? 'L' : 'T'} ${us}-${them}${g.ot ? ' OT' : ''}</b>`; })() : `<span class="dim small num">${weekDate(36 + i + (yearOf(S.week) - 2026) * 52)}</span>`;
    return `<div class="row${i === L.wk ? '" style="background:#ffb81c10' : ''}"><span class="num dim" style="width:26px">${i + 1}</span>${helmet(o, 30)}<div class="grow">${home ? 'vs' : '@'} <b>${o.city} ${o.name}</b><div class="dim small num">${o.w}-${o.l}${o.t ? '-' + o.t : ''}</div></div>${res}</div>`; }).join('');
  let po = '';
  if(L.po){ po = `<h3>Playoffs</h3>` + [17, 18, 19, 20].filter(r => L.po.rounds[r]).map(r => `<div class="card"><b class="cond gold">${FB_ROUND_NAMES[r]}</b>${L.po.rounds[r].map(g => { const H = fbTeam(g.h), A = fbTeam(g.a); return `<div class="row small"><span class="grow ${g.h === u || g.a === u ? 'gold' : ''}">${A.abbr} @ ${H.abbr}</span>${g.s ? `<b class="num">${g.s[1]}-${g.s[0]}</b>` : '<span class="dim">upcoming</span>'}</div>`; }).join('')}</div>`).join(''); }
  return `<h3>${L.season} schedule</h3><div class="card" style="padding:2px 12px">${rows}</div>${po}`;
}
function fbStandView(){
  const L = fb(), m = VIEW.sub.stand, u = L.user;
  const table = ts => `<div class="scroll"><table><tr><th>Team</th><th>W</th><th>L</th><th>T</th><th>PCT</th><th>PF</th><th>PA</th><th>DIFF</th><th>STRK</th></tr>${ts.map(t => `<tr class="${t.id === u ? 'me' : ''}"><td><b>${t.abbr}</b> <span class="dim small">${t.name}</span></td><td>${t.w}</td><td>${t.l}</td><td>${t.t}</td><td>${fbPct(t).toFixed(3).replace(/^0/, '')}</td><td>${t.pf}</td><td>${t.pa}</td><td class="${t.pf - t.pa >= 0 ? 'good' : 'bad'}">${t.pf - t.pa > 0 ? '+' : ''}${t.pf - t.pa}</td><td>${t.strk || '-'}</td></tr>`).join('')}</table></div>`;
  const seg = `<div class="seg">${[['div', 'Divisions'], ['conf', 'Conferences'], ['po', 'Playoff picture']].map(([k, n]) => `<button class="${m === k ? 'on' : ''}" data-sub="stand:${k}">${n}</button>`).join('')}</div>`;
  if(m === 'conf') return seg + [0, 1].map(c => `<h3>${FB_CONF[c]} Conference</h3><div class="card">${table(fbStandings(c))}</div>`).join('');
  if(m === 'po') return seg + [0, 1].map(c => { const s = fbSeeds(c); return `<h3>${FB_CONF[c]} seeds</h3><div class="card" style="padding:2px 12px">${s.map((tid, i) => { const t = fbTeam(tid); return `<div class="row ${tid === u ? 'gold' : ''}"><b class="num" style="width:22px">${i + 1}</b>${helmet(t, 26)}<span class="grow">${fbTeamName(t)}${i === 0 ? ' <span class="tag" style="background:#38d98a22;color:var(--good)">Bye</span>' : i < 4 ? ' <span class="dim small">division leader</span>' : ' <span class="dim small">wild card</span>'}</span><span class="num">${t.w}-${t.l}${t.t ? '-' + t.t : ''}</span></div>`; }).join('')}</div>`; }).join('');
  return seg + [0, 1, 2, 3, 4, 5, 6, 7].map(d => `<h3>${FB_CONF[Math.floor(d / 4)]} ${FB_DIV[d % 4]}</h3><div class="card">${table(fbDivStandings(d))}</div>`).join('');
}
function fbStatsView(){
  const L = fb(), m = VIEW.sub.stats, act = L.players.filter(p => p.tid >= 0);
  const seg = `<div class="seg">${[['leaders', 'League leaders'], ['team', 'Your team']].map(([k, n]) => `<button class="${m === k ? 'on' : ''}" data-sub="stats:${k}">${n}</button>`).join('')}</div>`;
  if(m === 'team'){ const r = fbRoster(L.user).filter(p => p.st.gp).sort((a, b) => FB_POS_ORDER.indexOf(a.pos) - FB_POS_ORDER.indexOf(b.pos) || b.ovr - a.ovr);
    return seg + `<div class="card" style="padding:2px 12px">${r.map(p => `<button class="row small" style="width:100%;text-align:left" data-player="${p.id}"><span class="pos">${p.pos}</span><span class="grow">${esc(fbName(p, true))}</span><span class="dim num">${statLine(p).map(([a, b]) => `${b} ${a}`).join(' · ')}</span></button>`).join('') || '<p class="dim small" style="padding:8px 0">No games played yet.</p>'}</div>`; }
  const cats = [['py', 'Passing yards'], ['ptd', 'Passing TDs'], ['ry', 'Rushing yards'], ['rcy', 'Receiving yards'], ['rctd', 'Receiving TDs'], ['sk', 'Sacks'], ['dint', 'Interceptions'], ['fgm', 'Field goals']];
  return seg + cats.map(([k, n]) => { const top = act.filter(p => p.st[k] > 0).sort((a, b) => b.st[k] - a.st[k]).slice(0, 5);
    return `<h3>${n}</h3><div class="card" style="padding:2px 12px">${top.map((p, i) => `<button class="row small ${p.tid === L.user ? 'gold' : ''}" style="width:100%;text-align:left" data-player="${p.id}"><b class="num" style="width:16px">${i + 1}</b><span class="grow">${esc(fbName(p))} <span class="dim">${fbTeam(p.tid).abbr}</span></span><b class="cond num" style="font-size:17px">${p.st[k]}</b></button>`).join('') || '<p class="dim small" style="padding:8px 0">No stats yet.</p>'}</div>`; }).join('');
}

// ---------------- football: moves (contracts, free agents, trades, draft) ----------------
function fbMovesView(){ return fbCtrl() ? fbMovesInner() : lockNote('football') + '<div class="ro">' + fbMovesInner() + '</div>'; }
function fbMovesInner(){
  const L = fb(), m = VIEW.sub.moves;
  const seg = `<div class="seg">${[['contracts', 'Contracts'], ['fa', 'Free agents'], ['trade', 'Trade'], ['draft', 'Draft']].map(([k, n]) => `<button class="${m === k ? 'on' : ''}" data-sub="moves:${k}">${n}${k === 'contracts' && L.resign.length ? ` (${L.resign.length})` : ''}${k === 'draft' && L.draft && L.draft.active ? ' •' : ''}</button>`).join('')}</div>`;
  const cap = `<div class="card small" style="display:flex;justify-content:space-between"><span>Cap room <b class="num ${fbCapRoom(L.user) < 0 ? 'bad' : 'good'}">${money(fbCapRoom(L.user))}</b></span><span>Roster <b class="num">${fbRoster(L.user).length}/53</b></span></div>`;
  if(m === 'contracts'){
    const pend = L.resign.map(r => { const p = fbPlayer(r.id); return p ? playerRow(p, false, `<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end"><span class="small">asks <b>${money(r.ask)}</b> × ${r.yrs}y</span><span style="display:flex;gap:4px"><span class="btn sm" data-resign="${p.id}">Re-sign</span><span class="btn ghost sm" data-letgo="${p.id}">Let go</span></span></div>`) : ''; }).join('');
    const all = fbRoster(L.user).sort((a, b) => b.con.amt - a.con.amt);
    return seg + cap + (pend ? `<h3>Expiring: decide now</h3><div class="card" style="padding:2px 12px">${pend}</div>` : `<p class="dim small" style="margin-bottom:8px">Contracts expire at the start of the offseason. Expiring players show up here to re-sign.</p>`) + `<h3>Payroll</h3><div class="card" style="padding:2px 12px">${all.map(p => playerRow(p, false)).join('')}</div>`;
  }
  if(m === 'fa'){
    const pos = VIEW.faPos, fa = L.players.filter(p => p.tid === -1 && (pos === 'ALL' || p.pos === pos)).sort((a, b) => b.ovr - a.ovr).slice(0, 60);
    return seg + cap + `<div class="seg">${['ALL', ...FB_POS_ORDER].map(p => `<button class="${pos === p ? 'on' : ''}" data-fapos="${p}">${p}</button>`).join('')}</div>` +
      `<div class="card" style="padding:2px 12px">${fa.map(p => playerRow(p, false, `<span class="btn sm" data-offer="${p.id}">${money(p.ask || fbSalary(p.pos, p.ovr, p.age))}</span>`)).join('') || '<p class="dim small" style="padding:8px 0">No free agents at this position.</p>'}</div>`;
  }
  if(m === 'trade'){
    if(!fbTradeOpen()) return seg + `<div class="card"><b>The trade deadline has passed.</b><p class="dim small">Trades reopen after the season ends.</p></div>`;
    const T = VIEW.trade; if(T.tid == null || T.tid === L.user) T.tid = L.teams.find(t => t.id !== L.user).id;
    const ev = fbTradeEval([...T.give], [...T.get], T.tid), side = (tid, set, key) => fbRoster(tid).sort((a, b) => b.ovr - a.ovr).map(p => `<label class="row small" style="cursor:pointer"><input type="checkbox" style="width:auto" data-tsel="${key}:${p.id}" ${set.has(p.id) ? 'checked' : ''}><div class="ovr" style="width:30px;height:30px;font-size:15px;background:${ovrColor(p.ovr)}">${p.ovr}</div><span class="grow">${esc(fbName(p, true))} <span class="pos">${p.pos}</span><div class="dim">age ${p.age} · ${money(p.con.amt)}</div></span></label>`).join('');
    const verdict = !T.give.size && !T.get.size ? 'Pick players from both sides.' : ev.ok ? '✅ They would accept this trade.' : !ev.capOk ? '❌ This breaks the salary cap.' : !ev.rostOk ? '❌ A roster would go over 53.' : ev.margin > -150 ? '🤏 Close: add a little more.' : '❌ They want a lot more value.';
    return seg + `<label class="dim small" for="tradeTeam">Trade with</label><select id="tradeTeam">${L.teams.filter(t => t.id !== L.user).map(t => `<option value="${t.id}" ${t.id === T.tid ? 'selected' : ''}>${fbTeamName(t)} (${t.w}-${t.l})</option>`).join('')}</select>
      <div class="card" style="margin-top:10px;display:flex;align-items:center;gap:10px"><span class="grow ${ev.ok ? 'good' : ''}">${verdict}</span><button class="btn sm" id="proposeTrade" ${ev.ok && (T.give.size || T.get.size) ? '' : 'disabled'}>Propose</button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><h3>You give</h3><div class="card" style="padding:2px 8px;max-height:420px;overflow:auto">${side(L.user, T.give, 'give')}</div></div><div><h3>You get</h3><div class="card" style="padding:2px 8px;max-height:420px;overflow:auto">${side(T.tid, T.get, 'get')}</div></div></div>`;
  }
  // draft
  const D = L.draft;
  if(D && D.active){ const onClock = D.onClock === L.user, pool = L.players.filter(p => p.tid === -2).sort((a, b) => (fbProspectRange(b)[0] + fbProspectRange(b)[1]) / 2 + b.ovr * .4 - (fbProspectRange(a)[0] + fbProspectRange(a)[1]) / 2 - a.ovr * .4).slice(0, 60);
    const myPicks = D.picks.filter(p => p.tid === L.user);
    return seg + `<div class="card" style="${onClock ? 'border-color:var(--gold)' : ''}"><b class="cond ${onClock ? 'gold' : ''}" style="font-size:20px">${onClock ? `🎓 YOU'RE ON THE CLOCK: pick #${D.at + 1}` : 'Draft in progress'}</b><p class="dim small">Round ${D.picks[D.at] ? D.picks[D.at].r : '-'}. Your picks: ${myPicks.map(p => `#${(p.r - 1) * 32 + p.n}${p.pid ? ' ✓' : ''}`).join(', ')}. Scouting level ${L.scout}: potential shows as a range (better scouts, narrower ranges).</p>${onClock ? '<button class="btn sm ghost" id="autoPick" style="margin-top:6px">Auto-pick best available</button>' : ''}</div>
      <div class="card" style="padding:2px 12px">${pool.map(p => { const [a, b] = fbProspectRange(p); return playerRow(p, false, onClock ? `<span class="btn sm" data-draft="${p.id}">Draft</span>` : '').replace(`Pot ${p.pot}`, `Pot ${a}–${b}`); }).join('')}</div>`; }
  const cls = L.players.filter(p => p.tid === -2).sort((a, b) => fbProspectRange(b)[1] - fbProspectRange(a)[1]).slice(0, 30);
  const done = D && !D.active ? `<h3>${D.y} draft: your picks</h3><div class="card" style="padding:2px 12px">${D.picks.filter(p => p.tid === L.user && p.pid).map(pk => { const p = fbPlayer(pk.pid); return p ? playerRow(p, false, `<span class="small dim">#${(pk.r - 1) * 32 + pk.n}</span>`) : ''; }).join('')}</div>` : '';
  return seg + `<div class="card"><b class="cond" style="font-size:18px">${L.draftYear} Draft class</b><p class="dim small">The draft happens in late April (${fbNextEvent() || 'soon'}). Potential shows as a range; better scouts narrow it.</p></div>${done}<h3>Top prospects</h3><div class="card" style="padding:2px 12px">${cls.map(p => { const [a, b] = fbProspectRange(p); return playerRow(p, false).replace(`Pot ${p.pot}`, `Pot ${a}–${b}`); }).join('')}</div>`;
}

// ---------------- football: franchise (owner tools) ----------------
function fbFranView(){ return fbCtrl() ? fbFranInner() : lockNote('football') + '<div class="ro">' + fbFranInner() + '</div>'; }
function fbFranInner(){
  const L = fb(), t = fbTeam(L.user), f = t.fin, val = SPORTS.football.teamValue(t.id), fill = fbFill(t);
  const lines = (f.last || []).map(([n, v]) => `<div class="row small"><span class="grow">${n}</span><b class="num ${v >= 0 ? 'good' : 'bad'}">${v >= 0 ? '+' : ''}${money(v)}</b></div>`).join('');
  return `<div class="card"><div style="display:flex;align-items:center;gap:10px">${helmet(t, 52)}<div class="grow"><b class="cond" style="font-size:20px">${fbTeamName(t)}</b><div class="dim small">Franchise value <b class="gold">${money(val)}</b> · ${t.titles} title${t.titles === 1 ? '' : 's'}</div></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px;text-align:center">${[['Season revenue', money(f.rev)], ['Season costs', money(f.exp)], ['Profit', money(f.rev - f.exp)]].map(([a, b]) => `<div style="background:var(--panel2);border-radius:8px;padding:6px 2px"><div class="dim small">${a}</div><b class="cond num" style="font-size:17px">${b}</b></div>`).join('')}</div></div>
    <h3>Last week's books</h3><div class="card" style="padding:2px 12px">${lines || '<p class="dim small" style="padding:8px 0">Play a week to see the books.</p>'}</div>
    <h3>Ticket prices</h3><div class="card"><div class="seg" style="margin:0 0 8px">${Object.entries(FB_TICKETS).map(([k, v]) => `<button class="${t.tix === k ? 'on' : ''}" data-tix="${k}">${v.n} $${v.price}</button>`).join('')}</div><div class="small dim">Expected crowd: <b class="num" style="color:var(--text)">${Math.round(t.stad.cap * 1000 * fill).toLocaleString()}</b> (${Math.round(fill * 100)}% full). Winning and fan hype fill seats; cheaper tickets fill more but earn less per fan.</div></div>
    <h3>Stadium</h3><div class="card"><div class="row" style="border:0"><span class="grow">${t.stad.cap},000 seats · luxury level ${t.stad.lvl}</span><button class="btn sm" id="upStad" ${S.cash < FB_STADIUM_UP(t.stad.lvl) ? 'disabled' : ''}>Expand · ${money(FB_STADIUM_UP(t.stad.lvl))}</button></div><p class="dim small">+5,000 seats and more luxury boxes: bigger gates every home game.</p></div>
    <h3>Head coach</h3><div class="card"><div class="row" style="border:0"><div class="ovr" style="background:${ovrColor(t.coach.r)}">${t.coach.r}</div><span class="grow"><b>${t.coach.name}</b><div class="dim small">Better coaches add to every game and help young players develop.</div></span></div>
      ${fbCoachCandidates().map((c, i) => `<div class="row small"><div class="ovr" style="width:30px;height:30px;font-size:15px;background:${ovrColor(c.r)}">${c.r}</div><span class="grow">${c.name}</span><button class="btn ghost sm" data-hire="${i}" ${S.cash < c.fee || c.r <= t.coach.r ? 'disabled' : ''}>Hire · ${money(c.fee)}</button></div>`).join('')}</div>
    <h3>Scouting</h3><div class="card"><div class="row" style="border:0"><span class="grow">Level ${L.scout} of 5 <div class="dim small">Sharper draft potential ranges.</div></span><button class="btn sm" id="upScout" ${L.scout >= 5 || S.cash < 15 * L.scout ? 'disabled' : ''}>${L.scout >= 5 ? 'Maxed' : `Upgrade · ${money(15 * L.scout)}`}</button></div></div>
    ${f.hist.length ? `<h3>Past seasons</h3><div class="card"><table><tr><th>Season</th><th>Revenue</th><th>Costs</th><th>Profit</th></tr>${f.hist.map(h => `<tr><td>${h.y}</td><td>${money(h.rev)}</td><td>${money(h.exp)}</td><td class="${h.rev - h.exp >= 0 ? 'good' : 'bad'}">${money(h.rev - h.exp)}</td></tr>`).join('')}</table></div>` : ''}`;
}

// ---------------- football: history ----------------
function fbHistView(){
  const L = fb(), m = VIEW.sub.hist, u = fbTeam(L.user);
  const seg = `<div class="seg">${[['champs', 'Champions'], ['awards', 'Awards'], ['mine', 'Your seasons'], ['records', 'Records'], ['hof', 'Hall of Fame']].map(([k, n]) => `<button class="${m === k ? 'on' : ''}" data-sub="hist:${k}">${n}</button>`).join('')}</div>`;
  const none = '<p class="dim small" style="padding:8px 0">Nothing yet. Play a season!</p>';
  if(m === 'awards') return seg + `<div class="card" style="padding:2px 12px">${L.hist.awards.map(a => `<div class="row small"><b class="num" style="width:40px">${a.y}</b><div class="grow">${[['mvp', 'MVP'], ['opoy', 'Off. Player'], ['dpoy', 'Def. Player'], ['roy', 'Rookie']].filter(([k]) => a[k]).map(([k, n]) => `<div><span class="dim">${n}:</span> <b class="${a[k].tid === L.user ? 'gold' : ''}">${a[k].n}</b> <span class="dim">${a[k].pos}, ${a[k].abbr}</span></div>`).join('')}</div></div>`).join('') || none}</div>`;
  if(m === 'mine') return seg + `<div class="card"><table><tr><th>Season</th><th>Record</th><th>PF</th><th>PA</th><th>Result</th></tr>${u.seasons.map(s => `<tr><td>${s.y}</td><td>${s.w}-${s.l}${s.t ? '-' + s.t : ''}</td><td>${s.pf}</td><td>${s.pa}</td><td class="${s.po === 'Champions' ? 'gold' : ''}">${s.po === 'made' ? 'Playoffs' : s.po ? (s.po === 'Champions' ? '🏆 Champions' : `Lost: ${s.po}`) : 'Missed playoffs'}</td></tr>`).join('')}</table>${u.seasons.length ? '' : none}</div>`;
  if(m === 'records') return seg + `<div class="card" style="padding:2px 12px">${Object.values(L.hist.records).map(r => `<div class="row small"><span class="grow"><span class="dim">${r.lab}</span><div><b>${r.n}</b> <span class="dim">${r.abbr}, ${r.y}</span></div></span><b class="cond num" style="font-size:20px">${r.v}</b></div>`).join('') || none}</div>`;
  if(m === 'hof'){ const hof = L.players.filter(p => p.hof).sort((a, b) => b.hof - a.hof); return seg + `<div class="card" style="padding:2px 12px">${hof.map(p => `<button class="row small" style="width:100%;text-align:left" data-player="${p.id}">🏛️ <span class="grow"><b>${esc(fbName(p))}</b> <span class="pos">${p.pos}</span><div class="dim">Class of ${p.hof} · peak ${p.peak}</div></span></button>`).join('') || none}</div>`; }
  return seg + `<div class="card" style="padding:2px 12px">${L.hist.champs.map(c => `<div class="row"><b class="num" style="width:40px">${c.y}</b>${helmet(fbTeam(c.tid), 30)}<span class="grow ${c.tid === L.user ? 'gold' : ''}"><b>${c.name}</b><div class="dim small">${c.rec} · beat ${c.runner}</div></span></div>`).join('') || none}</div>`;
}


// ---------------- module UI hooks ----------------
Object.assign(SPORTS.football, {
  team(tid){ return fbTeam(tid); },
  tabs(){ return [['home', 'Home'], ['roster', 'Roster'], ['games', 'Games'], ['stand', 'Standings'], ['stats', 'Stats'], ['moves', 'Moves' + (fbCtrl() && movesAlert() ? ' •' : '')], ['fran', 'Franchise'], ['hist', 'History']]; },
  view(tab){ return ({home:fbHome, roster:fbRosterView, games:fbGamesView, stand:fbStandView, stats:fbStatsView, moves:fbMovesView, fran:fbFranView, hist:fbHistView}[tab] || fbHome)(); },
  act(){ const L = fb(), wk = L.wk, g = fbUserGame();
    if(wk < 0) return `▶ Kick off the ${L.season} season`;
    if(wk <= 16) return `▶ Play week ${wk + 1}`;
    if(wk <= 20) return g ? `▶ ${FB_ROUND_NAMES[wk]}` : `▶ Watch the ${FB_ROUND_NAMES[wk]}`;
    const next = fbNextEvent(); return `▶ Next week${next ? ` · ${next}` : ''}`; },
  async playUser(mode){ const L = fb(), g = fbUserGame();
    if(g && !g.s){ const watch = mode === 'watch' || (mode !== 'sim' && S.settings.watch); const res = fbPlayGame(g, watch); if(watch) await watchGame(g, res); }
    else if(L.wk === 20 && mode !== 'sim' && S.settings.watch){ const big = fbPendingGames()[0]; if(big){ const res = fbPlayGame(big, true); await watchGame(big, res); } } },
  lastLine(){ const lg = fb().lastGame; if(!lg || lg.ew !== S.week - 1) return ''; return `🏈 ${lg.us > lg.them ? 'W' : lg.us < lg.them ? 'L' : 'T'} ${lg.us}-${lg.them} ${lg.home ? 'vs' : '@'} ${fbTeam(lg.opp).abbr}`; },
  simStops(){ const w = fb().wk, L = fb(); return [...(w <= 16 ? [['po', 'Sim to the playoffs', 'Finish the regular season', () => L.wk >= 17]] : []), ...(w <= 20 ? [['end', 'Sim to the end of the season', 'Through the Grand Bowl', () => L.wk >= 21]] : []), ...(w < 33 ? [['draft', 'Sim to the draft', 'Stops when you\'re on the clock', () => L.wk >= 34 || (L.draft && L.draft.active)]] : []), ['next', 'Sim to next season', 'Stops for the draft', () => L.wk === 0]]; },
  halt(){ const L = fb(); return fbCtrl() && L.wk === 26 && L.resign.length && L.ack !== L.season ? 'contracts' : null; },
  goBlock(what){ if(what === 'contracts'){ fb().ack = fb().season; go('football', 'moves', {moves:'contracts'}); toast('✍️ Decide your expiring contracts before free agency'); return; } go('football', 'moves', {moves:'draft'}); toast('🎓 Draft day: you\'re on the clock!'); },
  click(b, d){
    if(d.goto){ const [tab, sub] = d.goto.split(':'); go('football', tab, sub ? {[tab]:sub} : null); return true; }
    if(d.player){ playerModal(+d.player); return true; }
    const needCtrl = d.release || d.releaseyes || d.tradeaway || d.tradefor || b.id === 'proposeTrade' || d.resign || d.letgo || d.offer || d.sendoffer || d.draft || b.id === 'autoPick' || d.tix || b.id === 'upStad' || d.hire || b.id === 'upScout';
    if(needCtrl && !fbCtrl()){ closeModal(); toast('🔒 Own more than 50% to run the team'); return true; }
    if(d.release){ const p = fbPlayer(+d.release); modal(`<h2>Release ${esc(fbName(p))}?</h2><p class="dim">He becomes a free agent and his ${money(p.con.amt)} salary comes off your cap.</p><button class="btn wide" data-releaseyes="${p.id}" style="margin-top:12px">Release</button><button class="btn ghost wide" data-close style="margin-top:8px">Keep him</button>`); return true; }
    if(d.releaseyes){ const p = fbPlayer(+d.releaseyes); p.tid = -1; p.ask = fbSalary(p.pos, p.ovr, p.age); news(`✂️ Released ${fbName(p)} (${p.pos}).`, 'info', 'football'); closeModal(); persist(); render(); return true; }
    if(d.tradeaway || d.tradefor){ const p = fbPlayer(+(d.tradeaway || d.tradefor)); const T = VIEW.trade; if(d.tradefor){ T.tid = p.tid; T.get = new Set([p.id]); T.give = new Set(); } else { T.give = new Set([p.id]); T.get = new Set(); } closeModal(); go('football', 'moves', {moves:'trade'}); return true; }
    if(b.id === 'proposeTrade'){ const T = VIEW.trade, ev = fbTradeEval([...T.give], [...T.get], T.tid); if(!ev.ok){ toast('They turned it down'); return true; } fbDoTrade([...T.give], [...T.get], T.tid); T.give = new Set(); T.get = new Set(); persist(); toast('🔁 Trade complete!'); render(); return true; }
    if(d.resign || d.letgo){ const r = fbResign(+(d.resign || d.letgo), !!d.resign); if(r === 'cap') toast('💸 Not enough cap room'); persist(); render(); return true; }
    if(d.offer){ const p = fbPlayer(+d.offer), ask = Math.round(p.ask / fbFreeAgentInterest(p) * 10) / 10;
      modal(`<h2>Offer ${esc(fbName(p))}</h2><p class="dim">${p.pos} · ${p.ovr} OVR · age ${p.age}. He's asking about <b>${money(ask)}</b> a year from you.</p>
        <label class="small dim" for="offAmt" style="display:block;margin-top:10px">Salary per year ($M)</label><input id="offAmt" type="number" step="0.1" min="0.8" value="${ask}">
        <label class="small dim" for="offYrs" style="display:block;margin-top:8px">Years</label><select id="offYrs">${[1, 2, 3, 4, 5].map(y => `<option ${y === (p.age >= 30 ? 1 : 3) ? 'selected' : ''}>${y}</option>`).join('')}</select>
        <p class="small dim" style="margin-top:8px">Cap room: ${money(fbCapRoom(fb().user))}</p><button class="btn wide" data-sendoffer="${p.id}" style="margin-top:10px">Send offer</button><button class="btn ghost wide" data-close style="margin-top:8px">Cancel</button>`); return true; }
    if(d.sendoffer){ const r = fbOfferFA(+d.sendoffer, +$('offAmt').value, +$('offYrs').value); const msg = {ok:'✍️ Signed!', low:'He wants more money', cap:'💸 Not enough cap room', roster:'Roster is full (53)', gone:'He already signed elsewhere'}[r]; toast(msg); if(r === 'ok'){ closeModal(); persist(); render(); } return true; }
    if(d.draft){ fbDraftPick(+d.draft); fbDraftAdvance(); persist(); render(); return true; }
    if(b.id === 'autoPick'){ const L = fb(), pool = L.players.filter(p => p.tid === -2).sort((a, b) => fbDraftValue(b, L.user) - fbDraftValue(a, L.user)); fbDraftPick(pool[0].id); fbDraftAdvance(); persist(); render(); return true; }
    if(d.tix){ fbTeam(fb().user).tix = d.tix; persist(); render(); return true; }
    if(b.id === 'upStad'){ if(fbUpgradeStadium()){ persist(); render(); toast('🏟️ Stadium expanded!'); } else toast('💸 Not enough cash'); return true; }
    if(d.hire){ if(fbHireCoach(+d.hire)){ persist(); render(); toast('📋 New head coach hired'); } else toast('💸 Not enough cash'); return true; }
    if(b.id === 'upScout'){ const L = fb(), c = 15 * L.scout; if(S.cash >= c && L.scout < 5){ S.cash -= c; book('🏟️ Team upgrades', -c); L.scout++; persist(); render(); toast('🔭 Scouting upgraded'); } return true; }
    if(d.fapos){ VIEW.faPos = d.fapos; render(); return true; }
    return false;
  },
  change(t){
    if(t.id === 'tradeTeam'){ VIEW.trade = {tid:+t.value, give:new Set(), get:new Set()}; render(); return true; }
    if(t.dataset.tsel){ const [k, id] = t.dataset.tsel.split(':'); const set = VIEW.trade[k]; t.checked ? set.add(+id) : set.delete(+id); render(); return true; }
    return false;
  },
});
const movesAlert = () => { const L = fb(); return (L.resign && L.resign.length) || (L.draft && L.draft.active && L.draft.onClock === L.user); };
