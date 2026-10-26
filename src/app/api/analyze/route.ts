import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { analyses, providerAccounts } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";
import { runAnalysis } from "@/lib/engine/analysis";
import type { MarketType, ProviderId } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      provider?: ProviderId;
      apiKey?: string;
      market?: MarketType;
      exchange?: string;
      symbol?: string;
      interval?: string;
      strategyIds?: string[];
      riskReward?: number;
      useTvConsensus?: boolean;
    };

    if (!body.provider || !body.market || !body.symbol || !body.interval) {
      return Response.json(
        { error: "provider, market, symbol and interval are required" },
        { status: 400 },
      );
    }
    const strategyIds = (body.strategyIds ?? []).filter(Boolean);
    if (strategyIds.length === 0) {
      return Response.json({ error: "Select at least one strategy" }, { status: 400 });
    }

    let apiKey = (body.apiKey ?? "").trim();
    if (!apiKey) {
      const stored = await db
        .select()
        .from(providerAccounts)
        .where(eq(providerAccounts.provider, body.provider))
        .orderBy(desc(providerAccounts.updatedAt))
        .limit(1);
      if (stored[0]) apiKey = decryptSecret(stored[0].apiKeyEncrypted) ?? "";
    }

    const analysis = await runAnalysis({
      provider: body.provider,
      apiKey,
      market: body.market,
      exchange: body.exchange ?? "",
      symbol: body.symbol,
      interval: body.interval,
      strategyIds,
      riskReward: body.riskReward ?? 2,
      useTvConsensus: body.useTvConsensus ?? false,
    });

    await db.insert(analyses).values({
      id: analysis.id,
      provider: analysis.provider,
      providerLabel: analysis.providerLabel,
      market: analysis.market,
      exchange: analysis.exchange,
      symbol: analysis.symbol,
      interval: analysis.interval,
      strategies: analysis.strategies,
      signal: analysis.signal,
      confidence: analysis.confidence,
      entry: analysis.entry,
      takeProfit: analysis.takeProfit,
      stopLoss: analysis.stopLoss,
      riskReward: analysis.riskReward,
      bullScore: analysis.bullScore,
      bearScore: analysis.bearScore,
      detail: analysis as unknown as Record<string, unknown>,
    });

    return Response.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
