import { NextRequest } from "next/server";
import { makePaidPost, readBody, jsonError, jsonOk } from "@/lib/x402route";
import { getMemeSignal } from "@/lib/endpoints/signal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const body = await readBody(req);
  const token = (body?.token || body?.address || "").toString().trim();
  const chain = (body?.chain || "").toString().trim();
  if (!token || !chain) return jsonError("Missing 'token' and 'chain' (eth, bnb, base).");
  try { return jsonOk(await getMemeSignal(chain, token)); }
  catch (e: any) { return jsonError("signal failed: " + (e?.message || "unknown"), 502); }
}

export const POST = makePaidPost("signal", handler, {
  description: "Composite meme signal: combines safety + holder concentration + liquidity + buy/sell flow into a SAFETY-GATED verdict (GO/CAUTION/AVOID) plus a separate momentum bias, with a transparent factor breakdown and risk flags. Decision-support, not financial advice. Body: { token, chain }.",
  input: { token: "0x...", chain: "base" },
  inputSchema: { properties: { token: { type: "string", description: "Token contract (0x...)." }, chain: { type: "string", description: "eth, bnb, base." } }, required: ["token", "chain"] },
  outputSchema: { properties: {} },
});
