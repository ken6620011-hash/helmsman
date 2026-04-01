export type PositionSide = "LONG";

export type PositionStatus = "OPEN" | "CLOSED";

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

const positionStore = new Map<string, PositionRecord>();
const latestPriceStore = new Map<string, number>();

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function normalizeCode(code: unknown): string {
  return String(code || "").trim();
}

function nowTs(): number {
  return Date.now();
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

export function getPositionEngineStatus() {
  return {
    total: positionStore.size,
    open: getOpenPositionCount(),
    closed: Array.from(positionStore.values()).filter((x) => x.status === "CLOSED").length,
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
  getPositionEngineStatus,
};
