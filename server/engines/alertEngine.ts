// 🔥 Alert Gate 封板版（單一決策源 + 去重 + 冷卻 + 穩定輸出）

import { runScanner } from "./scannerEngine";
import { pushText } from "../services/lineReplyService";

type AlertKey = string;

type AlertState = {
  lastHash: string;
  lastSentAt: number;
};

const ALERT_STATE = new Map<AlertKey, AlertState>();

// 🔥 冷卻時間（毫秒）— 可自行調整
const COOLDOWN_MS = 5 * 60 * 1000; // 5 分鐘

// 🔥 是否啟用空訊號提示（可關閉避免打擾）
const ENABLE_EMPTY_NOTIFY = false;

// 🔥 建立唯一 key（避免不同標的混淆）
function buildKey(code: string): AlertKey {
  return `ALERT:${code}`;
}

// 🔥 生成訊號 hash（避免重複發送）
function buildHash(row: any): string {
  return [
    row.code,
    row.score,
    row.action,
    row.risk,
    Math.round(Number(row.pct ?? 0) * 100) / 100,
  ].join("|");
}

// 🔥 是否允許發送（冷卻 + 去重）
function shouldSend(key: AlertKey, hash: string): boolean {
  const now = Date.now();
  const state = ALERT_STATE.get(key);

  if (!state) return true;

  // ❌ 冷卻中
  if (now - state.lastSentAt < COOLDOWN_MS) {
    return false;
  }

  // ❌ 完全相同訊號
  if (state.lastHash === hash) {
    return false;
  }

  return true;
}

// 🔥 更新狀態
function updateState(key: AlertKey, hash: string) {
  ALERT_STATE.set(key, {
    lastHash: hash,
    lastSentAt: Date.now(),
  });
}

// 🔥 是否為可警報訊號（決策門檻）
function isAlertable(row: any): boolean {
  if (!row) return false;

  if (Number(row.score) < 60) return false;

  const blocked = ["防守", "觀望", "出場", "禁止", "禁止進場"];
  if (blocked.includes(String(row.action))) return false;

  return true;
}

// 🔥 格式化輸出
function buildAlertText(row: any): string {
  const pct = Number(row.pct ?? 0);
  return [
    "🚨 即時警報",
    `${row.code} ${row.name}`,
    `Score：${row.score}`,
    `指令：${row.action}`,
    `風險：${row.risk}`,
    `漲跌幅：${pct >= 0 ? "+" : ""}${pct}%`,
  ].join("\n");
}

// 🔥 主流程（外部呼叫這個）
export async function runAlert(): Promise<void> {
  console.log("🔥 ALERT GATE RUN");

  const rows = await runScanner();

  // ===== 沒有機會 =====
  if (!rows || rows.length === 0) {
    console.log("🟡 ALERT：無可警報標的");

    if (ENABLE_EMPTY_NOTIFY) {
      await pushText("🟡 目前無可警報機會股");
    }

    return;
  }

  let sentCount = 0;

  for (const row of rows) {
    try {
      if (!isAlertable(row)) continue;

      const key = buildKey(row.code);
      const hash = buildHash(row);

      if (!shouldSend(key, hash)) {
        console.log(`⏸ 跳過（冷卻/重複）：${row.code}`);
        continue;
      }

      const text = buildAlertText(row);

      await pushText(text);

      updateState(key, hash);
      sentCount++;

      console.log(`✅ ALERT SENT：${row.code}`);
    } catch (err) {
      console.error("❌ ALERT ERROR:", err);
    }
  }

  console.log(`📊 ALERT 完成：發送 ${sentCount} 筆`);
}
