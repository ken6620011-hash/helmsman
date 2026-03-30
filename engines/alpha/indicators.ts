import { MarketSnapshot } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * HCI = Helmsman Cycle Indicator
 * 21點循環：用 20 日動能近似
 */
export function calculateHCI(snapshot: MarketSnapshot): number {
  const prevClose = snapshot.prevClose ?? snapshot.close;
  if (prevClose <= 0) return 0;

  const momentum = (snapshot.close - prevClose) / prevClose;
  const scaled = momentum * 210; // 放大到接近 0~21
  return clamp(Number(scaled.toFixed(2)), 0, 21);
}

/**
 * HTI = Helmsman Temperature Indicator
 * 市場溫度計 / 差值
 */
export function calculateHTI(snapshot: MarketSnapshot): number {
  const ma20 = snapshot.ma20 ?? snapshot.close;
  const ma120 = snapshot.ma120 ?? snapshot.close;
  if (ma120 <= 0) return 0;

  const divergence = (Math.abs(ma20 - ma120) / ma120) * 100;
  return clamp(Number(divergence.toFixed(2)), 0, 200);
}

/**
 * HTE = Helmsman Tension Engine
 * 張力 = 溫度增量
 */
export function calculateHTE(currentHTI: number, previousHTI: number): number {
  return Number((currentHTI - previousHTI).toFixed(2));
}

/**
 * HCR = Helmsman Chip Retention
 * 籌碼沉澱：量縮越明顯越高
 */
export function calculateHCR(snapshot: MarketSnapshot): number {
  const ma20Volume = snapshot.ma20Volume ?? snapshot.volume;
  if (ma20Volume <= 0) return 0;

  const volumeRatio = snapshot.volume / ma20Volume;
  const retention = 1 - volumeRatio;
  return clamp(Number((retention * 100).toFixed(2)), -100, 100);
}

/**
 * HRI = Helmsman Resonance Index
 * 族群共振
 */
export function calculateHRI(snapshot: MarketSnapshot): number {
  const signalCount = snapshot.sectorSignalCount ?? 0;
  const totalCount = snapshot.sectorTotalCount ?? 1;
  if (totalCount <= 0) return 0;

  const ratio = signalCount / totalCount;
  return clamp(Number((ratio * 100).toFixed(2)), 0, 100);
}

/**
 * HRS = Helmsman Relative Strength
 * 相對強度 = 個股3月報酬 - 族群3月報酬
 */
export function calculateHRS(snapshot: MarketSnapshot): number {
  const stockReturn = snapshot.stockReturn3m ?? 0;
  const sectorReturn = snapshot.sectorReturn3m ?? 0;
  return Number((stockReturn - sectorReturn).toFixed(2));
}

/**
 * HMV = Helmsman Market Weather
 * 市場環境分數
 */
export function calculateHMV(snapshot: MarketSnapshot): number {
  let score = 50;

  const indexChange = snapshot.marketIndexChange ?? 0;
  const breadth = snapshot.marketBreadth ?? 0.5;
  const volatility = snapshot.marketVolatility ?? 25;

  if (indexChange > 1) score += 15;
  if (breadth > 0.6) score += 15;
  if (volatility < 20) score += 10;

  if (indexChange < -1) score -= 20;
  if (breadth < 0.4) score -= 10;
  if (volatility > 35) score -= 10;

  return clamp(Number(score.toFixed(2)), 0, 100);
}

/**
 * HLV = Helmsman Liquidity Value
 * 流動性分數
 */
export function calculateHLV(snapshot: MarketSnapshot): number {
  const volume = snapshot.volume;
  const marketCap = snapshot.marketCap ?? 0;

  let score = 30;

  if (volume > 10_000_000) score += 35;
  else if (volume > 5_000_000) score += 25;
  else if (volume > 1_000_000) score += 15;

  if (marketCap > 100_000_000_000) score += 20;
  else if (marketCap > 10_000_000_000) score += 10;

  return clamp(score, 0, 100);
}
