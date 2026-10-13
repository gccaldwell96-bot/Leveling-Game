'use strict';
// =====================================================================================
//  Franchise Empire shell: start screen, navigation, the stake market, play/sim flow.
//  Each sport module draws its own tabs; the empire screens live in empireui.js.
// =====================================================================================
let VIEW = {sport:'empire', tabs:{}, sub:{moves:'contracts', stand:'div', stats:'leaders', hist:'champs', empire:'overview'}, trade:{tid:null, give:new Set(), get:new Set()}, faPos:'ALL'};
let BUSY = false;
const curTab = sp => VIEW.tabs[sp] || 'home';
function go(sp, tab, sub){ VIEW.sport = sp; if(tab) VIEW.tabs[sp] = tab; if(sub) Object.assign(VIEW.sub, sub); render(); window.scrollTo(0, 0); }
const seg = (key, opts) => `<div class="seg">${opts.map(([k, n]) => `<button class="${VIEW.sub[key] === k ? 'on' : ''}" data-sub="${key}:${k}">${n}</button>`).join('')}</div>`;
const statBox = (items, cols) => `<div style="display:grid;grid-template-columns:repeat(${cols || items.length},1fr);gap:6px;text-align:center">${items.map(([a, b, cls]) => `<div style="background:var(--panel2);border-radius:8px;padding:6px 2px"><div class="dim small">${a}</div><b class="cond num ${cls || ''}" style="font-size:18px">${b}</b></div>`).join('')}</div>`;
const newsList = (sp, n = 10) => { const nws = S.news.filter(x => sp === 'all' || !x.s || x.s === sp).slice(0, n); return `<div class="card" style="padding:4px 12px">${nws.length ? nws.map(x => `<div class="row small"><span class="grow ${x.k === 'good' ? 'good' : x.k === 'bad' ? 'bad' : x.k === 'ach' ? 'gold' : ''}">${sp === 'all' && x.s ? sportMeta(x.s).icon + ' ' : ''}${esc(x.t)}</span><span class="dim num" style="flex:none">${weekDate(x.w)}</span></div>`).join('') : '<p class="dim small" style="padding:8px 0">No news yet.</p>'}</div>`; };
const ready = id => !!(SPORTS[id] && SPORTS[id].tabs);
function lockNote(sp){ const o = own(sp); return `<div class="card" style="border-color:var(--blue)"><b class="cond" style="font-size:17px">🔒 Minority owner · ${o ? o.stake : 0}%</b><p class="small dim">The team's front office makes these calls. Own more than 50% to run the team yourself.</p><button class="btn sm ghost" data-gotab="${sp}:own" style="margin-top:6px">Ownership</button></div>`; }

// ---------------- boot & start ----------------
async function boot(){
  const o = await loadSave();
  if(o){ S = o; afterLoad(); VIEW.sport = S.owned[0] ? S.owned[0].sport : 'empire'; render(); return; }
  startScreen();
}
function startScreen(){
  $('act').hidden = true;
  $('app').innerHTML = `<div style="padding:40px 4px 20px;text-align:center">
    <div class="cond gold" style="font-size:15px;letter-spacing:.3em;font-weight:700">OWN THE GAME</div>
    <h1 class="cond" style="font-size:52px;line-height:.95;font-weight:800;text-transform:uppercase;margin:6px 0 10px">Franchise<br>Empire</h1>
    <p class="dim" style="max-width:36ch;margin:0 auto 18px">Start with ${money(START_CASH)} and a minority stake. Buy out your partners, take control, win titles, and build an empire across ten sports.</p>
    <div style="display:flex;justify-content:center;gap:6px;flex-wrap:wrap;font-size:24px;margin-bottom:22px">${SPORT_LIST.map(s => `<span title="${s.n}">${s.icon}</span>`).join('')}</div>
    <label class="dim small" for="ownerName" style="display:block;text-align:left;margin-bottom:4px">Your name (as owner)</label>
    <input id="ownerName" maxlength="24" placeholder="e.g. Jordan Reyes" autocomplete="off">
    <button class="btn wide" id="startBtn" style="margin-top:12px">Start your empire ▶</button>
    <button class="btn ghost wide" id="importBtn" style="margin-top:8px">Load a save code</button></div>`;
}

// ---------------- render ----------------
function render(){
  if(!S){ startScreen(); return; }
  const sp = VIEW.sport;
  const top = `<div id="top"><div class="brand">${esc(S.owner)}'s Empire</div><span class="chip gold num" title="Cash">${money(S.cash)}</span><span class="chip num">${weekDate(S.week)}, ${yearOf(S.week)}</span></div>`;
  const sports = `<div id="sports"><button class="sp ${sp === 'empire' ? 'on' : ''}" data-sport="empire">🏛️ Empire</button>${SPORT_LIST.map(s => { const o = own(s.id); return `<button class="sp ${sp === s.id ? 'on' : ''} ${ready(s.id) ? '' : 'lock'}" data-sport="${s.id}">${s.icon} ${s.n.split(' ')[0]}${o ? ` <span class="num" style="opacity:.8">${o.stake}%</span>` : ready(s.id) ? '' : ' 🔒'}</button>`; }).join('')}</div>`;
  let tabs = '', body = '';
  if(sp === 'empire'){ body = empireView(); }
  else if(!ready(sp)) body = lockedSport(sp);
  else { league(sp); const M = SPORTS[sp];
    if(!own(sp)) body = marketView(sp);
    else { const T = [...M.tabs(), ['own', 'Ownership']], tab = T.some(t => t[0] === curTab(sp)) ? curTab(sp) : T[0][0];
      tabs = `<div id="tabs">${T.map(([k, n]) => `<button class="tab ${tab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>`;
      body = tab === 'own' ? ownershipView(sp) : M.view(tab); } }
  $('app').innerHTML = top + sports + tabs + `<div id="body">${body}</div>`;
  const on = document.querySelector('.sp.on'); if(on) on.scrollIntoView({block:'nearest', inline:'nearest'});
  renderAct();
}
function renderAct(){
  const sp = VIEW.sport, M = SPORTS[sp], blk = blockedBy();
  let label = '▶ Next week';
  if(blk) label = blk.what === 'draft' ? '🎓 You\'re on the clock' : '⏸ Decision needed';
  else if(M && own(sp) && M.act) label = M.act();
  $('act').hidden = false;
  $('actIn').innerHTML = `<button class="btn ghost" id="simBtn">⏩ Sim</button><button class="btn" id="playBtn">${label}</button>`;
}
function lockedSport(id){ const s = sportMeta(id); return `<div class="card" style="text-align:center;padding:30px 16px"><div style="font-size:54px">${s.icon}</div><h2>${s.league}</h2><p class="dim">${s.n} · season ${s.season}</p><p class="small" style="margin:10px 0">Franchises worth <b class="gold">${money(s.price[0])}</b> to <b class="gold">${money(s.price[1])}</b>.</p><span class="tag" style="background:var(--panel2);color:var(--gold);font-size:14px">Opening soon</span><p class="dim small" style="margin-top:12px">This league is still being built. Keep growing your fortune so you can buy in on day one.</p></div>`; }

// ---------------- the stake market (a league you don't own any of yet) ----------------
function marketView(sp){
  const M = SPORTS[sp], meta = sportMeta(sp), teams = M.teams().map(t => ({...t, v:M.teamValue(t.id)})).sort((a, b) => b.v - a.v);
  return `<div class="card"><div style="display:flex;gap:10px;align-items:center"><span style="font-size:40px">${meta.icon}</span><div class="grow"><b class="cond" style="font-size:22px">${meta.league}</b><div class="dim small">${meta.n} · season ${meta.season}</div></div></div>
      <p class="small" style="margin-top:8px">Buy up to <b>${FIRST_STAKE_MAX}%</b> of one team to start. Partners sell more over time (up to ${QUARTER_LIMIT}% a quarter, plus special offers). Go over <b>50%</b> and you run the team. You can only hold shares in one team per league.</p>
      ${M.marketNote ? `<p class="small dim" style="margin-top:6px">${M.marketNote()}</p>` : ''}</div>
    <div class="card" style="padding:4px 12px">${teams.map(t => `<button class="row" style="width:100%;text-align:left" data-stake="${sp}:${t.id}">${t.logo}<div class="grow"><b class="cond" style="font-size:18px">${esc(t.name)}</b><div class="dim small">${t.sub}</div></div><div style="text-align:right">${t.ovr != null ? `<div class="ovr" style="background:${ovrColor(t.ovr + 8)};margin-left:auto">${t.ovr}</div>` : ''}<div class="num small gold">${money(t.v)}</div><div class="dim" style="font-size:11px">5% · ${money(stakeCost(sp, t.id, 0, 5))}</div></div></button>`).join('')}</div>`;
}
function stakeModal(sp, tid){
  const M = SPORTS[sp], o = own(sp);
  if(o && o.tid !== tid){ modal(`<h2>One team per league</h2><p class="dim">You hold ${o.stake}% of the ${esc(M.teamName(o.tid))}. League rules don't allow shares in two teams; sell that stake first.</p><button class="btn wide" data-close style="margin-top:12px">OK</button>`); return; }
  const cur = o ? o.stake : 0, max = o ? canBuyMore(o) : FIRST_STAKE_MAX, v = M.teamValue(tid);
  if(max <= 0){ modal(`<h2>No shares for sale right now</h2><p class="dim">${o.stake >= 100 ? 'You already own the whole team.' : `Your partners sell up to ${QUARTER_LIMIT}% a quarter and you've used this quarter's window. The next window opens ${weekDate((quarter() + 1) * 13)}. Watch for partner offers too.`}</p><button class="btn wide" data-close style="margin-top:12px">OK</button>`); return; }
  let def = max; while(def > 1 && stakeCost(sp, tid, cur, cur + def) > S.cash) def--; // start the slider at the most you can afford
  modal(`<div style="text-align:center">${M.logo(tid, 80)}<h2 style="margin-top:6px">${esc(M.teamName(tid))}</h2><p class="dim small">Team value <b class="gold">${money(v)}</b>${cur ? ` · you own ${cur}%` : ''}</p></div>
    <label class="small dim" for="stakePct" style="display:block;margin-top:12px">Buy <b id="stakePctL" class="gold">${def}%</b> ${o ? `(up to ${max}% now)` : `(up to ${max}% to start)`}</label>
    <input id="stakePct" type="range" min="1" max="${max}" step="1" value="${def}" data-sp="${sp}" data-tid="${tid}" data-cur="${cur}" style="padding:0;margin:8px 0">
    <div id="stakeInfo">${stakeInfo(sp, tid, cur, def)}</div>
    <button class="btn wide" id="stakeBuy" data-sp="${sp}" data-tid="${tid}" style="margin-top:12px">Buy shares</button><button class="btn ghost wide" data-close style="margin-top:8px">Cancel</button>`);
}
function stakeInfo(sp, tid, cur, pct){ const price = stakeCost(sp, tid, cur, cur + pct), after = cur + pct;
  return `<div class="card" style="margin:0">${statBox([['Price', money(price), S.cash >= price ? 'gold' : 'bad'], ['Your stake', after + '%'], ['Role', after > 50 ? '👑 Control' : 'Partner']])}
    <p class="small dim" style="margin-top:8px">Cash ${money(S.cash)} → <b class="${S.cash - price < 0 ? 'bad' : ''}">${money(S.cash - price)}</b>.${after > 50 && cur <= 50 ? ' Shares above 50% carry a 25% control premium.' : ''} You get ${after}% of the team's profits (and losses) every week.</p></div>`; }
function sellModal(sp){ const o = own(sp), M = SPORTS[sp];
  modal(`<h2>Sell shares</h2><p class="dim small">You own ${o.stake}% of the ${esc(M.teamName(o.tid))}. Buyers pay a little under value.</p>
    <label class="small dim" for="sellPct" style="display:block;margin-top:10px">Sell <b id="sellPctL" class="gold">5%</b></label><input id="sellPct" type="range" min="1" max="${o.stake}" step="1" value="${Math.min(5, o.stake)}" data-sp="${sp}" style="padding:0;margin:8px 0">
    <div id="sellInfo">${sellInfo(sp, Math.min(5, o.stake))}</div><button class="btn wide" id="sellGo" data-sp="${sp}" style="margin-top:12px">Sell</button><button class="btn ghost wide" data-close style="margin-top:8px">Cancel</button>`); }
function sellInfo(sp, pct){ const o = own(sp), got = stakeSale(sp, o.tid, o.stake, o.stake - pct); return `<p class="small">You get <b class="gold">${money(got)}</b> and keep <b>${o.stake - pct}%</b>${o.stake > 50 && o.stake - pct <= 50 ? ' <span class="bad">(you lose control)</span>' : ''}.</p>`; }

// ---------------- ownership tab (every sport) ----------------
function ownershipView(sp){
  const o = own(sp), M = SPORTS[sp], t = M.team(o.tid), v = M.teamValue(o.tid), sv = stakeValue(o), ctrl = o.stake > 50;
  const offers = (S.offers || []).filter(f => f.sport === sp);
  const yr = Object.entries(S.money.lines).filter(([k]) => k.startsWith(sportMeta(sp).icon)).reduce((a, [, x]) => a + x, 0);
  const bar = `<div style="position:relative;height:14px;background:var(--panel2);border-radius:9px;overflow:hidden;margin:10px 0 4px"><i style="position:absolute;left:0;top:0;bottom:0;width:${o.stake}%;background:${ctrl ? 'var(--gold)' : 'var(--blue)'}"></i><i style="position:absolute;left:50%;top:0;bottom:0;width:2px;background:#fff8"></i></div><div class="small dim" style="display:flex;justify-content:space-between"><span>0%</span><span>50% = control</span><span>100%</span></div>`;
  const facs = FACILITIES.map(f => { const l = facOf(t, f.k), c = facCost(sp, l); return `<div class="row"><span style="font-size:22px">${f.icon}</span><span class="grow"><b>${f.n}</b> <span class="dim small">level ${l}/3</span><div class="dim small">${f.d}</div></span><button class="btn sm ${ctrl ? '' : 'ghost'}" data-fac="${sp}:${f.k}" ${!ctrl || l >= 3 || S.cash < c ? 'disabled' : ''}>${l >= 3 ? 'Maxed' : money(c)}</button></div>`; }).join('');
  return `<div class="card"><div style="display:flex;align-items:center;gap:10px">${M.logo(o.tid, 52)}<div class="grow"><b class="cond" style="font-size:20px">${esc(M.teamName(o.tid))}</b><div class="dim small">${ctrl ? '👑 Majority owner: you run the team' : `Minority partner: ${o.stake > 0 ? `${Math.max(1, 51 - o.stake)}% more for control` : ''}`}</div></div><b class="cond num" style="font-size:30px">${o.stake}%</b></div>${bar}
      <div style="margin-top:10px">${statBox([['Team value', money(v)], ['Your shares', money(sv), 'gold'], ['Your profit ' + yearOf(S.week), money(yr), yr >= 0 ? 'good' : 'bad']])}</div>
      <div style="display:flex;gap:8px;margin-top:10px"><button class="btn wide" data-stake="${sp}:${o.tid}" ${o.stake >= 100 ? 'disabled' : ''}>Buy shares${canBuyMore(o) ? ` (up to ${canBuyMore(o)}%)` : ''}</button><button class="btn ghost" data-sellstake="${sp}">Sell</button></div>
      <p class="small dim" style="margin-top:8px">Partners sell up to ${QUARTER_LIMIT}% a quarter${canBuyMore(o) ? '' : ` · next window ${weekDate((quarter() + 1) * 13)}`}. Shares above 50% cost 25% more. Fame brings more (and cheaper) partner offers.</p></div>
    ${offers.length ? `<h3>Partner offers</h3>${offers.map(f => `<div class="card" style="border-color:var(--gold)"><div class="row" style="border:0"><span class="grow"><b>${esc(f.who)}</b> will sell <b>${f.pct}%</b> for <b class="gold">${money(f.price)}</b><div class="dim small">Expires ${weekDate(f.exp)} · doesn't use your quarterly limit</div></span><button class="btn sm" data-offerid="${f.id}" ${S.cash < f.price ? 'disabled' : ''}>Accept</button></div></div>`).join('')}` : ''}
    <h3>Team facilities</h3><div class="card" style="padding:2px 12px">${facs}${ctrl ? '' : '<p class="small dim" style="padding:8px 0">Only the controlling owner can build.</p>'}</div>`;
}

// ---------------- play & sim ----------------
function weekTicker(){ const lines = S.owned.map(o => SPORTS[o.sport] && SPORTS[o.sport].lastLine ? SPORTS[o.sport].lastLine() : '').filter(Boolean); return lines.length ? lines.join(' · ') : ''; }
async function playWeek(mode){
  if(BUSY) return; const blk = blockedBy(); if(blk){ SPORTS[blk.sport].goBlock(blk.what); return; }
  BUSY = true; holdToasts();
  try{ const sp = VIEW.sport, M = SPORTS[sp]; if(M && own(sp) && M.playUser) await M.playUser(mode); advanceWeek(); }
  finally { BUSY = false; }
  const b = blockedBy(); if(b){ releaseToasts(); SPORTS[b.sport].goBlock(b.what); return; }
  render(); window.scrollTo(0, 0); releaseToasts(weekTicker());
}
function simStops(){ const sp = VIEW.sport, M = SPORTS[sp]; return [['week', 'Sim one week', 'No watching', n => n >= 1], ['w4', 'Sim 4 weeks', 'About a month', n => n >= 4], ['w13', 'Sim 13 weeks', 'A quarter: new share window', n => n >= 13], ...(M && own(sp) && M.simStops ? M.simStops() : [])]; }
function simMenu(){ modal(`<h2>⏩ Sim ahead</h2>${simStops().map(([k, n, d]) => `<button class="btn ghost wide" style="justify-content:space-between;margin-bottom:8px" data-sim="${k}"><span>${n}</span><span class="small dim" style="text-transform:none;font-weight:600">${d}</span></button>`).join('')}<p class="small dim" style="margin-bottom:8px">Sims stop for your draft picks and contract decisions in leagues you control.</p><button class="btn wide" data-close>Cancel</button>`); }
async function simTo(k){
  closeModal(); if(BUSY) return; const st = simStops().find(x => x[0] === k); if(!st) return; BUSY = true;
  const cash0 = S.cash; let n = 0, why = null;
  try{ do {
      for(const o of S.owned){ const M = SPORTS[o.sport]; const h = M && M.halt && M.halt(n); if(h){ why = {sport:o.sport, what:h}; break; } } if(why) break;
      const r = advanceWeek(); if(r && r.blocked) break; n++; if(blockedBy() || n > 60) break; } while(!st[3](n)); }
  finally { BUSY = false; }
  const b = blockedBy() || why; if(b){ SPORTS[b.sport].goBlock(b.what); return; }
  render(); window.scrollTo(0, 0);
  const d = S.cash - cash0; toast(`⏩ Simmed ${n} week${n === 1 ? '' : 's'} · cash ${d >= 0 ? '+' : ''}${money(d)}`);
}

// ---------------- events ----------------
document.addEventListener('click', async e => {
  const b = e.target.closest('button,[data-lgp],[data-x],[data-resign],[data-letgo],[data-offer],[data-draft],[data-hire]'); if(!b) return; const d = b.dataset;
  if(b.id === 'startBtn'){ const nm = ($('ownerName').value || '').trim() || 'The Owner'; newEmpire(nm); news(`🎩 ${nm} arrives with ${money(START_CASH)} to invest. Pick a league and buy your first stake!`, 'good'); persist(); VIEW.sport = 'empire'; VIEW.sub.empire = 'overview'; render(); return; }
  if(b.id === 'importBtn'){ modal(`<h2>Load a save code</h2><textarea id="saveBox" style="width:100%;height:120px;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:8px" aria-label="Save code"></textarea><button class="btn wide" id="loadSave" style="margin-top:8px">Load</button>`); return; }
  if(d.close !== undefined){ closeModal(); return; }
  if(d.sport){ go(d.sport); return; }
  if(d.tab){ go(VIEW.sport, d.tab); return; }
  if(d.gotab){ const [sp, tab] = d.gotab.split(':'); closeModal(); go(sp, tab); return; }
  if(d.sub){ const [k, v] = d.sub.split(':'); VIEW.sub[k] = v; render(); return; }
  if(b.id === 'playBtn'){ playWeek(); return; }
  if(b.id === 'simBtn'){ simMenu(); return; }
  if(d.play){ playWeek(d.play); return; }
  if(d.sim){ simTo(d.sim); return; }
  // stakes
  if(d.stake){ const [sp, tid] = d.stake.split(':'); stakeModal(sp, +tid); return; }
  if(b.id === 'stakeBuy'){ const sp = d.sp, tid = +d.tid, pct = +$('stakePct').value, r = buyStake(sp, tid, pct); if(r === 'cash'){ toast('💸 Not enough cash (try a smaller stake or a bank loan)'); return; } if(r === 'ok'){ closeModal(); persist(); go(sp, own(sp) && own(sp).stake === pct ? 'home' : 'own'); } return; }
  if(d.sellstake){ sellModal(d.sellstake); return; }
  if(b.id === 'sellGo'){ const sp = d.sp, r = sellStake(sp, +$('sellPct').value); if(r === 'ok'){ closeModal(); persist(); go(own(sp) ? sp : 'empire'); toast('💵 Shares sold'); } return; }
  if(d.offerid){ const r = takeOffer(+d.offerid); toast(r === 'ok' ? '🤝 Deal done' : r === 'cash' ? '💸 Not enough cash' : 'That offer is gone'); persist(); render(); return; }
  if(d.fac){ const [sp, k] = d.fac.split(':'), r = upgradeFac(sp, k); toast(r === 'ok' ? '🏗️ Built!' : r === 'cash' ? '💸 Not enough cash' : r === 'ctrl' ? '🔒 Control the team first' : 'Already maxed'); persist(); render(); return; }
  // empire screens
  if(empireClick(b, d)) return;
  // the sport on screen handles the rest
  const M = SPORTS[VIEW.sport]; if(M && M.click && M.click(b, d)) return;
  if(b.id === 'copySave'){ const code = await saveCode(); try{ await navigator.clipboard.writeText(code); toast('📋 Save code copied'); }catch(err){ $('saveBox').value = code; $('saveBox').select(); toast('Select the code and copy it'); } return; }
  if(b.id === 'loadSave'){ try{ const o = await decodeSave($('saveBox').value); S = o; afterLoad(); persist(); closeModal(); VIEW.sport = 'empire'; render(); toast('📥 Save loaded'); }catch(err){ toast('That isn\'t a valid save code'); } return; }
  if(b.id === 'wipe'){ modal(`<h2>Start a new empire?</h2><p class="dim">This erases your current empire on this device.</p><button class="btn wide" id="wipeYes" style="margin-top:12px">Erase and start over</button><button class="btn ghost wide" data-close style="margin-top:8px">Cancel</button>`); return; }
  if(b.id === 'wipeYes'){ clearTimeout(SAVE_T); localStorage.removeItem(SAVE_KEY); S = null; closeModal(); VIEW = {...VIEW, sport:'empire', tabs:{}}; startScreen(); return; }
});
document.addEventListener('input', e => {
  const t = e.target;
  if(t.id === 'stakePct'){ const pct = +t.value; $('stakePctL').textContent = pct + '%'; $('stakeInfo').innerHTML = stakeInfo(t.dataset.sp, +t.dataset.tid, +t.dataset.cur, pct); }
  if(t.id === 'sellPct'){ const pct = +t.value; $('sellPctL').textContent = pct + '%'; $('sellInfo').innerHTML = sellInfo(t.dataset.sp, pct); }
});
document.addEventListener('change', e => { const M = SPORTS[VIEW.sport]; if(M && M.change) M.change(e.target); });
$('modal').addEventListener('click', e => { if(e.target.id === 'modal') closeModal(); });
addEventListener('pagehide', () => { if(S) persistNow(); });
boot();
if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
