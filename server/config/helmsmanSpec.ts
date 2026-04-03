// ==========================================================
// HELMSMAN SPEC
// 不可破壞核心規格 / 封頂版
// ==========================================================

export const HELMSMAN_SPEC = {
  meta: {
    systemName: "Helmsman",
    systemAlias: "舵手",
    specName: "HELMSMAN_SPEC",
    specVersion: "1.0.0",
    maturityLevel: "Level 8.9 → Level 9",
    status: "主鏈閉環完成，生態池完成，進入封頂後整備期",
    description: "AI Trading Operating System",
    lastUpdatedPolicy: "manual",
  },

  identity: {
    purpose: "不是預測市場，是管理狀態",
    principles: [
      "不是找標的，是控制風險",
      "不是單次交易，是持續系統",
      "Engine 是唯一決策來源",
      "規格先於敘事",
      "系統先於個別模組",
      "不允許漂移",
    ],
    language: "zh-TW",
    outputMode: "WEBHOOK-V2",
  },

  // ==========================================================
  // 🧱 不可破壞架構
  // ==========================================================
  architecture: {
    canonicalLayers: ["Market", "Quant", "Engine", "API", "Frontend"],

    layerDefinition: {
      Market: "行情資料與外部市場資料來源",
      Quant: "指標、模型、結構、支撐、評分",
      Engine: "唯一決策層，負責融合、判斷、風控、持倉、出場、警報",
      API: "路由與對外接口層，只做轉接，不做決策",
      Frontend: "顯示層，只負責展示，不做決策",
    },

    immutableRules: {
      engineIsOnlyDecisionSource: true,
      apiRoutesOnly: true,
      frontendDisplayOnly: true,
      noCrossLayerLogicLeak: true,
      noDecisionInRoute: true,
      noDecisionInFrontend: true,
    },
  },

  // ==========================================================
  // 🔗 主鏈 / 分鏈 / 生態池
  // ==========================================================
  topology: {
    mainChain: [
      "marketDataEngine.getQuote",
      "point21Engine",
      "supportEngine",
      "marketStateEngine",
      "fusionEngine",
      "decisionEngine",
      "positionEngine",
      "exitEngine",
      "alertEngine",
      "outputService",
      "webhookRoutes / stockRoutes / scannerRoutes",
      "LINE / API / Frontend",
    ],

    subChains: [
      "autoSupportEngine",
      "autoAlertEngine",
      "position persistence",
      "LINE webhook loop",
      "scanner loop",
      "single stock query loop",
      "holdings query loop",
    ],

    ecosystemPool: [
      "support cache",
      "scanner",
      "position",
      "exit",
      "alert",
      "output formatting",
      "LINE reply",
      "Render deploy",
      "JSON persistence",
    ],
  },

  // ==========================================================
  // 🧠 核心引擎治理
  // ==========================================================
  engineGovernance: {
    sourceOfTruth: {
      decision: "decisionEngine",
      marketState: "marketStateEngine",
      support: "supportEngine",
      position: "positionEngine",
      exit: "exitEngine",
      alert: "alertEngine",
      fusion: "fusionEngine",
    },

    engineResponsibilities: {
      marketDataEngine: [
        "取得 quote",
        "取得 KBars",
        "不做任何決策",
      ],
      point21Engine: [
        "計算 point21Value / point21Score",
        "計算 simulatedPrice / diffValue / upperBound",
        "輸出 point21 狀態與原因",
      ],
      supportEngine: [
        "計算支撐價",
        "計算守穩天數",
        "判定 structureBroken",
      ],
      marketStateEngine: [
        "計算市場狀態",
        "輸出攻擊 / 輪動 / 防守 / 修正",
        "作為全系統最高層級市場閘門",
      ],
      fusionEngine: [
        "整合 quote / bars / point21 / support / marketState / position",
        "把資料送入 decisionEngine",
        "不自行決策",
      ],
      decisionEngine: [
        "唯一決策來源",
        "輸出 action / finalAction / score / risk / reason",
        "結合風控與市場閘門",
        "結合倉位政策",
      ],
      positionEngine: [
        "開倉 / 更新 / 平倉",
        "維護持倉狀態",
        "維護最高最低價",
        "持久化 positions.json",
        "提供倉位政策計算",
      ],
      exitEngine: [
        "依結構 / 停損 / 移動停損 / 風控觸發出場",
        "觸發 closePosition",
      ],
      alertEngine: [
        "決定是否發出進攻 / 觀望 / 防守 / 出場警報",
        "處理 cooldown / dedupe",
        "不得成為決策來源",
      ],
      autoSupportEngine: [
        "定時更新支撐資料",
      ],
      autoAlertEngine: [
        "定時巡檢持倉",
        "只處理自動出場 / 警報推送",
      ],
    },
  },

  // ==========================================================
  // 📦 核心資料欄位規格
  // ==========================================================
  contracts: {
    quote: {
      required: ["symbol", "name", "price"],
      optional: ["change", "pct", "volume"],
    },

    decisionCore: {
      required: [
        "score",
        "finalScore",
        "action",
        "finalAction",
        "risk",
        "marketState",
        "reason",
      ],
      structural: [
        "supportPrice",
        "supportDays",
        "structureBroken",
      ],
      point21: [
        "point21Score",
        "point21Value",
        "simulatedPrice",
        "diffValue",
        "upperBound",
        "point21State",
        "point21Reason",
      ],
      risk: [
        "stopLossPrice",
        "trailingStopActive",
        "trailingStopPrice",
        "trailingStopRule",
        "structureRisk",
        "timeValidation",
        "priceStopStatus",
        "canHold",
        "shouldExit",
        "riskReason",
      ],
      exposure: [
        "allowNewPosition",
        "suggestedPositionSize",
        "suggestedPositionValue",
        "maxExposure",
        "exposureStatus",
        "exposureMessage",
      ],
    },

    position: {
      recordFields: [
        "code",
        "name",
        "side",
        "status",
        "entryPrice",
        "quantity",
        "highestPriceSinceEntry",
        "lowestPriceSinceEntry",
        "openedAt",
        "updatedAt",
        "closedAt",
        "exitPrice",
        "exitReason",
        "notes",
      ],
      snapshotFields: [
        "code",
        "name",
        "status",
        "entryPrice",
        "currentPrice",
        "quantity",
        "highestPriceSinceEntry",
        "lowestPriceSinceEntry",
        "pnlAmount",
        "pnlPercent",
        "openedAt",
        "updatedAt",
        "closedAt",
        "exitPrice",
        "exitReason",
        "notes",
      ],
    },

    output: {
      stockOutputFields: [
        "code",
        "name",
        "price",
        "change",
        "changePercent",
        "action",
        "finalAction",
        "risk",
        "score",
        "finalScore",
        "supportPrice",
        "supportDays",
        "structureBroken",
        "marketState",
        "stopLossPrice",
        "trailingStopActive",
        "trailingStopPrice",
        "priceStopStatus",
        "canHold",
        "shouldExit",
        "hasPosition",
        "positionStatus",
        "entryPrice",
        "highestPriceSinceEntry",
        "lowestPriceSinceEntry",
        "quantity",
        "pnlAmount",
        "pnlPercent",
        "allowNewPosition",
        "suggestedPositionSize",
        "maxExposure",
        "exposureStatus",
        "exposureMessage",
        "reason",
      ],
    },
  },

  // ==========================================================
  // 📈 評分 / 決策 / 風控規則
  // ==========================================================
  decisionPolicy: {
    point21ToScore: {
      formula: "score = round2((clamp(point21Value, 0, 21) / 21) * 100)",
      min: 0,
      max: 100,
    },

    baseAction: {
      structureBroken: "防守",
      point21ValueGte18: "進攻",
      point21ValueGte8: "觀望",
      fallback: "防守",
    },

    marketGate: {
      highestPriority: true,
      rules: [
        "若 shouldExit = true，finalAction = 防守",
        "若 marketState = 修正，finalAction = 防守",
        "若 marketState = 防守 且 baseAction = 進攻，finalAction = 觀望",
        "若 marketState = 輪動 且 baseAction = 進攻 且 risk = 高，finalAction = 觀望",
        "其餘維持 baseAction",
      ],
    },

    reasonComposition: {
      order: [
        "point21Reason",
        "supportReason",
        "riskReason",
        "marketGateReason",
        "positionReason",
      ],
      dedupeBySemantic: true,
    },
  },

  riskPolicy: {
    coreIntent: "任何進攻都必須受結構與風控約束",
    outputFields: [
      "stopLossPrice",
      "trailingStopActive",
      "trailingStopPrice",
      "trailingStopRule",
      "structureRisk",
      "timeValidation",
      "priceStopStatus",
      "canHold",
      "shouldExit",
      "riskReason",
    ],
  },

  exitPolicy: {
    immutablePriority: [
      "structureBroken",
      "priceStopStatus=移動停損觸發",
      "priceStopStatus=停損觸發",
      "currentPrice<=trailingStopPrice",
      "currentPrice<=stopLossPrice",
      "shouldExit || !canHold",
    ],

    exitTypes: [
      "NONE",
      "STOP_LOSS",
      "TRAILING_STOP",
      "STRUCTURE_BREAK",
      "RISK_EXIT",
    ],

    rules: {
      structureBrokenFirst: true,
      closePositionOnTrigger: true,
      noOpenPositionNoExit: true,
    },
  },

  // ==========================================================
  // 💰 倉位系統規格
  // ==========================================================
  exposurePolicy: {
    canonicalStates: ["攻擊", "輪動", "防守", "修正"],

    byMarketState: {
      攻擊: {
        allowNewPosition: true,
        maxExposure: 1.0,
        suggestedPositionSize: 0.25,
        label: "攻擊",
      },
      輪動: {
        allowNewPosition: true,
        maxExposure: 0.6,
        suggestedPositionSize: 0.15,
        label: "輪動",
      },
      防守: {
        allowNewPosition: true,
        maxExposure: 0.3,
        suggestedPositionSize: 0.1,
        label: "防守",
      },
      修正: {
        allowNewPosition: false,
        maxExposure: 0.1,
        suggestedPositionSize: 0.05,
        label: "修正",
      },
    },

    rules: [
      "修正市場禁止新倉",
      "總倉位超限時禁止新增",
      "建議單檔倉位由市場狀態決定",
      "positionEngine 是倉位政策唯一來源",
    ],
  },

  // ==========================================================
  // 🚨 Alert 規格
  // ==========================================================
  alertPolicy: {
    eventTypes: [
      "NONE",
      "ATTACK_ENTRY",
      "WATCH_ALERT",
      "DEFENSE_ALERT",
      "EXIT_ALERT",
    ],

    allow: {
      attack: true,
      watch: true,
      defense: true,
      exit: true,
    },

    controls: {
      cooldownMs: 300000,
      dedupeByAction: true,
      dedupeByScoreBucket: true,
      exitAlertBypassCooldown: true,
      exitAlertBypassDedupe: true,
    },

    principles: [
      "該發才發",
      "不重複發",
      "不洗版",
      "出場警報優先",
    ],
  },

  // ==========================================================
  // 💾 持久化規格
  // ==========================================================
  persistence: {
    positionStoreFile: "server/data/positions.json",
    version: 1,
    requiredTopLevelFields: [
      "version",
      "updatedAt",
      "positions",
      "latestPrices",
    ],
    rules: [
      "openPosition 後立即寫入",
      "updatePosition 後立即寫入",
      "closePosition 後立即寫入",
      "server 啟動時載入",
      "重啟後必須恢復持倉",
    ],
  },

  // ==========================================================
  // 🌐 API / Route 治理
  // ==========================================================
  routeGovernance: {
    allowedCoreRoutes: [
      "/",
      "/api/stock",
      "/api/scanner",
      "/api/position",
      "/api/support/status",
      "/api/support/run",
      "/api/auto-alert/status",
      "/api/auto-alert/run",
      "/webhook",
    ],

    webhookCommands: [
      "查xxxx",
      "掃描",
      "持倉",
      "help",
      "幫助",
      "指令",
    ],

    rules: [
      "Routes 只負責收參數與回傳",
      "Routes 不可自行計算決策",
      "Webhook 必須回 WEBHOOK-V2 格式",
      "單股查詢必須可顯示持倉 / 倉位 / 風控 / 判斷",
    ],
  },

  // ==========================================================
  // 🖥 Frontend / Output 治理
  // ==========================================================
  outputPolicy: {
    webhookVersion: "WEBHOOK-V2",

    requiredSectionsInStockReply: [
      "市場",
      "結構",
      "決策",
      "倉位",
      "持倉",
      "風控",
      "判斷",
    ],

    scannerTopN: 5,

    displayRules: [
      "單股輸出必須先顯示決策，再顯示持倉與風控",
      "若持倉存在，必須顯示 OPEN / CLOSED 狀態",
      "若倉位政策存在，必須顯示新倉 / 建議單檔 / 總倉上限 / 倉位狀態",
      "原因欄位必須以結構化敘述輸出，不可隨機漂移",
    ],
  },

  // ==========================================================
  // 🧪 測試 / 壓測 / 升級標準
  // ==========================================================
  qualityGate: {
    currentLevel: "8.9",
    levelDefinition: {
      "1": "架構萌芽",
      "2": "資料流建立",
      "3": "模型與結構初步完成",
      "4": "API 可用",
      "5": "前後端接通",
      "6": "風控與市場閘門接入",
      "7": "主模組齊備",
      "8": "技術閉環完成",
      "8.9": "主鏈 + 生態池完成，準備衝 Level 9",
      "9": "多用戶 / 長時間 / 壓測穩定完成",
    },

    level9Required: [
      "多用戶可用",
      "長時間穩定",
      "掃描 / webhook / alert 壓測通過",
      "無漂移",
      "規格凍結",
    ],
  },

  // ==========================================================
  // ⚙ 工程軍令
  // ==========================================================
  engineeringRules: {
    fullFileOverwriteOnly: true,
    noPatchStyle: true,
    noPartialInsert: true,
    noInlineHotfixNarrative: true,
    antiDrift: true,
    copyPasteReady: true,
    routeLogicSeparation: true,
  },

  // ==========================================================
  // 🔒 防漂移規則
  // ==========================================================
  antiDrift: {
    statements: [
      "沒有寫進 spec 的規則，不視為正式規則",
      "任何模組輸出不得背離 spec",
      "若 spec 與敘事衝突，以 spec 為準",
      "若新功能破壞主鏈，視為不合格",
    ],
  },

  // ==========================================================
  // 📁 關鍵檔案索引
  // ==========================================================
  canonicalFiles: {
    config: [
      "server/config/helmsmanSpec.ts",
      "server/config/helmsmanConfig.ts",
    ],
    engines: [
      "server/engines/marketDataEngine.ts",
      "server/engines/point21Engine.ts",
      "server/engines/supportEngine.ts",
      "server/engines/marketStateEngine.ts",
      "server/engines/fusionEngine.ts",
      "server/engines/decisionEngine.ts",
      "server/engines/positionEngine.ts",
      "server/engines/exitEngine.ts",
      "server/engines/alertEngine.ts",
      "server/engines/autoSupportEngine.ts",
      "server/engines/autoAlertEngine.ts",
    ],
    routes: [
      "server/routes/healthRoutes.ts",
      "server/routes/stockRoutes.ts",
      "server/routes/scannerRoutes.ts",
      "server/routes/webhookRoutes.ts",
      "server/routes/positionRoutes.ts",
    ],
    services: [
      "server/services/outputService.ts",
      "server/services/lineReplyService.ts",
    ],
    data: [
      "server/data/positions.json",
    ],
    entry: [
      "server/server.ts",
    ],
  },
} as const;

// ==========================================================
// TYPES
// ==========================================================

export type HelmsmanSpec = typeof HELMSMAN_SPEC;
export type HelmsmanMarketState =
  keyof typeof HELMSMAN_SPEC.exposurePolicy.byMarketState;

// ==========================================================
// HELPERS
// ==========================================================

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

export function normalizeMarketState(value: unknown): HelmsmanMarketState {
  const state = normalizeText(value);

  if (state === "ATTACK" || state === "攻擊") return "攻擊";
  if (state === "ROTATION" || state === "輪動") return "輪動";
  if (state === "DEFENSE" || state === "防守") return "防守";
  if (state === "CORRECTION" || state === "修正") return "修正";

  return "防守";
}

export function getMarketExposurePolicy(value: unknown) {
  const state = normalizeMarketState(value);
  return HELMSMAN_SPEC.exposurePolicy.byMarketState[state];
}

export function isNewPositionAllowed(value: unknown): boolean {
  return getMarketExposurePolicy(value).allowNewPosition;
}

export function getMaxExposure(value: unknown): number {
  return getMarketExposurePolicy(value).maxExposure;
}

export function getSuggestedPositionSize(value: unknown): number {
  return getMarketExposurePolicy(value).suggestedPositionSize;
}

export function getExitPriority(): readonly string[] {
  return HELMSMAN_SPEC.exitPolicy.immutablePriority;
}

export function getWebhookVersion(): string {
  return HELMSMAN_SPEC.outputPolicy.webhookVersion;
}

export function getPositionStoreFile(): string {
  return HELMSMAN_SPEC.persistence.positionStoreFile;
}

export function getCurrentHelmsmanLevel(): string {
  return HELMSMAN_SPEC.qualityGate.currentLevel;
}

export default HELMSMAN_SPEC;
