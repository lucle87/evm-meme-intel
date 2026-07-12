import { NextRequest } from "next/server";
import { makePaidPost, readBody, jsonError, jsonOk } from "@/lib/x402route";
import { getSafety } from "@/lib/endpoints/safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const body = await readBody(req);
  const token = (body?.token || body?.address || "").toString().trim();
  const chain = (body?.chain || "").toString().trim();
  if (!token || !chain) return jsonError("Missing 'token' and 'chain' (eth, bnb, base).");
  try { return jsonOk(await getSafety(chain, token)); }
  catch (e: any) { return jsonError("safety failed: " + (e?.message || "unknown"), 502); }
}

export const { GET, POST } = makePaidPost("safety", handler, {
  description: "Rug/safety check for an EVM meme token via GoPlus: honeypot, sellability, buy/sell tax, owner privileges (mint, blacklist, pause, reclaim ownership), proxy, source verification. Returns GO/CAUTION/AVOID. Body: { token, chain }.",
  input: { token: "0x...", chain: "base" },
  inputSchema: { properties: { token: { type: "string", description: "Token contract (0x...)." }, chain: { type: "string", description: "eth, bnb, base." } }, required: ["token", "chain"] },
  outputSchema: { properties: {} },
});
