// 🔥 Alert Test Engine（對齊 Alert Gate）

import { runScanner } from "./scannerEngine";

export type AlertTestRow = {
  code: string;
  name: string;
  score: number;
  action: string;
  risk: string;
  pct: number;
  shouldAlert: boolean;
  reason: string;
  marketState?: string;
};

export type AlertTestResult = {
  total: number;
  rows: AlertTestRow[];
};

function shouldAlert(row: any): boolean {
  if (!row) return false;

  if (Number(row.score) < 60) return false;

  const blocked = ["防守", "觀望", "出場", "禁止", "禁止進場"];
  if (blocked.includes(String(row.action))) return false;

  return true;
}

export async function runAlertTestEngine(): Promise<AlertTestResult> {
  console.log("🔥 ALERT TEST ENGINE");

  const rows = await runScanner();

  const mapped: AlertTestRow[] = rows.map((x: any) => ({
    code: String(x?.code || ""),
    name: String(x?.name || ""),
    score: Number(x?.score || 0),
    action: String(x?.action || "觀望"),
    risk: String(x?.risk || "中"),
    pct: Number(x?.pct ?? 0),
    shouldAlert: shouldAlert(x),
    reason: String(x?.reason || ""),
    marketState: x?.marketState,
  }));

  return {
    total: mapped.length,
    rows: mapped,
  };
}
