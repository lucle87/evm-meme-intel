// GoPlus Token Security (EVM) - nguon chung cho safety + holders + signal.
// Goi 1 lan, cache 60s, tra ve record tho de tung endpoint parse cai no can.
// Free, khong key. chain_id: eth=1, bnb=56, base=8453. Percent la chuoi thap phan.
import { fetchJson } from "@/lib/http";
import { cached } from "@/lib/cache";

export const CHAIN_IDS: Record<string, string> = {
  eth: "1", ethereum: "1", bnb: "56", bsc: "56", base: "8453",
};

export function chainIdOf(chain: string): string | null {
  return CHAIN_IDS[chain.toLowerCase()] || null;
}

export async function goplusToken(chain: string, token: string): Promise<any | null> {
  const chainId = chainIdOf(chain);
  if (!chainId) throw new Error("Unsupported chain: " + chain + " (use eth, bnb, base).");
  const addr = token.toLowerCase();
  const key = "goplus-evm:" + chainId + ":" + addr;
  try {
    return await cached(key, 60000, async () => {
      const url =
        "https://api.gopluslabs.io/api/v1/token_security/" + chainId + "?contract_addresses=" + addr;
      const data: any = await fetchJson(url, { timeoutMs: 6000 });
      const rec = data?.result?.[addr];
      return rec || null;
    });
  } catch {
    return null;
  }
}

// helper doc % (GoPlus tra chuoi thap phan "0.05" = 5%)
export function pctOf(v: any): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Number((n * 100).toFixed(2));
}

// helper doc co (GoPlus tra "1"/"0")
export function flag(v: any): boolean {
  return v === "1" || v === 1 || v === true;
}
