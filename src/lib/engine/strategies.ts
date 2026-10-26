import type { Candle, Direction, MarketType, StrategyResult } from "../types";
import {
  adx,
  atr,
  bollinger,
  closes,
  donchian,
  ema,
  fibLevels,
  macd,
  obv,
  pivots,
  priceDigits,
  rollingMax,
  rollingMin,
  round,
  rsi,
  sma,
  stochastic,
  supertrend,
  swingPoints,
  trueRanges,
  vwap,
} from "./indicators";

export type StrategyContext = {
  candles: Candle[];
  interval: string;
  market: MarketType;
  symbol: string;
  tvIndicators?: Record<string, number | null> | null;
  fetchHigherTimeframe?: () => Promise<Candle[] | null>;
};

export type StrategyDef = {
  id: string;
  name: string;
  category: "Trend" | "Momentum" | "Volatility" | "Mean Reversion" | "Price Action" | "Volume" | "Confluence";
  description: string;
  defaultWeight: number;
  run: (ctx: StrategyContext) => Promise<StrategyResult> | StrategyResult;
};

function lastValue(arr: (number | null)[]): number | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i];
    if (v !== null && Number.isFinite(v)) return v;
  }
  return null;
}

function prevValue(arr: (number | null)[], back = 1): number | null {
  let seen = 0;
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i];
    if (v === null || !Number.isFinite(v)) continue;
    if (seen === back) return v;
    seen += 1;
  }
  return null;
}

function crossState(fast: (number | null)[], slow: (number | null)[], lookback = 3) {
  const f = lastValue(fast);
  const s = lastValue(slow);
  const fPrev = prevValue(fast, 1);
  const sPrev = prevValue(slow, 1);
  if (f === null || s === null) return { state: "neutral" as Direction, fresh: 0, spread: 0 };
  const spread = Math.abs(f - s);
  let fresh = 0;
  for (let i = 1; i <= lookback; i++) {
    const a = prevValue(fast, i);
    const b = prevValue(slow, i);
    const a2 = prevValue(fast, i + 1);
    const b2 = prevValue(slow, i + 1);
    if (a === null || b === null || a2 === null || b2 === null) break;
    if (a <= b && a2 > b2) {
      fresh = 1;
      break;
    }
    if (a >= b && a2 < b2) {
      fresh = -1;
      break;
    }
  }
  const state: Direction = f > s ? "buy" : f < s ? "sell" : "neutral";
  return { state, fresh, spread };
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function fmt(v: number | null | undefined, digits = 4): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "n/a";
  return v.toFixed(digits);
}

function result(
  id: string,
  name: string,
  signal: Direction,
  strength: number,
  confidence: number,
  reason: string,
  values: Record<string, string | number | null> = {},
): StrategyResult {
  return { id, name, signal, strength: clamp01(strength), confidence: Math.round(confidence), reason, values };
}

export const STRATEGIES: StrategyDef[] = [
  {
    id: "ema_crossover",
    name: "EMA 9/21 Crossover",
    category: "Trend",
    description: "Fast EMA crossing the slow EMA with momentum confirmation.",
    defaultWeight: 1.1,
    run: (ctx) => {
      const price = closes(ctx.candles);
      const fast = ema(price, 9);
      const slow = ema(price, 21);
      const { state, fresh, spread } = crossState(fast, slow);
      const a = atr(ctx.candles, 14);
      const atrVal = lastValue(a) ?? 0;
      const rel = atrVal ? spread / atrVal : 0;
      let strength = clamp01(0.35 + rel * 1.4);
      if (fresh !== 0 && fresh === (state === "buy" ? 1 : -1)) strength = clamp01(strength + 0.25);
      const dir: Direction = state === "neutral" ? "neutral" : state;
      return result(
        "ema_crossover",
        "EMA 9/21 Crossover",
        dir,
        dir === "neutral" ? 0 : strength,
        dir === "neutral" ? 35 : 60 + strength * 30,
        dir === "neutral"
          ? "EMA 9 and EMA 21 are flat — no directional edge."
          : `EMA9 ${dir === "buy" ? "above" : "below"} EMA21${fresh !== 0 ? " with a fresh cross" : ""}, spread ${fmt(rel, 2)}x ATR.`,
        { ema9: round(lastValue(fast), priceDigits(price[price.length - 1] ?? 1)), ema21: round(lastValue(slow), priceDigits(price[price.length - 1] ?? 1)) },
      );
    },
  },
  {
    id: "sma_crossover",
    name: "SMA 20/50 Cross",
    category: "Trend",
    description: "Classic medium-term trend filter using simple moving averages.",
    defaultWeight: 1,
    run: (ctx) => {
      const price = closes(ctx.candles);
      const fast = sma(price, 20);
      const slow = sma(price, 50);
      const { state, fresh } = crossState(fast, slow);
      const dir: Direction = state === "neutral" ? "neutral" : state;
      const strength = dir === "neutral" ? 0 : fresh !== 0 ? 0.8 : 0.55;
      return result(
        "sma_crossover",
        "SMA 20/50 Cross",
        dir,
        strength,
        dir === "neutral" ? 35 : 55 + strength * 30,
        dir === "neutral"
          ? "SMA20 and SMA50 are converging — trend filter inactive."
          : `SMA20 is ${dir === "buy" ? "above" : "below"} SMA50${fresh !== 0 ? " (fresh cross)" : ""}.`,
      );
    },
  },
  {
    id: "rsi_reversal",
    name: "RSI 14 Extremes",
    category: "Mean Reversion",
    description: "Overbought / oversold exhaustion signals with RSI slope.",
    defaultWeight: 1.1,
    run: (ctx) => {
      const price = closes(ctx.candles);
      const r = rsi(price, 14);
      const v = lastValue(r);
      const prev = prevValue(r, 1);
      if (v === null) {
        return result("rsi_reversal", "RSI 14 Extremes", "neutral", 0, 20, "Not enough candles for RSI.");
      }
      const rising = prev !== null && v > prev;
      const falling = prev !== null && v < prev;
      let dir: Direction = "neutral";
      let strength = 0;
      if (v < 30) {
        dir = "buy";
        strength = clamp01((30 - v) / 20 + 0.45);
      } else if (v > 70) {
        dir = "sell";
        strength = clamp01((v - 70) / 20 + 0.45);
      } else if (v < 45 && rising) {
        dir = "buy";
        strength = 0.35;
      } else if (v > 55 && falling) {
        dir = "sell";
        strength = 0.35;
      }
      return result(
        "rsi_reversal",
        "RSI 14 Extremes",
        dir,
        strength,
        dir === "neutral" ? 40 : 50 + strength * 35,
        dir === "neutral"
          ? `RSI at ${fmt(v, 1)} — mid-range, no exhaustion.`
          : `RSI ${fmt(v, 1)} ${v < 30 ? "oversold" : v > 70 ? "overbought" : `and ${rising ? "rising" : "falling"}`} — ${dir.toUpperCase()} bias.`,
        { rsi: round(v, 2) },
      );
    },
  },
  {
    id: "rsi_divergence",
    name: "RSI Divergence",
    category: "Momentum",
    description: "Detects bullish/bearish divergence between price swings and RSI.",
    defaultWeight: 1.2,
    run: (ctx) => {
      const price = closes(ctx.candles);
      const r = rsi(price, 14);
      const { lows, highs } = swingPoints(ctx.candles, 3);
      if (lows.length < 2 || highs.length < 2) {
        return result("rsi_divergence", "RSI Divergence", "neutral", 0, 25, "Not enough swing points to compare.");
      }
      const l1 = lows[lows.length - 1];
      const l2 = lows[lows.length - 2];
      const h1 = highs[highs.length - 1];
      const h2 = highs[highs.length - 2];
      const rsiAt = (i: number) => r[i] ?? null;
      const r1 = rsiAt(l1.index);
      const r2 = rsiAt(l2.index);
      const r3 = rsiAt(h1.index);
      const r4 = rsiAt(h2.index);
      let dir: Direction = "neutral";
      let strength = 0;
      let note = "No clear RSI divergence on recent swings.";
      if (r1 !== null && r2 !== null && l1.price < l2.price && r1 > r2) {
        dir = "buy";
        strength = 0.8;
        note = "Bullish divergence: lower low in price with higher RSI low.";
      } else if (r3 !== null && r4 !== null && h1.price > h2.price && r3 < r4) {
        dir = "sell";
        strength = 0.8;
        note = "Bearish divergence: higher high in price with lower RSI high.";
      }
      return result("rsi_divergence", "RSI Divergence", dir, strength, dir === "neutral" ? 30 : 78, note);
    },
  },
  {
    id: "macd",
    name: "MACD 12/26/9",
    category: "Momentum",
    description: "MACD line vs signal line plus histogram expansion.",
    defaultWeight: 1.15,
    run: (ctx) => {
      const price = closes(ctx.candles);
      const m = macd(price, 12, 26, 9);
      const line = lastValue(m.macd);
      const signal = lastValue(m.signal);
      const hist = lastValue(m.hist);
      const histPrev = prevValue(m.hist, 1);
      if (line === null || signal === null) {
        return result("macd", "MACD 12/26/9", "neutral", 0, 20, "Not enough candles for MACD.");
      }
      const spread = Math.abs(line - signal);
      const a = atr(ctx.candles, 14);
      const atrVal = lastValue(a) ?? 0;
      const rel = atrVal ? spread / atrVal : 0;
      const expanding = hist !== null && histPrev !== null && Math.abs(hist) > Math.abs(histPrev);
      let dir: Direction = line > signal ? "buy" : line < signal ? "sell" : "neutral";
      let strength = clamp01(0.3 + rel * 2 + (expanding ? 0.2 : 0));
      if (dir === "neutral") strength = 0;
      return result(
        "macd",
        "MACD 12/26/9",
        dir,
        strength,
        dir === "neutral" ? 30 : 55 + strength * 35,
        dir === "neutral"
          ? "MACD line is flat on the signal line."
          : `MACD ${dir === "buy" ? "above" : "below"} signal, histogram ${expanding ? "expanding" : "contracting"}.`,
        { macd: round(line, 6), signal: round(signal, 6), histogram: round(hist, 6) },
      );
    },
  },
  {
    id: "bollinger",
    name: "Bollinger Bands 20/2",
    category: "Volatility",
    description: "Band squeeze, breakout and mean-reversion behaviour.",
    defaultWeight: 1,
    run: (ctx) => {
      const price = closes(ctx.candles);
      const bb = bollinger(price, 20, 2);
      const c = price[price.length - 1];
      const upper = lastValue(bb.upper);
      const lower = lastValue(bb.lower);
      const width = lastValue(bb.width);
      const pb = lastValue(bb.percentB);
      if (upper === null || lower === null) {
        return result("bollinger", "Bollinger Bands 20/2", "neutral", 0, 20, "Not enough candles for Bollinger Bands.");
      }
      const band = (upper - lower) / 2;
      const squeeze = band > 0 && width !== null && width < 4;
      let dir: Direction = "neutral";
      let strength = 0;
      let note = "Price is trading inside the bands.";
      if (c <= lower) {
        dir = "buy";
        strength = 0.7;
        note = "Price pierced the lower band — reversion buy setup.";
      } else if (c >= upper) {
        dir = "sell";
        strength = 0.7;
        note = "Price pierced the upper band — reversion sell setup.";
      } else if (squeeze) {
        note = "Bollinger squeeze — volatility contraction, breakout pending.";
      } else if (pb !== null && pb > 0.8) {
        dir = "sell";
        strength = 0.4;
        note = "Riding the upper half of the band.";
      } else if (pb !== null && pb < 0.2) {
        dir = "buy";
        strength = 0.4;
        note = "Riding the lower half of the band.";
      }
      return result(
        "bollinger",
        "Bollinger Bands 20/2",
        dir,
        strength,
        dir === "neutral" ? 35 : 50 + strength * 35,
        note,
        { upper: round(upper, 5), lower: round(lower, 5), percentB: round(pb, 3), widthPct: round(width, 2) },
      );
    },
  },
  {
    id: "stochastic",
    name: "Stochastic 14/3/3",
    category: "Momentum",
    description: "%K / %D crossover from overbought and oversold zones.",
    defaultWeight: 0.9,
    run: (ctx) => {
      const s = stochastic(ctx.candles, 14, 3, 3);
      const k = lastValue(s.k);
      const d = lastValue(s.d);
      const kPrev = prevValue(s.k, 1);
      const dPrev = prevValue(s.d, 1);
      if (k === null || d === null) {
        return result("stochastic", "Stochastic 14/3/3", "neutral", 0, 20, "Not enough candles for Stochastic.");
      }
      const crossedUp = kPrev !== null && dPrev !== null && kPrev <= dPrev && k > d;
      const crossedDown = kPrev !== null && dPrev !== null && kPrev >= dPrev && k < d;
      let dir: Direction = "neutral";
      let strength = 0;
      if (crossedUp && k < 40) {
        dir = "buy";
        strength = 0.75;
      } else if (crossedDown && k > 60) {
        dir = "sell";
        strength = 0.75;
      } else if (k < 25) {
        dir = "buy";
        strength = 0.45;
      } else if (k > 75) {
        dir = "sell";
        strength = 0.45;
      }
      return result(
        "stochastic",
        "Stochastic 14/3/3",
        dir,
        strength,
        dir === "neutral" ? 35 : 50 + strength * 30,
        dir === "neutral"
          ? `Stochastic %K ${fmt(k, 1)} is mid-range with no crossover.`
          : `Stochastic %K ${fmt(k, 1)} crossed ${dir === "buy" ? "above" : "below"} %D.`,
        { k: round(k, 2), d: round(d, 2) },
      );
    },
  },
  {
    id: "adx_trend",
    name: "ADX / DMI Trend Strength",
    category: "Trend",
    description: "Measures trend strength with directional movement indices.",
    defaultWeight: 1.1,
    run: (ctx) => {
      const a = adx(ctx.candles, 14);
      const adxVal = lastValue(a.adx);
      const pdi = lastValue(a.plusDI);
      const mdi = lastValue(a.minusDI);
      if (adxVal === null || pdi === null || mdi === null) {
        return result("adx_trend", "ADX / DMI Trend Strength", "neutral", 0, 20, "Not enough candles for ADX.");
      }
      if (adxVal < 18) {
        return result(
          "adx_trend",
          "ADX / DMI Trend Strength",
          "neutral",
          0,
          40,
          `ADX ${fmt(adxVal, 1)} — range-bound market, trend signals unreliable.`,
          { adx: round(adxVal, 2), plusDI: round(pdi, 2), minusDI: round(mdi, 2) },
        );
      }
      const dir: Direction = pdi > mdi ? "buy" : "sell";
      const strength = clamp01((adxVal - 18) / 32 + (Math.abs(pdi - mdi) / Math.max(pdi + mdi, 1)) * 0.4);
      return result(
        "adx_trend",
        "ADX / DMI Trend Strength",
        dir,
        strength,
        50 + strength * 40,
        `ADX ${fmt(adxVal, 1)} confirms a ${dir === "buy" ? "bullish" : "bearish"} trend (+DI ${fmt(pdi, 1)} vs -DI ${fmt(mdi, 1)}).`,
        { adx: round(adxVal, 2), plusDI: round(pdi, 2), minusDI: round(mdi, 2) },
      );
    },
  },
  {
    id: "supertrend",
    name: "Supertrend 10/3",
    category: "Trend",
    description: "ATR-based trailing trend flip system.",
    defaultWeight: 1.15,
    run: (ctx) => {
      const st = supertrend(ctx.candles, 10, 3);
      const dir = lastValue(st.direction);
      const line = lastValue(st.line);
      const price = closes(ctx.candles);
      const c = price[price.length - 1];
      const a = atr(ctx.candles, 14);
      const atrVal = lastValue(a) ?? 0;
      if (dir === null || line === null) {
        return result("supertrend", "Supertrend 10/3", "neutral", 0, 20, "Not enough candles for Supertrend.");
      }
      const distance = atrVal ? Math.abs(c - line) / atrVal : 0;
      const strength = clamp01(0.4 + distance * 0.9);
      const signal: Direction = dir === 1 ? "buy" : "sell";
      return result(
        "supertrend",
        "Supertrend 10/3",
        signal,
        strength,
        55 + strength * 35,
        `Supertrend is ${dir === 1 ? "long" : "short"} — stop line at ${fmt(line, 5)}, ${fmt(distance, 2)} ATR away.`,
        { supertrendLine: round(line, 5), direction: dir === 1 ? "bullish" : "bearish" },
      );
    },
  },
  {
    id: "donchian",
    name: "Donchian Channel 20",
    category: "Trend",
    description: "Breakout beyond the 20-period high/low range.",
    defaultWeight: 1,
    run: (ctx) => {
      const d = donchian(ctx.candles, 20);
      const upper = prevValue(d.upper, 1);
      const lower = prevValue(d.lower, 1);
      const c = closes(ctx.candles)[closes(ctx.candles).length - 1];
      if (upper === null || lower === null) {
        return result("donchian", "Donchian Channel 20", "neutral", 0, 20, "Not enough candles for Donchian Channel.");
      }
      let dir: Direction = "neutral";
      let strength = 0;
      if (c > upper) {
        dir = "buy";
        strength = 0.8;
      } else if (c < lower) {
        dir = "sell";
        strength = 0.8;
      }
      return result(
        "donchian",
        "Donchian Channel 20",
        dir,
        strength,
        dir === "neutral" ? 35 : 60 + strength * 30,
        dir === "neutral"
          ? `Price is inside the 20-bar range (${fmt(lower, 5)} – ${fmt(upper, 5)}).`
          : `Price broke out ${dir === "buy" ? "above" : "below"} the 20-bar channel.`,
        { channelHigh: round(upper, 5), channelLow: round(lower, 5) },
      );
    },
  },
  {
    id: "vwap_trend",
    name: "VWAP Deviation",
    category: "Volume",
    description: "Volume-weighted average price deviation and slope.",
    defaultWeight: 0.9,
    run: (ctx) => {
      const v = vwap(ctx.candles);
      const value = lastValue(v);
      const prev = prevValue(v, 1);
      const price = closes(ctx.candles);
      const c = price[price.length - 1];
      if (value === null || prev === null) {
        return result("vwap_trend", "VWAP Deviation", "neutral", 0, 20, "Not enough candles for VWAP.");
      }
      const slope = value - prev;
      const rel = Math.abs(c - value) / (Math.abs(value) || 1);
      let dir: Direction = "neutral";
      let strength = 0;
      if (c < value && slope > 0) {
        dir = "buy";
        strength = clamp01(0.35 + rel * 25);
      } else if (c > value && slope < 0) {
        dir = "sell";
        strength = clamp01(0.35 + rel * 25);
      } else if (c > value && slope > 0) {
        dir = "buy";
        strength = 0.35;
      } else if (c < value && slope < 0) {
        dir = "sell";
        strength = 0.35;
      }
      return result(
        "vwap_trend",
        "VWAP Deviation",
        dir,
        strength,
        dir === "neutral" ? 35 : 50 + strength * 30,
        dir === "neutral"
          ? `Price is tracking VWAP at ${fmt(value, 5)} with no clean deviation.`
          : `Price ${c < value ? "below" : "above"} VWAP (${fmt(value, 5)}) with VWAP ${slope > 0 ? "rising" : "falling"}.`,
        { vwap: round(value, 5), deviationPct: round(rel * 100, 3) },
      );
    },
  },
  {
    id: "ichimoku",
    name: "Ichimoku Cloud",
    category: "Confluence",
    description: "Tenkan/Kijun cross, cloud position and Chikou confirmation.",
    defaultWeight: 1,
    run: (ctx) => {
      const c = ctx.candles;
      const n = c.length;
      if (n < 52) {
        return result("ichimoku", "Ichimoku Cloud", "neutral", 0, 25, "Needs 52+ candles for full Ichimoku.");
      }
      const mid = (period: number, end: number) => {
        let hh = -Infinity;
        let ll = Infinity;
        for (let i = end - period + 1; i <= end; i++) {
          hh = Math.max(hh, c[i].h);
          ll = Math.min(ll, c[i].l);
        }
        return (hh + ll) / 2;
      };
      const tenkan = mid(9, n - 1);
      const kijun = mid(26, n - 1);
      const senkouA = (tenkan + kijun) / 2;
      const senkouB = mid(52, n - 1);
      const price = c[n - 1].c;
      const aboveCloud = price > Math.max(senkouA, senkouB);
      const belowCloud = price < Math.min(senkouA, senkouB);
      const tkCross = tenkan > kijun;
      let dir: Direction = "neutral";
      let strength = 0;
      let note = "Price is inside the Ichimoku cloud — indecision.";
      if (aboveCloud && tkCross) {
        dir = "buy";
        strength = 0.75;
        note = "Price above the cloud with Tenkan above Kijun — bullish structure.";
      } else if (belowCloud && !tkCross) {
        dir = "sell";
        strength = 0.75;
        note = "Price below the cloud with Tenkan below Kijun — bearish structure.";
      } else if (aboveCloud) {
        dir = "buy";
        strength = 0.4;
        note = "Price above the cloud but the Tenkan/Kijun line is not confirming.";
      } else if (belowCloud) {
        dir = "sell";
        strength = 0.4;
        note = "Price below the cloud but the Tenkan/Kijun line is not confirming.";
      }
      return result(
        "ichimoku",
        "Ichimoku Cloud",
        dir,
        strength,
        dir === "neutral" ? 35 : 55 + strength * 30,
        note,
        { tenkan: round(tenkan, 5), kijun: round(kijun, 5), senkouA: round(senkouA, 5), senkouB: round(senkouB, 5) },
      );
    },
  },
  {
    id: "golden_cross",
    name: "Golden / Death Cross",
    category: "Trend",
    description: "50 / 200 moving-average regime detector.",
    defaultWeight: 1.15,
    run: (ctx) => {
      const price = closes(ctx.candles);
      const fast = sma(price, 50);
      const slow = sma(price, 200);
      const f = lastValue(fast);
      const s = lastValue(slow);
      if (f === null || s === null) {
        return result("golden_cross", "Golden / Death Cross", "neutral", 0, 25, "Needs 200+ candles for the 50/200 regime.");
      }
      const dir: Direction = f > s ? "buy" : "sell";
      const gap = Math.abs(f - s) / (Math.abs(s) || 1);
      const strength = clamp01(0.45 + gap * 12);
      return result(
        "golden_cross",
        "Golden / Death Cross",
        dir,
        strength,
        60 + strength * 30,
        `SMA50 is ${dir === "buy" ? "above" : "below"} SMA200 (${dir === "buy" ? "golden" : "death"} cross regime, gap ${fmt(gap * 100, 2)}%).`,
        { sma50: round(f, 5), sma200: round(s, 5) },
      );
    },
  },
  {
    id: "price_structure",
    name: "Market Structure (HH/LL)",
    category: "Price Action",
    description: "Swing structure of higher-highs and higher-lows.",
    defaultWeight: 1,
    run: (ctx) => {
      const { highs, lows } = swingPoints(ctx.candles, 3);
      if (highs.length < 2 || lows.length < 2) {
        return result("price_structure", "Market Structure (HH/LL)", "neutral", 0, 25, "Not enough swings to map structure.");
      }
      const hh = highs[highs.length - 1].price > highs[highs.length - 2].price;
      const hl = lows[lows.length - 1].price > lows[lows.length - 2].price;
      const lh = highs[highs.length - 1].price < highs[highs.length - 2].price;
      const ll = lows[lows.length - 1].price < lows[lows.length - 2].price;
      let dir: Direction = "neutral";
      let strength = 0;
      let note = "Structure is mixed — no clean trend leg.";
      if (hh && hl) {
        dir = "buy";
        strength = 0.7;
        note = "Higher high + higher low — bullish structure.";
      } else if (lh && ll) {
        dir = "sell";
        strength = 0.7;
        note = "Lower high + lower low — bearish structure.";
      } else if (hh && ll) {
        note = "Expanding range — higher high with a lower low.";
      }
      return result("price_structure", "Market Structure (HH/LL)", dir, strength, dir === "neutral" ? 35 : 58 + strength * 30, note);
    },
  },
  {
    id: "momentum_roc",
    name: "Rate of Change Momentum",
    category: "Momentum",
    description: "Rate-of-change slope over the last 10 candles.",
    defaultWeight: 0.9,
    run: (ctx) => {
      const price = closes(ctx.candles);
      const n = price.length;
      if (n < 12) {
        return result("momentum_roc", "Rate of Change Momentum", "neutral", 0, 20, "Not enough candles for ROC.");
      }
      const roc = ((price[n - 1] - price[n - 11]) / (price[n - 11] || 1)) * 100;
      const rocPrev = ((price[n - 2] - price[n - 12]) / (price[n - 12] || 1)) * 100;
      const accelerating = Math.abs(roc) > Math.abs(rocPrev);
      const dir: Direction = roc > 0 ? "buy" : "sell";
      const strength = clamp01(Math.min(Math.abs(roc) / 4, 1) * (accelerating ? 1 : 0.65));
      return result(
        "momentum_roc",
        "Rate of Change Momentum",
        dir,
        strength,
        50 + strength * 35,
        `10-bar ROC is ${fmt(roc, 2)}% and ${accelerating ? "accelerating" : "decelerating"}.`,
        { roc: round(roc, 3) },
      );
    },
  },
  {
    id: "obv_trend",
    name: "OBV Trend Confirmation",
    category: "Volume",
    description: "On-balance volume versus its own moving average.",
    defaultWeight: 0.85,
    run: (ctx) => {
      const series = obv(ctx.candles);
      const ma = sma(series, 20);
      const value = series[series.length - 1];
      const avg = lastValue(ma);
      const slope = value - series[series.length - 6];
      if (avg === null) {
        return result("obv_trend", "OBV Trend Confirmation", "neutral", 0, 25, "Not enough candles for OBV.");
      }
      const dir: Direction = value > avg ? "buy" : "sell";
      const strength = clamp01(0.35 + Math.min(Math.abs(slope) / (Math.abs(avg) || 1) * 10, 0.6));
      return result(
        "obv_trend",
        "OBV Trend Confirmation",
        dir,
        strength,
        48 + strength * 35,
        `OBV is ${value > avg ? "above" : "below"} its 20-bar average and ${slope > 0 ? "rising" : "falling"}.`,
        { obv: round(value, 0) },
      );
    },
  },
  {
    id: "pivot_points",
    name: "Classic Pivot Levels",
    category: "Price Action",
    description: "Daily pivot, R1/R2/R3 and S1/S2/S3 support and resistance.",
    defaultWeight: 0.9,
    run: (ctx) => {
      const p = pivots(ctx.candles);
      if (!p) {
        return result("pivot_points", "Classic Pivot Levels", "neutral", 0, 20, "Not enough candles for pivots.");
      }
      const c = closes(ctx.candles)[closes(ctx.candles).length - 1];
      let dir: Direction = "neutral";
      let strength = 0;
      let note = `Price ${c > p.p ? "above" : "below"} the daily pivot ${fmt(p.p, 5)}.`;
      const near = (v: number) => Math.abs(c - v) / (Math.abs(c) || 1) < 0.0025;
      if (near(p.s1) || near(p.s2)) {
        dir = "buy";
        strength = 0.6;
        note = `Price is sitting on support S1/S2 (${fmt(p.s1, 5)} / ${fmt(p.s2, 5)}).`;
      } else if (near(p.r1) || near(p.r2)) {
        dir = "sell";
        strength = 0.6;
        note = `Price is sitting on resistance R1/R2 (${fmt(p.r1, 5)} / ${fmt(p.r2, 5)}).`;
      } else if (c > p.r1) {
        dir = "buy";
        strength = 0.45;
        note = "Price has broken above R1 — bullish continuation.";
      } else if (c < p.s1) {
        dir = "sell";
        strength = 0.45;
        note = "Price has broken below S1 — bearish continuation.";
      }
      return result(
        "pivot_points",
        "Classic Pivot Levels",
        dir,
        strength,
        dir === "neutral" ? 38 : 52 + strength * 30,
        note,
        { pivot: round(p.p, 5), r1: round(p.r1, 5), s1: round(p.s1, 5) },
      );
    },
  },
  {
    id: "candlestick",
    name: "Candlestick Patterns",
    category: "Price Action",
    description: "Engulfing, hammer and shooting-star reversal candles.",
    defaultWeight: 0.95,
    run: (ctx) => {
      const c = ctx.candles;
      if (c.length < 3) {
        return result("candlestick", "Candlestick Patterns", "neutral", 0, 20, "Not enough candles.");
      }
      const last = c[c.length - 1];
      const prev = c[c.length - 2];
      const prev2 = c[c.length - 3];
      const body = Math.abs(last.c - last.o);
      const range = last.h - last.l;
      const upperWick = last.h - Math.max(last.c, last.o);
      const lowerWick = Math.min(last.c, last.o) - last.l;
      const bullishEngulfing =
        prev.c < prev.o && last.c > last.o && last.o <= prev.c && last.c >= prev.o && body > range * 0.4;
      const bearishEngulfing =
        prev.c > prev.o && last.c < last.o && last.o >= prev.c && last.c <= prev.o && body > range * 0.4;
      const hammer = lowerWick > body * 2 && upperWick < body * 0.6 && range > 0;
      const shootingStar = upperWick > body * 2 && lowerWick < body * 0.6 && range > 0;
      const prevBull = prev2.c < prev2.o;
      let dir: Direction = "neutral";
      let strength = 0;
      let note = "No decisive candlestick formation on the last bar.";
      if (bullishEngulfing) {
        dir = "buy";
        strength = 0.75;
        note = "Bullish engulfing candle — buyers took control.";
      } else if (bearishEngulfing) {
        dir = "sell";
        strength = 0.75;
        note = "Bearish engulfing candle — sellers took control.";
      } else if (hammer && prevBull) {
        dir = "buy";
        strength = 0.6;
        note = "Hammer candle after a down bar — rejection of lows.";
      } else if (shootingStar) {
        dir = "sell";
        strength = 0.6;
        note = "Shooting star candle — rejection of highs.";
      }
      return result(
        "candlestick",
        "Candlestick Patterns",
        dir,
        strength,
        dir === "neutral" ? 32 : 55 + strength * 30,
        note,
      );
    },
  },
  {
    id: "fib_pullback",
    name: "Fibonacci Pullback",
    category: "Confluence",
    description: "Trend continuation after a retracement into the golden zone.",
    defaultWeight: 1,
    run: (ctx) => {
      const { highs, lows } = swingPoints(ctx.candles, 5);
      if (highs.length < 1 || lows.length < 1) {
        return result("fib_pullback", "Fibonacci Pullback", "neutral", 0, 25, "Not enough swings for Fibonacci levels.");
      }
      const high = Math.max(...highs.map((h) => h.price));
      const low = Math.min(...lows.map((l) => l.price));
      const levels = fibLevels(high, low);
      const price = closes(ctx.candles);
      const c = price[price.length - 1];
      const uptrend = price[price.length - 1] > price[Math.max(0, price.length - 21)];
      const inZone = c <= levels["0.618"] && c >= levels["0.382"];
      let dir: Direction = "neutral";
      let strength = 0;
      let note = "Price is not sitting in a Fibonacci retracement zone.";
      if (uptrend && inZone) {
        dir = "buy";
        strength = 0.7;
        note = `Uptrend with price in the 38.2–61.8% retracement zone (${fmt(levels["0.618"], 5)}–${fmt(levels["0.382"], 5)}).`;
      } else if (!uptrend && inZone) {
        dir = "sell";
        strength = 0.7;
        note = `Downtrend with price in the 38.2–61.8% retracement zone (${fmt(levels["0.618"], 5)}–${fmt(levels["0.382"], 5)}).`;
      }
      return result(
        "fib_pullback",
        "Fibonacci Pullback",
        dir,
        strength,
        dir === "neutral" ? 35 : 55 + strength * 30,
        note,
        { fib618: round(levels["0.618"], 5), fib382: round(levels["0.382"], 5) },
      );
    },
  },
  {
    id: "mtf_confirmation",
    name: "Multi-Timeframe Confirmation",
    category: "Confluence",
    description: "Confirms the signal using a 4x higher timeframe trend.",
    defaultWeight: 1.3,
    run: async (ctx) => {
      if (!ctx.fetchHigherTimeframe) {
        return result("mtf_confirmation", "Multi-Timeframe Confirmation", "neutral", 0, 30, "Higher timeframe data unavailable.");
      }
      const higher = await ctx.fetchHigherTimeframe();
      if (!higher || higher.length < 60) {
        return result("mtf_confirmation", "Multi-Timeframe Confirmation", "neutral", 0, 30, "Higher timeframe data unavailable.");
      }
      const price = closes(higher);
      const fast = ema(price, 21);
      const slow = ema(price, 50);
      const f = lastValue(fast);
      const s = lastValue(slow);
      if (f === null || s === null) {
        return result("mtf_confirmation", "Multi-Timeframe Confirmation", "neutral", 0, 30, "Higher timeframe data unavailable.");
      }
      const dir: Direction = f > s ? "buy" : "sell";
      const strength = clamp01(0.5 + Math.min(Math.abs(f - s) / (Math.abs(s) || 1) * 10, 0.5));
      return result(
        "mtf_confirmation",
        "Multi-Timeframe Confirmation",
        dir,
        strength,
        60 + strength * 30,
        `Higher timeframe (${ctx.interval} x4) trend is ${dir === "buy" ? "bullish" : "bearish"} — EMA21 vs EMA50.`,
        { htfEma21: round(f, 5), htfEma50: round(s, 5) },
      );
    },
  },
  {
    id: "tradingview_consensus",
    name: "TradingView Consensus",
    category: "Confluence",
    description: "Uses TradingView's own screener recommendation and oscillators.",
    defaultWeight: 1.25,
    run: (ctx) => {
      const tv = ctx.tvIndicators;
      if (!tv || tv.recommendation === null || tv.recommendation === undefined) {
        return result("tradingview_consensus", "TradingView Consensus", "neutral", 0, 35, "TradingView screener snapshot not available for this symbol.");
      }
      const rec = tv.recommendation;
      let dir: Direction = "neutral";
      let strength = 0;
      if (rec >= 0.25) {
        dir = "buy";
        strength = clamp01(Math.min(rec / 1, 1) * 0.95);
      } else if (rec <= -0.25) {
        dir = "sell";
        strength = clamp01(Math.min(Math.abs(rec) / 1, 1) * 0.95);
      }
      return result(
        "tradingview_consensus",
        "TradingView Consensus",
        dir,
        strength,
        dir === "neutral" ? 40 : 60 + strength * 30,
        dir === "neutral"
          ? `TradingView recommendation is ${fmt(rec, 2)} — neutral / mixed oscillators.`
          : `TradingView recommendation score ${fmt(rec, 2)} leans ${dir}.`,
        {
          recommendation: round(rec, 3),
          rsi: round(tv.rsi ?? null, 2),
          adx: round(tv.adx ?? null, 2),
          ema20: round(tv.ema20 ?? null, 5),
          ema50: round(tv.ema50 ?? null, 5),
        },
      );
    },
  },
];

export const STRATEGY_MAP: Record<string, StrategyDef> = Object.fromEntries(
  STRATEGIES.map((s) => [s.id, s]),
);

export function strategyById(id: string): StrategyDef | undefined {
  return STRATEGY_MAP[id];
}
