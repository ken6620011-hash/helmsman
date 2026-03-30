import React from "react";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#ffffff"
        },
        tabBarActiveTintColor: "#0ea5b7",
        tabBarInactiveTintColor: "#888888"
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      <Tabs.Screen name="scanner" options={{ title: "Scanner" }} />
      <Tabs.Screen name="watchlist" options={{ title: "Watchlist" }} />
      <Tabs.Screen name="ai" options={{ title: "AI" }} />
    </Tabs>
  );
}
