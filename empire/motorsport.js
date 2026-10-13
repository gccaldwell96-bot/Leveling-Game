'use strict';
// =====================================================================================
//  The two motorsport championships that run on racing.js
// =====================================================================================
RC.f1 = {
  start:9, champName:'Grand Prix Championship', teamTitle:'Constructors\' champions', coachWord:'team principal', engWord:'Power unit', peak:29, ages:[18, 42], hypeMul:1,
  devMax:4, devNote:'Each package costs more than the last, and the cost cap allows four per area per season.',
  teams:[['Apex Racing', 'APX', '#c8102e', '#ffd23f', 5, 1.4], ['Meridian GP', 'MER', '#9aa5b1', '#00a19b', 5, 1.6], ['Volt Racing', 'VLT', '#0b1f4d', '#ffcc00', 4, 1.2], ['Falcon Motorsport', 'FAL', '#ff8000', '#1e3d8f', 4, .8], ['Aurora F1', 'AUR', '#00594f', '#c9f24d', 3, .3],
    ['Kestrel Racing', 'KES', '#1d63d6', '#ffffff', 3, -.2], ['Titan Grand Prix', 'TTN', '#141414', '#d4af37', 3, -.4], ['Nordic Racing', 'NRD', '#f2f4f7', '#0057b8', 2, -.7], ['Solaris GP', 'SOL', '#ffd100', '#1a1a1a', 2, -1], ['Vanguard Racing', 'VGD', '#5b2a86', '#f2a900', 2, -1.4]],
  raceWeeks:[0, 2, 3, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 24, 25, 27, 28, 30, 31, 33, 35, 37],
  tracks:{types:{street:{n:'Street circuit', aero:.65, eng:.35, pass:1.7, crash:1.8}, power:{n:'High-speed circuit', aero:.3, eng:.7, pass:.8, crash:.8}, balanced:{n:'Classic circuit', aero:.5, eng:.5, pass:1, crash:1}},
    list:[['Bahrain Grand Prix', 'balanced', 57], ['Jeddah Grand Prix', 'street', 50], ['Melbourne Grand Prix', 'street', 58], ['Suzuka Grand Prix', 'balanced', 53], ['Shanghai Grand Prix', 'balanced', 56], ['Miami Grand Prix', 'street', 57], ['Imola Grand Prix', 'balanced', 63], ['Monaco Grand Prix', 'street', 78],
      ['Montreal Grand Prix', 'power', 70], ['Barcelona Grand Prix', 'balanced', 66], ['Spielberg Grand Prix', 'power', 71], ['Silverstone Grand Prix', 'balanced', 52], ['Budapest Grand Prix', 'balanced', 70], ['Spa Grand Prix', 'power', 44], ['Zandvoort Grand Prix', 'balanced', 72],
      ['Monza Grand Prix', 'power', 53], ['Baku Grand Prix', 'street', 51], ['Singapore Grand Prix', 'street', 62], ['Austin Grand Prix', 'balanced', 56], ['Mexico City Grand Prix', 'power', 71], ['São Paulo Grand Prix', 'balanced', 71], ['Abu Dhabi Grand Prix', 'balanced', 58]]},
  segs:12, pitSegs:[4, 8], passes:2, passHard:1.5, raceNoise:2.2, qNoise:1.4, formNoise:1.6, carW:.62, relRisk:.025, crashRisk:.005, caution:1, cautionWord:'Safety car', pitText:'🛞 Pit stops: fresh tyres all round.',
  points:[25, 18, 15, 12, 10, 8, 6, 4, 2, 1], dnfPts:false, gridGap:.4, gapBase:.9, gapK:.28, lapSec:90,
  money:{tv:130, prizeStep:9, sponsor:85, purse:0, ops:150, staff:.12, maxSal:45, minSal:1, upgrade:9},
};
RC.nascar = {
  start:6, champName:'Stock Car Cup', teamTitle:'Owners\' champions', coachWord:'crew chief', engWord:'Engine', peak:32, ages:[18, 46], hypeMul:.7, oval:true,
  devMax:5, devNote:'Every upgrade costs more than the last; five per area per season.',
  teams:[['Thunder Road Racing', 'TRR', '#c8102e', '#111111', 5, 1.4], ['Blue Ridge Motorsports', 'BRM', '#1d4ed8', '#ffffff', 4, 1.2], ['Gulf Coast Racing', 'GCR', '#00a3ad', '#ff6f00', 4, 1], ['Iron Horse Motorsports', 'IHM', '#3a3a3a', '#f2a900', 4, .9],
    ['Lone Star Speed', 'LSS', '#002868', '#bf0a30', 5, .7], ['Carolina Crown Racing', 'CCR', '#4b2e83', '#ffd100', 3, .6], ['Peachtree Motorsports', 'PCH', '#ff7f50', '#1a1a1a', 3, .3], ['Big Sky Racing', 'BSR', '#87ceeb', '#0b3d91', 2, .1],
    ['Bayou Racing', 'BYU', '#006b3f', '#f5c400', 2, 0], ['Rust Belt Motorsports', 'RBM', '#8b2500', '#d9d9d9', 2, -.2], ['Desert Storm Racing', 'DSR', '#c2a878', '#5a3825', 2, -.4], ['Harbor Light Racing', 'HLR', '#0a2342', '#2ca58d', 3, -.5],
    ['Pine Hollow Racing', 'PHR', '#1b4d3e', '#ffffff', 1, -.8], ['Black Diamond Motorsports', 'BDM', '#111111', '#9ad1ff', 2, -1], ['Steel City Racing', 'SCR', '#ffb612', '#101820', 2, -1.2], ['Golden Gate Racing', 'GGR', '#c0362c', '#f0b323', 3, -1.4]],
  nums:[[3, 8], [24, 48], [11, 19], [9, 99], [20, 22], [5, 12], [1, 14], [6, 17], [10, 41], [2, 21], [34, 38], [42, 43], [7, 47], [16, 51], [23, 45], [4, 77]],
  raceWeeks:Array.from({length:40}, (_, i) => i).filter(i => ![7, 15, 23, 31].includes(i)),
  tracks:{types:{super:{n:'Superspeedway', aero:.3, eng:.7, pass:.5, crash:1.4}, inter:{n:'Intermediate oval', aero:.5, eng:.5, pass:.8, crash:1}, short:{n:'Short track', aero:.6, eng:.4, pass:1.2, crash:1.3}, road:{n:'Road course', aero:.7, eng:.3, pass:1.3, crash:1}},
    list:[['Palm Coast 500', 'super', 200], ['Desert Sun 400', 'inter', 267], ['Valley Speedway 400', 'inter', 200], ['Thunder Valley 500', 'short', 500], ['Red Clay 400', 'short', 400], ['Magnolia 500', 'super', 188], ['Lone Star 400', 'inter', 267], ['Mountain Pass Road Course', 'road', 90], ['Bluegrass 300', 'inter', 200],
      ['Coastal 400', 'inter', 267], ['Iron City 250', 'short', 250], ['Prairie 400', 'inter', 267], ['Harbor 350', 'short', 350], ['Canyon 500', 'super', 188], ['Pine Ridge 300', 'inter', 300], ['Lakeside Road Course', 'road', 68], ['Night Lights 500', 'short', 500], ['Championship 312', 'inter', 312]]},
  segs:15, pitSegs:[3, 7, 11], passes:4, passHard:.6, raceNoise:2.5, qNoise:2, formNoise:4.5, carW:.5, relRisk:.022, crashRisk:.006, caution:1, cautionWord:'Caution', pitText:'🛞 Everyone pits: four tyres and fuel.', bigOne:true,
  points:[40, ...Array.from({length:35}, (_, i) => 35 - i)], dnfPts:true, gridGap:.18, gapBase:.25, gapK:.1, lapSec:30,
  chase:{start:26, cuts:[[29, 12], [32, 8], [35, 4]]},
  money:{tv:14, prizeStep:.8, sponsor:12, purse:.3, ops:36, staff:.015, maxSal:8, minSal:.3, upgrade:1.5},
};
SPORTS.f1 = rcModule('f1');
SPORTS.nascar = rcModule('nascar');
