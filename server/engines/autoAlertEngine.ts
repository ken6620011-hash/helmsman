import axios from "axios";
import runFusion from "./fusionEngine";
import runAlertEngine from "./alertEngine";
import { listOpenPositions } from "./positionEngine";

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

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function buildPushText(messages: string[]): string {
  if (!messages.length) {
    return "🔕 Helmsman 自動出場掃描\n\n本輪無出場事件";
  }

  const lines: string[] = [];
  lines.push("🚨 Helmsman 自動出場通知");
  lines.push("");

  messages.slice(0, 5).forEach((msg, i) => {
    lines.push(`【${i + 1}】`);
    lines.push(msg);

    if (i < Math.min(messages.length, 5) - 1) {
      lines.push("");
    }
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

  const openPositions = listOpenPositions();

  if (!openPositions.length) {
    return {
      ok: true,
      scanned: 0,
      alerts: 0,
      pushed: 0,
      message: "目前沒有持倉，略過自動掃描",
    };
  }

  const exitMessages: string[] = [];
  let scanned = 0;

  for (const pos of openPositions) {
    const code = normalizeText(pos.code);
    if (!code) continue;

    try {
      const fusion = await runFusion({ code });

      const alertResult = runAlertEngine({
        code: fusion.quote.symbol,
        name: fusion.quote.name,

        price: fusion.quote.price,
        change: fusion.quote.change,
        changePercent: fusion.quote.pct,

        action: fusion.model.action,
        finalAction: fusion.model.finalAction,
        riskLevel: fusion.model.risk,
        score: fusion.model.finalScore ?? fusion.model.score,

        reason: fusion.model.reason,
        riskReason: fusion.model.riskReason,

        shouldExit: fusion.model.shouldExit,
        canHold: fusion.model.canHold,

        stopLossPrice: fusion.model.stopLossPrice,
        trailingStopActive: fusion.model.trailingStopActive,
        trailingStopPrice: fusion.model.trailingStopPrice,
        trailingStopRule: fusion.model.trailingStopRule,

        priceStopStatus: fusion.model.priceStopStatus,
        structureBroken: fusion.model.structureBroken,

        supportPrice: fusion.model.supportPrice,
        supportDays: fusion.model.supportDays,

        point21Value: fusion.model.point21Value,
        diffValue: fusion.model.diffValue,
        upperBound: fusion.model.upperBound,

        hasPosition: fusion.hasPosition,
        marketState: fusion.model.marketState,
      });

      scanned += 1;

      if (
        alertResult.triggered &&
        alertResult.eventType === "EXIT_ALERT" &&
        alertResult.message
      ) {
        exitMessages.push(alertResult.message);
      }
    } catch (error: any) {
      console.error(`❌ autoAlert scan failed: ${code}`, error?.message || error);
    }
  }

  if (!exitMessages.length) {
    return {
      ok: true,
      scanned,
      alerts: 0,
      pushed: 0,
      message: "本輪無出場事件",
    };
  }

  const text = buildPushText(exitMessages);
  await pushLineMessage(config.linePushToken, config.lineUserId, text);

  return {
    ok: true,
    scanned,
    alerts: exitMessages.length,
    pushed: 1,
    message: "LINE 自動出場通知已送出",
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
      console.error(
        "autoAlert error:",
        error?.response?.data || error?.message || error
      );
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
