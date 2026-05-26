import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface Props {
  message: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  description?: string;
}

export default function EmptyState({ message, icon, description }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {icon && (
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
            },
          ]}>
          <MaterialCommunityIcons
            name={icon}
            size={32}
            color={(theme as any).custom?.muted ?? theme.colors.outline}
          />
        </View>
      )}
      <Text
        variant="titleSmall"
        style={[
          styles.title,
          { color: theme.colors.onSurface, fontWeight: "700" },
        ]}>
        {message}
      </Text>
      {description && (
        <Text
          variant="bodySmall"
          style={[
            styles.desc,
            { color: (theme as any).custom?.muted ?? theme.colors.outline },
          ]}>
          {description}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { textAlign: "center", marginBottom: 8 },
  desc: { textAlign: "center", lineHeight: 20 },
});
