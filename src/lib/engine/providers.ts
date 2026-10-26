import type { Candle, MarketType, ProviderId, ProviderMeta } from "../types";
import { SYMBOL_CATALOG } from "../symbols";
import { httpGetJson, httpPostJson } from "./http";

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "twelvedata",
    label: "Twelve Data",
    tagline: "Real-time forex, crypto, stocks & indices with one key.",
    requiresKey: true,
    keyUrl: "https://twelvedata.com/",
    docsUrl: "https://twelvedata.com/docs",
    markets: ["forex", "crypto", "stocks", "indices", "etf", "commodities"],
    symbolStyle: "slash",
    accent: "from-amber-500 to-orange-500",
  },
  {
    id: "alphavantage",
    label: "Alpha Vantage",
    tagline: "Classic stock & FX data with technical indicators.",
    requiresKey: true,
    keyUrl: "https://www.alphavantage.co/support/#api-key",
    docsUrl: "https://www.alphavantage.co/documentation/",
    markets: ["forex", "stocks", "crypto", "etf", "indices", "commodities"],
    symbolStyle: "plain",
    accent: "from-sky-500 to-blue-600",
  },
  {
    id: "finnhub",
    label: "Finnhub",
    tagline: "Broker-grade global market coverage with exchange prefixes.",
    requiresKey: true,
    keyUrl: "https://finnhub.io/",
    docsUrl: "https://finnhub.io/docs/api",
    markets: ["forex", "stocks", "crypto", "indices", "etf"],
    symbolStyle: "dash",
    accent: "from-violet-500 to-purple-600",
  },
  {
    id: "polygon",
    label: "Polygon.io",
    tagline: "Institutional-grade aggregates for stocks, FX and crypto.",
    requiresKey: true,
    keyUrl: "https://polygon.io/",
    docsUrl: "https://polygon.io/docs/rest/stocks/aggregates/custom-bars",
    markets: ["stocks", "forex", "crypto", "indices", "etf"],
    symbolStyle: "plain",
    accent: "from-emerald-500 to-teal-600",
  },
  {
    id: "yahoo",
    label: "Yahoo Finance",
    tagline: "Zero-key market data for equities, indices, FX and crypto.",
    requiresKey: false,
    keyUrl: "https://finance.yahoo.com/",
    docsUrl: "https://query1.finance.yahoo.com/v8/finance/chart/",
    markets: ["stocks", "indices", "crypto", "forex", "etf", "commodities"],
    symbolStyle: "plain",
    accent: "from-rose-500 to-pink-600",
  },
  {
    id: "binance",
    label: "Binance",
    tagline: "Exchange-native crypto klines with full history.",
    requiresKey: false,
    keyUrl: "https://www.binance.com/en/my/settings/api-management",
    docsUrl: "https://binance-docs.github.io/apidocs/spot/en/#klinecandlestick-data",
    markets: ["crypto"],
    symbolStyle: "binance",
    accent: "from-yellow-400 to-amber-500",
  },
  {
    id: "coinbase",
    label: "Coinbase",
    tagline: "Simple REST candles for the top crypto pairs.",
    requiresKey: false,
    keyUrl: "https://www.coinbase.com/settings/api",
    docsUrl: "https://docs.cdp.coinbase.com/exchange/reference/exchangerestapi_getproductcandles",
    markets: ["crypto"],
    symbolStyle: "dash",
    accent: "from-blue-500 to-indigo-600",
  },
  {
    id: "tradingview",
    label: "TradingView",
    tagline: "TradingView screener oscillators + live market feed.",
    requiresKey: false,
    keyUrl: "https://www.tradingview.com/",
    docsUrl: "https://www.tradingview.com/screener/",
    markets: ["forex", "crypto", "stocks", "indices", "commodities", "etf"],
    symbolStyle: "dot",
    accent: "from-cyan-400 to-sky-500",
  },
  {
    id: "demo",
    label: "Demo / Simulated",
    tagline: "Deterministic synthetic candles so you can test instantly.",
    requiresKey: false,
    markets: ["forex", "crypto", "stocks", "indices", "commodities", "etf"],
    symbolStyle: "plain",
    accent: "from-zinc-500 to-slate-600",
  },
];

export const PROVIDER_MAP: Record<string, ProviderMeta> = Object.fromEntries(
  PROVIDERS.map((p) => [p.id, p]),
);

export function providerLabel(id: ProviderId | string): string {
  return PROVIDER_MAP[id]?.label ?? String(id);
}

function stripDots(symbol: string): string {
  return symbol.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function baseQuote(symbol: string): { base: string; quote: string } {
  const parts = symbol.split(/[\/\-:_]/).filter(Boolean);
  if (parts.length >= 2) return { base: parts[0].toUpperCase(), quote: parts[1].toUpperCase() };
  const known: Record<string, string> = {
    BTCUSDT: "USDT",
    ETHUSDT: "USDT",
    SOLUSDT: "USDT",
    BNBUSDT: "USDT",
    XRPUSDT: "USDT",
    ADAUSDT: "USDT",
    DOGEUSDT: "USDT",
    AVAXUSDT: "USDT",
    MATICUSDT: "USDT",
    LINKUSDT: "USDT",
    DOTUSDT: "USDT",
    LTCUSDT: "USDT",
    ATOMUSDT: "USDT",
    TRXUSDT: "USDT",
    ARBUSDT: "USDT",
    OPUSDT: "USDT",
    BTCUSD: "USD",
    ETHUSD: "USD",
    SOLUSD: "USD",
  };
  const flat = stripDots(symbol);
  if (known[flat]) return { base: flat.slice(0, flat.length - known[flat].length), quote: known[flat] };
  return { base: flat, quote: "USD" };
}

export function formatSymbol(provider: ProviderId, market: MarketType, exchange: string, symbol: string): string {
  const { base, quote } = baseQuote(symbol);
  const clean = symbol.trim();
  switch (provider) {
    case "twelvedata":
      if (market === "forex" || market === "crypto") {
        const pair = clean.includes("/") ? clean : `${base}/${quote}`;
        return pair.toUpperCase();
      }
      return stripDots(clean);
    case "yahoo": {
      if (market === "forex") return `${base}${quote}=X`;
      if (market === "crypto") return `${base}-${quote === "USDT" ? "USD" : quote}`;
      if (market === "indices") {
        const map: Record<string, string> = {
          US30: "^DJI",
          US500: "^GSPC",
          US100: "^NDX",
          US2000: "^RUT",
          DE40: "^GDAXI",
          UK100: "^FTSE",
          JP225: "^N225",
          VIX: "^VIX",
          AUS200: "^AXJO",
        };
        return map[stripDots(clean)] ?? stripDots(clean);
      }
      if (market === "commodities") {
        const map: Record<string, string> = {
          XAUUSD: "GC=F",
          XAGUSD: "SI=F",
          WTI: "CL=F",
          BRENT: "BZ=F",
          NG: "NG=F",
          COPPER: "HG=F",
          COCOA: "CC=F",
          SUGAR: "SB=F",
        };
        return map[stripDots(clean)] ?? stripDots(clean);
      }
      return stripDots(clean);
    }
    case "alphavantage":
      if (market === "forex") return clean.includes("/") ? clean.toUpperCase() : `${base}/${quote}`;
      return stripDots(clean);
    case "finnhub": {
      if (market === "forex") return `${exchange || "OANDA"}:${base}_${quote}`;
      if (market === "crypto") return `${exchange || "BINANCE"}:${base}${quote}`;
      return stripDots(clean);
    }
    case "polygon": {
      if (market === "forex") return `C:${base}${quote}`;
      if (market === "crypto") return `X:${base}${quote}`;
      return stripDots(clean);
    }
    case "binance":
      return `${base}${quote}`;
    case "coinbase":
      return `${base}-${quote}`;
    case "tradingview": {
      const flat = stripDots(clean);
      if (market === "forex") return `FX:${base}${quote}`;
      if (market === "crypto") {
        const ex = exchange === "COINBASE" ? "COINBASE" : exchange === "BYBIT" ? "BYBIT" : exchange === "KRAKEN" ? "KRAKEN" : exchange === "OKX" ? "OKX" : "BINANCE";
        return `${ex}:${base}${quote}`;
      }
      if (market === "stocks" || market === "etf") {
        const ex = exchange === "NYSE" ? "NYSE" : exchange === "LSE" ? "LSE" : exchange === "NSE" ? "NSE" : exchange === "TSX" ? "TSX" : "NASDAQ";
        return `${ex}:${flat}`;
      }
      if (market === "indices") {
        const map: Record<string, string> = {
          US30: "TVC:DJI",
          US500: "TVC:SPX",
          US100: "TVC:NDX",
          US2000: "TVC:RUT",
          DE40: "TVC:DE40",
          UK100: "TVC:UK100",
          JP225: "TVC:JP225",
          AUS200: "TVC:AUS200",
          NAS100: "TVC:NAS100",
          VIX: "TVC:VIX",
        };
        return map[flat] ?? `TVC:${flat}`;
      }
      if (market === "commodities") {
        const map: Record<string, string> = {
          XAUUSD: "TVC:GOLD",
          XAGUSD: "TVC:SILVER",
          WTI: "BLACKBULL:WTI",
          BRENT: "TVC:UKOIL",
          NG: "NYMEX:NG1!",
          COPPER: "COMEX:HG1!",
          COCOA: "ICE:CC1!",
          SUGAR: "ICE:SB1!",
        };
        return map[flat] ?? `TVC:${flat}`;
      }
      return `NASDAQ:${flat}`;
    }
    default:
      return clean;
  }
}

export function intervalSeconds(interval: string): number {
  const map: Record<string, number> = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "30m": 1800,
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
    "1w": 604800,
  };
  return map[interval] ?? 3600;
}

function tvScannerMarket(market: MarketType): string {
  switch (market) {
    case "forex":
      return "forex";
    case "crypto":
      return "crypto";
    case "indices":
      return "cfd";
    case "commodities":
      return "cfd";
    default:
      return "america";
  }
}

export type TvSnapshot = {
  recommendation: number | null;
  rsi: number | null;
  adx: number | null;
  ema20: number | null;
  ema50: number | null;
  sma200: number | null;
  macd: number | null;
  atr: number | null;
  close: number | null;
};

export async function fetchTradingViewSnapshot(
  provider: ProviderId,
  market: MarketType,
  exchange: string,
  symbol: string,
): Promise<TvSnapshot | null> {
  const tvSymbol = formatSymbol("tradingview", market, exchange, symbol);
  const columns = [
    "close",
    "Recommend.All",
    "RSI|15",
    "ADX",
    "EMA20",
    "EMA50",
    "SMA200",
    "MACD.macd",
    "ATR",
  ];
  const markets = [tvScannerMarket(market), "america", "global", "forex", "crypto"];
  for (const m of markets) {
    try {
      const res = await httpPostJson<{ data?: { s: string; d: (number | null)[] }[] }>(
        `https://scanner.tradingview.com/${m}/scan`,
        { symbols: { tickers: [tvSymbol] }, columns, range: [0, 1] },
      );
      const row = res.data?.[0];
      if (row?.d) {
        const d = row.d;
        return {
          close: d[0] ?? null,
          recommendation: d[1] ?? null,
          rsi: d[2] ?? null,
          adx: d[3] ?? null,
          ema20: d[4] ?? null,
          ema50: d[5] ?? null,
          sma200: d[6] ?? null,
          macd: d[7] ?? null,
          atr: d[8] ?? null,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

type FetchCandlesParams = {
  provider: ProviderId;
  apiKey?: string;
  market: MarketType;
  exchange: string;
  symbol: string;
  interval: string;
  limit?: number;
};

function toCandle(t: number, o: number, h: number, l: number, c: number, v: number): Candle {
  return { t, o, h, l, c, v };
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDemoCandles(symbol: string, interval: string, count = 300): Candle[] {
  const rnd = mulberry32(hashString(`${symbol}|${interval}`));
  const flat = stripDots(symbol);
  const base = flat.startsWith("BTC") ? 62000 : flat.startsWith("ETH") ? 3100 : flat.length <= 4 ? 150 : 1.1;
  const step = intervalSeconds(interval) * 1000;
  const now = Date.now();
  const candles: Candle[] = [];
  let price = base * (0.85 + rnd() * 0.3);
  let drift = (rnd() - 0.45) * 0.0016;
  for (let i = count; i > 0; i--) {
    if (i % 45 === 0) drift = (rnd() - 0.45) * 0.003;
    const vol = base * (0.004 + rnd() * 0.008);
    const open = price;
    const move = drift * open + (rnd() - 0.5) * vol;
    const close = Math.max(open * 0.2, open + move);
    const high = Math.max(open, close) + rnd() * vol * 0.6;
    const low = Math.min(open, close) - rnd() * vol * 0.6;
    const volume = Math.round((1000 + rnd() * 9000) * (interval === "1d" ? 30 : 1));
    candles.push(toCandle(now - i * step, open, high, low, close, volume));
    price = close;
  }
  return candles;
}

async function fetchTwelveData(p: FetchCandlesParams): Promise<Candle[]> {
  const key = p.apiKey ?? "";
  const intervalMap: Record<string, string> = {
    "1m": "1min",
    "5m": "5min",
    "15m": "15min",
    "30m": "30min",
    "1h": "1h",
    "4h": "4h",
    "1d": "1day",
    "1w": "1week",
  };
  const symbol = formatSymbol("twelvedata", p.market, p.exchange, p.symbol);
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${intervalMap[p.interval] ?? "1h"}&outputsize=${p.limit ?? 300}&apikey=${encodeURIComponent(key)}`;
  const res = await httpGetJson<{ values?: { datetime: string; open: string; high: string; low: string; close: string; volume: string }[]; status?: string; message?: string; code?: number }>(url);
  if (res.status === "error" || !res.values) {
    throw new Error(res.message ?? `Twelve Data error (${res.code ?? "unknown"})`);
  }
  return res.values
    .map((v) => {
      const ts = Date.parse(`${v.datetime.replace(" ", "T")}Z`);
      return toCandle(ts, Number(v.open), Number(v.high), Number(v.low), Number(v.close), Number(v.volume) || 0);
    })
    .filter((c) => Number.isFinite(c.c) && c.c > 0)
    .sort((a, b) => a.t - b.t);
}

async function fetchAlphaVantage(p: FetchCandlesParams): Promise<Candle[]> {
  const key = p.apiKey ?? "";
  const intraday: Record<string, string> = { "1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min", "1h": "60min" };
  const symbol = formatSymbol("alphavantage", p.market, p.exchange, p.symbol);
  const base = `https://www.alphavantage.co/query?apikey=${encodeURIComponent(key)}&symbol=${encodeURIComponent(symbol)}`;
  let url: string;
  let timeKey: string;
  if (p.interval === "1d") {
    url = `${base}&function=TIME_SERIES_DAILY&outputsize=full`;
    timeKey = "Time Series (Daily)";
  } else if (p.interval === "1w") {
    url = `${base}&function=TIME_SERIES_WEEKLY`;
    timeKey = "Weekly Time Series";
  } else if (p.interval === "4h") {
    url = `${base}&function=TIME_SERIES_DAILY&outputsize=full`;
    timeKey = "Time Series (Daily)";
  } else {
    url = `${base}&function=INTRADAY&interval=${intraday[p.interval] ?? "60min"}&outputsize=full`;
    timeKey = `Time Series (${intraday[p.interval] ?? "60min"})`;
  }
  const res = await httpGetJson<Record<string, unknown>>(url);
  if (res["Note"] || res["Information"]) {
    throw new Error(String(res["Note"] ?? res["Information"]));
  }
  if (res["Error Message"]) throw new Error(String(res["Error Message"]));
  const series = res[timeKey] as Record<string, Record<string, string>> | undefined;
  if (!series) throw new Error("Alpha Vantage returned no time series for this symbol.");
  return Object.entries(series)
    .map(([date, values]) => {
      const ts = Date.parse(`${date.replace(" ", "T")}Z`);
      return toCandle(
        ts,
        Number(values["1. open"]),
        Number(values["2. high"]),
        Number(values["3. low"]),
        Number(values["4. close"]),
        Number(values["5. volume"]) || 0,
      );
    })
    .filter((c) => Number.isFinite(c.c) && c.c > 0)
    .sort((a, b) => a.t - b.t);
}

async function fetchFinnhub(p: FetchCandlesParams): Promise<Candle[]> {
  const key = p.apiKey ?? "";
  const resMap: Record<string, string> = {
    "1m": "1",
    "5m": "5",
    "15m": "15",
    "30m": "30",
    "1h": "60",
    "4h": "240",
    "1d": "D",
    "1w": "W",
  };
  const symbol = formatSymbol("finnhub", p.market, p.exchange, p.symbol);
  const to = Math.floor(Date.now() / 1000);
  const from = to - 60 * 60 * 24 * 120;
  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resMap[p.interval] ?? "60"}&from=${from}&to=${to}&token=${encodeURIComponent(key)}`;
  const res = await httpGetJson<{ c?: number[]; o?: number[]; h?: number[]; l?: number[]; v?: number[]; t?: number[]; s?: string }>(url);
  if (res.s && res.s !== "ok") throw new Error(`Finnhub error: ${res.s}`);
  if (!res.t || !res.c) throw new Error("Finnhub returned no candles for this symbol.");
  const out: Candle[] = [];
  for (let i = 0; i < res.t.length; i++) {
    out.push(toCandle(res.t[i] * 1000, res.o?.[i] ?? 0, res.h?.[i] ?? 0, res.l?.[i] ?? 0, res.c[i], res.v?.[i] ?? 0));
  }
  return out.sort((a, b) => a.t - b.t);
}

async function fetchPolygon(p: FetchCandlesParams): Promise<Candle[]> {
  const key = p.apiKey ?? "";
  const multMap: Record<string, { mult: string; span: string }> = {
    "1m": { mult: "minute", span: "1" },
    "5m": { mult: "minute", span: "5" },
    "15m": { mult: "minute", span: "15" },
    "30m": { mult: "minute", span: "30" },
    "1h": { mult: "hour", span: "1" },
    "4h": { mult: "hour", span: "4" },
    "1d": { mult: "day", span: "1" },
    "1w": { mult: "week", span: "1" },
  };
  const cfg = multMap[p.interval] ?? { mult: "hour", span: "1" };
  const ticker = formatSymbol("polygon", p.market, p.exchange, p.symbol);
  const to = new Date();
  const from = new Date(to.getTime() - 1000 * 60 * 60 * 24 * 120);
  const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/${cfg.mult}/${cfg.span}/${from.toISOString().slice(0, 10)}/${to.toISOString().slice(0, 10)}?apiKey=${encodeURIComponent(key)}&limit=500&sort=asc`;
  const res = await httpGetJson<{ results?: { o: number; h: number; l: number; c: number; v: number; t: number }[]; status?: string; error?: string }>(url);
  if (!res.results) throw new Error(res.error ?? "Polygon returned no aggregates.");
  return res.results.map((r) => toCandle(r.t, r.o, r.h, r.l, r.c, r.v));
}

async function fetchYahoo(p: FetchCandlesParams): Promise<Candle[]> {
  const intervalMap: Record<string, string> = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "60m",
    "4h": "1h",
    "1d": "1d",
    "1w": "1wk",
  };
  const symbol = formatSymbol("yahoo", p.market, p.exchange, p.symbol);
  const range = ["1m", "5m", "15m", "30m", "1h", "4h"].includes(p.interval) ? "3mo" : p.interval === "1w" ? "5y" : "2y";
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${intervalMap[p.interval] ?? "60m"}&range=${range}&includePrePost=false`;
  const res = await httpGetJson<{
    chart?: {
      result?: {
        timestamp?: number[];
        indicators?: { quote?: { open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }[] };
      }[];
      error?: { description?: string } | null;
    };
  }>(url);
  const err = res.chart?.error?.description;
  if (err) throw new Error(`Yahoo Finance: ${err}`);
  const result = res.chart?.result?.[0];
  if (!result?.timestamp) throw new Error("Yahoo Finance returned no candles for this symbol.");
  const q = result.indicators?.quote?.[0] ?? {};
  const out: Candle[] = [];
  result.timestamp.forEach((t, i) => {
    const o = q.open?.[i];
    const h = q.high?.[i];
    const l = q.low?.[i];
    const c = q.close?.[i];
    if (o === null || o === undefined || c === null || c === undefined) return;
    out.push(toCandle(t * 1000, o, h ?? o, l ?? o, c, q.volume?.[i] ?? 0));
  });
  return out;
}

async function fetchBinance(p: FetchCandlesParams): Promise<Candle[]> {
  const symbol = formatSymbol("binance", p.market, p.exchange, p.symbol);
  const intervalMap: Record<string, string> = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "1h",
    "4h": "4h",
    "1d": "1d",
    "1w": "1w",
  };
  const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${intervalMap[p.interval] ?? "1h"}&limit=${p.limit ?? 300}`;
  const res = await httpGetJson<unknown[][]>(url);
  if (!Array.isArray(res)) throw new Error("Binance returned an unexpected response.");
  return res.map((k) =>
    toCandle(Number(k[0]), Number(k[1]), Number(k[2]), Number(k[3]), Number(k[4]), Number(k[5])),
  );
}

async function fetchCoinbase(p: FetchCandlesParams): Promise<Candle[]> {
  const symbol = formatSymbol("coinbase", p.market, p.exchange, p.symbol);
  const gran = intervalSeconds(p.interval);
  const url = `https://api.exchange.coinbase.com/products/${encodeURIComponent(symbol)}/candles?granularity=${gran}`;
  const res = await httpGetJson<number[][]>(url);
  if (!Array.isArray(res)) throw new Error("Coinbase returned an unexpected response.");
  return res
    .map((row) => toCandle(Number(row[0]) * 1000, Number(row[3]), Number(row[2]), Number(row[1]), Number(row[4]), Number(row[5]) || 0))
    .sort((a, b) => a.t - b.t);
}

export async function fetchCandles(p: FetchCandlesParams): Promise<Candle[]> {
  const limit = p.limit ?? 300;
  let candles: Candle[];
  switch (p.provider) {
    case "twelvedata":
      candles = await fetchTwelveData(p);
      break;
    case "alphavantage":
      candles = await fetchAlphaVantage(p);
      break;
    case "finnhub":
      candles = await fetchFinnhub(p);
      break;
    case "polygon":
      candles = await fetchPolygon(p);
      break;
    case "yahoo":
      candles = await fetchYahoo(p);
      break;
    case "binance":
      candles = await fetchBinance(p);
      break;
    case "coinbase":
      candles = await fetchCoinbase(p);
      break;
    case "tradingview":
      candles = await fetchYahoo({ ...p, provider: "yahoo" });
      break;
    case "demo":
      candles = generateDemoCandles(p.symbol, p.interval, limit);
      break;
    default:
      candles = [];
  }
  const cleaned = candles
    .filter((c) => Number.isFinite(c.c) && Number.isFinite(c.o) && c.c > 0)
    .sort((a, b) => a.t - b.t);
  if (cleaned.length === 0) throw new Error("No candle data returned for this symbol.");
  return cleaned.slice(-Math.max(120, Math.min(limit, 600)));
}

export type SymbolOption = { symbol: string; label: string; exchange?: string; source: string };

export async function fetchSymbolOptions(p: {
  provider: ProviderId;
  apiKey?: string;
  market: MarketType;
  exchange: string;
  query?: string;
}): Promise<SymbolOption[]> {
  const curated: SymbolOption[] = (SYMBOL_CATALOG[p.market] ?? []).map((s) => ({
    symbol: s.symbol,
    label: s.label,
    source: "catalog",
  }));
  const q = (p.query ?? "").trim();
  if (!q) return curated;

  try {
    switch (p.provider) {
      case "twelvedata": {
        const key = p.apiKey ?? "";
        const url = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(q)}&apikey=${encodeURIComponent(key)}&outputsize=30`;
        const res = await httpGetJson<{ data?: { symbol: string; instrument_type: string; exchange: string; country?: string }[] }>(url);
        const live = (res.data ?? []).map((d) => ({
          symbol: d.symbol,
          label: `${d.symbol} — ${d.instrument_type} · ${d.exchange}`,
          exchange: d.exchange,
          source: "live",
        }));
        return mergeSymbols(curated, live);
      }
      case "yahoo": {
        const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=25&newsCount=0`;
        const res = await httpGetJson<{ quotes?: { symbol: string; shortname?: string; longname?: string; exchange?: string; quoteType?: string }[] }>(url);
        const live = (res.quotes ?? [])
          .filter((item) => item.quoteType !== "FUTURE")
          .map((item) => ({
            symbol: item.symbol,
            label: `${item.symbol} — ${item.longname ?? item.shortname ?? item.exchange ?? ""}`,
            exchange: item.exchange,
            source: "live",
          }));
        return mergeSymbols(curated, live);
      }
      case "finnhub": {
        const key = p.apiKey ?? "";
        const url = `https://finnhub.io/api/v1/stock/symbol?exchange=${encodeURIComponent(p.exchange || "US")}&token=${encodeURIComponent(key)}`;
        const res = await httpGetJson<{ symbol?: string; description?: string; displaySymbol?: string }[]>(url);
        const live = (res ?? [])
          .filter((item) => item.symbol?.toUpperCase().includes(q.toUpperCase()))
          .slice(0, 30)
          .map((item) => ({
            symbol: item.symbol ?? "",
            label: `${item.displaySymbol ?? item.symbol} — ${item.description ?? ""}`,
            exchange: p.exchange,
            source: "live",
          }));
        return mergeSymbols(curated, live);
      }
      case "binance": {
        const res = await httpGetJson<{ symbols?: { symbol: string; status: string; baseAsset: string; quoteAsset: string }[] }>(
          "https://api.binance.com/api/v3/exchangeInfo",
        );
        const live = (res.symbols ?? [])
          .filter((s) => s.status === "TRADING" && s.symbol.includes(q.toUpperCase()))
          .slice(0, 40)
          .map((s) => ({ symbol: `${s.baseAsset}/${s.quoteAsset}`, label: `${s.baseAsset}/${s.quoteAsset}`, exchange: "BINANCE", source: "live" }));
        return mergeSymbols(curated, live);
      }
      case "coinbase": {
        const res = await httpGetJson<{ id: string; base_currency: string; quote_currency: string }[]>(
          "https://api.exchange.coinbase.com/products",
        );
        const live = (res ?? [])
          .filter((s) => s.id.toUpperCase().includes(q.toUpperCase()))
          .slice(0, 40)
          .map((s) => ({ symbol: `${s.base_currency}/${s.quote_currency}`, label: `${s.base_currency}/${s.quote_currency}`, exchange: "COINBASE", source: "live" }));
        return mergeSymbols(curated, live);
      }
      case "polygon": {
        const key = p.apiKey ?? "";
        const url = `https://api.polygon.io/v2/reference/tickers?search=${encodeURIComponent(q)}&limit=30&apiKey=${encodeURIComponent(key)}`;
        const res = await httpGetJson<{ results?: { ticker: string; name?: string }[] }>(url);
        const live = (res.results ?? []).map((r) => ({ symbol: r.ticker, label: `${r.ticker} — ${r.name ?? ""}`, source: "live" }));
        return mergeSymbols(curated, live);
      }
      case "alphavantage": {
        const key = p.apiKey ?? "";
        const url = `https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${encodeURIComponent(key)}`;
        const res = await httpGetJson<{ data?: { symbol: string; name: string; exchange: string }[] }>(url);
        const live = (res.data ?? [])
          .filter((d) => d.symbol.toUpperCase().includes(q.toUpperCase()))
          .slice(0, 30)
          .map((d) => ({ symbol: d.symbol, label: `${d.symbol} — ${d.name}`, exchange: d.exchange, source: "live" }));
        return mergeSymbols(curated, live);
      }
      case "tradingview": {
        const markets = [tvScannerMarket(p.market), "america", "global"];
        for (const m of markets) {
          try {
            const res = await httpPostJson<{ data?: { s: string; d: (number | null)[] }[] }>(
              `https://scanner.tradingview.com/${m}/scan`,
              {
                symbols: { query: { types: [] }, filter: [{ column: "name", operation: "match", left: q }] },
                columns: ["close", "name", "exchange"],
                range: [0, 30],
              },
            );
            const live = (res.data ?? []).map((row) => ({
              symbol: row.s,
              label: `${row.s}${row.d[1] ? ` — ${row.d[1]}` : ""}`,
              exchange: row.d[2] !== undefined && row.d[2] !== null ? String(row.d[2]) : undefined,
              source: "live",
            }));
            if (live.length) return mergeSymbols(curated, live);
          } catch {
            continue;
          }
        }
        return curated;
      }
      default:
        return curated;
    }
  } catch {
    return curated;
  }
}

function mergeSymbols(curated: SymbolOption[], live: SymbolOption[]): SymbolOption[] {
  const seen = new Set<string>();
  const out: SymbolOption[] = [];
  for (const item of [...live, ...curated]) {
    const key = item.symbol.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
