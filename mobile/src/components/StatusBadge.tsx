import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { Loan } from "@/types";

interface Props {
  status: Loan["status"];
  overdue?: boolean;
  compact?: boolean;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> =
  {
    paid: { bg: "#f0fdf4", text: "#15803d", dot: "#16a34a" },
    partially_paid: { bg: "#fffbeb", text: "#b45309", dot: "#d97706" },
    overdue: { bg: "#fef2f2", text: "#b91c1c", dot: "#dc2626" },
    active: { bg: "#f4f4f5", text: "#3f3f46", dot: "#71717a" },
  };

export default function StatusBadge({
  status,
  overdue = false,
  compact = true,
}: Props) {
  const { t } = useTranslation();

  const key =
    status === "paid"
      ? "paid"
      : status === "partially_paid"
        ? "partially_paid"
        : overdue
          ? "overdue"
          : "active";

  const { bg, text, dot } = STATUS_STYLES[key];

  const label =
    key === "paid"
      ? t("loans.paid")
      : key === "partially_paid"
        ? t("loans.partiallyPaid")
        : key === "overdue"
          ? t("loans.overdue")
          : t("loans.active");

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
  },
  dot: { width: 5, height: 5, borderRadius: 999 },
  label: { fontSize: 11, fontWeight: "600" },
});
