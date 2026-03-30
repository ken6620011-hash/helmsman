import { runBacktest } from "./backtestEngine";

interface Stock {
  symbol: string;
  name: string;
  HCI: number;
  HTI: number;
  HRS: number;
  HPQ: number;
  Volume: number;
  Breakout: number;
  Fundamentals: number;
}

type HelmsmanAction = "BUY" | "PREPARE" | "WATCH" | "REDUCE";

const stocks: Stock[] = [
  {
    symbol: "NVDA",
    name: "輝達",
    HCI: 18,
    HTI: 55,
    HRS: 82,
    HPQ: 70,
    Volume: 76,
    Breakout: 74,
    Fundamentals: 92,
  },
  {
    symbol: "MSFT",
    name: "微軟",
    HCI: 17,
    HTI: 61,
    HRS: 80,
    HPQ: 68,
    Volume: 70,
    Breakout: 71,
    Fundamentals: 90,
  },
  {
    symbol: "AVGO",
    name: "博通",
    HCI: 16,
    HTI: 52,
    HRS: 75,
    HPQ: 64,
    Volume: 66,
    Breakout: 68,
    Fundamentals: 86,
  },
  {
    symbol: "AMD",
    name: "AMD",
    HCI: 15,
    HTI: 58,
    HRS: 73,
    HPQ: 62,
    Volume: 69,
    Breakout: 65,
    Fundamentals: 78,
  },
  {
    symbol: "TSM",
    name: "台積電",
    HCI: 13,
    HTI: 48,
    HRS: 69,
    HPQ: 58,
    Volume: 60,
    Breakout: 55,
    Fundamentals: 95,
  },
  {
    symbol: "QQQ",
    name: "QQQ",
    HCI: 11,
    HTI: 87,
    HRS: 52,
    HPQ: 40,
    Volume: 91,
    Breakout: 45,
    Fundamentals: 75,
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeHCI(HCI: number) {
  return clamp((HCI / 21) * 100, 0, 100);
}

function calculateScore(input: {
  HCI: number;
  HRS: number;
  HPQ: number;
  Volume: number;
  HTI: number;
  Breakout: number;
  Fundamentals: number;
}) {
  const score =
    0.2 * normalizeHCI(input.HCI) +
    0.2 * input.HRS +
    0.15 * input.HPQ +
    0.15 * input.Volume +
    0.15 * input.HTI +
    0.1 * input.Breakout +
    0.05 * input.Fundamentals;

  return Number(score.toFixed(2));
}

function mapScoreToAction(score: number): HelmsmanAction {
  if (score >= 80) return "BUY";
  if (score >= 65) return "PREPARE";
  if (score >= 50) return "WATCH";
  return "REDUCE";
}

function getStatus(HCI: number, HTI: number) {
  if (HTI > 85) return "OVERHEATED";
  if (HCI >= 12 && HCI <= 18 && HTI >= 25 && HTI <= 70) return "AWAKENING";
  if (HCI >= 15 && HTI >= 40 && HTI <= 70) return "CONFIRMED";
  return "SLEEPING";
}

function getActionLabel(action: HelmsmanAction) {
  if (action === "BUY") return "買";
  if (action === "PREPARE") return "準備";
  if (action === "WATCH") return "觀察";
  return "減碼";
}

function getPosition(action: HelmsmanAction, HTI: number) {
  if (HTI > 90) return "30%";

  if (action === "BUY") return "20%~30%";
  if (action === "PREPARE") return "10%";
  if (action === "WATCH") return "3%";
  return "2%";
}

function getRiskLevel(HTI: number) {
  if (HTI >= 85) return "HIGH";
  if (HTI >= 65) return "MEDIUM";
  return "LOW";
}

export function runScanner() {
  const results = stocks.map((s) => {
    const bt = runBacktest({
      HCI_min: Math.max(0, s.HCI - 1),
      HCI_max: Math.min(21, s.HCI + 1),
      HTI_min: Math.max(0, s.HTI - 5),
      HTI_max: Math.min(100, s.HTI + 5),
    });

    const status = getStatus(s.HCI, s.HTI);
    const score = calculateScore({
      HCI: s.HCI,
      HRS: s.HRS,
      HPQ: s.HPQ,
      Volume: s.Volume,
      HTI: s.HTI,
      Breakout: s.Breakout,
      Fundamentals: s.Fundamentals,
    });

    const action = mapScoreToAction(score);
    const actionLabel = getActionLabel(action);
    const position = getPosition(action, s.HTI);
    const riskLevel = getRiskLevel(s.HTI);

    return {
      symbol: s.symbol,
      name: s.name,

      HCI: s.HCI,
      HTI: s.HTI,
      HRS: s.HRS,
      HPQ: s.HPQ,
      volumeSurge: s.Volume,
      breakoutQuality: s.Breakout,
      fundamentals: s.Fundamentals,

      score,
      decision: action,
      action: actionLabel,

      winRate: bt.winRate,
      avgReturn: bt.avgReturn,
      risk: bt.maxDrawdown,
      ev: bt.ev,

      status,
      riskLevel,
      position,
    };
  });

  return results.sort((a, b) => b.score - a.score);
}
