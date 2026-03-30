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

type AutoAlertStatus = {
  running: boolean;
  busy: boolean;
  enabled: boolean;
  intervalMs: number;
  lastRunAt: number | null;
  lastSuccessAt: number | null;
  lastMessage: string;
  pushReady: boolean;
};

let timer: NodeJS.Timeout | null = null;
let isRunning = false;
let currentConfig: AutoAlertConfig | null = null;
let lastRunAt: number | null = null;
let lastSuccessAt: number | null = null;
let lastMessage = "尚未啟動";

function safeMs(v: unknown, fallback = 300000): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(60000, Math.floor(n));
}

function normalizeConfig(config: AutoAlertConfig): AutoAlertConfig {
  return {
    enabled: Boolean(config.enabled),
    intervalMs: safeMs(config.intervalMs, 300000),
    linePushToken: String(config.linePushToken || "").trim(),
    lineUserId: String(config.lineUserId || "").trim(),
  };
}

function buildPushText(rows: any[]): string {
  if (!rows.length) {
    return "🔕 Helmsman 自動警報\n\n本輪無符合警報標的";
  }

  const lines: string[] = [];
  lines.push("🚨 Helmsman 自動警報");
  lines.push("");

  rows.slice(0, 5).forEach((x: any, i: number) => {
    const score = Number(x?.score ?? 0);
    const action = String(x?.action ?? "觀望");
    const level = String(x?.level ?? "NONE");
    const code = String(x?.code ?? "未知");
    const name = String(x?.name ?? code);
    const reason = String(x?.reason ?? "無");
    const marketState = String(x?.marketState ?? "未知");

    lines.push(`${i + 1}. ${code} ${name} | Score:${score} | ${action} | ${level}`);
    lines.push(`   市場：${marketState}`);
    lines.push(`   原因：${reason}`);
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
  rawConfig: AutoAlertConfig
): Promise<AutoAlertRunResult> {
  const config = normalizeConfig(rawConfig);

  if (!config.enabled) {
    lastMessage = "自動警報未啟用";
    return {
      ok: true,
      scanned: 0,
      alerts: 0,
      pushed: 0,
      message: lastMessage,
    };
  }

  if (!config.linePushToken || !config.lineUserId) {
    lastMessage = "LINE push token 或 userId 空白";
    return {
      ok: false,
      scanned: 0,
      alerts: 0,
      pushed: 0,
      message: lastMessage,
    };
  }

  lastRunAt = Date.now();

  const result = await runAlertTestEngine();
  const alertRows = result.rows.filter((x) => x.shouldAlert);

  if (!alertRows.length) {
    lastSuccessAt = Date.now();
    lastMessage = "本輪無符合警報標的";
    return {
      ok: true,
      scanned: result.total,
      alerts: 0,
      pushed: 0,
      message: lastMessage,
    };
  }

  const text = buildPushText(alertRows);
  await pushLineMessage(config.linePushToken, config.lineUserId, text);

  lastSuccessAt = Date.now();
  lastMessage = "LINE 自動警報已送出";

  return {
    ok: true,
    scanned: result.total,
    alerts: alertRows.length,
    pushed: 1,
    message: lastMessage,
  };
}

async function tick() {
  if (!currentConfig) {
    lastMessage = "autoAlert config missing";
    return;
  }

  if (isRunning) {
    console.log("⏸ autoAlert skipped: previous run still active");
    return;
  }

  try {
    isRunning = true;
    const result = await runAutoAlertOnce(currentConfig);
    console.log("⏰ autoAlert tick:", result);
  } catch (error: any) {
    const detail = error?.response?.data || error?.message || error;
    lastMessage = `autoAlert error: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`;
    console.error("❌ autoAlert error:", detail);
  } finally {
    isRunning = false;
  }
}

export function startAutoAlert(rawConfig: AutoAlertConfig) {
  const config = normalizeConfig(rawConfig);
  currentConfig = config;

  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  if (!config.enabled) {
    lastMessage = "autoAlert disabled";
    console.log("⏸ autoAlert disabled");
    return;
  }

  console.log(`⏰ autoAlert started: every ${config.intervalMs} ms`);

  // 啟動後 3 秒跑第一輪，避免剛啟動就搶資源
  setTimeout(() => {
    void tick();
  }, 3000);

  timer = setInterval(() => {
    void tick();
  }, config.intervalMs);
}

export function stopAutoAlert() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  currentConfig = null;
  isRunning = false;
  lastMessage = "autoAlert stopped";
  console.log("🛑 autoAlert stopped");
}

export function restartAutoAlert(config: AutoAlertConfig) {
  stopAutoAlert();
  startAutoAlert(config);
}

export function getAutoAlertStatus(): AutoAlertStatus {
  return {
    running: Boolean(timer),
    busy: isRunning,
    enabled: Boolean(currentConfig?.enabled),
    intervalMs: Number(currentConfig?.intervalMs || 0),
    lastRunAt,
    lastSuccessAt,
    lastMessage,
    pushReady: Boolean(
      currentConfig?.linePushToken && currentConfig?.lineUserId
    ),
  };
}
