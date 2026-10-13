'use strict';
// =====================================================================================
//  OWNER ECONOMY: ownership stakes (minority → majority control), partner offers,
//  the owner shop (lifestyle assets), investments, companies, startups, bank loans, fame.
//  Every sport module exposes teamValue(tid); stakes are stored in S.owned as percents.
// =====================================================================================
const START_CASH = 1200;          // $1.2B: enough for a big minority stake, not for control
const FIRST_STAKE_MAX = 49;       // nobody sells you control on day one
const QUARTER_LIMIT = 10;         // partners sell at most 10% a quarter (plus special offers)
const CTRL_PREMIUM = 1.25;        // shares above 50% cost more: they carry control
const BUY_FEE = .02, SELL_HAIRCUT = .05;

const own = sp => S.owned.find(o => o.sport === sp) || null;
const stakeOf = sp => (own(sp) || {stake:0}).stake;
const inCtrl = sp => stakeOf(sp) > 50;
const quarter = () => Math.floor(S.week / 13);
const ownTeamValue = (sp, tid) => SPORTS[sp].teamValue(tid);
function stakeValue(o){ return ownTeamValue(o.sport, o.tid) * o.stake / 100; }
// price of moving a stake from a% to b% (b > a), control premium on the part above 50%
function stakeCost(sp, tid, a, b){ const v = ownTeamValue(sp, tid) / 100, low = Math.max(0, Math.min(b, 50) - a), high = Math.max(0, b - Math.max(a, 50)); return (low + high * CTRL_PREMIUM) * v * (1 + BUY_FEE); }
function stakeSale(sp, tid, a, b){ return stakeCost(sp, tid, b, a) / (1 + BUY_FEE) * (1 - SELL_HAIRCUT); } // selling from a% down to b%
function canBuyMore(o){ const q = quarter(); const used = o.q === q ? o.qpct : 0; return Math.max(0, Math.min(100 - o.stake, QUARTER_LIMIT - used)); }
function buyStake(sp, tid, pct, price, offer = false){
  let o = own(sp);
  if(o && o.tid !== tid) return 'league';
  price = price ?? stakeCost(sp, tid, o ? o.stake : 0, (o ? o.stake : 0) + pct);
  if(S.cash < price) return 'cash';
  const before = o ? o.stake : 0;
  if(!o){ o = {sport:sp, tid, stake:0, since:S.week, paid:0, q:quarter(), qpct:0}; S.owned.push(o); SPORTS[sp].follow(tid); }
  if(o.q !== quarter()){ o.q = quarter(); o.qpct = 0; }
  S.cash -= price; o.stake += pct; o.paid += price; if(!offer) o.qpct += pct; // partner offers don't use up the quarterly limit
  const t = SPORTS[sp].teamName(tid), meta = sportMeta(sp);
  if(before === 0) news(`🤝 ${S.owner} buys a ${pct}% stake in the ${t} for ${money(price)}.`, 'good', sp);
  else news(`📈 Bought ${pct}% more of the ${t} (now ${o.stake}%) for ${money(price)}.`, 'good', sp);
  if(before <= 50 && o.stake > 50){ news(`👑 You are now the MAJORITY OWNER of the ${t}! You run the team.`, 'good', sp); toast(`👑 You control the ${t}!`); ach('control'); }
  if(o.stake >= 100 && before < 100){ news(`💯 You own 100% of the ${t}.`, 'good', sp); ach('full'); }
  ach('own1'); checkEmpireAch(); return 'ok';
}
function sellStake(sp, pct){
  const o = own(sp); if(!o || pct <= 0 || pct > o.stake) return 'bad';
  const got = stakeSale(sp, o.tid, o.stake, o.stake - pct), t = SPORTS[sp].teamName(o.tid), was = o.stake;
  S.cash += got; o.stake -= pct; o.paid *= o.stake / was;
  if(was > 50 && o.stake <= 50) news(`You sold control of the ${t}. Their front office runs the team now.`, 'bad', sp);
  if(o.stake <= 0){ S.owned = S.owned.filter(x => x !== o); SPORTS[sp].follow(null); news(`👋 Sold your last shares of the ${t} for ${money(got)}.`, 'info', sp); }
  else news(`💵 Sold ${pct}% of the ${t} for ${money(got)} (you keep ${o.stake}%).`, 'info', sp);
  return 'ok';
}

// ---------------- partner offers: a partner wants out, at a discount, for a few weeks ----------------
function makeOffers(){
  S.offers = (S.offers || []).filter(f => f.exp > S.week && own(f.sport) && own(f.sport).tid === f.tid);
  for(const o of S.owned){ if(o.stake >= 100 || S.offers.some(f => f.sport === o.sport)) continue;
    const chance = .045 + S.fame / 9000; if(Math.random() > chance) continue;
    const pct = Math.min(100 - o.stake, pick([5, 5, 10, 10, 15, 20])), disc = rand(.8, .97) - Math.min(.06, S.fame / 6000);
    const price = Math.round(stakeCost(o.sport, o.tid, o.stake, o.stake + pct) * disc);
    S.offers.push({id:uid(), sport:o.sport, tid:o.tid, pct, price, exp:S.week + 4, who:`${personName()}`});
    news(`📨 A partner in the ${SPORTS[o.sport].teamName(o.tid)} offers you ${pct}% for ${money(price)} (${Math.round((1 - disc) * 100)}% off). 4 weeks to decide.`, 'good', o.sport);
  }
}
function takeOffer(id){ const f = (S.offers || []).find(x => x.id === id); if(!f) return 'gone'; const o = own(f.sport); if(!o) return 'gone';
  const r = buyStake(f.sport, f.tid, Math.min(f.pct, 100 - o.stake), f.price, true); if(r === 'ok') S.offers = S.offers.filter(x => x !== f); return r; }

// ---------------- the owner shop ----------------
// fame: makes partners sell more often and cheaper, brings endorsement money, and makes free agents like you
const SHOP = [
  {id:'watch', icon:'⌚', n:'Luxury watch collection', cost:3, fame:1, up:.02, d:'A case of rare timepieces.'},
  {id:'horse', icon:'🐎', n:'Champion racehorse', cost:8, fame:3, up:.4, d:'Your colours at the big races.'},
  {id:'cars', icon:'🏎️', n:'Supercar garage', cost:14, fame:4, up:.6, d:'Twelve hypercars and a private track day.'},
  {id:'pent', icon:'🏙️', n:'Skyline penthouse', cost:18, fame:5, up:.5, d:'Top two floors, 360° views.'},
  {id:'ranch', icon:'🤠', n:'Mountain ranch', cost:30, fame:5, up:.8, d:'40,000 acres and a lodge.'},
  {id:'mansion', icon:'🏡', n:'Beachfront mansion', cost:48, fame:10, up:1.5, d:'Twelve bedrooms on the ocean.'},
  {id:'space', icon:'🚀', n:'Trip to space', cost:55, fame:20, up:0, once:true, d:'Ten minutes of zero-g. Everyone will know.'},
  {id:'art', icon:'🖼️', n:'Art collection', cost:60, fame:8, up:.3, grow:.045, d:'Masterpieces that usually gain value.'},
  {id:'jet', icon:'🛩️', n:'Private jet', cost:85, fame:14, up:6, d:'Scout anywhere overnight. Free agents take your calls.'},
  {id:'chateau', icon:'🏰', n:'Château & vineyard', cost:120, fame:16, up:3, d:'Your own wine label.'},
  {id:'yacht', icon:'🛥️', n:'Superyacht', cost:230, fame:26, up:18, d:'110 metres, helipad, submarine.'},
  {id:'island', icon:'🏝️', n:'Private island', cost:360, fame:34, up:9, d:'Villas, an airstrip and total privacy.'},
];
// companies: income every week; some boost your teams
const COMPANIES = [
  {id:'bars', icon:'🍻', n:'Sports bar chain', cost:25, yld:.10, vol:.35, d:'Pays well, swings with the economy.'},
  {id:'food', icon:'🍔', n:'Burger chain', cost:45, yld:.09, vol:.25, d:'Steady fast-food money.'},
  {id:'drink', icon:'⚡', n:'Energy drink brand', cost:80, yld:.08, vol:.4, fame:5, d:'Stick the logo on everything (+5 fame).'},
  {id:'gym', icon:'🏋️', n:'Fitness clubs', cost:110, yld:.07, vol:.2, d:'Memberships pay every month.'},
  {id:'apparel', icon:'👕', n:'Sportswear brand', cost:160, yld:.06, vol:.2, boost:'merch', d:'+15% merchandise sales for every team you control.'},
  {id:'media', icon:'📺', n:'Sports media network', cost:450, yld:.05, vol:.15, boost:'tv', d:'+12% TV money for every team you control.'},
];
const STARTUP_SECTORS = ['AI', 'fintech', 'biotech', 'sports-tech', 'clean energy', 'robotics', 'space', 'gaming', 'food-tech', 'wearables'];
const STARTUP_NAMES = 'Nova Quanta Pulse Apex Vertex Helix Orbit Lumen Zephyr Kinetic Strata Prism Echo Flux Ember Atlas Cobalt Nimbus Vanta Ridge'.split(' ');

function ownerInit(){ // defaults for new saves and old ones
  S.assets = S.assets || []; S.inv = S.inv || {index:0, realty:0}; S.cos = S.cos || []; S.startups = S.startups || []; S.debt = S.debt || 0; S.offers = S.offers || [];
  S.money = S.money || {y:yearOf(S.week), lines:{}, hist:[]}; S.worthHist = S.worthHist || [];
  for(const o of S.owned){ if(o.stake == null) o.stake = 100; if(o.q == null){ o.q = quarter(); o.qpct = 0; } }
}
// track where the money comes from this year
function book(cat, amt){ const m = S.money; if(m.y !== yearOf(S.week)){ m.hist.unshift({y:m.y, lines:m.lines}); m.hist.length = Math.min(m.hist.length, 6); m.y = yearOf(S.week); m.lines = {}; } m.lines[cat] = (m.lines[cat] || 0) + amt; }
function earn(cat, amt){ S.cash += amt; book(cat, amt); }
// a sport module reports its whole team's weekly profit; you get your share
function teamProfit(sp, profit){ const o = own(sp); if(!o) return 0; const mine = profit * o.stake / 100; earn(`${sportMeta(sp).icon} ${SPORTS[sp].teamName(o.tid)} (${o.stake}%)`, mine); return mine; }
const hasCo = id => S.cos.some(c => c.id === id);
const ownerBoost = k => (k === 'tv' && hasCo('media') ? 1.12 : k === 'merch' && hasCo('apparel') ? 1.15 : 1);
const fameTotal = () => Math.round(S.fame + S.assets.reduce((a, x) => a + (SHOP.find(s => s.id === x.id) || {fame:0}).fame, 0) + S.cos.reduce((a, c) => a + (COMPANIES.find(x => x.id === c.id).fame || 0), 0));

function buyAsset(id){ const it = SHOP.find(s => s.id === id); if(!it || S.cash < it.cost) return 'cash'; if(S.assets.some(a => a.id === id)) return 'have';
  S.cash -= it.cost; book('🛍️ Purchases', -it.cost); S.assets.push({id, paid:it.cost, v:it.cost, w:S.week}); news(`${it.icon} ${S.owner} bought a ${it.n.toLowerCase()} (${money(it.cost)}).`, 'info'); ach('shop1'); if(S.assets.length >= 6) ach('shop6'); if(S.assets.some(a => a.id === 'yacht') && S.assets.some(a => a.id === 'jet') && S.assets.some(a => a.id === 'island')) ach('jetset'); return 'ok'; }
function sellAsset(id){ const a = S.assets.find(x => x.id === id), it = SHOP.find(s => s.id === id); if(!a || it.once) return 'bad'; const got = it.grow ? a.v * .95 : a.v * .7; S.cash += got; book('🛍️ Purchases', got); S.assets = S.assets.filter(x => x !== a); news(`Sold the ${it.n.toLowerCase()} for ${money(got)}.`, 'info'); return 'ok'; }
function buyCompany(id){ const c = COMPANIES.find(x => x.id === id); if(!c || S.cash < c.cost || hasCo(id)) return 'cash'; S.cash -= c.cost; book('🏢 Investments', -c.cost); S.cos.push({id, v:c.cost, w:S.week, last:0}); news(`${c.icon} ${S.owner} acquires a ${c.n.toLowerCase()} for ${money(c.cost)}.`, 'info'); ach('tycoon'); return 'ok'; }
function sellCompany(id){ const c = S.cos.find(x => x.id === id); if(!c) return 'bad'; S.cash += c.v * .95; book('🏢 Investments', c.v * .95); S.cos = S.cos.filter(x => x !== c); news(`Sold the ${COMPANIES.find(x => x.id === id).n.toLowerCase()} for ${money(c.v * .95)}.`, 'info'); return 'ok'; }
function startupPitches(){ if(!S.pitches || S.pitches.q !== quarter()) S.pitches = {q:quarter(), list:Array.from({length:3}, () => ({n:`${pick(STARTUP_NAMES)}${pick(['', 'ly', ' Labs', ' AI', 'io', ' Systems'])}`, sec:pick(STARTUP_SECTORS), cost:pick([5, 10, 10, 20, 25, 40]), risk:pick(['High', 'Very high', 'Wild'])}))}; return S.pitches.list; }
function backStartup(i){ const p = startupPitches()[i]; if(!p || S.cash < p.cost) return 'cash'; S.cash -= p.cost; book('🏢 Investments', -p.cost); S.startups.push({n:p.n, sec:p.sec, paid:p.cost, v:p.cost, w:S.week, st:'alive'}); S.pitches.list.splice(i, 1); news(`💡 You backed ${p.n} (${p.sec}) with ${money(p.cost)}.`, 'info'); return 'ok'; }
function invest(k, amt){ if(amt > 0 && S.cash < amt) return 'cash'; if(amt < 0 && S.inv[k] < -amt) amt = -S.inv[k]; S.cash -= amt; S.inv[k] += amt; book('🏢 Investments', -amt); return 'ok'; }
const assetsValue = () => S.assets.reduce((a, x) => { const it = SHOP.find(s => s.id === x.id); return a + (it.once ? 0 : it.grow ? x.v : x.v * .7); }, 0) + S.cos.reduce((a, c) => a + c.v, 0) + S.startups.filter(s => s.st === 'alive').reduce((a, s) => a + s.v, 0) + S.inv.index + S.inv.realty;
const stakesValue = () => S.owned.reduce((a, o) => a + stakeValue(o), 0);
const loanLimit = () => Math.max(0, Math.round((stakesValue() + assetsValue()) * .5 - S.debt));
function borrow(amt){ if(amt > loanLimit()) return 'limit'; S.debt += amt; S.cash += amt; news(`🏦 Borrowed ${money(amt)} from the bank.`, 'info'); return 'ok'; }
function repay(amt){ amt = Math.min(amt, S.debt); if(S.cash < amt) return 'cash'; S.debt -= amt; S.cash -= amt; news(`🏦 Repaid ${money(amt)} of your loan.`, 'info'); return 'ok'; }

// ---------------- the weekly owner tick ----------------
function ownerWeekly(){
  ownerInit();
  // lifestyle upkeep + art value
  let upkeep = 0; for(const a of S.assets){ const it = SHOP.find(s => s.id === a.id); upkeep += it.up / 52; if(it.grow) a.v *= 1 + it.grow / 52 + gauss() * .012; }
  if(upkeep) earn('🛍️ Upkeep (homes, jet, yacht…)', -upkeep);
  // investments
  if(S.inv.index > 0){ const r = .08 / 52 + gauss() * .022; S.inv.index = Math.max(0, S.inv.index * (1 + r)); }
  if(S.inv.realty > 0){ S.inv.realty *= 1 + .035 / 52 + gauss() * .004; earn('🏢 Rent from real estate', S.inv.realty * .05 / 52); }
  for(const c of S.cos){ const it = COMPANIES.find(x => x.id === c.id); const inc = c.v * it.yld / 52 * Math.max(-.5, 1 + gauss() * it.vol); c.last = inc; earn(`${it.icon} ${it.n}`, inc); c.v *= 1 + .02 / 52 + gauss() * .006; }
  if(S.week % 13 === 0) for(const s of S.startups.filter(x => x.st === 'alive')){ const r = Math.random(), age = (S.week - s.w) / 52;
    if(r < .05 + age * .02){ const x = pick([3, 5, 8, 12, 20, 40]); const got = s.v * x; s.st = 'exit'; s.out = got; earn('💡 Startup exits', got); news(`🚀 ${s.n} was acquired! Your stake pays ${money(got)} (${x}× this round).`, 'good'); if(x >= 20) ach('unicorn'); }
    else if(r < .2 + age * .03){ s.st = 'dead'; s.out = 0; news(`💀 ${s.n} ran out of money and shut down.`, 'bad'); }
    else s.v *= rand(.7, 1.6); }
  // fame pays: endorsements, appearances, books
  const fame = fameTotal(); if(fame > 0) earn('🎤 Endorsements & appearances', fame * .012);
  // interest
  if(S.debt > 0) earn('🏦 Loan interest', -S.debt * .065 / 52);
  if(S.cash < 0){ const od = -S.cash * .15 / 52; earn('🏦 Overdraft interest', -od); }
  // fame slowly fades without new wins
  S.fame *= .998;
  makeOffers();
  if(S.week % 4 === 0){ S.worthHist.push({w:S.week, v:Math.round(empireWorth())}); if(S.worthHist.length > 200) S.worthHist.shift(); }
}

// ---------------- team facilities (any sport; only the controlling owner can build) ----------------
const FACILITIES = [
  {k:'train', icon:'🏋️', n:'Training centre', d:'Players develop faster every offseason.'},
  {k:'med', icon:'🩺', n:'Sports medicine centre', d:'About 20% fewer injuries per level.'},
  {k:'fan', icon:'🎡', n:'Fan district', d:'More merchandise and fuller stands.'},
];
const facOf = (t, k) => (t.fac && t.fac[k]) || 0;
const facLevels = t => t.fac ? (t.fac.train || 0) + (t.fac.med || 0) + (t.fac.fan || 0) : 0;
const facCost = (sp, lvl) => Math.max(2, Math.round(sportMeta(sp).price[0] * .03 * (lvl + 1)));
function upgradeFac(sp, k){
  if(!inCtrl(sp)) return 'ctrl'; const M = SPORTS[sp], t = M.team(own(sp).tid); t.fac = t.fac || {train:0, med:0, fan:0};
  const lvl = t.fac[k] || 0; if(lvl >= 3) return 'max'; const c = facCost(sp, lvl); if(S.cash < c) return 'cash';
  S.cash -= c; book('🏟️ Team upgrades', -c); t.fac[k] = lvl + 1; const f = FACILITIES.find(x => x.k === k);
  news(`${f.icon} ${M.teamName(t.id)} open a level ${lvl + 1} ${f.n.toLowerCase()} (${money(c)}).`, 'good', sp); return 'ok';
}
