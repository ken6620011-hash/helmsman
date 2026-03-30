import React from "react";
import { View, Text } from "react-native";
import { HelmsmanColors, getSignalColor } from "../theme/colors";

type SignalPillProps = {
  label: string;
  value: string;
};

export default function SignalPill({
  label,
  value
}: SignalPillProps) {
  return (
    <View
      style={{
        backgroundColor: HelmsmanColors.panel,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: HelmsmanColors.border,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginRight: 8,
        marginBottom: 8
      }}
    >
      <Text
        style={{
          color: HelmsmanColors.textSoft,
          fontSize: 12,
          fontWeight: "600"
        }}
      >
        {label}:{" "}
        <Text style={{ color: getSignalColor(value) }}>
          {value}
        </Text>
      </Text>
    </View>
  );
}
