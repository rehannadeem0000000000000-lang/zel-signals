import { fetchSymbolOptions } from "@/lib/engine/providers";
import type { MarketType, ProviderId } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const provider = (url.searchParams.get("provider") ?? "demo") as ProviderId;
    const market = (url.searchParams.get("market") ?? "forex") as MarketType;
    const exchange = url.searchParams.get("exchange") ?? "";
    const query = url.searchParams.get("q") ?? "";
    const symbols = await fetchSymbolOptions({ provider, market, exchange, query });
    return Response.json({ symbols });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to load symbols" },
      { status: 500 },
    );
  }
}
