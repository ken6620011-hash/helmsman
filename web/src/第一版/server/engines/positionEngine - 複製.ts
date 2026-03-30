// app/ai-stock-app/server/engines/positionEngine.ts

export interface Position {
  symbol: string
  name?: string

  entryPrice: number
  quantity: number

  currentPrice: number
  highestPrice: number

  stopLoss: number
  trailingPercent: number

  createdAt: number
  updatedAt: number

  status: "OPEN" | "CLOSED"
  exitPrice?: number
  exitReason?: string
  closedAt?: number
}

let positions: Position[] = []

function now(): number {
  return Date.now()
}

function normalizeSymbol(symbol: string): string {
  return String(symbol || "").trim().toUpperCase()
}

function findOpenPosition(symbol: string): Position | undefined {
  const s = normalizeSymbol(symbol)
  return positions.find(
    (p) => normalizeSymbol(p.symbol) === s && p.status === "OPEN"
  )
}

export function getPositions(): Position[] {
  return positions
}

export function setPositions(nextPositions: Position[]): Position[] {
  positions = Array.isArray(nextPositions) ? nextPositions : []
  return positions
}

export function addPosition(input: {
  symbol: string
  name?: string
  entryPrice: number
  quantity: number
  currentPrice?: number
  stopLoss?: number
  trailingPercent?: number
}): Position {
  const symbol = normalizeSymbol(input.symbol)
  const existing = findOpenPosition(symbol)
  if (existing) return existing

  const entryPrice = Number(input.entryPrice)
  const quantity = Number(input.quantity)
  const currentPrice = Number(input.currentPrice ?? entryPrice)
  const trailingPercent = Number(input.trailingPercent ?? 0.1)
  const stopLoss = Number(input.stopLoss ?? entryPrice * (1 - trailingPercent))
  const ts = now()

  const position: Position = {
    symbol,
    name: input.name || symbol,
    entryPrice,
    quantity,
    currentPrice,
    highestPrice: currentPrice > entryPrice ? currentPrice : entryPrice,
    stopLoss,
    trailingPercent,
    createdAt: ts,
    updatedAt: ts,
    status: "OPEN",
  }

  positions.push(position)
  return position
}

export function updatePrice(symbol: string, price: number): Position | null {
  const position = findOpenPosition(symbol)
  if (!position) return null

  const nextPrice = Number(price)
  position.currentPrice = nextPrice

  if (nextPrice > position.highestPrice) {
    position.highestPrice = nextPrice
    position.stopLoss = position.highestPrice * (1 - position.trailingPercent)
  }

  position.updatedAt = now()
  return position
}

export function updatePositionPrice(
  symbol: string,
  price: number
): Position | null {
  return updatePrice(symbol, price)
}

export function updateStopLoss(
  symbol: string,
  stopLoss: number
): Position | null {
  const position = findOpenPosition(symbol)
  if (!position) return null

  position.stopLoss = Number(stopLoss)
  position.updatedAt = now()
  return position
}

export function updatePositionStopLoss(
  symbol: string,
  stopLoss: number
): Position | null {
  return updateStopLoss(symbol, stopLoss)
}

export function closePosition(
  symbol: string,
  arg2?: number | string,
  arg3?: string
): Position | null {
  const position = findOpenPosition(symbol)
  if (!position) return null

  let exitPrice: number | undefined
  let reason: string | undefined

  if (typeof arg2 === "number") {
    exitPrice = arg2
    reason = typeof arg3 === "string" ? arg3 : undefined
  } else if (typeof arg2 === "string") {
    reason = arg2
  }

  if (typeof exitPrice === "number" && !Number.isNaN(exitPrice)) {
    position.currentPrice = exitPrice
    position.exitPrice = exitPrice
  } else {
    position.exitPrice = position.currentPrice
  }

  position.exitReason = reason
  position.status = "CLOSED"
  position.closedAt = now()
  position.updatedAt = position.closedAt

  return position
}

export function removePosition(symbol: string): Position[] {
  const s = normalizeSymbol(symbol)
  positions = positions.filter((p) => normalizeSymbol(p.symbol) !== s)
  return positions
}

export function clearPositions(): Position[] {
  positions = []
  return positions
}
