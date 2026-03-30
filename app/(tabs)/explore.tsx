import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View
} from "react-native";
import { fetchMarketSnapshots, StockSnapshot } from "../../lib/realDataEngine";
import { buildSectorHeatmap } from "../../lib/heatmapEngine";

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

function getHeatColor(heat: number) {
  if (heat >= 85) return COLORS.success;
  if (heat >= 75) return COLORS.warning;
  return COLORS.soft;
}

export default function ExploreScreen() {
  const [data, setData] = useState<StockSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketSnapshots("US")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const heatmap = useMemo(() => buildSectorHeatmap(data), [data]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }}>
        <Text style={{ color: COLORS.primary, fontSize: 34, fontWeight: "700" }}>
          Explore
        </Text>
        <Text style={{ color: COLORS.muted, marginTop: 8, marginBottom: 18 }}>
          MARKET BRAIN / SECTOR HEATMAP
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          heatmap.map((cell) => (
            <View
              key={cell.sector}
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 18,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: COLORS.border
              }}
            >
              <Text style={{ color: COLORS.text, fontWeight: "700", fontSize: 18 }}>
                {cell.sector}
              </Text>
              <Text style={{ color: COLORS.soft, marginTop: 6 }}>
                Leader {cell.leader} • Signal {cell.signal}
              </Text>

              <View
                style={{
                  marginTop: 12,
                  backgroundColor: COLORS.panel,
                  borderRadius: 10,
                  height: 16,
                  overflow: "hidden"
                }}
              >
                <View
                  style={{
                    width: `${cell.widthPct}%`,
                    height: "100%",
                    backgroundColor: getHeatColor(cell.heat)
                  }}
                />
              </View>

              <Text style={{ color: COLORS.soft, marginTop: 8 }}>
                Heat {cell.heat}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
