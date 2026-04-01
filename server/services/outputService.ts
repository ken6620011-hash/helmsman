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
  finalScore?: number;
  rawScore?: number;
  breakout?: number;

  point21Score?: number;
  point21Value?: number;
  simulatedPrice?: number;
  diffValue?: number;
  upperBound?: number;
  point21State?: string;
  point21Reason?: string;

  supportPrice?: number;
  supportDays?: number;
  structureBroken?: boolean;
  supportReason?: string;

  marketState?: string;

  stopLossPrice?: number;
  trailingStopActive?: boolean;
  trailingStopPrice?: number;
  trailingStopRule?: string;

  structureRisk?: string;
  timeValidation?: string;
  priceStopStatus?: string;
  canHold?: boolean;
  shouldExit?: boolean;
  riskReason?: string;

  hasPosition?: boolean;
  positionStatus?: string;
  entryPrice?: number;
  highestPriceSinceEntry?: number;
  lowestPriceSinceEntry?: number;
  quantity?: number;
  pnlAmount?: number;
  pnlPercent?: number;

  reason: string;
};

function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(v: unknown, fallback = ""): string {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function round2(v: number): number {
  return Number(v.toFixed(2));
}

export function isValidQuote(q: any): boolean {
  return (
    !!q &&
    typeof q.symbol === "string" &&
    q.symbol.trim() !== "" &&
    safeNumber(q.price, 0) > 0
  );
}

function fmtNumber(v: unknown): string {
  return String(safeNumber(v, 0));
}

function fmtPct(v: unknown): string {
  const n = safeNumber(v, 0);
  return `${n >= 0 ? "+" : ""}${n}%`;
}

function pickPoint21Value(decision: any): number {
  return safeNumber(
    decision?.point21Value ??
      decision?.point21?.point21Value ??
      decision?.point21ValueRaw,
    0
  );
}

function pickPoint21Score(decision: any): number {
  return safeNumber(
    decision?.point21Score ??
      decision?.point21?.point21Score ??
      decision?.score,
    0
  );
}

function pickSimulatedPrice(decision: any, quote: any): number {
  return safeNumber(
    decision?.simulatedPrice ??
      decision?.point21?.simulatedPrice ??
      quote?.price,
    0
  );
}

function pickDiffValue(decision: any): number {
  return safeNumber(
    decision?.diffValue ??
      decision?.point21?.diffValue,
    0
  );
}

function pickUpperBound(decision: any, quote: any): number {
  return safeNumber(
    decision?.upperBound ??
      decision?.point21?.upperBound ??
      quote?.price,
    0
  );
}

function normalizeReasonPart(part: unknown): string {
  return safeString(part)
    .replace(/；+/g, "；")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^；+|；+$/g, "");
}

function dedupeReasonParts(parts: unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of parts) {
    const text = normalizeReasonPart(raw);
    if (!text) continue;

    const split = text
      .split("；")
      .map((x) => normalizeReasonPart(x))
      .filter(Boolean);

    for (const item of split) {
      const key = item;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }

  return out;
}

function buildBasePoint21Reason(d: StockOutput): string {
  const point21Value = Math.round(safeNumber(d.point21Value, 0));
  const simulatedPrice = safeNumber(d.simulatedPrice, d.price);
  const diffValue = safeNumber(d.diffValue, 0);
  const upperBound = safeNumber(d.upperBound, d.price);

  if (point21Value >= 14) {
    return `21點數偏強（${point21Value}/21），平台 ${simulatedPrice}，差值 ${diffValue}，上緣 ${upperBound}`;
  }

  if (point21Value >= 7) {
    return `21點數中性（${point21Value}/21），平台 ${simulatedPrice}，差值 ${diffValue}，上緣 ${upperBound}`;
  }

  return `21點數偏弱（${point21Value}/21），平台 ${simulatedPrice}，差值 ${diffValue}，上緣 ${upperBound}`;
}

function buildBaseSupportReason(d: StockOutput): string {
  const supportPrice = safeNumber(d.supportPrice, 0);
  const supportDays = Math.max(0, Math.round(safeNumber(d.supportDays, 0)));
  const broken = Boolean(d.structureBroken);

  if (supportPrice <= 0) {
    return "尚無有效支撐資料";
  }

  if (broken) {
    return `跌破支撐 ${supportPrice}`;
  }

  if (supportDays > 0) {
    return `支撐 ${supportPrice} 守穩 ${supportDays} 天`;
  }

  return `支撐 ${supportPrice}`;
}

function buildSupportLines(d: StockOutput): string[] {
  const lines: string[] = [];

  const supportPrice = safeNumber(d.supportPrice, 0);
  const supportDays = Math.max(0, Math.round(safeNumber(d.supportDays, 0)));
  const broken = Boolean(d.structureBroken);

  if (supportPrice <= 0) {
    lines.push("支撐：無資料");
    return lines;
  }

  lines.push(`支撐：${fmtNumber(supportPrice)}`);

  if (supportDays > 0) {
    lines.push(`守穩：${supportDays} 天`);
  }

  lines.push(`狀態：${broken ? "已跌破" : "未破"}`);
  return lines;
}

function buildRiskLines(d: StockOutput): string[] {
  const lines: string[] = [];

  if (safeString(d.structureRisk)) {
    lines.push(`結構風控：${safeString(d.structureRisk)}`);
  }

  if (safeString(d.timeValidation)) {
    lines.push(`時間驗證：${safeString(d.timeValidation)}`);
  }

  if (safeString(d.priceStopStatus)) {
    lines.push(`停損狀態：${safeString(d.priceStopStatus)}`);
  }

  if (typeof d.canHold === "boolean") {
    lines.push(`可續抱：${d.canHold ? "是" : "否"}`);
  }

  if (typeof d.shouldExit === "boolean") {
    lines.push(`應出場：${d.shouldExit ? "是" : "否"}`);
  }

  return lines;
}

function buildPositionLines(d: StockOutput): string[] {
  const lines: string[] = [];

  if (!d.hasPosition) {
    lines.push("持倉：無");
    return lines;
  }

  lines.push(`持倉：有${d.positionStatus ? `（${d.positionStatus}）` : ""}`);

  if (safeNumber(d.entryPrice, 0) > 0) {
    lines.push(`進場價：${fmtNumber(d.entryPrice)}`);
  }

  if (safeNumber(d.highestPriceSinceEntry, 0) > 0) {
    lines.push(`進場後最高：${fmtNumber(d.highestPriceSinceEntry)}`);
  }

  if (safeNumber(d.lowestPriceSinceEntry, 0) > 0) {
    lines.push(`進場後最低：${fmtNumber(d.lowestPriceSinceEntry)}`);
  }

  if (safeNumber(d.quantity, 0) > 0) {
    lines.push(`數量：${fmtNumber(d.quantity)}`);
  }

  if (typeof d.pnlAmount === "number" || typeof d.pnlPercent === "number") {
    lines.push(`損益：${fmtNumber(d.pnlAmount)} / ${fmtPct(d.pnlPercent)}`);
  }

  return lines;
}

function buildTrailingStopLines(d: StockOutput): string[] {
  const lines: string[] = [];

  const stopLossPrice = safeNumber(d.stopLossPrice ?? d.supportPrice, 0);
  const trailingStopPrice = safeNumber(d.trailingStopPrice, 0);

  if (stopLossPrice > 0) {
    lines.push(`停損：${fmtNumber(stopLossPrice)}`);
  } else {
    lines.push("停損：未定義");
  }

  if (d.trailingStopRule && String(d.trailingStopRule).trim()) {
    lines.push(String(d.trailingStopRule).trim());
  } else {
    lines.push(d.trailingStopActive ? "移動停損：已啟動" : "移動停損：未啟動");
  }

  if (trailingStopPrice > 0) {
    lines.push(`移動停損價：${fmtNumber(trailingStopPrice)}`);
  }

  return lines;
}

function buildReasonText(d: StockOutput): string {
  const parts = dedupeReasonParts([
    d.reason,
    d.point21Reason || buildBasePoint21Reason(d),
    d.supportReason || buildBaseSupportReason(d),
    d.riskReason,
  ]);

  if (parts.length > 0) {
    return parts.join("；");
  }

  return buildBasePoint21Reason(d);
}

export function buildStockOutput(
  code: string,
  quote: any,
  decision: any,
  position?: any,
  hasPosition?: boolean
): StockOutput {
  const resolvedHasPosition =
    typeof hasPosition === "boolean"
      ? hasPosition
      : !!position && String(position?.status || "").trim() === "OPEN";

  const base: StockOutput = {
    code: String(quote?.symbol || quote?.code || code),
    name: String(quote?.name || code),

    price: safeNumber(quote?.price, 0),
    change: safeNumber(quote?.change, 0),
    changePercent: safeNumber(quote?.changePercent ?? quote?.pct, 0),

    action: String(decision?.action || "觀望"),
    finalAction: String(decision?.finalAction || decision?.action || "觀望"),
    risk: String(decision?.risk || "中"),

    score: safeNumber(decision?.score, 0),
    finalScore: safeNumber(decision?.finalScore ?? decision?.score, 0),
    rawScore: safeNumber(decision?.rawScore ?? decision?.score, 0),
    breakout: safeNumber(decision?.breakout ?? decision?.breakoutScore, 0),

    point21Score: pickPoint21Score(decision),
    point21Value: pickPoint21Value(decision),
    simulatedPrice: pickSimulatedPrice(decision, quote),
    diffValue: pickDiffValue(decision),
    upperBound: pickUpperBound(decision, quote),
    point21State: String(decision?.point21State ?? decision?.point21?.point21State ?? ""),
    point21Reason: "",

    supportPrice: safeNumber(decision?.supportPrice, 0),
    supportDays: Math.max(0, Math.round(safeNumber(decision?.supportDays, 0))),
    structureBroken: Boolean(decision?.structureBroken),
    supportReason: "",

    marketState: String(decision?.marketState || ""),

    stopLossPrice: safeNumber(decision?.stopLossPrice, 0),
    trailingStopActive: Boolean(decision?.trailingStopActive),
    trailingStopPrice: safeNumber(decision?.trailingStopPrice, 0),
    trailingStopRule: String(decision?.trailingStopRule || ""),

    structureRisk: String(decision?.structureRisk || ""),
    timeValidation: String(decision?.timeValidation || ""),
    priceStopStatus: String(decision?.priceStopStatus || ""),
    canHold: typeof decision?.canHold === "boolean" ? decision.canHold : undefined,
    shouldExit: typeof decision?.shouldExit === "boolean" ? decision.shouldExit : undefined,
    riskReason: "",

    hasPosition: resolvedHasPosition,
    positionStatus: String(position?.status || ""),
    entryPrice: safeNumber(position?.entryPrice, 0),
    highestPriceSinceEntry: safeNumber(position?.highestPriceSinceEntry, 0),
    lowestPriceSinceEntry: safeNumber(position?.lowestPriceSinceEntry, 0),
    quantity: safeNumber(position?.quantity, 0),
    pnlAmount: safeNumber(position?.pnlAmount, 0),
    pnlPercent: safeNumber(position?.pnlPercent, 0),

    reason: "",
  };

  const point21Reason = dedupeReasonParts([
    decision?.point21Reason,
    buildBasePoint21Reason(base),
  ]).join("；");

  const supportReason = dedupeReasonParts([
    decision?.supportReason,
    buildBaseSupportReason(base),
  ]).join("；");

  const riskReason = dedupeReasonParts([
    decision?.riskReason,
  ]).join("；");

  const reason = dedupeReasonParts([
    decision?.reason,
    point21Reason,
    supportReason,
    riskReason,
  ]).join("；");

  return {
    ...base,
    point21Reason,
    supportReason,
    riskReason,
    reason,
  };
}

export function buildStockReplyText(d: StockOutput): string {
  const lines: string[] = [];

  lines.push(`📊 ${d.code} ${d.name}`);
  lines.push(`現價：${fmtNumber(d.price)}`);
  lines.push(`漲跌：${fmtNumber(d.change)}`);
  lines.push(`漲跌幅：${fmtPct(d.changePercent)}`);
  lines.push("");

  lines.push("📌 結構");
  lines.push(...buildSupportLines(d));
  lines.push("");

  lines.push("📌 決策");
  lines.push(`指令：${String(d.finalAction || d.action || "觀望")}`);
  lines.push(`風險：${String(d.risk || "中")}`);
  lines.push(`Score：${fmtNumber(d.finalScore ?? d.score)}`);
  lines.push("");

  lines.push("📌 持倉");
  lines.push(...buildPositionLines(d));
  lines.push("");

  lines.push("📌 風控");
  lines.push(...buildTrailingStopLines(d));
  const riskLines = buildRiskLines(d);
  if (riskLines.length > 0) {
    lines.push(...riskLines);
  }
  lines.push("");

  lines.push("📌 判斷");
  lines.push(buildReasonText(d));

  return lines.join("\n");
}

export function buildScannerText(rows: any[]): string {
  if (!Array.isArray(rows) || rows.length === 0) {
    return "🔥 今日機會股 TOP 5\n\n目前無有效資料標的";
  }

  const normalized: StockOutput[] = rows.map((row) => ({
    code: String(row?.code || ""),
    name: String(row?.name || ""),
    price: safeNumber(row?.price, 0),
    change: safeNumber(row?.change, 0),
    changePercent: safeNumber(row?.changePercent ?? row?.pct, 0),
    action: String(row?.finalAction || row?.action || "觀望"),
    finalAction: String(row?.finalAction || row?.action || "觀望"),
    risk: String(row?.risk || "中"),
    score: safeNumber(row?.finalScore ?? row?.score, 0),
    finalScore: safeNumber(row?.finalScore ?? row?.score, 0),
    point21Value: safeNumber(row?.point21Value, 0),
    supportPrice: safeNumber(row?.supportPrice, 0),
    supportDays: safeNumber(row?.supportDays, 0),
    structureBroken: Boolean(row?.structureBroken),
    hasPosition: Boolean(row?.hasPosition),
    reason: safeString(row?.reason),
  }));

  normalized.sort(
    (a, b) =>
      safeNumber(b.finalScore ?? b.score, 0) - safeNumber(a.finalScore ?? a.score, 0)
  );

  const lines: string[] = [];
  lines.push("🔥 今日機會股 TOP 5");
  lines.push("");

  normalized.slice(0, 5).forEach((row, index) => {
    lines.push(
      `${index + 1}. ${row.code} ${row.name} | Score:${fmtNumber(row.finalScore ?? row.score)}`
    );
    lines.push(
      `${String(row.finalAction || row.action || "觀望")} | 風險：${String(row.risk || "中")}`
    );
    lines.push(
      `漲跌幅：${fmtPct(row.changePercent)} | 21點：${Math.round(safeNumber(row.point21Value, 0))}/21`
    );
    lines.push(`持倉：${row.hasPosition ? "有" : "無"}`);

    if (safeNumber(row.supportPrice, 0) > 0) {
      const supportDays = Math.max(0, Math.round(safeNumber(row.supportDays, 0)));
      lines.push(
        `支撐：${fmtNumber(row.supportPrice)}${supportDays > 0 ? ` | 守穩 ${supportDays} 天` : ""}${row.structureBroken ? " | 已跌破" : ""}`
      );
    }

    lines.push("");
  });

  return lines.join("\n").trim();
}

export function buildAlertTestText(rows: any[]): string {
  if (!Array.isArray(rows) || rows.length === 0) {
    return "🔕 警報測試結果\n\n目前無有效資料標的";
  }

  const normalized = rows.map((row) => ({
    code: String(row?.code || ""),
    name: String(row?.name || ""),
    score: safeNumber(row?.finalScore ?? row?.score, 0),
    action: String(row?.finalAction || row?.action || "觀望"),
    changePercent: safeNumber(row?.changePercent ?? row?.pct, 0),
    risk: String(row?.risk || "中"),
    point21Value: safeNumber(row?.point21Value, 0),
    supportPrice: safeNumber(row?.supportPrice, 0),
    hasPosition: Boolean(row?.hasPosition),
  }));

  const alertRows = normalized.filter((x) => x.score >= 60);

  const lines: string[] = [];
  lines.push("🔕 警報測試結果");
  lines.push(`總筆數：${normalized.length}`);
  lines.push(`可警報：${alertRows.length}`);
  lines.push("");

  if (!alertRows.length) {
    lines.push("目前無符合警報條件標的");
    return lines.join("\n");
  }

  alertRows.forEach((x, i) => {
    lines.push(`${i + 1}. ${x.code} ${x.name} | Score:${fmtNumber(x.score)} | ${x.action}`);
    lines.push(
      `   漲跌幅：${fmtPct(x.changePercent)} | 風險：${x.risk} | 21點：${Math.round(x.point21Value)}/21`
    );
    lines.push(`   持倉：${x.hasPosition ? "有" : "無"}`);
    if (x.supportPrice > 0) {
      lines.push(`   支撐：${fmtNumber(x.supportPrice)}`);
    }
  });

  return lines.join("\n");
}
