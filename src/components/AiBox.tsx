"use client";

import { useState } from "react";
import { AI_PROVIDERS, AI_PROVIDER_MAP } from "@/lib/engine/ai";
import type { AiConfig, AiVerdict } from "@/lib/types";
import { Badge, Button, Card, Field, SectionTitle, Select, Spinner, TextInput } from "./ui";

type Props = {
  config: AiConfig;
  onConfigChange: (config: AiConfig) => void;
  onRun: () => void;
  onSave: () => void;
  verdict: AiVerdict | null;
  loading: boolean;
  error: string | null;
  offline: boolean;
  savedHint: string | null;
  disabled: boolean;
};

function verdictTone(verdict: AiVerdict["verdict"]) {
  if (verdict === "GOOD") return { text: "text-emerald-300", bg: "bg-emerald-400/15", ring: "border-emerald-400/40" };
  if (verdict === "BAD") return { text: "text-rose-300", bg: "bg-rose-500/15", ring: "border-rose-400/40" };
  return { text: "text-amber-300", bg: "bg-amber-500/15", ring: "border-amber-400/40" };
}

function biasTone(bias: AiVerdict["bias"]) {
  if (bias.includes("BUY")) return "emerald" as const;
  if (bias.includes("BEARISH")) return "rose" as const;
  if (bias === "AVOID") return "rose" as const;
  return "amber" as const;
}

export function AiBox(props: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const meta = AI_PROVIDER_MAP[props.config.provider];
  const tone = props.verdict ? verdictTone(props.verdict.verdict) : null;

  const handleProvider = (id: string) => {
    const next = AI_PROVIDER_MAP[id];
    props.onConfigChange({
      provider: id as AiConfig["provider"],
      apiKey: props.config.apiKey,
      baseUrl: next?.defaultBaseUrl ?? "",
      model: next?.defaultModel ?? "",
    });
  };

  return (
    <Card className="relative overflow-hidden border-violet-400/25 bg-gradient-to-br from-violet-500/10 via-slate-900/60 to-slate-900/60 p-5">
      <div className="pointer-events-none absolute -left-16 -bottom-20 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="relative">
        <SectionTitle
          eyebrow="AI box"
          title="Let an AI model review the signal"
          description="Plug in any AI API. The model receives the full signal, every strategy vote and recent candles, then returns its own bias and an honest trade-quality verdict."
        />

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="AI provider">
                <Select value={props.config.provider} onChange={(event) => handleProvider(event.target.value)}>
                  {AI_PROVIDERS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Model">
                <TextInput
                  value={props.config.model}
                  placeholder={meta?.defaultModel || "model-name"}
                  onChange={(event) => props.onConfigChange({ ...props.config, model: event.target.value })}
                />
              </Field>
            </div>

            <Field
              label="AI API key"
              hint={
                meta?.docs ? (
                  <a
                    href={meta.docs}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 underline-offset-4 hover:underline"
                  >
                    where do I get one?
                  </a>
                ) : undefined
              }
            >
              <TextInput
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder={meta?.placeholder ?? "api-key"}
                value={props.config.apiKey}
                onChange={(event) => props.onConfigChange({ ...props.config, apiKey: event.target.value })}
              />
            </Field>

            <button
              type="button"
              onClick={() => setShowAdvanced((value) => !value)}
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 hover:text-slate-300"
            >
              {showAdvanced ? "Hide" : "Show"} advanced (base URL)
            </button>
            {showAdvanced ? (
              <Field label="Base URL">
                <TextInput
                  value={props.config.baseUrl ?? ""}
                  placeholder={meta?.defaultBaseUrl ?? "https://api.example.com/v1"}
                  onChange={(event) => props.onConfigChange({ ...props.config, baseUrl: event.target.value })}
                />
              </Field>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button onClick={props.onRun} disabled={props.loading || props.disabled}>
                {props.loading ? "Asking the AI…" : "Ask the AI about this signal"}
              </Button>
              <Button variant="outline" size="md" onClick={props.onSave} disabled={!props.config.apiKey}>
                Save AI key
              </Button>
              {props.savedHint ? <Badge tone="violet">{props.savedHint}</Badge> : null}
            </div>
            <p className="text-[11px] text-slate-500">
              {props.offline
                ? "Offline build: the key stays on this device and the request goes straight from your phone to the AI provider."
                : "Keys are encrypted before they touch the database and are never returned to the browser in plain text."}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            {props.loading ? (
              <div className="flex h-full min-h-[220px] items-center justify-center">
                <Spinner label="Model is reading the chart…" />
              </div>
            ) : props.error ? (
              <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm font-semibold text-rose-300">AI request failed</p>
                <p className="max-w-sm text-xs text-slate-400">{props.error}</p>
              </div>
            ) : props.verdict ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Badge tone={biasTone(props.verdict.bias)}>{props.verdict.bias.replace("_", " ")}</Badge>
                    <p className="mt-1.5 font-mono text-[11px] text-slate-500">{props.verdict.model}</p>
                  </div>
                  <div className={`rounded-xl border px-3 py-2 text-center ${tone?.ring} ${tone?.bg}`}>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Trade quality</p>
                    <p className={`text-xl font-black ${tone?.text}`}>{props.verdict.verdict}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>AI score</span>
                    <span className="font-mono">{props.verdict.score > 0 ? "+" : ""}{props.verdict.score}</span>
                  </div>
                  <div className="relative mt-1.5 h-2 rounded-full bg-white/10">
                    <div className="absolute left-1/2 top-0 h-full w-px bg-white/25" />
                    <div
                      className={`h-full rounded-full ${props.verdict.score >= 0 ? "bg-emerald-400" : "bg-rose-400"}`}
                      style={{
                        marginLeft: props.verdict.score >= 0 ? "50%" : `${50 + props.verdict.score / 2}%`,
                        width: `${Math.abs(props.verdict.score) / 2}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-right text-[11px] text-slate-500">confidence {props.verdict.confidence}%</p>
                </div>

                <p className="text-sm font-medium text-slate-100">{props.verdict.summary}</p>
                <p className="text-xs leading-relaxed text-slate-400">{props.verdict.reasoning}</p>

                {props.verdict.risks.length ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-300/80">Risks</p>
                    <ul className="mt-1 space-y-1">
                      {props.verdict.risks.map((risk) => (
                        <li key={risk} className="flex gap-2 text-xs text-slate-400">
                          <span className="text-rose-400">•</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {props.verdict.improvements.length ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300/80">What would make it better</p>
                    <ul className="mt-1 space-y-1">
                      {props.verdict.improvements.map((item) => (
                        <li key={item} className="flex gap-2 text-xs text-slate-400">
                          <span className="text-cyan-400">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm font-semibold text-slate-300">No AI review yet</p>
                <p className="max-w-xs text-xs text-slate-500">
                  Add an AI API key on the left, then ask the model whether this signal is worth taking.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
