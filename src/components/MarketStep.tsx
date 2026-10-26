"use client";

import { useEffect } from "react";
import { EXCHANGES } from "@/lib/symbols";
import { INTERVALS, MARKET_LABELS } from "@/lib/types";
import type { MarketType } from "@/lib/types";
import { Badge, Card, Chip, SectionTitle, Select, TextInput } from "./ui";

export type SymbolOption = { symbol: string; label: string; exchange?: string; source: string };

type Props = {
  market: MarketType;
  onMarketChange: (market: MarketType) => void;
  exchange: string;
  onExchangeChange: (exchange: string) => void;
  symbol: string;
  symbolLabel: string;
  onSymbolChange: (symbol: string, label: string) => void;
  interval: string;
  onIntervalChange: (interval: string) => void;
  symbols: SymbolOption[];
  query: string;
  onQueryChange: (query: string) => void;
  searching: boolean;
  providerLabel: string;
};

export function MarketStep(props: Props) {
  const exchanges = EXCHANGES[props.market] ?? [];

  useEffect(() => {
    if (!exchanges.some((item) => item.id === props.exchange)) {
      props.onExchangeChange(exchanges[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.market]);

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Step 2 · Market"
        title="Which market are we trading?"
        description="Choose the asset class, the venue you trade on, then the exact instrument and timeframe to analyse."
      />

      <Card className="space-y-5 p-5">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Market</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(MARKET_LABELS) as MarketType[]).map((market) => (
              <Chip
                key={market}
                active={props.market === market}
                onClick={() => props.onMarketChange(market)}
                tone={props.market === market ? "cyan" : "cyan"}
              >
                {MARKET_LABELS[market]}
              </Chip>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Exchange / broker</p>
            <Select value={props.exchange} onChange={(event) => props.onExchangeChange(event.target.value)}>
              {exchanges.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Instrument <span className="text-slate-600">· live search on {props.providerLabel}</span>
            </p>
            <TextInput
              value={props.query}
              placeholder="Search e.g. EURUSD, BTC, AAPL…"
              onChange={(event) => props.onQueryChange(event.target.value)}
            />
            <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/50 p-2">
              {props.searching ? (
                <p className="px-2 py-3 text-xs text-slate-500">Searching {props.providerLabel}…</p>
              ) : props.symbols.length === 0 ? (
                <p className="px-2 py-3 text-xs text-slate-500">No instruments found — try another query.</p>
              ) : (
                <div className="grid gap-1 sm:grid-cols-2">
                  {props.symbols.map((item) => {
                    const active = item.symbol === props.symbol;
                    return (
                      <button
                        key={`${item.symbol}-${item.source}`}
                        type="button"
                        onClick={() => props.onSymbolChange(item.symbol, item.label)}
                        className={`rounded-lg px-2.5 py-2 text-left text-xs transition ${
                          active
                            ? "bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-400/50"
                            : "text-slate-300 hover:bg-white/5"
                        }`}
                      >
                        <span className="block font-semibold">{item.symbol}</span>
                        <span className="block truncate text-[11px] text-slate-500">{item.label}</span>
                        {item.source === "live" ? (
                          <span className="mt-1 inline-block rounded bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">
                            live
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Timeframe</p>
            <div className="flex flex-wrap gap-2">
              {INTERVALS.map((item) => (
                <Chip key={item.id} active={props.interval === item.id} onClick={() => props.onIntervalChange(item.id)}>
                  {item.id}
                </Chip>
              ))}
            </div>
          </div>
          <div className="text-right">
            <Badge tone="cyan">Selected</Badge>
            <p className="mt-2 font-mono text-sm text-white">
              {props.symbol || "—"} <span className="text-slate-600">· {props.exchange || "—"}</span>
            </p>
            <p className="text-[11px] text-slate-500">{props.symbolLabel}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
