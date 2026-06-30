// Safety / rug-check cho token meme EVM tu GoPlus. Verdict GO/CAUTION/AVOID.
// Free. Kiem: honeypot, ban duoc khong, thue mua/ban, owner privileges, mint,
// proxy nang cap, blacklist, pause. KHONG bao dam an toan; chi co/khong co red flag.
import { goplusToken, pctOf, flag } from "@/lib/goplus-evm";

export async function getSafety(chain: string, token: string) {
  const rec = await goplusToken(chain, token);
  if (!rec) {
    return { type: "safety", token, chain, verdict: "UNKNOWN", reasons: ["GoPlus has no data for this token (too new, unsupported, or not an ERC-20)."], checks: [], notChecked: [] };
  }

  const checks: { id: string; status: string; detail: string }[] = [];
  const danger: string[] = [];
  const warn: string[] = [];

  // honeypot / sellability
  if (flag(rec.is_honeypot)) { danger.push("Honeypot: cannot sell."); checks.push({ id: "honeypot", status: "danger", detail: "Flagged as honeypot (cannot sell)." }); }
  else if (flag(rec.cannot_sell_all)) { warn.push("Cannot sell all tokens."); checks.push({ id: "sellability", status: "warn", detail: "cannot_sell_all flag set." }); }
  else checks.push({ id: "honeypot", status: "ok", detail: "No honeypot flag." });

  // taxes
  const buyTax = pctOf(rec.buy_tax);
  const sellTax = pctOf(rec.sell_tax);
  if (sellTax != null && sellTax >= 50) { danger.push("Extreme sell tax " + sellTax + "%."); checks.push({ id: "tax", status: "danger", detail: "Sell tax " + sellTax + "%." }); }
  else if ((sellTax ?? 0) >= 10 || (buyTax ?? 0) >= 10) { warn.push("High tax (buy " + buyTax + "%, sell " + sellTax + "%)."); checks.push({ id: "tax", status: "warn", detail: "buy " + buyTax + "% / sell " + sellTax + "%." }); }
  else checks.push({ id: "tax", status: "ok", detail: "buy " + buyTax + "% / sell " + sellTax + "%." });

  // owner privileges
  if (flag(rec.is_mintable)) { warn.push("Mintable: supply can increase."); checks.push({ id: "mintable", status: "warn", detail: "Owner can mint more tokens." }); }
  if (flag(rec.can_take_back_ownership)) { danger.push("Owner can reclaim ownership."); checks.push({ id: "ownership", status: "danger", detail: "can_take_back_ownership set." }); }
  if (flag(rec.hidden_owner)) { danger.push("Hidden owner."); checks.push({ id: "hidden_owner", status: "danger", detail: "Hidden owner detected." }); }
  if (flag(rec.selfdestruct)) { danger.push("Self-destruct present."); checks.push({ id: "selfdestruct", status: "danger", detail: "Contract can self-destruct." }); }
  if (flag(rec.transfer_pausable)) { warn.push("Transfers can be paused."); checks.push({ id: "pausable", status: "warn", detail: "transfer_pausable set." }); }
  if (flag(rec.is_blacklisted)) { warn.push("Blacklist function present."); checks.push({ id: "blacklist", status: "warn", detail: "Owner can blacklist addresses." }); }
  if (flag(rec.trading_cooldown)) { warn.push("Trading cooldown present."); checks.push({ id: "cooldown", status: "warn", detail: "trading_cooldown set." }); }

  // proxy / open source
  if (flag(rec.is_proxy)) { warn.push("Upgradeable proxy: logic can change."); checks.push({ id: "proxy", status: "warn", detail: "Upgradeable proxy." }); }
  if (rec.is_open_source != null && !flag(rec.is_open_source)) { warn.push("Source not verified."); checks.push({ id: "open_source", status: "warn", detail: "Contract source not verified." }); }
  else if (flag(rec.is_open_source)) checks.push({ id: "open_source", status: "ok", detail: "Source verified." });

  let verdict = "GO";
  if (danger.length) verdict = "AVOID";
  else if (warn.length) verdict = "CAUTION";

  const reasons = [...danger, ...warn];
  if (!reasons.length) reasons.push("No red flags in the checks performed.");

  return {
    type: "safety",
    token, chain,
    symbol: rec.token_name ? (rec.token_symbol || null) : (rec.token_symbol || null),
    verdict, // GO | CAUTION | AVOID
    buyTaxPct: buyTax, sellTaxPct: sellTax,
    reasons,
    checks,
    notChecked: ["LP lock duration", "team token vesting", "off-chain rug intent", "social legitimacy"],
    note: "GoPlus on-chain safety read. GO means no red flags in the checks performed, NOT a guarantee of safety. Meme coins are high-risk; a clean contract can still dump.",
  };
}
