import { SCAN_SYMBOLS, getBatchQuotes, fmtPrice, fmtSigned, fmtSignedPct, Quote } from "./marketDataEngine";
import { model } from "./modelEngine";

type BreakoutCandidate = {
  quote: Quote;
  score: number;
  action: string;
  reason: string;
};

function breakoutScore(q: Quote) {
  const m = model(q);

  let breakout = 0;
  const pct = q.changePercent;
  const vol = q.volume;

  if (pct >= 1 && pct <= 4) breakout += 30;
  if (vol > 20000) breakout += 25;
  if (m.hci >= 60) breakout += 15;
  if (m.hrs >= 60) breakout += 15;
  if (m.hpq >= 55) breakout += 15;

  if (pct > 5) breakout -= 20;
  if (pct < 0) breakout -= 30;

  const total = Math.max(0, Math.min(100, breakout));

  let action = "觀望";
  let reason = "尚未形成乾淨起爆。";

  if (total >= 75) {
    action = "進場";
    reason = "剛起漲＋量能配合＋結構轉強。";
  } else if (total >= 60) {
    action = "續看";
    reason = "接近起爆，但還要確認延續。";
  } else if (total < 40) {
    action = "防守";
    reason = "動能不足，不宜硬做。";
  }

  return {
    total,
    action,
    reason,
  };
}

export async function runBreakout(): Promise<string> {
  const quotes = await getBatchQuotes(SCAN_SYMBOLS);

  if (quotes.length === 0) {
    return "❌ 起爆點掃描失敗";
  }

  const candidates: BreakoutCandidate[] = quotes
    .map((q) => {
      const b = breakoutScore(q);
      return {
        quote: q,
        score: b.total,
        action: b.action,
        reason: b.reason,
      };
    })
    .filter((x) => x.score >= 60)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (candidates.length === 0) {
    return "❌ 無起爆點";
  }

  const lines: string[] = [];
  lines.push("🚀 Helmsman 起爆點引擎");
  lines.push("");

  candidates.forEach((x, i) => {
    lines.push(`${i + 1}. ${x.quote.name}(${x.quote.symbol})`);
    lines.push(`族群：${x.quote.sector}`);
    lines.push(`現價：${fmtPrice(x.quote.price)}`);
    lines.push(`漲幅：${fmtSigned(x.quote.change)} (${fmtSignedPct(x.quote.changePercent)})`);
    lines.push(`量能：${x.quote.volume}`);
    lines.push(`分數：${x.score}`);
    lines.push(`👉 ${x.action}`);
    lines.push(`理由：${x.reason}`);
    lines.push("");
  });

  return lines.join("\n");
}
