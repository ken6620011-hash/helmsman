import { SCAN_SYMBOLS } from "./marketDataEngine";
import { buildDecisionBatch } from "./helmsmanCoreEngine";

/**
 * Backtest Engine（封板版）
 *
 * ✅ 責任：
 * - 根據 decision 做「模擬」
 *
 * ❌ 禁止：
 * - 不可產生 decision
 * - 不可改 decision
 * - 不可定義新的買點
 */

type Row = {
  code: string;
  name: string;

  score: number;
  breakout: number;
  supportDays: number;

  action: string;
  marketState: string;

  entrySignal: boolean;
  simulatedReturn: number;
  win: boolean;
};

function isTriggered(d: any): boolean {
  if (d.marketState === "防守" || d.marketState === "修正") return false;

  if (d.action === "進場") return true;

  if (d.action === "續看" && d.score >= 65 && d.breakout >= 60) return true;

  return false;
}

/**
 * 模擬報酬（⚠️ 非決策）
 */
function simulate(d: any): number {
  let base =
    d.score * 0.05 +
    d.breakout * 0.04 +
    d.supportDays * 0.8 -
    6;

  if (d.action === "進場") base += 2;

  return Number(base.toFixed(2));
}

export async function runBacktest() {
  const decisions = await buildDecisionBatch(SCAN_SYMBOLS);

  const rows: Row[] = [];

  for (const d of decisions) {
    const trigger = isTriggered(d);

    const ret = trigger ? simulate(d) : 0;

    rows.push({
      code: d.code,
      name: d.name,

      score: d.score,
      breakout: d.breakout,
      supportDays: d.supportDays,

      action: d.action,
      marketState: d.marketState,

      entrySignal: trigger,
      simulatedReturn: ret,
      win: ret > 0,
    });
  }

  return {
    summary: {
      total: rows.length,
      triggered: rows.filter((r) => r.entrySignal).length,
    },
    rows,
  };
}

export async function runBacktestText() {
  const result = await runBacktest();

  const lines: string[] = [];

  lines.push("📘 Helmsman 回測結果");
  lines.push(`總樣本：${result.summary.total}`);
  lines.push(`觸發筆數：${result.summary.triggered}`);
  lines.push("");

  result.rows
    .filter((x) => x.entrySignal)
    .slice(0, 10)
    .forEach((x, i) => {
      lines.push(
        `${i + 1}. ${x.code} ${x.name} | Score:${x.score} | 起爆:${x.breakout} | 報酬:${x.simulatedReturn}%`
      );
    });

  return lines.join("\n");
}
