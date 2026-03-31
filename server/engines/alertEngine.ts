/**
 * Alert Engine（封板版）
 *
 * ✅ 責任：
 * - 根據「最終 decision」判定是否發警報
 *
 * ❌ 禁止：
 * - 不可重新計算 decision
 * - 不可用 score 自行當作買點
 * - 不可新增第二套邏輯
 *
 * ⚠️ Alert = Decision 的延伸，不是 Decision
 */

type AlertLevel = "HIGH" | "MEDIUM" | "LOW" | "NONE";

type AlertResult = {
  shouldAlert: boolean;
  level: AlertLevel;
  reason: string;
  title: string;
  message: string;
};

export function runAlertEngine(d: any): AlertResult {
  if (!d || !d.dataValid) {
    return {
      shouldAlert: false,
      level: "NONE",
      reason: "資料無效",
      title: "",
      message: "",
    };
  }

  /**
   * 🚫 Gate 1：市場控盤
   */
  if (d.marketState === "防守" || d.marketState === "修正") {
    return {
      shouldAlert: false,
      level: "NONE",
      reason: "市場防守/修正，不發警報",
      title: "",
      message: "",
    };
  }

  /**
   * 🚫 Gate 2：高風險
   */
  if (d.risk === "高") {
    return {
      shouldAlert: false,
      level: "NONE",
      reason: "風險過高",
      title: "",
      message: "",
    };
  }

  /**
   * ✅ HIGH：正式進場
   */
  if (d.action === "進場") {
    return {
      shouldAlert: true,
      level: "HIGH",
      reason: "決策為進場",
      title: `🔥 進場訊號｜${d.code} ${d.name}`,
      message: `Score:${d.score}｜起爆:${d.breakout}｜市場:${d.marketState}`,
    };
  }

  /**
   * 🟡 MEDIUM：接近進場
   */
  if (d.action === "續看" && d.score >= 65 && d.breakout >= 60) {
    return {
      shouldAlert: true,
      level: "MEDIUM",
      reason: "接近進場條件",
      title: `⚠️ 接近起爆｜${d.code} ${d.name}`,
      message: `Score:${d.score}｜起爆:${d.breakout}`,
    };
  }

  /**
   * 🔵 LOW：觀察
   */
  if (d.action === "續看") {
    return {
      shouldAlert: true,
      level: "LOW",
      reason: "條件尚未成熟",
      title: `👀 觀察｜${d.code} ${d.name}`,
      message: `Score:${d.score}`,
    };
  }

  return {
    shouldAlert: false,
    level: "NONE",
    reason: "無警報條件",
    title: "",
    message: "",
  };
}
