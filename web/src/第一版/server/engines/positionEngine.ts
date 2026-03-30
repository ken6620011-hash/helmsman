import fs from "fs";
import path from "path";

export interface Position {
  symbol: string;
  name?: string;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  stopLoss: number;
  highestPrice?: number;
  trailingPercent?: number;
  openedAt?: string;
  updatedAt?: string;
  closedAt?: string;
  status?: "OPEN" | "CLOSED";
  exitPrice?: number;
  exitReason?: string;
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "positions.json");

let positions: Position[] = loadPositions();

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSymbol(symbol: string): string {
  return String(symbol || "").trim().toUpperCase();
}

function now(): string {
  return new Date().toISOString();
}

function normalizePosition(raw: any): Position {
  const symbol = normalizeSymbol(raw?.symbol || "");
  const entryPrice = safeNumber(raw?.entryPrice);
  const currentPrice = safeNumber(raw?.currentPrice, entryPrice);
  const quantity = safeNumber(raw?.quantity, 0);
  const trailingPercent = safeNumber(raw?.trailingPercent, 0.1);

  const highestPrice = Math.max(
    safeNumber(raw?.highestPrice, currentPrice),
    currentPrice
  );

  const stopLoss =
    raw?.stopLoss !== undefined && raw?.stopLoss !== null
      ? safeNumber(raw.stopLoss)
      : highestPrice * (1 - trailingPercent);

  return {
    symbol,
    name: raw?.name || symbol,
    entryPrice,
    currentPrice,
    quantity,
    stopLoss,
    highestPrice,
    trailingPercent,
    openedAt: raw?.openedAt || now(),
    updatedAt: raw?.updatedAt || now(),
    closedAt: raw?.closedAt,
    status: raw?.status || "OPEN",
    exitPrice:
      raw?.exitPrice !== undefined && raw?.exitPrice !== null
        ? safeNumber(raw.exitPrice)
        : undefined,
    exitReason: raw?.exitReason,
  };
}

function loadPositions(): Position[] {
  try {
    ensureDataDir();

    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
      return [];
    }

    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizePosition(item))
      .filter((p) => p.symbol && p.quantity > 0 && p.status !== "CLOSED");
  } catch {
    return [];
  }
}

function savePositions() {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(positions, null, 2), "utf-8");
}

function recalcPosition(position: Position): Position {
  const entryPrice = safeNumber(position.entryPrice);
  const currentPrice = safeNumber(position.currentPrice, entryPrice);
  const quantity = safeNumber(position.quantity, 0);
  const trailingPercent = safeNumber(position.trailingPercent, 0.1);

  const highestPrice = Math.max(
    safeNumber(position.highestPrice, currentPrice),
    currentPrice
  );

  const stopLoss =
    position.stopLoss !== undefined && position.stopLoss !== null
      ? safeNumber(position.stopLoss)
      : highestPrice * (1 - trailingPercent);

  return {
    ...position,
    symbol: normalizeSymbol(position.symbol),
    name: position.name || normalizeSymbol(position.symbol),
    entryPrice,
    currentPrice,
    quantity,
    stopLoss,
    highestPrice,
    trailingPercent,
    updatedAt: now(),
    status: position.status || "OPEN",
  };
}

function findIndex(symbol: string): number {
  const s = normalizeSymbol(symbol);
  return positions.findIndex((p) => normalizeSymbol(p.symbol) === s);
}

function persist() {
  positions = positions.map((p) => recalcPosition(p));
  savePositions();
}

export function getPositions(): Position[] {
  return positions.map((p) => ({ ...recalcPosition(p) }));
}

export function getOpenPositions(): Position[] {
  return getPositions();
}

export function getPosition(symbol: string): Position | undefined {
  const idx = findIndex(symbol);
  if (idx < 0) return undefined;
  return { ...recalcPosition(positions[idx]) };
}

export function findOpenPosition(symbol: string): Position | undefined {
  return getPosition(symbol);
}

export function addPosition(input: {
  symbol: string;
  name?: string;
  entryPrice: number;
  quantity: number;
  currentPrice?: number;
  stopLoss?: number;
  trailingPercent?: number;
}): Position {
  const symbol = normalizeSymbol(input.symbol);
  const existingIdx = findIndex(symbol);

  const entryPrice = safeNumber(input.entryPrice);
  const currentPrice = safeNumber(input.currentPrice, entryPrice);
  const quantity = safeNumber(input.quantity, 0);
  const trailingPercent = safeNumber(input.trailingPercent, 0.1);
  const highestPrice = currentPrice;

  const stopLoss =
    input.stopLoss !== undefined && input.stopLoss !== null
      ? safeNumber(input.stopLoss)
      : highestPrice * (1 - trailingPercent);

  const position: Position = recalcPosition({
    symbol,
    name: input.name || symbol,
    entryPrice,
    currentPrice,
    quantity,
    stopLoss,
    highestPrice,
    trailingPercent,
    openedAt: now(),
    updatedAt: now(),
    status: "OPEN",
  });

  if (existingIdx >= 0) {
    positions[existingIdx] = position;
  } else {
    positions.push(position);
  }

  persist();
  return position;
}

export function updatePositionPrice(
  symbol: string,
  newPrice: number
): Position | null {
  const idx = findIndex(symbol);
  if (idx < 0) return null;

  const current = positions[idx];
  const currentPrice = safeNumber(newPrice, current.currentPrice);
  const highestPrice = Math.max(
    safeNumber(current.highestPrice, current.currentPrice),
    currentPrice
  );

  const trailingPercent = safeNumber(current.trailingPercent, 0.1);

  positions[idx] = recalcPosition({
    ...current,
    currentPrice,
    highestPrice,
    stopLoss: highestPrice * (1 - trailingPercent),
  });

  persist();
  return { ...positions[idx] };
}

export function updatePositionStopLoss(
  symbol: string,
  stopLoss: number
): Position | null {
  const idx = findIndex(symbol);
  if (idx < 0) return null;

  positions[idx] = recalcPosition({
    ...positions[idx],
    stopLoss: safeNumber(stopLoss, positions[idx].stopLoss),
  });

  persist();
  return { ...positions[idx] };
}

export function updatePrice(
  symbol: string,
  newPrice: number
): Position | null {
  return updatePositionPrice(symbol, newPrice);
}

export function updateStopLoss(
  symbol: string,
  stopLoss: number
): Position | null {
  return updatePositionStopLoss(symbol, stopLoss);
}

export function updateHighestPrice(
  symbol: string,
  price: number
): Position | null {
  const idx = findIndex(symbol);
  if (idx < 0) return null;

  const current = positions[idx];
  const highestPrice = Math.max(
    safeNumber(current.highestPrice, current.currentPrice),
    safeNumber(price, current.currentPrice)
  );

  const trailingPercent = safeNumber(current.trailingPercent, 0.1);

  positions[idx] = recalcPosition({
    ...current,
    highestPrice,
    stopLoss: highestPrice * (1 - trailingPercent),
  });

  persist();
  return { ...positions[idx] };
}

export function updateTrailingStop(
  symbol: string,
  trailingPercent: number
): Position | null {
  const idx = findIndex(symbol);
  if (idx < 0) return null;

  const current = positions[idx];
  const nextTrailing = safeNumber(
    trailingPercent,
    current.trailingPercent ?? 0.1
  );
  const highestPrice = safeNumber(current.highestPrice, current.currentPrice);

  positions[idx] = recalcPosition({
    ...current,
    trailingPercent: nextTrailing,
    stopLoss: highestPrice * (1 - nextTrailing),
  });

  persist();
  return { ...positions[idx] };
}

export function closePosition(
  symbol: string,
  exitPrice?: number,
  reason?: string
): Position | null {
  const idx = findIndex(symbol);
  if (idx < 0) return null;

  const current = positions[idx];
  const finalPrice =
    exitPrice !== undefined && exitPrice !== null
      ? safeNumber(exitPrice, current.currentPrice)
      : current.currentPrice;

  const closed: Position = {
    ...current,
    currentPrice: finalPrice,
    exitPrice: finalPrice,
    exitReason: reason || "MANUAL_CLOSE",
    closedAt: now(),
    updatedAt: now(),
    status: "CLOSED",
  };

  positions.splice(idx, 1);
  persist();

  return closed;
}

export function removePosition(symbol: string): boolean {
  const idx = findIndex(symbol);
  if (idx < 0) return false;
  positions.splice(idx, 1);
  persist();
  return true;
}

export function clearPositions(): void {
  positions = [];
  persist();
}

export function reloadPositions(): Position[] {
  positions = loadPositions();
  return getPositions();
}
