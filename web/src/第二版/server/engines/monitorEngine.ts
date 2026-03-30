// app/ai-stock-app/server/engines/monitorEngine.ts

import {
  getPositions,
  updatePrice,
  updateStopLoss,
  closePosition,
  Position,
} from "./positionEngine"

export interface MonitorLog {
  type: "START" | "STOP" | "PRICE" | "TRAILING" | "CLOSE" | "EMERGENCY"
  symbol?: string
  message: string
  price?: number
  stopLoss?: number
  timestamp: number
}

export interface MonitorStatus {
  started: boolean
  intervalMs: number
  trailingEnabled: boolean
  lastRunAt: number | null
  watchingCount: number
}

type PriceMap = Record<string, number>

let started = false
let intervalMs = 5000
let trailingEnabled = true
let lastRunAt: number | null = null
let timer: NodeJS.Timeout | null = null
let latestPrices: PriceMap = {}
let logs: MonitorLog[] = []

function now(): number {
  return Date.now()
}

function normalizeSymbol(symbol: string): string {
  return String(symbol || "").trim().toUpperCase()
}

function pushLog(log: Omit<MonitorLog, "timestamp">) {
  logs.unshift({
    ...log,
    timestamp: now(),
  })

  if (logs.length > 200) {
    logs = logs.slice(0, 200)
  }
}

export function getOpenPositions(): Position[] {
  return getPositions().filter((p) => p.status === "OPEN")
}

export function updatePosition(symbol: string, price: number): Position | null {
  return updatePrice(symbol, price)
}

export function getRecentLogs(limit = 20): MonitorLog[] {
  return logs.slice(0, limit)
}

export function getMonitorLogs(limit = 20): MonitorLog[] {
  return getRecentLogs(limit)
}

export function clearMonitorLogs(): MonitorLog[] {
  logs = []
  return logs
}

export function getLatestPrices(): PriceMap {
  return latestPrices
}

export function setLatestPrice(symbol: string, price: number): PriceMap {
  latestPrices[normalizeSymbol(symbol)] = Number(price)

  pushLog({
    type: "PRICE",
    symbol: normalizeSymbol(symbol),
    message: `price=${Number(price)}`,
    price: Number(price),
  })

  return latestPrices
}

export function setLatestPrices(priceMap: PriceMap): PriceMap {
  for (const [symbol, price] of Object.entries(priceMap || {})) {
    latestPrices[normalizeSymbol(symbol)] = Number(price)
  }
  return latestPrices
}

export function getMonitorStatus(): MonitorStatus {
  return {
    started,
    intervalMs,
    trailingEnabled,
    lastRunAt,
    watchingCount: getOpenPositions().length,
  }
}

export function runMonitorCycle(): Position[] {
  const openPositions = getOpenPositions()
  const closed: Position[] = []

  for (const position of openPositions) {
    const symbol = normalizeSymbol(position.symbol)
    const latestPrice = latestPrices[symbol]

    if (typeof latestPrice !== "number" || Number.isNaN(latestPrice)) {
      continue
    }

    const beforeStopLoss = position.stopLoss
    const updated = updatePrice(symbol, latestPrice)

    if (!updated) continue

    if (trailingEnabled && updated.stopLoss !== beforeStopLoss) {
      pushLog({
        type: "TRAILING",
        symbol,
        message: "trailing stop updated",
        price: latestPrice,
        stopLoss: updated.stopLoss,
      })
    }

    if (latestPrice <= updated.stopLoss) {
      const closedPosition = closePosition(
        symbol,
        latestPrice,
        "TRAILING_STOP_TRIGGERED"
      )

      if (closedPosition) {
        closed.push(closedPosition)

        pushLog({
          type: "CLOSE",
          symbol,
          message: "position closed by trailing stop",
          price: latestPrice,
          stopLoss: updated.stopLoss,
        })
      }
    }
  }

  lastRunAt = now()
  return closed
}

export function startMonitoring(options?: {
  intervalMs?: number
  trailingEnabled?: boolean
}): MonitorStatus {
  if (typeof options?.intervalMs === "number" && options.intervalMs > 0) {
    intervalMs = options.intervalMs
  }

  if (typeof options?.trailingEnabled === "boolean") {
    trailingEnabled = options.trailingEnabled
  }

  if (timer) {
    clearInterval(timer)
    timer = null
  }

  timer = setInterval(() => {
    runMonitorCycle()
  }, intervalMs)

  started = true

  pushLog({
    type: "START",
    message: "monitor started",
  })

  return getMonitorStatus()
}

export function stopMonitoring(): MonitorStatus {
  if (timer) {
    clearInterval(timer)
    timer = null
  }

  started = false

  pushLog({
    type: "STOP",
    message: "monitor stopped",
  })

  return getMonitorStatus()
}

export function emergencyStop(): MonitorStatus {
  if (timer) {
    clearInterval(timer)
    timer = null
  }

  started = false

  pushLog({
    type: "EMERGENCY",
    message: "emergency stop",
  })

  return getMonitorStatus()
}

export function restartMonitoring(options?: {
  intervalMs?: number
  trailingEnabled?: boolean
}): MonitorStatus {
  stopMonitoring()
  return startMonitoring(options)
}

export function updateMonitorConfig(config: {
  intervalMs?: number
  trailingEnabled?: boolean
}): MonitorStatus {
  if (typeof config.intervalMs === "number" && config.intervalMs > 0) {
    intervalMs = config.intervalMs
  }

  if (typeof config.trailingEnabled === "boolean") {
    trailingEnabled = config.trailingEnabled
  }

  if (started) {
    return restartMonitoring({
      intervalMs,
      trailingEnabled,
    })
  }

  return getMonitorStatus()
}

export function forceUpdateStopLoss(
  symbol: string,
  stopLoss: number
): Position | null {
  return updateStopLoss(symbol, stopLoss)
}

// server.ts 相容別名
export function startMonitor(options?: {
  intervalMs?: number
  trailingEnabled?: boolean
}): MonitorStatus {
  return startMonitoring(options)
}

export function stopMonitor(): MonitorStatus {
  return stopMonitoring()
}
