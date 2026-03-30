import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type AiSignal = "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | string;

type OpportunityItem = {
  rank: number;
  symbol: string;
  name: string;
  sector: string;
  radarScore: number;
  aiSignal: AiSignal;
  volumeSignal: string;
  price: number;
  change: number;
  changesPercentage: number;
};

const API_BASE = "http://127.0.0.1:8787";

const COLORS = {
  bg: "#07111F",
  panel: "#0C1B2A",
  panel2: "#102338",
  border: "rgba(120,180,255,0.12)",
  primary: "#66E3FF",
  text: "#EAF4FF",
  subtext: "#9DB3C7",
  green: "#34D399",
  red: "#F87171",
  yellow: "#FBBF24",
  blue: "#60A5FA",
  badgeBg: "rgba(255,255,255,0.06)",
};

function getSignalLabel(signal: AiSignal) {
  switch (signal) {
    case "STRONG_BUY":
      return "強力買進";
    case "BUY":
      return "買進";
    case "HOLD":
      return "觀察";
    case "SELL":
      return "賣出";
    default:
      return signal || "未知";
  }
}

function getSignalColor(signal: AiSignal) {
  switch (signal) {
    case "STRONG_BUY":
      return COLORS.green;
    case "BUY":
      return COLORS.blue;
    case "HOLD":
      return COLORS.yellow;
    case "SELL":
      return COLORS.red;
    default:
      return COLORS.subtext;
  }
}

function getRadarTone(score: number) {
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

export default function ScannerScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<OpportunityItem[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [error, setError] = useState<string>("");

  const fetchScanner = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const res = await fetch(`${API_BASE}/api/market/opportunities`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        throw new Error("API 格式錯誤");
      }

      const sorted = [...data].sort((a, b) => b.radarScore - a.radarScore);
      setItems(sorted);
    } catch (err: any) {
      const message = err?.message || "掃描器載入失敗";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchScanner(false);
  }, [fetchScanner]);

  const stats = useMemo(() => {
    if (!items.length) {
      return {
        strongCount: 0,
        buyCount: 0,
        avgScore: 0,
      };
    }

    const strongCount = items.filter((x) => x.aiSignal === "STRONG_BUY").length;
    const buyCount = items.filter((x) => x.aiSignal === "BUY").length;
    const avgScore = Math.round(
      items.reduce((sum, x) => sum + x.radarScore, 0) / items.length
    );

    return { strongCount, buyCount, avgScore };
  }, [items]);

  const toggleWatchlist = (symbol: string) => {
    setWatchlist((prev) => {
      const exists = prev.includes(symbol);
      if (exists) {
        return prev.filter((x) => x !== symbol);
      }
      return [...prev, symbol];
    });
  };

  const onPressWatchlist = (symbol: string) => {
    const exists = watchlist.includes(symbol);
    toggleWatchlist(symbol);

    Alert.alert(
      exists ? "已移出觀察名單" : "已加入觀察名單",
      `${symbol} ${exists ? "已從 Watchlist 移除" : "已加入 Watchlist"}`
    );
  };

  if (loading) {
    return (
      <View style={styles.screenCenter}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingTitle}>Helmsman Scanner 載入中</Text>
        <Text style={styles.loadingSub}>正在讀取 Radar Opportunities...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screenCenter}>
        <Text style={styles.errorTitle}>掃描器載入失敗</Text>
        <Text style={styles.errorSub}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={() => fetchScanner(false)}>
          <Text style={styles.retryButtonText}>重新載入</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchScanner(true)}
          tintColor={COLORS.primary}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Helmsman Scanner</Text>
        <Text style={styles.subtitle}>AI 股市選股雷達終端</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>市場掃描模式</Text>
        <Text style={styles.heroValue}>Radar Opportunity Ranking</Text>
        <Text style={styles.heroSub}>
          即時依 Radar Score、AI Signal、價格變化排序
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>平均 Radar</Text>
          <Text style={styles.statValue}>{stats.avgScore}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>強力買進</Text>
          <Text style={styles.statValue}>{stats.strongCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>買進訊號</Text>
          <Text style={styles.statValue}>{stats.buyCount}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Radar 排行榜</Text>

        {items.map((item) => {
          const positive = item.change >= 0;
          const inWatchlist = watchlist.includes(item.symbol);

          return (
            <View key={item.symbol} style={styles.rowCard}>
              <View style={styles.rankBlock}>
                <Text style={styles.rankText}>#{item.rank}</Text>
                <Text style={styles.rankTone}>{getRadarTone(item.radarScore)}</Text>
              </View>

              <View style={styles.mainBlock}>
                <View style={styles.topLine}>
                  <View>
                    <Text style={styles.symbol}>{item.symbol}</Text>
                    <Text style={styles.name}>{item.name}</Text>
                  </View>

                  <View
                    style={[
                      styles.signalBadge,
                      { borderColor: getSignalColor(item.aiSignal) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.signalText,
                        { color: getSignalColor(item.aiSignal) },
                      ]}
                    >
                      {getSignalLabel(item.aiSignal)}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>產業：{item.sector}</Text>
                  <Text style={styles.metaText}>量價：{item.volumeSignal}</Text>
                </View>

                <View style={styles.bottomRow}>
                  <View style={styles.priceBlock}>
                    <Text style={styles.priceText}>${item.price.toFixed(2)}</Text>
                    <Text
                      style={[
                        styles.changeText,
                        { color: positive ? COLORS.green : COLORS.red },
                      ]}
                    >
                      {positive ? "+" : ""}
                      {item.change.toFixed(2)} ({positive ? "+" : ""}
                      {item.changesPercentage.toFixed(2)}%)
                    </Text>
                  </View>

                  <View style={styles.radarBlock}>
                    <Text style={styles.radarLabel}>Radar Score</Text>
                    <Text style={styles.radarValue}>{item.radarScore}</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <Pressable
                    style={[
                      styles.watchButton,
                      inWatchlist && styles.watchButtonActive,
                    ]}
                    onPress={() => onPressWatchlist(item.symbol)}
                  >
                    <Text
                      style={[
                        styles.watchButtonText,
                        inWatchlist && styles.watchButtonTextActive,
                      ]}
                    >
                      {inWatchlist ? "已加入 Watchlist" : "加入 Watchlist"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Scanner 備註</Text>
        <Text style={styles.footerText}>
          本頁已接上 Helmsman Mock Market API，可作為之後串接真實美股資料、
          Sector Flow、AI Radar、Watchlist 系統的基礎首頁版。
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 18,
    paddingBottom: 36,
  },
  screenCenter: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingTitle: {
    marginTop: 14,
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "700",
  },
  loadingSub: {
    marginTop: 8,
    color: COLORS.subtext,
    fontSize: 14,
  },
  errorTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "700",
  },
  errorSub: {
    marginTop: 10,
    color: COLORS.subtext,
    fontSize: 14,
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: COLORS.blue,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  header: {
    marginTop: 8,
    marginBottom: 16,
  },
  title: {
    color: COLORS.primary,
    fontSize: 34,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 6,
    color: COLORS.subtext,
    fontSize: 14,
  },
  heroCard: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  heroLabel: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  heroValue: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: "800",
  },
  heroSub: {
    marginTop: 8,
    color: COLORS.subtext,
    fontSize: 14,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
  },
  statLabel: {
    color: COLORS.subtext,
    fontSize: 12,
    marginBottom: 8,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "800",
  },
  section: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 14,
  },
  rowCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: COLORS.panel2,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  rankBlock: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.06)",
    paddingRight: 10,
  },
  rankText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },
  rankTone: {
    marginTop: 6,
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "800",
  },
  mainBlock: {
    flex: 1,
  },
  topLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  symbol: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "800",
  },
  name: {
    marginTop: 4,
    color: COLORS.subtext,
    fontSize: 14,
  },
  signalBadge: {
    backgroundColor: COLORS.badgeBg,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  signalText: {
    fontSize: 12,
    fontWeight: "800",
  },
  metaRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 12,
    flexWrap: "wrap",
  },
  metaText: {
    color: COLORS.subtext,
    fontSize: 13,
  },
  bottomRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
  },
  priceBlock: {
    flex: 1,
  },
  priceText: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: "800",
  },
  changeText: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
  },
  radarBlock: {
    alignItems: "flex-end",
  },
  radarLabel: {
    color: COLORS.subtext,
    fontSize: 12,
  },
  radarValue: {
    marginTop: 4,
    color: COLORS.primary,
    fontSize: 28,
    fontWeight: "900",
  },
  actionRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  watchButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  watchButtonActive: {
    backgroundColor: COLORS.primary,
  },
  watchButtonText: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: 13,
  },
  watchButtonTextActive: {
    color: "#042030",
  },
  footerCard: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 18,
  },
  footerTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  footerText: {
    color: COLORS.subtext,
    fontSize: 14,
    lineHeight: 22,
  },
});
