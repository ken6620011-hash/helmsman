// server/engines/alertEngine.ts

export type AlertType =
  | "SCAN_SIGNAL"
  | "WATCHLIST_BREAKOUT"
  | "WATCHLIST_PULLBACK"
  | "POSITION_RISK"
  | "STOP_LOSS_TRIGGERED"
  | "TRAILING_STOP_TRIGGERED"
  | "MONITOR_WARNING"
  | "SYSTEM"
  | "CUSTOM";

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "new" | "read" | "resolved";

export interface AlertSourceMeta {
  engine?: string;
  strategy?: string;
  signal?: string;
  reason?: string;
  note?: string;
  cooldownSeconds?: number;
  [key: string]: unknown;
}

export interface AlertItem {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  symbol?: string;
  title: string;
  message: string;
  timestamp: string;
  source: string;
  tags: string[];
  meta: AlertSourceMeta;
  dedupeKey?: string;
}

export interface CreateAlertInput {
  type: AlertType;
  severity?: AlertSeverity;
  symbol?: string;
  title: string;
  message: string;
  source?: string;
  tags?: string[];
  meta?: AlertSourceMeta;
  dedupeKey?: string;
}

export interface AlertQuery {
  type?: AlertType;
  severity?: AlertSeverity;
  status?: AlertStatus;
  symbol?: string;
  source?: string;
  limit?: number;
}

export interface AlertStats {
  total: number;
  newCount: number;
  readCount: number;
  resolvedCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
}

export interface ScannerAlertInput {
  symbol: string;
  strategySignal?: string;
  radarScore?: number;
  price?: number;
  change?: number;
  reason?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
}

export interface WatchlistAlertInput {
  symbol: string;
  mode?: "BREAKOUT" | "PULLBACK";
  price?: number;
  change?: number;
  reason?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
}

export interface PositionRiskAlertInput {
  symbol: string;
  riskLevel?: "warning" | "critical";
  positionSize?: number;
  entryPrice?: number;
  currentPrice?: number;
  pnlPct?: number;
  reason?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
}

export interface MonitorTriggerAlertInput {
  symbol: string;
  triggerType:
    | "STOP_LOSS_TRIGGERED"
    | "TRAILING_STOP_TRIGGERED"
    | "MONITOR_WARNING";
  stopPrice?: number;
  currentPrice?: number;
  pnlPct?: number;
  reason?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
}

const MAX_ALERTS = 1000;
const DEFAULT_COOLDOWN_SECONDS = 60;

type AlertPatch = Partial<Omit<AlertItem, "id">>;

interface AlertRepository {
  getAll(): AlertItem[];
  replaceAll(items: AlertItem[]): void;
  insertFront(item: AlertItem): void;
  clear(): void;
  findById(id: string): AlertItem | null;
  updateById(id: string, patch: AlertPatch): AlertItem | null;
}

class InMemoryAlertRepository implements AlertRepository {
  private items: AlertItem[] = [];

  getAll(): AlertItem[] {
    return this.items.map(cloneAlertItem);
  }

  replaceAll(items: AlertItem[]): void {
    this.items = items.map(cloneAlertItem);
  }

  insertFront(item: AlertItem): void {
    this.items.unshift(cloneAlertItem(item));
  }

  clear(): void {
    this.items = [];
  }

  findById(id: string): AlertItem | null {
    const found = this.items.find((item) => item.id === id);
    return found ? cloneAlertItem(found) : null;
  }

  updateById(id: string, patch: AlertPatch): AlertItem | null {
    const index = this.items.findIndex((item) => item.id === id);
    if (index < 0) return null;

    const current = this.items[index];
    const next: AlertItem = {
      ...current,
      ...patch,
      tags: patch.tags ? [...patch.tags] : [...current.tags],
      meta: patch.meta ? { ...patch.meta } : { ...current.meta },
    };

    this.items[index] = next;
    return cloneAlertItem(next);
  }
}

const alertRepository: AlertRepository = new InMemoryAlertRepository();

function cloneAlertItem(item: AlertItem): AlertItem {
  return {
    ...item,
    tags: [...item.tags],
    meta: { ...item.meta },
  };
}

function getStore(): AlertItem[] {
  return alertRepository.getAll();
}

function replaceStore(items: AlertItem[]): void {
  alertRepository.replaceAll(items);
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeTags(tags?: string[]): string[] {
  if (!tags || !Array.isArray(tags)) return [];
  return Array.from(
    new Set(
      tags
        .map((t) => String(t).trim())
        .filter(Boolean)
        .map((t) => t.toUpperCase())
    )
  );
}

function mergeTags(existing: string[] = [], incoming: string[] = []): string[] {
  return normalizeTags([...existing, ...incoming]);
}

function makeId(prefix = "alt"): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

function buildDefaultSource(type: AlertType): string {
  switch (type) {
    case "SCAN_SIGNAL":
      return "scannerEngine";
    case "WATCHLIST_BREAKOUT":
    case "WATCHLIST_PULLBACK":
      return "watchlistEngine";
    case "POSITION_RISK":
      return "positionEngine";
    case "STOP_LOSS_TRIGGERED":
    case "TRAILING_STOP_TRIGGERED":
    case "MONITOR_WARNING":
      return "monitorEngine";
    case "SYSTEM":
      return "system";
    default:
      return "alertEngine";
  }
}

function buildDefaultSeverity(type: AlertType): AlertSeverity {
  switch (type) {
    case "STOP_LOSS_TRIGGERED":
    case "TRAILING_STOP_TRIGGERED":
      return "critical";
    case "POSITION_RISK":
    case "WATCHLIST_BREAKOUT":
    case "WATCHLIST_PULLBACK":
    case "MONITOR_WARNING":
      return "warning";
    case "SCAN_SIGNAL":
    case "SYSTEM":
    case "CUSTOM":
    default:
      return "info";
  }
}

function trimStore(): void {
  const store = getStore();
  if (store.length <= MAX_ALERTS) return;
  replaceStore(store.slice(0, MAX_ALERTS));
}

function severityRank(severity: AlertSeverity): number {
  switch (severity) {
    case "info":
      return 1;
    case "warning":
      return 2;
    case "critical":
      return 3;
    default:
      return 1;
  }
}

function toMillis(iso: string): number | null {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function getCooldownSeconds(input: CreateAlertInput): number {
  const metaCooldown = input.meta?.cooldownSeconds;
  if (typeof metaCooldown === "number" && metaCooldown >= 0) {
    return metaCooldown;
  }
  return DEFAULT_COOLDOWN_SECONDS;
}

function resolveIncomingSeverity(input: CreateAlertInput): AlertSeverity {
  return input.severity ?? buildDefaultSeverity(input.type);
}

function resolveIncomingSource(input: CreateAlertInput): string {
  return input.source ?? buildDefaultSource(input.type);
}

function resolveIncomingSymbol(input: CreateAlertInput): string | undefined {
  return input.symbol?.toUpperCase();
}

/**
 * dedupe 搜尋保留所有狀態，不只 active。
 * 這樣 resolved 後在 cooldown 內仍可保護，不會瞬間重生。
 */
function findLatestByDedupeKey(dedupeKey?: string): AlertItem | null {
  if (!dedupeKey) return null;
  const store = getStore();
  return store.find((a) => a.dedupeKey === dedupeKey) ?? null;
}

function shouldSuppressByCooldown(
  existing: AlertItem | null,
  incoming: CreateAlertInput
): boolean {
  if (!existing || !incoming.dedupeKey) return false;

  const cooldownSeconds = getCooldownSeconds(incoming);
  if (cooldownSeconds <= 0) return false;

  const existingTs = toMillis(existing.timestamp);
  if (existingTs === null) {
    return false;
  }

  const nowTs = Date.now();
  const incomingSeverity = resolveIncomingSeverity(incoming);

  if (severityRank(incomingSeverity) > severityRank(existing.severity)) {
    return false;
  }

  return nowTs - existingTs <= cooldownSeconds * 1000;
}

function mergeEscalatedAlert(
  existing: AlertItem,
  incoming: CreateAlertInput
): AlertItem {
  const nextSeverity = resolveIncomingSeverity(incoming);
  const nextTags = mergeTags(existing.tags, incoming.tags ?? []);
  const nextMeta: AlertSourceMeta = {
    ...existing.meta,
    ...(incoming.meta ?? {}),
  };

  const updated = alertRepository.updateById(existing.id, {
    severity: nextSeverity,
    status: "new",
    timestamp: nowIso(),
    title: incoming.title,
    message: incoming.message,
    source: resolveIncomingSource(incoming),
    tags: nextTags,
    meta: nextMeta,
    symbol: resolveIncomingSymbol(incoming),
    type: incoming.type,
    dedupeKey: incoming.dedupeKey,
  });

  return updated ?? existing;
}

export function createAlert(input: CreateAlertInput): AlertItem {
  const existing = findLatestByDedupeKey(input.dedupeKey);
  const incomingSeverity = resolveIncomingSeverity(input);

  if (existing) {
    if (severityRank(incomingSeverity) > severityRank(existing.severity)) {
      return mergeEscalatedAlert(existing, input);
    }

    if (shouldSuppressByCooldown(existing, input)) {
      return existing;
    }
  }

  const alert: AlertItem = {
    id: makeId(),
    type: input.type,
    severity: incomingSeverity,
    status: "new",
    symbol: resolveIncomingSymbol(input),
    title: input.title,
    message: input.message,
    timestamp: nowIso(),
    source: resolveIncomingSource(input),
    tags: normalizeTags(input.tags),
    meta: { ...(input.meta ?? {}) },
    dedupeKey: input.dedupeKey,
  };

  alertRepository.insertFront(alert);
  trimStore();
  return alert;
}

export function createScannerSignalAlert(input: ScannerAlertInput): AlertItem {
  const symbol = input.symbol.toUpperCase();
  const strategySignal = input.strategySignal ?? "SIGNAL";

  return createAlert({
    type: "SCAN_SIGNAL",
    severity: "info",
    symbol,
    title: `${symbol} 掃描訊號`,
    message:
      `${symbol} 出現掃描訊號：${strategySignal}` +
      (typeof input.radarScore === "number" ? ` | radar=${input.radarScore}` : "") +
      (typeof input.price === "number" ? ` | price=${input.price}` : "") +
      (typeof input.change === "number" ? ` | change=${input.change}%` : "") +
      (input.reason ? ` | reason=${input.reason}` : ""),
    source: "scannerEngine",
    tags: ["SCANNER", "SIGNAL", symbol, ...(input.tags ?? [])],
    meta: {
      engine: "scannerEngine",
      signal: strategySignal,
      radarScore: input.radarScore,
      price: input.price,
      change: input.change,
      reason: input.reason,
      cooldownSeconds: 300,
      ...(input.meta ?? {}),
    },
    dedupeKey: `SCAN_SIGNAL:${symbol}:${strategySignal}`,
  });
}

export function createWatchlistAlert(input: WatchlistAlertInput): AlertItem {
  const symbol = input.symbol.toUpperCase();
  const mode = input.mode ?? "BREAKOUT";
  const type: AlertType =
    mode === "PULLBACK" ? "WATCHLIST_PULLBACK" : "WATCHLIST_BREAKOUT";

  return createAlert({
    type,
    severity: "warning",
    symbol,
    title:
      mode === "PULLBACK"
        ? `${symbol} 自選回踩警報`
        : `${symbol} 自選突破警報`,
    message:
      `${symbol} watchlist 事件：${mode}` +
      (typeof input.price === "number" ? ` | price=${input.price}` : "") +
      (typeof input.change === "number" ? ` | change=${input.change}%` : "") +
      (input.reason ? ` | reason=${input.reason}` : ""),
    source: "watchlistEngine",
    tags: ["WATCHLIST", mode, symbol, ...(input.tags ?? [])],
    meta: {
      engine: "watchlistEngine",
      mode,
      price: input.price,
      change: input.change,
      reason: input.reason,
      cooldownSeconds: 180,
      ...(input.meta ?? {}),
    },
    dedupeKey: `${type}:${symbol}`,
  });
}

export function createPositionRiskAlert(
  input: PositionRiskAlertInput
): AlertItem {
  const symbol = input.symbol.toUpperCase();
  const severity: AlertSeverity =
    input.riskLevel === "critical" ? "critical" : "warning";

  return createAlert({
    type: "POSITION_RISK",
    severity,
    symbol,
    title: `${symbol} 倉位風險警報`,
    message:
      `${symbol} 倉位進入風險區` +
      (typeof input.positionSize === "number"
        ? ` | position=${input.positionSize}`
        : "") +
      (typeof input.entryPrice === "number"
        ? ` | entry=${input.entryPrice}`
        : "") +
      (typeof input.currentPrice === "number"
        ? ` | current=${input.currentPrice}`
        : "") +
      (typeof input.pnlPct === "number" ? ` | pnl=${input.pnlPct}%` : "") +
      (input.reason ? ` | reason=${input.reason}` : ""),
    source: "positionEngine",
    tags: ["POSITION", "RISK", severity.toUpperCase(), symbol, ...(input.tags ?? [])],
    meta: {
      engine: "positionEngine",
      riskLevel: input.riskLevel ?? "warning",
      positionSize: input.positionSize,
      entryPrice: input.entryPrice,
      currentPrice: input.currentPrice,
      pnlPct: input.pnlPct,
      reason: input.reason,
      cooldownSeconds: severity === "critical" ? 30 : 120,
      ...(input.meta ?? {}),
    },
    dedupeKey: `POSITION_RISK:${symbol}`,
  });
}

export function createMonitorTriggerAlert(
  input: MonitorTriggerAlertInput
): AlertItem {
  const symbol = input.symbol.toUpperCase();

  let title = `${symbol} 監控警報`;
  if (input.triggerType === "STOP_LOSS_TRIGGERED") {
    title = `${symbol} 停損觸發`;
  } else if (input.triggerType === "TRAILING_STOP_TRIGGERED") {
    title = `${symbol} 移動停利觸發`;
  } else if (input.triggerType === "MONITOR_WARNING") {
    title = `${symbol} 監控預警`;
  }

  const severity: AlertSeverity =
    input.triggerType === "MONITOR_WARNING" ? "warning" : "critical";

  return createAlert({
    type: input.triggerType,
    severity,
    symbol,
    title,
    message:
      `${symbol} 監控事件：${input.triggerType}` +
      (typeof input.stopPrice === "number" ? ` | stop=${input.stopPrice}` : "") +
      (typeof input.currentPrice === "number"
        ? ` | current=${input.currentPrice}`
        : "") +
      (typeof input.pnlPct === "number" ? ` | pnl=${input.pnlPct}%` : "") +
      (input.reason ? ` | reason=${input.reason}` : ""),
    source: "monitorEngine",
    tags: ["MONITOR", input.triggerType, symbol, ...(input.tags ?? [])],
    meta: {
      engine: "monitorEngine",
      triggerType: input.triggerType,
      stopPrice: input.stopPrice,
      currentPrice: input.currentPrice,
      pnlPct: input.pnlPct,
      reason: input.reason,
      cooldownSeconds: input.triggerType === "MONITOR_WARNING" ? 60 : 10,
      ...(input.meta ?? {}),
    },
    dedupeKey: `${input.triggerType}:${symbol}`,
  });
}

export function getAlerts(query: AlertQuery = {}): AlertItem[] {
  const { type, severity, status, symbol, source, limit } = query;

  let result = getStore();

  if (type) result = result.filter((a) => a.type === type);
  if (severity) result = result.filter((a) => a.severity === severity);
  if (status) result = result.filter((a) => a.status === status);
  if (symbol) result = result.filter((a) => a.symbol === symbol.toUpperCase());
  if (source) result = result.filter((a) => a.source === source);

  if (typeof limit === "number" && limit > 0) {
    result = result.slice(0, limit);
  }

  return result;
}

export function getAlertById(id: string): AlertItem | null {
  return alertRepository.findById(id);
}

export function getLatestAlerts(limit = 20): AlertItem[] {
  return getStore().slice(0, Math.max(0, limit));
}

export function getUnreadAlerts(limit = 20): AlertItem[] {
  return getStore()
    .filter((a) => a.status === "new")
    .slice(0, Math.max(0, limit));
}

export function getAlertsBySymbol(symbol: string, limit = 50): AlertItem[] {
  return getStore()
    .filter((a) => a.symbol === symbol.toUpperCase())
    .slice(0, Math.max(0, limit));
}

export function markAlertAsRead(id: string): AlertItem | null {
  const current = alertRepository.findById(id);
  if (!current) return null;
  if (current.status !== "new") return current;

  return alertRepository.updateById(id, {
    status: "read",
  });
}

export function markAlertAsResolved(id: string): AlertItem | null {
  const current = alertRepository.findById(id);
  if (!current) return null;

  return alertRepository.updateById(id, {
    status: "resolved",
  });
}

export function markAllAlertsAsRead(): number {
  const store = getStore();
  let count = 0;

  const updated = store.map((a) => {
    if (a.status === "new") {
      count += 1;
      return { ...a, status: "read" as AlertStatus };
    }
    return a;
  });

  replaceStore(updated);
  return count;
}

export function clearResolvedAlerts(): number {
  const store = getStore();
  const before = store.length;
  replaceStore(store.filter((a) => a.status !== "resolved"));
  return before - getStore().length;
}

export function clearAllAlerts(): number {
  const removed = getStore().length;
  alertRepository.clear();
  return removed;
}

export function getAlertStats(): AlertStats {
  let newCount = 0;
  let readCount = 0;
  let resolvedCount = 0;
  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  const store = getStore();

  for (const alert of store) {
    if (alert.status === "new") newCount += 1;
    if (alert.status === "read") readCount += 1;
    if (alert.status === "resolved") resolvedCount += 1;

    if (alert.severity === "critical") criticalCount += 1;
    if (alert.severity === "warning") warningCount += 1;
    if (alert.severity === "info") infoCount += 1;
  }

  return {
    total: store.length,
    newCount,
    readCount,
    resolvedCount,
    criticalCount,
    warningCount,
    infoCount,
  };
}

export function seedSystemAlert(
  message = "Alert engine initialized"
): AlertItem {
  return createAlert({
    type: "SYSTEM",
    severity: "info",
    title: "系統警報啟動",
    message,
    source: "alertEngine",
    tags: ["SYSTEM", "INIT"],
    meta: {
      engine: "alertEngine",
      cooldownSeconds: 3600,
    },
    dedupeKey: "SYSTEM:INIT",
  });
}

const alertEngine = {
  createAlert,
  createScannerSignalAlert,
  createWatchlistAlert,
  createPositionRiskAlert,
  createMonitorTriggerAlert,
  getAlerts,
  getAlertById,
  getLatestAlerts,
  getUnreadAlerts,
  getAlertsBySymbol,
  markAlertAsRead,
  markAlertAsResolved,
  markAllAlertsAsRead,
  clearResolvedAlerts,
  clearAllAlerts,
  getAlertStats,
  seedSystemAlert,
};

export default alertEngine;
