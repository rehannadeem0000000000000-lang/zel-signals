import { analyzeWithAi } from "@/lib/engine/ai";
import { runAnalysis } from "@/lib/engine/analysis";
import { fetchSymbolOptions } from "@/lib/engine/providers";
import type { AiConfig, AiVerdict, AnalysisResult, MarketType, ProviderId } from "@/lib/types";

export type AnalysisRequest = {
  provider: ProviderId;
  apiKey?: string;
  providerAccountId?: string | null;
  market: MarketType;
  exchange: string;
  symbol: string;
  interval: string;
  strategyIds: string[];
  riskReward: number;
  useTvConsensus: boolean;
};

function isOfflineMode(): boolean {
  return typeof window !== "undefined" && !!(window as { Capacitor?: unknown }).Capacitor;
}

/**
 * Runs the analysis through the server when available (web app), and falls back to
 * running the identical engine in the browser (offline APK build) when the API is
 * not reachable.
 */
export async function requestAnalysis(req: AnalysisRequest): Promise<AnalysisResult> {
  if (!isOfflineMode()) {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    const data = (await res.json().catch(() => null)) as { analysis?: AnalysisResult; error?: string } | null;
    if (res.ok && data?.analysis) return data.analysis;
    if (res.status === 400 || res.status === 500) {
      throw new Error(data?.error ?? "The analysis engine could not complete this run.");
    }
    throw new Error(data?.error ?? "The analysis service is unavailable.");
  }

  return runAnalysis({
    provider: req.provider,
    apiKey: req.apiKey,
    market: req.market,
    exchange: req.exchange,
    symbol: req.symbol,
    interval: req.interval,
    strategyIds: req.strategyIds,
    riskReward: req.riskReward,
    useTvConsensus: req.useTvConsensus,
  });
}

export async function requestAiVerdict(
  analysis: AnalysisResult,
  aiConfig: AiConfig,
  analysisId?: string,
): Promise<AiVerdict> {
  if (!isOfflineMode()) {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysis, analysisId, aiConfig }),
    });
    const data = (await res.json().catch(() => null)) as { verdict?: AiVerdict; error?: string } | null;
    if (res.ok && data?.verdict) return data.verdict;
    throw new Error(data?.error ?? "The AI review could not be completed.");
  }
  return analyzeWithAi(aiConfig, analysis);
}

export async function searchSymbols(params: {
  provider: ProviderId;
  market: MarketType;
  exchange: string;
  query: string;
}): Promise<{ symbol: string; label: string; exchange?: string; source: string }[]> {
  if (!isOfflineMode()) {
    const qs = new URLSearchParams({
      provider: params.provider,
      market: params.market,
      exchange: params.exchange,
      q: params.query,
    });
    const res = await fetch(`/api/symbols?${qs.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as { symbols: { symbol: string; label: string; exchange?: string; source: string }[] };
      return data.symbols;
    }
  }
  return fetchSymbolOptions({
    provider: params.provider,
    market: params.market,
    exchange: params.exchange,
    query: params.query,
  });
}

const PROVIDER_STORE = "zel.provider.keys";
const AI_STORE = "zel.ai.config";
const HISTORY_STORE = "zel.history";

export type HistoryRecord = {
  id: string;
  symbol: string;
  exchange: string;
  interval: string;
  signal: string;
  confidence: number;
  entry: number | null;
  takeProfit: number | null;
  stopLoss: number | null;
  aiBias: string | null;
  aiVerdict: string | null;
  createdAt: string;
};

export function saveLocalHistory(record: HistoryRecord) {
  if (typeof window === "undefined") return;
  try {
    const existing = loadLocalHistory();
    const next = [record, ...existing.filter((item) => item.id !== record.id)].slice(0, 25);
    window.localStorage.setItem(HISTORY_STORE, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function loadLocalHistory(): HistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORE);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadStoredProvider(): { provider: ProviderId; apiKey: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROVIDER_STORE);
    if (!raw) return null;
    return JSON.parse(raw) as { provider: ProviderId; apiKey: string };
  } catch {
    return null;
  }
}

export function storeProvider(provider: ProviderId, apiKey: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROVIDER_STORE, JSON.stringify({ provider, apiKey }));
  } catch {
    /* ignore */
  }
}

export function loadStoredAiConfig(): AiConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AI_STORE);
    if (!raw) return null;
    return JSON.parse(raw) as AiConfig;
  } catch {
    return null;
  }
}

export function storeAiConfig(config: AiConfig) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AI_STORE, JSON.stringify(config));
  } catch {
    /* ignore */
  }
}
