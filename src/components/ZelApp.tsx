"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AiBox } from "./AiBox";
import { HistoryPanel } from "./HistoryPanel";
import { MarketStep, type SymbolOption } from "./MarketStep";
import { ProviderStep, type ProviderAccountSummary } from "./ProviderStep";
import { ResultPanel } from "./ResultPanel";
import { StrategyStep } from "./StrategyStep";
import { Badge, Button, Card } from "./ui";
import {
  loadStoredAiConfig,
  loadStoredProvider,
  requestAiVerdict,
  requestAnalysis,
  searchSymbols,
  storeAiConfig,
  storeProvider,
} from "@/lib/client/api";
import { AI_PROVIDER_MAP } from "@/lib/engine/ai";
import { PROVIDER_MAP } from "@/lib/engine/providers";
import type { AiConfig, AiVerdict, AnalysisResult, MarketType, ProviderId } from "@/lib/types";

const STEPS = [
  { id: 1, label: "Provider" },
  { id: 2, label: "Market" },
  { id: 3, label: "Strategies" },
  { id: 4, label: "Signal" },
];

const DEFAULT_STRATEGIES = [
  "ema_crossover",
  "rsi_reversal",
  "macd",
  "bollinger",
  "supertrend",
  "adx_trend",
];

export function ZelApp() {
  const [step, setStep] = useState(1);
  const [isNative, setIsNative] = useState(false);

  const [provider, setProvider] = useState<ProviderId>("demo");
  const [apiKey, setApiKey] = useState("");
  const [remember, setRemember] = useState(true);
  const [accounts, setAccounts] = useState<ProviderAccountSummary[]>([]);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState(false);

  const [market, setMarket] = useState<MarketType>("forex");
  const [exchange, setExchange] = useState("OANDA");
  const [symbol, setSymbol] = useState("EUR/USD");
  const [symbolLabel, setSymbolLabel] = useState("Euro / US Dollar");
  const [interval, setInterval] = useState("1h");
  const [symbols, setSymbols] = useState<SymbolOption[]>([]);
  const [symbolQuery, setSymbolQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const [strategyIds, setStrategyIds] = useState<string[]>(DEFAULT_STRATEGIES);
  const [riskReward, setRiskReward] = useState(2);
  const [useTvConsensus, setUseTvConsensus] = useState(false);

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [aiConfig, setAiConfig] = useState<AiConfig>({
    provider: "openai",
    apiKey: "",
    baseUrl: AI_PROVIDER_MAP.openai.defaultBaseUrl,
    model: AI_PROVIDER_MAP.openai.defaultModel,
  });
  const [aiVerdict, setAiVerdict] = useState<AiVerdict | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  useEffect(() => {
    const native = typeof window !== "undefined" && !!(window as { Capacitor?: unknown }).Capacitor;
    setIsNative(native);
    if (native) {
      const stored = loadStoredProvider();
      if (stored) {
        setProvider(stored.provider);
        setApiKey(stored.apiKey);
      }
      const storedAi = loadStoredAiConfig();
      if (storedAi) setAiConfig(storedAi);
    } else {
      void (async () => {
        try {
          const res = await fetch("/api/providers");
          if (res.ok) {
            const data = (await res.json()) as { accounts?: ProviderAccountSummary[] };
            setAccounts(data.accounts ?? []);
          }
        } catch {
          /* ignore */
        }
        try {
          const res = await fetch("/api/ai-config");
          if (res.ok) {
            const data = (await res.json()) as {
              config?: { provider: string; baseUrl: string; model: string; apiKeyHint: string } | null;
            };
            if (data.config) {
              setAiConfig((current) => ({
                ...current,
                provider: (data.config?.provider ?? current.provider) as AiConfig["provider"],
                baseUrl: data.config?.baseUrl || current.baseUrl,
                model: data.config?.model || current.model,
              }));
              setAiHint(data.config?.apiKeyHint ?? null);
            }
          }
        } catch {
          /* ignore */
        }
      })();
    }
  }, []);

  const loadSymbols = useCallback(
    async (query: string) => {
      setSearching(true);
      try {
        const list = await searchSymbols({ provider, market, exchange, query });
        setSymbols(list);
      } catch {
        setSymbols([]);
      } finally {
        setSearching(false);
      }
    },
    [provider, market, exchange],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSymbols(symbolQuery);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [loadSymbols, symbolQuery]);

  const providerMeta = PROVIDER_MAP[provider];
  const canAnalyze = Boolean(symbol) && strategyIds.length > 0;

  const toggleStrategy = (id: string) => {
    setStrategyIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const handleSaveProviderKey = async () => {
    if (!apiKey) return;
    setSavingKey(true);
    setProviderError(null);
    try {
      if (isNative) {
        storeProvider(provider, apiKey);
        setProviderError(null);
        setAiHint(null);
      } else {
        const res = await fetch("/api/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, apiKey, market, exchange, symbol }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Could not save the key");
        const listRes = await fetch("/api/providers");
        if (listRes.ok) {
          const listData = (await listRes.json()) as { accounts?: ProviderAccountSummary[] };
          setAccounts(listData.accounts ?? []);
        }
      }
    } catch (err) {
      setProviderError(err instanceof Error ? err.message : "Could not save the key");
    } finally {
      setSavingKey(false);
    }
  };

  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    setAnalyzing(true);
    setAnalysisError(null);
    setAiVerdict(null);
    setAiError(null);
    try {
      const result = await requestAnalysis({
        provider,
        apiKey: apiKey || undefined,
        market,
        exchange,
        symbol,
        interval,
        strategyIds,
        riskReward,
        useTvConsensus,
      });
      setAnalysis(result);
      setStep(4);
      setHistoryKey((value) => value + 1);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "The analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAi = async () => {
    if (!analysis) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const verdict = await requestAiVerdict(analysis, aiConfig, analysis.id);
      setAiVerdict(verdict);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "The AI review failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAiConfig = async () => {
    setAiHint(null);
    try {
      if (isNative) {
        storeAiConfig(aiConfig);
        setAiHint("saved on device");
      } else {
        const res = await fetch("/api/ai-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(aiConfig),
        });
        const data = (await res.json()) as { error?: string; apiKeyHint?: string };
        if (!res.ok) throw new Error(data.error ?? "Could not save the AI key");
        setAiHint(data.apiKeyHint ?? "saved");
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Could not save the AI key.");
    }
  };

  const stepValid = useMemo(() => {
    if (step === 1) return providerMeta?.requiresKey ? apiKey.length > 3 : true;
    if (step === 2) return Boolean(symbol);
    if (step === 3) return strategyIds.length > 0;
    return true;
  }, [step, providerMeta, apiKey, symbol, strategyIds]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070d] text-slate-200">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_-10%,rgba(34,211,238,0.16),transparent_45%),radial-gradient(circle_at_85%_0%,rgba(139,92,246,0.14),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:44px_44px]" />

      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-lg font-black text-slate-950 shadow-[0_10px_30px_-10px_rgba(34,211,238,0.9)]">
              Z
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">Zel Signals</h1>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Multi-strategy signal engine · AI reviewed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isNative ? <Badge tone="violet">Android build</Badge> : null}
            {providerMeta ? <Badge tone="cyan">{providerMeta.label}</Badge> : null}
          </div>
        </header>

        <nav className="mt-6 grid grid-cols-4 gap-2">
          {STEPS.map((item) => {
            const active = step === item.id;
            const done = step > item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(item.id)}
                className={`group rounded-xl border px-3 py-2.5 text-left transition ${
                  active
                    ? "border-cyan-400/60 bg-cyan-400/10"
                    : done
                      ? "border-white/15 bg-white/[0.04]"
                      : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <span
                  className={`block text-[10px] font-bold uppercase tracking-[0.16em] ${
                    active ? "text-cyan-300" : done ? "text-emerald-400" : "text-slate-600"
                  }`}
                >
                  {done ? "✓" : `0${item.id}`}
                </span>
                <span className={`block text-xs font-semibold ${active ? "text-white" : "text-slate-400"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <main className="mt-6 space-y-6">
          {step === 1 ? (
            <ProviderStep
              provider={provider}
              onProviderChange={(value) => {
                setProvider(value as ProviderId);
                setProviderError(null);
              }}
              apiKey={apiKey}
              onApiKeyChange={setApiKey}
              remember={remember}
              onRememberChange={setRemember}
              accounts={accounts}
              onUseAccount={(account) => {
                setProvider(account.provider as ProviderId);
                setApiKey("");
                setProviderError(null);
              }}
              onSaveAccount={handleSaveProviderKey}
              saving={savingKey}
              offline={isNative}
              error={providerError}
            />
          ) : null}

          {step === 2 ? (
            <MarketStep
              market={market}
              onMarketChange={(value) => {
                setMarket(value);
                setSymbol("");
                setSymbolLabel("");
              }}
              exchange={exchange}
              onExchangeChange={setExchange}
              symbol={symbol}
              symbolLabel={symbolLabel}
              onSymbolChange={(value, label) => {
                setSymbol(value);
                setSymbolLabel(label);
              }}
              interval={interval}
              onIntervalChange={setInterval}
              symbols={symbols}
              query={symbolQuery}
              onQueryChange={setSymbolQuery}
              searching={searching}
              providerLabel={providerMeta?.label ?? "market data"}
            />
          ) : null}

          {step === 3 ? (
            <StrategyStep
              selected={strategyIds}
              onToggle={toggleStrategy}
              onSet={setStrategyIds}
              onClear={() => setStrategyIds([])}
              riskReward={riskReward}
              onRiskRewardChange={setRiskReward}
              useTvConsensus={useTvConsensus}
              onUseTvConsensusChange={setUseTvConsensus}
              providerId={provider}
            />
          ) : null}

          {step === 4 ? (
            <div className="space-y-6">
              {analysis ? (
                <>
                  <ResultPanel analysis={analysis} />
                  <AiBox
                    config={aiConfig}
                    onConfigChange={setAiConfig}
                    onRun={handleAi}
                    onSave={handleSaveAiConfig}
                    verdict={aiVerdict}
                    loading={aiLoading}
                    error={aiError}
                    offline={isNative}
                    savedHint={aiHint}
                    disabled={!analysis}
                  />
                </>
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-sm font-semibold text-white">No signal yet</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Go back to the strategies step and run the analysis to generate a BUY / SELL / NO TRADE call with
                    take-profit and stop-loss levels.
                  </p>
                  <Button className="mt-4" onClick={() => setStep(3)}>
                    Back to strategies
                  </Button>
                </Card>
              )}
              <HistoryPanel refreshKey={historyKey} />
            </div>
          ) : null}

          {analysisError ? (
            <Card className="border-rose-400/30 p-4 text-sm text-rose-200">
              {analysisError}
            </Card>
          ) : null}
        </main>

        <footer className="sticky bottom-0 z-10 mt-8 border-t border-white/10 bg-[#05070d]/85 py-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep((value) => Math.max(1, value - 1))} disabled={step === 1}>
              ← Back
            </Button>

            <div className="flex flex-wrap items-center gap-3">
              {!stepValid && step < 4 ? (
                <span className="text-xs text-amber-300">
                  {step === 1
                    ? providerMeta?.requiresKey
                      ? "Add your API key to continue"
                      : ""
                    : step === 2
                      ? "Pick an instrument"
                      : "Select at least one strategy"}
                </span>
              ) : null}
              {step < 3 ? (
                <Button onClick={() => setStep((value) => Math.min(4, value + 1))} disabled={!stepValid}>
                  Continue →
                </Button>
              ) : null}
              {step === 3 ? (
                <Button size="lg" onClick={handleAnalyze} disabled={!canAnalyze || analyzing}>
                  {analyzing ? "Analysing candles…" : "Analyze market"}
                </Button>
              ) : null}
              {step === 4 ? (
                <Button variant="outline" onClick={() => setStep(3)}>
                  ← Adjust strategies
                </Button>
              ) : null}
            </div>
          </div>
        </footer>

        <p className="pb-6 pt-4 text-center text-[10px] leading-relaxed text-slate-600">
          Zel Signals is an educational technical-analysis tool. Signals are generated by deterministic indicators and
          third-party AI models — not financial advice. Trade at your own risk.
        </p>
      </div>
    </div>
  );
}
