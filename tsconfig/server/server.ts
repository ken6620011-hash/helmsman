import express from "express";
import { Request, Response } from "express";

import { getMarketWeather } from "./weatherEngine";
import { getRadarData } from "./radarEngine";
import { getScannerResults } from "./scannerEngine";

const app = express();
const PORT = 3000;

/* =========================
   Root
========================= */

app.get("/", (_req: Request, res: Response) => {
  res.send("Helmsman API is running");
});

/* =========================
   Health
========================= */

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    system: "Helmsman AI",
    version: "v1"
  });
});

/* =========================
   Market Weather
========================= */

app.get("/api/weather", (_req: Request, res: Response) => {
  res.json(getMarketWeather());
});

/* =========================
   Radar
========================= */

app.get("/api/radar", (_req: Request, res: Response) => {
  res.json({
    items: getRadarData()
  });
});

/* =========================
   Scanner
========================= */

app.get("/api/scanner", (_req: Request, res: Response) => {
  res.json({
    items: getScannerResults()
  });
});

/* =========================
   Start Server
========================= */

app.listen(PORT, () => {
  console.log(`Helmsman API running on port ${PORT}`);
});
