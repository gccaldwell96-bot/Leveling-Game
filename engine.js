/* engine.js — pure-JS port of the itc-algo-signals Python engine.
 *
 * This is a faithful re-implementation of:
 *   src/itc_signals/builder/indicators.py   (streaming indicators)
 *   src/itc_signals/builder/composite.py     (BotSpec -> Strategy bridge)
 *   src/itc_signals/builder/spec.py          (spec validation)
 *   src/itc_signals/backtest/engine.py       (event-driven backtest loop)
 *   src/itc_signals/backtest/metrics.py      (performance metrics)
 *
 * Same contract: spec in -> backtest out. Long-only, no leverage, net of fees.
 * Kept deliberately close to the Python so the two stay in sync.
 *
 * No dependencies. Runs in any browser, including from file://.
 */
(function (global) {
  "use strict";

  // ---- bar fields a client may point an indicator at -----------------------
  const SOURCES = ["open", "high", "low", "close", "volume"];
  const BUILTIN_OPERANDS = SOURCES;
  const OPERATORS = [">", "<", ">=", "<=", "crosses_above", "crosses_below"];

  // periods per year by bar size, for annualizing Sharpe / CAGR
  const PERIODS_PER_YEAR = {
    "1m": 525600, "5m": 105120, "15m": 35040,
    "1h": 8760, "6h": 1460, "1d": 365, // crypto trades every day
  };

  function src(bar, source) { return Number(bar[source]); }

  // =========================================================================
  // Indicators — each consumes one bar at a time, returns value or null while
  // warming up. Mirrors indicators.py exactly.
  // =========================================================================

  function SMA(period = 20, source = "close") {
    if (period < 1) throw new Error("period must be >= 1");
    let win = [];
    return {
      reset() { win = []; },
      update(bar) {
        win.push(src(bar, source));
        if (win.length > period) win.shift();
        if (win.length < period) return null;
        return win.reduce((a, b) => a + b, 0) / win.length;
      },
    };
  }

  function EMA(period = 20, source = "close") {
    if (period < 1) throw new Error("period must be >= 1");
    const alpha = 2.0 / (period + 1);
    let ema = null, count = 0;
    return {
      reset() { ema = null; count = 0; },
      update(bar) {
        const x = src(bar, source);
        ema = ema === null ? x : ema + alpha * (x - ema);
        count += 1;
        return count >= period ? ema : null;
      },
    };
  }

  function RSI(period = 14, source = "close") {
    if (period < 1) throw new Error("period must be >= 1");
    let prev = null, gains = [], losses = [];
    return {
      reset() { prev = null; gains = []; losses = []; },
      update(bar) {
        const x = src(bar, source);
        if (prev !== null) {
          const change = x - prev;
          gains.push(Math.max(change, 0.0));
          losses.push(Math.max(-change, 0.0));
          if (gains.length > period) gains.shift();
          if (losses.length > period) losses.shift();
        }
        prev = x;
        if (gains.length < period) return null;
        const avgGain = gains.reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
        if (avgLoss === 0) return 100.0;
        const rs = avgGain / avgLoss;
        return 100.0 - 100.0 / (1.0 + rs);
      },
    };
  }

  function MACD(fast = 12, slow = 26, source = "close") {
    if (!(fast >= 1 && fast < slow)) throw new Error("require 1 <= fast < slow");
    const af = 2.0 / (fast + 1), as = 2.0 / (slow + 1);
    let emaFast = null, emaSlow = null, count = 0;
    return {
      reset() { emaFast = emaSlow = null; count = 0; },
      update(bar) {
        const x = src(bar, source);
        emaFast = emaFast === null ? x : emaFast + af * (x - emaFast);
        emaSlow = emaSlow === null ? x : emaSlow + as * (x - emaSlow);
        count += 1;
        return count >= slow ? emaFast - emaSlow : null;
      },
    };
  }

  function MACDSignal(fast = 12, slow = 26, signal = 9, source = "close") {
    const macd = MACD(fast, slow, source);
    const asig = 2.0 / (signal + 1);
    let sig = null;
    return {
      reset() { macd.reset(); sig = null; },
      update(bar) {
        const m = macd.update(bar);
        if (m === null) return null;
        sig = sig === null ? m : sig + asig * (m - sig);
        return sig;
      },
    };
  }

  function ROC(lookback = 20, source = "close") {
    if (lookback < 1) throw new Error("lookback must be >= 1");
    let win = [];
    return {
      reset() { win = []; },
      update(bar) {
        win.push(src(bar, source));
        if (win.length > lookback + 1) win.shift();
        if (win.length < lookback + 1 || win[0] === 0) return null;
        return (win[win.length - 1] - win[0]) / win[0];
      },
    };
  }

  function DonchianHigh(lookback = 20) {
    if (lookback < 1) throw new Error("lookback must be >= 1");
    let highs = [];
    return {
      reset() { highs = []; },
      update(bar) {
        const value = highs.length === lookback ? Math.max(...highs) : null;
        highs.push(bar.high);
        if (highs.length > lookback) highs.shift();
        return value;
      },
    };
  }

  function DonchianLow(lookback = 20) {
    if (lookback < 1) throw new Error("lookback must be >= 1");
    let lows = [];
    return {
      reset() { lows = []; },
      update(bar) {
        const value = lows.length === lookback ? Math.min(...lows) : null;
        lows.push(bar.low);
        if (lows.length > lookback) lows.shift();
        return value;
      },
    };
  }

  function Price(source = "close") {
    if (!SOURCES.includes(source)) throw new Error("bad source " + source);
    return { reset() {}, update(bar) { return src(bar, source); } };
  }

  // =========================================================================
  // Extended TA library — the 12 indicators the Strategy Builder UI exposes
  // beyond the core set. Each keeps the same streaming contract
  // (update(bar) -> value | null, reset()). Standard textbook formulas;
  // where a UI "state" needs two operands (e.g. price vs a band) we expose
  // the comparable numeric series and let the rule layer do the comparison.
  // =========================================================================

  const _max = (a) => Math.max.apply(null, a);
  const _min = (a) => Math.min.apply(null, a);
  const _avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;

  // True range, shared by ATR / ADX / Keltner.
  function _trueRange(bar, prevClose) {
    if (prevClose === null) return bar.high - bar.low;
    return Math.max(bar.high - bar.low, Math.abs(bar.high - prevClose), Math.abs(bar.low - prevClose));
  }

  // Wilder's smoothing (RMA) — used by ATR and ADX.
  function _wilder(period) {
    let val = null, seed = [], n = 0;
    return {
      reset() { val = null; seed = []; n = 0; },
      push(x) {
        n += 1;
        if (val === null) { seed.push(x); if (seed.length === period) { val = _avg(seed); } return val; }
        val = (val * (period - 1) + x) / period;
        return val;
      },
      get() { return val; },
    };
  }

  function Stochastic(period = 14) {
    let hs = [], ls = [];
    return {
      reset() { hs = []; ls = []; },
      update(bar) {
        hs.push(bar.high); ls.push(bar.low);
        if (hs.length > period) { hs.shift(); ls.shift(); }
        if (hs.length < period) return null;
        const hh = _max(hs), ll = _min(ls);
        return hh === ll ? 50 : 100 * (bar.close - ll) / (hh - ll);
      },
    };
  }

  function WilliamsR(period = 14) {
    let hs = [], ls = [];
    return {
      reset() { hs = []; ls = []; },
      update(bar) {
        hs.push(bar.high); ls.push(bar.low);
        if (hs.length > period) { hs.shift(); ls.shift(); }
        if (hs.length < period) return null;
        const hh = _max(hs), ll = _min(ls);
        return hh === ll ? -50 : -100 * (hh - bar.close) / (hh - ll);
      },
    };
  }

  function CCI(period = 20) {
    let tps = [];
    return {
      reset() { tps = []; },
      update(bar) {
        const tp = (bar.high + bar.low + bar.close) / 3;
        tps.push(tp);
        if (tps.length > period) tps.shift();
        if (tps.length < period) return null;
        const sma = _avg(tps);
        const md = _avg(tps.map((x) => Math.abs(x - sma)));
        return md === 0 ? 0 : (tp - sma) / (0.015 * md);
      },
    };
  }

  function MFI(period = 14) {
    let prevTp = null, pos = [], neg = [];
    return {
      reset() { prevTp = null; pos = []; neg = []; },
      update(bar) {
        const tp = (bar.high + bar.low + bar.close) / 3;
        const rmf = tp * bar.volume;
        if (prevTp !== null) {
          pos.push(tp > prevTp ? rmf : 0);
          neg.push(tp < prevTp ? rmf : 0);
          if (pos.length > period) { pos.shift(); neg.shift(); }
        }
        prevTp = tp;
        if (pos.length < period) return null;
        const sp = pos.reduce((a, b) => a + b, 0), sn = neg.reduce((a, b) => a + b, 0);
        if (sn === 0) return 100;
        return 100 - 100 / (1 + sp / sn);
      },
    };
  }

  function ATR(period = 14) {
    const w = _wilder(period); let prevClose = null;
    return {
      reset() { w.reset(); prevClose = null; },
      update(bar) { const tr = _trueRange(bar, prevClose); prevClose = bar.close; return w.push(tr); },
    };
  }

  function ADX(period = 14) {
    const trS = _wilder(period), pS = _wilder(period), mS = _wilder(period), adxS = _wilder(period);
    let prevHigh = null, prevLow = null, prevClose = null;
    return {
      reset() { trS.reset(); pS.reset(); mS.reset(); adxS.reset(); prevHigh = prevLow = prevClose = null; },
      update(bar) {
        if (prevClose === null) { prevHigh = bar.high; prevLow = bar.low; prevClose = bar.close; return null; }
        const up = bar.high - prevHigh, down = prevLow - bar.low;
        const pDM = up > down && up > 0 ? up : 0;
        const mDM = down > up && down > 0 ? down : 0;
        const tr = _trueRange(bar, prevClose);
        prevHigh = bar.high; prevLow = bar.low; prevClose = bar.close;
        const trv = trS.push(tr), pv = pS.push(pDM), mv = mS.push(mDM);
        if (trv === null || trv === 0) return null;
        const pDI = 100 * pv / trv, mDI = 100 * mv / trv;
        const denom = pDI + mDI;
        const dx = denom === 0 ? 0 : 100 * Math.abs(pDI - mDI) / denom;
        return adxS.push(dx);
      },
    };
  }

  function PSAR(step = 0.02, maxStep = 0.2) {
    let sar = null, ep = null, af = step, long = true, prev = null, started = false;
    return {
      reset() { sar = ep = prev = null; af = step; long = true; started = false; },
      update(bar) {
        if (prev === null) { prev = bar; return null; }
        if (!started) {
          long = bar.close >= prev.close;
          sar = long ? Math.min(prev.low, bar.low) : Math.max(prev.high, bar.high);
          ep = long ? bar.high : bar.low; af = step; started = true; prev = bar; return sar;
        }
        sar = sar + af * (ep - sar);
        if (long) {
          sar = Math.min(sar, prev.low, bar.low);
          if (bar.high > ep) { ep = bar.high; af = Math.min(af + step, maxStep); }
          if (bar.low < sar) { long = false; sar = ep; ep = bar.low; af = step; }
        } else {
          sar = Math.max(sar, prev.high, bar.high);
          if (bar.low < ep) { ep = bar.low; af = Math.min(af + step, maxStep); }
          if (bar.high > sar) { long = true; sar = ep; ep = bar.high; af = step; }
        }
        prev = bar;
        return sar;
      },
    };
  }

  // midpoint of (highest high + lowest low) / 2 over `period` — Ichimoku lines.
  function _midpoint(period) {
    let hs = [], ls = [];
    return {
      reset() { hs = []; ls = []; },
      update(bar) {
        hs.push(bar.high); ls.push(bar.low);
        if (hs.length > period) { hs.shift(); ls.shift(); }
        if (hs.length < period) return null;
        return (_max(hs) + _min(ls)) / 2;
      },
    };
  }
  function IchiTenkan(period = 9) { return _midpoint(period); }
  function IchiKijun(period = 26) { return _midpoint(period); }

  // Cloud top/bottom: max/min of the two leading spans, displaced forward 26.
  function _ichiCloud(which, conv = 9, base = 26, spanB = 52, shift = 26) {
    const t = _midpoint(conv), k = _midpoint(base), b = _midpoint(spanB);
    let buf = [];
    return {
      reset() { t.reset(); k.reset(); b.reset(); buf = []; },
      update(bar) {
        const tv = t.update(bar), kv = k.update(bar), bv = b.update(bar);
        let val = null;
        if (tv !== null && kv !== null && bv !== null) {
          const senkouA = (tv + kv) / 2, senkouB = bv;
          val = which === "top" ? Math.max(senkouA, senkouB) : Math.min(senkouA, senkouB);
        }
        buf.push(val);
        if (buf.length <= shift) return null;
        return buf[buf.length - 1 - shift];
      },
    };
  }

  function _bollinger(which, period = 20, k = 2) {
    let win = [];
    return {
      reset() { win = []; },
      update(bar) {
        win.push(bar.close);
        if (win.length > period) win.shift();
        if (win.length < period) return null;
        const m = _avg(win);
        const sd = Math.sqrt(_avg(win.map((x) => (x - m) * (x - m))));
        return which === "upper" ? m + k * sd : which === "lower" ? m - k * sd : m;
      },
    };
  }

  function _keltner(which, period = 20, mult = 2) {
    const ema = EMA(period, "close"), atr = ATR(period);
    return {
      reset() { ema.reset(); atr.reset(); },
      update(bar) {
        const e = ema.update(bar), a = atr.update(bar);
        if (e === null || a === null) return null;
        return which === "upper" ? e + mult * a : e - mult * a;
      },
    };
  }

  // On-balance-volume slope (OBV minus its previous value): >0 rising, <0 falling.
  function OBVSlope() {
    let obv = 0, prevClose = null, prevObv = null;
    return {
      reset() { obv = 0; prevClose = prevObv = null; },
      update(bar) {
        if (prevClose !== null) {
          if (bar.close > prevClose) obv += bar.volume;
          else if (bar.close < prevClose) obv -= bar.volume;
        }
        prevClose = bar.close;
        const slope = prevObv === null ? null : obv - prevObv;
        prevObv = obv;
        return slope;
      },
    };
  }

  // Anchored VWAP (cumulative from the first bar of the window).
  function VWAP() {
    let pv = 0, vol = 0;
    return {
      reset() { pv = 0; vol = 0; },
      update(bar) {
        const tp = (bar.high + bar.low + bar.close) / 3;
        pv += tp * bar.volume; vol += bar.volume;
        return vol === 0 ? null : pv / vol;
      },
    };
  }

  // registry: spec `type` -> factory. Mirrors INDICATORS in indicators.py
  // plus the extended UI library.
  const INDICATORS = {
    SMA: (p) => SMA(p.period, p.source),
    EMA: (p) => EMA(p.period, p.source),
    RSI: (p) => RSI(p.period, p.source),
    MACD: (p) => MACD(p.fast, p.slow, p.source),
    MACD_SIGNAL: (p) => MACDSignal(p.fast, p.slow, p.signal, p.source),
    ROC: (p) => ROC(p.lookback, p.source),
    DONCHIAN_HIGH: (p) => DonchianHigh(p.lookback),
    DONCHIAN_LOW: (p) => DonchianLow(p.lookback),
    PRICE: (p) => Price(p.source),
    STOCH: (p) => Stochastic(p.period),
    WILLR: (p) => WilliamsR(p.period),
    CCI: (p) => CCI(p.period),
    MFI: (p) => MFI(p.period),
    ATR: (p) => ATR(p.period),
    ADX: (p) => ADX(p.period),
    PSAR: (p) => PSAR(p.step, p.max),
    ICHI_TENKAN: (p) => IchiTenkan(p.period),
    ICHI_KIJUN: (p) => IchiKijun(p.period),
    ICHI_CLOUD_TOP: (p) => _ichiCloud("top", p.conv, p.base, p.spanB),
    ICHI_CLOUD_BOT: (p) => _ichiCloud("bot", p.conv, p.base, p.spanB),
    BB_UPPER: (p) => _bollinger("upper", p.period, p.k),
    BB_LOWER: (p) => _bollinger("lower", p.period, p.k),
    KC_UPPER: (p) => _keltner("upper", p.period, p.mult),
    KC_LOWER: (p) => _keltner("lower", p.period, p.mult),
    OBV_SLOPE: () => OBVSlope(),
    VWAP: () => VWAP(),
  };

  function buildIndicator(spec) {
    const type = spec.type;
    if (!(type in INDICATORS)) throw new BuilderError("unknown indicator type " + type);
    const params = {};
    for (const k of Object.keys(spec)) {
      if (k !== "type" && k !== "timeframe") params[k] = spec[k];
    }
    return INDICATORS[type](params);
  }

  // =========================================================================
  // Spec validation — mirrors spec.py parse_bot_spec / _validate_rule.
  // =========================================================================

  class BuilderError extends Error {}

  function validateOperand(operand, ids, where) {
    if (typeof operand === "number" && !Number.isNaN(operand)) return;
    if (typeof operand === "string") {
      if (ids.has(operand) || BUILTIN_OPERANDS.includes(operand)) return;
      throw new BuilderError(`${where}: operand '${operand}' is not a declared indicator id or bar field`);
    }
    throw new BuilderError(`${where}: operand must be an id, bar field, or number`);
  }

  function validateRule(node, ids, where) {
    if (typeof node !== "object" || node === null || Array.isArray(node))
      throw new BuilderError(`${where}: rule must be an object`);
    if ("all" in node || "any" in node) {
      const key = "all" in node ? "all" : "any";
      const children = node[key];
      if (!Array.isArray(children) || children.length === 0)
        throw new BuilderError(`${where}.${key}: must be a non-empty list of rules`);
      children.forEach((c, i) => validateRule(c, ids, `${where}.${key}[${i}]`));
      return;
    }
    if ("not" in node) { validateRule(node.not, ids, `${where}.not`); return; }
    for (const req of ["left", "op", "right"]) {
      if (!(req in node)) throw new BuilderError(`${where}: leaf rule missing '${req}'`);
    }
    if (!OPERATORS.includes(node.op))
      throw new BuilderError(`${where}: unknown op '${node.op}'`);
    validateOperand(node.left, ids, `${where}.left`);
    validateOperand(node.right, ids, `${where}.right`);
  }

  function parseBotSpec(raw, baseGranularity) {
    if (typeof raw !== "object" || raw === null) throw new BuilderError("bot spec must be an object");
    const indicators = raw.indicators;
    if (typeof indicators !== "object" || indicators === null || Object.keys(indicators).length === 0)
      throw new BuilderError("bot.indicators must be a non-empty object of id -> indicator");
    for (const [iid, ispec] of Object.entries(indicators)) {
      if (typeof ispec !== "object" || !("type" in ispec))
        throw new BuilderError(`indicator '${iid}' must be an object with a 'type'`);
      if (!(ispec.type in INDICATORS))
        throw new BuilderError(`indicator '${iid}': unknown type '${ispec.type}'`);
      const tf = ispec.timeframe || baseGranularity;
      if (tf !== baseGranularity)
        throw new BuilderError(`indicator '${iid}': multi-timeframe is not implemented yet`);
    }
    const ids = new Set(Object.keys(indicators));
    if (!("entry" in raw) || !("exit" in raw))
      throw new BuilderError("bot spec requires both 'entry' and 'exit' rules");
    validateRule(raw.entry, ids, "entry");
    validateRule(raw.exit, ids, "exit");
    const size = Number(raw.size == null ? 1.0 : raw.size);
    if (!(size > 0.0 && size <= 1.0)) throw new BuilderError(`size must be in (0, 1]; got ${size}`);
    return {
      name: String(raw.name == null ? "untitled" : raw.name),
      indicators, entry: raw.entry, exit: raw.exit, size,
      metadata: raw.metadata || {},
    };
  }

  // =========================================================================
  // CompositeStrategy — mirrors composite.py. flat+entry -> long(size),
  // long+exit -> flat. Structurally long-only.
  // =========================================================================

  function CompositeStrategy(spec, symbol) {
    const indicators = {};
    for (const [iid, s] of Object.entries(spec.indicators)) indicators[iid] = buildIndicator(s);
    let prevEnv = null, pos = 0.0;

    function operand(op, cur, prev) {
      if (typeof op === "string") return [cur[op], prev[op]];
      return [op, op]; // numeric constant
    }

    function evalLeaf(node, cur, prev) {
      const [lc, lp] = operand(node.left, cur, prev);
      const [rc, rp] = operand(node.right, cur, prev);
      const op = node.op;
      const nul = (v) => v === null || v === undefined;
      if (op === "crosses_above") {
        if (nul(lc) || nul(lp) || nul(rc) || nul(rp)) return false;
        return lp <= rp && lc > rc;
      }
      if (op === "crosses_below") {
        if (nul(lc) || nul(lp) || nul(rc) || nul(rp)) return false;
        return lp >= rp && lc < rc;
      }
      if (nul(lc) || nul(rc)) return false;
      if (op === ">") return lc > rc;
      if (op === "<") return lc < rc;
      if (op === ">=") return lc >= rc;
      if (op === "<=") return lc <= rc;
      return false;
    }

    function evalNode(node, cur, prev) {
      if ("all" in node) return node.all.every((c) => evalNode(c, cur, prev));
      if ("any" in node) return node.any.some((c) => evalNode(c, cur, prev));
      if ("not" in node) return !evalNode(node.not, cur, prev);
      return evalLeaf(node, cur, prev);
    }

    return {
      strategy_id: "bot::" + spec.name,
      symbol,
      reset() { for (const ind of Object.values(indicators)) ind.reset(); prevEnv = null; pos = 0.0; },
      on_bar(bar) {
        const env = {};
        for (const [iid, ind] of Object.entries(indicators)) env[iid] = ind.update(bar);
        for (const name of BUILTIN_OPERANDS) env[name] = Number(bar[name]);
        const prev = prevEnv;
        if (prev !== null) {
          if (pos === 0.0 && evalNode(spec.entry, env, prev)) pos = spec.size;
          else if (pos > 0.0 && evalNode(spec.exit, env, prev)) pos = 0.0;
        }
        prevEnv = env;
        return pos;
      },
    };
  }

  // =========================================================================
  // BacktestEngine — mirrors engine.py. Mark-to-market, fee on weight delta,
  // signal emitted on every target change.
  // =========================================================================

  function runBacktest(strategy, bars, startingEquity = 10000.0, feeBps = 40.0) {
    strategy.reset();
    let equity = startingEquity;
    let prevWeight = 0.0;
    let prevClose = null;
    const curve = [];
    const returns = [];
    const signals = [];

    for (const bar of bars) {
      if (prevClose !== null && prevClose > 0) {
        const pct = (bar.close - prevClose) / prevClose;
        const pnl = prevWeight * pct;
        equity *= 1 + pnl;
        returns.push(pnl);
      }
      let target = strategy.on_bar(bar);
      target = Math.max(-1.0, Math.min(1.0, target));
      if (target !== prevWeight) {
        const cost = Math.abs(target - prevWeight) * (feeBps / 10000.0);
        equity *= 1 - cost;
        const side = target > 0 ? "BUY" : target < 0 ? "SELL" : "FLAT";
        signals.push({
          timestamp: bar.timestamp, strategy_id: strategy.strategy_id,
          symbol: strategy.symbol, target_weight: target, side,
          reason: "target weight change", close: bar.close,
        });
        prevWeight = target;
      }
      curve.push([bar.timestamp, equity]);
      prevClose = bar.close;
    }
    return { equity_curve: curve, returns, signals, bars: bars.length,
      starting_equity: startingEquity, final_equity: equity };
  }

  // =========================================================================
  // Metrics — mirrors metrics.py.
  // =========================================================================

  function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
  function std(a) {
    if (a.length < 2) return 0;
    const m = mean(a);
    return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / a.length);
  }

  function maxDrawdown(curve) {
    let peak = -Infinity, mdd = 0.0;
    for (const [, eq] of curve) {
      peak = Math.max(peak, eq);
      if (peak > 0) mdd = Math.min(mdd, (eq - peak) / peak);
    }
    return mdd;
  }

  function computeMetrics(result, periodsPerYear = 365) {
    const rets = result.returns;
    const starting = result.starting_equity, final = result.final_equity;
    const totalReturn = starting > 0 ? final / starting - 1.0 : 0.0;
    const n = rets.length;
    let cagr = 0.0;
    if (n > 0 && starting > 0 && final > 0) cagr = Math.pow(final / starting, periodsPerYear / n) - 1.0;
    let sharpe = 0.0;
    const sd = std(rets);
    if (n > 1 && sd > 0) sharpe = (mean(rets) / sd) * Math.sqrt(periodsPerYear);
    const nonzero = rets.filter((r) => r !== 0);
    const winRate = nonzero.length ? nonzero.filter((r) => r > 0).length / nonzero.length : 0.0;
    return {
      total_return: totalReturn, cagr, sharpe,
      max_drawdown: maxDrawdown(result.equity_curve),
      win_rate: winRate, num_trades: result.signals.length,
    };
  }

  function buyAndHoldReturn(bars) {
    if (bars.length < 2 || bars[0].close <= 0) return 0.0;
    return bars[bars.length - 1].close / bars[0].close - 1.0;
  }

  // Buy & hold equity curve, for charting alongside the strategy.
  function buyAndHoldCurve(bars, startingEquity) {
    const c0 = bars[0].close;
    return bars.map((b) => [b.timestamp, startingEquity * (b.close / c0)]);
  }

  // =========================================================================
  // Top-level: run a spec end-to-end (mirrors builder/service.py run_backtest).
  // =========================================================================

  function runSpec(request, bars) {
    const granularity = request.granularity || "1d";
    const feeBps = request.fee_bps == null ? 40.0 : Number(request.fee_bps);
    const startingEquity = request.starting_equity == null ? 10000.0 : Number(request.starting_equity);
    const spec = parseBotSpec(request.bot, granularity);
    if (bars.length < 2) throw new BuilderError("not enough data in the requested window");

    const strategy = CompositeStrategy(spec, request.symbol);
    const ppy = PERIODS_PER_YEAR[granularity];
    const net = runBacktest(strategy, bars, startingEquity, feeBps);
    const gross = runBacktest(strategy, bars, startingEquity, 0.0);
    const metrics = computeMetrics(net, ppy);
    const bh = buyAndHoldReturn(bars);
    const feeDrag = (gross.final_equity - net.final_equity) / startingEquity;

    return {
      ok: true, bot: spec.name, symbol: request.symbol, granularity,
      window: { start: bars[0].timestamp, end: bars[bars.length - 1].timestamp, bars: bars.length },
      fee_bps: feeBps, metrics,
      benchmark: { buy_and_hold_return: bh },
      alpha: metrics.total_return - bh,
      fee_drag: feeDrag,
      final_equity: net.final_equity,
      starting_equity: startingEquity,
      trades: net.signals,
      equity_curve: net.equity_curve,
      benchmark_curve: buyAndHoldCurve(bars, startingEquity),
    };
  }

  global.ITCEngine = {
    SOURCES, OPERATORS, INDICATORS, PERIODS_PER_YEAR, BuilderError,
    parseBotSpec, CompositeStrategy, runBacktest, computeMetrics,
    buyAndHoldReturn, buyAndHoldCurve, runSpec,
  };
})(typeof window !== "undefined" ? window : globalThis);
