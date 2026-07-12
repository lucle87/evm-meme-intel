import { NextRequest } from "next/server";
import { makePaidPost, readBody, jsonError, jsonOk } from "@/lib/x402route";
import { getHolders } from "@/lib/endpoints/holders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const body = await readBody(req);
  const token = (body?.token || body?.address || "").toString().trim();
  const chain = (body?.chain || "").toString().trim();
  if (!token || !chain) return jsonError("Missing 'token' and 'chain' (eth, bnb, base).");
  try { return jsonOk(await getHolders(chain, token)); }
  catch (e: any) { return jsonError("holders failed: " + (e?.message || "unknown"), 502); }
}

export const { GET, POST } = makePaidPost("holders", handler, {
  description: "Holder concentration for an EVM token from GoPlus: holder count, top holders with %, real (non-locked) concentration, owner/creator %, LP locked %. High concentration = dump risk. Body: { token, chain }.",
  input: { token: "0x...", chain: "base" },
  inputSchema: { properties: { token: { type: "string", description: "Token contract (0x...)." }, chain: { type: "string", description: "eth, bnb, base." } }, required: ["token", "chain"] },
  outputSchema: { properties: {} },
});
