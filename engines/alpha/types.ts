export interface MarketSnapshot {
  symbol: string;
  date?: string;

  close: number;
  prevClose?: number;
  volume: number;

  sector: string;
  sectorSignalCount?: number;
  sectorTotalCount?: number;
  sectorReturn3m?: number;
  stockReturn3m?: number;

  ma20?: number;
  ma120?: number;
  ma20Volume?: number;

  marketIndexChange?: number;
  marketBreadth?: number;
  marketVolatility?: number;

  narrativeScore?: number;
  marketCap?: number;
}

export interface AlphaIndicators {
  HCI: number; // 21點循環
  HTI: number; // 市場溫度計 / 差值
  HTE: number; // 張力
  HCR: number; // 籌碼沉澱
  HRI: number; // 族群共振
  HRS: number; // 相對強度
  HMV: number; // 市場環境
  HLV: number; // 流動性
}

export interface AlphaScores {
  technical: number;
  capitalFlow: number;
  emotion: number;
  fundamental: number;
  radarScore: number;
}

export interface AlphaResult {
  symbol: string;
  indicators: AlphaIndicators;
  scores: AlphaScores;
  signal: "ACCUMULATION" | "MOMENTUM" | "BREAKOUT" | "WATCH" | "RISK_OFF";
  confidence: number;
  explanation: string;
}
