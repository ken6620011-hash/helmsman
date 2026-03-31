import express from "express";
import dotenv from "dotenv";

import stockRoutes from "./routes/stockRoutes";
import scannerRoutes from "./routes/scannerRoutes";
import webhookRoutes from "./routes/webhookRoutes";
import healthRoutes from "./routes/healthRoutes";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

app.use("/", healthRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/scanner", scannerRoutes);
app.use("/webhook", webhookRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Helmsman 已啟動：${PORT}`);
  console.log("📦 server.ts（已拆分版）");
});

