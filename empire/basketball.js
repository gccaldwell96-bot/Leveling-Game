'use strict';
// =====================================================================================
//  BASKETBALL: Pro Hoops League · 30 teams, 72 games (3 a week), best-of-7 playoffs
//  Possession-by-possession sim with shots, threes, free throws, rebounds, steals, blocks.
// =====================================================================================
const BB_POS = ['PG', 'SG', 'SF', 'PF', 'C'];
const BB_USE = {PG:1.1, SG:1.2, SF:1.1, PF:.95, C:.85}, BB_3 = {PG:.42, SG:.46, SF:.38, PF:.24, C:.07}, BB_AST = {PG:2.4, SG:1.1, SF:1, PF:.7, C:.6}, BB_REB = {PG:.55, SG:.65, SF:.9, PF:1.2, C:1.5}, BB_BLK = {PG:.2, SG:.3, SF:.6, PF:1.2, C:2};
function bbSim(H, A, ctx){
  const sides = [H, A].map((T, si) => { const used = new Set(), st = [];
    for(const pos of BB_POS){ const p = (T.pos[pos] || []).find(x => !used.has(x.id)) || T.all.find(x => !used.has(x.id)); if(p){ used.add(p.id); st.push(p); } }
    const bench = T.all.filter(p => !used.has(p.id)).slice(0, 5); return {T, st, bench, coach:si ? ctx.coachA : ctx.coachH}; });
  const log = [], box = {}, sc = [0, 0], rec = ctx.record;
  const B = p => box[p.id] || (box[p.id] = {pts:0, reb:0, ast:0, stl:0, blk:0, fgm:0, fga:0, tpm:0, tpa:0, ftm:0, fta:0, tov:0, min:0});
  const avg = a => a.reduce((s, p) => s + p.ovr, 0) / Math.max(1, a.length);
  const on = (s, q, clk) => { const x = sides[s], b = x.bench; if(q > 4 || b.length < 4 || clk >= 560 || clk <= 180 || (q === 4 && clk < 420)) return x.st; // starters open and close every quarter
    return clk > 370 ? [x.st[0], x.st[1], b[0], b[1], b[2]] : [x.st[3], x.st[4], b[0], b[3], b[2] || b[1]]; };
  const wpick = (arr, w) => { const ws = arr.map(w), tot = ws.reduce((a, b) => a + b, 0); let r = Math.random() * tot; for(let i = 0; i < arr.length; i++){ r -= ws[i]; if(r <= 0) return i; } return arr.length - 1; };
  const nm = p => `${p.fn[0]}. ${p.ln}`, fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let poss = Math.random() < .5 ? 0 : 1, q = 1, clk = 720;
  const push = (e) => { if(rec) log.push({q, clk:Math.max(0, Math.round(clk)), side:poss, sc:[...sc], ...e}); };
  const qtrs = () => q;
  while(true){
    while(clk > 0){
      const dur = Math.min(clk, clamp(14 + gauss() * 4.5, 4, 24)); clk -= dur;
      const o = on(poss, q, clk), d = on(1 - poss, q, clk), oS = sides[poss], dS = sides[1 - poss];
      for(const p of o) B(p).min += dur / 60; for(const p of d) B(p).min += dur / 60;
      const edge = (avg(o) - avg(d)) / 12 + (poss === 0 ? .15 : -.15) + (oS.coach - dS.coach) / 120;
      const r = Math.random();
      if(r < .125 - edge * .012){ // turnover
        const hi = wpick(o, p => (p.pos === 'PG' ? 2 : 1)), h = o[hi]; B(h).tov++;
        if(Math.random() < .55){ const di = wpick(d, p => (['PG', 'SG'].includes(p.pos) ? 1.5 : 1) * (p.ovr - 40)), df = d[di]; B(df).stl++; push({type:'stl', i:hi, di, txt:`${nm(df)} steals it from ${nm(h)}!`}); }
        else push({type:'tov', i:hi, txt:`Turnover by ${nm(h)}.`});
        poss = 1 - poss; continue; }
      let keep = false;
      const si = wpick(o, p => Math.pow(Math.max(1, p.ovr - 40), 1.6) * BB_USE[p.pos]), sh = o[si], df = d[si] || d[0];
      const three = Math.random() < BB_3[sh.pos] * (clk < 30 && q >= 4 && sc[poss] < sc[1 - poss] ? 1.6 : 1);
      const pm = three ? .355 + (sh.ovr - df.ovr) / 260 + edge * .02 : .515 + (sh.ovr - df.ovr) / 230 + edge * .025 + (sh.pos === 'C' ? .04 : 0);
      const foul = Math.random() < (three ? .025 : .13), made = Math.random() < pm, pts = three ? 3 : 2;
      B(sh).fga++; if(three) B(sh).tpa++;
      const ftp = clamp(.7 + (sh.ovr - 62) / 180 - (sh.pos === 'C' ? .1 : 0), .45, .93);
      if(made){
        B(sh).fgm++; B(sh).pts += pts; if(three) B(sh).tpm++; sc[poss] += pts;
        let ai = -1; if(Math.random() < .62){ ai = wpick(o, (p, i) => i === si ? 0 : BB_AST[p.pos] * (p.ovr - 40)); B(o[ai]).ast++; }
        const dunk = !three && sh.pos !== 'PG' && Math.random() < .22;
        push({type:three ? '3' : '2', i:si, ai, dunk, txt:three ? `${nm(sh)} drains a three!${ai >= 0 ? ` (${nm(o[ai])} assist)` : ''}` : dunk ? `${nm(sh)} throws it down!${ai >= 0 ? ` (${nm(o[ai])} assist)` : ''}` : `${nm(sh)} scores${ai >= 0 ? ` off a ${nm(o[ai])} feed` : ''}.`});
        if(foul){ B(sh).fta++; if(Math.random() < ftp){ B(sh).ftm++; B(sh).pts++; sc[poss]++; push({type:'ft', i:si, made:true, txt:`And one! ${nm(sh)} hits the free throw.`}); } else push({type:'ft', i:si, made:false, txt:`${nm(sh)} misses the and-one free throw.`}); }
      } else if(foul){
        let m = 0; for(let k = 0; k < pts; k++){ B(sh).fta++; if(Math.random() < ftp){ m++; B(sh).ftm++; B(sh).pts++; sc[poss]++; } }
        B(sh).fga--; if(three) B(sh).tpa--;
        push({type:'ft', i:si, made:m > 0, n:pts, m, txt:`${nm(sh)} fouled on the ${three ? 'three' : 'drive'}: ${m}/${pts} from the line.`});
      } else {
        const blk = !three && Math.random() < .08 * BB_BLK[df.pos];
        if(blk) B(df).blk++;
        const oreb = Math.random() < .24 + edge * .01, ri = oreb ? wpick(o, p => BB_REB[p.pos]) : wpick(d, p => BB_REB[p.pos]), rb = oreb ? o[ri] : d[ri]; B(rb).reb++;
        push({type:blk ? 'blk' : 'miss', i:si, three, di:si, ri, oreb, txt:blk ? `REJECTED! ${nm(df)} blocks ${nm(sh)}.` : `${nm(sh)} misses${three ? ' from deep' : ''}. ${oreb ? `Offensive board, ${nm(rb)}.` : `${nm(rb)} rebounds.`}`});
        keep = oreb;
      }
      if(!keep) poss = 1 - poss;
    }
    if(rec) log.push({q, clk:0, side:-1, sc:[...sc], type:'end', txt:q < 4 ? `End of the ${ord(q)} quarter.` : q === 4 ? (sc[0] === sc[1] ? 'Tied at the end of regulation! Overtime.' : 'Final buzzer!') : (sc[0] === sc[1] ? 'Still tied! Another overtime.' : 'Overtime is over!')});
    if(q >= 4 && sc[0] !== sc[1]) break;
    q++; clk = q > 4 ? 300 : 720; poss = q % 2 ? 0 : 1;
  }
  for(const k in box) box[k].min = Math.round(box[k].min);
  return {sc, ot:q > 4, log, box, q:qtrs()};
}

// ---------------- the court ----------------
const BB_RENDER = {
  aspect:.56, otLabel:'OT', startPer:'Q1', startClk:'12:00', startDd:'Tip-off', gap:160,
  dur:e => e.type === 'end' ? 500 : e.type === 'ft' ? 800 : 950,
  hud(e, after, st){ const per = e.q > 4 ? (e.q === 5 ? 'OT' : `${e.q - 4}OT`) : 'Q' + e.q, clk = `${Math.floor(e.clk / 60)}:${String(e.clk % 60).padStart(2, '0')}`;
    const tm = e.side === 0 ? st.home : e.side === 1 ? st.away : null; return {per, clk, dd:tm ? `${tm.abbr} ball` : '', stamp:`${per} ${clk}`}; },
  big:e => (e.type === '3') || e.type === 'blk' || e.type === 'stl' || (e.type === '2' && e.dunk) || e.type === 'end',
  banner(e, st){ if(e.type === '3') return ['Splash!', '#ffe14a']; if(e.type === 'blk') return ['Rejected!', '#fff']; if(e.type === '2' && e.dunk) return ['Slam!', '#fff']; if(e.type === 'stl') return ['Steal!', '#fff']; return null; },
  bg(ctx, st){ const W = st.W, H = st.H, X = x => x / 94 * W, Y = y => y / 50 * H;
    const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#c98d4f'); g.addColorStop(.5, '#d9a066'); g.addColorStop(1, '#c98d4f'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = .08; ctx.fillStyle = '#5a3210'; for(let i = 0; i < 26; i++) ctx.fillRect(0, Y(i * 2), W, 1); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, H - 2);
    ctx.beginPath(); ctx.moveTo(X(47), 0); ctx.lineTo(X(47), H); ctx.stroke();
    ctx.beginPath(); ctx.arc(X(47), Y(25), Y(6), 0, Math.PI * 2); ctx.fillStyle = st.cols[0] + 'aa'; ctx.fill(); ctx.stroke();
    for(const side of [0, 1]){ const hx = side ? 88.75 : 5.25, dir = side ? -1 : 1, base = side ? 94 : 0;
      ctx.fillStyle = (side ? st.cols[0] : st.cols[0]) + 'cc'; ctx.fillRect(Math.min(X(base), X(base + dir * 19)), Y(17), Math.abs(X(19)), Y(16)); ctx.strokeRect(Math.min(X(base), X(base + dir * 19)), Y(17), Math.abs(X(19)), Y(16));
      ctx.beginPath(); ctx.arc(X(base + dir * 19), Y(25), Y(6), side ? Math.PI / 2 : -Math.PI / 2, side ? Math.PI * 1.5 : Math.PI / 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X(base), Y(3)); ctx.lineTo(X(base + dir * 14), Y(3)); ctx.arc(X(hx), Y(25), X(23.75), side ? Math.PI + Math.asin(22 / 23.75) : -Math.asin(22 / 23.75), side ? Math.PI - Math.asin(22 / 23.75) : Math.asin(22 / 23.75), !!side); ctx.lineTo(X(base), Y(47)); ctx.stroke();
      ctx.strokeStyle = '#ff6a00'; ctx.beginPath(); ctx.arc(X(hx), Y(25), X(.9), 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.fillRect(X(base + dir * 4) - 1, Y(22), 2, Y(6)); }
    ctx.font = CANVAS_FONT(800 + ' ' + Math.round(H * .11)); ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff22'; ctx.fillText(st.home.name.toUpperCase(), X(47), Y(27) + H * .04);
  },
  frame(ctx, e, t, st){
    if(e.type === 'end') return;
    const W = st.W, H = st.H, X = x => x / 94 * W, Y = y => y / 50 * H, side = e.side, dir = side === 0 ? 1 : -1, hx = side === 0 ? 88.75 : 5.25;
    const spots = [[-25, 0], [-21, -13], [-21, 13], [-9, -17], [-5, 6]].map(([dx, dy]) => [hx + dir * dx, 25 + dy]);
    const off = spots.map(s => [...s]), def = spots.map(([x, y]) => [x + dir * 3, y + (25 - y) * .15]);
    const k = easeIO(Math.min(1, t * 1.4));
    let bx = off[0][0], by = off[0][1], bh = 0;
    const i = e.i ?? 0;
    if(e.type === 'ft'){ const lane = [[7, 18.5], [7, 31.5], [10.5, 18.5], [10.5, 31.5], [14, 18.5], [14, 31.5]], o2 = [lane[2], lane[3], [26, 14], [26, 36]], d2 = [lane[0], lane[1], lane[4], lane[5], [24, 25]]; let oi = 0;
      for(let n = 0; n < 5; n++){ off[n] = n === i ? [hx - dir * 15, 25] : [hx - dir * o2[oi][0], o2[oi++][1]]; def[n] = [hx - dir * d2[n][0], d2[n][1]]; } const f = t; bx = lerp2(off[i][0], hx, f); by = 25; bh = Math.sin(f * Math.PI) * 4; }
    else if(['2', '3', 'miss', 'blk'].includes(e.type)){
      const three = e.type === '3' || e.three, tgt = three ? [hx - dir * 23, 25 + (spots[i][1] - 25) * 1.1] : [hx - dir * rand(3, 4), 25 + (spots[i][1] - 25) * .25];
      off[i] = [lerp2(spots[i][0], tgt[0], k), lerp2(spots[i][1], tgt[1], k)]; def[i] = [off[i][0] + dir * 2.2, off[i][1]];
      if(t < .35){ const f = t / .35; bx = lerp2(off[0][0], off[i][0], f); by = lerp2(off[0][1], off[i][1], f); }
      else if(t < .85){ const f = (t - .35) / .5; bx = lerp2(off[i][0], hx, f); by = lerp2(off[i][1], 25, f); bh = Math.sin(f * Math.PI) * (three ? 9 : e.dunk ? 1 : 5); if(e.type === 'blk' && f > .3){ bx = lerp2(off[i][0], off[i][0] - dir * 6, (f - .3)); by = off[i][1] + (f - .3) * 10; bh = 0; } }
      else { const f = (t - .85) / .15; if(e.type === 'miss' || e.type === 'blk'){ bx = hx - dir * f * 4; by = 25 + f * 5; } else { bx = hx; by = 25 + f * 1.5; } }
    } else if(e.type === 'stl' || e.type === 'tov'){ const di = e.di ?? i; bx = lerp2(off[i][0], def[di][0], Math.min(1, t * 2)); by = lerp2(off[i][1], def[di][1], Math.min(1, t * 2)); if(t > .5 && e.type === 'stl'){ def[di] = [lerp2(def[di][0], 47, (t - .5) * 2), def[di][1]]; bx = def[di][0]; by = def[di][1]; } }
    const r = Math.max(4, W * .014);
    for(let n = 0; n < 5; n++) dotP(ctx, X(def[n][0]), Y(def[n][1]), r, st.cols[1 - side], st.outl[1 - side]);
    for(let n = 0; n < 5; n++) dotP(ctx, X(off[n][0]), Y(off[n][1]), r * (n === i ? 1.2 : 1), st.cols[side], st.outl[side]);
    dotP(ctx, X(bx), Y(by) - bh * H / 50, r * .62, '#e8701a', '#4a2008');
    if((e.type === '2' || e.type === '3') && t > .85){ ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(hx), Y(25), X(1.6 + (t - .85) * 8), 0, Math.PI * 2); ctx.stroke(); }
  },
};

// ---------------- the league config ----------------
LG.basketball = {
  id:'basketball', start:42, seasonWord:'season', gameWord:'game', venue:'Arena', coachWord:'head coach', crest:'round', starterWord:'Starter', pfWord:'Points',
  teams:[['New York', 'Skyline', 'NYS', '#0b2265', '#f58426', 5], ['Brooklyn', 'Bridges', 'BKN', '#111111', '#d1d1d1', 5], ['Boston', 'Minutemen', 'BOS', '#007a33', '#ba9653', 4], ['Philadelphia', 'Liberty', 'PHL', '#006bb6', '#ed174c', 4], ['Toronto', 'Wolves', 'TOR', '#ce1141', '#1a1a1a', 4],
    ['Miami', 'Heatwave', 'MIA', '#98002e', '#f9a01b', 4], ['Atlanta', 'Peaches', 'ATL', '#e03a3e', '#fdb927', 3], ['Charlotte', 'Monarchs', 'CHA', '#1d1160', '#00788c', 2], ['Orlando', 'Comets', 'ORL', '#0077c0', '#c4ced4', 3], ['Washington', 'Senators', 'WAS', '#002b5c', '#e31837', 3],
    ['Chicago', 'Gusts', 'CHI', '#ce1141', '#1a1a1a', 5], ['Detroit', 'Gears', 'DET', '#c8102e', '#1d42ba', 3], ['Cleveland', 'Rockers', 'CLE', '#860038', '#fdbb30', 2], ['Indianapolis', 'Racers', 'IND', '#002d62', '#fdbb30', 2], ['Milwaukee', 'Stags', 'MIL', '#00471b', '#eee1c6', 2],
    ['Los Angeles', 'Dream', 'LAD', '#552583', '#fdb927', 5], ['Los Angeles', 'Waves', 'LAW', '#1d428a', '#c8102e', 5], ['San Francisco', 'Fog', 'SF', '#1d428a', '#ffc72c', 5], ['Sacramento', 'Gold', 'SAC', '#5a2d81', '#c4ced4', 2], ['Phoenix', 'Flare', 'PHX', '#1d1160', '#e56020', 3],
    ['Denver', 'Altitude', 'DEN', '#0e2240', '#fec524', 3], ['Utah', 'Summit', 'UTA', '#002b5c', '#f9a01b', 2], ['Portland', 'Pines', 'POR', '#e03a3e', '#1a1a1a', 2], ['Seattle', 'Rain', 'SEA', '#00653a', '#ffc200', 4], ['Dallas', 'Mavens', 'DAL', '#00538c', '#b8c4ca', 4],
    ['Houston', 'Orbit', 'HOU', '#ce1141', '#c4ced4', 4], ['San Antonio', 'Missions', 'SA', '#1a1a1a', '#c4ced4', 2], ['Memphis', 'Blues', 'MEM', '#5d76a9', '#12173f', 2], ['Oklahoma City', 'Twisters', 'OKC', '#007ac1', '#ef3b24', 2], ['Las Vegas', 'High Rollers', 'LV', '#1a1a1a', '#c4a24a', 3]],
  confs:['Eastern Conference', 'Western Conference'],
  pos:{PG:[3, 1], SG:[3, 1], SF:[3, 1], PF:[3, 1], C:[3, 1]}, posNames:{PG:'Point guards', SG:'Shooting guards', SF:'Small forwards', PF:'Power forwards', C:'Centers'},
  rosterMax:15, ages:[19, 38], peak:27, draftRounds:2, injRate:.0035, injPool:10, hypeMul:.45, awardMinGP:40,
  reg:{weeks:24, gpw:3}, po:{teams:16, byConf:true, bestOf:7, name:'playoffs', rounds:['First round', 'Conference semifinals', 'Conference finals', 'Hoops Finals']}, champName:'Hoops Championship',
  money:{cap:125, maxSal:46, minSal:1.1, tv:240, merch:32, ticket:105, seats:[17500, 20500], seatStep:1000, staff:.08, ops:30, arenaUp:110},
  stats:[['pts', 'PTS'], ['reb', 'REB'], ['ast', 'AST'], ['stl', 'STL'], ['blk', 'BLK'], ['fgm', 'FGM'], ['fga', 'FGA'], ['tpm', '3PM'], ['tpa', '3PA'], ['ftm', 'FTM'], ['fta', 'FTA'], ['tov', 'TOV'], ['min', 'MIN']],
  statLine(s){ const g = Math.max(1, s.gp), pg = k => (s[k] / g).toFixed(1); return [['GP', s.gp], ['PTS', pg('pts')], ['REB', pg('reb')], ['AST', pg('ast')], ['FG%', s.fga ? (s.fgm / s.fga * 100).toFixed(0) : '-']]; },
  leaders:[['pts', 'Points per game', true], ['reb', 'Rebounds per game', true], ['ast', 'Assists per game', true], ['stl', 'Steals per game', true], ['blk', 'Blocks per game', true], ['tpm', 'Threes made', false]],
  records:[['pts', 'Points in a season'], ['reb', 'Rebounds in a season'], ['ast', 'Assists in a season'], ['tpm', 'Threes in a season'], ['blk', 'Blocks in a season']],
  awards:[
    {k:'mvp', n:'MVP', score:(p, t) => (p.st.pts + p.st.reb * 1.1 + p.st.ast * 1.4 + (p.st.stl + p.st.blk) * 2) / p.st.gp + lgPct(t) * 14},
    {k:'dpoy', n:'Defensive Player', score:(p, t) => (p.st.stl * 2.6 + p.st.blk * 2.6 + p.st.reb * .5) / p.st.gp + p.ovr / 25},
    {k:'roy', n:'Rookie of the Year', score:(p) => (p.st.pts + p.st.reb + p.st.ast * 1.3) / p.st.gp},
  ],
  hofProd:c => c.pts / 900 + c.reb / 420 + c.ast / 320 + (c.stl + c.blk) / 200,
  sim:bbSim, render:BB_RENDER,
};
SPORTS.basketball = lgModule('basketball');
