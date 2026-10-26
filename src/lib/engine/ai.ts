import type { AiConfig, AiVerdict, AnalysisResult } from "../types";
import { httpPostJson } from "./http";

export type AiProviderMeta = {
  id: AiConfig["provider"];
  label: string;
  defaultBaseUrl: string;
  defaultModel: string;
  placeholder: string;
  docs: string;
};

export const AI_PROVIDERS: AiProviderMeta[] = [
  {
    id: "openai",
    label: "OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    placeholder: "sk-...",
    docs: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    defaultBaseUrl: "https://api.anthropic.com",
    defaultModel: "claude-3-5-sonnet-latest",
    placeholder: "sk-ant-...",
    docs: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-2.0-flash",
    placeholder: "AIza...",
    docs: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "groq",
    label: "Groq",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    placeholder: "gsk_...",
    docs: "https://console.groq.com/keys",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    placeholder: "sk-or-...",
    docs: "https://openrouter.ai/keys",
  },
  {
    id: "together",
    label: "Together AI",
    defaultBaseUrl: "https://api.together.xyz/v1",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    placeholder: "sk-...",
    docs: "https://api.together.ai/settings/api-keys",
  },
  {
    id: "custom",
    label: "Custom OpenAI-compatible",
    defaultBaseUrl: "",
    defaultModel: "",
    placeholder: "your-api-key",
    docs: "",
  },
];

export const AI_PROVIDER_MAP: Record<string, AiProviderMeta> = Object.fromEntries(
  AI_PROVIDERS.map((p) => [p.id, p]),
);

const SYSTEM_PROMPT = `You are Zel Signals, a disciplined intraday trading risk analyst.
You are given a machine-generated technical analysis for one instrument.
Judge whether the proposed trade is worth taking and state your own bias.

Rules:
- Be sceptical. If the technicals are mixed, conflicting, or lack confirmation, say so.
- Judge risk/reward, confirmation quality, volatility regime and liquidity context.
- Never promise returns. Treat this as an educational opinion, not financial advice.
- Reply with ONLY a JSON object, no markdown fences, no prose outside the JSON.

JSON schema:
{
  "bias": "STRONG_BUY" | "BULLISH" | "NEUTRAL" | "BEARISH" | "STRONG_BEARISH" | "AVOID",
  "verdict": "GOOD" | "NEUTRAL" | "BAD",
  "score": number between -100 and 100,
  "confidence": integer between 0 and 100,
  "summary": "one sentence verdict",
  "reasoning": "2-4 sentences explaining the bias",
  "risks": ["risk 1", "risk 2"],
  "improvements": ["what would make this a better trade"]
}`;

function compactAnalysis(analysis: AnalysisResult) {
  const lastCandles = analysis.candles.slice(-24).map((c) => ({
    t: new Date(c.t).toISOString(),
    o: Number(c.o.toFixed(6)),
    h: Number(c.h.toFixed(6)),
    l: Number(c.l.toFixed(6)),
    c: Number(c.c.toFixed(6)),
    v: c.v,
  }));
  return {
    instrument: `${analysis.symbol} (${analysis.exchange})`,
    market: analysis.market,
    dataSource: analysis.providerLabel,
    timeframe: analysis.interval,
    engineSignal: analysis.signal,
    confidence: analysis.confidence,
    entry: analysis.entry,
    takeProfit: analysis.takeProfit,
    takeProfit2: analysis.takeProfit2,
    stopLoss: analysis.stopLoss,
    riskReward: analysis.riskReward,
    atr: analysis.atr,
    netScore: analysis.netScore,
    bullScore: analysis.bullScore,
    bearScore: analysis.bearScore,
    engineSummary: analysis.summary,
    indicators: analysis.indicators,
    strategies: analysis.breakdown.map((b) => ({
      name: b.name,
      vote: b.signal,
      strength: b.strength,
      reason: b.reason,
    })),
    recentCandles: lastCandles,
  };
}

function extractJson(text: string): Record<string, unknown> | null {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(slice) as Record<string, unknown>;
  } catch {
    try {
      return JSON.parse(slice.replace(/,\s*([}\]])/g, "$1")) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function coerceBias(value: unknown): AiVerdict["bias"] {
  const v = String(value ?? "").toUpperCase().replace(/[\s-]+/g, "_");
  const allowed: AiVerdict["bias"][] = [
    "STRONG_BUY",
    "BULLISH",
    "NEUTRAL",
    "BEARISH",
    "STRONG_BEARISH",
    "AVOID",
  ];
  return (allowed.find((a) => v.includes(a)) ?? "NEUTRAL") as AiVerdict["bias"];
}

function coerceVerdict(value: unknown, bias: AiVerdict["bias"]): AiVerdict["verdict"] {
  const v = String(value ?? "").toUpperCase();
  if (v.includes("GOOD") || v === "TAKE" || v === "A") return "GOOD";
  if (v.includes("BAD") || v.includes("AVOID") || v === "F") return "BAD";
  if (bias === "STRONG_BUY" || bias === "BULLISH" || bias === "STRONG_BEARISH" || bias === "BEARISH") {
    return "NEUTRAL";
  }
  return "NEUTRAL";
}

function coerceList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean).slice(0, 6);
  if (typeof value === "string") return value.split(/[;\n]/).map((v) => v.trim()).filter(Boolean).slice(0, 6);
  return [];
}

async function callOpenAiCompatible(config: AiConfig, system: string, user: string): Promise<string> {
  const meta = AI_PROVIDER_MAP[config.provider];
  const base = (config.baseUrl || meta.defaultBaseUrl).replace(/\/$/, "");
  const url = `${base}/chat/completions`;
  const body = {
    model: config.model || meta.defaultModel,
    temperature: 0.2,
    max_tokens: 900,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  const res = await httpPostJson<{ choices?: { message?: { content?: string } }[] }>(
    url,
    body,
    { Authorization: `Bearer ${config.apiKey}` },
  );
  const content = res.choices?.[0]?.message?.content;
  if (!content) throw new Error("The AI provider returned an empty response.");
  return content;
}

async function callAnthropic(config: AiConfig, system: string, user: string): Promise<string> {
  const base = (config.baseUrl || AI_PROVIDER_MAP.anthropic.defaultBaseUrl).replace(/\/$/, "");
  const res = await httpPostJson<{ content?: { type: string; text: string }[] }>(
    `${base}/v1/messages`,
    {
      model: config.model || AI_PROVIDER_MAP.anthropic.defaultModel,
      max_tokens: 900,
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: user }],
    },
    { "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" },
  );
  const text = res.content?.filter((c) => c.type === "text").map((c) => c.text).join("\n");
  if (!text) throw new Error("Claude returned an empty response.");
  return text;
}

async function callGemini(config: AiConfig, system: string, user: string): Promise<string> {
  const base = (config.baseUrl || AI_PROVIDER_MAP.gemini.defaultBaseUrl).replace(/\/$/, "");
  const model = config.model || AI_PROVIDER_MAP.gemini.defaultModel;
  const res = await httpPostJson<{ candidates?: { content?: { parts?: { text?: string }[] } }[] }>(
    `${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`,
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 900 },
    },
  );
  const text = res.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n");
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

export async function analyzeWithAi(config: AiConfig, analysis: AnalysisResult): Promise<AiVerdict> {
  if (!config.apiKey) throw new Error("An AI API key is required.");
  const user = `Analyse this trading setup and return the JSON verdict.

${JSON.stringify(compactAnalysis(analysis), null, 2)}`;

  let raw: string;
  switch (config.provider) {
    case "anthropic":
      raw = await callAnthropic(config, SYSTEM_PROMPT, user);
      break;
    case "gemini":
      raw = await callGemini(config, SYSTEM_PROMPT, user);
      break;
    default:
      raw = await callOpenAiCompatible(config, SYSTEM_PROMPT, user);
      break;
  }

  const parsed = extractJson(raw);
  if (!parsed) {
    return {
      bias: "NEUTRAL",
      verdict: "NEUTRAL",
      score: 0,
      confidence: 30,
      summary: "The AI response could not be parsed as JSON — treat it as unverified.",
      reasoning: raw.slice(0, 800),
      risks: ["Model output was not valid JSON"],
      improvements: ["Retry with a stronger model or a different provider"],
      model: config.model || AI_PROVIDER_MAP[config.provider]?.defaultModel || "unknown",
      raw: raw.slice(0, 2000),
    };
  }

  const bias = coerceBias(parsed.bias);
  const verdict = coerceVerdict(parsed.verdict, bias);
  const scoreRaw = Number(parsed.score);
  const score = Number.isFinite(scoreRaw) ? Math.max(-100, Math.min(100, Math.round(scoreRaw))) : 0;
  const confRaw = Number(parsed.confidence);
  const confidence = Number.isFinite(confRaw) ? Math.max(0, Math.min(100, Math.round(confRaw))) : 50;

  return {
    bias,
    verdict,
    score,
    confidence,
    summary: String(parsed.summary ?? "No summary provided."),
    reasoning: String(parsed.reasoning ?? ""),
    risks: coerceList(parsed.risks),
    improvements: coerceList(parsed.improvements),
    model: config.model || AI_PROVIDER_MAP[config.provider]?.defaultModel || "unknown",
    raw: raw.slice(0, 2000),
  };
}
