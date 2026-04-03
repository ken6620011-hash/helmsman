import express from "express";
import {
  openPosition,
  updatePosition,
  closePosition,
  getPosition,
  listOpenPositions,
  listAllPositions,
  removePosition,
  clearAllPositions,
  getPositionEngineStatus,
} from "../engines/positionEngine";

const router = express.Router();

/**
 * ✅ 新增首頁
 * GET /api/position
 */
router.get("/", (_req, res) => {
  try {
    return res.json({
      ok: true,
      data: {
        engine: getPositionEngineStatus(),
        openPositions: listOpenPositions(),
      },
    });
  } catch (error: any) {
    console.error("❌ position root error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "position root failed",
    });
  }
});

router.get("/status", (_req, res) => {
  try {
    return res.json({
      ok: true,
      data: getPositionEngineStatus(),
    });
  } catch (error: any) {
    console.error("❌ position status error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "position status failed",
    });
  }
});

router.get("/open", (_req, res) => {
  try {
    return res.json({
      ok: true,
      data: listOpenPositions(),
    });
  } catch (error: any) {
    console.error("❌ list open positions error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "list open positions failed",
    });
  }
});

router.get("/all", (_req, res) => {
  try {
    return res.json({
      ok: true,
      data: listAllPositions(),
    });
  } catch (error: any) {
    console.error("❌ list all positions error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "list all positions failed",
    });
  }
});

router.get("/:code", (req, res) => {
  try {
    const code = String(req.params.code || "").trim();

    if (!code) {
      return res.status(400).json({
        ok: false,
        error: "position code is required",
      });
    }

    const position = getPosition(code);

    if (!position) {
      return res.status(404).json({
        ok: false,
        error: "position not found",
        code,
      });
    }

    return res.json({
      ok: true,
      data: position,
    });
  } catch (error: any) {
    console.error("❌ get position error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "get position failed",
    });
  }
});

router.post("/open", (req, res) => {
  try {
    const code = String(req.body?.code || "").trim();
    const name = String(req.body?.name || code).trim();
    const entryPrice = Number(req.body?.entryPrice || 0);
    const quantity = Number(req.body?.quantity || 1);
    const notes = String(req.body?.notes || "").trim();

    if (!code) {
      return res.status(400).json({
        ok: false,
        error: "code is required",
      });
    }

    if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
      return res.status(400).json({
        ok: false,
        error: "entryPrice must be > 0",
      });
    }

    const position = openPosition({
      code,
      name,
      entryPrice,
      quantity,
      notes,
    });

    if (!position) {
      return res.status(400).json({
        ok: false,
        error: "open position failed",
      });
    }

    return res.json({
      ok: true,
      message: "position opened",
      data: position,
    });
  } catch (error: any) {
    console.error("❌ open position error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "open position failed",
    });
  }
});

router.post("/update", (req, res) => {
  try {
    const code = String(req.body?.code || "").trim();
    const currentPrice = Number(req.body?.currentPrice || 0);

    if (!code) {
      return res.status(400).json({
        ok: false,
        error: "code is required",
      });
    }

    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      return res.status(400).json({
        ok: false,
        error: "currentPrice must be > 0",
      });
    }

    const position = updatePosition({
      code,
      currentPrice,
    });

    if (!position) {
      return res.status(404).json({
        ok: false,
        error: "open position not found",
        code,
      });
    }

    return res.json({
      ok: true,
      message: "position updated",
      data: position,
    });
  } catch (error: any) {
    console.error("❌ update position error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "update position failed",
    });
  }
});

router.post("/close", (req, res) => {
  try {
    const code = String(req.body?.code || "").trim();
    const exitPrice = Number(req.body?.exitPrice || 0);
    const exitReason = String(req.body?.exitReason || "manual").trim();

    if (!code) {
      return res.status(400).json({
        ok: false,
        error: "code is required",
      });
    }

    if (!Number.isFinite(exitPrice) || exitPrice <= 0) {
      return res.status(400).json({
        ok: false,
        error: "exitPrice must be > 0",
      });
    }

    const position = closePosition({
      code,
      exitPrice,
      exitReason,
    });

    if (!position) {
      return res.status(404).json({
        ok: false,
        error: "open position not found",
        code,
      });
    }

    return res.json({
      ok: true,
      message: "position closed",
      data: position,
    });
  } catch (error: any) {
    console.error("❌ close position error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "close position failed",
    });
  }
});

router.delete("/:code", (req, res) => {
  try {
    const code = String(req.params.code || "").trim();

    if (!code) {
      return res.status(400).json({
        ok: false,
        error: "position code is required",
      });
    }

    const removed = removePosition(code);

    if (!removed) {
      return res.status(404).json({
        ok: false,
        error: "position not found",
        code,
      });
    }

    return res.json({
      ok: true,
      message: "position removed",
      code,
    });
  } catch (error: any) {
    console.error("❌ remove position error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "remove position failed",
    });
  }
});

router.delete("/", (_req, res) => {
  try {
    clearAllPositions();

    return res.json({
      ok: true,
      message: "all positions cleared",
    });
  } catch (error: any) {
    console.error("❌ clear positions error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "clear positions failed",
    });
  }
});

export default router;
