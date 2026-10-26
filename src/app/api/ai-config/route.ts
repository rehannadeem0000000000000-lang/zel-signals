import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { aiConfigs } from "@/db/schema";
import { encryptSecret, secretHint } from "@/lib/crypto";
import { AI_PROVIDER_MAP } from "@/lib/engine/ai";

export const dynamic = "force-dynamic";

const CONFIG_ID = "ai_config_primary";

export async function GET() {
  try {
    const rows = await db.select().from(aiConfigs).orderBy(desc(aiConfigs.updatedAt)).limit(1);
    const row = rows[0];
    if (!row) return Response.json({ config: null });
    return Response.json({
      config: {
        provider: row.provider,
        providerLabel: AI_PROVIDER_MAP[row.provider]?.label ?? row.provider,
        baseUrl: row.baseUrl,
        model: row.model,
        apiKeyHint: row.apiKeyHint,
        updatedAt: row.updatedAt,
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to load AI config" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      provider?: string;
      apiKey?: string;
      baseUrl?: string;
      model?: string;
    };
    if (!body.provider) return Response.json({ error: "provider is required" }, { status: 400 });
    const apiKey = (body.apiKey ?? "").trim();
    if (!apiKey) return Response.json({ error: "apiKey is required" }, { status: 400 });
    const now = new Date();
    await db
      .insert(aiConfigs)
      .values({
        id: CONFIG_ID,
        provider: body.provider,
        baseUrl: body.baseUrl ?? "",
        model: body.model ?? "",
        apiKeyEncrypted: encryptSecret(apiKey),
        apiKeyHint: secretHint(apiKey),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: aiConfigs.id,
        set: {
          provider: body.provider,
          baseUrl: body.baseUrl ?? "",
          model: body.model ?? "",
          apiKeyEncrypted: encryptSecret(apiKey),
          apiKeyHint: secretHint(apiKey),
          updatedAt: now,
        },
      });
    return Response.json({ ok: true, apiKeyHint: secretHint(apiKey) });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to save AI config" },
      { status: 500 },
    );
  }
}
