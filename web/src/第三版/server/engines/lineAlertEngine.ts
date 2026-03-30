
// server/engines/lineAlertEngine.ts

type AlertLevel = "INFO" | "WARN" | "DANGER";

interface LineAlertInput {
  symbol: string;
  name: string;
  decision: string;
  riskLevel: string;
  signalLabel: string;
  stopLossPrice?: number;
  currentPrice?: number;
  reason?: string;
}

function getAlertLevel(input: LineAlertInput): AlertLevel {
  if (input.decision === "EXIT") return "DANGER";
  if (input.signalLabel === "逃命") return "DANGER";
  if (input.signalLabel === "跌破停損") return "DANGER";
  if (input.riskLevel === "HIGH") return "WARN";
  return "INFO";
}

function buildMessage(input: LineAlertInput) {
  const level = getAlertLevel(input);

  const icon =
    level === "DANGER" ? "🆘" :
    level === "WARN" ? "⚠️" :
    "✅";

  return [
    `${icon} Helmsman LINE警報器`,
    `標的：${input.symbol} ${input.name}`,
    `決策：${input.decision}`,
    `風險：${input.riskLevel}`,
    `燈號：${input.signalLabel}`,
    `現價：${input.currentPrice ?? "-"}`,
    `停損：${input.stopLossPrice ?? "-"}`,
    `原因：${input.reason ?? "-"}`,
  ].join("\n");
}

export async function sendLineAlert(input: LineAlertInput) {
  const lineToken = String(process.env.LINE_NOTIFY_TOKEN || "").trim();

  if (!lineToken) {
    return {
      ok: false,
      skipped: true,
      message: "LINE_NOTIFY_TOKEN 未設定",
    };
  }

  const message = buildMessage(input);

  const response = await fetch("https://notify-api.line.me/api/notify", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lineToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      message,
    }).toString(),
  });

  const text = await response.text();

  return {
    ok: response.ok,
    skipped: false,
    status: response.status,
    body: text,
  };
}

