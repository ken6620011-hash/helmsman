import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";
import { fetchMarketSnapshots, StockSnapshot } from "../../lib/realDataEngine";
import { getWatchlist, toggleWatchlist } from "../../lib/watchlistStore";
import { getAIScore } from "../../lib/radarEngine";

const COLORS = {
  bg: "#081a25",
  card: "#123344",
  panel: "#102c3b",
  border: "#1d4a61",
  primary: "#4fd1c5",
  text: "#ffffff",
  soft: "#d7e3f1",
  muted: "#8ea5bb",
  success: "#22c55e",
  warning: "#eab308",
  danger: "#f97316"
};

function getSignalColor(signal: string) {
  if (signal === "Buy Setup") return COLORS.success;
  if (signal === "Watch Setup") return COLORS.warning;
  return COLORS.danger;
}

export default function WatchlistScreen() {
  const [data, setData] = useState<StockSnapshot[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [rows, list] = await Promise.all([
        fetchMarketSnapshots("US"),
        getWatchlist()
      ]);
      setData(rows);
      setWatchlist(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const picked = useMemo(
    () => data.filter((item) => watchlist.includes(item.symbol)),
    [data, watchlist]
  );

  const handleToggle = useCallback(async (symbol: string) => {
    const next = await toggleWatchlist(symbol);
    setWatchlist(next);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }}>
        <Text style={{ color: COLORS.primary, fontSize: 34, fontWeight: "700" }}>
          Watchlist
        </Text>
        <Text style={{ color: COLORS.muted, marginTop: 8, marginBottom: 18 }}>
          PERSONAL RADAR
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          <>
            <View
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 18,
                padding: 16,
                marginBottom: 14,
                borderWidth: 1,
                borderColor: COLORS.border
              }}
            >
              <Text style={{ color: COLORS.primary, fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
                My Watchlist
              </Text>

              {picked.length === 0 ? (
                <Text style={{ color: COLORS.soft }}>目前還沒有加入任何股票。</Text>
              ) : (
                picked.map((item) => (
                  <View
                    key={item.symbol}
                    style={{
                      backgroundColor: COLORS.panel,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8
                    }}
                  >
                    <Text style={{ color: COLORS.text, fontWeight: "700" }}>
                      {item.symbol}
                    </Text>
                    <Text style={{ color: COLORS.soft, marginTop: 4 }}>
                      AI Score {getAIScore(item)} • Radar {item.radarScore}
                    </Text>
                    <Text
                      style={{
                        color: getSignalColor(item.strategySignal),
                        marginTop: 4,
                        fontWeight: "700"
                      }}
                    >
                      {item.strategySignal}
                    </Text>
                    <Pressable
                      onPress={() => handleToggle(item.symbol)}
                      style={{
                        marginTop: 10,
                        backgroundColor: COLORS.warning,
                        borderRadius: 10,
                        paddingVertical: 10
                      }}
                    >
                      <Text
                        style={{
                          color: "#081a25",
                          textAlign: "center",
                          fontWeight: "700"
                        }}
                      >
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                ))
              )}
            </View>

            <View
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 18,
                padding: 16,
                borderWidth: 1,
                borderColor: COLORS.border
              }}
            >
              <Text style={{ color: COLORS.primary, fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
                Add Candidates
              </Text>

              {data.slice(0, 8).map((item) => (
                <View
                  key={item.symbol}
                  style={{
                    backgroundColor: COLORS.panel,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 8
                  }}
                >
                  <Text style={{ color: COLORS.text, fontWeight: "700" }}>
                    {item.symbol}
                  </Text>
                  <Text style={{ color: COLORS.soft, marginTop: 4 }}>
                    {item.sector} • AI Score {getAIScore(item)}
                  </Text>
                  <Pressable
                    onPress={() => handleToggle(item.symbol)}
                    style={{
                      marginTop: 10,
                      backgroundColor: watchlist.includes(item.symbol)
                        ? COLORS.warning
                        : COLORS.primary,
                      borderRadius: 10,
                      paddingVertical: 10
                    }}
                  >
                    <Text
                      style={{
                        color: "#081a25",
                        textAlign: "center",
                        fontWeight: "700"
                      }}
                    >
                      {watchlist.includes(item.symbol) ? "Remove" : "Add Watchlist"}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
