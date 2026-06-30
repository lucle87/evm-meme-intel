// Momentum/activity cho mot token meme: dong tien co dang vao that khong.
// Tu DexScreener: doi gia 5m/1h/6h/24h, volume, ty le buy/sell, thanh khoan,
// tuoi pair, co social. KHONG du doan pump; chi do hoat dong thuc te gan day.
import { tokenPairs } from "@/lib/dexscreener";

export async function getMomentum(chain: string, token: string) {
  const res = await tokenPairs(chain, token);
  if (!res) return { found: false, token, chain };
  const p = res.best;
  const tx24 = p?.txns?.h24 || {};
  const tx1 = p?.txns?.h1 || {};
  const buys24 = tx24?.buys ?? null;
  const sells24 = tx24?.sells ?? null;
  const buySellRatio24 =
    buys24 != null && sells24 != null && sells24 > 0 ? Number((buys24 / sells24).toFixed(2)) : null;
  const createdMs = p?.pairCreatedAt ? Number(p.pairCreatedAt) : null;
  const ageHours = createdMs ? Number(((Date.now() - createdMs) / 3_600_000).toFixed(1)) : null;
  const hasSocials = !!(p?.info?.socials?.length || p?.info?.websites?.length);

  const ch = p?.priceChange || {};
  // doc momentum tho (minh bach, khong du doan)
  const signals: string[] = [];
  if ((ch.h1 ?? 0) > 20) signals.push("Strong 1h price increase (+" + ch.h1 + "%).");
  if ((ch.h1 ?? 0) < -20) signals.push("Sharp 1h drop (" + ch.h1 + "%).");
  if (buySellRatio24 != null && buySellRatio24 >= 1.5) signals.push("Buy pressure: ~" + buySellRatio24 + "x more buys than sells (24h).");
  if (buySellRatio24 != null && buySellRatio24 <= 0.66) signals.push("Sell pressure: more sells than buys (24h).");
  if (ageHours != null && ageHours < 24) signals.push("Very new pair (~" + ageHours + "h old): high risk, thin history.");
  if ((p?.liquidity?.usd ?? 0) < 10000) signals.push("Low liquidity (<$10k): high slippage / exit risk.");
  if (!hasSocials) signals.push("No socials/website listed on DexScreener.");
  if (!signals.length) signals.push("No notable momentum signals.");

  return {
    type: "momentum",
    found: true,
    token,
    chain,
    symbol: p?.baseToken?.symbol || null,
    priceUsd: p?.priceUsd ? Number(p.priceUsd) : null,
    priceChange: {
      m5: ch.m5 ?? null, h1: ch.h1 ?? null, h6: ch.h6 ?? null, h24: ch.h24 ?? null,
    },
    volume: { h1: p?.volume?.h1 ?? null, h24: p?.volume?.h24 ?? null },
    txns24h: { buys: buys24, sells: sells24, buySellRatio: buySellRatio24 },
    txns1h: { buys: tx1?.buys ?? null, sells: tx1?.sells ?? null },
    liquidityUsd: p?.liquidity?.usd ?? null,
    fdvUsd: p?.fdv ?? null,
    pairAgeHours: ageHours,
    hasSocials,
    pairUrl: p?.url || null,
    signals,
    note: "Real-time activity from DexScreener, NOT a price prediction. Buy/sell ratio and volume show recent flow; a new pair or low liquidity is a major risk regardless of momentum.",
  };
}
