export type MarketType =
  | "forex"
  | "crypto"
  | "stocks"
  | "indices"
  | "commodities"
  | "etf";

export type ProviderId =
  | "twelvedata"
  | "yahoo"
  | "alphavantage"
  | "finnhub"
  | "polygon"
  | "binance"
  | "coinbase"
  | "tradingview"
  | "demo";

export type Direction = "buy" | "sell" | "neutral";

export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type ProviderMeta = {
  id: ProviderId;
  label: string;
  tagline: string;
  requiresKey: boolean;
  keyUrl?: string;
  docsUrl?: string;
  markets: MarketType[];
  symbolStyle: "plain" | "slash" | "dash" | "binance" | "dot";
  accent: string;
};

export type StrategyResult = {
  id: string;
  name: string;
  signal: Direction;
  strength: number;
  confidence: number;
  reason: string;
  values?: Record<string, string | number | null>;
};

export type AnalysisResult = {
  id: string;
  createdAt: string;
  provider: ProviderId;
  providerLabel: string;
  symbol: string;
  market: MarketType;
  exchange: string;
  interval: string;
  strategies: string[];
  signal: "BUY" | "SELL" | "NO TRADE";
  direction: Direction;
  confidence: number;
  entry: number;
  takeProfit: number | null;
  takeProfit2: number | null;
  stopLoss: number | null;
  riskReward: number | null;
  riskAmount: number | null;
  atr: number | null;
  netScore: number;
  bullScore: number;
  bearScore: number;
  summary: string;
  breakdown: StrategyResult[];
  candles: Candle[];
  indicators: Record<string, number | string | null>;
  timeframeNote: string;
};

export type AiConfig = {
  provider: "openai" | "anthropic" | "gemini" | "groq" | "openrouter" | "together" | "custom";
  apiKey: string;
  baseUrl?: string;
  model: string;
};

export type AiVerdict = {
  bias: "STRONG_BUY" | "BULLISH" | "NEUTRAL" | "BEARISH" | "STRONG_BEARISH" | "AVOID";
  verdict: "GOOD" | "NEUTRAL" | "BAD";
  score: number;
  confidence: number;
  summary: string;
  reasoning: string;
  risks: string[];
  improvements: string[];
  model: string;
  raw?: string;
};

export const INTERVALS: { id: string; label: string; seconds: number }[] = [
  { id: "1m", label: "1 minute", seconds: 60 },
  { id: "5m", label: "5 minutes", seconds: 300 },
  { id: "15m", label: "15 minutes", seconds: 900 },
  { id: "30m", label: "30 minutes", seconds: 1800 },
  { id: "1h", label: "1 hour", seconds: 3600 },
  { id: "4h", label: "4 hours", seconds: 14400 },
  { id: "1d", label: "1 day", seconds: 86400 },
  { id: "1w", label: "1 week", seconds: 604800 },
];

export const MARKET_LABELS: Record<MarketType, string> = {
  forex: "Forex",
  crypto: "Crypto",
  stocks: "Stocks",
  indices: "Indices",
  commodities: "Commodities",
  etf: "ETFs",
};
