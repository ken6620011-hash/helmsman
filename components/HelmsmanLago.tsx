import React from "react";
import { View, Text } from "react-native";

type HelmsmanLogoProps = {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  showTagline?: boolean;
};

function getLogoSize(size: "sm" | "md" | "lg") {
  if (size === "sm") {
    return {
      box: 64,
      radius: 18,
      hSize: 34,
      wordmark: 26,
      tagline: 11
    };
  }

  if (size === "md") {
    return {
      box: 82,
      radius: 22,
      hSize: 44,
      wordmark: 34,
      tagline: 12
    };
  }

  return {
    box: 104,
    radius: 28,
    hSize: 56,
    wordmark: 40,
    tagline: 13
  };
}

export default function HelmsmanLogo({
  size = "lg",
  showWordmark = true,
  showTagline = true
}: HelmsmanLogoProps) {
  const s = getLogoSize(size);

  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          width: s.box,
          height: s.box,
          borderRadius: s.radius,
          backgroundColor: "#102c3b",
          borderWidth: 1.5,
          borderColor: "#1f5168",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          shadowColor: "#000000",
          shadowOpacity: 0.22,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6
        }}
      >
        <View
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            right: 8,
            height: 1,
            backgroundColor: "rgba(79, 209, 197, 0.22)"
          }}
        />

        <View
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            right: 8,
            height: 1,
            backgroundColor: "rgba(79, 209, 197, 0.10)"
          }}
        />

        <Text
          style={{
            color: "#4fd1c5",
            fontSize: s.hSize,
            fontWeight: "800",
            lineHeight: s.hSize + 2,
            letterSpacing: 1
          }}
        >
          H
        </Text>
      </View>

      {showWordmark && (
        <Text
          style={{
            color: "#4fd1c5",
            fontSize: s.wordmark,
            fontWeight: "800",
            textAlign: "center",
            marginTop: 14
          }}
        >
          Helmsman AI
        </Text>
      )}

      {showTagline && (
        <Text
          style={{
            color: "#8ea5bb",
            fontSize: s.tagline,
            fontWeight: "600",
            letterSpacing: 1.2,
            textAlign: "center",
            marginTop: 4
          }}
        >
          AI QUANT NAVIGATION TERMINAL
        </Text>
      )}
    </View>
  );
}
