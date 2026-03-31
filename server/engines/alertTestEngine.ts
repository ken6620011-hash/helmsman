import { runScanner } from "./scannerEngine";
import { runAlertEngine } from "./alertEngine";

export type AlertTestRow = {
  code: string;
  name: string;
  score: number;
  action: string;
  breakout: number;
  supportDays: number;
  marketState: string;
  shouldAlert: boolean;
  level: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  reason: string;
  title: string;
  message: string;
};

export type AlertTestResult = {
  total: number;
  alertCount: number;
  rows: AlertTestRow[];
};

function normalizeScannerRow(x: any) {
  return {
    code: String(x?.code ?? "未知"),
    name: String(x?.name ?? x?.code ?? "未知"),
    price: Number(x?.price ?? 0),
    change: Number(x?.change ?? 0),
    changePercent: Number(x?.changePercent ?? x?.pct ?? 0),
    sector: String(x?.sector ?? "未知"),

    score: Number(x?.score ?? 0),
    action: String(x?.action ?? "觀望"),
    risk: String(x?.risk ?? "未知"),
    trend: String(x?.trend ?? "未知"),

    breakout: Number(x?.breakout ?? 0),
    supportDays: Number(x?.supportDays ?? 0),

    marketState: String(x?.marketState ?? "觀望"),
    readiness: Number(x?.readiness ?? 0),

    dataValid: Boolean(x?.dataValid ?? false),
    dataWarning: String(x?.dataWarning ?? ""),
  };
}

function sortRows(rows: AlertTestRow[]): AlertTestRow[] {
  const levelRank: Record<string, number> = {
    HIGH: 4,
    MEDIUM: 3,
    LOW: 2,
    NONE: 1,
  };

  return rows.sort((a, b) => {
    const l = levelRank[b.level] - levelRank[a.level];
    if (l !== 0) return l;
    if (b.score !== a.score) return b.score - a.score;
    if (b.breakout !== a.breakout) return b.breakout - a.breakout;
    return b.supportDays - a.supportDays;
  });
}

export async function runAlertTestEngine(): Promise<AlertTestResult> {
  const scannerRows = await runScanner();
  const rows: AlertTestRow[] = [];

  for (const raw of scannerRows) {
    try {
      const x = normalizeScannerRow(raw);
      const alert = runAlertEngine(x);

      rows.push({
        code: x.code,
        name: x.name,
        score: x.score,
        action: x.action,
        breakout: x.breakout,
        supportDays: x.supportDays,
        marketState: x.marketState,
        shouldAlert: alert.shouldAlert,
        level: alert.level,
        reason: alert.reason,
        title: alert.title,
        message: alert.message,
      });
    } catch (error) {
      console.log("alert test error:", raw?.code, error);

    }
  }

  const sorted = sortRows(rows);

  return {
    total: sorted.length,
    alertCount: sorted.filter((x) => x.shouldAlert).length,
    rows: sorted,
  };
}

export async function runAlertTestText(): Promise<string> {
  const result = await runAlertTestEngine();

  if (!result.rows.length) {
    return "🔕 警報測試\n\n目前 scanner 無符合標的";
  }

  const lines: string[] = [];
  lines.push("🔕 警報測試結果");
  lines.push(`總筆數：${result.total}`);
  lines.push(`可警報：${result.alertCount}`);
  lines.push("");

  result.rows.slice(0, 10).forEach((x, i) => {
    lines.push(
      `${i + 1}. ${x.code} ${x.name} | Score:${x.score} | ${x.action} | ${x.level}`
    );
    lines.push(
      `   起爆:${x.breakout} | 守穩:${x.supportDays}天 | 市場:${x.marketState}`
    );
    lines.push(`   判定：${x.shouldAlert ? "發警報" : "不通知"} | 原因：${x.reason}`);
  });

  return lines.join("\n");
}
