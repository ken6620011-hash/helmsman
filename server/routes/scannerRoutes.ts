import { Router } from "express";
import { runScanner } from "../engines/scannerEngine";
import { buildScannerText } from "../services/outputService";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const rows = await runScanner();

    console.log(
      "SCANNER:",
      rows.map((x: any) => `${x?.code}:${x?.score}:${x?.pct}`)
    );

    return res.json({
      ok: true,
      count: Array.isArray(rows) ? rows.length : 0,
      data: rows,
      report: buildScannerText(rows),
    });
  } catch (err: any) {
    console.log("api scanner error:", err?.message || err);

    return res.status(500).json({
      ok: false,
      message: "api scanner error",
    });
  }
});

export default router;
