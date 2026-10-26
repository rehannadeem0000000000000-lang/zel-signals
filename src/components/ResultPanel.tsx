"use client";

import type { AnalysisResult } from "@/lib/types";
import { Badge, Card } from "./ui";

function signalTone(signal: AnalysisResult["signal"]) {
  if (signal === "BUY") return {
    ring: "border-emerald-400/60",
    bg: "from-emerald-500/25 to-emerald-400/5",
    text: "text-emerald-300",
    glow: "shadow-[0_0_60px_-20px_rgba(16,185,129,0.9)]",
    label: "BUY",
  };
  if (signal === "SELL") return {
    ring: "border-rose-400/60",
    bg: "from-rose-500/25 to-rose-400/5",
    text: "text-rose-300",
    glow: "shadow-[0_0_60px_-20px_rgba(244,63,94,0.9)]",
    label: "SELL",
  };
  return {
    ring: "border-slate-400/40",
    bg: "from-slate-500/20 to-slate-400/5",
    text: "text-slate-300",
    glow: "",
    label: "NO TRADE",
  };
}

function PriceChart({ analysis }: { analysis: AnalysisResult }) {
  const candles = analysis.candles.slice(-60);
  if (candles.length < 2) return null;
  const closes = candles.map((c) => c.c);
  const min = Math.min(...closes, analysis.stopLoss ?? Infinity, analysis.takeProfit ?? -Infinity);
  const max = Math.max(...closes, analysis.takeProfit ?? -Infinity, analysis.stopLoss ?? -Infinity);
  const range = max - min || 1;
  const width = 640;
  const height = 180;
  const pad = 12;
  const x = (i: number) => pad + (i / (candles.length - 1)) * (width - pad * 2);
  const y = (value: number) => height - pad - ((value - min) / range) * (height - pad * 2);
  const points = closes.map((value, i) => `${x(i).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  const area = `${pad},${height - pad} ${points} ${width - pad},${height - pad}`;
  const up = analysis.signal === "BUY";
  const stroke = analysis.signal === "SELL" ? "#fb7185" : up ? "#34d399" : "#94a3b8";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="zelArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((ratio) => (
        <line
          key={ratio}
          x1={pad}
          x2={width - pad}
          y1={pad + ratio * (height - pad * 2)}
          y2={pad + ratio * (height - pad * 2)}
          stroke="rgba(255,255,255,0.06)"
        />
      ))}
      <polygon points={area} fill="url(#zelArea)" />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {analysis.takeProfit !== null ? (
        <line x1={pad} x2={width - pad} y1={y(analysis.takeProfit)} y2={y(analysis.takeProfit)} stroke="#38bdf8" strokeDasharray="4 4" strokeWidth="1" />
      ) : null}
      {analysis.stopLoss !== null ? (
        <line x1={pad} x2={width - pad} y1={y(analysis.stopLoss)} y2={y(analysis.stopLoss)} stroke="#f472b6" strokeDasharray="4 4" strokeWidth="1" />
      ) : null}
      <circle cx={x(closes.length - 1)} cy={y(closes[closes.length - 1])} r="4" fill={stroke} />
    </svg>
  );
}

export function ResultPanel({ analysis }: { analysis: AnalysisResult }) {
  const tone = signalTone(analysis.signal);
  const neutral = analysis.signal === "NO TRADE";

  return (
    <div className="space-y-4">
      <Card className={`relative overflow-hidden border ${tone.ring} bg-gradient-to-br ${tone.bg} p-6`}>
        <div className={`pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl ${tone.glow}`} />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {analysis.providerLabel} · {analysis.symbol} · {analysis.exchange} · {analysis.interval}
            </p>
            <h3 className={`mt-2 text-5xl font-black tracking-tight ${tone.text}`}>{tone.label}</h3>
            <p className="mt-2 max-w-xl text-sm text-slate-300">{analysis.summary}</p>
            <p className="mt-1 text-xs text-slate-500">{analysis.timeframeNote}</p>
          </div>

          <div className="min-w-[200px]">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Confidence</span>
              <span className="font-mono text-2xl font-bold text-white">{analysis.confidence}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
                style={{ width: `${Math.max(3, analysis.confidence)}%` }}
              />
            </div>
            <div className="mt-4 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Bull score</span>
                <span className="font-mono text-emerald-300">{analysis.bullScore}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Bear score</span>
                <span className="font-mono text-rose-300">{analysis.bearScore}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Net</span>
                <span className="font-mono text-slate-200">{analysis.netScore}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Entry", value: analysis.entry, tone: "text-white" },
            { label: "Take profit", value: analysis.takeProfit, tone: "text-cyan-300" },
            { label: "TP 2", value: analysis.takeProfit2, tone: "text-cyan-200" },
            { label: "Stop loss", value: analysis.stopLoss, tone: "text-rose-300" },
            { label: "Risk : reward", value: analysis.riskReward ? `1 : ${analysis.riskReward}` : null, tone: "text-emerald-300" },
            { label: "ATR", value: analysis.atr, tone: "text-slate-300" },
          ].map((item) => (
            <div key={item.label} className={`rounded-xl border border-white/10 bg-slate-950/50 p-3 ${neutral ? "opacity-60" : ""}`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <p className={`mt-1 font-mono text-base font-semibold ${item.tone}`}>
                {item.value === null || item.value === undefined ? "—" : item.value}
              </p>
            </div>
          ))}
        </div>
        {neutral ? (
          <p className="relative mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            No trade signal — the levels above are reference-only. Wait for the strategy votes to align.
          </p>
        ) : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Price action · last {Math.min(60, analysis.candles.length)} candles
            </p>
            <div className="flex gap-2 text-[10px] text-slate-500">
              <span className="text-cyan-300">— TP</span>
              <span className="text-pink-300">— SL</span>
            </div>
          </div>
          <div className="mt-2">
            <PriceChart analysis={analysis} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(analysis.indicators).map(([key, value]) => (
              <span key={key} className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-400">
                {key.replace(/([A-Z])/g, " $1").toUpperCase()}{" "}
                <span className="font-mono text-slate-200">{value === null ? "—" : String(value)}</span>
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Strategy breakdown</p>
          <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {analysis.breakdown.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-100">{item.name}</p>
                  <Badge
                    tone={item.signal === "buy" ? "emerald" : item.signal === "sell" ? "rose" : "slate"}
                  >
                    {item.signal === "buy" ? "BUY" : item.signal === "sell" ? "SELL" : "NEUTRAL"}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{item.reason}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${
                        item.signal === "buy"
                          ? "bg-emerald-400"
                          : item.signal === "sell"
                            ? "bg-rose-400"
                            : "bg-slate-500"
                      }`}
                      style={{ width: `${Math.round(item.strength * 100)}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">{Math.round(item.strength * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
