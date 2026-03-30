import React from "react";
import { View, Text } from "react-native";
import { HelmsmanColors } from "../theme/colors";
import { Space } from "../theme/spacing";

type BrandHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function BrandHeader({
  title,
  subtitle
}: BrandHeaderProps) {
  return (
    <View
      style={{
        paddingTop: 40,
        paddingBottom: Space.lg,
        alignItems: "center"
      }}
    >
      <Text
        style={{
          fontSize: 34,
          color: HelmsmanColors.primary,
          fontWeight: "700",
          textAlign: "center"
        }}
      >
        {title}
      </Text>

      {subtitle ? (
        <Text
          style={{
            marginTop: Space.sm,
            fontSize: 13,
            color: HelmsmanColors.textMuted,
            textAlign: "center",
            letterSpacing: 0.5
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
