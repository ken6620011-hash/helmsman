import HELMSMAN_CONFIG from "../config/helmsmanConfig";
import runFusion from "./fusionEngine";
import { SCAN_SYMBOLS } from "./marketDataEngine";

export type ScannerRow = {
  code: string;
  name: string;

  price: number;
  change: number;
  pct: number;
  changePercent: number;
  volume: number;
  sector: string;

  action: string;
  finalAction: string;
  risk: "低" | "中" | "高";

  score: number;
  finalScore: number;
  rawScore: number;
  breakout: number;

  point21Score: number;
  point21Value: number;
  simulatedPrice: number;
  diffValue: number;
  upperBound: number;
  point21State: string;
  point21Reason: string;

  supportPrice: number;
  supportDays: number;
  structureBroken: boolean;
  supportReason: string;

  stopLossPrice: number;
  trailingStopActive: boolean;
  trailingStopPrice: number;
  trailingStopRule: string;

  structureRisk: string;
  timeValidation: string;
  priceStopStatus: string;
  canHold: boolean;
  shouldExit: boolean;
  riskReason: string;

  marketState: string;
  reason: string;

  allowNewPosition: boolean;
  suggestedPositionSize: number;
  suggestedPositionValue: number;
  maxExposure: number;
  exposureStatus: "OK" | "LIMIT_REACHED" | "BLOCKED";
  exposureMessage: string;

  hasPosition: boolean;
};

function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeText(v: unknown, fallback = ""): string {
  const text = String(v ?? "").trim();
  return text || fallback;
}

function normalizeRisk(v: unknown): "低" | "中" | "高" {
  const text = safeText(v, "中");
  if (text === "低" || text === "中" || text === "高") return text;
  return "中";
}

function isValidQuote(q: any): boolean {
  return Boolean(q && safeNumber(q?.price, 0) > 0 && !q?.error);
}

function toScannerRow(fusion: Awaited<ReturnType<typeof runFusion>>): ScannerRow {
  const q: any = fusion?.quote ?? {};
  const m: any = fusion?.model ?? {};

  const action = safeText(m?.finalAction || m?.action, "防守");
  const baseAction = safeText(m?.action, action);

  const score = safeNumber(m?.finalScore, safeNumber(m?.score, 0));

  return {
    code: safeText(q?.symbol),
    name: safeText(q?.name, safeText(q?.symbol, "未知")),

    price: safeNumber(q?.price, 0),
    change: safeNumber(q?.change, 0),
    pct: safeNumber(q?.pct, safeNumber(q?.changePercent, 0)),
    changePercent: safeNumber(q?.pct, safeNumber(q?.changePercent, 0)),
    volume: safeNumber(q?.volume, 0),
    sector: safeText(q?.sector, "未知"),

    action: action,
    finalAction: action,
    risk: normalizeRisk(m?.risk),

    score,
    finalScore: score,
    rawScore: safeNumber(m?.rawScore, safeNumber(m?.score, score)),
    breakout: safeNumber(m?.breakout, 0),

    point21Score: safeNumber(m?.point21Score, 0),
    point21Value: Math.round(safeNumber(m?.point21Value, 0)),
    simulatedPrice: safeNumber(m?.simulatedPrice, 0),
    diffValue: safeNumber(m?.diffValue, 0),
    upperBound: safeNumber(m?.upperBound, 0),
    point21State: safeText(m?.point21State),
    point21Reason: safeText(m?.point21Reason),

    supportPrice: safeNumber(m?.supportPrice, 0),
    supportDays: Math.round(safeNumber(m?.supportDays, 0)),
    structureBroken: Boolean(m?.structureBroken),
    supportReason: safeText(m?.supportReason),

    stopLossPrice: safeNumber(m?.stopLossPrice, 0),
    trailingStopActive: Boolean(m?.trailingStopActive),
    trailingStopPrice: safeNumber(m?.trailingStopPrice, 0),
    trailingStopRule: safeText(m?.trailingStopRule),

    structureRisk: safeText(m?.structureRisk),
    timeValidation: safeText(m?.timeValidation),
    priceStopStatus: safeText(m?.priceStopStatus),
    canHold: Boolean(m?.canHold),
    shouldExit: Boolean(m?.shouldExit),
    riskReason: safeText(m?.riskReason),

    marketState: safeText(m?.marketState, safeText(fusion?.market?.label, "")),
    reason: safeText(m?.reason, baseAction),

    allowNewPosition: Boolean(m?.allowNewPosition),
    suggestedPositionSize: safeNumber(m?.suggestedPositionSize, 0),
    suggestedPositionValue: safeNumber(m?.suggestedPositionValue, 0),
    maxExposure: safeNumber(m?.maxExposure, 0),
    exposureStatus:
      m?.exposureStatus === "LIMIT_REACHED" || m?.exposureStatus === "BLOCKED"
        ? m.exposureStatus
        : "OK",
    exposureMessage: safeText(m?.exposureMessage),

    hasPosition: Boolean(fusion?.hasPosition),
  };
}

function shouldIncludeRow(row: ScannerRow): boolean {
  if (row.price <= 0) return false;
  if (row.finalScore < HELMSMAN_CONFIG.scanner.minScoreToDisplay) return false;
  return true;
}

function sortRows(a: ScannerRow, b: ScannerRow): number {
  const scoreA = safeNumber(a?.finalScore, safeNumber(a?.score, 0));
  const scoreB = safeNumber(b?.finalScore, safeNumber(b?.score, 0));

  if (scoreB !== scoreA) return scoreB - scoreA;

  const pctA = safeNumber(a?.pct, 0);
  const pctB = safeNumber(b?.pct, 0);

  if (pctB !== pctA) return pctB - pctA;

  const p21A = safeNumber(a?.point21Value, 0);
  const p21B = safeNumber(b?.point21Value, 0);

  return p21B - p21A;
}

export async function runScanner(): Promise<ScannerRow[]> {
  const rows: ScannerRow[] = [];

  for (const code of SCAN_SYMBOLS) {
    try {
      const fusion = await runFusion({ code });

      if (!isValidQuote(fusion?.quote)) continue;

      const row = toScannerRow(fusion);

      if (!shouldIncludeRow(row)) continue;

      rows.push(row);
    } catch (error) {
      console.log("scanner error:", code, error);
    }
  }

  rows.sort(sortRows);

  const topN = Math.max(1, Number(HELMSMAN_CONFIG.scanner.topN || 5));
  return rows.slice(0, topN);
}

export default runScanner;
