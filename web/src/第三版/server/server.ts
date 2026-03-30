import "dotenv/config";
import express from "express";
import cors from "cors";

import { runScanner } from "./engines/scannerEngine";
import {
  getFinmindTokenStatus,
  hasFinmindToken,
  setFinmindToken,
} from "./config/tokenStore";

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "Helmsman server",
    port: PORT,
  });
});

app.get("/api/token/status", (_req, res) => {
  try {
    res.json({
      success: true,
      ...getFinmindTokenStatus(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "token status error",
    });
  }
});

app.post("/api/token/set", (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "token required",
      });
    }

    setFinmindToken(token);

    return res.json({
      success: true,
      message: "token updated",
      ...getFinmindTokenStatus(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "set token error",
    });
  }
});

app.get("/api/scanner", async (_req, res) => {
  try {
    if (!hasFinmindToken()) {
      return res.status(400).json({
        success: false,
        message: "FinMind token not set",
      });
    }

    const result = await runScanner();

    return res.json({
      success: true,
      scanner: result,
    });
  } catch (error) {
    console.error("[/api/scanner] error:", error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "scanner error",
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Helmsman running on http://localhost:${PORT}`);
});
