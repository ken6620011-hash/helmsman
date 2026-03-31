export type StockOutput = {
  code: string;
  name: string;

  price: number;
  change: number;
  changePercent: number;

  action: string;
  finalAction?: string;
  risk: string;

  score: number;
  rawScore?: number;
  breakout?: number;

  reason: string;
  marketState?: string;

  supportPrice?: number;
  supportDays?: number;
  structureBroken?: boolean;
  supportReason?: string;

  trailingStopActive?: boolean;
  trailingStopRule?: string;
};

function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/* ✅ 補回 */
export function isValidQuote(q: any): boolean {
  return (
    !!q &&
    typeof q.symbol === "string" &&
    q.symbol.trim() !== "" &&
    safeNumber(q.price, 0) > 0
  );
}

/* ✅ 補回（這次錯誤來源） */
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
    const pct = safeNumber(row?.changePercent ?? row?.pct, 0);
    const risk = String(row?.risk || "中");

    lines.push(`${index + 1}. ${code} ${name} | Score:${score}`);
    lines.push(`${action}`);
    lines.push(`漲跌幅：${pct >= 0 ? "+" : ""}${pct}% | 風險：${risk}`);
    lines.push("");
  });

  return lines.join("\n").trim();
}

/* ===== 以下維持你剛剛版本 ===== */

function fmtPct(v: number): string {
  const n = safeNumber(v, 0);
  return `${n >= 0 ? "+" : ""}${n}%`;
}

function fmtPrice(v: number): string {
  return String(safeNumber(v, 0));
}

function fmtSupportLine(d: StockOutput): string[] {
  const lines: string[] = [];

  const support = safeNumber(d.supportPrice, 0);
  const days = safeNumber(d.supportDays, 0);
  const broken = Boolean(d.structureBroken);

  if (support <= 0) {
    lines.push("支撐：無資料");
    return lines;
  }

  lines.push(`支撐：${support}`);

  if (days > 0) {
    lines.push(`守穩：${days} 天`);
  }

  lines.push(`狀態：${broken ? "已跌破" : "未破"}`);

  return lines;
}

function fmtTrailingLine(d: StockOutput): string[] {
  const lines: string[] = [];

  if (d.trailingStopRule) {
    lines.push(d.trailingStopRule);
    return lines;
  }

  if (d.trailingStopActive) {
    lines.push("移動停損：已啟動");
  } else {
    lines.push("移動停損：未啟動");
  }

  return lines;
}

export function buildStockOutput(
  code: string,
  quote: any,
  decision: any
): StockOutput {
  const changePercent =
    safeNumber(quote?.changePercent, Number.NaN) === safeNumber(quote?.changePercent, Number.NaN)
      ? safeNumber(quote?.changePercent, 0)
      : safeNumber(quote?.pct, 0);

  return {
    code: String(quote?.symbol || code),
    name: String(quote?.name || code),

    price: safeNumber(quote?.price, 0),
    change: safeNumber(quote?.change, 0),
    changePercent,

    action: String(decision?.action || "觀望"),
    finalAction: String(decision?.finalAction || decision?.action || "觀望"),
    risk: String(decision?.risk || "中"),

    score: safeNumber(decision?.score, 0),
    rawScore: safeNumber(decision?.rawScore, 0),
    breakout: safeNumber(decision?.breakout, 0),

    reason: String(decision?.reason || "無"),
    marketState: String(decision?.marketState || ""),

    supportPrice: safeNumber(decision?.supportPrice, 0),
    supportDays: safeNumber(decision?.supportDays, 0),
    structureBroken: Boolean(decision?.structureBroken),
    supportReason: String(decision?.supportReason || ""),

    trailingStopActive: Boolean(decision?.trailingStopActive),
    trailingStopRule: String(decision?.trailingStopRule || ""),
  };
}

export function buildStockReplyText(d: StockOutput): string {
  const lines: string[] = [];

  lines.push(`📊 ${d.code} ${d.name}`);
  lines.push(`現價：${fmtPrice(d.price)}`);
  lines.push(`漲跌：${d.change}`);
  lines.push(`漲跌幅：${fmtPct(d.changePercent)}`);
  lines.push("");

  lines.push("📌 結構");
  lines.push(...fmtSupportLine(d));
  lines.push("");

  lines.push("📌 決策");
  lines.push(`指令：${d.finalAction || d.action}`);
  lines.push(`風險：${d.risk}`);
  lines.push(`Score：${d.score}`);
  lines.push("");

  lines.push("📌 風控");

  if (d.supportPrice && d.supportPrice > 0) {
    lines.push(`停損：${d.supportPrice}（支撐）`);
  } else {
    lines.push("停損：未定義");
  }

  lines.push(...fmtTrailingLine(d));
  lines.push("");

  lines.push("📌 判斷");
  lines.push(d.reason || "無");

  return lines.join("\n").trim();
}
