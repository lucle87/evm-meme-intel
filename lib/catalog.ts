// Danh muc endpoint evm-meme-intel. openapi.json/llms/page tu sinh tu day.
// Agent-first: ten ro, "khi nao dung", input vi du, output mo ta, agentGuidance.
import { priceUsdFor } from "@/lib/x402config";

export type AgentGuidance = { whenToUse: string; input: string; output: string; paymentFlow: string };
export type CatalogItem = {
  key: string; path: string; title: string; description: string;
  inputSchema: any; outputSchema: any; agentGuidance: AgentGuidance;
};

const PAY = "First call returns HTTP 402 with an x402 payment requirement (USDC on Base). Pay with an x402 client, then retry the same request to get 200.";
const TOKEN_IN = {
  type: "object",
  properties: {
    token: { type: "string", description: "Token contract address (0x...).", examples: ["0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82"] },
    chain: { type: "string", enum: ["eth", "bnb", "base"], description: "EVM chain.", examples: ["base"] },
  },
  required: ["token", "chain"],
};

export const CATALOG: CatalogItem[] = [
  {
    key: "discover",
    path: "/api/discover",
    title: "Discover Meme Tokens",
    description:
      "Discover newly surfaced meme tokens on an EVM chain (eth, bnb, base), sourced from DexScreener boosted (PAID-promoted) and newly profiled tokens, enriched with price, liquidity, volume, pair age and socials. A discovery STARTING POINT only: boosts are paid promotions, not organic trending, and many promoted meme tokens are scams. Body: { chain, limit? }.",
    agentGuidance: {
      whenToUse: "Use to FIND candidate meme tokens to evaluate on a chain. This is step 1 of a meme workflow: discover -> /api/safety -> /api/holders -> /api/signal before any trade. Boosted = paid promotion, treat with skepticism.",
      input: "POST JSON: { chain (eth|bnb|base), limit? (default 10, max 15) }.",
      output: "tokens[] with token, source (boosted(paid)|new-profile), symbol, priceUsd, liquidityUsd, volume24hUsd, priceChange24hPct, pairAgeHours, hasSocials. Sorted by liquidity.",
      paymentFlow: PAY,
    },
    inputSchema: { type: "object", properties: { chain: { type: "string", enum: ["eth", "bnb", "base"], description: "EVM chain.", examples: ["base"] }, limit: { type: "number", description: "Max tokens, default 10, max 15." } }, required: ["chain"] },
    outputSchema: { type: "object", properties: { tokens: { type: "array", description: "Discovered tokens with market enrichment." }, count: { type: "number" } } },
  },
  {
    key: "safety",
    path: "/api/safety",
    title: "Meme Token Safety / Rug Check",
    description:
      "Rug/safety check for an EVM meme token via GoPlus: honeypot, sellability, buy/sell tax, owner privileges (mint, blacklist, pause, reclaim ownership, hidden owner, self-destruct), upgradeable proxy, source verification. Returns GO/CAUTION/AVOID with reasons and per-check detail. GO means no red flags in checks performed, NOT a guarantee. Body: { token, chain }.",
    agentGuidance: {
      whenToUse: "Use as the first safety gate before trading any meme token. AVOID = serious red flag (honeypot, reclaimable ownership). For holder/dump risk add /api/holders; for the full combined read use /api/signal.",
      input: "POST JSON: { token (0x...), chain (eth|bnb|base) }.",
      output: "verdict (GO|CAUTION|AVOID), buyTaxPct, sellTaxPct, reasons[], checks[] (id/status/detail), notChecked[].",
      paymentFlow: PAY,
    },
    inputSchema: TOKEN_IN,
    outputSchema: { type: "object", properties: { verdict: { type: "string", enum: ["GO", "CAUTION", "AVOID", "UNKNOWN"] }, buyTaxPct: { type: "number" }, sellTaxPct: { type: "number" }, reasons: { type: "array", items: { type: "string" } }, checks: { type: "array", items: { type: "object" } } } },
  },
  {
    key: "momentum",
    path: "/api/momentum",
    title: "Meme Token Momentum",
    description:
      "Real-time momentum/activity for an EVM token from DexScreener: price change 5m/1h/6h/24h, volume 1h/24h, 24h buy/sell ratio, liquidity, pair age, socials. Shows whether real buying flow is happening NOW. NOT a price prediction. Body: { token, chain }.",
    agentGuidance: {
      whenToUse: "Use to gauge whether a token has real recent buying flow (buy/sell ratio, volume, price change) and basic risk (new pair, low liquidity). Pair with /api/safety; combined read is /api/signal.",
      input: "POST JSON: { token (0x...), chain (eth|bnb|base) }.",
      output: "priceUsd, priceChange {m5,h1,h6,h24}, volume {h1,h24}, txns24h {buys,sells,buySellRatio}, liquidityUsd, pairAgeHours, hasSocials, signals[].",
      paymentFlow: PAY,
    },
    inputSchema: TOKEN_IN,
    outputSchema: { type: "object", properties: { priceUsd: { type: "number" }, priceChange: { type: "object" }, txns24h: { type: "object" }, liquidityUsd: { type: "number" }, pairAgeHours: { type: "number" }, signals: { type: "array", items: { type: "string" } } } },
  },
  {
    key: "holders",
    path: "/api/holders",
    title: "Meme Token Holder Concentration",
    description:
      "Holder concentration for an EVM token from GoPlus: holder count, top 10 holders with %, real (non-locked) concentration, owner/creator %, and LP locked %. High concentration in non-locked wallets = single-wallet dump risk. Body: { token, chain }.",
    agentGuidance: {
      whenToUse: "Use to assess dump risk from concentrated holders and whether liquidity is locked, before trading a meme token. Complements /api/safety (contract risk) with distribution risk.",
      input: "POST JSON: { token (0x...), chain (eth|bnb|base) }.",
      output: "holderCount, topHolders[] (address/percent/isLocked/tag), topNonLockedConcentrationPct, ownerPercent, creatorPercent, lpLockedPct, reasons[].",
      paymentFlow: PAY,
    },
    inputSchema: TOKEN_IN,
    outputSchema: { type: "object", properties: { holderCount: { type: "number" }, topHolders: { type: "array" }, topNonLockedConcentrationPct: { type: "number" }, lpLockedPct: { type: "number" }, reasons: { type: "array", items: { type: "string" } } } },
  },
  {
    key: "signal",
    path: "/api/signal",
    title: "Meme Signal (composite)",
    description:
      "Composite meme signal: combines safety + holder concentration + LP lock + liquidity + buy/sell flow into a SAFETY-GATED verdict (GO/CAUTION/AVOID) plus a separate momentum bias (rising/falling/flat), with a transparent factor breakdown and risk flags. One call for a full go/no-go read. Decision-support, NOT financial advice and NOT a pump prediction. Body: { token, chain }.",
    agentGuidance: {
      whenToUse: "Use as the single combined read on a meme token before an agent decides to trade it itself. Replaces chaining safety + holders + momentum. verdict is safety-gated (AVOID safety forces AVOID). The agent decides and executes; this does not place orders.",
      input: "POST JSON: { token (0x...), chain (eth|bnb|base) }.",
      output: "verdict (GO|CAUTION|AVOID), momentumBias (rising|falling|flat), summary{}, factors[] (name/reading/impact/why), riskFlags[].",
      paymentFlow: PAY,
    },
    inputSchema: TOKEN_IN,
    outputSchema: { type: "object", properties: { verdict: { type: "string", enum: ["GO", "CAUTION", "AVOID"] }, momentumBias: { type: "string" }, summary: { type: "object" }, factors: { type: "array", items: { type: "object" } }, riskFlags: { type: "array", items: { type: "string" } } } },
  },
];

export function priceOf(key: string): string { return priceUsdFor(key); }
