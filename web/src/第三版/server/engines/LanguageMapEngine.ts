export type PointZone =
  | "WEAK"
  | "BUILDING"
  | "TRANSITION"
  | "STRONG";

export type HeatZone =
  | "COLD"
  | "NORMAL"
  | "WARMING"
  | "HOT";

export type DeltaTrend =
  | "DOWN"
  | "FLAT"
  | "UP"
  | "ACCELERATING";

export type MAState =
  | "BELOW_20MA"
  | "TOUCH_20MA"
  | "ABOVE_20MA"
  | "EXPANDING_ABOVE_20MA";

export type ResonanceState =
  | "NONE"
  | "WEAK"
  | "STRONG";

export type BreakoutState =
  | "NONE"
  | "TESTING"
  | "CONFIRMED"
  | "FAILED";

export type DecisionSignal =
  | "SKIP"
  | "WATCH"
  | "PREPARE"
  | "BUY"
  | "EXIT";

export interface LanguageMapInput {
  symbol: string;
  name?: string;
  hci: number;
  hti: number;
  score: number;

  pointZone: PointZone;
  heatZone: HeatZone;
  deltaTrend: DeltaTrend;
  maState: MAState;
  resonanceState: ResonanceState;
  breakoutState: BreakoutState;
  decision: DecisionSignal;
}

export interface LanguageMapResult {
  pointZoneText: string;
  heatZoneText: string;
  deltaTrendText: string;
  maStateText: string;
  resonanceText: string;
  breakoutText: string;
  decisionText: string;

  shortSummary: string;
  fullSummary: string;
  actionText: string;
  tags: string[];
}
// ===== Label → 中文對照表（固定，不准漂移） =====

const POINT_ZONE_TEXT: Record<PointZone, string> = {
  WEAK: "弱結構（0–10）",
  BUILDING: "建構區（11–14）",
  TRANSITION: "過渡區（15–17）",
  STRONG: "強勢循環（18–21）",
};

const HEAT_ZONE_TEXT: Record<HeatZone, string> = {
  COLD: "偏冷",
  NORMAL: "正常",
  WARMING: "升溫",
  HOT: "過熱",
};

const DELTA_TREND_TEXT: Record<DeltaTrend, string> = {
  DOWN: "降溫",
  FLAT: "走平",
  UP: "升溫",
  ACCELERATING: "加速升溫",
};

const MA_STATE_TEXT: Record<MAState, string> = {
  BELOW_20MA: "跌破20MA",
  TOUCH_20MA: "貼近20MA",
  ABOVE_20MA: "站上20MA",
  EXPANDING_ABOVE_20MA: "站上20MA並拉開",
};

const RESONANCE_TEXT: Record<ResonanceState, string> = {
  NONE: "無共振",
  WEAK: "弱共振",
  STRONG: "強共振",
};

const BREAKOUT_TEXT: Record<BreakoutState, string> = {
  NONE: "未突破",
  TESTING: "測試突破",
  CONFIRMED: "突破確認",
  FAILED: "假突破",
};

const DECISION_TEXT: Record<DecisionSignal, string> = {
  SKIP: "忽略",
  WATCH: "觀察",
  PREPARE: "準備",
  BUY: "進場",
  EXIT: "退出",
};

// ===== 工具函式 =====

function buildTags(input: LanguageMapInput): string[] {
  const tags: string[] = [];

  tags.push(POINT_ZONE_TEXT[input.pointZone]);
  tags.push(HEAT_ZONE_TEXT[input.heatZone]);
  tags.push(DELTA_TREND_TEXT[input.deltaTrend]);
  tags.push(MA_STATE_TEXT[input.maState]);
  tags.push(RESONANCE_TEXT[input.resonanceState]);
  tags.push(BREAKOUT_TEXT[input.breakoutState]);

  return tags;
}
// ===== 中文句子生成（完全由標籤組合，不允許自由發揮） =====

function buildShortSummary(input: LanguageMapInput): string {
  return `${input.symbol} 結構${POINT_ZONE_TEXT[input.pointZone]}，` +
    `溫度${HEAT_ZONE_TEXT[input.heatZone]}，` +
    `${MA_STATE_TEXT[input.maState]}。`;
}

function buildFullSummary(input: LanguageMapInput): string {
  return `${input.symbol} 結構進入${POINT_ZONE_TEXT[input.pointZone]}，` +
    `差值${DELTA_TREND_TEXT[input.deltaTrend]}，` +
    `${MA_STATE_TEXT[input.maState]}，` +
    `${RESONANCE_TEXT[input.resonanceState]}，` +
    `${BREAKOUT_TEXT[input.breakoutState]}。`;
}

// ===== 行動指令（Helmsman核心） =====

function buildActionText(input: LanguageMapInput): string {
  switch (input.decision) {
    case "BUY":
      return "✔ 可進場（條件完整成立）";

    case "PREPARE":
      return "✔ 等突破確認（禁止提前進場）";

    case "WATCH":
      return "✔ 僅觀察（尚未形成結構）";

    case "EXIT":
      return "✔ 退出 / 風險控管優先";

    default:
      return "✔ 無操作（跳過）";
  }
}
// ===== 主輸出（唯一出口） =====

export function mapToLanguage(input: LanguageMapInput): LanguageMapResult {
  const tags = buildTags(input);

  return {
    pointZoneText: POINT_ZONE_TEXT[input.pointZone],
    heatZoneText: HEAT_ZONE_TEXT[input.heatZone],
    deltaTrendText: DELTA_TREND_TEXT[input.deltaTrend],
    maStateText: MA_STATE_TEXT[input.maState],
    resonanceText: RESONANCE_TEXT[input.resonanceState],
    breakoutText: BREAKOUT_TEXT[input.breakoutState],
    decisionText: DECISION_TEXT[input.decision],

    shortSummary: buildShortSummary(input),
    fullSummary: buildFullSummary(input),
    actionText: buildActionText(input),
    tags,
  };
}
