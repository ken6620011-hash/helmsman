export type MarketState = "攻擊" | "觀望" | "防守" | "修正";

export type ActionType = "進場" | "觀望" | "續看" | "出場";

export type RiskLevel = "低" | "中" | "高";

export interface Decision {
  code: string;
  name: string;

  price: number;
  change: number;
  changePercent: number;
  sector: string;

  score: number;
  readiness: number;

  action: ActionType;
  risk: RiskLevel;
  trend: string;

  marketState: MarketState;
  marketStateScore: number;
  marketStateReason: string;

  structure: string;
  platform: string;
  supportDays: number;
  supportStatus: string;
  supportReason: string;

  breakout: number;

  entryType: string;
  entryTime: string;
  entryReason: string;

  stopLoss: number;
  takeProfit: number;
  trailingStop: number;

  strengths: string[];
  blockers: string[];

  hci: number;
  hrs: number;
  hti: number;
  hpq: number;

  dataValid: boolean;
  dataWarning: string;
}
