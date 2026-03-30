type EventSource = "MOPS" | "TWSE" | "GOOGLE_NEWS";

export type NewsSignal = {
  title: string;
  source: EventSource;
  date: string;
  link?: string;
};

export type EventRadarResult = {
  eventScore: number;
  eventTags: string[];
  eventReasons: string[];
  breakdown: {
    officialScore: number;
    newsScore: number;
    institutionalScore: number;
    fundamentalsScore: number;
    chipScore: number;
  };
  rawSignals: NewsSignal[];
};

type KeywordRule = {
  keyword: string;
  score: number;
  tag: string;
  reason: string;
};

const OFFICIAL_POSITIVE_KEYWORDS: KeywordRule[] = [
  { keyword: "私募", score: 8, tag: "私募", reason: "官方事件命中私募，屬中期偏多基礎分" },
  { keyword: "策略投資人", score: 12, tag: "策略投資人", reason: "官方事件命中策略投資人，屬強中期利多" },
  { keyword: "聯貸", score: 5, tag: "聯貸", reason: "官方事件命中聯貸，偏中性偏多" },
  { keyword: "擴產", score: 10, tag: "擴產", reason: "官方事件命中擴產，對中期營運偏多" },
  { keyword: "接單", score: 8, tag: "接單", reason: "官方事件命中接單，提升營運能見度" },
  { keyword: "訂單", score: 6, tag: "訂單", reason: "官方事件命中訂單，提升能見度" },
  { keyword: "法說會", score: 4, tag: "法說會", reason: "官方事件命中法說會，提高關注" },
  { keyword: "營收成長", score: 8, tag: "營收成長", reason: "官方事件命中營收成長，偏多" },
  { keyword: "獲利成長", score: 8, tag: "獲利成長", reason: "官方事件命中獲利成長，偏多" },
  { keyword: "eps成長", score: 8, tag: "EPS成長", reason: "官方事件命中 EPS 成長，偏多" },
  { keyword: "ai", score: 5, tag: "AI", reason: "官方事件命中 AI，提升題材溢價" },
];

const OFFICIAL_NEGATIVE_KEYWORDS: KeywordRule[] = [
  { keyword: "增資", score: -6, tag: "增資", reason: "官方事件命中增資，可能有稀釋壓力" },
  { keyword: "可轉債", score: -5, tag: "可轉債", reason: "官方事件命中可轉債，偏保守" },
  { keyword: "減資", score: -6, tag: "減資", reason: "官方事件命中減資，偏保守" },
  { keyword: "虧損", score: -12, tag: "虧損", reason: "官方事件命中虧損，負面" },
  { keyword: "下修", score: -10, tag: "下修", reason: "官方事件命中下修，負面" },
  { keyword: "違約", score: -15, tag: "違約", reason: "官方事件命中違約，重大負面" },
  { keyword: "衰退", score: -8, tag: "衰退", reason: "官方事件命中衰退，負面" },
];

const NEWS_POSITIVE_KEYWORDS: KeywordRule[] = [
  { keyword: "接單", score: 3, tag: "接單", reason: "新聞命中接單，偏多" },
  { keyword: "訂單", score: 2, tag: "訂單", reason: "新聞命中訂單，偏多" },
  { keyword: "擴產", score: 3, tag: "擴產", reason: "新聞命中擴產，偏多" },
  { keyword: "ai", score: 2, tag: "AI", reason: "新聞命中 AI 題材，偏多" },
  { keyword: "營收成長", score: 3, tag: "營收成長", reason: "新聞命中營收成長，偏多" },
  { keyword: "獲利成長", score: 3, tag: "獲利成長", reason: "新聞命中獲利成長，偏多" },
  { keyword: "法說會看好", score: 3, tag: "法說偏多", reason: "新聞命中法說偏多，偏多" },
];

const NEWS_NEGATIVE_KEYWORDS: KeywordRule[] = [
  { keyword: "虧損", score: -4, tag: "虧損", reason: "新聞命中虧損，偏空" },
  { keyword: "下修", score: -4, tag: "下修", reason: "新聞命中下修，偏空" },
  { keyword: "衰退", score: -3, tag: "衰退", reason: "新聞命中衰退，偏空" },
  { keyword: "增資", score: -2, tag: "增資", reason: "新聞命中增資，偏保守" },
  { keyword: "可轉債", score: -2, tag: "可轉債", reason: "新聞命中可轉債，偏保守" },
];

function clamp(num: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, num));
}

function containsKeyword(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword.toLowerCase());
}

async function safeFetchJson(url: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "Helmsman/1.0",
      Accept: "application/json, text/plain, */*",
    },
  });

  if (!res.ok) {
    throw new Error(`fetch failed: ${res.status}`);
  }

  return res.json();
}

async function safeFetchText(url: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "Helmsman/1.0",
      Accept: "application/xml, text/xml, text/plain, */*",
    },
  });

  if (!res.ok) {
    throw new Error(`fetch failed: ${res.status}`);
  }

  return res.text();
}

function scoreSignals(
  signals: NewsSignal[],
  positiveRules: KeywordRule[],
  negativeRules: KeywordRule[],
  scoreMin: number,
  scoreMax: number,
  sourceLabel: string
) {
  let score = 0;
  const tags = new Set<string>();
  const reasons: string[] = [];

  for (const item of signals) {
    const text = item.title.toLowerCase();

    for (const rule of positiveRules) {
      if (containsKeyword(text, rule.keyword)) {
        score += rule.score;
        tags.add(rule.tag);
        reasons.push(`${sourceLabel}命中「${rule.keyword}」：${rule.reason}`);
      }
    }

    for (const rule of negativeRules) {
      if (containsKeyword(text, rule.keyword)) {
        score += rule.score;
        tags.add(rule.tag);
        reasons.push(`${sourceLabel}命中「${rule.keyword}」：${rule.reason}`);
      }
    }
  }

  return {
    score: clamp(score, scoreMin, scoreMax),
    tags: Array.from(tags),
    reasons,
  };
}

function parseGoogleNewsRss(xml: string): Array<{
  title: string;
  link?: string;
  pubDate?: string;
}> {
  const items: Array<{ title: string; link?: string; pubDate?: string }> = [];
  const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

  for (const block of itemBlocks) {
    const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i);
    const linkMatch = block.match(/<link>(.*?)<\/link>/i);
    const pubDateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/i);

    const title = (titleMatch?.[1] || titleMatch?.[2] || "").trim();
    const link = (linkMatch?.[1] || "").trim();
    const pubDate = (pubDateMatch?.[1] || "").trim();

    if (title) {
      items.push({ title, link, pubDate });
    }
  }

  return items;
}

async function fetchTwseSignals(symbol: string): Promise<NewsSignal[]> {
  try {
    const url = "https://openapi.twse.com.tw/v1/news/newsList";
    const json = await safeFetchJson(url);

    if (!Array.isArray(json)) {
      return [];
    }

    return json
      .filter((row: any) => {
        const text = `${row?.Title || ""} ${row?.Content || ""}`;
        return text.includes(symbol);
      })
      .slice(0, 8)
      .map((row: any) => ({
        source: "TWSE" as const,
        title: String(row?.Title || "").trim(),
        date: String(row?.Date || "").trim(),
        link: row?.Url ? String(row.Url) : undefined,
      }))
      .filter((item) => item.title);
  } catch (error) {
    console.error(`[eventRadar] TWSE fetch fail for ${symbol}:`, error);
    return [];
  }
}

async function fetchMopsSignals(symbol: string): Promise<NewsSignal[]> {
  try {
    const url = `https://mopsov.twse.com.tw/mops/web/ajax_t05st01?encodeURIComponent=1&TYPEK=all&co_id=${symbol}`;
    const text = await safeFetchText(url);

    const signals: NewsSignal[] = [];
    const rowMatches = text.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

    for (const row of rowMatches) {
      const tdMatches = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
        String(m[1] || "")
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .trim()
      );

      if (tdMatches.length >= 3) {
        const merged = tdMatches.join(" ");
        if (merged.includes(symbol)) {
          signals.push({
            source: "MOPS",
            title: merged,
            date: tdMatches[0] || "",
          });
        }
      }
    }

    return signals.slice(0, 8);
  } catch (error) {
    console.error(`[eventRadar] MOPS fetch fail for ${symbol}:`, error);
    return [];
  }
}

function symbolAlias(symbol: string): string[] {
  const map: Record<string, string[]> = {
    "6187": ["6187", "萬潤"],
    "3016": ["3016", "嘉晶"],
    "3707": ["3707", "漢磊"],
  };

  return map[symbol] || [symbol];
}

async function fetchGoogleNewsSignals(symbol: string): Promise<NewsSignal[]> {
  try {
    const aliases = symbolAlias(symbol);
    const query = aliases.join(" OR ");
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query + " 台股")}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
    const xml = await safeFetchText(rssUrl);
    const parsed = parseGoogleNewsRss(xml);

    return parsed
      .filter((item) => aliases.some((alias) => item.title.includes(alias)))
      .slice(0, 10)
      .map((item) => ({
        source: "GOOGLE_NEWS" as const,
        title: item.title,
        date: item.pubDate || "",
        link: item.link,
      }));
  } catch (error) {
    console.error(`[eventRadar] Google RSS fetch fail for ${symbol}:`, error);
    return [];
  }
}

async function fetchOfficialSignals(symbol: string): Promise<NewsSignal[]> {
  const [twseSignals, mopsSignals] = await Promise.all([
    fetchTwseSignals(symbol),
    fetchMopsSignals(symbol),
  ]);

  return [...mopsSignals, ...twseSignals];
}

function scoreInstitutional(symbol: string) {
  const mockMap: Record<string, { score: number; tags: string[]; reasons: string[] }> = {
    "6187": {
      score: 6,
      tags: ["法人偏多", "主力吸籌"],
      reasons: ["模擬：法人與主力偏多，提升事件分"],
    },
    "3016": {
      score: 3,
      tags: ["法人中性偏多"],
      reasons: ["模擬：法人偏中性偏多"],
    },
    "3707": {
      score: 0,
      tags: ["法人觀察"],
      reasons: ["模擬：法人未明顯表態"],
    },
  };

  return mockMap[symbol] || { score: 0, tags: ["法人未知"], reasons: ["無法人資料"] };
}

function scoreFundamentals(symbol: string) {
  const mockMap: Record<string, { score: number; tags: string[]; reasons: string[] }> = {
    "6187": {
      score: 4,
      tags: ["EPS預期"],
      reasons: ["模擬：EPS / 獲利預期偏正向"],
    },
    "3016": {
      score: 2,
      tags: ["基本面改善"],
      reasons: ["模擬：基本面溫和改善"],
    },
    "3707": {
      score: 0,
      tags: ["基本面整理"],
      reasons: ["模擬：基本面暫時中性"],
    },
  };

  return mockMap[symbol] || { score: 0, tags: ["基本面未知"], reasons: ["無基本面資料"] };
}

function scoreChip(symbol: string) {
  const mockMap: Record<string, { score: number; tags: string[]; reasons: string[] }> = {
    "6187": {
      score: 5,
      tags: ["籌碼集中"],
      reasons: ["模擬：籌碼偏集中，短線有利"],
    },
    "3016": {
      score: 1,
      tags: ["籌碼中性"],
      reasons: ["模擬：籌碼中性"],
    },
    "3707": {
      score: -1,
      tags: ["籌碼鬆動"],
      reasons: ["模擬：籌碼略鬆動，偏保守"],
    },
  };

  return mockMap[symbol] || { score: 0, tags: ["籌碼未知"], reasons: ["無籌碼資料"] };
}

export async function runEventRadar(symbol: string): Promise<EventRadarResult> {
  const [officialSignals, newsSignals] = await Promise.all([
    fetchOfficialSignals(symbol),
    fetchGoogleNewsSignals(symbol),
  ]);

  const official = scoreSignals(
    officialSignals,
    OFFICIAL_POSITIVE_KEYWORDS,
    OFFICIAL_NEGATIVE_KEYWORDS,
    -30,
    30,
    "官方"
  );

  const news = scoreSignals(
    newsSignals,
    NEWS_POSITIVE_KEYWORDS,
    NEWS_NEGATIVE_KEYWORDS,
    -12,
    12,
    "新聞"
  );

  const inst = scoreInstitutional(symbol);
  const fund = scoreFundamentals(symbol);
  const chip = scoreChip(symbol);

  const weightedOfficial = official.score * 1.8;
  const weightedNews = news.score * 0.6;

  let rawScore =
    weightedOfficial +
    weightedNews +
    inst.score +
    fund.score +
    chip.score;

  const tags = Array.from(
    new Set([
      ...official.tags,
      ...news.tags,
      ...inst.tags,
      ...fund.tags,
      ...chip.tags,
    ])
  );

  const reasons = [
    ...official.reasons,
    ...news.reasons,
    ...inst.reasons,
    ...fund.reasons,
    ...chip.reasons,
  ];

  if (official.score >= 15) {
    rawScore += 10;
    reasons.push("官方事件強信號：officialScore >= 15，額外加分");
    tags.push("官方強信號");
  }

  const finalScore = clamp(Math.round(rawScore), -30, 50);

  return {
    eventScore: finalScore,
    eventTags: Array.from(new Set(tags)),
    eventReasons: reasons.length > 0 ? reasons : ["無事件資料"],
    breakdown: {
      officialScore: official.score,
      newsScore: news.score,
      institutionalScore: inst.score,
      fundamentalsScore: fund.score,
      chipScore: chip.score,
    },
    rawSignals: [...officialSignals, ...newsSignals],
  };
}
