"use client";

import { useMemo, useState } from "react";
import { STRATEGIES } from "@/lib/engine/strategies";
import { Badge, Card, Chip, SectionTitle } from "./ui";

type Props = {
  selected: string[];
  onToggle: (id: string) => void;
  onSet: (ids: string[]) => void;
  onClear: () => void;
  riskReward: number;
  onRiskRewardChange: (value: number) => void;
  useTvConsensus: boolean;
  onUseTvConsensusChange: (value: boolean) => void;
  providerId: string;
};

const CATEGORIES = [
  "All",
  "Trend",
  "Momentum",
  "Volatility",
  "Mean Reversion",
  "Price Action",
  "Volume",
  "Confluence",
] as const;

const RECOMMENDED = [
  "ema_crossover",
  "rsi_reversal",
  "macd",
  "bollinger",
  "supertrend",
  "adx_trend",
  "obv_trend",
];

export function StrategyStep(props: Props) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [showAll, setShowAll] = useState(false);
  const tvAvailable = props.providerId !== "demo";

  const strategies = useMemo(() => {
    const list = STRATEGIES.filter((s) => category === "All" || s.category === category);
    return showAll ? list : list.slice(0, 12);
  }, [category, showAll]);

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Step 3 · Strategy stack"
        title="Select every strategy you want to run"
        description="Each strategy votes buy, sell or neutral with its own strength. Zel Signals blends the votes into one bias, then sizes the stop and targets from ATR and swing structure."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="cyan">{props.selected.length} selected</Badge>
            <button
              type="button"
              onClick={props.onClear}
              className="text-xs font-semibold text-slate-400 underline-offset-4 hover:text-white hover:underline"
            >
              Clear
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((item) => (
          <Chip key={item} active={category === item} onClick={() => setCategory(item)}>
            {item}
          </Chip>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const ids = STRATEGIES.filter((s) => s.category === category).map((s) => s.id);
              props.onSet(Array.from(new Set([...props.selected, ...ids])));
            }}
            className="text-xs font-semibold text-cyan-300 underline-offset-4 hover:underline"
          >
            Select category
          </button>
          <button
            type="button"
            onClick={() => {
              props.onSet(Array.from(new Set([...props.selected, ...RECOMMENDED])));
            }}
            className="text-xs font-semibold text-emerald-300 underline-offset-4 hover:underline"
          >
            Use starter stack
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {strategies.map((strategy) => {
          const active = props.selected.includes(strategy.id);
          return (
            <button
              key={strategy.id}
              type="button"
              onClick={() => props.onToggle(strategy.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-cyan-400/60 bg-cyan-400/[0.08] shadow-[0_18px_40px_-30px_rgba(34,211,238,0.9)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-white">{strategy.name}</p>
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold ${
                    active ? "border-cyan-300 bg-cyan-400 text-slate-950" : "border-white/20 text-transparent"
                  }`}
                >
                  ✓
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{strategy.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <Badge tone="violet">{strategy.category}</Badge>
                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  weight {strategy.defaultWeight.toFixed(2)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {STRATEGIES.filter((s) => category === "All").length > 12 ? (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="text-xs font-semibold text-slate-300 underline-offset-4 hover:text-white hover:underline"
        >
          {showAll ? "Show fewer strategies" : "Show all strategies"}
        </button>
      ) : null}

      <Card className="grid gap-6 p-5 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Target risk / reward</p>
            <span className="font-mono text-sm text-cyan-300">1 : {props.riskReward.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.5}
            value={props.riskReward}
            onChange={(event) => props.onRiskRewardChange(Number(event.target.value))}
            className="mt-3 w-full accent-cyan-400"
          />
          <p className="mt-2 text-xs text-slate-500">
            Take profit is placed at this multiple of the ATR/structure stop distance.
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Confluence layer</p>
          <label
            className={`mt-3 flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
              tvAvailable ? "border-white/10 bg-white/[0.03]" : "border-white/5 bg-white/[0.02] opacity-60"
            }`}
          >
            <input
              type="checkbox"
              disabled={!tvAvailable}
              checked={props.useTvConsensus}
              onChange={(event) => props.onUseTvConsensusChange(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-cyan-400"
            />
            <span>
              <span className="block text-xs font-semibold text-slate-200">TradingView screener consensus</span>
              <span className="block text-[11px] text-slate-500">
                {tvAvailable
                  ? "Adds TradingView's own recommendation score and oscillators to the vote, whatever data source you use for candles."
                  : "Not available for simulated demo candles."}
              </span>
            </span>
          </label>
        </div>
      </Card>
    </div>
  );
}
