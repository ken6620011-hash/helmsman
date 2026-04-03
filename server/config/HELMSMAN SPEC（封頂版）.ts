/**
 * HELMSMAN SPEC（封頂版）
 * Level 7 → Level 8 準備完成
 *
 * ⚠️ 不可破壞核心規格
 * ⚠️ 所有 AI / 開發 必須先讀此檔
 */

const HELMSMAN_SPEC = {
  // ===== 🧠 系統身份 =====
  identity: {
    name: "Helmsman",
    role: "舵手",
    mode: "ENGINE_SYSTEM",
    version: "7.0",
    level: 7, // ✅ 主鏈封頂
    nextLevel: 8, // 🎯 Position Persistence 完成 → 封頂
  },

  // ===== 🧱 不可破壞架構 =====
  architecture: {
    layers: [
      "Market",
      "Quant",
      "Engine",
      "API",
      "Frontend",
    ],
    rules: [
      "Engine 是唯一決策來源",
      "API 只做 routing，不做邏輯",
      "Frontend 只顯示，不做判斷",
    ],
  },

  // ===== 🔗 主鏈（已封頂） =====
  mainChain: {
    flow: [
      "getQuote",
      "getKbars",
      "point21",
      "support",
      "marketState",
      "decision",
      "position",
      "exit",
      "alert",
      "output",
    ],
    description: "完整交易閉環（含進出場 + LINE）",
  },

  // ===== 🌐 分鏈（生態池） =====
  subChains: {
    scanner: "多標的掃描",
    alert: "LINE 警報（含 cooldown / dedupe）",
    autoAlert: "自動推播（排程）",
    position: "持倉狀態",
    supportCache: "支撐快取",
    autoSupport: "支撐自動更新",
  },

  // ===== 🧮 核心模型 =====
  model: {
    point21: {
      max: 21,
      description: "結構強度模型",
    },
    scoreFormula: "score = (point21 / 21) * 100",
  },

  // ===== 🛡️ 風控規格 =====
  risk: {
    exitPriority: [
      "STRUCTURE_BREAK",
      "TRAILING_STOP",
      "STOP_LOSS",
      "RISK_EXIT",
    ],
    rules: [
      "structureBroken = true → 強制出場",
      "priceStopStatus = 停損觸發 → 出場",
      "shouldExit = true → 出場",
    ],
  },

  // ===== 📢 Alert 規格 =====
  alert: {
    eventTypes: [
      "ATTACK_ENTRY",
      "WATCH_ALERT",
      "DEFENSE_ALERT",
      "EXIT_ALERT",
    ],
    rules: [
      "EXIT_ALERT 不受 cooldown",
      "EXIT_ALERT 不做 dedupe",
      "市場不好禁止進攻警報",
    ],
  },

  // ===== 📦 Position 規格 =====
  position: {
    status: ["OPEN", "CLOSED"],
    requiredFields: [
      "entryPrice",
      "quantity",
      "highestPriceSinceEntry",
    ],
    nextUpgrade: "持久化（positions.json / DB）",
  },

  // ===== 🧭 市場總閘門 =====
  marketGate: {
    states: ["攻擊", "輪動", "防守", "修正"],
    rules: [
      "修正 → 全部降級為防守",
      "防守 → 進攻降級為觀望",
      "輪動 → 高風險進攻降級",
    ],
  },

  // ===== ⚙️ 工程軍令 =====
  engineering: {
    rules: [
      "一律完整覆蓋，不提供 patch",
      "禁止修改主鏈結構",
      "新增功能只能加 engine",
      "所有輸出需可直接運行",
    ],
  },

  // ===== 🔥 當前狀態 =====
  currentState: {
    level: 7,
    status: "主鏈封頂",
    completed: [
      "DecisionEngine",
      "ExitEngine",
      "AlertEngine",
      "LINE webhook",
      "AutoAlert",
      "MarketState",
      "Position（記憶態）",
    ],
  },

  // ===== 🎯 下一步（唯一主線） =====
  roadmap: {
    phase: "Level 8",
    tasks: [
      "Position 持久化（positions.json / DB）",
      "跨重啟記憶",
      "實單可追蹤",
    ],
    note: "完成即系統封頂",
  },

  // ===== 🧠 啟動指令（AI歸位用） =====
  boot: {
    command: "舵手，載入 Helmsman 系統",
    behavior: [
      "讀取 HELMSMAN_SPEC",
      "鎖定主鏈架構",
      "套用工程軍令",
      "回到當前 Level",
    ],
  },
};

export default HELMSMAN_SPEC;

收件者

讀取 Helmsman記憶

HELMSMAN SPEC（封頂版）
 * Level 7 → Level 8 準備完成
 *
 * ⚠️ 不可破壞核心規格
 * ⚠️ 所有 AI / 開發 必須先讀此檔
 */

const HELMSMAN_SPEC = {
  // ==== 🧠 系統身份 =====
  identity: {
    name: "Helmsman",
    role: "舵手",
    mode: "ENGINE_SYSTEM",
    version: "7.0",
    level: 7, // ✅ 主鏈封頂
    nextLevel: 8, // 🎯 Position Persistence 完成 → 封頂
  },

  // ===== 🧱 不可破壞架構 =====
  architecture: {
    layers: [
      "Market",
      "Quant",
      "Engine",
      "API",
      "Frontend",
    ],
    rules: [
      "Engine 是唯一決策來源",
      "API 只做 routing，不做邏輯",
      "Frontend 只顯示，不做判斷",
    ],
  },

  // ===== 🔗 主鏈（已封頂） =====
  mainChain: {
    flow: [
      "getQuote",
      "getKbars",
      "point21",
      "support",
      "marketState",
      "decision",
      "position",
      "exit",
      "alert",
      "output",
    ],
    description: "完整交易閉環（含進出場 + LINE）",
  },

  // ===== 🌐 分鏈（生態池） =====
  subChains: {
    scanner: "多標的掃描",
    alert: "LINE 警報（含 cooldown / dedupe）",
    autoAlert: "自動推播（排程）",
    position: "持倉狀態",
    supportCache: "支撐快取",
    autoSupport: "支撐自動更新",
  },

  // ===== 🧮 核心模型 =====
  model: {
    point21: {
      max: 21,
      description: "結構強度模型",
    },
    scoreFormula: "score = (point21 / 21) * 100",
  },

  // ===== 🛡️ 風控規格 =====
  risk: {
    exitPriority: [
      "STRUCTURE_BREAK",
      "TRAILING_STOP",
      "STOP_LOSS",
      "RISK_EXIT",
    ],
    rules: [
      "structureBroken = true → 強制出場",
      "priceStopStatus = 停損觸發 → 出場",
      "shouldExit = true → 出場",
    ],
  },

  // ===== 📢 Alert 規格 =====
  alert: {
    eventTypes: [
      "ATTACK_ENTRY",
      "WATCH_ALERT",
      "DEFENSE_ALERT",
      "EXIT_ALERT",
    ],
    rules: [
      "EXIT_ALERT 不受 cooldown",
      "EXIT_ALERT 不做 dedupe",
      "市場不好禁止進攻警報",
    ],
  },

  // ===== 📦 Position 規格 =====
  position: {
    status: ["OPEN", "CLOSED"],
    requiredFields: [
      "entryPrice",
      "quantity",
      "highestPriceSinceEntry",
    ],
    nextUpgrade: "持久化（positions.json / DB）",
  },

  // ===== 🧭 市場總閘門 =====
  marketGate: {
    states: ["攻擊", "輪動", "防守", "修正"],
    rules: [
      "修正 → 全部降級為防守",
      "防守 → 進攻降級為觀望",
      "輪動 → 高風險進攻降級",
    ],
  },

  // ===== ⚙️ 工程軍令 =====
  engineering: {
    rules: [
      "一律完整覆蓋，不提供 patch",
      "禁止修改主鏈結構",
      "新增功能只能加 engine",
      "所有輸出需可直接運行",
    ],
  },

  // ===== 🔥 當前狀態 =====
  currentState: {
    level: 7,
    status: "主鏈封頂",
    completed: [
      "DecisionEngine",
      "ExitEngine",
      "AlertEngine",
      "LINE webhook",
      "AutoAlert",
      "MarketState",
      "Position（記憶態）",
    ],
  },

  // ===== 🎯 下一步（唯一主線） =====
  roadmap: {
    phase: "Level 8",
    tasks: [
      "Position 持久化（positions.json / DB）",
      "跨重啟記憶",
      "實單可追蹤",
    ],
    note: "完成即系統封頂",
  },

  // ===== 🧠 啟動指令（AI歸位用） =====
  boot: {
    command: "舵手，載入 Helmsman 系統",
    behavior: [
      "讀取 HELMSMAN_SPEC",
      "鎖定主鏈架構",
      "套用工程軍令",
      "回到當前 Level",
    ],
  },
};

export default HELMSMAN_SPEC;
