import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { aiConfigs, analyses } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";
import { analyzeWithAi } from "@/lib/engine/ai";
import type { AiConfig, AnalysisResult } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      analysis?: AnalysisResult;
      analysisId?: string;
      aiConfig?: Partial<AiConfig> & { apiKey?: string };
    };

    if (!body.analysis) {
      return Response.json({ error: "analysis payload is required" }, { status: 400 });
    }

    let config: AiConfig = {
      provider: body.aiConfig?.provider ?? "openai",
      apiKey: (body.aiConfig?.apiKey ?? "").trim(),
      baseUrl: body.aiConfig?.baseUrl ?? "",
      model: body.aiConfig?.model ?? "",
    };

    if (!config.apiKey) {
      const stored = await db.select().from(aiConfigs).orderBy(desc(aiConfigs.updatedAt)).limit(1);
      const row = stored[0];
      if (row) {
        config = {
          provider: row.provider as AiConfig["provider"],
          apiKey: decryptSecret(row.apiKeyEncrypted) ?? "",
          baseUrl: row.baseUrl,
          model: row.model,
        };
      }
    }

    if (!config.apiKey) {
      return Response.json({ error: "No AI API key provided or stored" }, { status: 400 });
    }
    if (!config.model) {
      const { AI_PROVIDER_MAP } = await import("@/lib/engine/ai");
      config.model = AI_PROVIDER_MAP[config.provider]?.defaultModel ?? "";
    }

    const verdict = await analyzeWithAi(config, body.analysis);

    const targetId = body.analysisId ?? body.analysis.id;
    if (targetId) {
      await db
        .update(analyses)
        .set({
          aiBias: verdict.bias,
          aiVerdict: verdict.verdict,
          aiScore: verdict.score,
          aiSummary: verdict.summary,
        })
        .where(eq(analyses.id, targetId));
    }

    return Response.json({ verdict });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI analysis failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
