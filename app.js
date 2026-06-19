/* app.js — UI for the iTrustCapital strategy-builder POC.
 *
 * Builds a BotSpec from the controls, fetches Coinbase history, runs the
 * (ported) engine, and renders metrics + a dependency-free canvas chart +
 * the emitted signal stream. No frameworks, no CDN — opens from file://.
 */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const E = ITCEngine;

  // ---- option sources ------------------------------------------------------
  const SYMBOLS = ["BTC-USD", "ETH-USD", "SOL-USD", "LTC-USD", "LINK-USD", "DOGE-USD"];
  const GRANS = [["1d", "Daily"], ["6h", "6-hour"], ["1h", "Hourly"]];
  // indicator type -> the param fields it accepts (with defaults)
  const IND_PARAMS = {
    SMA: { period: 20 }, EMA: { period: 20 }, RSI: { period: 14 },
    MACD: { fast: 12, slow: 26 }, MACD_SIGNAL: { fast: 12, slow: 26, signal: 9 },
    ROC: { lookback: 20 }, DONCHIAN_HIGH: { lookback: 20 }, DONCHIAN_LOW: { lookback: 20 },
    PRICE: {},
  };

  // ---- presets (each = a complete builder state) ---------------------------
  const PRESETS = {
    "SMA 6/9 crossover": {
      indicators: [
        { id: "fast", type: "SMA", params: { period: 6 } },
        { id: "slow", type: "SMA", params: { period: 9 } },
      ],
      entryLogic: "all", entry: [{ left: "fast", op: "crosses_above", right: "slow" }],
      exitLogic: "any", exit: [{ left: "fast", op: "crosses_below", right: "slow" }],
    },
    "MACD momentum": {
      indicators: [
        { id: "macd", type: "MACD", params: { fast: 45, slow: 90 } },
        { id: "sig", type: "MACD_SIGNAL", params: { fast: 45, slow: 90, signal: 9 } },
      ],
      entryLogic: "all", entry: [{ left: "macd", op: "crosses_above", right: "sig" }],
      exitLogic: "any", exit: [{ left: "macd", op: "crosses_below", right: "sig" }],
    },
    "RSI mean-reversion": {
      indicators: [{ id: "rsi", type: "RSI", params: { period: 14 } }],
      entryLogic: "all", entry: [{ left: "rsi", op: "<", right: 30 }],
      exitLogic: "any", exit: [{ left: "rsi", op: ">", right: 55 }],
    },
    "Donchian breakout": {
      indicators: [
        { id: "hi", type: "DONCHIAN_HIGH", params: { lookback: 20 } },
        { id: "lo", type: "DONCHIAN_LOW", params: { lookback: 10 } },
      ],
      entryLogic: "all", entry: [{ left: "close", op: ">", right: "hi" }],
      exitLogic: "any", exit: [{ left: "close", op: "<", right: "lo" }],
    },
  };

  // ---- small DOM helpers ---------------------------------------------------
  function opt(value, label) { const o = document.createElement("option"); o.value = value; o.textContent = label || value; return o; }
  function fillSelect(sel, items) { items.forEach((it) => sel.appendChild(Array.isArray(it) ? opt(it[0], it[1]) : opt(it))); }

  // operand choices = declared indicator ids + bar fields; right side also allows a number
  function operandOptions() {
    const ids = [...$("indicators").querySelectorAll(".indrow")].map((r) => r.querySelector(".ind-id").value).filter(Boolean);
    return [...ids, ...E.SOURCES];
  }

  // ---- indicator rows ------------------------------------------------------
  function addIndicator(preset) {
    const wrap = $("indicators");
    const row = document.createElement("div");
    row.className = "indrow";
    const id = document.createElement("input"); id.className = "ind-id"; id.placeholder = "id"; id.value = preset ? preset.id : "ind" + (wrap.children.length + 1);
    const type = document.createElement("select"); type.className = "ind-type"; fillSelect(type, Object.keys(IND_PARAMS));
    if (preset) type.value = preset.type;
    const params = document.createElement("input"); params.className = "ind-params"; params.placeholder = "period=20";
    const del = document.createElement("button"); del.className = "x"; del.textContent = "×";
    function syncParamPlaceholder() {
      const defs = IND_PARAMS[type.value];
      params.placeholder = Object.entries(defs).map(([k, v]) => `${k}=${v}`).join(", ") || "(no params)";
    }
    type.onchange = () => { syncParamPlaceholder(); if (!params.value) params.value = paramStr(IND_PARAMS[type.value]); refreshOperands(); };
    id.oninput = refreshOperands;
    del.onclick = () => { row.remove(); refreshOperands(); };
    row.append(id, type, params, del);
    wrap.appendChild(row);
    syncParamPlaceholder();
    params.value = preset ? paramStr(preset.params) : paramStr(IND_PARAMS[type.value]);
    refreshOperands();
  }
  function paramStr(obj) { return Object.entries(obj).map(([k, v]) => `${k}=${v}`).join(", "); }
  function parseParams(s) {
    const out = {};
    s.split(",").map((p) => p.trim()).filter(Boolean).forEach((p) => {
      const [k, v] = p.split("=").map((x) => x.trim());
      if (k) out[k] = isNaN(+v) ? v : +v;
    });
    return out;
  }

  // ---- condition rows (entry / exit) --------------------------------------
  function addCondition(which, preset) {
    const wrap = $(which);
    const row = document.createElement("div");
    row.className = "cond";
    const left = document.createElement("select"); left.className = "c-left";
    const op = document.createElement("select"); op.className = "c-op"; fillSelect(op, E.OPERATORS);
    const right = document.createElement("input"); right.className = "c-right"; right.placeholder = "id or number";
    const del = document.createElement("button"); del.className = "x"; del.textContent = "×";
    del.onclick = () => row.remove();
    fillSelect(left, operandOptions());
    if (preset) { left.value = preset.left; op.value = preset.op; right.value = preset.right; }
    row.append(left, op, right, del);
    wrap.appendChild(row);
  }

  function refreshOperands() {
    const opts = operandOptions();
    document.querySelectorAll(".c-left").forEach((sel) => {
      const cur = sel.value; sel.innerHTML = ""; fillSelect(sel, opts);
      if (opts.includes(cur)) sel.value = cur;
    });
  }

  // ---- logic toggles -------------------------------------------------------
  function setupLogic(boxId) {
    const box = $(boxId);
    box.querySelectorAll("button").forEach((b) => {
      b.onclick = () => { box.querySelectorAll("button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); };
    });
  }
  function logicValue(boxId) { return $(boxId).querySelector("button.on").dataset.v; }

  // ---- build the spec from the form ---------------------------------------
  function readSpec() {
    const indicators = {};
    $("indicators").querySelectorAll(".indrow").forEach((r) => {
      const id = r.querySelector(".ind-id").value.trim();
      if (!id) return;
      indicators[id] = Object.assign({ type: r.querySelector(".ind-type").value }, parseParams(r.querySelector(".ind-params").value));
    });
    const readConds = (which) => [...$(which).querySelectorAll(".cond")].map((r) => {
      const left = r.querySelector(".c-left").value;
      const rawRight = r.querySelector(".c-right").value.trim();
      const right = rawRight !== "" && !isNaN(+rawRight) ? +rawRight : rawRight;
      return { left, op: r.querySelector(".c-op").value, right };
    });
    const entry = readConds("entry"), exit = readConds("exit");
    return {
      name: currentPresetName || "custom strategy",
      indicators,
      entry: { [logicValue("entryLogic")]: entry },
      exit: { [logicValue("exitLogic")]: exit },
      size: 1.0,
    };
  }

  // ---- apply a preset ------------------------------------------------------
  let currentPresetName = "SMA 6/9 crossover";
  function applyPreset(name) {
    currentPresetName = name;
    const p = PRESETS[name];
    $("indicators").innerHTML = ""; $("entry").innerHTML = ""; $("exit").innerHTML = "";
    p.indicators.forEach((i) => addIndicator(i));
    setLogic("entryLogic", p.entryLogic); setLogic("exitLogic", p.exitLogic);
    p.entry.forEach((c) => addCondition("entry", c));
    p.exit.forEach((c) => addCondition("exit", c));
  }
  function setLogic(boxId, v) {
    $(boxId).querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.v === v));
  }

  // ---- formatting ----------------------------------------------------------
  const pct = (x) => (x >= 0 ? "+" : "") + (x * 100).toFixed(1) + "%";
  const money = (x) => "$" + Math.round(x).toLocaleString();
  const fdate = (d) => new Date(d).toISOString().slice(0, 10);

  // ---- run -----------------------------------------------------------------
  let lastResult = null;
  async function run() {
    const btn = $("run");
    $("builderErr").innerHTML = "";
    const symbol = $("symbol").value;
    const granularity = $("granularity").value;
    const start = new Date($("start").value + "T00:00:00Z");
    const end = new Date($("end").value + "T00:00:00Z");
    const fee = +$("fee").value, equity = +$("equity").value;

    let spec;
    try { spec = readSpec(); E.parseBotSpec(spec, granularity); }
    catch (e) { return showError(e.message); }

    btn.disabled = true;
    try {
      btn.textContent = "Fetching Coinbase history…";
      const bars = await CoinbaseData.getHistory(symbol, start, end, granularity,
        (d, t) => { btn.textContent = `Fetching Coinbase history… ${d}/${t}`; });
      btn.textContent = "Running backtest…";
      const res = E.runSpec({ bot: spec, symbol, granularity, fee_bps: fee, starting_equity: equity }, bars);
      lastResult = res;
      render(res);
    } catch (e) {
      showError(e.message || String(e));
    } finally {
      btn.disabled = false; btn.textContent = "Run backtest";
    }
  }

  function showError(msg) {
    $("builderErr").innerHTML = `<div class="err">${msg}</div>`;
  }

  // ---- render results ------------------------------------------------------
  function render(res) {
    const m = res.metrics;
    const beats = res.alpha >= 0;
    $("resultMeta").textContent = `· ${res.bot} on ${res.symbol} · ${res.window.bars} bars · ${fdate(res.window.start)} → ${fdate(res.window.end)} · ${res.fee_bps} bps`;

    const cards = [
      ["Net return", pct(m.total_return), m.total_return >= 0 ? "good" : "bad"],
      ["Alpha vs buy & hold", pct(res.alpha) + (beats ? "  ▲" : "  ▼"), beats ? "good" : "bad"],
      ["Buy & hold", pct(res.benchmark.buy_and_hold_return), ""],
      ["Final equity", money(res.final_equity), res.final_equity >= res.starting_equity ? "good" : "bad"],
      ["CAGR", pct(m.cagr), m.cagr >= 0 ? "good" : "bad"],
      ["Sharpe", m.sharpe.toFixed(2), m.sharpe >= 1 ? "good" : ""],
      ["Max drawdown", pct(m.max_drawdown), "bad"],
      ["Win rate", (m.win_rate * 100).toFixed(0) + "%", ""],
      ["Trades", String(m.num_trades), ""],
      ["Fee drag", pct(-res.fee_drag), "bad"],
    ];
    $("cards").innerHTML = cards.map(([k, v, c]) =>
      `<div class="card"><div class="k">${k}</div><div class="v ${c}">${v}</div></div>`).join("");

    // current emitted signal = last target weight
    const last = res.trades[res.trades.length - 1];
    const side = last ? last.side : "FLAT";
    const wt = last ? last.target_weight : 0;
    $("signal").innerHTML = `
      <div class="card signal-box">
        <div>
          <div class="k">Signal ITC would currently receive</div>
          <div class="muted" style="margin-top:4px;">target-weight semantics — ITC sizes per client account</div>
        </div>
        <div style="margin-left:auto" class="signal-pill ${side}">${side} · ${(wt * 100).toFixed(0)}% ${res.symbol}</div>
      </div>`;

    renderTrades(res.trades);
    drawChart(res);
  }

  function renderTrades(trades) {
    const tb = $("trades").querySelector("tbody");
    $("tradeCount").textContent = trades.length ? `· ${trades.length} signals` : "";
    if (!trades.length) { tb.innerHTML = ""; $("tradesEmpty").style.display = "block"; return; }
    $("tradesEmpty").style.display = "none";
    const rows = trades.slice().reverse().slice(0, 200);
    tb.innerHTML = rows.map((t) =>
      `<tr><td>${fdate(t.timestamp)}</td><td><span class="chip ${t.side}" style="color:${t.side === "BUY" ? "var(--good)" : "var(--warn)"}">${t.side}</span></td>`
      + `<td>${(t.target_weight * 100).toFixed(0)}%</td><td>$${t.close.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td></tr>`).join("");
  }

  // ---- canvas chart (no dependencies) -------------------------------------
  function drawChart(res) {
    const canvas = $("chart");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const strat = res.equity_curve, bh = res.benchmark_curve;
    const pad = { l: 64, r: 12, t: 12, b: 26 };
    const x0 = pad.l, x1 = w - pad.r, y0 = pad.t, y1 = h - pad.b;

    const all = strat.concat(bh).map((p) => p[1]);
    let lo = Math.min(...all), hi = Math.max(...all);
    if (lo === hi) { lo *= 0.99; hi *= 1.01; }
    const t0 = strat[0][0].getTime ? strat[0][0].getTime() : +strat[0][0];
    const tN = strat[strat.length - 1][0].getTime ? strat[strat.length - 1][0].getTime() : +strat[strat.length - 1][0];

    // log scale handles crypto's huge range cleanly
    const lLo = Math.log10(Math.max(lo, 1e-9)), lHi = Math.log10(hi);
    const sx = (t) => x0 + ((t - t0) / (tN - t0)) * (x1 - x0);
    const sy = (v) => y1 - ((Math.log10(Math.max(v, 1e-9)) - lLo) / (lHi - lLo)) * (y1 - y0);

    // gridlines + y labels (log ticks)
    ctx.font = "11px sans-serif"; ctx.textBaseline = "middle";
    ctx.strokeStyle = "#263252"; ctx.fillStyle = "#8da0c5"; ctx.lineWidth = 1;
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const v = Math.pow(10, lLo + (i / ticks) * (lHi - lLo));
      const y = sy(v);
      ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.textAlign = "right"; ctx.fillText("$" + Math.round(v).toLocaleString(), x0 - 8, y);
    }
    // x labels (start / mid / end years)
    ctx.textAlign = "center";
    [t0, (t0 + tN) / 2, tN].forEach((t) => ctx.fillText(new Date(t).getFullYear(), sx(t), y1 + 14));

    function line(curve, color, width) {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
      curve.forEach((p, i) => {
        const t = p[0].getTime ? p[0].getTime() : +p[0];
        const x = sx(t), y = sy(p[1]);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    }
    line(bh, "#8da0c5", 1.5);
    line(strat, "#4f8cff", 2);
  }

  // ---- init ----------------------------------------------------------------
  function init() {
    fillSelect($("symbol"), SYMBOLS);
    fillSelect($("granularity"), GRANS);
    setupLogic("entryLogic"); setupLogic("exitLogic");

    const today = new Date();
    $("end").value = today.toISOString().slice(0, 10);
    $("start").value = "2018-01-01";

    Object.keys(PRESETS).forEach((name) => {
      const b = document.createElement("button"); b.textContent = name;
      b.onclick = () => applyPreset(name);
      $("presets").appendChild(b);
    });

    $("addInd").onclick = () => addIndicator();
    $("addEntry").onclick = () => addCondition("entry");
    $("addExit").onclick = () => addCondition("exit");
    $("run").onclick = run;

    applyPreset("SMA 6/9 crossover");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
