import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = 8787;

/* 市場天氣 */
app.get("/api/market/weather", (req, res) => {
  res.json({
    market: "Bullish",
    sentiment: "Greed",
    volatility: "Medium"
  });
});

/* 產業資金流 */
app.get("/api/market/sector-flow", (req, res) => {
  res.json([
    {
      sector: "半導體",
      heat: 85,
      leader: "NVDA",
      aiSignal: "BUY"
    },
    {
      sector: "軟體",
      heat: 78,
      leader: "MSFT",
      aiSignal: "BUY"
    },
    {
      sector: "消費科技",
      heat: 72,
      leader: "AAPL",
      aiSignal: "HOLD"
    },
    {
      sector: "網際網路",
      heat: 75,
      leader: "META",
      aiSignal: "BUY"
    }
  ]);
});

/* 機會掃描 */
app.get("/api/market/opportunities", (req, res) => {
  res.json([
    {
      symbol: "NVDA",
      name: "輝達",
      sector: "半導體",
      radarScore: 92,
      change: 2.4
    },
    {
      symbol: "AVGO",
      name: "博通",
      sector: "半導體",
      radarScore: 88,
      change: 1.8
    },
    {
      symbol: "TSM",
      name: "台積電",
      sector: "半導體",
      radarScore: 86,
      change: 1.3
    },
    {
      symbol: "AMD",
      name: "超微",
      sector: "半導體",
      radarScore: 84,
      change: 1.1
    }
  ]);
});

/* Heatmap */
app.get("/api/market/heatmap", (_req, res) => {
  res.json([
    {
      symbol: "NVDA",
      name: "輝達",
      sector: "半導體",
      radarScore: 92,
      change: 2.4
    },
    {
      symbol: "AVGO",
      name: "博通",
      sector: "半導體",
      radarScore: 88,
      change: 1.8
    },
    {
      symbol: "TSM",
      name: "台積電",
      sector: "半導體",
      radarScore: 86,
      change: 1.3
    },
    {
      symbol: "AMD",
      name: "超微",
      sector: "半導體",
      radarScore: 84,
      change: 1.1
    }
  ]);
});

/* 股票快照（Scanner 用） */
app.get("/api/market/snapshots", (req, res) => {
  res.json({
    data: [
      {
        symbol: "NVDA",
        sector: "AI / Semiconductor",
        price: 875,
        changePct: 2.4,
        radarScore: 92,
        momentumScore: 90,
        trendScore: 88,
        volumeScore: 85,
        strategySignal: "Buy Setup"
      },
      {
        symbol: "AVGO",
        sector: "AI / Semiconductor",
        price: 1320,
        changePct: 1.8,
        radarScore: 88,
        momentumScore: 86,
        trendScore: 84,
        volumeScore: 80,
        strategySignal: "Watch Setup"
      },
      {
        symbol: "TSM",
        sector: "Semiconductor",
        price: 160,
        changePct: 1.2,
        radarScore: 82,
        momentumScore: 80,
        trendScore: 78,
        volumeScore: 75,
        strategySignal: "Watch"
      }
    ]
  });
});

app.listen(PORT, () => {
  console.log(
    `Helmsman mock market proxy running on http://127.0.0.1:${PORT}`
  );
});
