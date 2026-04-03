import HELMSMAN_CONFIG from "../config/helmsmanConfig";
import runExitEngine, { type ExitEngineResult } from "./exitEngine";

export type AlertEngineInput = {
  code: string;
  name?: string;

  price: number;
  change?: number;
  changePercent?: number;

  action?: string;
  finalAction?: string;
  riskLevel?: string;
  score?: number;

  reason?: string;
  riskReason?: string;

  shouldExit?: boolean;
  canHold?: boolean;

  stopLossPrice?: number;
  trailingStopActive?: boolean;
  trailingStopPrice?: number;
  trailingStopRule?: string;

  priceStopStatus?: string;
  structureBroken?: boolean;

  supportPrice?: number;
  supportDays?: number;

  point21Value?: number;
  diffValue?: number;
  upperBound?: number;

  hasPosition?: boolean;

  // 往後市場總閘門可直接接，不影響現有呼叫
  marketState?: string;
};

export type AlertEventType =
  | "NONE"
  | "ATTACK_ENTRY"
  | "WATCH_ALERT"
  | "DEFENSE_ALERT"
  | "EXIT_ALERT";

export type AlertEngineResult = {
  triggered: boolean;
  eventType: AlertEventType;

  title: string;
  message: string;

  code: string;
  name: string;

  cooldownBlocked: boolean;
  dedupeBlocked: boolean;

  scoreBucket: string;
  dedupeKey: string;

  exitResult: ExitEngineResult | null;
};

type AlertMemory = {
  ts: number;
  dedupeKey: string;
  lastMessage: string;
};

const alertMemory = new Map<string, AlertMemory>();

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function fmtNumber(value: unknown): string {
  return String(safeNumber(value, 0));
}

function fmtPct(value: unknown): string {
  const n = safeNumber(value, 0);
  return `${n >= 0 ? "+" : ""}${n}%`;
}

function getScoreBucket(score: number): string {
  if (score >= 90) return "90+";
  if (score >= 80) return "80+";
  if (score >= 70) return "70+";
  if (score >= 60) return "60+";
  if (score >= 40) return "40+";
  return "<40";
}

function isMarketGateBlocked(input: AlertEngineInput, eventType: AlertEventType): boolean {
  const state = normalizeText(input.marketState);

  if (!state) return false;

  if ((state === "空頭延續" || state === "高波動震盪") && eventType === "ATTACK_ENTRY") {
    return true;
  }

  if (state === "空頭反彈" && eventType === "ATTACK_ENTRY") {
    return true;
  }

  return false;
}

function getEventType(input: AlertEngineInput, exitResult: ExitEngineResult | null): AlertEventType {
  const action = normalizeText(input.finalAction || input.action);
  const score = safeNumber(input.score, 0);

  if (exitResult?.triggered) {
    return "EXIT_ALERT";
  }

  if (action === "進攻" && score >= HELMSMAN_CONFIG.alert.minScoreToAlert) {
    return "ATTACK_ENTRY";
  }

  if (action === "觀望") {
    return "WATCH_ALERT";
  }

  if (action === "防守") {
    return "DEFENSE_ALERT";
  }

  return "NONE";
}

function isAllowedEvent(eventType: AlertEventType): boolean {
  if (eventType === "ATTACK_ENTRY") return HELMSMAN_CONFIG.alert.allowAttack;
  if (eventType === "WATCH_ALERT") return HELMSMAN_CONFIG.alert.allowWatch;
  if (eventType === "DEFENSE_ALERT") return HELMSMAN_CONFIG.alert.allowDefense;
  if (eventType === "EXIT_ALERT") return HELMSMAN_CONFIG.alert.allowExit;
  return false;
}

function buildDedupeKey(input: AlertEngineInput, eventType: AlertEventType): string {
  const code = normalizeText(input.code);
  const action = normalizeText(input.finalAction || input.action);
  const score = safeNumber(input.score, 0);
  const scoreBucket = getScoreBucket(score);

  const parts: string[] = [code, eventType];

  if (HELMSMAN_CONFIG.alert.dedupeByAction) {
    parts.push(action || "-");
  }

  if (HELMSMAN_CONFIG.alert.dedupeByScoreBucket) {
    parts.push(scoreBucket);
  }

  if (eventType === "EXIT_ALERT") {
    parts.push(normalizeText(input.priceStopStatus || ""));
    parts.push(Boolean(input.structureBroken) ? "broken" : "intact");
  }

  return parts.join("|");
}

function isCooldownBlocked(code: string, eventType: AlertEventType): boolean {
  if (eventType === "EXIT_ALERT") return false;

  const memory = alertMemory.get(code);
  if (!memory) return false;

  const now = Date.now();
  return now - memory.ts < HELMSMAN_CONFIG.alert.cooldownMs;
}

function isDedupeBlocked(code: string, dedupeKey: string, eventType: AlertEventType): boolean {
  if (eventType === "EXIT_ALERT") return false;

  const memory = alertMemory.get(code);
  if (!memory) return false;
  return memory.dedupeKey === dedupeKey;
}

function saveAlertMemory(code: string, dedupeKey: string, message: string): void {
  alertMemory.set(code, {
    ts: Date.now(),
    dedupeKey,
    lastMessage: message,
  });
}

function buildEntryMessage(input: AlertEngineInput): string {
  const code = normalizeText(input.code);
  const name = normalizeText(input.name || code);
  const price = safeNumber(input.price, 0);
  const change = safeNumber(input.change, 0);
  const changePercent = safeNumber(input.changePercent, 0);
  const score = safeNumber(input.score, 0);
  const riskLevel = normalizeText(input.riskLevel || "中");
  const point21Value = Math.round(safeNumber(input.point21Value, 0));
  const supportPrice = safeNumber(input.supportPrice, 0);
  const supportDays = Math.round(safeNumber(input.supportDays, 0));
  const diffValue = safeNumber(input.diffValue, 0);
  const upperBound = safeNumber(input.upperBound, 0);
  const marketState = normalizeText(input.marketState);

  const lines: string[] = [];
  lines.push("🚀 Helmsman 進攻警報");
  lines.push(`${code} ${name}`);
  lines.push(`現價：${fmtNumber(price)}`);
  lines.push(`漲跌：${fmtNumber(change)} / ${fmtPct(changePercent)}`);
  lines.push(`指令：進攻`);
  lines.push(`風險：${riskLevel}`);
  lines.push(`Score：${fmtNumber(score)}`);
  lines.push(`21點：${point21Value}/21`);

  if (supportPrice > 0) {
    lines.push(`支撐：${fmtNumber(supportPrice)}${supportDays > 0 ? `｜守穩 ${supportDays} 天` : ""}`);
  }

  if (diffValue > 0 || upperBound > 0) {
    lines.push(`差值：${fmtNumber(diffValue)}｜上緣：${fmtNumber(upperBound)}`);
  }

  if (marketState) {
    lines.push(`市場：${marketState}`);
  }

  if (normalizeText(input.reason)) {
    lines.push(`判斷：${normalizeText(input.reason)}`);
  }

  return lines.join("\n");
}

function buildDefenseMessage(input: AlertEngineInput): string {
  const code = normalizeText(input.code);
  const name = normalizeText(input.name || code);
  const price = safeNumber(input.price, 0);
  const score = safeNumber(input.score, 0);
  const riskLevel = normalizeText(input.riskLevel || "高");
  const reason = normalizeText(input.reason || input.riskReason || "風險升高");
  const marketState = normalizeText(input.marketState);

  const lines: string[] = [
    "🛡️ Helmsman 防守警報",
    `${code} ${name}`,
    `現價：${fmtNumber(price)}`,
    `指令：防守`,
    `風險：${riskLevel}`,
    `Score：${fmtNumber(score)}`,
  ];

  if (marketState) {
    lines.push(`市場：${marketState}`);
  }

  lines.push(`判斷：${reason}`);

  return lines.join("\n");
}

function buildWatchMessage(input: AlertEngineInput): string {
  const code = normalizeText(input.code);
  const name = normalizeText(input.name || code);
  const price = safeNumber(input.price, 0);
  const score = safeNumber(input.score, 0);
  const reason = normalizeText(input.reason || "觀望中");
  const marketState = normalizeText(input.marketState);

  const lines: string[] = [
    "👀 Helmsman 觀望提醒",
    `${code} ${name}`,
    `現價：${fmtNumber(price)}`,
    `指令：觀望`,
    `Score：${fmtNumber(score)}`,
  ];

  if (marketState) {
    lines.push(`市場：${marketState}`);
  }

  lines.push(`判斷：${reason}`);

  return lines.join("\n");
}

function buildExitMessage(input: AlertEngineInput, exitResult: ExitEngineResult): string {
  const code = normalizeText(input.code);
  const name = normalizeText(input.name || code);
  const price = safeNumber(input.price, 0);
  const trailingStopPrice = safeNumber(input.trailingStopPrice, 0);
  const stopLossPrice = safeNumber(input.stopLossPrice, 0);
  const marketState = normalizeText(input.marketState);

  const lines: string[] = [];
  lines.push("⛔ Helmsman 出場警報");
  lines.push(`${code} ${name}`);
  lines.push(`現價：${fmtNumber(price)}`);
  lines.push(`出場類型：${exitResult.exitType}`);
  lines.push(`原因：${exitResult.exitReason}`);

  if (marketState) {
    lines.push(`市場：${marketState}`);
  }

  if (trailingStopPrice > 0) {
    lines.push(`移動停損：${fmtNumber(trailingStopPrice)}`);
  }

  if (stopLossPrice > 0) {
    lines.push(`停損：${fmtNumber(stopLossPrice)}`);
  }

  if (normalizeText(input.riskReason)) {
    lines.push(`風控：${normalizeText(input.riskReason)}`);
  }

  const after = exitResult.positionAfterExit;
  if (after) {
    lines.push(`平倉狀態：${after.status}`);
    lines.push(`出場價：${fmtNumber(after.exitPrice ?? price)}`);
    lines.push(`損益：${fmtNumber(after.pnlAmount)} / ${fmtPct(after.pnlPercent)}`);
  }

  return lines.join("\n");
}

export function runAlertEngine(input: AlertEngineInput): AlertEngineResult {
  const code = normalizeText(input.code);
  const name = normalizeText(input.name || code);
  const score = safeNumber(input.score, 0);

  if (!HELMSMAN_CONFIG.alert.enabled || !code) {
    return {
      triggered: false,
      eventType: "NONE",
      title: "",
      message: "",
      code,
      name,
      cooldownBlocked: false,
      dedupeBlocked: false,
      scoreBucket: getScoreBucket(score),
      dedupeKey: "",
      exitResult: null,
    };
  }

  const exitResult =
    input.hasPosition
      ? runExitEngine({
          code,
          currentPrice: safeNumber(input.price, 0),
          shouldExit: input.shouldExit,
          canHold: input.canHold,
          stopLossPrice: input.stopLossPrice,
          trailingStopActive: input.trailingStopActive,
          trailingStopPrice: input.trailingStopPrice,
          priceStopStatus: input.priceStopStatus,
          structureBroken: input.structureBroken,
          action: input.finalAction || input.action,
          riskLevel: input.riskLevel,
          riskReason: input.riskReason,
          marketState: input.marketState,
        })
      : null;

  const eventType = getEventType(input, exitResult);
  const scoreBucket = getScoreBucket(score);
  const dedupeKey = buildDedupeKey(input, eventType);

  if (eventType === "NONE" || !isAllowedEvent(eventType) || isMarketGateBlocked(input, eventType)) {
    return {
      triggered: false,
      eventType: "NONE",
      title: "",
      message: "",
      code,
      name,
      cooldownBlocked: false,
      dedupeBlocked: false,
      scoreBucket,
      dedupeKey,
      exitResult,
    };
  }

  if (eventType === "ATTACK_ENTRY" && score < HELMSMAN_CONFIG.alert.minScoreToAlert) {
    return {
      triggered: false,
      eventType,
      title: "",
      message: "",
      code,
      name,
      cooldownBlocked: false,
      dedupeBlocked: false,
      scoreBucket,
      dedupeKey,
      exitResult,
    };
  }

  const cooldownBlocked = isCooldownBlocked(code, eventType);
  const dedupeBlocked = isDedupeBlocked(code, dedupeKey, eventType);

  if (cooldownBlocked || dedupeBlocked) {
    return {
      triggered: false,
      eventType,
      title: "",
      message: "",
      code,
      name,
      cooldownBlocked,
      dedupeBlocked,
      scoreBucket,
      dedupeKey,
      exitResult,
    };
  }

  let title = "";
  let message = "";

  if (eventType === "ATTACK_ENTRY") {
    title = "進攻警報";
    message = buildEntryMessage(input);
  } else if (eventType === "DEFENSE_ALERT") {
    title = "防守警報";
    message = buildDefenseMessage(input);
  } else if (eventType === "WATCH_ALERT") {
    title = "觀望提醒";
    message = buildWatchMessage(input);
  } else if (eventType === "EXIT_ALERT" && exitResult) {
    title = "出場警報";
    message = buildExitMessage(input, exitResult);
  }

  if (!message.trim()) {
    return {
      triggered: false,
      eventType: "NONE",
      title: "",
      message: "",
      code,
      name,
      cooldownBlocked: false,
      dedupeBlocked: false,
      scoreBucket,
      dedupeKey,
      exitResult,
    };
  }

  saveAlertMemory(code, dedupeKey, message);

  return {
    triggered: true,
    eventType,
    title,
    message,
    code,
    name,
    cooldownBlocked: false,
    dedupeBlocked: false,
    scoreBucket,
    dedupeKey,
    exitResult,
  };
}

export function clearAlertMemory(code?: string): void {
  const normalizedCode = normalizeText(code);

  if (!normalizedCode) {
    alertMemory.clear();
    return;
  }

  alertMemory.delete(normalizedCode);
}

export function getAlertMemory() {
  return Array.from(alertMemory.entries()).map(([code, value]) => ({
    code,
    ts: value.ts,
    dedupeKey: value.dedupeKey,
    lastMessage: value.lastMessage,
  }));
}

export default runAlertEngine;
