"use client";

import { useEffect, useState } from "react";
import { loadLocalHistory, type HistoryRecord } from "@/lib/client/api";
import { Badge, Card } from "./ui";

type HistoryRow = HistoryRecord;

export function HistoryPanel({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const native = typeof window !== "undefined" && !!(window as { Capacitor?: unknown }).Capacitor;
      if (native) {
        if (!cancelled) setRows(loadLocalHistory());
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/analyses");
        if (!res.ok) return;
        const data = (await res.json()) as { analyses?: HistoryRow[] };
        if (!cancelled) setRows(data.analyses ?? []);
      } catch {
        /* offline build has no server history */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Signal history</p>
        <Badge tone="slate">{rows.length} saved</Badge>
      </div>
      {loading ? (
        <p className="mt-4 text-xs text-slate-500">Loading history…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-xs text-slate-500">
          No saved signals yet. Every analysis you run is stored with its AI review.
        </p>
      ) : (
        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-100">
                  {row.symbol} <span className="text-slate-600">· {row.exchange}</span>
                </p>
                <p className="text-[10px] text-slate-500">
                  {new Date(row.createdAt).toLocaleString()} · {row.interval} · {row.confidence}%
                </p>
              </div>
              <div className="flex items-center gap-2">
                {row.aiVerdict ? (
                  <Badge tone={row.aiVerdict === "GOOD" ? "emerald" : row.aiVerdict === "BAD" ? "rose" : "amber"}>
                    AI {row.aiVerdict}
                  </Badge>
                ) : null}
                <Badge
                  tone={row.signal === "BUY" ? "emerald" : row.signal === "SELL" ? "rose" : "slate"}
                >
                  {row.signal}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
