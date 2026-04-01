import express from "express";
import runFusion from "../engines/fusionEngine";
import { buildStockOutput } from "../services/outputService";

const router = express.Router();

router.get("/:code", async (req, res) => {
  try {
    const code = String(req.params.code || "").trim();

    if (!code) {
      return res.status(400).json({
        ok: false,
        message: "stock code is required",
      });
    }

    const fusion = await runFusion({ code });
    const output = buildStockOutput(code, fusion.quote, fusion.model);

    return res.json({
      ok: true,
      data: output,
    });
  } catch (error: any) {
    console.error("❌ stockRoutes error:", error);

    return res.status(500).json({
      ok: false,
      message: error?.message || "stock route failed",
    });
  }
});

export default router;
