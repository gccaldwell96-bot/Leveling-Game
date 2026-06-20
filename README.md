# iTrustCapital — Algorithmic Trading POC

A **leadership-facing proof of concept** for iTrustCapital's algorithmic-trading
product. It's the branded multi-screen iTrustCapital prototype with a **real
backtest engine wired in** behind the Strategy Builder — clients compose a bot
from indicators + rules, and "Run backtest" actually fetches **live Coinbase
price history** and runs a real, fee-aware backtest in the browser.

> **How to run:** double-click `index.html`. No install, no server.
> (Needs internet for the Coinbase price feed.)
>
> `index.html` is **fully self-contained** — the engine and data adapter are
> inlined, so the single file works anywhere you put it (no sibling files
> required). `engine.js` / `data.js` are kept as readable source + for the Node
> verification below; edits there must be re-inlined into `index.html`.

## Screens

- **Home dashboard** — Roth IRA overview (click *My Assets* → Portfolio Details).
- **Portfolio Details** — holdings, cost basis, allocation, value chart, activity.
- **Build a Trading Strategy** chooser — the two product directions:
  - **Premade Basket** → baskets grid, **Basket Details** page, and a working
    **Build-a-Basket** tool (pick assets, set weights, normalize to 100%).
  - **Professional Quant Strategies** → copy-trading concept screen.
  - **Make Your Own** → the **Strategy Builder** (the functional core).
- **Strategy Builder** — drag up to 10 indicators into Entry/Exit lanes, set
  params, read the plain-language summary, and **Run a real backtest**.

## What's real vs. concept

| Part | Status |
|---|---|
| Strategy Builder → Run backtest | **Real** — live Coinbase data, real engine, real metrics + equity curve |
| All 15 indicators in the library | **Real** — each ports to the engine and backtests |
| Build-a-Basket tool | **Real** — composes/normalizes a basket, adds it to the grid |
| Baskets / Quant copy-trading numbers | Concept (illustrative data) for the leadership story |
| Portfolio holdings | Illustrative sample |

## Architecture

Pure client-side JavaScript, **no dependencies, no build step**:

| File | Role |
|---|---|
| `index.html` | the full branded UI + integration script (translator, backtest wiring, new screens) |
| `engine.js` | indicators (26 types) + backtest engine + metrics — a faithful JS port of the Python `itc-algo-signals` engine |
| `data.js` | Coinbase public-API adapter (paged candle fetch, in-browser) |

### How the builder becomes a backtest

The Strategy Builder's signal cards (e.g. *RSI(14) crosses below 30*, *EMA golden
cross*, *MACD bullish crossover*, *price tags lower Bollinger band*) are
**translated** into the engine's `BotSpec` contract — indicators + an entry/exit
rule tree — then run through the same `runSpec()` pipeline as the Python engine.
Same contract: **spec in → backtest out**, long-only, net of 40 bps/trade.

### Relationship to `itc-algo-signals`

`engine.js` mirrors the tested Python engine in the sibling `itc-algo-signals`
repo. Python stays the source of truth for production / Phase 2 live signals;
this JS port exists so the POC runs anywhere with zero setup. Verify the port
with the portable Node:

```bash
export PATH="$PATH:/c/Users/GregoryCaldwell/node-v22.11.0-win-arm64"
node -e "require('./engine.js'); console.log(Object.keys(globalThis.ITCEngine.INDICATORS).length+' indicators')"
```

## Notes / next steps

- Data is fetched live each run — nothing is stored; results reproduce exactly.
- Timeframes map to Coinbase granularities (5m/15m/1h/6h/1d).
- Built to be extended: more screens, a saved strategy catalog, ETH/SOL
  cross-asset validation, an exec-summary view.
