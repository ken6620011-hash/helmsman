import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { runScanner } from "./engines/scannerEngine";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from "./engines/watchlistEngine";
import {
  getPositions,
  addPosition,
  updatePositionPrice,
  updatePositionStopLoss,
  closePosition,
} from "./engines/positionEngine";
import {
  startMonitor,
  stopMonitor,
  getMonitorStatus,
} from "./engines/monitorEngine";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// ===== Health =====
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    apiKeyLoaded: true,
  });
});

// ===== Scanner =====
app.get("/api/scanner", (_req, res) => {
  try {
    const data = runScanner();
    return res.json(data);
  } catch (err) {
    console.error("scanner failed:", err);
    return res.status(500).json({ error: "scanner failed" });
  }
});

// ===== Watchlist =====
app.get("/api/watchlist", (_req, res) => {
  try {
    return res.json(getWatchlist());
  } catch (err) {
    console.error("get watchlist failed:", err);
    return res.status(500).json({ error: "get watchlist failed" });
  }
});

app.post("/api/watchlist", (req, res) => {
  try {
    const { symbol } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: "symbol is required" });
    }

    const result = addToWatchlist(symbol);
    return res.json(result);
  } catch (err) {
    console.error("add watchlist failed:", err);
    return res.status(500).json({ error: "add watchlist failed" });
  }
});

app.delete("/api/watchlist/:symbol", (req, res) => {
  try {
    const symbol = req.params.symbol;
    const result = removeFromWatchlist(symbol);
    return res.json(result);
  } catch (err) {
    console.error("remove watchlist failed:", err);
    return res.status(500).json({ error: "remove watchlist failed" });
  }
});

// ===== Positions =====
app.get("/api/positions", (_req, res) => {
  try {
    return res.json(getPositions());
  } catch (err) {
    console.error("get positions failed:", err);
    return res.status(500).json({ error: "get positions failed" });
  }
});

app.post("/api/positions", (req, res) => {
  try {
    const {
      symbol,
      name,
      entryPrice,
      quantity,
      currentPrice,
      stopLoss,
      trailingPercent,
    } = req.body;

    if (!symbol || entryPrice === undefined || quantity === undefined) {
      return res.status(400).json({
        error: "symbol, entryPrice, quantity are required",
      });
    }

    const result = addPosition({
      symbol,
      name,
      entryPrice: Number(entryPrice),
      quantity: Number(quantity),
      currentPrice:
        currentPrice !== undefined ? Number(currentPrice) : undefined,
      stopLoss: stopLoss !== undefined ? Number(stopLoss) : undefined,
      trailingPercent:
        trailingPercent !== undefined ? Number(trailingPercent) : undefined,
    });

    return res.json(result);
  } catch (err) {
    console.error("add position failed:", err);
    return res.status(500).json({ error: "add position failed" });
  }
});

app.patch("/api/positions/:symbol/price", (req, res) => {
  try {
    const symbol = req.params.symbol;
    const { price } = req.body;

    if (price === undefined) {
      return res.status(400).json({ error: "price is required" });
    }

    const result = updatePositionPrice(symbol, Number(price));

    if (!result) {
      return res.status(404).json({ error: "position not found" });
    }

    return res.json(result);
  } catch (err) {
    console.error("update position price failed:", err);
    return res.status(500).json({ error: "update position price failed" });
  }
});

app.patch("/api/positions/:symbol/stoploss", (req, res) => {
  try {
    const symbol = req.params.symbol;
    const { stopLoss } = req.body;

    if (stopLoss === undefined) {
      return res.status(400).json({ error: "stopLoss is required" });
    }

    const result = updatePositionStopLoss(symbol, Number(stopLoss));

    if (!result) {
      return res.status(404).json({ error: "position not found" });
    }

    return res.json(result);
  } catch (err) {
    console.error("update stop loss failed:", err);
    return res.status(500).json({ error: "update stop loss failed" });
  }
});

app.delete("/api/positions/:symbol", (req, res) => {
  try {
    const symbol = req.params.symbol;
    const result = closePosition(symbol, undefined, "MANUAL_CLOSE");

    if (!result) {
      return res.status(404).json({ error: "position not found" });
    }

    return res.json(result);
  } catch (err) {
    console.error("close position failed:", err);
    return res.status(500).json({ error: "close position failed" });
  }
});

// ===== Monitor =====
app.post("/api/monitor/start", (_req, res) => {
  try {
    const result = startMonitor();
    return res.json(result);
  } catch (err) {
    console.error("start monitor failed:", err);
    return res.status(500).json({ error: "start monitor failed" });
  }
});

app.post("/api/monitor/stop", (_req, res) => {
  try {
    const result = stopMonitor();
    return res.json(result);
  } catch (err) {
    console.error("stop monitor failed:", err);
    return res.status(500).json({ error: "stop monitor failed" });
  }
});

app.get("/api/monitor/status", (_req, res) => {
  try {
    const result = getMonitorStatus();
    return res.json(result);
  } catch (err) {
    console.error("get monitor status failed:", err);
    return res.status(500).json({ error: "get monitor status failed" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Helmsman server running at http://localhost:${PORT}`);
});
