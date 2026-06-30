// Signal tong hop cho token meme: ket hop safety + momentum + holders thanh mot
// verdict (GO/CAUTION/AVOID) va momentum bias, kem factors MINH BACH. Decision-support:
// agent doc roi TU quyet dinh. KHONG du doan pump, KHONG phai loi khuyen dau tu.
import { getSafety } from "@/lib/endpoints/safety";
import { getMomentum } from "@/lib/endpoints/momentum";
import { getHolders } from "@/lib/endpoints/holders";
import { cached } from "@/lib/cache";

type Factor = { name: string; reading: string; impact: string; why: string };

export async function getMemeSignal(chain: string, token: string) {
  return cached("memesignal:" + chain + ":" + token.toLowerCase(), 30000, async () => {
    const [safety, momentum, holders] = await Promise.all([
      getSafety(chain, token).catch(() => null),
      getMomentum(chain, token).catch(() => null),
      getHolders(chain, token).catch(() => null),
    ]);

    const factors: Factor[] = [];
    const riskFlags: string[] = [];

    // ---- SAFETY quyet dinh verdict (an toan la uu tien) ----
    let safetyVerdict = safety?.verdict || "UNKNOWN";
    if (safetyVerdict === "AVOID") {
      factors.push({ name: "safety", reading: "AVOID", impact: "blocking", why: (safety?.reasons || []).join(" ") });
      riskFlags.push("Safety check returned AVOID: " + (safety?.reasons || []).slice(0, 2).join(" "));
    } else if (safetyVerdict === "CAUTION") {
      factors.push({ name: "safety", reading: "CAUTION", impact: "negative", why: (safety?.reasons || []).slice(0, 2).join(" ") });
    } else if (safetyVerdict === "GO") {
      factors.push({ name: "safety", reading: "GO (no red flags)", impact: "positive", why: "No honeypot/owner red flags in checks performed." });
    } else {
      factors.push({ name: "safety", reading: "UNKNOWN", impact: "negative", why: "No GoPlus data; treat as higher risk." });
    }

    // ---- HOLDERS concentration ----
    const conc = holders?.topNonLockedConcentrationPct ?? null;
    if (conc != null) {
      if (conc >= 50) { factors.push({ name: "concentration", reading: conc + "% in top non-locked wallets", impact: "negative", why: "Single-wallet dump risk." }); riskFlags.push("High holder concentration (" + conc + "%)."); }
      else if (conc >= 30) factors.push({ name: "concentration", reading: conc + "%", impact: "slightly_negative", why: "Moderately concentrated." });
      else factors.push({ name: "concentration", reading: conc + "%", impact: "positive", why: "Reasonably distributed." });
    }
    const lpLocked = holders?.lpLockedPct ?? null;
    if (lpLocked != null && lpLocked < 50) { riskFlags.push("LP only ~" + lpLocked + "% locked: rug-pull risk."); factors.push({ name: "lp_lock", reading: lpLocked + "% LP locked", impact: "negative", why: "Liquidity could be pulled." }); }
    else if (lpLocked != null) factors.push({ name: "lp_lock", reading: lpLocked + "% LP locked", impact: "positive", why: "Liquidity mostly locked/burned." });

    // ---- MOMENTUM ----
    const liq = momentum?.liquidityUsd ?? null;
    if (liq != null && liq < 10000) { riskFlags.push("Low liquidity (<$10k)."); factors.push({ name: "liquidity", reading: "$" + Math.round(liq), impact: "negative", why: "Thin liquidity: high slippage / exit risk." }); }
    else if (liq != null) factors.push({ name: "liquidity", reading: "$" + Math.round(liq), impact: "positive", why: "Adequate liquidity." });

    const bsr = momentum?.txns24h?.buySellRatio ?? null;
    if (bsr != null) {
      if (bsr >= 1.5) factors.push({ name: "flow_24h", reading: bsr + "x buys/sells", impact: "positive", why: "Net buy pressure." });
      else if (bsr <= 0.66) factors.push({ name: "flow_24h", reading: bsr + "x buys/sells", impact: "negative", why: "Net sell pressure." });
      else factors.push({ name: "flow_24h", reading: bsr + "x buys/sells", impact: "neutral", why: "Balanced flow." });
    }
    const age = momentum?.pairAgeHours ?? null;
    if (age != null && age < 24) riskFlags.push("Very new pair (~" + age + "h): extreme risk.");

    // ---- momentum bias (rieng voi safety) ----
    const ch1 = momentum?.priceChange?.h1 ?? null;
    let momentumBias = "flat";
    if (ch1 != null) {
      if (ch1 > 10 && (bsr ?? 0) >= 1.2) momentumBias = "rising";
      else if (ch1 < -10) momentumBias = "falling";
    }

    // ---- verdict tong hop: safety la cong tat ----
    let verdict = "CAUTION";
    if (safetyVerdict === "AVOID" || safetyVerdict === "UNKNOWN") verdict = "AVOID";
    else if (safetyVerdict === "GO" && (conc == null || conc < 50) && (lpLocked == null || lpLocked >= 50) && (liq == null || liq >= 10000)) verdict = "GO";
    else verdict = "CAUTION";

    return {
      type: "meme-signal",
      token, chain,
      symbol: safety?.symbol || momentum?.symbol || null,
      verdict, // GO | CAUTION | AVOID  (safety-gated)
      momentumBias, // rising | falling | flat (independent of verdict)
      priceUsd: momentum?.priceUsd ?? null,
      summary: {
        safety: safetyVerdict,
        concentrationPct: conc,
        lpLockedPct: lpLocked,
        liquidityUsd: liq,
        buySellRatio24h: bsr,
        pairAgeHours: age,
      },
      factors,
      riskFlags: riskFlags.length ? riskFlags : ["No blocking risk flags in available data."],
      note: "Decision-support only, NOT financial advice and NOT a pump prediction. verdict is SAFETY-GATED: AVOID/UNKNOWN safety forces AVOID regardless of momentum. momentumBias is a separate mechanical read of recent flow. Meme coins are extremely high-risk; a GO with rising momentum can still dump to zero. The agent decides and executes with its own risk management.",
    };
  });
}
