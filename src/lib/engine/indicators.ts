import type { Candle } from "../types";

export function closes(candles: Candle[]): number[] {
  return candles.map((c) => c.c);
}

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period || period <= 0) return out;
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = period - 1; i < values.length; i++) {
    if (prev === null) {
      let seed = 0;
      for (let j = i - period + 1; j <= i; j++) seed += values[j];
      prev = seed / period;
    } else {
      prev = values[i] * k + prev * (1 - k);
    }
    out[i] = prev;
  }
  return out;
}

export function stdev(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const window = values.slice(i - period + 1, i + 1);
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const variance = window.reduce((a, b) => a + (b - mean) ** 2, 0) / window.length;
    out[i] = Math.sqrt(variance);
  }
  return out;
}

export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export function trueRanges(candles: Candle[]): number[] {
  return candles.map((c, i) =>
    i === 0
      ? c.h - c.l
      : Math.max(c.h - c.l, Math.abs(c.h - candles[i - 1].c), Math.abs(c.l - candles[i - 1].c)),
  );
}

export function atr(candles: Candle[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  const tr = trueRanges(candles);
  let sum = 0;
  for (let i = 0; i < tr.length; i++) {
    sum += tr[i];
    if (i >= period) sum -= tr[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export type MacdResult = {
  macd: (number | null)[];
  signal: (number | null)[];
  hist: (number | null)[];
};

export function macd(
  values: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): MacdResult {
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  const macdLine: (number | null)[] = values.map((_, i) =>
    fastEma[i] !== null && slowEma[i] !== null ? (fastEma[i] as number) - (slowEma[i] as number) : null,
  );
  const firstIdx = macdLine.findIndex((v) => v !== null);
  const compact = macdLine.slice(firstIdx).map((v) => v as number);
  const sigCompact = ema(compact, signalPeriod);
  const signal: (number | null)[] = new Array(values.length).fill(null);
  const hist: (number | null)[] = new Array(values.length).fill(null);
  if (firstIdx >= 0) {
    for (let i = 0; i < sigCompact.length; i++) {
      signal[firstIdx + i] = sigCompact[i];
      const m = macdLine[firstIdx + i] as number;
      const s = sigCompact[i];
      hist[firstIdx + i] = s === null ? null : m - s;
    }
  }
  return { macd: macdLine, signal, hist };
}

export type BollingerResult = {
  upper: (number | null)[];
  mid: (number | null)[];
  lower: (number | null)[];
  width: (number | null)[];
  percentB: (number | null)[];
};

export function bollinger(values: number[], period = 20, mult = 2): BollingerResult {
  const mid = sma(values, period);
  const sd = stdev(values, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const width: (number | null)[] = [];
  const percentB: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    const m = mid[i];
    const s = sd[i];
    if (m === null || s === null) {
      upper.push(null);
      lower.push(null);
      width.push(null);
      percentB.push(null);
      continue;
    }
    const u = m + mult * s;
    const l = m - mult * s;
    upper.push(u);
    lower.push(l);
    width.push(values.length > 0 ? ((u - l) / m) * 100 : null);
    percentB.push(u === l ? 0.5 : (values[i] - l) / (u - l));
  }
  return { upper, mid, lower, width, percentB };
}

export type StochResult = { k: (number | null)[]; d: (number | null)[] };

export function stochastic(candles: Candle[], kPeriod = 14, kSmooth = 3, dPeriod = 3): StochResult {
  const raw: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = kPeriod - 1; i < candles.length; i++) {
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      hh = Math.max(hh, candles[j].h);
      ll = Math.min(ll, candles[j].l);
    }
    raw[i] = hh === ll ? 50 : ((candles[i].c - ll) / (hh - ll)) * 100;
  }
  const compact = raw.filter((v): v is number => v !== null);
  const smoothed = sma(compact, kSmooth);
  const k: (number | null)[] = new Array(candles.length).fill(null);
  let offset = 0;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === null) continue;
    k[i] = smoothed[offset] ?? null;
    offset += 1;
  }
  const kCompact = k.filter((v): v is number => v !== null);
  const dSmooth = sma(kCompact, dPeriod);
  const d: (number | null)[] = new Array(candles.length).fill(null);
  let o2 = 0;
  for (let i = 0; i < k.length; i++) {
    if (k[i] === null) continue;
    d[i] = dSmooth[o2] ?? null;
    o2 += 1;
  }
  return { k, d };
}

export type AdxResult = { adx: (number | null)[]; plusDI: (number | null)[]; minusDI: (number | null)[] };

export function adx(candles: Candle[], period = 14): AdxResult {
  const n = candles.length;
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];
  const tr: number[] = [candles[0] ? candles[0].h - candles[0].l : 0];
  for (let i = 1; i < n; i++) {
    const up = candles[i].h - candles[i - 1].h;
    const down = candles[i - 1].l - candles[i].l;
    plusDM.push(up > down && up > 0 ? up : 0);
    minusDM.push(down > up && down > 0 ? down : 0);
    tr.push(
      Math.max(
        candles[i].h - candles[i].l,
        Math.abs(candles[i].h - candles[i - 1].c),
        Math.abs(candles[i].l - candles[i - 1].c),
      ),
    );
  }
  const smooth = (arr: number[]) => {
    const out: number[] = new Array(n).fill(0);
    for (let i = 1; i < n; i++) out[i] = out[i - 1] + arr[i];
    return out;
  };
  const trS = smooth(tr);
  const plusS = smooth(plusDM);
  const minusS = smooth(minusDM);
  const plusDI: (number | null)[] = new Array(n).fill(null);
  const minusDI: (number | null)[] = new Array(n).fill(null);
  const dx: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (i < period) continue;
    const denom = trS[i] === 0 ? 1 : trS[i];
    const p = (100 * plusS[i]) / denom;
    const m = (100 * minusS[i]) / denom;
    plusDI[i] = p;
    minusDI[i] = m;
    const sum = p + m;
    dx[i] = sum === 0 ? 0 : (100 * Math.abs(p - m)) / sum;
  }
  const firstDx = dx.findIndex((v) => v !== null);
  const adxOut: (number | null)[] = new Array(n).fill(null);
  if (firstDx >= 0) {
    const compact = dx.slice(firstDx).map((v) => v as number);
    const smoothed = sma(compact, period);
    for (let i = 0; i < compact.length; i++) adxOut[firstDx + i] = smoothed[i] ?? null;
  }
  return { adx: adxOut, plusDI, minusDI };
}

export type SupertrendResult = { line: (number | null)[]; direction: (number | null)[] };

export function supertrend(candles: Candle[], period = 10, mult = 3): SupertrendResult {
  const n = candles.length;
  const line: (number | null)[] = new Array(n).fill(null);
  const direction: (number | null)[] = new Array(n).fill(null);
  const atrArr = atr(candles, period);
  const hl2 = candles.map((c) => (c.h + c.l) / 2);
  let finalBand = 0;
  let prevClose = candles[0]?.c ?? 0;
  let up = 0;
  let down = 0;
  for (let i = 0; i < n; i++) {
    const a = atrArr[i];
    if (a === null) continue;
    const basicUpper = hl2[i] + mult * a;
    const basicLower = hl2[i] - mult * a;
    if (i === 0 || atrArr[i - 1] === null) {
      up = basicUpper;
      down = basicLower;
      finalBand = 0;
    } else {
      up = basicUpper < up || prevClose > up ? basicUpper : up;
      down = basicLower > down || prevClose < down ? basicLower : down;
    }
    if (candles[i].c > up) finalBand = 1;
    else if (candles[i].c < down) finalBand = -1;
    else if (finalBand === 0) finalBand = candles[i].c > hl2[i] ? 1 : -1;
    line[i] = finalBand === 1 ? down : up;
    direction[i] = finalBand;
    prevClose = candles[i].c;
  }
  return { line, direction };
}

export function donchian(candles: Candle[], period = 20): { upper: (number | null)[]; lower: (number | null)[] } {
  const upper: (number | null)[] = new Array(candles.length).fill(null);
  const lower: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = period - 1; i < candles.length; i++) {
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      hh = Math.max(hh, candles[j].h);
      ll = Math.min(ll, candles[j].l);
    }
    upper[i] = hh;
    lower[i] = ll;
  }
  return { upper, lower };
}

export function vwap(candles: Candle[]): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  let cumPV = 0;
  let cumV = 0;
  let currentDay = candles[0] ? new Date(candles[0].t).toISOString().slice(0, 10) : "";
  for (let i = 0; i < candles.length; i++) {
    const day = new Date(candles[i].t).toISOString().slice(0, 10);
    if (day !== currentDay) {
      currentDay = day;
      cumPV = 0;
      cumV = 0;
    }
    const typical = (candles[i].h + candles[i].l + candles[i].c) / 3;
    cumPV += typical * candles[i].v;
    cumV += candles[i].v;
    out[i] = cumV === 0 ? typical : cumPV / cumV;
  }
  return out;
}

export function obv(candles: Candle[]): number[] {
  const out: number[] = [0];
  for (let i = 1; i < candles.length; i++) {
    const diff = candles[i].c - candles[i - 1].c;
    out.push(out[i - 1] + (diff > 0 ? candles[i].v : diff < 0 ? -candles[i].v : 0));
  }
  return out;
}

export function rollingMax(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    out[i] = Math.max(...values.slice(i - period + 1, i + 1));
  }
  return out;
}

export function rollingMin(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    out[i] = Math.min(...values.slice(i - period + 1, i + 1));
  }
  return out;
}

export function swingPoints(candles: Candle[], lookback = 3) {
  const highs: { index: number; price: number }[] = [];
  const lows: { index: number; price: number }[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const window = candles.slice(i - lookback, i + lookback + 1);
    if (candles[i].h === Math.max(...window.map((c) => c.h))) highs.push({ index: i, price: candles[i].h });
    if (candles[i].l === Math.min(...window.map((c) => c.l))) lows.push({ index: i, price: candles[i].l });
  }
  return { highs, lows };
}

export function pivots(candles: Candle[]) {
  if (candles.length < 2) return null;
  const prev = candles[candles.length - 2];
  const p = (prev.h + prev.l + prev.c) / 3;
  const r1 = 2 * p - prev.l;
  const s1 = 2 * p - prev.h;
  const r2 = p + (prev.h - prev.l);
  const s2 = p - (prev.h - prev.l);
  const r3 = prev.h + 2 * (p - prev.l);
  const s3 = prev.l - 2 * (prev.h - p);
  return { p, r1, r2, r3, s1, s2, s3 };
}

export function fibLevels(high: number, low: number) {
  const range = high - low;
  return {
    "0": high,
    "0.382": high - range * 0.382,
    "0.5": high - range * 0.5,
    "0.618": high - range * 0.618,
    "0.786": high - range * 0.786,
    "1": low,
  };
}

export function round(value: number | null | undefined, digits = 2): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function priceDigits(price: number): number {
  const abs = Math.abs(price);
  if (abs >= 1000) return 2;
  if (abs >= 100) return 3;
  if (abs >= 1) return 4;
  if (abs >= 0.01) return 5;
  return 8;
}
