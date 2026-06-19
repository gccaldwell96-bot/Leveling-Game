/* data.js — Coinbase market-data adapter for the browser.
 *
 * Port of src/itc_signals/data/coinbase.py. Pulls the SAME candles a
 * TradingView "COINBASE:BTC-USD" chart shows, straight from Coinbase's free
 * public Exchange API. Newest-first rows of [time, low, high, open, close,
 * volume], up to 300 per request; we page the range and return ascending,
 * de-duplicated bars.
 *
 * Coinbase's public market-data endpoints send permissive CORS headers, so
 * this works from a plain file:// page with no server.
 */
(function (global) {
  "use strict";

  const BASE_URL = "https://api.exchange.coinbase.com";
  const GRANULARITY_SECONDS = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "6h": 21600, "1d": 86400 };
  const MAX_CANDLES = 300;

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function fetchChunk(symbol, startSec, endSec, gran) {
    const url = `${BASE_URL}/products/${symbol}/candles`
      + `?granularity=${gran}`
      + `&start=${new Date(startSec * 1000).toISOString()}`
      + `&end=${new Date(endSec * 1000).toISOString()}`;
    let lastErr = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Coinbase HTTP ${resp.status}`);
        const rows = await resp.json();
        return rows.map((r) => ({
          timestamp: new Date(r[0] * 1000),
          low: +r[1], high: +r[2], open: +r[3], close: +r[4], volume: +r[5],
        }));
      } catch (e) {
        lastErr = e;
        await sleep(350 * (attempt + 1));
      }
    }
    throw new Error("Coinbase request failed: " + lastErr);
  }

  /**
   * getHistory(symbol, start, end, granularity, onProgress) -> Promise<Bar[]>
   * start/end are Date objects. onProgress(done, total) is optional.
   */
  async function getHistory(symbol, start, end, granularity = "1d", onProgress) {
    if (!(granularity in GRANULARITY_SECONDS)) throw new Error("bad granularity " + granularity);
    const gran = GRANULARITY_SECONDS[granularity];
    let cur = Math.floor(start.getTime() / 1000);
    const endSec = Math.floor(end.getTime() / 1000);
    if (cur >= endSec) throw new Error("start must be earlier than end");

    const chunkSpan = gran * MAX_CANDLES;
    const totalChunks = Math.max(1, Math.ceil((endSec - cur) / chunkSpan));
    const byTs = new Map();
    let done = 0;
    while (cur < endSec) {
      const chunkEnd = Math.min(cur + chunkSpan, endSec);
      const bars = await fetchChunk(symbol, cur, chunkEnd, gran);
      for (const b of bars) byTs.set(b.timestamp.getTime(), b);
      cur = chunkEnd;
      done++;
      if (onProgress) onProgress(done, totalChunks);
      await sleep(120); // stay under the public rate limit
    }
    return [...byTs.keys()].sort((a, b) => a - b).map((k) => byTs.get(k));
  }

  global.CoinbaseData = { getHistory, GRANULARITIES: Object.keys(GRANULARITY_SECONDS) };
})(typeof window !== "undefined" ? window : globalThis);
