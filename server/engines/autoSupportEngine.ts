import getSupport from "./supportEngine";

type AutoSupportConfig = {
  symbols: string[];
  intervalMs: number;
};

let timer: NodeJS.Timeout | null = null;
let running = false;
let busy = false;

const defaultConfig: AutoSupportConfig = {
  symbols: ["2308", "2317", "2330", "2454", "3034"],
  intervalMs: 300000,
};

export async function runAutoSupportOnce(config = defaultConfig) {
  if (busy) return;

  busy = true;

  try {
    for (const code of config.symbols) {
      try {
        const support = await getSupport(code);

        console.log(
          `✅ ${code} 支撐更新`,
          JSON.stringify({
            supportPrice: support.supportPrice,
            supportDays: support.supportDays,
            structureBroken: support.structureBroken,
          })
        );
      } catch (err) {
        console.error(`❌ ${code} 支撐計算失敗`, err);
      }
    }

    console.log(`🟣 AutoSupport 完成 ${new Date().toLocaleString()}`);
  } finally {
    busy = false;
  }
}

export function startAutoSupport(config = defaultConfig) {
  if (running) return;

  running = true;

  timer = setInterval(() => {
    runAutoSupportOnce(config);
  }, config.intervalMs);

  console.log("🟢 AutoSupport 已啟動");
}

export function stopAutoSupport() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  running = false;
  console.log("🔴 AutoSupport 已停止");
}

export function getAutoSupportStatus() {
  return {
    running,
    busy,
  };
}
