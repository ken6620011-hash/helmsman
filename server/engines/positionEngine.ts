import fs from "fs";
import path from "path";

export type PositionSide = "LONG";

export type PositionStatus = "OPEN" | "CLOSED";

export type MarketStateLabel =
  | "ATTACK"
  | "ROTATION"
  | "DEFENSE"
  | "CORRECTION"
  | "攻擊"
  | "輪動"
  | "防守"
  | "修正";

export type PositionRecord = {
  code: string;
  name: string;

  side: PositionSide;
  status: PositionStatus;

  entryPrice: number;
  quantity: number;

  highestPriceSinceEntry: number;
  lowestPriceSinceEntry: number;

  openedAt: number;
  updatedAt: number;
  closedAt?: number;

  exitPrice?: number;
  exitReason?: string;

  notes?: string;
};

export type PositionOpenInput = {
  code: string;
  name?: string;
  entryPrice: number;
  quantity?: number;
  notes?: string;
};

export type PositionUpdateInput = {
  code: string;
  currentPrice: number;
};

export type PositionCloseInput = {
  code: string;
  exitPrice: number;
  exitReason?: string;
};

export type PositionSnapshot = {
  code: string;
  name: string;
  status: PositionStatus;

  entryPrice: number;
  currentPrice: number;
  quantity: number;

  highestPriceSinceEntry: number;
  lowestPriceSinceEntry: number;

  pnlAmount: number;
  pnlPercent: number;

  openedAt: number;
  updatedAt: number;
  closedAt?: number;

  exitPrice?: number;
  exitReason?: string;
  notes?: string;
};

export type MarketExposurePolicy = {
  marketState: MarketStateLabel | string;
  maxExposure: number;
  suggestedPositionSize: number;
  allowNewPosition: boolean;
  label: string;
};

export type ExposureSummary = {
  marketState: MarketStateLabel | string;
  maxExposure: number;
  suggestedPositionSize: number;
  allowNewPosition: boolean;

  totalOpenPositions: number;
  totalMarketValue: number;
  currentExposure: number;
  availableExposure: number;

  status: "OK" | "LIMIT_REACHED" | "BLOCKED";
  message: string;
};

export type NewPositionCheckInput = {
  marketState: MarketStateLabel | string;
  accountCapital: number;
  newPositionValue?: number;
};

export type NewPositionCheckResult = {
  allowed: boolean;
  marketState: MarketStateLabel | string;
  maxExposure: number;
  currentExposure: number;
  availableExposure: number;
  suggestedPositionSize: number;
  suggestedPositionValue: number;
  requestedPositionValue: number;
  status: "OK" | "LIMIT_REACHED" | "BLOCKED";
  message: string;
};

type PositionStoreFile = {
  version: number;
  updatedAt: number;
  positions: PositionRecord[];
  latestPrices: Record<string, number>;
};

const positionStore = new Map<string, PositionRecord>();
const latestPriceStore = new Map<string, number>();

const DATA_DIR = path.resolve(process.cwd(), "server/data");
const POSITION_FILE = path.join(DATA_DIR, "positions.json");

let hasLoadedFromDisk = false;

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeCode(code: unknown): string {
  return String(code || "").trim();
}

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function nowTs(): number {
  return Date.now();
}

function normalizeMarketState(value: unknown): MarketStateLabel | string {
  const state = normalizeText(value);

  if (!state) return "防守";
  if (state === "ATTACK" || state === "攻擊") return "攻擊";
  if (state === "ROTATION" || state === "輪動") return "輪動";
  if (state === "DEFENSE" || state === "防守") return "防守";
  if (state === "CORRECTION" || state === "修正") return "修正";

  return state;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function sanitizePositionRecord(input: any): PositionRecord | null {
  const code = normalizeCode(input?.code);
  const name = normalizeText(input?.name || code);
  const status: PositionStatus =
    normalizeText(input?.status) === "CLOSED" ? "CLOSED" : "OPEN";

  const entryPrice = round2(safeNumber(input?.entryPrice, 0));
  const quantity = Math.max(1, Math.round(safeNumber(input?.quantity, 1)));

  if (!code || entryPrice <= 0) {
    return null;
  }

  const highestPriceSinceEntry = round2(
    Math.max(entryPrice, safeNumber(input?.highestPriceSinceEntry, entryPrice))
  );

  const lowestCandidate = safeNumber(input?.lowestPriceSinceEntry, entryPrice);
  const lowestPriceSinceEntry = round2(
    Math.max(0, Math.min(lowestCandidate, highestPriceSinceEntry))
  );

  const openedAt = Math.max(0, Math.round(safeNumber(input?.openedAt, nowTs())));
  const updatedAt = Math.max(openedAt, Math.round(safeNumber(input?.updatedAt, openedAt)));

  const closedAt =
    status === "CLOSED"
      ? Math.max(updatedAt, Math.round(safeNumber(input?.closedAt, updatedAt)))
      : undefined;

  const exitPrice =
    status === "CLOSED"
      ? (() => {
          const v = round2(safeNumber(input?.exitPrice, 0));
          return v > 0 ? v : undefined;
        })()
      : undefined;

  const exitReason =
    status === "CLOSED"
      ? normalizeText(input?.exitReason || "manual") || "manual"
      : undefined;

  const notes = normalizeText(input?.notes) || undefined;

  return {
    code,
    name,
    side: "LONG",
    status,
    entryPrice,
    quantity,
    highestPriceSinceEntry,
    lowestPriceSinceEntry,
    openedAt,
    updatedAt,
    closedAt,
    exitPrice,
    exitReason,
    notes,
  };
}

function serializeStore(): PositionStoreFile {
  return {
    version: 1,
    updatedAt: nowTs(),
    positions: Array.from(positionStore.values()),
    latestPrices: Object.fromEntries(latestPriceStore.entries()),
  };
}

function writeStoreToDisk(): void {
  ensureDataDir();
  fs.writeFileSync(POSITION_FILE, JSON.stringify(serializeStore(), null, 2), "utf8");
}

function loadStoreFromDisk(): void {
  if (hasLoadedFromDisk) return;
  hasLoadedFromDisk = true;

  ensureDataDir();

  if (!fs.existsSync(POSITION_FILE)) {
    writeStoreToDisk();
    console.log(`📦 Position store initialized: ${POSITION_FILE}`);
    return;
  }

  try {
    const raw = fs.readFileSync(POSITION_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<PositionStoreFile>;

    positionStore.clear();
    latestPriceStore.clear();

    const positions = Array.isArray(parsed?.positions) ? parsed.positions : [];
    for (const item of positions) {
      const record = sanitizePositionRecord(item);
      if (!record) continue;
      positionStore.set(record.code, record);
    }

    const latestPrices =
      parsed?.latestPrices && typeof parsed.latestPrices === "object"
        ? parsed.latestPrices
        : {};

    for (const [codeRaw, priceRaw] of Object.entries(latestPrices)) {
      const code = normalizeCode(codeRaw);
      const price = round2(safeNumber(priceRaw, 0));
      if (!code || price <= 0) continue;
      latestPriceStore.set(code, price);
    }

    for (const record of positionStore.values()) {
      if (record.status === "OPEN" && !latestPriceStore.has(record.code)) {
        latestPriceStore.set(record.code, record.entryPrice);
      }
      if (record.status === "CLOSED" && record.exitPrice && !latestPriceStore.has(record.code)) {
        latestPriceStore.set(record.code, round2(record.exitPrice));
      }
    }

    const openCount = Array.from(positionStore.values()).filter(
      (x) => x.status === "OPEN"
    ).length;

    console.log(
      `📦 Position store loaded: ${POSITION_FILE} | total=${positionStore.size} | open=${openCount}`
    );
  } catch (error) {
    console.error("❌ Position store load failed:", error);
    console.error("⚠️ Fallback: using empty in-memory store");
    positionStore.clear();
    latestPriceStore.clear();
  }
}

function persistStore(): void {
  loadStoreFromDisk();

  try {
    writeStoreToDisk();
  } catch (error) {
    console.error("❌ Position store save failed:", error);
  }
}

function buildClosedSnapshot(record: PositionRecord): PositionSnapshot {
  const currentPrice = round2(safeNumber(record.exitPrice, 0));
  const pnlAmount = round2((currentPrice - record.entryPrice) * record.quantity);
  const pnlPercent =
    record.entryPrice > 0
      ? round2(((currentPrice - record.entryPrice) / record.entryPrice) * 100)
      : 0;

  return {
    code: record.code,
    name: record.name,
    status: record.status,

    entryPrice: round2(record.entryPrice),
    currentPrice,
    quantity: record.quantity,

    highestPriceSinceEntry: round2(record.highestPriceSinceEntry),
    lowestPriceSinceEntry: round2(record.lowestPriceSinceEntry),

    pnlAmount,
    pnlPercent,

    openedAt: record.openedAt,
    updatedAt: record.updatedAt,
    closedAt: record.closedAt,

    exitPrice: record.exitPrice,
    exitReason: record.exitReason,
    notes: record.notes,
  };
}

function buildOpenSnapshot(record: PositionRecord, currentPriceRaw?: number): PositionSnapshot {
  const hasCurrentPrice =
    typeof currentPriceRaw === "number" && Number.isFinite(currentPriceRaw);

  const livePrice = hasCurrentPrice
    ? safeNumber(currentPriceRaw, record.entryPrice)
    : safeNumber(latestPriceStore.get(record.code), record.entryPrice);

  const currentPrice = round2(livePrice);
  const pnlAmount = round2((currentPrice - record.entryPrice) * record.quantity);
  const pnlPercent =
    record.entryPrice > 0
      ? round2(((currentPrice - record.entryPrice) / record.entryPrice) * 100)
      : 0;

  return {
    code: record.code,
    name: record.name,
    status: record.status,

    entryPrice: round2(record.entryPrice),
    currentPrice,
    quantity: record.quantity,

    highestPriceSinceEntry: round2(record.highestPriceSinceEntry),
    lowestPriceSinceEntry: round2(record.lowestPriceSinceEntry),

    pnlAmount,
    pnlPercent,

    openedAt: record.openedAt,
    updatedAt: record.updatedAt,
    closedAt: record.closedAt,

    exitPrice: record.exitPrice,
    exitReason: record.exitReason,
    notes: record.notes,
  };
}

function getMarketExposurePolicy(marketStateInput: MarketStateLabel | string): MarketExposurePolicy {
  const marketState = normalizeMarketState(marketStateInput);

  if (marketState === "攻擊") {
    return {
      marketState,
      maxExposure: 1.0,
      suggestedPositionSize: 0.25,
      allowNewPosition: true,
      label: "攻擊",
    };
  }

  if (marketState === "輪動") {
    return {
      marketState,
      maxExposure: 0.6,
      suggestedPositionSize: 0.15,
      allowNewPosition: true,
      label: "輪動",
    };
  }

  if (marketState === "防守") {
    return {
      marketState,
      maxExposure: 0.3,
      suggestedPositionSize: 0.1,
      allowNewPosition: true,
      label: "防守",
    };
  }

  if (marketState === "修正") {
    return {
      marketState,
      maxExposure: 0.1,
      suggestedPositionSize: 0.05,
      allowNewPosition: false,
      label: "修正",
    };
  }

  return {
    marketState,
    maxExposure: 0.2,
    suggestedPositionSize: 0.08,
    allowNewPosition: false,
    label: String(marketState),
  };
}

export function openPosition(input: PositionOpenInput): PositionSnapshot | null {
  loadStoreFromDisk();

  const code = normalizeCode(input?.code);
  const name = normalizeText(input?.name || code);
  const entryPrice = round2(safeNumber(input?.entryPrice, 0));
  const quantity = Math.max(1, Math.round(safeNumber(input?.quantity, 1)));
  const notes = normalizeText(input?.notes);

  if (!code || entryPrice <= 0) {
    return null;
  }

  const existing = positionStore.get(code);
  if (existing && existing.status === "OPEN") {
    return buildOpenSnapshot(existing);
  }

  const ts = nowTs();

  const record: PositionRecord = {
    code,
    name,
    side: "LONG",
    status: "OPEN",
    entryPrice,
    quantity,
    highestPriceSinceEntry: entryPrice,
    lowestPriceSinceEntry: entryPrice,
    openedAt: ts,
    updatedAt: ts,
    notes: notes || undefined,
  };

  positionStore.set(code, record);
  latestPriceStore.set(code, entryPrice);
  persistStore();

  return buildOpenSnapshot(record, entryPrice);
}

export function updatePosition(input: PositionUpdateInput): PositionSnapshot | null {
  loadStoreFromDisk();

  const code = normalizeCode(input?.code);
  const currentPrice = round2(safeNumber(input?.currentPrice, 0));

  if (!code || currentPrice <= 0) {
    return null;
  }

  latestPriceStore.set(code, currentPrice);

  const record = positionStore.get(code);
  if (!record || record.status !== "OPEN") {
    persistStore();
    return null;
  }

  record.highestPriceSinceEntry = round2(
    Math.max(record.highestPriceSinceEntry, currentPrice)
  );
  record.lowestPriceSinceEntry = round2(
    Math.min(record.lowestPriceSinceEntry, currentPrice)
  );
  record.updatedAt = nowTs();

  positionStore.set(code, record);
  persistStore();

  return buildOpenSnapshot(record, currentPrice);
}

export function closePosition(input: PositionCloseInput): PositionSnapshot | null {
  loadStoreFromDisk();

  const code = normalizeCode(input?.code);
  const exitPrice = round2(safeNumber(input?.exitPrice, 0));
  const exitReason = normalizeText(input?.exitReason || "manual");

  if (!code || exitPrice <= 0) {
    return null;
  }

  const record = positionStore.get(code);
  if (!record || record.status !== "OPEN") {
    return null;
  }

  record.status = "CLOSED";
  record.exitPrice = exitPrice;
  record.exitReason = exitReason || "manual";
  record.closedAt = nowTs();
  record.updatedAt = record.closedAt;

  latestPriceStore.set(code, exitPrice);
  positionStore.set(code, record);
  persistStore();

  return buildClosedSnapshot(record);
}

export function getPosition(code: string): PositionSnapshot | null {
  loadStoreFromDisk();

  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return null;

  const record = positionStore.get(normalizedCode);
  if (!record) return null;

  if (record.status === "CLOSED") {
    return buildClosedSnapshot(record);
  }

  return buildOpenSnapshot(record);
}

export function hasOpenPosition(code: string): boolean {
  loadStoreFromDisk();

  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return false;

  const record = positionStore.get(normalizedCode);
  return !!record && record.status === "OPEN";
}

export function getOpenPositionCount(): number {
  loadStoreFromDisk();

  let count = 0;
  for (const record of positionStore.values()) {
    if (record.status === "OPEN") {
      count++;
    }
  }

  return count;
}

export function listOpenPositions(): PositionSnapshot[] {
  loadStoreFromDisk();

  const out: PositionSnapshot[] = [];

  for (const record of positionStore.values()) {
    if (record.status === "OPEN") {
      out.push(buildOpenSnapshot(record));
    }
  }

  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function listAllPositions(): PositionSnapshot[] {
  loadStoreFromDisk();

  const out: PositionSnapshot[] = [];

  for (const record of positionStore.values()) {
    if (record.status === "OPEN") {
      out.push(buildOpenSnapshot(record));
    } else {
      out.push(buildClosedSnapshot(record));
    }
  }

  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function removePosition(code: string): boolean {
  loadStoreFromDisk();

  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return false;

  latestPriceStore.delete(normalizedCode);
  const deleted = positionStore.delete(normalizedCode);

  if (deleted) {
    persistStore();
  }

  return deleted;
}

export function clearAllPositions(): void {
  loadStoreFromDisk();
  positionStore.clear();
  latestPriceStore.clear();
  persistStore();
}

export function getTotalOpenMarketValue(): number {
  loadStoreFromDisk();

  return round2(
    listOpenPositions().reduce((sum, pos) => {
      return sum + safeNumber(pos.currentPrice, 0) * safeNumber(pos.quantity, 0);
    }, 0)
  );
}

export function getExposureSummary(
  accountCapital: number,
  marketState: MarketStateLabel | string
): ExposureSummary {
  loadStoreFromDisk();

  const capital = Math.max(0, safeNumber(accountCapital, 0));
  const policy = getMarketExposurePolicy(marketState);
  const totalMarketValue = getTotalOpenMarketValue();

  const currentExposure =
    capital > 0 ? round2(clamp(totalMarketValue / capital, 0, 999)) : 0;

  const availableExposure = round2(
    Math.max(0, policy.maxExposure - currentExposure)
  );

  let status: ExposureSummary["status"] = "OK";
  let message = `市場＝${policy.label}，可用總倉位 ${round2(availableExposure * 100)}%`;

  if (!policy.allowNewPosition) {
    status = "BLOCKED";
    message = `市場＝${policy.label}，新倉停用`;
  } else if (availableExposure <= 0) {
    status = "LIMIT_REACHED";
    message = `市場＝${policy.label}，總倉位已達上限`;
  }

  return {
    marketState: policy.marketState,
    maxExposure: policy.maxExposure,
    suggestedPositionSize: policy.suggestedPositionSize,
    allowNewPosition: policy.allowNewPosition,

    totalOpenPositions: getOpenPositionCount(),
    totalMarketValue,
    currentExposure,
    availableExposure,

    status,
    message,
  };
}

export function checkNewPositionAllowance(
  input: NewPositionCheckInput
): NewPositionCheckResult {
  loadStoreFromDisk();

  const capital = Math.max(0, safeNumber(input.accountCapital, 0));
  const requestedPositionValue = Math.max(0, safeNumber(input.newPositionValue, 0));

  const summary = getExposureSummary(capital, input.marketState);
  const suggestedPositionValue = round2(capital * summary.suggestedPositionSize);

  if (summary.status === "BLOCKED") {
    return {
      allowed: false,
      marketState: summary.marketState,
      maxExposure: summary.maxExposure,
      currentExposure: summary.currentExposure,
      availableExposure: summary.availableExposure,
      suggestedPositionSize: summary.suggestedPositionSize,
      suggestedPositionValue,
      requestedPositionValue,
      status: summary.status,
      message: summary.message,
    };
  }

  if (summary.status === "LIMIT_REACHED") {
    return {
      allowed: false,
      marketState: summary.marketState,
      maxExposure: summary.maxExposure,
      currentExposure: summary.currentExposure,
      availableExposure: summary.availableExposure,
      suggestedPositionSize: summary.suggestedPositionSize,
      suggestedPositionValue,
      requestedPositionValue,
      status: summary.status,
      message: summary.message,
    };
  }

  if (capital <= 0) {
    return {
      allowed: false,
      marketState: summary.marketState,
      maxExposure: summary.maxExposure,
      currentExposure: summary.currentExposure,
      availableExposure: summary.availableExposure,
      suggestedPositionSize: summary.suggestedPositionSize,
      suggestedPositionValue,
      requestedPositionValue,
      status: "BLOCKED",
      message: "帳戶資金不足或未設定",
    };
  }

  if (requestedPositionValue > 0) {
    const availableValue = round2(capital * summary.availableExposure);

    if (requestedPositionValue > availableValue) {
      return {
        allowed: false,
        marketState: summary.marketState,
        maxExposure: summary.maxExposure,
        currentExposure: summary.currentExposure,
        availableExposure: summary.availableExposure,
        suggestedPositionSize: summary.suggestedPositionSize,
        suggestedPositionValue,
        requestedPositionValue,
        status: "LIMIT_REACHED",
        message: `超出可用倉位上限，可用金額約 ${availableValue}`,
      };
    }
  }

  return {
    allowed: true,
    marketState: summary.marketState,
    maxExposure: summary.maxExposure,
    currentExposure: summary.currentExposure,
    availableExposure: summary.availableExposure,
    suggestedPositionSize: summary.suggestedPositionSize,
    suggestedPositionValue,
    requestedPositionValue,
    status: "OK",
    message: `允許開新倉，建議單檔倉位 ${round2(summary.suggestedPositionSize * 100)}%`,
  };
}

export function getPositionEngineStatus() {
  loadStoreFromDisk();

  return {
    total: positionStore.size,
    open: getOpenPositionCount(),
    closed: Array.from(positionStore.values()).filter((x) => x.status === "CLOSED").length,
    totalOpenMarketValue: getTotalOpenMarketValue(),
    storeFile: POSITION_FILE,
    loadedFromDisk: hasLoadedFromDisk,
  };
}

export function savePositionStore(): void {
  persistStore();
}

export function reloadPositionStore(): void {
  hasLoadedFromDisk = false;
  loadStoreFromDisk();
}

loadStoreFromDisk();

export default {
  openPosition,
  updatePosition,
  closePosition,
  getPosition,
  hasOpenPosition,
  getOpenPositionCount,
  listOpenPositions,
  listAllPositions,
  removePosition,
  clearAllPositions,
  getTotalOpenMarketValue,
  getExposureSummary,
  checkNewPositionAllowance,
  getPositionEngineStatus,
  savePositionStore,
  reloadPositionStore,
};
