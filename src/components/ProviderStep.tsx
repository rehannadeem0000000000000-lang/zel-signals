"use client";

import { PROVIDERS } from "@/lib/engine/providers";
import { Badge, Button, Card, Field, SectionTitle, TextInput } from "./ui";

export type ProviderAccountSummary = {
  id: string;
  provider: string;
  providerLabel: string;
  apiKeyHint: string;
  market: string;
  exchange: string;
  symbol: string;
};

type Props = {
  provider: string;
  onProviderChange: (provider: string) => void;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  remember: boolean;
  onRememberChange: (value: boolean) => void;
  accounts: ProviderAccountSummary[];
  onUseAccount: (account: ProviderAccountSummary) => void;
  onSaveAccount: () => void;
  saving: boolean;
  offline: boolean;
  error: string | null;
};

export function ProviderStep(props: Props) {
  const selected = PROVIDERS.find((p) => p.id === props.provider);
  const needsKey = selected?.requiresKey ?? false;

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Step 1 · Data source"
        title="Pick your broker / data provider"
        description="Zel Signals pulls real OHLC candles from the source you connect. Add the API key that belongs to it — keys are encrypted at rest when you save them."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PROVIDERS.map((provider) => {
          const active = provider.id === props.provider;
          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => props.onProviderChange(provider.id)}
              className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-cyan-400/70 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_20px_50px_-30px_rgba(34,211,238,0.9)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
              }`}
            >
              <div
                className={`absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${provider.accent} opacity-20 blur-2xl transition group-hover:opacity-35`}
              />
              <div className="relative flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">{provider.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{provider.tagline}</p>
                </div>
                {provider.requiresKey ? (
                  <Badge tone="amber">KEY</Badge>
                ) : (
                  <Badge tone="emerald">NO KEY</Badge>
                )}
              </div>
              <div className="relative mt-3 flex flex-wrap gap-1.5">
                {provider.markets.slice(0, 4).map((market) => (
                  <span key={market} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    {market}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">{selected?.label} credentials</p>
            <p className="text-xs text-slate-400">
              {needsKey
                ? "Paste the API key issued by this provider. It is only used to fetch candles."
                : "This provider works without a key — you can still add one for higher limits."}
            </p>
          </div>
          {selected?.keyUrl ? (
            <a
              href={selected.keyUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-cyan-300 underline-offset-4 hover:underline"
            >
              Get a key →
            </a>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Field
            label="API key"
            hint={
              props.apiKey ? (
                <span className="text-emerald-400">key detected</span>
              ) : (
                <span className="text-slate-600">not set</span>
              )
            }
          >
            <TextInput
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={selected?.id === "demo" ? "not required for demo data" : "paste your API key"}
              value={props.apiKey}
              onChange={(event) => props.onApiKeyChange(event.target.value)}
            />
          </Field>

          <div className="flex flex-col justify-between gap-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <input
                type="checkbox"
                checked={props.remember}
                onChange={(event) => props.onRememberChange(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-cyan-400"
              />
              <span>
                <span className="block text-xs font-semibold text-slate-200">Remember this key</span>
                <span className="block text-[11px] text-slate-500">
                  {props.offline
                    ? "Stored locally on this device (AES-safe local storage)."
                    : "Encrypted with AES-256-GCM and stored in your database."}
                </span>
              </span>
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={props.onSaveAccount}
              disabled={!props.apiKey || props.saving}
            >
              {props.saving ? "Encrypting…" : "Save encrypted key"}
            </Button>
          </div>
        </div>

        {props.error ? (
          <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{props.error}</p>
        ) : null}

        {props.accounts.length > 0 ? (
          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Saved keys</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {props.accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => props.onUseAccount(account)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
                >
                  <span className="block text-xs font-semibold text-slate-100">{account.providerLabel}</span>
                  <span className="block font-mono text-[11px] text-slate-500">{account.apiKeyHint}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
