import fs from "fs";
import path from "path";
import { db } from "./storageEngine";
import { getPositions, type Position } from "./positionEngine";

export type AlertType =
  | "STOP_LOSS_HIT"
  | "TRAILING_STOP_HIT"
  | "RISK_WARNING"
  | "BREAKOUT_SIGNAL";

export type AlertLevel = "INFO" | "WARN" | "CRITICAL";

export type AlertRecord = {
  id?: number;
  symbol: string;
  type: AlertType;
  level: AlertLevel;
  title: string;
  message: string;
  price?: number | null;
  stopLoss?: number | null;
  meta?: string | null;
  createdAt: number;
};

const DATA_DIR = path.resolve(process.cwd(), "data");
const ALERT_LOG_FILE = path.join(DATA_DIR, "alerts.json");

function now() {
  return Date.now();
}

function ensureAlertStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ALERT_LOG_FILE)) {
    fs.writeFileSync(ALERT_LOG_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

function ensureAlertTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      type TEXT NOT NULL,
      level TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      price REAL,
      stopLoss REAL,
      meta TEXT,
      createdAt INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON alerts(symbol);
    CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
    CREATE INDEX IF NOT EXISTS idx_alerts_createdAt ON alerts(createdAt);
  `);
}

function normalizeAlert(row: any): AlertRecord {
  return {
    id: row.id,
    symbol: row.symbol,
    type: row.type,
    level: row.level,
    title: row.title,
    message: row.message,
    price: row.price ?? null,
    stopLoss: row.stopLoss ?? null,
    meta: row.meta ?? null,
    createdAt: Number(row.createdAt),
  };
}

function appendJsonLog(alert: AlertRecord) {
  ensureAlertStorage();

  try {
    const raw = fs.readFileSync(ALERT_LOG_FILE, "utf-8");
    const list = Array.isArray(JSON.parse(raw || "[]")) ? JSON.parse(raw || "[]") : [];
    list.unshift(alert);
    fs.writeFileSync(ALERT_LOG_FILE, JSON.stringify(list.slice(0, 500), null, 2), "utf-8");
  } catch {
    fs.writeFileSync(ALERT_LOG_FILE, JSON.stringify([alert], null, 2), "utf-8");
  }
}

function isDuplicateRecent(symbol: string, type: AlertType, withinMs = 60_000) {
  const threshold = now() - withinMs;

  const row = db
    .prepare(
      `
      SELECT id
      FROM alerts
      WHERE symbol = ?
        AND type = ?
        AND createdAt >= ?
      ORDER BY createdAt DESC
      LIMIT 1
    `
    )
    .get(symbol, type, threshold);

  return !!row;
}

ensureAlertTable();
ensureAlertStorage();

export function createAlert(input: {
  symbol: string;
  type: AlertType;
  level: AlertLevel;
  title: string;
  message: string;
  price?: number;
  stopLoss?: number;
  meta?: string;
  dedupeMs?: number;
}): AlertRecord | null {
  const symbol = String(input.symbol || "").trim().toUpperCase();
  if (!symbol) return null;

  const dedupeMs = Number(input.dedupeMs ?? 60_000);
  if (isDuplicateRecent(symbol, input.type, dedupeMs)) {
    return null;
  }

  const createdAt = now();

  const result = db
    .prepare(
      `
      INSERT INTO alerts (
        symbol, type, level, title, message,
        price, stopLoss, meta, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      symbol,
      input.type,
      input.level,
      input.title,
      input.message,
      input.price ?? null,
      input.stopLoss ?? null,
      input.meta ?? null,
      createdAt
    );

  const row = db
    .prepare(`SELECT * FROM alerts WHERE id = ?`)
    .get(result.lastInsertRowid);

  const alert = normalizeAlert(row);
  appendJsonLog(alert);

  console.log(`🚨 [${alert.level}] ${alert.symbol} | ${alert.type} | ${alert.message}`);

  return alert;
}

export function getAlerts(limit = 50): AlertRecord[] {
  const rows = db
    .prepare(
      `
      SELECT *
      FROM alerts
      ORDER BY createdAt DESC, id DESC
      LIMIT ?
    `
    )
    .all(Number(limit));

  return rows.map(normalizeAlert);
}

export function getAlertsBySymbol(symbol: string, limit = 50): AlertRecord[] {
  const rows = db
    .prepare(
      `
      SELECT *
      FROM alerts
      WHERE symbol = ?
      ORDER BY createdAt DESC, id DESC
      LIMIT ?
    `
    )
    .all(String(symbol || "").trim().toUpperCase(), Number(limit));

  return rows.map(normalizeAlert);
}

export function clearAlerts() {
  db.prepare(`DELETE FROM alerts`).run();
  ensureAlertStorage();
  fs.writeFileSync(ALERT_LOG_FILE, JSON.stringify([], null, 2), "utf-8");
  return { ok: true };
}

export function createStopLossAlert(position: Position, currentPrice?: number) {
  return createAlert({
    symbol: position.symbol,
    type: "STOP_LOSS_HIT",
    level: "CRITICAL",
    title: `${position.symbol} 停損觸發`,
    message: `${position.symbol} 跌破停損，現價 ${Number(currentPrice ?? position.currentPrice).toFixed(2)}，停損 ${Number(position.stopLoss).toFixed(2)}`,
    price: Number(currentPrice ?? position.currentPrice),
    stopLoss: Number(position.stopLoss),
    meta: JSON.stringify({
      trailingPercent: position.trailingPercent,
      highestPrice: position.highestPrice,
      status: position.status,
    }),
    dedupeMs: 10_000,
  });
}

export function createTrailingStopAlert(position: Position, currentPrice?: number) {
  return createAlert({
    symbol: position.symbol,
    type: "TRAILING_STOP_HIT",
    level: "CRITICAL",
    title: `${position.symbol} 移動停損觸發`,
    message: `${position.symbol} 觸發 trailing stop，現價 ${Number(currentPrice ?? position.currentPrice).toFixed(2)}，停損 ${Number(position.stopLoss).toFixed(2)}`,
    price: Number(currentPrice ?? position.currentPrice),
    stopLoss: Number(position.stopLoss),
    meta: JSON.stringify({
      trailingPercent: position.trailingPercent,
      highestPrice: position.highestPrice,
      status: position.status,
    }),
    dedupeMs: 10_000,
  });
}

export function createRiskWarningAlert(position: Position) {
  const distancePct =
    position.currentPrice > 0
      ? ((position.currentPrice - position.stopLoss) / position.currentPrice) * 100
      : 0;

  return createAlert({
    symbol: position.symbol,
    type: "RISK_WARNING",
    level: "WARN",
    title: `${position.symbol} 風險警示`,
    message: `${position.symbol} 距離停損僅 ${distancePct.toFixed(2)}%`,
    price: Number(position.currentPrice),
    stopLoss: Number(position.stopLoss),
    meta: JSON.stringify({
      distanceToStopPct: distancePct,
      trailingPercent: position.trailingPercent,
      highestPrice: position.highestPrice,
    }),
    dedupeMs: 120_000,
  });
}

export function createBreakoutAlert(position: Position) {
  return createAlert({
    symbol: position.symbol,
    type: "BREAKOUT_SIGNAL",
    level: "INFO",
    title: `${position.symbol} 突破訊號`,
    message: `${position.symbol} 現價 ${Number(position.currentPrice).toFixed(2)}，突破前高 ${Number(position.highestPrice).toFixed(2)}`,
    price: Number(position.currentPrice),
    stopLoss: Number(position.stopLoss),
    meta: JSON.stringify({
      trailingPercent: position.trailingPercent,
      highestPrice: position.highestPrice,
    }),
    dedupeMs: 120_000,
  });
}

export function runAlertSweep() {
  const positions = getPositions();
  const alerts: AlertRecord[] = [];

  positions.forEach((pos) => {
    if (pos.status !== "OPEN") return;

    const distancePct =
      pos.currentPrice > 0
        ? ((pos.currentPrice - pos.stopLoss) / pos.currentPrice) * 100
        : 0;

    if (pos.currentPrice <= pos.stopLoss) {
      const alert =
        pos.trailingPercent > 0
          ? createTrailingStopAlert(pos, pos.currentPrice)
          : createStopLossAlert(pos, pos.currentPrice);

      if (alert) alerts.push(alert);
      return;
    }

    if (distancePct <= 3) {
      const alert = createRiskWarningAlert(pos);
      if (alert) alerts.push(alert);
    }

    if (pos.currentPrice >= pos.highestPrice) {
      const alert = createBreakoutAlert(pos);
      if (alert) alerts.push(alert);
    }
  });

  return alerts;
}
