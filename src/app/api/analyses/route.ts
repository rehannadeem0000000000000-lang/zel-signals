import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { analyses } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (id) {
      const rows = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);
      if (!rows[0]) return Response.json({ error: "Analysis not found" }, { status: 404 });
      return Response.json({ analysis: rows[0] });
    }
    const rows = await db.select().from(analyses).orderBy(desc(analyses.createdAt)).limit(25);
    return Response.json({
      analyses: rows.map((row) => ({
        id: row.id,
        symbol: row.symbol,
        exchange: row.exchange,
        market: row.market,
        provider: row.provider,
        providerLabel: row.providerLabel,
        interval: row.interval,
        signal: row.signal,
        confidence: row.confidence,
        entry: row.entry,
        takeProfit: row.takeProfit,
        stopLoss: row.stopLoss,
        riskReward: row.riskReward,
        strategies: row.strategies,
        aiBias: row.aiBias,
        aiVerdict: row.aiVerdict,
        aiScore: row.aiScore,
        aiSummary: row.aiSummary,
        createdAt: row.createdAt,
      })),
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to load analyses" },
      { status: 500 },
    );
  }
}
