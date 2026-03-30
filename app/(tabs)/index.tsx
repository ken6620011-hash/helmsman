import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";

type Stock = {
  symbol: string;
  sector: string;
  price: number;
  changePct: number;
  radarScore: number;
  momentumScore: number;
  trendScore: number;
  volumeScore: number;
  strategySignal: string;
};

export default function HomeScreen() {
  const [stocks, setStocks] = useState<Stock[]>([]);

  useEffect(() => {
    loadStocks();
  }, []);

  const loadStocks = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8787/api/market/snapshots");
      const json = await res.json();

      const list = json?.data ?? [];
      setStocks(list);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Helmsman AI Scanner</Text>

      {stocks.map((stock) => (
        <View key={stock.symbol} style={styles.card}>
          <Text style={styles.symbol}>{stock.symbol}</Text>

          <Text>Sector: {stock.sector}</Text>

          <Text>
            Price: ${(stock.price ?? 0).toFixed(2)}
          </Text>

          <Text>
            Change: {(stock.changePct ?? 0).toFixed(2)}%
          </Text>

          <Text>Radar Score: {stock.radarScore}</Text>

          <Text>Signal: {stock.strategySignal}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#111",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },

  symbol: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#00ffcc",
  },
});
