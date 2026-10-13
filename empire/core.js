'use strict';
// =====================================================================================
//  FRANCHISE EMPIRE: core engine (owner, money, calendar, saves, achievements, helpers)
//  Each sport is a module registered in SPORTS; the core only knows the shared parts.
// =====================================================================================
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function gauss(){ let u = 0, v = 0; while(!u) u = Math.random(); while(!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const wait = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));
// money is kept in millions of dollars
function money(m){ const n = Math.abs(m), s = m < 0 ? '-' : ''; if(n >= 1000) return `${s}$${(n / 1000).toFixed(n >= 10000 ? 1 : 2)}B`; if(n >= 1) return `${s}$${n.toFixed(n >= 100 ? 0 : 1)}M`; return `${s}$${Math.round(n * 1000)}K`; }
const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// the empire calendar runs in weeks; week 0 = first week of January
const weekDate = w => { const d = new Date(2026, 0, 1 + 7 * (w % 52)); return `${MONTHS[d.getMonth()]} ${d.getDate()}`; };
const yearOf = w => 2026 + Math.floor(w / 52);

// ---------------- names (shared by every sport) ----------------
const FIRST = 'James John Robert Michael William David Richard Joseph Thomas Chris Daniel Matthew Anthony Mark Donald Steven Paul Andrew Joshua Kenneth Kevin Brian George Timothy Ronald Jason Edward Jeffrey Ryan Jacob Gary Nicholas Eric Jonathan Stephen Larry Justin Scott Brandon Benjamin Samuel Gregory Alexander Patrick Frank Raymond Jack Dennis Jerry Tyler Aaron Jose Adam Nathan Henry Zachary Douglas Peter Kyle Noah Ethan Jeremy Walter Christian Keith Roger Terry Austin Sean Gerald Carl Harold Dylan Arthur Lawrence Jordan Jesse Bryan Billy Bruce Gabriel Joe Logan Alan Juan Albert Willie Elijah Wayne Randy Mason Vincent Liam Roy Bobby Caleb Bradley Russell Lucas Malik Jamal Darius Andre Marcus Terrell DeShawn Isaiah Trevon Jalen Xavier Cameron Desmond Lamar Tyrone Dante Kendrick Reggie Darnell Javon Elliot Mateo Diego Luis Carlos Miguel Rafael Kai Hiro Kenji Ivan Dmitri Nikolai Lukas Felix Oskar Emil Leon Jonas Aiden Rowan Silas Jasper Beckett Colt Bo Tucker Hunter Wyatt Cooper Grady Jett Knox Zane Rhett Brooks Kade Tate Cash Ty'.split(' ');
const LAST = 'Smith Johnson Williams Brown Jones Garcia Miller Davis Rodriguez Martinez Hernandez Lopez Gonzalez Wilson Anderson Thomas Taylor Moore Jackson Martin Lee Perez Thompson White Harris Sanchez Clark Ramirez Lewis Robinson Walker Young Allen King Wright Scott Torres Nguyen Hill Flores Green Adams Nelson Baker Hall Rivera Campbell Mitchell Carter Roberts Gomez Phillips Evans Turner Diaz Parker Cruz Edwards Collins Reyes Stewart Morris Morales Murphy Cook Rogers Gutierrez Ortiz Morgan Cooper Peterson Bailey Reed Kelly Howard Ramos Kim Cox Ward Richardson Watson Brooks Chavez Wood James Bennett Gray Mendoza Ruiz Hughes Price Alvarez Castillo Sanders Patel Myers Long Ross Foster Jimenez Powell Jenkins Perry Russell Sullivan Bell Coleman Butler Henderson Barnes Fisher Vasquez Simmons Graham Jordan Reynolds Hamilton Ford Gibson Ellis Harrison Fleming Washington Freeman Wallace Webb Hayes Boyd Mason Kennedy Warren Dixon Burns Gordon Shaw Holmes Rice Hunt Black Daniels Palmer Mills Grant Knight Ferguson Stone Hawkins Dunn Perkins Hudson Spencer Stephens Pierce Lawson Wells Banks Okafor Adeyemi Mbappe Silva Santos Okoye Nakamura Tanaka Petrov Ivanov Kowalski Novak Larsen Berg Lindqvist Moreau Dubois Rossi Bianchi Muller Schmidt Fischer Weber Becker'.split(' ');
const personName = () => `${pick(FIRST)} ${pick(LAST)}`;

// ---------------- the sports (modules register themselves; all ten are listed so the empire map is complete) ----------------
const SPORT_LIST = [
  {id:'football', icon:'🏈', n:'Football', league:'Gridiron League', season:'Sep – Feb', price:[1800, 4200], ready:true},
  {id:'basketball', icon:'🏀', n:'Basketball', league:'Pro Hoops League', season:'Oct – Jun', price:[1500, 3600]},
  {id:'baseball', icon:'⚾', n:'Baseball', league:'Diamond League', season:'Apr – Oct', price:[1100, 2800]},
  {id:'soccer', icon:'⚽', n:'Soccer', league:'Premier Football Union', season:'Aug – May', price:[500, 2600]},
  {id:'hockey', icon:'🏒', n:'Hockey', league:'Ice Hockey League', season:'Oct – Jun', price:[600, 1500]},
  {id:'rugby', icon:'🏉', n:'Rugby', league:'Rugby Super Series', season:'Feb – Jul', price:[90, 260]},
  {id:'f1', icon:'🏎️', n:'Formula racing', league:'Grand Prix Championship', season:'Mar – Dec', price:[900, 2200]},
  {id:'nascar', icon:'🏁', n:'Stock car racing', league:'Stock Car Cup', season:'Feb – Nov', price:[150, 450]},
  {id:'mma', icon:'🥊', n:'MMA', league:'Fighting Championship', season:'All year', price:[120, 380]},
  {id:'esports', icon:'🎮', n:'Esports', league:'Arena Esports League', season:'Jan – Nov', price:[30, 140]},
];
const SPORTS = {}; // id -> module: {init(state), weekly(state, sw), panels, ...}
const sportMeta = id => SPORT_LIST.find(s => s.id === id);

// ---------------- state ----------------
const SAVE_KEY = 'franchise-empire-v1';
let S = null;
function newEmpire(ownerName){
  S = {v:1, owner:ownerName || 'You', week:35, cash:0, fame:0, legacy:0, worth:0, sports:{}, owned:[], ach:{}, achT:{}, trophies:[], news:[], log:[], nextId:1, settings:{watch:true, speed:1}};
  for(const sp of SPORT_LIST) if(SPORTS[sp.id]) SPORTS[sp.id].init(S);
  return S;
}
const uid = () => S.nextId++;
function persist(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch(e){ console.warn('save failed', e); } }
function loadSave(){ try{ const raw = localStorage.getItem(SAVE_KEY); if(!raw) return null; const o = JSON.parse(raw); return o && o.v ? o : null; }catch(e){ return null; } }
async function saveCode(){
  const bytes = new TextEncoder().encode(JSON.stringify(S));
  let out = bytes, tag = 'FE1:';
  if(window.CompressionStream){ try{ out = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()); tag = 'FE2:'; }catch(e){ out = bytes; } }
  let bin = ''; for(let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode.apply(null, out.subarray(i, i + 0x8000));
  return tag + btoa(bin);
}
async function decodeSave(code){
  code = (code || '').trim().replace(/\s+/g, ''); let json;
  if(code.startsWith('{')) json = code;
  else { const tag = code.slice(0, 4), bytes = Uint8Array.from(atob(code.slice(4)), c => c.charCodeAt(0));
    if(tag === 'FE2:') json = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    else if(tag === 'FE1:') json = new TextDecoder().decode(bytes); else throw new Error('not a save code'); }
  const o = JSON.parse(json); if(!o || !o.v || !o.sports) throw new Error('not a save code'); return o;
}

// ---------------- news + achievements ----------------
function news(text, kind = 'info', sport){ S.news.unshift({w:S.week, t:text, k:kind, s:sport}); if(S.news.length > 120) S.news.length = 120; }
const ACH = [
  {id:'own1', n:'Owner: buy your first franchise', r:0},
  {id:'win1', n:'First win', r:5},
  {id:'winseason', n:'A winning season', r:10},
  {id:'divtitle', n:'Division champions', r:20},
  {id:'playoffwin', n:'Win a playoff game', r:25},
  {id:'confchamp', n:'Conference champions', r:50},
  {id:'title', n:'League champions', r:150},
  {id:'b2b', n:'Back-to-back champions', r:250},
  {id:'dynasty', n:'Dynasty: 3 titles in 5 seasons', r:500},
  {id:'perfect', n:'Perfect season: unbeaten, then win it all', r:1000},
  {id:'mvp', n:'One of your players wins MVP', r:40},
  {id:'hof', n:'One of your players enters the Hall of Fame', r:60},
  {id:'draftstar', n:'A player you drafted wins MVP', r:120},
  {id:'own2', n:'Two sports: own franchises in 2 sports', r:100},
  {id:'own5', n:'Five-sport empire', r:400},
  {id:'ownall', n:'Every sport: own a franchise in all ten', r:2000},
  {id:'titles2', n:'Champions in two different sports', r:400},
  {id:'grandslam', n:'Grand slam: a title in every sport you own (3+ sports)', r:1500},
  {id:'billion', n:'Billionaire: $1B cash', r:100},
  {id:'worth10', n:'Empire worth $10B', r:300},
];
function ach(id){ if(S.ach[id]) return false; const a = ACH.find(x => x.id === id); if(!a) return false; S.ach[id] = true; S.achT[id] = S.week; S.legacy += a.r; news(`🏆 Achievement: ${a.n}${a.r ? ` (+${a.r} legacy)` : ''}`, 'ach'); toast(`🏆 ${a.n}`); return true; }
function checkEmpireAch(){
  const sportsOwned = new Set(S.owned.map(o => o.sport));
  if(S.owned.length) ach('own1');
  if(sportsOwned.size >= 2) ach('own2'); if(sportsOwned.size >= 5) ach('own5'); if(sportsOwned.size >= SPORT_LIST.length) ach('ownall');
  const titleSports = new Set(S.trophies.filter(t => t.kind === 'title').map(t => t.sport));
  if(titleSports.size >= 2) ach('titles2');
  if(sportsOwned.size >= 3 && [...sportsOwned].every(s => titleSports.has(s))) ach('grandslam');
  if(S.cash >= 1000) ach('billion');
  if(empireWorth() >= 10000) ach('worth10');
}

// ---------------- owner economy ----------------
function empireWorth(){ return S.cash + S.owned.reduce((a, o) => a + (SPORTS[o.sport] ? SPORTS[o.sport].value(S, o) : 0), 0); }
function franchiseList(){ return S.owned.map(o => ({...o, meta:sportMeta(o.sport), mod:SPORTS[o.sport]})); }

// ---------------- the weekly turn ----------------
// Every sport module gets a weekly() call; the empire week then advances.
function blockedBy(){ for(const sp of SPORT_LIST){ const m = SPORTS[sp.id]; if(m && m.blocker){ const b = m.blocker(S); if(b) return {sport:sp.id, what:b}; } } return null; }
function advanceWeek(opts = {}){
  const blk = blockedBy(); if(blk) return {blocked:blk};
  const reports = [];
  for(const sp of SPORT_LIST){ const mod = SPORTS[sp.id]; if(mod) { const r = mod.weekly(S, opts); if(r) reports.push(r); } }
  S.week++;
  checkEmpireAch();
  S.worth = empireWorth();
  persist();
  return reports;
}

// ---------------- tiny UI helpers shared by modules ----------------
function toast(msg){ const t = $('toast'); if(!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 2600); }
function modal(html){ $('mbox').innerHTML = html; $('modal').hidden = false; $('mbox').scrollTop = 0; }
function closeModal(){ $('modal').hidden = true; }
// colour helpers for team colours
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lum = h => { const [r, g, b] = hex2rgb(h); return 0.299 * r + 0.587 * g + 0.114 * b; };
const textOn = h => lum(h) > 150 ? '#10131c' : '#ffffff';
