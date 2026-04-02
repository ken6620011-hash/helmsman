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
  maxExposure: number; // 0 ~ 1
  suggestedPositionSize: number; // 0 ~ 1
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
  currentExposure: number; // 0 ~ 1
  availableExposure: number; // 0 ~ 1

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

const positionStore = new Map<string, PositionRecord>();
const latestPriceStore = new Map<string, number>();

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
  const livePrice =
    safeNumber(currentPriceRaw, Number.NaN) === safeNumber(currentPriceRaw, Number.NaN)
      ? safeNumber(latestPriceStore.get(record.code), record.entryPrice)
      : safeNumber(currentPriceRaw, record.entryPrice);

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

export function openPosition(input: PositionOpenInput): PositionSnapshot | null {
  const code = normalizeCode(input?.code);
  const name = String(input?.name || code).trim();
  const entryPrice = round2(safeNumber(input?.entryPrice, 0));
  const quantity = Math.max(1, Math.round(safeNumber(input?.quantity, 1)));
  const notes = String(input?.notes || "").trim();

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
    notes,
  };

  positionStore.set(code, record);
  latestPriceStore.set(code, entryPrice);

  return buildOpenSnapshot(record, entryPrice);
}

export function updatePosition(input: PositionUpdateInput): PositionSnapshot | null {
  const code = normalizeCode(input?.code);
  const currentPrice = round2(safeNumber(input?.currentPrice, 0));

  if (!code || currentPrice <= 0) {
    return null;
  }

  latestPriceStore.set(code, currentPrice);

  const record = positionStore.get(code);
  if (!record || record.status !== "OPEN") {
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

  return buildOpenSnapshot(record, currentPrice);
}

export function closePosition(input: PositionCloseInput): PositionSnapshot | null {
  const code = normalizeCode(input?.code);
  const exitPrice = round2(safeNumber(input?.exitPrice, 0));
  const exitReason = String(input?.exitReason || "").trim();

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

  return buildClosedSnapshot(record);
}

export function getPosition(code: string): PositionSnapshot | null {
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
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return false;

  const record = positionStore.get(normalizedCode);
  return !!record && record.status === "OPEN";
}

export function getOpenPositionCount(): number {
  let count = 0;

  for (const record of positionStore.values()) {
    if (record.status === "OPEN") {
      count++;
    }
  }

  return count;
}

export function listOpenPositions(): PositionSnapshot[] {
  const out: PositionSnapshot[] = [];

  for (const record of positionStore.values()) {
    if (record.status === "OPEN") {
      out.push(buildOpenSnapshot(record));
    }
  }

  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function listAllPositions(): PositionSnapshot[] {
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
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return false;

  latestPriceStore.delete(normalizedCode);
  return positionStore.delete(normalizedCode);
}

export function clearAllPositions(): void {
  positionStore.clear();
  latestPriceStore.clear();
}

export function getTotalOpenMarketValue(): number {
  const openPositions = listOpenPositions();

  return round2(
    openPositions.reduce((sum, pos) => {
      return sum + safeNumber(pos.currentPrice, 0) * safeNumber(pos.quantity, 0);
    }, 0)
  );
}

export function getExposureSummary(
  accountCapital: number,
  marketState: MarketStateLabel | string
): ExposureSummary {
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
  return {
    total: positionStore.size,
    open: getOpenPositionCount(),
    closed: Array.from(positionStore.values()).filter((x) => x.status === "CLOSED").length,
    totalOpenMarketValue: getTotalOpenMarketValue(),
  };
}

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
};
