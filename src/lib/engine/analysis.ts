import type { AnalysisResult, Candle, Direction, MarketType, ProviderId, StrategyResult } from "../types";
import { atr, bollinger, closes, ema, macd, priceDigits, round, rsi, sma, supertrend } from "./indicators";
import { fetchCandles, fetchTradingViewSnapshot, providerLabel } from "./providers";
import { STRATEGY_MAP } from "./strategies";

export type RunAnalysisParams = {
  provider: ProviderId;
  apiKey?: string;
  market: MarketType;
  exchange: string;
  symbol: string;
  interval: string;
  strategyIds: string[];
  riskReward?: number;
  weights?: Record<string, number>;
  useTvConsensus?: boolean;
};

const NEUTRAL_THRESHOLD = 0.2;

function lastNonNull(arr: (number | null)[]): number | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i];
    if (v !== null && Number.isFinite(v)) return v;
  }
  return null;
}

function indicatorSnapshot(candles: Candle[]) {
  const price = closes(candles);
  const last = price[price.length - 1] ?? 0;
  const digits = priceDigits(last);
  const m = macd(price, 12, 26, 9);
  const bb = bollinger(price, 20, 2);
  const st = supertrend(candles, 10, 3);
  return {
    close: round(last, digits),
    ema20: round(lastNonNull(ema(price, 20)), digits),
    ema50: round(lastNonNull(ema(price, 50)), digits),
    ema200: round(lastNonNull(ema(price, 200)), digits),
    sma50: round(lastNonNull(sma(price, 50)), digits),
    rsi14: round(lastNonNull(rsi(price, 14)), 2),
    macdHistogram: round(lastNonNull(m.hist), 6),
    atr14: round(lastNonNull(atr(candles, 14)), digits),
    bollingerUpper: round(lastNonNull(bb.upper), digits),
    bollingerLower: round(lastNonNull(bb.lower), digits),
    supertrendDirection: lastNonNull(st.direction) === 1 ? "bullish" : lastNonNull(st.direction) === -1 ? "bearish" : "n/a",
    candlesUsed: candles.length,
  };
}

function buildLevels(
  direction: Direction,
  candles: Candle[],
  atrValue: number | null,
  rr: number,
): { entry: number; stopLoss: number | null; takeProfit: number | null; takeProfit2: number | null; risk: number | null } {
  const price = closes(candles);
  const entry = price[price.length - 1] ?? 0;
  const window = candles.slice(-20);
  const swingLow = window.length ? Math.min(...window.map((c) => c.l)) : entry;
  const swingHigh = window.length ? Math.max(...window.map((c) => c.h)) : entry;
  const a = atrValue && atrValue > 0 ? atrValue : entry * 0.01;
  const digits = priceDigits(entry);

  if (direction === "neutral") {
    // Reference levels only — shown greyed out because there is no trade.
    const stop = entry - a * 1.5;
    return {
      entry: round(entry, digits) ?? entry,
      stopLoss: round(stop, digits) ?? stop,
      takeProfit: round(entry + a * 2, digits) ?? entry + a * 2,
      takeProfit2: round(entry + a * 3, digits) ?? entry + a * 3,
      risk: null,
    };
  }

  if (direction === "buy") {
    const stop = Math.min(entry - a * 1.5, swingLow - a * 0.2);
    const risk = Math.max(entry - stop, a * 0.5);
    return {
    entry: round(entry, digits) ?? entry,
    stopLoss: round(stop, digits) ?? stop,
    takeProfit: round(entry + risk * rr, digits) ?? entry + risk * rr,
    takeProfit2: round(entry + risk * rr * 1.6, digits) ?? entry + risk * rr * 1.6,
    risk: round(risk, digits) ?? risk,
  };
}

const stop = Math.max(entry + a * 1.5, swingHigh + a * 0.2);
const risk = Math.max(stop - entry, a * 0.5);
return {
    entry: round(entry, digits) ?? entry,
    stopLoss: round(stop, digits) ?? stop,
    takeProfit: round(entry - risk * rr, digits) ?? entry - risk * rr,
    takeProfit2: round(entry - risk * rr * 1.6, digits) ?? entry - risk * rr * 1.6,
    risk: round(risk, digits) ?? risk,
  };
}

export async function runAnalysis(params: RunAnalysisParams): Promise<AnalysisResult> {
  const limit = 400;
  const candles = await fetchCandles({
    provider: params.provider,
    apiKey: params.apiKey,
    market: params.market,
    exchange: params.exchange,
    symbol: params.symbol,
    interval: params.interval,
    limit,
  });

  const higherIntervalMap: Record<string, string> = {
    "1m": "5m",
    "5m": "15m",
    "15m": "1h",
    "30m": "4h",
    "1h": "4h",
    "4h": "1d",
    "1d": "1w",
    "1w": "1w",
  };
  const htfInterval = higherIntervalMap[params.interval] ?? "4h";

  let tvIndicators: Record<string, number | null> | null = null;
  const wantsTv = params.useTvConsensus ?? false;
  if (wantsTv) {
    try {
      const snap = await fetchTradingViewSnapshot(params.provider, params.market, params.exchange, params.symbol);
      if (snap) {
        tvIndicators = {
          recommendation: snap.recommendation,
          rsi: snap.rsi,
          adx: snap.adx,
          ema20: snap.ema20,
          ema50: snap.ema50,
          sma200: snap.sma200,
        };
      }
    } catch {
      tvIndicators = null;
    }
  }

  const fetchHigherTimeframe = async (): Promise<Candle[] | null> => {
    if (htfInterval === params.interval) return null;
    try {
      return await fetchCandles({
        provider: params.provider,
        apiKey: params.apiKey,
        market: params.market,
        exchange: params.exchange,
        symbol: params.symbol,
        interval: htfInterval,
        limit: 200,
      });
    } catch {
      return null;
    }
  };

  const selected = params.strategyIds.map((id) => STRATEGY_MAP[id]).filter(Boolean);
  const weights = params.weights ?? {};

  const breakdown: StrategyResult[] = [];
  for (const strategy of selected) {
    try {
      const res = await strategy.run({
        candles,
        interval: params.interval,
        market: params.market,
        symbol: params.symbol,
        tvIndicators,
        fetchHigherTimeframe,
      });
      breakdown.push({ ...res, strength: res.strength * (weights[strategy.id] ?? strategy.defaultWeight) });
    } catch (err) {
      breakdown.push({
        id: strategy.id,
        name: strategy.name,
        signal: "neutral",
        strength: 0,
        confidence: 0,
        reason: `Strategy failed to evaluate: ${err instanceof Error ? err.message : "unknown error"}`,
      });
    }
  }

  let bull = 0;
  let bear = 0;
  for (const item of breakdown) {
    if (item.signal === "buy") bull += item.strength;
    else if (item.signal === "sell") bear += item.strength;
  }
  const total = bull + bear;
  const net = bull - bear;
  const ratio = total > 0 ? net / total : 0;

  let signal: AnalysisResult["signal"];
  let direction: Direction;
  if (ratio >= NEUTRAL_THRESHOLD) {
    signal = "BUY";
    direction = "buy";
  } else if (ratio <= -NEUTRAL_THRESHOLD) {
    signal = "SELL";
    direction = "sell";
  } else {
    signal = "NO TRADE";
    direction = "neutral";
  }

  const active = breakdown.filter((b) => b.signal !== "neutral");
  const agreement = breakdown.length ? active.length / breakdown.length : 0;
  const confidence =
    signal === "NO TRADE"
      ? Math.round((1 - Math.abs(ratio) / Math.max(NEUTRAL_THRESHOLD, 0.0001)) * 25 + 20)
      : Math.min(95, Math.round(Math.abs(ratio) * 70 + agreement * 30));

  const atrValue = lastNonNull(atr(candles, 14));
  const rr = params.riskReward ?? 2;
  const levels = buildLevels(direction, candles, atrValue, rr);

  const bullish = breakdown.filter((b) => b.signal === "buy").length;
  const bearish = breakdown.filter((b) => b.signal === "sell").length;
  const summary =
    signal === "NO TRADE"
      ? `No clean edge — ${bullish} bullish vs ${bearish} bearish readings (net score ${round(net, 2)}). Wait for alignment.`
      : `${signal} bias with ${bullish} bullish and ${bearish} bearish strategy readings. Net score ${round(net, 2)} (${round(ratio * 100, 0)}% agreement).`;

  const topBull = breakdown
    .filter((b) => b.signal === "buy")
    .sort((a, b) => b.strength - a.strength)[0];
  const topBear = breakdown
    .filter((b) => b.signal === "sell")
    .sort((a, b) => b.strength - a.strength)[0];
  const lead = direction === "buy" ? topBull : direction === "sell" ? topBear : undefined;

  return {
    id: `an_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    provider: params.provider,
    providerLabel: providerLabel(params.provider),
    symbol: params.symbol,
    market: params.market,
    exchange: params.exchange,
    interval: params.interval,
    strategies: selected.map((s) => s.id),
    signal,
    direction,
    confidence,
    entry: levels.entry,
    takeProfit: levels.takeProfit,
    takeProfit2: levels.takeProfit2,
    stopLoss: levels.stopLoss,
    riskReward: levels.risk ? round(rr, 2) : null,
    riskAmount: levels.risk,
    atr: atrValue ? round(atrValue, priceDigits(levels.entry)) : null,
    netScore: round(net, 3) ?? 0,
    bullScore: round(bull, 3) ?? 0,
    bearScore: round(bear, 3) ?? 0,
    summary,
    breakdown: breakdown.map((b) => ({ ...b, strength: round(b.strength, 3) ?? b.strength })),
    candles: candles.slice(-120),
    indicators: indicatorSnapshot(candles),
    timeframeNote: lead
      ? `Primary driver: ${lead.name} — ${lead.reason}`
      : "No dominant strategy — the setup lacks conviction.",
  };
}
