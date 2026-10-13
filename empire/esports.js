'use strict';
// =====================================================================================
//  ESPORTS: Arena Esports League · 10 orgs playing the 5v5 battle-arena game "Arena".
//  Each league fixture is a series (best of 3, best of 5 in the playoffs). Every map is a
//  minute-by-minute gold race: lane matchups, skirmishes and teamfights, towers, Wyrms,
//  the Titan, Gates, and finally the Core.
// =====================================================================================
const ES_POS = ['TOP', 'JNG', 'MID', 'ADC', 'SUP'], ES_LANE = ['top', 'jungle', 'mid', 'bot', 'bot'];
const ES_W = [1, 1.1, 1.2, 1.15, .85], ES_KILL = [.9, 1, 1.35, 1.55, .22], ES_DIE = [1, 1, 1, 1.15, 1.2], ES_AST = [.42, .62, .5, .45, .8];
const ES_WYRM = ['Storm', 'Ember', 'Frost', 'Stone'], ES_TIER = ['outer', 'inner', 'base'], ES_LN = {top:'top lane', mid:'mid lane', bot:'bot lane', jungle:'jungle'};
const ES_FIRST = 'Minjun Seojun Jiho Hyunwoo Taeyang Dohyun Jaewon Sungmin Wei Hao Jun Lei Zhen Bowen Yuto Haruto Ren Sota Kaito Lukas Elias Mateus Rafael Joao Pedro Lucas Mads Emil Oskar Nils Felix Leon Theo Hugo Louis Jules Noah Liam Ethan Ryan Kevin Daniel Marcus Ivan Dmitri Mikhail Andrei Tomas Jakub Kacper Mateo Diego Carlos Arjun Omar Yusuf Kai Aiden Sami Tuan Minh Erik Anton'.split(' ');
const ES_TAG = 'Aurik Bramble Calyx Dusk Embr Flint Glyph Harrow Ionix Kestrel Lumen Morrow Nimbus Onyx Pyrr Quasar Rune Sable Tempo Umbra Vanta Wisp Xeno Yarrow Zenit Brisk Coda Drift Fable Gale Haze Inkwell Jolt Kite Lark Moth Nox Orbit Pixel Quill Ripple Spark Thorn Vapor Warden Zest Axiom Bolt Dynamo Ember Fuse Grit Icarus Lynx Mako Opal Prism Slate Tundra Volt Wraith Zephyr Ardent Blink Crux Delta Eon Frost Ghost Hexa Ivo Krait Loki Mantis Nero Pulse Shade Torque Vigil Wynn Yuki Zircon Comet Dagger Flux Hydra Kairo Lyric Mirage Nyx Oath Sol Whisk Arro Basalt Cobalt Dune Equinox Fennec Gecko Heron Iris Jinto Koda Lotus Marrow Nova Orca Pike Rook Sprout Tidal Ursa Vesper Willow Yonder Zinc'.split(' ');
function esName(){ // "Given Tag": the engine shows the tag as the surname, so the sim calls players by their tag
  let used; try{ used = new Set((lg('esports') || {players:[]}).players.map(p => p.ln)); } catch(e){ used = new Set(); }
  const free = ES_TAG.filter(t => !used.has(t)); let tag = free.length ? pick(free) : pick(ES_TAG) + irand(2, 99);
  return `${pick(ES_FIRST)} ${tag}`; }
const esSig = x => 1 / (1 + Math.exp(-x));
function esSim(H, A, ctx){
  const lineup = T => { const used = new Set(); return ES_POS.map(pos => { const p = (T.pos[pos] || []).find(x => !used.has(x.id)) || T.all.find(x => !used.has(x.id)) || T.all[0]; used.add(p.id); return p; }); };
  const sd = [lineup(H), lineup(A)], T = [H.t, A.t], rec = ctx.record, log = [], box = {}, need = ctx.po ? 3 : 2, maps = [0, 0];
  const B = p => box[p.id] || (box[p.id] = {k:0, d:0, as:0, mp:0, mw:0});
  for(const s of sd) for(const p of s) B(p);
  const wsum = ES_W.reduce((a, b) => a + b, 0), base = ES_POS.reduce((a, _, r) => a + ES_W[r] * (sd[0][r].ovr - sd[1][r].ovr), 0) / wsum + (ctx.coachH - ctx.coachA) / 7;
  const wpick = (arr, w) => { const ws = arr.map(w), tot = ws.reduce((a, b) => a + b, 0); let r = Math.random() * tot; for(let i = 0; i < arr.length; i++){ r -= ws[i]; if(r <= 0) return arr[i]; } return arr[arr.length - 1]; };
  const binom = (n, p) => { let k = 0; for(let i = 0; i < n; i++) if(Math.random() < p) k++; return k; };
  const nm = p => p.ln, ab = s => T[s].abbr, LANES = ['top', 'mid', 'bot'];
  for(let map = 1; maps[0] < need && maps[1] < need; map++){
    const E = base + gauss() * 3.4; // the draft and the day's form
    let adv = 0, m = 0, fb = false, win = -1, wyrmAt = 5, titanAt = 20, soul = -1;
    const kills = [0, 0], down = [{top:0, mid:0, bot:0}, {top:0, mid:0, bot:0}], tk = [0, 0], wy = [0, 0], buff = [0, 0], elems = shuffle([...ES_WYRM]);
    const Ef = () => E + (soul < 0 ? 0 : soul ? -4 : 4) + (buff[0] > m ? 3 : 0) - (buff[1] > m ? 3 : 0);
    const push = e => { if(rec) log.push({map, min:m, sc:[...maps], kills:[...kills], gold:Math.round(adv * 10) / 10, tk:[...tk], wy:[...wy], ...e}); };
    const gold = (s, g) => { adv += s ? -g : g; };
    const gatesDown = o => LANES.filter(L => down[o][L] >= 4).length;
    const raze = (s, L) => { // s takes the next structure in lane L; returns a description or null
      const o = 1 - s, n = down[o][L]; if(n >= 4) return null; down[o][L]++; gold(s, n < 3 ? .65 : .5); if(n < 3){ tk[s]++; return {bld:{o, lane:L, tier:n}, what:`the ${L} ${ES_TIER[n]} tower`}; } return {bld:{o, lane:L, tier:3}, what:`the ${L} Gate`, gate:true}; };
    const pushLane = s => { const o = 1 - s, open = LANES.filter(L => down[o][L] < 4); if(!open.length) return null; return wpick(open, L => 1 + down[o][L] * .8); };
    const core = (s, how) => { win = s; push({type:'core', side:s, lane:'mid', txt:`${how ? how + ' ' : ''}${ab(s)} destroy the Core!`}); };
    const fight = (lane, late, pit) => {
      const w = Math.random() < esSig(Ef() * .07 + 1.15 * Math.tanh(adv / 7)) ? 0 : 1, l = 1 - w;
      const roles = late ? [0, 1, 2, 3, 4] : lane === 'top' ? [0] : lane === 'mid' ? [2] : lane === 'bot' ? [3, 4] : [1];
      const inv = [0, 1].map(() => { const r = [...roles]; if(!late){ if(!r.includes(1) && Math.random() < .55) r.push(1); if(lane === 'jungle'){ if(Math.random() < .5) r.push(2); if(Math.random() < .4) r.push(4); if(pit && Math.random() < .5) r.push(3); } else if(lane !== 'mid' && Math.random() < .2) r.push(2); } return r; });
      const kW = Math.min(inv[l].length, 1 + binom(inv[l].length - 1, late ? .45 : .28)), kL = Math.min(kW - 1, binom(inv[w].length, late ? .25 : .16));
      const dead = [[], []], multi = {}, credit = (s, n) => { const alive = inv[1 - s].map(r => r); for(let i = 0; i < n; i++){ const vr = wpick(alive, r => ES_DIE[r]); alive.splice(alive.indexOf(vr), 1); dead[1 - s].push(vr);
        const kr = wpick(inv[s], r => ES_KILL[r] * Math.max(5, sd[s][r].ovr - 35)); B(sd[s][kr]).k++; B(sd[1 - s][vr]).d++; kills[s]++; if(s === w) multi[kr] = (multi[kr] || 0) + 1;
        for(const ar of inv[s]) if(ar !== kr && Math.random() < ES_AST[ar] + (late ? .15 : 0)) B(sd[s][ar]).as++; } };
      const first = !fb; let fbK = null, fbV = null;
      if(first){ fb = true; } credit(w, kW); credit(l, kL);
      const behind = (w === 0 && adv < -2) || (w === 1 && adv > 2); gold(w, (kW - kL) * .38 + (behind ? kW * .2 : 0) + (late ? .3 : .1));
      const star = +Object.keys(multi).sort((a, b) => multi[b] - multi[a])[0], sm = multi[star] || 0, where = pit ? `at the ${pit === 'titan' ? 'Titan' : 'Wyrm'} pit` : `in the ${ES_LN[lane]}`;
      if(first){ fbK = sd[w][star]; fbV = sd[l][dead[l][0]]; }
      const mk = sm >= 5 ? `PENTA KILL for ${nm(sd[w][star])}!` : sm === 4 ? `Quadra kill for ${nm(sd[w][star])}!` : sm === 3 ? `Triple kill for ${nm(sd[w][star])}!` : sm === 2 && kW + kL > 2 ? `${nm(sd[w][star])} gets a double.` : '';
      let txt;
      if(kW === 1 && kL === 0){ const K = sd[w][star], V = sd[l][dead[l][0]]; txt = first ? `First blood! ${nm(K)} takes down ${nm(V)} ${where}.` : inv[w].length === 1 && inv[l].length === 1 ? `${nm(K)} solo kills ${nm(V)} ${where}!` : pick([`${nm(K)} catches ${nm(V)} ${where}.`, `${nm(K)} picks off ${nm(V)} ${where}.`, `${nm(V)} is caught out ${where}; ${nm(K)} gets the kill.`]); }
      else { const ace = kW === 5; txt = (first ? `First blood to ${nm(fbK)} on ${nm(fbV)}, and ` : '') + (ace ? `ACE! ${ab(w)} wipe ${ab(l)} ${where}` : `${first ? '' : ab(w) + ' '}${first ? ab(w) + ' win' : 'win'} a ${kW}-for-${kL} ${late ? 'teamfight' : 'skirmish'} ${where}`) + '.' + (mk ? ' ' + mk : ''); }
      return {w, dk:kW - kL, kW, ev:{type:first ? 'fb' : 'kill', side:w, lane, pit, inv, dead, star, multi:sm, ace:kW === 5, txt}};
    };
    const takeWyrm = (s, ev) => { const n = ++wy[s]; gold(s, .4); wyrmAt = m + 5; let t = `${ab(s)} slay the ${elems[(wy[0] + wy[1] - 1) % 4]} Wyrm${n > 1 ? ` (${n})` : ''}.`; if(n === 4){ soul = s; t = `${ab(s)} take their fourth Wyrm: Wyrm Ascension!`; }
      if(ev){ ev.txt += ' ' + t; ev.wyrm = true; push(ev); } else push({type:'wyrm', side:s, lane:'jungle', pit:'wyrm', inv:[s ? [] : [1, 2, 3, 4], s ? [1, 2, 3, 4] : []], txt:t, soul:n === 4}); };
    const takeTitan = (s, ev) => { gold(s, 1.5); buff[s] = m + 4; titanAt = m + 7; const t = `${ab(s)} slay the Titan! Empowered minions march down every lane.`;
      if(ev){ ev.txt += ' ' + t; ev.titan = true; ev.type = 'titan'; push(ev); } else push({type:'titan', side:s, lane:'jungle', pit:'titan', inv:[s ? [] : [0, 1, 2, 3, 4], s ? [0, 1, 2, 3, 4] : []], txt:t}); };
    for(m = 1; win < 0; m++){
      const ph = m < 14 ? 0 : m < 25 ? 1 : 2, ef = Ef();
      adv += ef * (ph ? .016 : .028) + gauss() * .3; // farm and lane pressure
      for(const s of [0, 1]) if(gatesDown(1 - s)) gold(s, .25 * gatesDown(1 - s)); // super minions
      const wyrmUp = soul < 0 && m >= wyrmAt, titanUp = m >= titanAt;
      if(m >= 2 && Math.random() < [.25, .34, .44][ph] + (m > 40 ? .15 : 0)){
        const r = Math.random(), pit = titanUp && r < .3 ? 'titan' : wyrmUp && r < .55 ? 'wyrm' : null;
        const lane = pit ? 'jungle' : wpick(['top', 'mid', 'bot', 'jungle'], L => L === 'jungle' ? (ph ? .15 : .3) : L === 'bot' ? 1.2 : 1);
        const late = ph === 2 ? Math.random() < .75 : ph === 1 ? Math.random() < (pit ? .6 : .3) : false;
        const f = fight(lane, late, pit), ev = f.ev, o = 1 - f.w;
        if(pit === 'wyrm' && Math.random() < .8) takeWyrm(f.w, ev);
        else if(pit === 'titan' && f.dk >= 1 && Math.random() < .65) takeTitan(f.w, ev);
        else if(late && f.dk >= 2 && gatesDown(o) && m >= 22 && Math.random() < .45 + f.dk * .08){ push(ev); core(f.w, 'They push straight in and'); }
        else if((lane !== 'jungle' || late) && m >= 7 && Math.random() < .3 + f.dk * .15 + (late ? .2 : 0)){ const L = lane === 'jungle' || late ? pushLane(f.w) : lane, rz = L && raze(f.w, L);
          if(rz){ ev.txt += ` ${ab(f.w)} take ${rz.what}.`; ev.bld = rz.bld; } push(ev); }
        else push(ev);
        if(win >= 0) break;
      }
      // uncontested objectives and sieges
      if(soul < 0 && m >= wyrmAt && Math.random() < .2) takeWyrm(Math.random() < esSig(adv * .25 + Ef() * .05) ? 0 : 1);
      if(m >= titanAt && Math.random() < .08 + (Math.abs(adv) > 6 ? .12 : 0)) takeTitan(Math.random() < esSig(adv * .3 + Ef() * .05) ? 0 : 1);
      if(m >= 11){ const pb = .16 + Math.min(.3, Math.abs(adv) / 25) + (buff[0] > m || buff[1] > m ? .35 : 0) + (m > 38 ? .2 : 0);
        if(Math.random() < pb){ const s = buff[0] > m && buff[1] <= m ? 0 : buff[1] > m && buff[0] <= m ? 1 : Math.random() < esSig(adv * .35 + Ef() * .04) ? 0 : 1, o = 1 - s;
          if(gatesDown(o) && m >= 20 && Math.random() < .12 + gatesDown(o) * .12 + (buff[s] > m ? .2 : 0) + Math.max(0, (s ? -adv : adv) - 6) * .03 + (m > 42 ? .3 : 0)) core(s, buff[s] > m ? 'With the Titan behind them,' : '');
          else { const L = pushLane(s), rz = L && raze(s, L); if(rz) push({type:rz.gate ? 'gate' : 'tower', side:s, lane:L, bld:rz.bld, inv:[s ? [] : rz.gate ? [0, 1, 2, 3, 4] : [ES_LANE.indexOf(L) < 0 ? 2 : ES_LANE.indexOf(L), 1], s ? (rz.gate ? [0, 1, 2, 3, 4] : [ES_LANE.indexOf(L), 1]) : []], txt:`${ab(s)} ${rz.gate ? 'break' : 'take'} ${rz.what}.`}); } } }
      if(m >= 60 && win < 0){ core(adv >= 0 ? 0 : 1, 'After an hour-long war,'); }
      if(win >= 0) break;
    }
    const l = 1 - win; maps[win]++;
    for(const s of [0, 1]) for(const p of sd[s]){ B(p).mp++; if(s === win) B(p).mw++; }
    const lead = Math.max(...maps) >= need ? '' : maps[0] === maps[1] ? ` Series level at ${maps[0]}-${maps[1]}.` : ` ${ab(maps[0] > maps[1] ? 0 : 1)} lead ${Math.max(...maps)}-${Math.min(...maps)}.`;
    push({type:'mapend', side:win, lane:'mid', txt:`Map ${map} to ${T[win].name} in ${m} minutes (${kills[win]}-${kills[l]} in kills).${lead}`});
  }
  const w = maps[0] > maps[1] ? 0 : 1;
  if(rec) log.push({map:log.length ? log[log.length - 1].map : 1, min:log.length ? log[log.length - 1].min : 0, side:-1, sc:[...maps], kills:log.length ? log[log.length - 1].kills : [0, 0], type:'end', lane:'mid', txt:`${lgTeamName(T[w])} win the series ${maps[w]}-${maps[1 - w]}!`});
  return {sc:maps, ot:false, log, box};
}

// ---------------- the map ----------------
// 100×100 board, home base bottom-left, away top-right; the map is symmetric under (x, y) → (y, x)
const ES_PATH = {top:[[12, 88], [9, 72], [9, 9], [72, 9], [88, 12]], mid:[[12, 88], [88, 12]], bot:[[12, 88], [28, 91], [91, 91], [91, 28], [88, 12]]};
const ES_TS = [.34, .22, .12, .055], ES_PIT = {titan:[31, 31], wyrm:[69, 69]}, ES_CAMP = [[26, 58], [42, 74]], ES_CORE = [[12, 88], [88, 12]], ES_FOUNT = [[4, 96], [96, 4]];
function esAt(lane, s){ const P = ES_PATH[lane], seg = []; let L = 0; for(let i = 1; i < P.length; i++){ const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push(d); L += d; }
  let r = clamp(s, 0, 1) * L; for(let i = 0; i < seg.length; i++){ if(r <= seg[i] || i === seg.length - 1){ const f = seg[i] ? Math.min(1, r / seg[i]) : 0; return [lerp2(P[i][0], P[i + 1][0], f), lerp2(P[i][1], P[i + 1][1], f)]; } r -= seg[i]; } }
const esBld = (o, lane, tier) => esAt(lane, o ? 1 - ES_TS[tier] : ES_TS[tier]); // tier 3 = the Gate
const esKey = b => `${b.o}${b.lane}${b.tier}`;
function esFront(st, L){ let a = 0, h = 0; for(const k of st.down){ if(k.slice(1, -1) !== L) continue; if(k[0] === '1') a++; else h++; } return clamp(.5 + .085 * (a - h), .16, .84); }
function esRest(st, s, r){ const L = ES_LANE[r];
  if(L === 'jungle'){ const c = ES_CAMP[(st.n + s) % 2]; return s ? [c[1], c[0]] : [...c]; }
  const f = esFront(st, L), p = esAt(L, f + (s ? .05 : -.05)), d = r === 4 ? 2 : r === 3 ? -2 : 0; return [p[0] + d, p[1] + d]; }
function esPrep(e, st){
  if(e.map !== st.map){ st.map = e.map; st.down = new Set(); st.coreDown = -1; st.hp = [0, 1].map(s => [0, 1, 2, 3, 4].map(r => [ES_FOUNT[s][0] + (r - 2) * (s ? -1.5 : 1.5), ES_FOUNT[s][1] + (r - 2) * (s ? -1.5 : 1.5)])); }
  st.n = (st.n || 0) + 1; st.ev = e; st.fade = e.bld ? esKey(e.bld) : null;
  st.from = st.hp.map(a => a.map(p => [...p])); st.to = [0, 1].map(s => [0, 1, 2, 3, 4].map(r => esRest(st, s, r)));
  let P = null; const o = 1 - e.side;
  if(e.type === 'core') P = ES_CORE[o];
  else if(e.pit) P = ES_PIT[e.pit];
  else if(e.bld && (e.type === 'tower' || e.type === 'gate')) P = esBld(e.bld.o, e.bld.lane, e.bld.tier);
  else if(e.lane && e.lane !== 'jungle') P = esAt(e.lane, esFront(st, e.lane));
  else if(e.lane === 'jungle') P = e.side === 1 ? ES_CAMP[st.n % 2] : [ES_CAMP[st.n % 2][1], ES_CAMP[st.n % 2][0]];
  st.P = P; if(!P || e.type === 'mapend' || e.type === 'end') return;
  const inv = e.type === 'core' ? [e.side ? [] : [0, 1, 2, 3, 4], e.side ? [0, 1, 2, 3, 4] : []] : e.inv || [[], []];
  for(const s of [0, 1]){ const rs = inv[s], back = s ? [1, -1] : [-1, 1], both = inv[1 - s].length > 0, dist = both ? 3 : 2.6;
    rs.forEach((r, i) => { const sp = (i - (rs.length - 1) / 2) * 2.8; st.to[s][r] = [P[0] + back[0] * dist + sp, P[1] + back[1] * dist + sp]; }); }
}
function esCommit(e, st){
  if(st.ev !== e) return; st.ev = null;
  if(e.bld) st.down.add(esKey(e.bld)); if(e.type === 'core') st.coreDown = 1 - e.side; st.fade = null;
  st.hp = st.to.map(a => a.map(p => [...p]));
  if(e.dead) for(const s of [0, 1]) for(const r of e.dead[s]) st.hp[s][r] = [ES_FOUNT[s][0] + (r - 2) * (s ? -1.5 : 1.5), ES_FOUNT[s][1] + (r - 2) * (s ? -1.5 : 1.5)];
}
const ES_RENDER = {
  aspect:.9, otLabel:'', startPer:'Map 1', startClk:'0:00', startDd:'Kills 0-0', gap:120, side:true,
  dur:e => e.type === 'core' ? 1500 : e.type === 'mapend' ? 1100 : e.type === 'end' ? 700 : e.type === 'titan' ? 1100 : 820,
  init(st){ st.map = 0; st.n = 0; st.down = new Set(); st.coreDown = -1; st.hp = [0, 1].map(s => [0, 1, 2, 3, 4].map(r => esRest(st, s, r))); st.cache = null; },
  hud(e, after, st){ if(after) esCommit(e, st); else esPrep(e, st);
    const g = e.gold || 0, lead = Math.abs(g) < .5 ? 'Gold even' : `<b>${(g > 0 ? st.home : st.away).abbr}</b> +${Math.abs(g).toFixed(1)}k gold`;
    return {per:`Map ${e.map}`, clk:`${e.min}:00`, dd:`Kills ${e.kills[0]}-${e.kills[1]}`, stamp:`M${e.map} ${e.min}'`, side:e.tk ? `${lead} · Towers ${e.tk[0]}-${e.tk[1]} · Wyrms ${e.wy[0]}-${e.wy[1]}` : ''}; },
  big:e => e.type === 'fb' || e.type === 'titan' || e.type === 'core' || e.type === 'mapend' || e.type === 'end' || e.multi >= 3 || e.ace || !!e.soul,
  banner(e, st){ if(e.type === 'fb') return ['First Blood', '#ff4b4b']; if(e.type === 'titan') return ['Titan slain', '#c59bff']; if(e.type === 'core') return ['Core destroyed!', '#ffe14a'];
    if(e.multi >= 5) return ['PENTA KILL', '#ff4b4b']; if(e.ace) return ['Ace!', '#fff']; if(e.multi === 4) return ['Quadra kill', '#ff4b4b']; if(e.multi === 3) return ['Triple kill', '#ff4b4b']; if(e.soul) return ['Wyrm Ascension', '#ff9a3c']; return null; },
  bg(ctx, st){ const W = st.W, H = st.H;
    if(!st.cache){ try{ const c = document.createElement('canvas'), k = Math.min(3, window.devicePixelRatio || 1); c.width = W * k; c.height = H * k; const x = c.getContext('2d'); x.scale(k, k); esStatic(x, st); st.cache = c; } catch(err){ st.cache = false; } }
    if(st.cache) ctx.drawImage(st.cache, 0, 0, W, H); else esStatic(ctx, st);
    const X = x => x / 100 * W, Y = y => y / 100 * H, u = W / 100;
    for(const s of [0, 1]){ for(const L of ['top', 'mid', 'bot']) for(let t = 0; t < 4; t++){ const k = `${s}${L}${t}`; if(st.down.has(k) || st.fade === k) continue; esStruct(ctx, X, Y, u, s, L, t, st, 1); }
      if(st.coreDown !== s) esCore(ctx, X, Y, u, s, st, 1); }
  },
  frame(ctx, e, t, st){
    const W = st.W, H = st.H, X = x => x / 100 * W, Y = y => y / 100 * H, u = W / 100, r = Math.max(4, W * .014);
    if(e.type === 'mapend' || e.type === 'end'){ const w = e.side >= 0 ? e.side : (e.sc[0] > e.sc[1] ? 0 : 1), a = Math.min(1, t * 3);
      ctx.globalAlpha = a; ctx.fillStyle = '#000b'; ctx.fillRect(0, H * .38, W, H * .24); ctx.fillStyle = st.cols[w]; ctx.fillRect(0, H * .38, W, 3); ctx.fillRect(0, H * .62 - 3, W, 3);
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = CANVAS_FONT('800 ' + Math.round(H * .085));
      ctx.fillText(e.type === 'end' ? `${(w ? st.away : st.home).abbr} WIN ${Math.max(...e.sc)}-${Math.min(...e.sc)}` : `MAP ${e.map} · ${(w ? st.away : st.home).abbr}`, W / 2, H * .5);
      ctx.font = CANVAS_FONT('600 ' + Math.round(H * .045)); ctx.fillStyle = '#ddd'; ctx.fillText(e.type === 'end' ? 'Series over' : `${e.kills[w]}-${e.kills[1 - w]} kills · ${e.min} min · series ${e.sc[0]}-${e.sc[1]}`, W / 2, H * .575); ctx.globalAlpha = 1; return; }
    const k = easeIO(Math.min(1, t / .5)), fight = e.type === 'fb' || e.type === 'kill' || (e.type === 'titan' && e.dead);
    // the structure falling this event
    if(st.fade){ const b = e.bld, a = clamp(1 - (t - .4) / .5, 0, 1); esStruct(ctx, X, Y, u, b.o, b.lane, b.tier, st, a);
      if(t > .4 && t < .95){ const p = esBld(b.o, b.lane, b.tier); for(let i = 0; i < 6; i++){ const ang = i * 1.05 + t * 9, d = (t - .4) * 9; dotP(ctx, X(p[0] + Math.cos(ang) * d), Y(p[1] + Math.sin(ang) * d), u * .45, '#ffb347'); } } }
    // monsters in the pits
    if(e.pit && (e.type === 'wyrm' || e.type === 'titan' || e.wyrm || e.titan)){ const p = ES_PIT[e.pit], col = e.pit === 'titan' ? '#a56bff' : '#ff8a2a', rr = u * (e.pit === 'titan' ? 3.6 : 3) * clamp(1.15 - t, .15, 1);
      ctx.globalAlpha = .35 + .3 * Math.sin(t * 20); dotP(ctx, X(p[0]), Y(p[1]), rr * 1.6, col); ctx.globalAlpha = 1; dotP(ctx, X(p[0]), Y(p[1]), rr, col, '#fff');
      if(t > .85){ ctx.globalAlpha = (1 - t) / .15; dotP(ctx, X(p[0]), Y(p[1]), u * 8 * (t - .7), '#ffffff55'); ctx.globalAlpha = 1; } }
    // the core going up
    if(e.type === 'core'){ const o = 1 - e.side, p = ES_CORE[o]; esCore(ctx, X, Y, u, o, st, clamp(1 - (t - .3) / .5, 0, 1));
      if(t > .3){ const f = (t - .3) / .7; for(const [c, m] of [['#ffffff', 1], ['#ffcf4a', .75], [st.cols[e.side], .5]]){ ctx.globalAlpha = Math.max(0, 1 - f) * .85; dotP(ctx, X(p[0]), Y(p[1]), u * 26 * f * m, c + (c.length === 7 ? '' : '')); }
        ctx.globalAlpha = 1; } }
    // the heroes
    for(const s of [0, 1]) for(let i = 0; i < 5; i++){ const a = st.from ? st.from[s][i] : [50, 50], b = st.to ? st.to[s][i] : a, dead = e.dead && e.dead[s].includes(i);
      let x = lerp2(a[0], b[0], k), y = lerp2(a[1], b[1], k); if(fight && t > .5 && e.inv && e.inv[s].includes(i)){ x += Math.sin(t * 24 + i * 2 + s) * .9; y += Math.cos(t * 19 + i) * .9; }
      ctx.globalAlpha = dead && t > .62 ? Math.max(.25, 1 - (t - .62) * 2.5) : 1; dotP(ctx, X(x), Y(y), r * (e.side === s && e.star === i && fight ? 1.2 : 1), st.cols[s], s === 0 ? '#ffffffcc' : '#111111cc'); ctx.globalAlpha = 1;
      if(dead && t > .58){ const f = (t - .58) / .42; ctx.strokeStyle = `rgba(255,60,60,${1 - f})`; ctx.lineWidth = 2; for(let q = 0; q < 8; q++){ const ang = q * Math.PI / 4; ctx.beginPath(); ctx.moveTo(X(x) + Math.cos(ang) * r * (1 + f), Y(y) + Math.sin(ang) * r * (1 + f)); ctx.lineTo(X(x) + Math.cos(ang) * r * (1.6 + f * 3), Y(y) + Math.sin(ang) * r * (1.6 + f * 3)); ctx.stroke(); }
        ctx.globalAlpha = (1 - f) * .5; dotP(ctx, X(x), Y(y), r * (1.2 + f * 2), '#ff2a2a'); ctx.globalAlpha = 1; } }
  },
};
function esStruct(ctx, X, Y, u, s, L, t, st, a){ const p = esBld(s, L, t), x = X(p[0]), y = Y(p[1]); ctx.globalAlpha = a;
  if(t === 3){ const z = u * 1.7; ctx.beginPath(); ctx.moveTo(x, y - z); ctx.lineTo(x + z, y); ctx.lineTo(x, y + z); ctx.lineTo(x - z, y); ctx.closePath(); ctx.fillStyle = st.cols[s]; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#e9f3ff'; ctx.stroke(); }
  else { const z = u * 2.4; ctx.fillStyle = '#0008'; ctx.fillRect(x - z / 2 + 1, y - z / 2 + 1.5, z, z); ctx.fillStyle = st.cols[s]; ctx.fillRect(x - z / 2, y - z / 2, z, z); ctx.lineWidth = 1.2; ctx.strokeStyle = '#f4ead2'; ctx.strokeRect(x - z / 2, y - z / 2, z, z); }
  ctx.globalAlpha = 1; }
function esCore(ctx, X, Y, u, s, st, a){ const p = ES_CORE[s], x = X(p[0]), y = Y(p[1]), z = u * 3.6; ctx.globalAlpha = a;
  ctx.beginPath(); for(let i = 0; i < 6; i++){ const ang = Math.PI / 6 + i * Math.PI / 3; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(ang) * z, y + Math.sin(ang) * z); } ctx.closePath();
  ctx.fillStyle = st.cols[s]; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); dotP(ctx, x, y, z * .38, '#ffffffcc'); ctx.globalAlpha = 1; }
function esStatic(ctx, st){ // the parts of the board that never change: ground, jungle, river, lanes, pits and bases
  const W = st.W, H = st.H, X = x => x / 100 * W, Y = y => y / 100 * H, u = W / 100; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * .75); g.addColorStop(0, '#16261c'); g.addColorStop(1, '#09110c'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for(let i = 0; i < 340; i++){ ctx.fillStyle = ['#1b3122', '#0c1710', '#14271a', '#203a27'][i % 4]; ctx.globalAlpha = .55 + rnd() * .4; ctx.beginPath(); ctx.ellipse(X(rnd() * 100), Y(rnd() * 100), u * (.6 + rnd() * 2.6), u * (.5 + rnd() * 2), rnd() * 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = (pts, w, c) => { ctx.beginPath(); pts.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](X(x), Y(y))); ctx.lineWidth = w; ctx.strokeStyle = c; ctx.stroke(); };
  const river = []; for(let i = 0; i <= 24; i++){ const f = i / 24 * 112 - 6, w = Math.sin(f / 9) * 2.2; river.push([f + w, f - w]); }
  path(river, u * 10, '#10283a'); path(river, u * 7.4, '#173c55'); ctx.globalAlpha = .35; path(river.map(([x, y]) => [x - 1.2, y + 1.2]), u * 1, '#5fa8d3'); ctx.globalAlpha = 1;
  for(const L of ['top', 'mid', 'bot']){ path(ES_PATH[L], u * 5.6, '#2c2419'); path(ES_PATH[L], u * 4, '#4a3d2a'); ctx.globalAlpha = .25; path(ES_PATH[L], u * 1.2, '#8c7552'); ctx.globalAlpha = 1; }
  for(const [k, col, lab] of [['titan', '#a56bff', 'TITAN'], ['wyrm', '#ff8a2a', 'WYRM']]){ const [x, y] = ES_PIT[k]; dotP(ctx, X(x), Y(y), u * 5.2, '#0a1216', col); ctx.globalAlpha = .45; dotP(ctx, X(x), Y(y), u * 1.8, col); ctx.globalAlpha = 1;
    ctx.font = CANVAS_FONT('700 ' + Math.max(9, Math.round(H * .028))); ctx.textAlign = 'center'; ctx.fillStyle = col + 'aa'; ctx.fillText(lab, X(x), Y(y) + u * 8.4); }
  for(const s of [0, 1]){ const [x, y] = s ? [100, 0] : [0, 100]; ctx.beginPath(); ctx.arc(X(x), Y(y), u * 21, 0, Math.PI * 2); ctx.fillStyle = st.cols[s] + '30'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = st.cols[s] + '99'; ctx.stroke();
    const [fx, fy] = ES_FOUNT[s]; ctx.globalAlpha = .5; dotP(ctx, X(fx), Y(fy), u * 3, st.cols[s], '#fff'); ctx.globalAlpha = 1; }
  ctx.font = CANVAS_FONT('800 ' + Math.round(H * .05)); ctx.fillStyle = '#ffffff18'; ctx.textAlign = 'center'; ctx.save(); ctx.translate(X(50), Y(50)); ctx.rotate(-Math.PI / 4); ctx.fillText('ARENA', 0, -u * 6); ctx.restore();
}

// ---------------- the league config ----------------
LG.esports = {
  id:'esports', start:3, seasonWord:'split', gameWord:'series', venue:'Arena', coachWord:'head coach', crest:'hex', starterWord:'Starter', pfWord:'Maps', pfShort:'MD',
  teams:[['Seoul', 'Nova', 'NOV', '#5b2be0', '#f2c94c', 5], ['Los Angeles', 'Vortex', 'VTX', '#0a8f8f', '#101418', 5], ['Shanghai', 'Jade Tigers', 'JDT', '#1f9d55', '#f6e05e', 4], ['Tokyo', 'Ronin', 'RON', '#161616', '#e53935', 4], ['Berlin', 'Crimson Order', 'CRO', '#b3122e', '#f5f5f5', 3],
    ['Paris', 'Phantoms', 'PHM', '#3949ab', '#e0e0e0', 3], ['São Paulo', 'Serpents', 'SRP', '#f57c00', '#1b1b1b', 3], ['Toronto', 'Frostbyte', 'FRB', '#4fc3f7', '#0d1b3e', 2], ['Copenhagen', 'Valkyries', 'VKY', '#c2185b', '#ffd54f', 2], ['Stockholm', 'Northstar', 'NST', '#0d47a1', '#ffffff', 1]],
  pos:{TOP:[2, 1], JNG:[2, 1], MID:[2, 1], ADC:[2, 1], SUP:[2, 1]}, posNames:{TOP:'Top laners', JNG:'Junglers', MID:'Mid laners', ADC:'Carries', SUP:'Supports'},
  rosterMax:12, ages:[16, 30], peak:22, draftRounds:1, injRate:.0005, injPool:10, hypeMul:1.2, awardMinGP:8, names:esName,
  reg:{weeks:18, gpw:1, double:true}, po:{teams:4, byConf:false, bestOf:1, name:'playoffs', rounds:['Semi-finals', 'Grand Final']}, champName:'Arena Championship',
  money:{cap:5, maxSal:1.2, minSal:.06, tv:4, merch:3, ticket:45, seats:[2500, 9000], seatStep:600, staff:.004, ops:1.5, arenaUp:4},
  stats:[['k', 'K'], ['d', 'D'], ['as', 'A'], ['mp', 'MP'], ['mw', 'MW']],
  statLine(s){ return [['Series', s.gp], ['K', s.k], ['D', s.d], ['A', s.as], ['KDA', ((s.k + s.as) / Math.max(1, s.d)).toFixed(1)]]; },
  leaders:[['k', 'Kills', false], ['as', 'Assists', false], ['k', 'KDA (20+ maps)', p => ((p.st.k + p.st.as) / Math.max(1, p.st.d)).toFixed(1), p => p.st.mp >= 20], ['mw', 'Maps won', false]],
  records:[['k', 'Kills in a split'], ['as', 'Assists in a split'], ['mw', 'Maps won in a split']],
  awards:[
    {k:'mvp', n:'Split MVP', score:(p, t) => (p.st.k * 1.2 + p.st.as * .55 - p.st.d * .7) / Math.max(1, p.st.mp) * 9 + lgPct(t) * 22 + p.ovr / 6},
    {k:'carry', n:'Best Carry', pos:['ADC', 'MID'], score:p => (p.st.k * 1.3 + p.st.as * .4 - p.st.d * .8) / Math.max(1, p.st.mp) * 10 + p.ovr / 8},
    {k:'roy', n:'Rookie of the Split', score:p => (p.st.k + p.st.as * .7 - p.st.d * .5) / Math.max(1, p.st.mp) + p.ovr / 10},
  ],
  hofProd:c => c.k / 60 + c.as / 90 + c.mw / 25,
  sim:esSim, render:ES_RENDER,
};
SPORTS.esports = lgModule('esports');
