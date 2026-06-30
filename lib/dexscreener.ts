// DexScreener helpers (free, khong key). Dung cho discover + momentum.
// Luu y: boosts la token TRA PHI de duoc day (paid promotion), khong phai
// trending huu co. Endpoint discover ghi ro dieu nay.
import { fetchJson, fetchJsonSafe } from "@/lib/http";

const BASE = "https://api.dexscreener.com";

// EVM chain id cua DexScreener
export const DS_CHAINS: Record<string, string> = {
  eth: "ethereum", ethereum: "ethereum", bnb: "bsc", bsc: "bsc", base: "base",
};
export function dsChain(chain: string): string | null {
  return DS_CHAINS[chain.toLowerCase()] || null;
}

// Lay cac pair cua mot token, chon pair thanh khoan cao nhat
export async function tokenPairs(chain: string, token: string): Promise<any | null> {
  const c = dsChain(chain);
  if (!c) throw new Error("Unsupported chain: " + chain + " (use eth, bnb, base).");
  // endpoint tokens: tra cac pair cua token tren MOI chain; loc theo chain
  const url = BASE + "/latest/dex/tokens/" + token;
  const data: any = await fetchJsonSafe(url, { timeoutMs: 6000 });
  const pairs: any[] = Array.isArray(data?.pairs) ? data.pairs : [];
  const onChain = pairs.filter((p) => (p?.chainId || "").toLowerCase() === c);
  const use = onChain.length ? onChain : pairs;
  if (!use.length) return null;
  use.sort((a, b) => (b?.liquidity?.usd || 0) - (a?.liquidity?.usd || 0));
  return { best: use[0], pairCount: use.length };
}

// Token moi duoc boost (TRA PHI) - dung cho discover
export async function boostedTokens(): Promise<any[]> {
  const url = BASE + "/token-boosts/top/v1";
  const data: any = await fetchJsonSafe(url, { timeoutMs: 6000 });
  return Array.isArray(data) ? data : [];
}

// Token moi duoc tao profile (moi list) - dung cho discover
export async function latestProfiles(): Promise<any[]> {
  const url = BASE + "/token-profiles/latest/v1";
  const data: any = await fetchJsonSafe(url, { timeoutMs: 6000 });
  return Array.isArray(data) ? data : [];
}
