import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.send("🚀 Helmsman 運作中");
});

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "Helmsman",
    status: "running",
    mode: "routes-split",
  });
});

export default router;
