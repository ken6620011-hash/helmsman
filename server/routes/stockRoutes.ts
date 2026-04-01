import express from "express";
import runFusion from "../engines/fusionEngine";
import {
  buildStockOutput,
  buildStockReplyText,
  isValidQuote,
} from "../services/outputService";

const router = express.Router();

router.get("/:code", async (req, res) => {
  try {
    const code = String(req.params.code || "").trim();

    if (!code) {
      return res.status(400).json({
        ok: false,
        error: "stock code is required",
      });
    }

    const fusion = await runFusion({ code });

    if (!isValidQuote(fusion.quote)) {
      return res.status(404).json({
        ok: false,
        error: "quote not found",
        code,
        data: fusion.quote,
      });
    }

    const output = buildStockOutput(
      code,
      fusion.quote,
      fusion.model,
      fusion.position,
      fusion.hasPosition
    );

    const report = buildStockReplyText(output);

    return res.json({
      ok: true,
      data: output,
      report,
    });
  } catch (error: any) {
    console.error("❌ stock route error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "internal server error",
    });
  }
});

export default router;
