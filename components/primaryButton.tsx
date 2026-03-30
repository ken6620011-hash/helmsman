import React from "react";
import { Pressable, Text } from "react-native";
import { HelmsmanColors } from "../theme/colors";

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
};

export default function PrimaryButton({
  title,
  onPress
}: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: HelmsmanColors.primary,
        paddingVertical: 16,
        borderRadius: 16
      }}
    >
      <Text
        style={{
          color: HelmsmanColors.bg,
          fontSize: 18,
          fontWeight: "700",
          textAlign: "center"
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
