// Holder concentration cho token meme tu GoPlus (free): so holder, top holders,
// % tap trung, LP holders co lock khong, owner/creator %. Tap trung cao = rui ro
// mot vi xa lam sap gia.
import { goplusToken, pctOf, flag } from "@/lib/goplus-evm";

export async function getHolders(chain: string, token: string) {
  const rec = await goplusToken(chain, token);
  if (!rec) return { type: "holders", token, chain, found: false, reasons: ["No GoPlus data."] };

  const holders: any[] = Array.isArray(rec.holders) ? rec.holders : [];
  const top = holders.slice(0, 10).map((h) => ({
    address: h.address,
    percent: pctOf(h.percent),
    isContract: flag(h.is_contract),
    isLocked: flag(h.is_locked),
    tag: h.tag || null,
  }));
  // tong % top 10 KHONG tinh vi locked/burn/contract pool (uoc luong "real whale")
  const realTopPct = top
    .filter((h) => !h.isLocked && !(h.tag && /lock|burn|pool|dead/i.test(h.tag)))
    .reduce((s, h) => s + (h.percent || 0), 0);

  const lpHolders: any[] = Array.isArray(rec.lp_holders) ? rec.lp_holders : [];
  const lpLockedPct = lpHolders
    .filter((h) => flag(h.is_locked) || (h.tag && /lock|burn|dead/i.test(h.tag)))
    .reduce((s, h) => s + (pctOf(h.percent) || 0), 0);

  const ownerPct = pctOf(rec.owner_percent);
  const creatorPct = pctOf(rec.creator_percent);

  const reasons: string[] = [];
  if (realTopPct >= 50) reasons.push("Top non-locked holders control ~" + realTopPct.toFixed(1) + "% of supply: very concentrated, single-wallet dump risk.");
  else if (realTopPct >= 30) reasons.push("Top non-locked holders ~" + realTopPct.toFixed(1) + "%: moderately concentrated.");
  if ((ownerPct ?? 0) >= 5) reasons.push("Owner holds ~" + ownerPct + "%.");
  if ((creatorPct ?? 0) >= 5) reasons.push("Creator holds ~" + creatorPct + "%.");
  if (lpHolders.length && lpLockedPct < 50) reasons.push("Only ~" + lpLockedPct.toFixed(1) + "% of LP is locked/burned: liquidity could be pulled.");
  if (lpHolders.length && lpLockedPct >= 50) reasons.push("~" + lpLockedPct.toFixed(1) + "% of LP locked/burned.");
  if (!reasons.length) reasons.push("No extreme concentration detected in available data.");

  return {
    type: "holders",
    token, chain, found: true,
    holderCount: rec.holder_count != null ? Number(rec.holder_count) : null,
    topHolders: top,
    topNonLockedConcentrationPct: Number(realTopPct.toFixed(1)),
    ownerPercent: ownerPct,
    creatorPercent: creatorPct,
    lpLockedPct: lpHolders.length ? Number(lpLockedPct.toFixed(1)) : null,
    reasons,
    note: "Holder data from GoPlus. The largest holders are often the liquidity pool or locked/burned wallets; topNonLockedConcentrationPct excludes those to estimate real-wallet concentration. High concentration is a dump-risk flag, not proof of malice.",
  };
}
