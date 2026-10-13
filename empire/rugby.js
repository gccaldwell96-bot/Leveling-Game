'use strict';
// =====================================================================================
//  RUGBY: Rugby Super Series · 12 clubs, 22 rounds home & away, top-four finals
//  Passage-by-passage sim: the packs fight for territory and possession, the backs turn it
//  into line breaks and tries, the fly-half kicks the goals. Sin-bins leave a side a man down.
//  Finals that end level go to extra time, then sudden death, then a kicking competition.
// =====================================================================================
const RG_JERSEY = ['PR', 'HK', 'PR', 'LK', 'LK', 'BR', 'BR', 'BR', 'SH', 'FH', 'WG', 'CE', 'CE', 'WG', 'FB']; // index = jersey number - 1
const RG_FWD = new Set(['PR', 'HK', 'LK', 'BR']);
const RG_TRY = {PR:.3, HK:.85, LK:.4, BR:1, SH:.8, FH:.55, CE:1.5, WG:3, FB:1.5}, RG_TK = {PR:.95, HK:1.1, LK:1.25, BR:1.5, SH:.7, FH:.85, CE:1.15, WG:.5, FB:.45};
const RG_FN = 'Sione Tane Rhys Gareth Owen Cian Conor Ruan Pieter Tevita Josefa Semi Mako Ngani Lachlan Angus Callum Finn Hamish Tadhg Eoin Dafydd Ieuan Morgan Teo Vili Manu Kalani Ruben Thibault Mathieu Baptiste Tomas Joaquin Facundo Kenta Taiga Ardie Jaco Duane Brodie Kurt Reece Toby Elliot Harvey'.split(' ');
const RG_LN = 'Fifita Taufa Latu Moala Havili Vaipulu Tuipulotu Naivalu Radrodro Waqa Tikoisuva Pienaar Botha Venter Coetzee Nel Kruger Steyn Morgan Llewellyn Pryce Davies Jenkins Rees Byrne Doyle Kerr Fraser McLeod Dunbar Lefevre Marchand Dupuis Garnier Ortega Fujita Matsuda Henare Ngata Paewai Tamati Rata Ellison Hollis Whitlock Brannigan'.split(' ');
function rgSim(H, A, ctx){
  const xv = T => { const used = new Set(), out = RG_JERSEY.map(pos => { const p = (T.pos[pos] || []).find(x => !used.has(x.id)); if(p) used.add(p.id); return p; });
    for(let i = 0; i < 15; i++) if(!out[i]){ const f = RG_FWD.has(RG_JERSEY[i]), p = T.all.find(x => !used.has(x.id) && RG_FWD.has(x.pos) === f) || T.all.find(x => !used.has(x.id)) || T.all[i % T.all.length]; used.add(p.id); out[i] = p; }
    const bench = []; for(const pos of ['PR', 'PR', 'HK', 'LK', 'BR', 'SH', null, null]){ const p = T.all.find(x => !used.has(x.id) && (pos ? x.pos === pos : !RG_FWD.has(x.pos))); if(p){ used.add(p.id); bench.push(p); } }
    return {on:out, bench}; };
  const sides = [xv(H), xv(A)], on = sides.map(x => [...x.on]), coach = [ctx.coachH, ctx.coachA], sc = [0, 0], log = [], box = {}, rec = ctx.record, ab = [H.t.abbr, A.t.abbr];
  const B = p => box[p.id] || (box[p.id] = {tr:0, pts:0, con:0, pen:0, dg:0, tk:0, yc:0});
  const nm = p => `${p.fn[0]}. ${p.ln}`;
  const wpick = (arr, w) => { const ws = arr.map(w), tot = ws.reduce((a, b) => a + b, 0); let r = Math.random() * tot; for(let i = 0; i < arr.length; i++){ r -= ws[i]; if(r <= 0) return i; } return arr.length - 1; };
  for(const s of on) for(const p of s) B(p);
  // replacements: the bench comes on for the tiring starter in the same position early in the second half
  const subs = sides.map((x, s) => x.bench.map(p => { const slots = RG_JERSEY.map((pos, i) => i).filter(i => RG_JERSEY[i] === p.pos); const fr = p.pos === 'PR' || p.pos === 'HK'; return slots.length && (fr || Math.random() < .88) ? {s, p, at:fr ? irand(46, 60) : irand(50, 76), slots} : null; }).filter(Boolean)).flat();
  const rate = s => { const o = on[s]; let f = 0, b = 0, w = 0; for(let i = 0; i < 8; i++) f += o[i].ovr; for(let i = 8; i < 15; i++){ const k = i < 10 ? 1.3 : 1; b += o[i].ovr * k; w += k; } return {F:f / 8, B:b / w}; };
  const kicker = s => { const o = on[s]; return o[9].pos === 'FH' || o[9].ovr >= o[14].ovr ? o[9] : o[14]; };
  let min = 0, h = 1, bin = [0, 0], binP = [null, null], corner = -1, done = false;
  const stamp = () => Math.min(Math.floor(min), h === 1 ? 39 : h === 2 ? 79 : h === 3 ? 99 : 109);
  const push = e => { if(rec) log.push({min:stamp(), h, sc:[...sc], ...e}); };
  const score = (s, n, p, k) => { sc[s] += n; B(p).pts += n; if(k) B(p)[k]++; };
  const goal = (s, x, y, type) => { // a place kick at goal from x (metres toward their line) and y (0-100 across)
    const k = kicker(s), dist = Math.round(100 - x), ang = Math.abs(y - 50) / 50;
    const pk = type === 'con' ? clamp(.92 + (k.ovr - 72) / 110 - ang * .28, .35, .97) : clamp(1.01 - (dist - 15) * .0105 - ang * .1 + (k.ovr - 72) / 120, .3, .96), ok = Math.random() < pk;
    if(type === 'con'){ if(ok) score(s, 2, k, 'con'); push({type:ok ? 'con' : 'conmiss', side:s, x, y, txt:ok ? pick([`${nm(k)} adds the extras.`, `${nm(k)} converts.`, `${nm(k)} bisects the posts with the conversion.`]) : `${nm(k)} misses the conversion${ang > .5 ? ' from out wide' : ''}.`}); }
    else { if(ok) score(s, 3, k, 'pen'); push({type:ok ? 'pen' : 'penmiss', side:s, x, y, txt:ok ? `${nm(k)} slots the penalty from ${dist}m.` : `${nm(k)}'s penalty from ${dist}m ${pick(['drifts wide', 'hits the upright', 'falls short'])}.`}); }
  };
  const passage = sd => { // one passage of play; returns true when somebody scored
    for(const x of subs) if(!x.done && min >= x.at){ x.done = true; const sl = x.slots.filter(i => sides[x.s].on[i] === on[x.s][i]).sort((a, b) => on[x.s][a].ovr - on[x.s][b].ovr)[0]; if(sl != null && on[x.s][sl] !== binP[x.s]){ on[x.s][sl] = x.p; B(x.p); } }
    const r0 = rate(0), r1 = rate(1), man = [bin[0] > min, bin[1] > min];
    let pa = .5 + (r0.F - r1.F) * .01 + (r0.B - r1.B) * .004 + .02 + (coach[0] - coach[1]) / 700 + (man[1] ? .12 : 0) - (man[0] ? .12 : 0);
    const s = corner >= 0 ? corner : Math.random() < clamp(pa, .2, .8) ? 0 : 1, o = 1 - s, rs = s ? r1 : r0, ro = s ? r0 : r1, cb = corner >= 0; corner = -1;
    const ae = ((rs.B - ro.B) * .6 + (rs.F - ro.F) * .4 + (s ? -.9 : .9) + (coach[s] - coach[o]) / 40) / 10 + (man[o] ? .4 : 0) - (man[s] ? .3 : 0);
    // the defence makes its tackles
    const def = on[o].filter(p => p !== binP[o] || !man[o]), nt = irand(4, 11);
    for(let k = 0; k < nt; k++) B(def[wpick(def, p => RG_TK[RG_JERSEY[on[o].indexOf(p)]] * Math.max(8, p.ovr - 30))]).tk++;
    const pTry = clamp(.166 * (1 + ae * .8) * (cb ? 2.2 : 1), .04, .5), pPen = clamp(.235 * (1 + (rs.F - ro.F) / 40), .12, .32), late = h >= 2 && min > 70 && sc[o] - sc[s] >= 0 && sc[o] - sc[s] <= 3, level = late && sc[o] - sc[s] === 3;
    const pDg = (level ? .14 : late ? .05 : .007) * (sd ? 3 : 1), r = Math.random(), att = on[s], dnm = () => nm(pick(def));
    if(r < pTry){ // TRY
      const i = wpick(att, (p, j) => RG_TRY[RG_JERSEY[j]] * Math.max(5, p.ovr - 45)), p = att[i], back = i >= 8;
      const y = RG_JERSEY[i] === 'WG' ? (i === 10 ? rand(5, 12) : rand(88, 95)) : back ? rand(22, 78) : rand(38, 62);
      let x0 = back ? rand(30, 70) : rand(88, 96);
      if(back && Math.random() < .55){ const bi = Math.random() < .6 ? i : wpick(att, (q, j) => j >= 8 && j !== i ? q.ovr - 40 : 0), bk = att[bi]; x0 = rand(25, 55); const x1 = rand(60, 82);
        push({type:'break', side:s, j:bi, x0, x:x1, y:rand(25, 75), txt:bi === i ? `${nm(bk)} breaks the line!` : `${nm(bk)} makes the break and looks for support...`}); x0 = x1; }
      score(s, 5, p, 'tr');
      const how = {WG:[`rounds the cover and dots down in the corner`, `finishes it off out wide`, `wins the race to the line`], FB:[`joins the line and glides over`, `cuts a superb line and goes under the posts`], CE:[`scorches through the gap and over`, `steps two defenders and scores`], SH:[`snipes from the base of the ruck`], FH:[`dummies and goes over`],
        HK:[`touches down at the back of a driving maul`], BR:[`powers over from the back of the scrum`, `crashes over from close range`], PR:[`picks and goes from a metre out`], LK:[`barges over from short range`]}[RG_JERSEY[i]];
      push({type:'try', side:s, j:i, x0, x:100, y, txt:`TRY! ${nm(p)} ${pick(how)}.${cb ? ' The penalty to the corner pays off.' : ''}${man[o] ? ` ${ab[o]} pay for the sin-bin.` : ''}`});
      if(sd) return true; goal(s, rand(72, 85), y, 'con'); min += .7; return true; }
    if(r < pTry + pPen){ // PENALTY
      const x = clamp(rand(35, 86) + ae * 8, 30, 94), y = rand(15, 85);
      if(Math.random() < .095){ const ci = wpick(def, p => RG_FWD.has(p.pos) ? 1.4 : .7), c = def[ci]; B(c).yc++; bin[o] = min + 10; binP[o] = c;
        push({type:'yc', side:o, x:100 - x, y, txt:`Yellow card! ${nm(c)} (${ab[o]}) is sent to the sin-bin for ${pick(['a cynical foul', 'a high tackle', 'repeated infringements', 'killing the ball', 'a deliberate knock-on', 'collapsing the maul'])}.`}); }
      const behind = sc[s] < sc[o] - 7 && h >= 2 && min > 65, three = h >= 2 && min > 72 && sc[o] - sc[s] === 3;
      if(x >= 50 && x <= 88 && !behind && (three || Math.random() < (x < 60 ? .6 : x > 80 ? .75 : .93))){ goal(s, x, y, 'pen'); return sc[0] !== sc[1] && sd; }
      if(x >= 62) corner = s; return false; } // kicked to the corner: the attack goes again from the lineout
    if(r < pTry + pPen + pDg){ const k = att[9], ok = Math.random() < clamp(.42 + (k.ovr - 72) / 90, .2, .7) * (sd ? 1.1 : 1);
      if(ok){ score(s, 3, k, 'dg'); push({type:'dg', side:s, j:9, x:rand(62, 75), y:rand(35, 65), txt:`DROP GOAL! ${nm(k)} snaps it over from the pocket.`}); return true; } return false; }
    if(r < pTry + pPen + pDg + .09){ const i = wpick(att, (p, j) => (j >= 8 ? 1.6 : .6) * Math.max(5, p.ovr - 45)), x0 = rand(20, 50), x = clamp(x0 + rand(15, 35), 30, 90);
      push({type:'break', side:s, j:i, x0, x, y:rand(15, 85), stop:1, txt:`${nm(att[i])} ${pick(['breaks the line', 'bursts through', 'finds a gap'])}, but ${dnm()} ${pick(['hauls him down', 'scrambles across to tackle', 'gets back to save it'])}.`}); return false; }
    if(r < pTry + pPen + pDg + .09 + .24){ const x = rand(25, 96), who = dnm();
      const txt = x > 93 ? `Held up over the line! ${who} gets under the ball.` : pick([`${who} gets over the ball: turnover!`, `Knock-on by ${nm(pick(att))}. ${ab[o]} scrum.`, `${who} steals the ${ab[s]} lineout.`, `Interception! ${who} picks it off.`, `${who} rips the ball in the tackle.`, `Forward pass. ${ab[o]} scrum.`]);
      push({type:'turnover', side:o, x:100 - x, y:rand(15, 85), txt}); }
    return false;
  };
  const play = (end, sd) => { while(min < end){ min += rand(1.6, 3.2); if(passage(sd) && sd && sc[0] !== sc[1]) return; } };
  push({type:'half', side:-1, txt:`Kick-off at the ${H.t.city} Stadium!`});
  play(40, false); min = 40; push({type:'half', side:-1, min:40, txt:`Half-time: ${ab[0]} ${sc[0]}-${sc[1]} ${ab[1]}.`}); h = 2;
  play(80, false); min = 80; const lvl = sc[0] === sc[1];
  push({type:'end', side:-1, min:80, txt:lvl && ctx.po ? `Full time: all square at ${sc[0]}-${sc[1]}! Extra time.` : `Full time: ${ab[0]} ${sc[0]}-${sc[1]} ${ab[1]}.`});
  let ot = false;
  if(lvl && ctx.po){ ot = true; h = 3; bin = [0, 0];
    play(100, false); min = 100; if(sc[0] !== sc[1]) push({type:'end', side:-1, min:100, txt:`End of extra time: ${ab[sc[0] > sc[1] ? 0 : 1]} hold on!`});
    else { push({type:'end', side:-1, min:100, txt:'Still level after extra time. Sudden death: next score wins!'}); play(110, true); min = 110;
      if(sc[0] !== sc[1]) push({type:'end', side:-1, txt:`${ab[sc[0] > sc[1] ? 0 : 1]} win it in sudden death!`});
      else { h = 4; done = true; const kc = [0, 0], order = [9, 14, 8, 11, 12]; push({type:'end', side:-1, txt:'Still level! A kicking competition decides it.'});
        for(let r = 0; r < 12; r++){ for(const s of [0, 1]){ const k = on[s][order[r % 5]], ok = Math.random() < clamp(.62 + (k.ovr - 70) / 120 - (k.pos === 'FH' ? 0 : .12), .25, .9); if(ok) kc[s]++;
            push({type:ok ? 'pen' : 'penmiss', side:s, kc:[...kc], x:78, y:rand(30, 70), txt:`Kicking competition: ${nm(k)} ${ok ? 'nails it' : 'misses'}. (${kc[0]}-${kc[1]})`}); }
          if(r >= 4 && kc[0] !== kc[1]) break; }
        if(kc[0] === kc[1]) kc[Math.random() < .5 ? 0 : 1]++; const w = kc[0] > kc[1] ? 0 : 1; sc[w]++; push({type:'end', side:-1, txt:`${w ? A.t.name : H.t.name} win the kicking competition ${Math.max(...kc)}-${Math.min(...kc)}!`}); } } }
  return {sc, ot, log, box, kc:done};
}

// ---------------- the pitch ----------------
// field units: u = metres from the home try line (-10..110, home attacks right), v = 0..70 across
const RG_JIT = i => [Math.sin(i * 12.99) * 1.2, Math.cos(i * 7.31) * 1.4];
function rgForm(bu, bv, d, att){ // 15 spots, jersey order, for the attacking (att) or defending side around a ruck at (bu, bv)
  const lat = bv < 35 ? 1 : -1, cl = (u, v) => [clamp(u, -9, 109), clamp(v, 1.5, 68.5)];
  if(att) return [[-1.5, -2], [-1, 0], [-1.5, 2], [-3, -1.5], [-3, 1.8], [-2.5, -4.5 * lat], [-5, 10 * lat], [-4.5, -9 * lat], [-2.5, 1.2 * lat], [-8, 8 * lat], [-14, 40 * lat], [-10, 15 * lat], [-12, 23 * lat], [-11, -14 * lat], [-22, 6 * lat]]
    .map(([du, dv], i) => { const j = RG_JIT(i); return cl(bu + d * (du + j[0] * .5), i === 10 ? (lat > 0 ? 66 : 4) : bv + dv + j[1] * .6); });
  return [[2, -2], [1.6, 0], [2, 2], [2.4, -5 * lat], [2.6, 5 * lat], [2.5, 9 * lat], [2.2, -8 * lat], [3, 14 * lat], [6, -3 * lat], [3.5, 20 * lat], [8, -16 * lat], [3.5, 26 * lat], [4, 33 * lat], [5, 42 * lat], [20, 8 * lat]]
    .map(([du, dv], i) => { const j = RG_JIT(i + 20); return cl(bu + d * (du + j[0] * .4), bv + dv + j[1] * .5); });
}
const RG_RENDER = {
  aspect:.6, otLabel:'ET', startPer:'1H', startClk:"0'", startDd:'Kick-off', gap:220,
  dur:e => e.type === 'try' ? 1600 : e.type === 'break' ? 1200 : ['con', 'conmiss', 'pen', 'penmiss', 'dg'].includes(e.type) ? 1150 : e.type === 'yc' ? 900 : e.type === 'turnover' ? 750 : 500,
  hud(e, after, st){ const per = ['', '1H', '2H', 'ET', 'KC'][e.h] || '', clk = `${e.min}'`, tm = e.side === 0 ? st.home : e.side === 1 ? st.away : null;
    return {per, clk, dd:e.kc ? `Kicking competition ${e.kc[0]}-${e.kc[1]}` : e.type === 'yc' ? `${tm.abbr} down to 14` : tm ? `${tm.abbr} in possession` : '', stamp:e.h === 4 ? 'KC' : clk}; },
  big:e => ['try', 'con', 'pen', 'dg', 'yc', 'half', 'end'].includes(e.type),
  banner(e){ if(e.type === 'try') return ['TRY!', '#ffe14a']; if(e.type === 'dg') return ['Drop goal!', '#fff']; if(e.type === 'con' || e.type === 'pen') return ['Over!', '#fff']; if(e.type === 'yc') return ['Yellow card', '#ffd60a']; if(e.type === 'penmiss' || e.type === 'conmiss') return ['Wide', '#ffb3b3']; return null; },
  bg(ctx, st){ const W = st.W, H = st.H, X = u => (u + 11) / 122 * W, Y = v => (v + 1.6) / 73.2 * H;
    ctx.fillStyle = '#245e2c'; ctx.fillRect(0, 0, W, H);
    for(let k = 0; k < 10; k++){ ctx.fillStyle = k % 2 ? '#3b8f40' : '#348838'; ctx.fillRect(X(k * 10), Y(0), X(10) - X(0) + .5, Y(70) - Y(0)); }
    for(const [u0, c] of [[-10, st.cols[0]], [100, st.cols[1]]]){ ctx.fillStyle = '#2f7d34'; ctx.fillRect(X(u0), Y(0), X(10) - X(0), Y(70) - Y(0)); ctx.fillStyle = c + '66'; ctx.fillRect(X(u0), Y(0), X(10) - X(0), Y(70) - Y(0)); }
    ctx.font = CANVAS_FONT(800 + ' ' + Math.round(H * .14)); ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff1c'; ctx.fillText(st.home.abbr, X(50), Y(35) + H * .05);
    ctx.strokeStyle = '#ffffffdd'; ctx.lineWidth = 1.5; ctx.strokeRect(X(-10), Y(0), X(110) - X(-10), Y(70) - Y(0));
    const vl = (u, w, dash) => { ctx.setLineDash(dash || []); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(X(u), Y(0)); ctx.lineTo(X(u), Y(70)); ctx.stroke(); };
    ctx.strokeStyle = '#ffffffee'; vl(0, 2.2); vl(100, 2.2); vl(50, 1.6); ctx.strokeStyle = '#ffffffbb'; vl(22, 1.4); vl(78, 1.4); vl(40, 1.2, [5, 4]); vl(60, 1.2, [5, 4]); vl(5, 1, [2, 5]); vl(95, 1, [2, 5]);
    ctx.setLineDash([4, 8]); ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff66'; for(const v of [5, 15, 55, 65]){ ctx.beginPath(); ctx.moveTo(X(0), Y(v)); ctx.lineTo(X(100), Y(v)); ctx.stroke(); } ctx.setLineDash([]);
    ctx.fillStyle = '#ffffffaa'; ctx.font = CANVAS_FONT('700 ' + Math.round(H * .055)); for(const [u, t] of [[22, '22'], [40, '10'], [50, '50'], [60, '10'], [78, '22']]){ ctx.fillText(t, X(u), Y(9)); ctx.fillText(t, X(u), Y(64)); }
    for(const u of [0, 100]){ const r = Math.max(2.2, W * .006); ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, W * .005); ctx.beginPath(); ctx.moveTo(X(u), Y(32.2)); ctx.lineTo(X(u), Y(37.8)); ctx.stroke(); // posts, top-down
      for(const v of [32.2, 37.8]) dotP(ctx, X(u), Y(v), r, '#fff', '#555'); }
  },
  frame(ctx, e, t, st){
    if(e.type === 'half' || e.type === 'end') return;
    const W = st.W, H = st.H, X = u => (u + 11) / 122 * W, Y = v => (v + 1.6) / 73.2 * H, s = e.side, d = s === 0 ? 1 : -1, U = x => s === 0 ? x : 100 - x, r = Math.max(3.2, W * .0105);
    const kick = ['con', 'conmiss', 'pen', 'penmiss', 'dg'].includes(e.type), k = easeIO(Math.min(1, t * 1.15));
    let att, def, bu, bv, bh = 0, carrier = e.j ?? -1;
    const v = (e.y ?? 50) * .7;
    if(e.type === 'try' || e.type === 'break'){
      const u0 = U(e.x0 ?? 50), u1 = e.type === 'try' ? U(103.5) : U(e.x), f = e.type === 'try' ? Math.min(1, t / .78) : k, ease = easeIO(f), v0 = clamp(v + (e.type === 'try' ? (35 - v) * .35 : 0), 3, 67);
      bu = lerp2(u0, u1, ease); bv = lerp2(v0, v, ease);
      const a0 = rgForm(u0, v0, d, true), d0 = rgForm(u0, v0, d, false);
      att = a0.map(([u, vv], i) => i === carrier ? [bu, bv] : [u + (bu - u0) * (.75 - (i % 4) * .08), lerp2(vv, bv, ease * .25)]);
      def = d0.map(([u, vv], i) => { const c = Math.min(1, ease * (.5 + (i % 5) * .1)); return [lerp2(u, bu - d * (2 + (i % 3) * 2.5), c), lerp2(vv, bv + ((i % 7) - 3) * 2, c)]; });
      if(e.type === 'break' && e.stop && t > .8){ def[0] = [bu + d * .8, bv + .8]; }
      if(e.type === 'try' && t > .78){ ctx.fillStyle = '#ffffff55'; ctx.beginPath(); ctx.arc(X(bu), Y(bv), r * (1.5 + (t - .78) * 12), 0, Math.PI * 2); ctx.fill(); }
    } else if(kick){
      const ku = U(e.x), gu = s === 0 ? 100 : 0, miss = e.type === 'penmiss' || e.type === 'conmiss', tv = 35 + (miss ? (v < 35 ? -1 : 1) * 6.5 : 0), f = clamp((t - .2) / .7, 0, 1);
      carrier = e.type === 'dg' ? 9 : 9;
      if(e.type === 'con' || e.type === 'conmiss' || e.kc){ att = rgForm(ku - d * 12, v, d, true).map(([u, vv], i) => [u - d * 4, lerp2(vv, 35, .3)]); def = Array.from({length:15}, (_, i) => [gu + d * (1.5 + (i % 2) * 1.5), 12 + i * 3.2]); if(e.kc) def = def.map(([u, vv]) => [u + d * 6, vv > 35 ? vv + 18 : vv - 18].map((z, n) => n ? clamp(z, 2, 68) : z)); }
      else { att = rgForm(ku, v, d, true); def = rgForm(ku, v, d, false).map(([u, vv]) => [u + d * 6, vv]); if(e.type === 'pen'){ def = def.map(([u, vv]) => [u + d * 8, vv]); } }
      att[9] = [ku - d * Math.max(0, 1.5 - t * 6), v];
      bu = lerp2(ku, gu + d * (miss ? 2 : 5), f); bv = lerp2(v, tv, f); bh = Math.sin(f * Math.PI) * (12 + Math.abs(gu - ku) * .18) * (f < 1 ? 1 : 0);
      if(t < .2){ bu = ku; bv = v; }
    } else { // turnover / yellow card: the play around a ruck
      const ru = U(e.x ?? 50); bu = ru; bv = v;
      const ad = e.type === 'yc' ? -d : d; att = rgForm(ru, v, ad, true); def = rgForm(ru, v, ad, false); // side = the team that just won the ball (or was penalised, for a card)
      if(e.type === 'turnover'){ const ff = clamp((t - .35) / .65, 0, 1); att[7] = [lerp2(att[7][0], ru - d * .5, Math.min(1, t * 3)), lerp2(att[7][1], v, Math.min(1, t * 3))]; carrier = 8; att[8] = [att[8][0] - d * ff * 3, att[8][1]]; bu = t < .35 ? ru + d * .5 : att[8][0]; bv = t < .35 ? v : att[8][1]; }
      else carrier = 8;
    }
    const as = e.type === 'yc' ? 1 - s : s;
    for(const p of def) dotP(ctx, X(p[0]), Y(p[1]), r, st.cols[1 - as], st.outl[1 - as]);
    for(const [i, p] of att.entries()) dotP(ctx, X(p[0]), Y(p[1]), r * (i === carrier ? 1.22 : 1), st.cols[as], i === carrier ? '#fff' : st.outl[as]);
    if(bh > 0){ ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.ellipse(X(bu), Y(bv), r * .55, r * .3, 0, 0, Math.PI * 2); ctx.fill(); }
    const sz = 1 + bh / 30; ctx.save(); ctx.translate(X(bu), Y(bv) - bh * H / 73.2 * .9); ctx.rotate(kick ? t * 9 : (d > 0 ? 0 : Math.PI)); ctx.fillStyle = '#fbf6ea'; ctx.strokeStyle = '#6b4a1c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, r * .62 * sz, r * .4 * sz, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    if((e.type === 'con' || e.type === 'pen' || e.type === 'dg') && t > .88){ const gu = s === 0 ? 100 : 0; ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(gu), Y(35), r * (1 + (t - .88) * 22), 0, Math.PI * 2); ctx.stroke(); }
    if(e.type === 'yc'){ const cw = W * .07, ch = cw * 1.35; ctx.fillStyle = '#0009'; ctx.fillRect(0, H * .38, W, H * .24); ctx.save(); ctx.translate(W * .3, H * .5); ctx.rotate(-.12); ctx.fillStyle = '#ffd60a'; ctx.fillRect(-cw / 2, -ch / 2, cw, ch); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = CANVAS_FONT('700 ' + Math.round(H * .085)); ctx.textAlign = 'left'; ctx.fillText(`${(s === 0 ? st.home : st.away).abbr} · 10 min`, W * .38, H * .53); ctx.textAlign = 'center'; }
  },
};

// ---------------- the league config ----------------
LG.rugby = {
  id:'rugby', start:6, seasonWord:'season', gameWord:'match', venue:'Stadium', coachWord:'head coach', crest:'hex', starterWord:'Starting XV', pfWord:'Points', pfShort:'PD',
  teams:[['Harbour City', 'Mariners', 'HCM', '#0b3c5d', '#f2b134', 5], ['Capital', 'Ironbarks', 'CAP', '#7a1e3a', '#e9c46a', 5], ['Southport', 'Albatross', 'SPT', '#38a3d6', '#ffffff', 4], ['Riverbend', 'Rams', 'RVB', '#c1121f', '#ffffff', 3],
    ['Highveld', 'Rhinos', 'HVR', '#2b2d42', '#ff8c1a', 4], ['Kingsport', 'Kestrels', 'KGS', '#5b2a86', '#ffd166', 3], ['Westhaven', 'Thunder', 'WHT', '#1b7f3b', '#ffffff', 3], ['Coral Coast', 'Barracudas', 'CCB', '#009b9b', '#ff7b6b', 2],
    ['Granite Bay', 'Stonemasons', 'GBS', '#6c757d', '#e63946', 2], ['Northgate', 'Ravens', 'NGR', '#111111', '#b8b8ff', 2], ['Pine Valley', 'Lumberjacks', 'PVL', '#6b3e1f', '#f4d35e', 1], ['Sunfield', 'Scorchers', 'SUN', '#f77f00', '#1d1d1d', 1]],
  names:() => Math.random() < .55 ? `${pick(RG_FN)} ${pick(RG_LN)}` : personName(),
  pos:{PR:[4, 2], HK:[2, 1], LK:[4, 2], BR:[5, 3], SH:[2, 1], FH:[2, 1], CE:[4, 2], WG:[4, 2], FB:[2, 1]},
  posNames:{PR:'Props', HK:'Hookers', LK:'Locks', BR:'Back row', SH:'Scrum-halves', FH:'Fly-halves', CE:'Centres', WG:'Wings', FB:'Fullbacks'}, posSal:{PR:1, HK:.95, LK:1, BR:1, SH:1.05, FH:1.25, CE:1, WG:1, FB:1.05},
  rosterMax:32, ages:[19, 36], peak:27, draftRounds:2, injRate:.006, injPool:23, hypeMul:1, awardMinGP:8, points:[4, 2, 0],
  reg:{weeks:22, gpw:1, double:true}, po:{teams:4, byConf:false, bestOf:1, name:'finals', rounds:['Semi-finals', 'Grand Final']}, champName:'Super Series',
  money:{cap:11, maxSal:1.3, minSal:.08, tv:14, merch:4, ticket:45, seats:[14000, 32000], seatStep:1500, staff:.006, ops:3, arenaUp:12},
  stats:[['tr', 'TR'], ['pts', 'PTS'], ['con', 'CON'], ['pen', 'PEN'], ['dg', 'DG'], ['tk', 'TK'], ['yc', 'YC']],
  statLine(s, p){ return p && p.pos === 'FH' ? [['Apps', s.gp], ['PTS', s.pts], ['TR', s.tr], ['CON', s.con], ['PEN', s.pen]] : [['Apps', s.gp], ['TR', s.tr], ['PTS', s.pts], ['TK', s.tk], ['YC', s.yc]]; },
  leaders:[['tr', 'Tries', false], ['pts', 'Points', false], ['tk', 'Tackles', false], ['yc', 'Yellow cards', false]],
  records:[['tr', 'Tries in a season'], ['pts', 'Points in a season'], ['tk', 'Tackles in a season']],
  awards:[
    {k:'mvp', n:'Player of the Year', score:(p, t) => (p.st.tr * 2.5 + p.st.pts * .2 + p.st.tk * .12) / p.st.gp * 5 + p.ovr * .3 + lgPct(t) * 12},
    {k:'tries', n:'Top try scorer', score:p => p.st.tr + p.st.pts / 1000},
    {k:'roy', n:'Rookie of the Year', score:p => (p.st.tr * 4 + p.st.pts * .2 + p.st.tk * .12) / p.st.gp + p.st.gp * .3},
  ],
  hofProd:c => c.tr / 9 + c.pts / 150 + c.tk / 200,
  sim:rgSim, render:RG_RENDER,
};
SPORTS.rugby = lgModule('rugby');
