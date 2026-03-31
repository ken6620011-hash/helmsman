type SupportCacheItem = {
  code: string;
  updatedAt: number;
  data: {
    supportPrice: number;
    supportDays: number;
    structureBroken: boolean;
    confidence: number;
    sourceLowCount: number;
    reason: string;
  };
};

const supportCache: Record<string, SupportCacheItem> = {};

export function setSupportCache(
  code: string,
  data: SupportCacheItem["data"]
): void {
  const cleanCode = String(code || "").trim();
  if (!cleanCode) return;

  supportCache[cleanCode] = {
    code: cleanCode,
    updatedAt: Date.now(),
    data,
  };
}

export function getSupportCache(code: string): SupportCacheItem | null {
  const cleanCode = String(code || "").trim();
  if (!cleanCode) return null;

  return supportCache[cleanCode] || null;
}

export function getSupportData(code: string) {
  const item = getSupportCache(code);
  return item?.data || null;
}

export function hasSupportCache(code: string): boolean {
  return !!getSupportCache(code);
}

export function clearSupportCache(code?: string): void {
  if (!code) {
    for (const key of Object.keys(supportCache)) {
      delete supportCache[key];
    }
    return;
  }

  const cleanCode = String(code || "").trim();
  if (!cleanCode) return;
  delete supportCache[cleanCode];
}

export function getAllSupportCache(): SupportCacheItem[] {
  return Object.values(supportCache).sort((a, b) => b.updatedAt - a.updatedAt);
}
