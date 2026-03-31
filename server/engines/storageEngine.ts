
import fs from "fs";
import path from "path";

type AlertRecord = {
  code: string;
  lastAlertTime: number;
  lastHash: string;
};

type StorageSchema = {
  alerts: Record<string, AlertRecord>;
};

const DATA_PATH = path.join(process.cwd(), "storage.json");

// ===== 讀取 =====
function load(): StorageSchema {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      return { alerts: {} };
    }
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("❌ storage load error", e);
    return { alerts: {} };
  }
}

// ===== 寫入 =====
function save(data: StorageSchema) {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("❌ storage save error", e);
  }
}

// ===== hash（簡單版）=====
function buildHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

// ===== 是否允許發送 =====
export function shouldSendAlert(code: string, content: string, cooldownMs = 10 * 60 * 1000): boolean {
  const db = load();
  const now = Date.now();
  const hash = buildHash(content);

  const record = db.alerts[code];

  if (!record) return true;

  const timeDiff = now - record.lastAlertTime;

  // 冷卻時間內不發
  if (timeDiff < cooldownMs) {
    return false;
  }

  // 內容相同不發
  if (record.lastHash === hash) {
    return false;
  }

  return true;
}

// ===== 記錄發送 =====
export function recordAlert(code: string, content: string) {
  const db = load();
  const hash = buildHash(content);

  db.alerts[code] = {
    code,
    lastAlertTime: Date.now(),
    lastHash: hash,
  };

  save(db);
}
