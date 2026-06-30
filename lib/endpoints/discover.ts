// Discover: token meme moi noi tren mot EVM chain. Nguon: DexScreener boosts (TRA PHI
// de duoc day) + latest profiles (moi list). Lam giau bang price/liquidity/volume.
// TRUNG THUC: boosts la paid promotion, KHONG phai trending huu co. Day la diem
// khoi dau de agent tim coin, agent PHAI tu check safety + momentum truoc khi trade.
import { boostedTokens, latestProfiles, tokenPairs, dsChain } from "@/lib/dexscreener";

export async function getDiscover(chain: string, limit = 10) {
  const c = dsChain(chain);
  if (!c) throw new Error("Unsupported chain: " + chain + " (use eth, bnb, base).");

  const [boosts, profiles] = await Promise.all([boostedTokens(), latestProfiles()]);

  // gom + loc theo chain, danh dau nguon
  const seen = new Set<string>();
  const cand: { token: string; source: string; boost?: number }[] = [];
  for (const b of boosts) {
    if ((b?.chainId || "").toLowerCase() !== c) continue;
    const addr = (b?.tokenAddress || "").toLowerCase();
    if (!addr || seen.has(addr)) continue;
    seen.add(addr);
    cand.push({ token: b.tokenAddress, source: "boosted(paid)", boost: b?.totalAmount ?? b?.amount ?? null });
  }
  for (const p of profiles) {
    if ((p?.chainId || "").toLowerCase() !== c) continue;
    const addr = (p?.tokenAddress || "").toLowerCase();
    if (!addr || seen.has(addr)) continue;
    seen.add(addr);
    cand.push({ token: p.tokenAddress, source: "new-profile" });
  }

  const take = cand.slice(0, Math.min(limit, 15));
  // lam giau song song (gioi han de khong qua nhieu request)
  const enriched = await Promise.all(
    take.map(async (item) => {
      try {
        const res = await tokenPairs(chain, item.token);
        const p = res?.best;
        return {
          token: item.token,
          source: item.source,
          symbol: p?.baseToken?.symbol || null,
          name: p?.baseToken?.name || null,
          priceUsd: p?.priceUsd ? Number(p.priceUsd) : null,
          liquidityUsd: p?.liquidity?.usd ?? null,
          volume24hUsd: p?.volume?.h24 ?? null,
          priceChange24hPct: p?.priceChange?.h24 ?? null,
          pairAgeHours: p?.pairCreatedAt ? Number(((Date.now() - Number(p.pairCreatedAt)) / 3_600_000).toFixed(1)) : null,
          hasSocials: !!(p?.info?.socials?.length || p?.info?.websites?.length),
        };
      } catch {
        return { token: item.token, source: item.source, symbol: null, error: "enrich failed" };
      }
    })
  );

  // sap theo thanh khoan (cao truoc), token khong co pair xuong cuoi
  enriched.sort((a: any, b: any) => (b?.liquidityUsd || 0) - (a?.liquidityUsd || 0));

  return {
    type: "discover",
    chain,
    count: enriched.length,
    tokens: enriched,
    note: "Sourced from DexScreener boosted tokens (PAID promotions, not organic trending) and newly profiled tokens. This is a discovery starting point only. ALWAYS run /api/safety and /api/holders before trading any token here; many promoted meme tokens are scams.",
  };
}
