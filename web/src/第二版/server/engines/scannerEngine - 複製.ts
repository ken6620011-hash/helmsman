import { runBacktest } from "./backtestEngine";

interface Stock {
  symbol: string;
  name: string;
  HCI: number;
  HTI: number;
}

const stocks: Stock[] = [
  { symbol: "NVDA", name: "輝達", HCI: 18, HTI: 55 },
  { symbol: "MSFT", name: "微軟", HCI: 17, HTI: 61 },
  { symbol: "AVGO", name: "博通", HCI: 16, HTI: 52 },
  { symbol: "AMD", name: "AMD", HCI: 15, HTI: 58 },
  { symbol: "TSM", name: "英式積電", HCI: 13, HTI: 48 },
  { symbol: "QQQ", name: "QQQ", HCI: 11, HTI: 87 },
];

function getStatus(HCI: number, HTI: number) {
  if (HTI > 85) return "OVERHEATED";
  if (HCI >= 12 && HCI <= 18 && HTI >= 25 && HTI <= 70) return "AWAKENING";
  if (HCI >= 15 && HTI >= 40 && HTI <= 70) return "CONFIRMED";
  return "SLEEPING";
}

function getAction(status: string, ev: number) {
  if (status === "OVERHEATED") return "減碼";
  if (status === "CONFIRMED" && ev > 1) return "買";
  if (status === "AWAKENING") return "準備";
  return "觀察";
}

function getPosition(winRate: number) {
  if (winRate >= 85) return "50%";
  if (winRate >= 75) return "30%";
  if (winRate >= 65) return "15%";
  return "5%";
}

export function runScanner() {
  const results = stocks.map((s) => {
    const bt = runBacktest({
      HCI_min: s.HCI - 1,
      HCI_max: s.HCI + 1,
      HTI_min: s.HTI - 5,
      HTI_max: s.HTI + 5,
    });

    const status = getStatus(s.HCI, s.HTI);
    const action = getAction(status, bt.ev);
    const position = getPosition(bt.winRate);

    return {
      symbol: s.symbol,
      name: s.name,
      HCI: s.HCI,
      HTI: s.HTI,
      winRate: bt.winRate,
      avgReturn: bt.avgReturn,
      risk: bt.maxDrawdown,
      ev: bt.ev,
      status,
      action,
      position,
    };
  });

  return results.sort((a, b) => b.ev - a.ev);
}
