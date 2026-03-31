export type StockOutput = {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  action: string;
  risk: string;
  score: number;
  reason: string;
};

export function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function isValidQuote(q: any): boolean {
  return (
    !!q &&
    typeof q.symbol === "string" &&
    q.symbol.trim() !== "" &&
    safeNumber(q.price, 0) > 0
  );
}

export function buildStockOutput(
  code: string,
  quote: any,
  decision: any
): StockOutput {
  return {
    code: String(quote?.symbol || code),
    name: String(quote?.name || code),
    price: safeNumber(quote?.price, 0),
    change: safeNumber(quote?.change, 0),
    changePercent: safeNumber(quote?.pct, 0),
    action: String(decision?.action || "觀望"),
    risk: String(decision?.risk || "中"),
    score: safeNumber(decision?.score, 0),
    reason: String(decision?.reason || "無"),
  };
}

export function buildStockReplyText(d: StockOutput): string {
  return [
    `📊 ${d.code} ${d.name}`,
    `現價：${d.price}`,
    `漲跌：${d.change}`,
    `漲跌幅：${d.changePercent}%`,
    `指令：${d.action}`,
    `風險：${d.risk}`,
    `Score：${d.score}`,
    `原因：${d.reason}`,
  ].join("\n");
}

export function buildScannerText(rows: any[]): string {
  if (!Array.isArray(rows) || rows.length === 0) {
    return "🔥 今日機會股 TOP 5\n\n目前無有效資料標的";
  }

  const lines: string[] = [];
  lines.push("🔥 今日機會股 TOP 5");
  lines.push("");

  rows.forEach((row, index) => {
    const code = String(row?.code || "");
    const name = String(row?.name || "");
    const score = safeNumber(row?.score, 0);
    const action = String(row?.action || "觀望");
    const pct = safeNumber(row?.pct, 0);
    const risk = String(row?.risk || "中");

    lines.push(`${index + 1}. ${code} ${name} | Score:${score}`);
    lines.push(`${action}`);
    lines.push(`漲跌幅：${pct >= 0 ? "+" : ""}${pct}% | 風險：${risk}`);
    lines.push("");
  });

  return lines.join("\n").trim();
}

export function buildAlertTestText(rows: any[]): string {
  if (!Array.isArray(rows) || rows.length === 0) {
    return "🔕 警報測試結果\n\n目前無有效資料標的";
  }

  const alertRows = rows.filter((x) => safeNumber(x?.score, 0) >= 60);

  const lines: string[] = [];
  lines.push("🔕 警報測試結果");
  lines.push(`總筆數：${rows.length}`);
  lines.push(`可警報：${alertRows.length}`);
  lines.push("");

  if (alertRows.length === 0) {
    lines.push("目前無符合警報條件標的");
    return lines.join("\n");
  }

  alertRows.forEach((x, i) => {
    const code = String(x?.code || "");
    const name = String(x?.name || "");
    const score = safeNumber(x?.score, 0);
    const action = String(x?.action || "觀望");
    const pct = safeNumber(x?.pct, 0);
    const risk = String(x?.risk || "中");

    lines.push(`${i + 1}. ${code} ${name} | Score:${score} | ${action}`);
    lines.push(`   漲跌幅：${pct >= 0 ? "+" : ""}${pct}% | 風險：${risk}`);
  });

  return lines.join("\n");
}
