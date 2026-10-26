import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { providerAccounts } from "@/db/schema";
import { decryptSecret, encryptSecret, secretHint } from "@/lib/crypto";
import { PROVIDER_MAP } from "@/lib/engine/providers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(providerAccounts)
      .where(eq(providerAccounts.isActive, true))
      .orderBy(desc(providerAccounts.updatedAt));
    return Response.json({
      accounts: rows.map((row) => ({
        id: row.id,
        provider: row.provider,
        providerLabel: PROVIDER_MAP[row.provider]?.label ?? row.provider,
        apiKeyHint: row.apiKeyHint,
        market: row.market,
        exchange: row.exchange,
        symbol: row.symbol,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to load provider accounts" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      provider?: string;
      apiKey?: string;
      market?: string;
      exchange?: string;
      symbol?: string;
      id?: string;
    };
    if (!body.provider) {
      return Response.json({ error: "provider is required" }, { status: 400 });
    }
    const apiKey = (body.apiKey ?? "").trim();
    if (!apiKey) {
      return Response.json({ error: "apiKey is required" }, { status: 400 });
    }
    const id = body.id ?? `pa_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();
    const values = {
      provider: body.provider,
      label: PROVIDER_MAP[body.provider]?.label ?? body.provider,
      apiKeyEncrypted: encryptSecret(apiKey),
      apiKeyHint: secretHint(apiKey),
      market: body.market ?? "",
      exchange: body.exchange ?? "",
      symbol: body.symbol ?? "",
      isActive: true,
      updatedAt: now,
    };
    await db
      .insert(providerAccounts)
      .values({ id, createdAt: now, ...values })
      .onConflictDoUpdate({ target: providerAccounts.id, set: values });
    return Response.json({
      account: {
        id,
        provider: body.provider,
        providerLabel: values.label,
        apiKeyHint: values.apiKeyHint,
        market: values.market,
        exchange: values.exchange,
        symbol: values.symbol,
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to save provider account" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    await db.delete(providerAccounts).where(and(eq(providerAccounts.id, id)));
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to delete provider account" },
      { status: 500 },
    );
  }
}

export { decryptSecret };
