export type HelmsmanSpec = {
  identity: {
    systemName: string;
    codename: string;
    mode: string;
    currentLevel: string;
    mission: string;
  };

  architecture: {
    canonicalFlow: string[];
    nonBreakableRule: string;
    layers: Array<{
      name: string;
      responsibility: string;
      forbidden: string[];
    }>;
  };

  engineeringRules: {
    outputPolicy: string[];
    forbiddenPractices: string[];
    overwriteProtocol: string[];
  };

  coreFormulaSpec: {
    point21: {
      purpose: string;
      fields: string[];
      interpretation: {
        strong: string;
        neutral: string;
        weak: string;
      };
      thresholds: {
        attack: number;
        watch: number;
        maxPoint: number;
      };
    };

    platform: {
      purpose: string;
      canonicalField: string;
      interpretation: string;
    };

    diffValue: {
      purpose: string;
      canonicalField: string;
      interpretation: string;
    };

    upperBound: {
      purpose: string;
      canonicalField: string;
      interpretation: string;
      formulaNote: string;
    };

    support: {
      purpose: string;
      fields: string[];
      interpretation: {
        valid: string;
        broken: string;
      };
      validDaysRule: string;
    };

    risk: {
      purpose: string;
      layers: string[];
      outputs: string[];
    };
  };

  decisionPolicy: {
    baseLogic: string[];
    marketStateLogic: string[];
    riskOverrideLogic: string[];
    finalActionValues: string[];
  };

  engineGovernance: {
    singleSourceOfTruth: string;
    engines: Array<{
      name: string;
      role: string;
      inputs: string[];
      outputs: string[];
      forbidden: string[];
    }>;
  };

  routeGovernance: {
    rule: string;
    routes: Array<{
      path: string;
      purpose: string;
      restriction: string;
    }>;
  };

  outputPolicy: {
    webhookTag: string;
    sections: string[];
    requiredFields: string[];
  };

  persistencePolicy: {
    configFile: string;
    positionStore: string;
    rationale: string[];
  };

  handoffPolicy: {
    whatFutureAIShouldReadFirst: string[];
    antiDriftRules: string[];
  };
};

export const HELMSMAN_SPEC: HelmsmanSpec = {
  identity: {
    systemName: "Helmsman",
    codename: "舵手",
    mode: "實戰收斂 / 工程閉環",
    currentLevel: "Level 5.9 → Level 6",
    mission: "把判讀、風控、持倉、警報整合成可持續運作的交易系統",
  },

  architecture: {
    canonicalFlow: [
      "Market",
      "Quant",
      "Engine",
      "API",
      "Frontend",
    ],
    nonBreakableRule: "Engine 是唯一決策來源；API 只負責路由；Frontend 只負責顯示。",
    layers: [
      {
        name: "Market",
        responsibility: "提供報價、K棒、外部資料來源",
        forbidden: [
          "不可做決策",
          "不可做風控",
          "不可直接輸出交易結論",
        ],
      },
      {
        name: "Quant",
        responsibility: "定義公式、閾值、模型結構",
        forbidden: [
          "不可直接操作 routes",
          "不可直接發 LINE",
        ],
      },
      {
        name: "Engine",
        responsibility: "唯一決策層；執行 point21 / support / risk / decision / position / alert",
        forbidden: [
          "不可由多個 engine 同時產生不同決策真相",
        ],
      },
      {
        name: "API",
        responsibility: "把 request 轉給 engine，回傳結果",
        forbidden: [
          "不可寫交易邏輯",
          "不可自行重算 score",
          "不可自行產生另一套 decision",
        ],
      },
      {
        name: "Frontend",
        responsibility: "展示結果與操作入口",
        forbidden: [
          "不可自算策略",
          "不可改 decision 結果",
        ],
      },
    ],
  },

  engineeringRules: {
    outputPolicy: [
      "一律整檔輸出",
      "一律完整覆蓋",
      "必要時自動分段",
      "回覆需包含檔名與覆蓋動作",
    ],
    forbiddenPractices: [
      "不可用找 / 換 patch 模式",
      "不可局部插入某一行",
      "不可提供臨時 patch",
      "不可讓不同檔案版本不同步",
    ],
    overwriteProtocol: [
      "Ctrl + A",
      "全部刪除",
      "全部貼上",
      "存檔",
    ],
  },

  coreFormulaSpec: {
    point21: {
      purpose: "用價格在平台區間中的位置，映射為 0~21 的離散點數，作為主結構評分核心。",
      fields: [
        "point21Value",
        "point21Score",
        "simulatedPrice",
        "diffValue",
        "upperBound",
        "point21State",
        "point21Reason",
      ],
      interpretation: {
        strong: "點數高，代表更接近低位優勢區 / 可攻擊區。",
        neutral: "點數中間，代表結構中性，偏觀察。",
        weak: "點數低，代表接近上緣或結構弱勢，偏防守。",
      },
      thresholds: {
        attack: 18,
        watch: 7,
        maxPoint: 21,
      },
    },

    platform: {
      purpose: "simulatedPrice 為平台基準價，是 point21 判讀的結構核心基準。",
      canonicalField: "simulatedPrice",
      interpretation: "平台不是即時漲跌，而是結構定位基準。",
    },

    diffValue: {
      purpose: "代表價格到上緣的距離，用於溫度判斷與剩餘空間觀察。",
      canonicalField: "diffValue",
      interpretation: "差值越大，通常代表上方空間越大；差值越小，代表接近上緣或偏熱。",
    },

    upperBound: {
      purpose: "代表結構區間的上緣，是 point21 與 diffValue 的上限參考。",
      canonicalField: "upperBound",
      interpretation: "上緣用來判斷價格在結構區間中的相對位置。",
      formulaNote: "系統實務上採 point21 模組推導；概念上 upperBound 與 diffValue、simulatedPrice 共同構成平台區間。",
    },

    support: {
      purpose: "定義支撐價、守穩天數、是否跌破，用於結構風控。",
      fields: [
        "supportPrice",
        "supportDays",
        "structureBroken",
        "supportReason",
      ],
      interpretation: {
        valid: "支撐未破且連續守穩天數足夠，才算結構有效。",
        broken: "跌破支撐或結構破壞，風險提升並偏向防守 / 出場。",
      },
      validDaysRule: "守穩 >= 3 天 才視為有效守穩，這是 Helmsman 抗雜訊核心。",
    },

    risk: {
      purpose: "以三層風控管理持股，不只看價格，還看結構與時間驗證。",
      layers: [
        "結構風控：structureBroken / supportPrice / supportDays",
        "時間風控：守穩天數驗證，避免假跌破與洗盤噪音",
        "價格風控：stopLoss / trailingStop 作為最後防線",
      ],
      outputs: [
        "riskLevel",
        "canHold",
        "shouldExit",
        "stopLossPrice",
        "trailingStopActive",
        "trailingStopPrice",
        "priceStopStatus",
        "riskReason",
      ],
    },
  },

  decisionPolicy: {
    baseLogic: [
      "point21 >= 18 且結構未破 → 進攻候選",
      "point21 >= 7 且 < 18 → 觀望 / 觀察",
      "point21 < 7 或結構已破 → 防守",
      "changePercent 大幅轉弱可直接強制防守",
    ],
    marketStateLogic: [
      "市場狀態可為 攻擊 / 觀望 / 防守 / 修正",
      "structureBroken 時 marketState 應偏防守",
    ],
    riskOverrideLogic: [
      "riskEngine 的 shouldExit / canHold 會覆蓋 baseAction",
      "若 shouldExit = true，finalAction 必須收斂為防守 / 出場方向",
      "風控結果不是展示用，而是正式參與決策",
    ],
    finalActionValues: [
      "進攻",
      "觀望",
      "防守",
    ],
  },

  engineGovernance: {
    singleSourceOfTruth: "decisionEngine 是唯一決策真相；其他 engine 只能提供輸入，不可自行替代 decision。",
    engines: [
      {
        name: "marketDataEngine",
        role: "取得 quote / kbars",
        inputs: ["code"],
        outputs: ["quote", "kbars"],
        forbidden: ["不可做 decision", "不可做 risk", "不可產生交易結論"],
      },
      {
        name: "point21Engine",
        role: "計算 21點 / 平台 / 差值 / 上緣",
        inputs: ["code", "price", "bars"],
        outputs: [
          "point21Value",
          "point21Score",
          "simulatedPrice",
          "diffValue",
          "upperBound",
          "point21Reason",
        ],
        forbidden: ["不可做最終買賣決策", "不可發警報"],
      },
      {
        name: "supportEngine",
        role: "計算支撐與守穩結構",
        inputs: ["code", "bars", "currentPrice"],
        outputs: ["supportPrice", "supportDays", "structureBroken", "supportReason"],
        forbidden: ["不可做最終買賣決策"],
      },
      {
        name: "riskEngine",
        role: "計算結構 / 時間 / 價格三層風控",
        inputs: ["point21", "support", "position"],
        outputs: [
          "riskLevel",
          "canHold",
          "shouldExit",
          "stopLossPrice",
          "trailingStopPrice",
          "riskReason",
        ],
        forbidden: ["不可單獨定義另一套 decision 真相"],
      },
      {
        name: "decisionEngine",
        role: "唯一決策來源，統一 action / score / risk / reason",
        inputs: ["point21", "support", "risk"],
        outputs: ["action", "finalAction", "score", "reason"],
        forbidden: ["不可抓外部資料", "不可由 routes 替代"],
      },
      {
        name: "positionEngine",
        role: "管理持倉、進場價、最高價、平倉、持久化",
        inputs: ["open / update / close requests"],
        outputs: ["position snapshots"],
        forbidden: ["不可自行生成策略", "不可取代 risk / decision"],
      },
      {
        name: "exitEngine",
        role: "根據 risk / trailing / stop loss 執行出場",
        inputs: ["position", "risk outputs", "currentPrice"],
        outputs: ["exitResult", "closed position"],
        forbidden: ["不可獨立定義選股邏輯"],
      },
      {
        name: "alertEngine",
        role: "警報聚合，含 cooldown / dedupe / exit 整合",
        inputs: ["decision", "risk", "position", "exitResult"],
        outputs: ["alert message", "event type"],
        forbidden: ["不可自行重算 decision"],
      },
      {
        name: "fusionEngine",
        role: "把 quote / point21 / support / risk / decision / position 收斂成單一輸入輸出",
        inputs: ["code"],
        outputs: ["fusion result"],
        forbidden: ["不可成為第二個 decision source"],
      },
    ],
  },

  routeGovernance: {
    rule: "routes 只能轉接 engine，不可自行寫交易邏輯。",
    routes: [
      {
        path: "/api/stock/:code",
        purpose: "單股查詢",
        restriction: "只能呼叫 fusion → output",
      },
      {
        path: "/api/scanner",
        purpose: "多股掃描",
        restriction: "只能以同一套 decision / fusion 輸出排序",
      },
      {
        path: "/api/position/*",
        purpose: "持倉管理",
        restriction: "只能呼叫 positionEngine",
      },
      {
        path: "/webhook",
        purpose: "LINE 指令與回覆",
        restriction: "不可在 route 內自行產生另一套判斷",
      },
    ],
  },

  outputPolicy: {
    webhookTag: "[WEBHOOK-V2]",
    sections: [
      "📊 基本報價",
      "📌 結構",
      "📌 決策",
      "📌 持倉",
      "📌 風控",
      "📌 判斷",
    ],
    requiredFields: [
      "price",
      "change",
      "changePercent",
      "supportPrice / supportDays / structureBroken",
      "action / risk / score",
      "position status",
      "stopLoss / trailing",
      "reason",
    ],
  },

  persistencePolicy: {
    configFile: "server/config/helmsmanConfig.ts",
    positionStore: "server/data/positions.json",
    rationale: [
      "AI 記憶只能降低漂移，不能取代系統記憶",
      "規則要寫進 config",
      "持倉要寫進 json 或資料庫",
      "重啟後端後不可遺失 position",
    ],
  },

  handoffPolicy: {
    whatFutureAIShouldReadFirst: [
      "server/config/helmsmanSpec.ts",
      "server/config/helmsmanConfig.ts",
      "server/engines/fusionEngine.ts",
      "server/engines/decisionEngine.ts",
      "server/engines/riskEngine.ts",
      "server/engines/positionEngine.ts",
    ],
    antiDriftRules: [
      "不可重新發明第二套決策真相",
      "不可讓 routes 直接寫策略",
      "不可繞過 decisionEngine",
      "不可局部 patch，需整檔覆蓋同步",
      "若要改閾值，先改 helmsmanConfig.ts，不要散改 engine",
    ],
  },
};

export default HELMSMAN_SPEC;
