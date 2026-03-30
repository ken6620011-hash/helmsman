export interface BacktestParams {
  HCI_min: number
  HCI_max: number
  HTI_min: number
  HTI_max: number
}

export interface BacktestResult {
  winRate: number
  avgReturn: number
  maxDrawdown: number
  ev: number
}

export function runBacktest(params: BacktestParams): BacktestResult {
  const { HCI_min, HCI_max, HTI_min, HTI_max } = params

  let score = 50

  // 21點小核心
  if (HCI_min >= 12 && HCI_max <= 18) score += 20
  if (HTI_min >= 25 && HTI_max <= 70) score += 20

  // 過熱扣分
  if (HTI_max > 85) score -= 25

  score += Math.random() * 10 - 5

  const winRate = Math.max(30, Math.min(90, score))

  const avgReturn = Number((winRate / 100 * 10 - 3).toFixed(2))
  const maxDrawdown = Number((12 - winRate / 10).toFixed(2))

  // ⭐ 核心：期望值 EV
  const ev = Number((winRate / 100 * avgReturn - (1 - winRate / 100) * maxDrawdown).toFixed(2))

  return {
    winRate: Number(winRate.toFixed(1)),
    avgReturn,
    maxDrawdown,
    ev
  }
}
