export function runLanguageMap(input: any) {
  const q = input?.quote || {};
  const d = input?.decision || {};

  return {
    code: String(q.symbol || ""),
    name: String(q.name || q.symbol || ""),
    price: Number(q.price || 0),
    change: Number(q.change || 0),
    changePercent: Number(q.pct || 0),
    action: String(d.action || "觀望"),
    risk: String(d.risk || "中"),
    score: Number(d.score || 0),
    reason: String(d.reason || ""),
  };
}
