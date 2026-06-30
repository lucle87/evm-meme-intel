// openapi.json tu sinh tu CATALOG. Them endpoint = openapi tu cap nhat.
import { CATALOG } from "@/lib/catalog";
import { BASE_URL, PAY_TO, X402_NETWORK, priceUsdFor } from "@/lib/x402config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const paths: any = {};
  for (const item of CATALOG) {
    const priceUsd = priceUsdFor(item.key);
    paths[item.path] = {
      post: {
        operationId: item.key,
        summary: item.title,
        description: item.description,
        "x-agent-guidance": {
          whenToUse: item.agentGuidance.whenToUse,
          input: item.agentGuidance.input,
          output: item.agentGuidance.output,
          paymentFlow: item.agentGuidance.paymentFlow,
        },
        "x-payment-info": {
          x402Version: 2,
          price: { mode: "fixed", amount: priceUsd, currency: "USD" },
          protocols: ["x402"],
          network: X402_NETWORK,
          asset: "USDC",
          payTo: PAY_TO,
        },
        requestBody: {
          required: true,
          content: { "application/json": { schema: item.inputSchema } },
        },
        responses: {
          "200": {
            description: item.title + " result.",
            content: { "application/json": { schema: item.outputSchema } },
          },
          "400": { description: "Bad Request - missing/invalid input." },
          "402": { description: "Payment Required (x402, USDC on Base)." },
        },
      },
    };
  }

  const spec = {
    openapi: "3.1.0",
    info: {
      title: "evm-meme-intel - EVM meme-coin signals for AI agents",
      version: "1.0.0",
      description:
        "Decision-support for trading meme coins on EVM chains (eth, bnb, base): discovery, rug-safety, holder concentration, momentum, and a composite signal. Free on-chain + DexScreener data, paid per call via x402 (USDC on Base). No API key, no signup. NOT financial advice.",
      contact: { name: "evm-meme-intel", email: process.env.CONTACT_EMAIL || "vanlucpdu@gmail.com", url: BASE_URL },
    },
    servers: [{ url: BASE_URL }],
    "x-docs": { llmsTxt: BASE_URL + "/llms.txt" },
    "x-guidance":
      "evm-meme-intel gives AI agents decision-support for trading meme coins on EVM chains (eth, bnb, base) from free on-chain + DexScreener data. Workflow: /api/discover to find candidate tokens, /api/safety for a rug check (honeypot/tax/owner), /api/holders for concentration/LP-lock dump risk, /api/momentum for real buy/sell flow, and /api/signal for a single safety-gated GO/CAUTION/AVOID verdict plus momentum bias. NOT financial advice and NOT a pump prediction; the agent decides and executes itself. Each endpoint is a paid POST via x402 (USDC on Base).",
    x402Version: 2,
    "x-discovery": { ownershipProofs: [PAY_TO] },
    paths,
  };

  return new Response(JSON.stringify(spec, null, 2), {
    headers: { "content-type": "application/json" },
  });
}
