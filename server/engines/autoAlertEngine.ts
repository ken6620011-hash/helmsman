import axios from "axios";
import { runAlertTestEngine } from "./alertTestEngine";

export type AutoAlertConfig = {
  enabled: boolean;
  intervalMs: number;
  linePushToken: string;
  lineUserId: string;
};

export type AutoAlertRunResult = {
  ok: boolean;
  scanned: number;
  alerts: number;
  pushed: number;
  message: string;
};

let timer: NodeJS.Timeout | null = null;
let isRunning = false;

function buildPushText(rows: any[]): string {
  if (!rows.length) {
    return "🔕 自動警報\n\n本輪無符合警報標的";
  }

  const lines: string[] = [];
  lines.push("🚨 Helmsman 自動警報");
  lines.push("");

  rows.slice(0, 5).forEach((x: any, i: number) => {
    lines.push(
      `${i + 1}. ${x.code} ${x.name} | Score:${x.score} | ${x.action} | ${x.level}`
    );
    lines.push(
      `   起爆:${x.breakout} | 守穩:${x.supportDays}天 | 市場:${x.marketState}`
    );
    lines.push(`   判定：${x.reason}`);
  });

  return lines.join("\n");
}

async function pushLineMessage(
  channelAccessToken: string,
  to: string,
  text: string
) {
  await axios.post(
    "https://api.line.me/v2/bot/message/push",
    {
      to,
      messages: [
        {
          type: "text",
          text,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );
}

export async function runAutoAlertOnce(
  config: AutoAlertConfig
): Promise<AutoAlertRunResult> {
  if (!config.enabled) {
    return {
      ok: true,
      scanned: 0,
      alerts: 0,
      pushed: 0,
      message: "自動警報未啟用",
    };
  }

  if (!config.linePushToken || !config.lineUserId) {
    return {
      ok: false,
      scanned: 0,
      alerts: 0,
      pushed: 0,
      message: "LINE push token 或 userId 空白",
    };
  }

  const result = await runAlertTestEngine();
  const alertRows = result.rows.filter((x) => x.shouldAlert);

  if (!alertRows.length) {
    return {
      ok: true,
      scanned: result.total,
      alerts: 0,
      pushed: 0,
      message: "本輪無符合警報標的",
    };
  }

  const text = buildPushText(alertRows);
  await pushLineMessage(config.linePushToken, config.lineUserId, text);

  return {
    ok: true,
    scanned: result.total,
    alerts: alertRows.length,
    pushed: 1,
    message: "LINE 自動警報已送出",
  };
}

export function startAutoAlert(config: AutoAlertConfig) {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  if (!config.enabled) {
    console.log("⏸ autoAlert disabled");
    return;
  }

  const intervalMs = Math.max(config.intervalMs, 60_000);

  console.log(`⏰ autoAlert started: every ${intervalMs} ms`);

  timer = setInterval(async () => {
    if (isRunning) return;

    try {
      isRunning = true;
      const result = await runAutoAlertOnce(config);
      console.log("autoAlert:", result.message, result);
    } catch (error: any) {
      console.error("autoAlert error:", error?.response?.data || error?.message || error);
    } finally {
      isRunning = false;
    }
  }, intervalMs);
}

export function stopAutoAlert() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log("🛑 autoAlert stopped");
  }
}

export function getAutoAlertStatus() {
  return {
    running: Boolean(timer),
    busy: isRunning,
  };
}
