import { SCAN_SYMBOLS, getKbars, getQuote } from "./marketDataEngine";
import { calculateSupportFromBars } from "./supportEngine";
import { setSupportCache, getAllSupportCache } from "./supportCacheEngine";

type AutoSupportConfig = {
  enabled: boolean;
  intervalMs: number;
  symbols?: string[];
  kbarDays?: number;
};

let timer: NodeJS.Timeout | null = null;
let isRunning = false;

function nowText(): string {
  return new Date().toLocaleString("zh-TW", { hour12: false });
}

function normalizeSymbols(input?: string[]): string[] {
  const list = Array.isArray(input) && input.length > 0 ? input : SCAN_SYMBOLS;
  return Array.from(
    new Set(
      list.map((x) => String(x || "").trim()).filter(Boolean)
    )
  );
}

export async function runAutoSupportOnce(config?: Partial<AutoSupportConfig>) {
  if (isRunning) {
    console.log("⏳ AutoSupport 忙碌中，略過");
    return;
  }

  isRunning = true;

  try {
    const symbols = normalizeSymbols(config?.symbols);
    const kbarDays = Number(config?.kbarDays || 20);

    console.log(`🧠 AutoSupport 開始更新 ${symbols.length} 檔`, nowText());

    for (const code of symbols) {
      try {
        const [bars, quote] = await Promise.all([
          getKbars(code, kbarDays),
          getQuote(code),
        ]);

        if (!Array.isArray(bars) || bars.length < 5) {
          console.log(`⚠️ ${code} K棒不足，跳過`);
          continue;
        }

        const support = calculateSupportFromBars(
          bars.map((b) => ({
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
          })),
          quote.price
        );

        setSupportCache(code, {
          supportPrice: support.supportPrice,
          supportDays: support.supportDays,
          structureBroken: support.structureBroken,
          confidence: support.confidence,
          sourceLowCount: support.sourceLowCount,
          reason: support.reason,
        });

        console.log(
          `✅ ${code} 支撐更新`,
          JSON.stringify({
            supportPrice: support.supportPrice,
            supportDays: support.supportDays,
            structureBroken: support.structureBroken,
          })
        );
      } catch (err) {
        console.error(`❌ ${code} 支撐更新失敗`, err);
      }
    }

    console.log("🧠 AutoSupport 完成", nowText());
  } finally {
    isRunning = false;
  }
}

export function startAutoSupport(config: AutoSupportConfig) {
  if (!config.enabled) {
    console.log("⛔ AutoSupport 未啟用");
    return;
  }

  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  const intervalMs = Number(config.intervalMs || 300000);
  console.log(`⏰ AutoSupport 啟動，間隔 ${intervalMs} ms`);

  runAutoSupportOnce(config).catch((err) => {
    console.error("❌ AutoSupport 初次執行失敗", err);
  });

  timer = setInterval(() => {
    runAutoSupportOnce(config).catch((err) => {
      console.error("❌ AutoSupport 排程執行失敗", err);
    });
  }, intervalMs);
}

export function stopAutoSupport() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  console.log("🛑 AutoSupport 已停止");
}

export function getAutoSupportStatus() {
  return {
    running: !!timer,
    busy: isRunning,
    cached: getAllSupportCache().length,
  };
}
