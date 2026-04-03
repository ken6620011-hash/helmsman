import HELMSMAN_SPEC, {
  getMarketExposurePolicy,
  normalizeMarketState,
} from "./helmsmanSpec";

// ==========================================================
// HELMSMAN CONFIG
// 執行層設定 / 可調參數層
// 與 helmsmanSpec.ts 的差別：
// - spec = 不可破壞規格
// - config = 執行參數 / 門檻 / 預設值
// ==========================================================

export const HELMSMAN_CONFIG = {
  system: {
    name: "Helmsman",
    alias: "舵手",
    version: "1.0.0",
    mode: "production",
    webhookVersion: HELMSMAN_SPEC.outputPolicy.webhookVersion,
    timezone: "Asia/Taipei",
    locale: "zh-TW",
  },

  // ==========================================================
  // 市場資料 / KBar
  // ==========================================================
  market: {
    quoteTimeoutMs: 10000,
    kbarTimeoutMs: 15000,
    retryCount: 1,
    batchDelayMs: 0,
    maxSymbolsPerBatch: 50,
  },

  kbar: {
    defaultDays: 89,
    supportDays: 21,
    marketStateDays: 21,
  },

  // ==========================================================
  // Point21
  // ==========================================================
  point21: {
    maxScore: 21,
    strongThreshold: 18,
    neutralThreshold: 8,
    weakThreshold: 0,

    // 平台 / 起爆的基礎控制
    breakoutStrongThreshold: 70,
    breakoutNeutralThreshold: 40,

    // 顯示 / 計算保留位
    roundDigits: 2,
  },

  // ==========================================================
  // 支撐系統
  // ==========================================================
  support: {
    lookbackBars: 21,
    minHoldDaysForValidation: 3,
    strongHoldDays: 8,
    maxSupportCandidates: 3,
    requirePositivePrice: true,
  },

  autoSupport: {
    enabled: true,
    intervalMs: 5 * 60 * 1000,
    kbarDays: 21,
    batchSize: 20,
  },

  // ==========================================================
  // 市場狀態
  // ==========================================================
  marketState: {
    labels: ["攻擊", "輪動", "防守", "修正"] as const,

    // 若未來接真正大盤資料，可調這些門檻
    attack: {
      minScore: 72,
      minBreakout: 70,
    },

    rotation: {
      minScore: 45,
      minBreakout: 40,
    },

    defense: {
      maxScore: 40,
    },

    correction: {
      structureBrokenDominates: true,
      stopTriggeredDominates: true,
    },

    fallback: "防守",
  },

  // ==========================================================
  // 決策系統
  // ==========================================================
  decision: {
    scoring: {
      min: 0,
      max: 100,
      roundDigits: 2,
    },

    actionThresholds: {
      attackPoint21: 18,
      watchPoint21: 8,
    },

    reason: {
      joiner: "；",
      semanticDedupe: true,
      maxReasonParts: 5,
    },

    marketGate: {
      enabled: true,
      correctionForceDefense: true,
      defenseDowngradeAttackToWatch: true,
      rotationDowngradeHighRiskAttackToWatch: true,
      shouldExitForceDefense: true,
    },

    fallbackAction: "防守",
    fallbackRisk: "中",
  },

  // ==========================================================
  // 風控系統
  // ==========================================================
  risk: {
    stopLoss: {
      enabled: true,
      useSupportAsPrimaryStop: true,
      fallbackPercent: 0.08, // 若無支撐時，預設備援停損 8%
    },

    trailingStop: {
      enabled: true,
      activationRequiresPosition: true,
      activationMinProfitPercent: 3,
      fallbackDrawdownPercent: 0.05,
    },

    holdValidation: {
      minSupportDays: 3,
      strongSupportDays: 8,
      structureBrokenDominates: true,
    },

    riskLevel: {
      highWhenStructureBroken: true,
      highWhenStopTriggered: true,
      mediumDefault: true,
    },
  },

  // ==========================================================
  // 倉位系統
  // ==========================================================
  position: {
    side: "LONG" as const,
    minQuantity: 1,
    roundDigits: 2,

    persistence: {
      enabled: true,
      file: HELMSMAN_SPEC.persistence.positionStoreFile,
      version: HELMSMAN_SPEC.persistence.version,
      prettyPrint: true,
      autoSave: true,
    },

    exposure: {
      defaultAccountCapital: 0,
      fallbackMarketState: "防守",
      policies: {
        攻擊: getMarketExposurePolicy("攻擊"),
        輪動: getMarketExposurePolicy("輪動"),
        防守: getMarketExposurePolicy("防守"),
        修正: getMarketExposurePolicy("修正"),
      },
    },
  },

  // ==========================================================
  // 出場系統
  // ==========================================================
  exit: {
    enabled: true,

    priority: [...HELMSMAN_SPEC.exitPolicy.immutablePriority],

    structureBreak: {
      enabled: true,
      immediateExit: true,
    },

    stopLoss: {
      enabled: true,
      useLessThanOrEqual: true,
    },

    trailingStop: {
      enabled: true,
      useLessThanOrEqual: true,
    },

    riskExit: {
      enabled: true,
      triggerWhenShouldExit: true,
      triggerWhenCannotHold: true,
    },

    invalidInputReturnsNone: true,
    noPositionReturnsNone: true,
  },

  // ==========================================================
  // Alert 系統
  // ==========================================================
  alert: {
    enabled: true,

    allowAttack: true,
    allowWatch: true,
    allowDefense: true,
    allowExit: true,

    minScoreToAlert: 60,
    cooldownMs: 5 * 60 * 1000,

    dedupeByAction: true,
    dedupeByScoreBucket: true,

    maxPushCountPerRun: 5,
    maxWebhookInlineAlerts: 3,

    // 出場警報直接突破 cooldown / dedupe
    exitAlertBypassCooldown: true,
    exitAlertBypassDedupe: true,

    titleMap: {
      ATTACK_ENTRY: "進攻警報",
      WATCH_ALERT: "觀望提醒",
      DEFENSE_ALERT: "防守警報",
      EXIT_ALERT: "出場警報",
      NONE: "",
    },

    marketGate: {
      // 目前保留舊規格相容
      blockAttackStates: ["空頭延續", "高波動震盪", "空頭反彈"],
    },
  },

  autoAlert: {
    enabled: false,
    intervalMs: 5 * 60 * 1000,
    scanOpenPositionsOnly: true,
    maxMessagesPerPush: 5,
  },

  // ==========================================================
  // Scanner
  // ==========================================================
  scanner: {
    topN: 5,
    minScoreToDisplay: 0,
    sortBy: "finalScore",
    includeHasPosition: true,
    includeMarketState: true,
    includeSupport: true,
    includeExposure: true,
  },

  // ==========================================================
  // Output / LINE / Webhook
  // ==========================================================
  output: {
    webhookPrefix: "[WEBHOOK-V2]",
    joinWithBlankLine: true,
    includeSections: {
      market: true,
      structure: true,
      decision: true,
      exposure: true,
      position: true,
      risk: true,
      reason: true,
    },
  },

  line: {
    replyTimeoutMs: 10000,
    pushTimeoutMs: 15000,
    maxTextLengthSoftLimit: 4500,
    maskTokenInLog: true,
    logReplyPayload: true,
  },

  webhook: {
    enabled: true,
    acceptedCommands: ["查", "掃描", "持倉", "position", "help", "幫助", "指令"],
    stockQueryPrefixes: ["查"],
    scannerCommand: "掃描",
    holdingCommands: ["持倉", "position"],
    helpCommands: ["help", "幫助", "指令"],
  },

  // ==========================================================
  // API / Server
  // ==========================================================
  api: {
    port: 3000,
    jsonBodyLimit: "1mb",
    defaultOkField: true,
    includeStatusMessage: true,
  },

  server: {
    boot: {
      runAutoSupportOnStart: true,
      runAutoAlertOnStart: true,
    },
    logging: {
      logConfigOnBoot: true,
      logErrors: true,
      logRouteErrors: true,
    },
  },

  // ==========================================================
  // Render / Cloud / Deploy
  // ==========================================================
  deploy: {
    platform: "Render",
    requirePersistentDiskForPositionStore: true,
    cloudFirst: true,
  },

  // ==========================================================
  // 工程軍令
  // ==========================================================
  engineering: {
    fullFileOverwriteOnly: true,
    noPatchStyle: true,
    noInlineHotfix: true,
    antiDrift: true,
    specFirst: true,
  },
} as const;

// ==========================================================
// TYPES
// ==========================================================

export type HelmsmanConfig = typeof HELMSMAN_CONFIG;

// ==========================================================
// HELPERS
// ==========================================================

export function getConfigMarketState(value: unknown) {
  const state = normalizeMarketState(value);
  return HELMSMAN_CONFIG.position.exposure.policies[state];
}

export function getConfigMaxExposure(value: unknown): number {
  return getConfigMarketState(value).maxExposure;
}

export function getConfigSuggestedPositionSize(value: unknown): number {
  return getConfigMarketState(value).suggestedPositionSize;
}

export function isConfigNewPositionAllowed(value: unknown): boolean {
  return getConfigMarketState(value).allowNewPosition;
}

export function isAttackAlertAllowed(score: number): boolean {
  return (
    HELMSMAN_CONFIG.alert.enabled &&
    HELMSMAN_CONFIG.alert.allowAttack &&
    Number(score) >= HELMSMAN_CONFIG.alert.minScoreToAlert
  );
}

export default HELMSMAN_CONFIG;
