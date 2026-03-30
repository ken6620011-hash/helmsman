// 支撐守穩驗證模組

export interface SupportResult {
  daysHeld: number
  isStable: boolean
  description: string
}

export function analyzeSupport(prices: number[]): SupportResult {
  if (prices.length < 5) {
    return {
      daysHeld: 0,
      isStable: false,
      description: "資料不足"
    }
  }

  const recent = prices.slice(-5)
  const min = Math.min(...recent)
  const max = Math.max(...recent)

  const range = (max - min) / min

  const isStable = range < 0.03

  return {
    daysHeld: 5,
    isStable,
    description: isStable
      ? "支撐守穩5天以上，主力測試通過"
      : "支撐不穩，仍在震盪"
  }
}
// 起爆判斷模組

export interface BreakoutResult {
  isBreakout: boolean
  strength: number
}

export function analyzeBreakout(prices: number[]): BreakoutResult {
  if (prices.length < 10) {
    return {
      isBreakout: false,
      strength: 0
    }
  }

  const last = prices[prices.length - 1]
  const prevMax = Math.max(...prices.slice(-10, -1))

  const isBreakout = last > prevMax

  return {
    isBreakout,
    strength: isBreakout ? 80 : 20
  }
}
import { analyzeSupport } from "./supportEngine"
import { analyzeBreakout } from "./breakoutEngine"

export interface HCIResult {
  score: number
  structure: string
  platform: string
  support: string
  supportDesc: string
  breakout: string
  entry: string
}

export function analyzeHCI(prices: number[]): HCIResult {
  const support = analyzeSupport(prices)
  const breakout = analyzeBreakout(prices)

  const last = prices[prices.length - 1]
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length

  const structure = last > avg ? "上升" : "盤整"

  const platform = Math.abs(last - avg) / avg < 0.03
    ? "平台上"
    : "偏離平台"

  let score = 40

  if (support.isStable) score += 20
  if (breakout.isBreakout) score += 20

  return {
    score,
    structure,
    platform,
    support: support.isStable ? "穩定" : "不穩",
    supportDesc: support.description,
    breakout: breakout.isBreakout ? "已突破" : "未突破",
    entry: breakout.isBreakout ? "可觀察進場" : "暫不進場"
  }
}
import { analyzeHCI } from "./hciEngine"

export interface ModelResult {
  score: number
  trend: string
  risk: string
  hci: any
}

export function runModel(prices: number[]): ModelResult {
  const hci = analyzeHCI(prices)

  let score = hci.score

  let trend = "盤整"
  let risk = "中"

  if (score >= 60) {
    trend = "偏多"
    risk = "低"
  } else if (score <= 40) {
    trend = "弱勢"
    risk = "高"
  }

  return {
    score,
    trend,
    risk,
    hci
  }
}
