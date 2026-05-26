import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { formatAmount } from "@utils/currency";
import { formatDate, isOverdue } from "@utils/date";
import { useLoansStore } from "@store/loans";
import StatusBadge from "./StatusBadge";
import type { Loan, LoanParticipant } from "@/types";

function getParticipantCount(participants: string | null): number {
  if (!participants) return 0;
  try {
    return (JSON.parse(participants) as LoanParticipant[]).length;
  } catch {
    return 0;
  }
}

interface Props {
  loan: Loan;
  onPress: () => void;
  hideAmounts?: boolean;
}

export default function LoanCard({
  loan,
  onPress,
  hideAmounts = false,
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const overdue = isOverdue(loan.due_date) && loan.status !== "paid";
  const accentColor =
    loan.type === "lent"
      ? (theme as any).custom.lent
      : (theme as any).custom.borrowed;

  const paidSum = useLoansStore((s) =>
    (s.repayments[loan.id] ?? []).reduce((acc, r) => acc + Number(r.amount), 0),
  );
  const progress =
    loan.status === "paid"
      ? 1
      : Math.min(1, paidSum / Math.max(1, Number(loan.amount)));
  const showProgress = progress > 0;
  const participantCount = getParticipantCount(loan.participants ?? null);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.6}>
      {/* Left colour accent */}
      <View style={[styles.accent, { backgroundColor: accentColor }]} />

      <View style={styles.body}>
        {/* Top row: name + amount */}
        <View style={styles.topRow}>
          <Text
            variant="titleSmall"
            numberOfLines={1}
            style={[
              styles.name,
              { color: theme.colors.onSurface, fontWeight: "700" },
            ]}>
            {loan.contact_name}
          </Text>
          <Text
            variant="titleMedium"
            style={{
              color: accentColor,
              fontWeight: "800",
              letterSpacing: -0.5,
            }}>
            {hideAmounts
              ? "••••••"
              : formatAmount(Number(loan.amount), loan.currency)}
          </Text>
        </View>

        {/* Divider */}
        <View
          style={[
            styles.sep,
            {
              backgroundColor:
                theme.colors.outlineVariant ?? theme.colors.outline,
            },
          ]}
        />

        {/* Repayment progress bar */}
        {showProgress && (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(progress * 100)}%` as any,
                  backgroundColor: accentColor,
                },
              ]}
            />
          </View>
        )}

        {/* Bottom row: badge + due date + shared chip */}
        <View style={styles.bottomRow}>
          <StatusBadge status={loan.status} overdue={overdue} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {participantCount > 0 && (
              <View
                style={[
                  styles.sharedChip,
                  { backgroundColor: accentColor + "18" },
                ]}>
                <MaterialCommunityIcons
                  name="account-multiple"
                  size={11}
                  color={accentColor}
                />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: accentColor,
                    marginLeft: 3,
                  }}>
                  {participantCount}
                </Text>
              </View>
            )}
            {loan.due_date ? (
              overdue ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                  }}>
                  <MaterialCommunityIcons
                    name="alert"
                    size={12}
                    color={(theme as any).custom.overdue}
                  />
                  <Text
                    variant="labelSmall"
                    style={{
                      color: (theme as any).custom.overdue,
                      fontWeight: "700",
                    }}>
                    {formatDate(loan.due_date)}
                  </Text>
                </View>
              ) : (
                <Text
                  variant="labelSmall"
                  style={{ color: (theme as any).custom.muted }}>
                  {formatDate(loan.due_date)}
                </Text>
              )
            ) : (
              <Text
                variant="labelSmall"
                style={{ color: (theme as any).custom.muted }}>
                {loan.type === "lent" ? t("loans.iLent") : t("loans.iBorrowed")}
              </Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 16,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
  },
  accent: { width: 3 },
  body: { flex: 1, padding: 14 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  name: { flex: 1, marginRight: 8 },
  sep: { height: 1, marginVertical: 10 },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginBottom: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sharedChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
  },
});
