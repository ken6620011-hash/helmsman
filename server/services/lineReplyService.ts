import axios from "axios";

function maskToken(token: string): string {
  if (!token) return "(empty)";
  if (token.length <= 12) return `${token.slice(0, 3)}***${token.slice(-2)}`;
  return `${token.slice(0, 6)}***${token.slice(-6)}`;
}

function getLineToken(): string {
  return String(process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();
}

function logTokenStatus() {
  const token = getLineToken();

  console.log("===== LINE TOKEN CHECK =====");
  console.log("LINE_CHANNEL_ACCESS_TOKEN exists:", !!token);
  console.log("LINE_CHANNEL_ACCESS_TOKEN length:", token.length);
  console.log("LINE_CHANNEL_ACCESS_TOKEN preview:", maskToken(token));
  console.log("============================");
}

export async function replyText(
  replyToken: string,
  text: string
): Promise<{ ok: boolean; status?: number; message?: string; data?: any }> {
  const token = getLineToken();

  logTokenStatus();
  console.log("replyToken exists:", !!replyToken);
  console.log("reply text:", text);

  if (!token) {
    console.log("❌ LINE reply blocked: token missing");
    return {
      ok: false,
      message: "LINE token missing",
    };
  }

  if (!replyToken) {
    console.log("❌ LINE reply blocked: replyToken missing");
    return {
      ok: false,
      message: "replyToken missing",
    };
  }

  try {
    const response = await axios.post(
      "https://api.line.me/v2/bot/message/reply",
      {
        replyToken,
        messages: [
          {
            type: "text",
            text,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    console.log("✅ LINE reply success:", response.status);

    return {
      ok: true,
      status: response.status,
      data: response.data,
    };
  } catch (err: any) {
    console.log("❌ LINE reply error FULL:");

    if (err?.response) {
      console.log("status:", err.response.status);
      console.log("data:", err.response.data);
      return {
        ok: false,
        status: err.response.status,
        data: err.response.data,
        message: "reply failed",
      };
    }

    console.log("error:", err?.message || err);

    return {
      ok: false,
      message: err?.message || "reply failed",
    };
  }
}
