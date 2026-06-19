# iTrustCapital — Algorithmic Trading POC

A **leadership-facing proof of concept** for the iTrustCapital algorithmic-trading
product. A user composes a strategy from indicators + rules, backtests it on
**live Coinbase price history**, and sees the **signal** the strategy would fire
into ITC — all in the browser, no install, no server.

> **How to run:** double-click `index.html`. That's it. (Needs internet for the
> Coinbase price feed.)

## What it demonstrates

- **The bot builder** — pick indicators (SMA, EMA, RSI, MACD, ROC, Donchian, …),
  wire entry/exit rules (`fast crosses_above slow`, `rsi < 30`, …), run it.
- **Real backtests, net of fees** — equity curve vs. buy & hold, alpha, CAGR,
  Sharpe, max drawdown, win rate, and **fee drag** (fees are the whole game at
  ITC's ~40 bps/trade).
- **The signal contract** — the stream of target-weight signals the strategy
  would emit. *This repo stops at the signal; ITC owns execution.*
- **Honest scope** — long-only, no leverage, enforced structurally.

## Try it

1. Open `index.html`.
2. Pick a preset (e.g. *MACD momentum*) or build your own.
3. Choose a symbol / window / fee, click **Run backtest**.
4. Read the cards, the equity curve, and the emitted signal stream.

## Architecture

Pure client-side JavaScript, **no dependencies, no build step**:

| File | Role |
|---|---|
| `index.html` | UI shell + styling |
| `app.js` | builder UI, presets, run flow, canvas chart |
| `engine.js` | indicators + backtest engine + metrics — a faithful JS port of the Python `itc-algo-signals` engine |
| `data.js` | Coinbase public-API adapter (paged candle fetch) |

### Relationship to `itc-algo-signals`

`engine.js` mirrors the tested Python engine in the sibling `itc-algo-signals`
repo (`builder/indicators.py`, `builder/composite.py`, `backtest/engine.py`,
`backtest/metrics.py`) — same contract: **spec in → backtest out**. Python
remains the source of truth for production / Phase 2 live signals; this JS port
exists so the POC runs anywhere with zero setup.

Verify the port locally (portable Node):

```bash
export PATH="$PATH:/c/Users/GregoryCaldwell/node-v22.11.0-win-arm64"
node -e "require('./engine.js'); console.log(Object.keys(globalThis.ITCEngine))"
```

## Notes / next steps

- Data is fetched live each run — nothing is stored, results reproduce exactly.
- Multi-timeframe indicators are scaffolded in the spec but not yet evaluated
  (same limitation as the Python engine).
- This is a POC: it's meant to be extended (more indicators, strategy catalog,
  client opt-in flow) — the files are kept small and dependency-free for that.
