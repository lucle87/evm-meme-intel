import { NextRequest } from "next/server";
import { makePaidPost, readBody, jsonError, jsonOk } from "@/lib/x402route";
import { getMomentum } from "@/lib/endpoints/momentum";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const body = await readBody(req);
  const token = (body?.token || body?.address || "").toString().trim();
  const chain = (body?.chain || "").toString().trim();
  if (!token || !chain) return jsonError("Missing 'token' and 'chain' (eth, bnb, base).");
  try { return jsonOk(await getMomentum(chain, token)); }
  catch (e: any) { return jsonError("momentum failed: " + (e?.message || "unknown"), 502); }
}

export const POST = makePaidPost("momentum", handler, {
  description: "Real-time momentum/activity for an EVM token from DexScreener: price change 5m/1h/6h/24h, volume, 24h buy/sell ratio, liquidity, pair age, socials. Shows recent flow, NOT a price prediction. Body: { token, chain }.",
  input: { token: "0x...", chain: "base" },
  inputSchema: { properties: { token: { type: "string", description: "Token contract (0x...)." }, chain: { type: "string", description: "eth, bnb, base." } }, required: ["token", "chain"] },
  outputSchema: { properties: {} },
});
