export type HelmsmanConfig = {
  system: {
    name: string;
    version: string;
    level: string;
    mode: string;
  };

  point21: {
    maxPoint: number;
    strongThreshold: number;
    neutralThreshold: number;
    strongScoreMin: number;
    neutralScoreMin: number;
    teacherPriorityCodes: string[];
  };

  support: {
    lookbackBars: number;
    minBarsRequired: number;
    supportPercentile: number;
    tolerancePct: number;
    validSupportDays: number;
    structureBreakPct: number;
  };

  risk: {
    defaultStopLossPct: number;
    structureBrokenStopLossPct: number;
    trailingEnabledDefault: boolean;
    trailingStrongPoint21: number;
    trailingNeutralPoint21: number;
    trailingStrongPct: number;
    trailingNeutralPct: number;
    trailingWeakPct: number;
  };

  decision: {
    attackPoint21Threshold: number;
    watchPoint21Threshold: number;
    hardDefenseDropPct: number;
    defaultMarketState: "攻擊" | "觀望" | "防守" | "修正";
  };

  alert: {
    enabled: boolean;
    minScoreToAlert: number;
    cooldownMs: number;
    dedupeByAction: boolean;
    dedupeByScoreBucket: boolean;
    allowAttack: boolean;
    allowWatch: boolean;
    allowDefense: boolean;
    allowExit: boolean;
  };

  autoSupport: {
    enabled: boolean;
    intervalMs: number;
    defaultSymbols: string[];
  };

  scanner: {
    topN: number;
    minScoreToShow: number;
  };
};

export const HELMSMAN_CONFIG: HelmsmanConfig = {
  system: {
    name: "Helmsman",
    version: "6.0.0-beta",
    level: "5.9 → 6",
    mode: "實戰收斂",
  },

  point21: {
    maxPoint: 21,
    strongThreshold: 18,
    neutralThreshold: 7,
    strongScoreMin: 70,
    neutralScoreMin: 30,
    teacherPriorityCodes: ["2308", "2317", "2330", "2454", "3034"],
  },

  support: {
    lookbackBars: 21,
    minBarsRequired: 5,
    supportPercentile: 0.25,
    tolerancePct: 0.015,
    validSupportDays: 3,
    structureBreakPct: 0.01,
  },

  risk: {
    defaultStopLossPct: 0.08,
    structureBrokenStopLossPct: 0.03,
    trailingEnabledDefault: false,
    trailingStrongPoint21: 18,
    trailingNeutralPoint21: 14,
    trailingStrongPct: 0.06,
    trailingNeutralPct: 0.07,
    trailingWeakPct: 0.08,
  },

  decision: {
    attackPoint21Threshold: 18,
    watchPoint21Threshold: 7,
    hardDefenseDropPct: -5,
    defaultMarketState: "觀望",
  },

  alert: {
    enabled: true,
    minScoreToAlert: 60,
    cooldownMs: 30 * 60 * 1000,
    dedupeByAction: true,
    dedupeByScoreBucket: true,
    allowAttack: true,
    allowWatch: false,
    allowDefense: true,
    allowExit: true,
  },

  autoSupport: {
    enabled: true,
    intervalMs: 5 * 60 * 1000,
    defaultSymbols: ["2308", "2317", "2330", "2454", "3034"],
  },

  scanner: {
    topN: 5,
    minScoreToShow: 0,
  },
};

export default HELMSMAN_CONFIG;
