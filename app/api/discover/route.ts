import { NextRequest } from "next/server";
import { makePaidPost, readBody, jsonError, jsonOk } from "@/lib/x402route";
import { getDiscover } from "@/lib/endpoints/discover";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const body = await readBody(req);
  const chain = (body?.chain || "").toString().trim();
  const limit = body?.limit ? Number(body.limit) : 10;
  if (!chain) return jsonError("Missing 'chain' (eth, bnb, base).");
  try { return jsonOk(await getDiscover(chain, limit)); }
  catch (e: any) { return jsonError("Discover failed: " + (e?.message || "unknown"), 502); }
}

export const { GET, POST } = makePaidPost("discover", handler, {
  description: "Discover newly surfaced meme tokens on an EVM chain (eth, bnb, base) from DexScreener boosted (PAID-promoted) and newly profiled tokens, enriched with price, liquidity, and volume. A discovery starting point; always check /api/safety and /api/holders before trading. Body: { chain, limit? }.",
  input: { chain: "base", limit: 10 },
  inputSchema: { properties: { chain: { type: "string", description: "eth, bnb, base." }, limit: { type: "number", description: "Max tokens (default 10, max 15)." } }, required: ["chain"] },
  outputSchema: { properties: { tokens: { type: "array" }, count: { type: "number" } } },
});
