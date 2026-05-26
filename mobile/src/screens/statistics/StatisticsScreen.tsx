import React, { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Text, useTheme, ActivityIndicator } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import { BarChart } from "react-native-gifted-charts";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLoansStore } from "@store/loans";
import { formatAmount } from "@utils/currency";
import { formatDate } from "@utils/date";
import { EmptyState } from "@components/index";
import type { ContactStats, MonthlyStats } from "@/types";

export default function StatisticsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { loans, loadLoans, loadAllRepayments, getStats, isLoading } =
    useLoansStore();

  useFocusEffect(
    useCallback(() => {
      loadLoans();
      loadAllRepayments();
    }, []),
  );

  const stats = getStats();

  if (isLoading && loans.length === 0) {
    return (
      <ActivityIndicator style={{ flex: 1, marginTop: 60 }} size="large" />
    );
  }

  if (loans.length === 0) {
    return <EmptyState message={t("statistics.noData")} icon="chart-bar" />;
  }

  const statusData = [
    {
      value: stats.byStatus.active,
      label: t("statistics.activeLoans"),
      frontColor: theme.colors.primary,
    },
    {
      value: stats.byStatus.partially_paid,
      label: t("statistics.partiallyPaid"),
      frontColor: (theme as any).custom?.warning ?? "#f59e0b",
    },
    {
      value: stats.byStatus.paid,
      label: t("statistics.paidLoans"),
      frontColor: (theme as any).custom?.lent ?? "#10b981",
    },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}>
      {/* ─── Status summary ─────────────────────────────────────────────────── */}
      <SectionTitle title={t("statistics.byStatus")} />
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
          },
        ]}>
        <View style={styles.statsRow}>
          <StatItem
            label={t("statistics.activeLoans")}
            value={stats.byStatus.active.toString()}
            color={theme.colors.primary}
          />
          <StatItem
            label={t("statistics.partiallyPaid")}
            value={stats.byStatus.partially_paid.toString()}
            color={(theme as any).custom?.warning ?? "#f59e0b"}
          />
          <StatItem
            label={t("statistics.paidLoans")}
            value={stats.byStatus.paid.toString()}
            color={(theme as any).custom?.lent ?? "#10b981"}
          />
        </View>

        {stats.totalLoans > 0 && (
          <BarChart
            data={statusData}
            barWidth={50}
            spacing={20}
            roundedTop
            noOfSections={Math.max(...statusData.map((d) => d.value), 1)}
            maxValue={Math.max(...statusData.map((d) => d.value), 1)}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={theme.colors.outline}
            yAxisTextStyle={{ color: theme.colors.outline, fontSize: 11 }}
            xAxisLabelTextStyle={{ color: theme.colors.outline, fontSize: 10 }}
            isAnimated
            animationDuration={500}
          />
        )}
      </View>

      {/* ─── By currency ────────────────────────────────────────────────────── */}
      <SectionTitle title={t("statistics.byCurrency")} />
      {stats.byCurrency.map((cb) => (
        <View
          key={cb.currency}
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
            },
          ]}>
          <Text
            variant="titleSmall"
            style={{
              fontWeight: "700",
              marginBottom: 12,
              letterSpacing: -0.2,
            }}>
            {cb.currency}
          </Text>
          <View style={styles.currencyRow}>
            <CurrencyStatItem
              label={t("statistics.totalLent")}
              amount={formatAmount(cb.totalLent, cb.currency)}
              outstanding={formatAmount(cb.outstandingLent, cb.currency)}
              color={(theme as any).custom?.lent ?? "#10b981"}
            />
            <CurrencyStatItem
              label={t("statistics.totalBorrowed")}
              amount={formatAmount(cb.totalBorrowed, cb.currency)}
              outstanding={formatAmount(cb.outstandingBorrowed, cb.currency)}
              color={(theme as any).custom?.borrowed ?? "#ef4444"}
            />
          </View>
        </View>
      ))}

      {/* ─── Monthly activity ───────────────────────────────────────────────── */}
      {Object.entries(stats.monthly).some(([, rows]) =>
        rows.some((m) => m.lent + m.borrowed + m.repaid > 0),
      ) && (
        <>
          <SectionTitle title={t("statistics.monthlyActivity")} />
          {Object.entries(stats.monthly).map(([currency, rows]) =>
            rows.some((m) => m.lent + m.borrowed + m.repaid > 0) ? (
              <View
                key={currency}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor:
                      theme.colors.outlineVariant ?? theme.colors.outline,
                  },
                ]}>
                <Text
                  variant="titleSmall"
                  style={{
                    fontWeight: "700",
                    marginBottom: 12,
                    letterSpacing: -0.2,
                  }}>
                  {currency}
                </Text>
                {rows.map((m) => (
                  <MonthRow key={m.month} item={m} />
                ))}
              </View>
            ) : null,
          )}
        </>
      )}

      {/* ─── Contact reliability ─────────────────────────────────────────────── */}
      {stats.contactStats.length > 0 && (
        <>
          <SectionTitle title={t("statistics.contactReliability")} />
          {stats.contactStats.map((cs) => (
            <ContactReliabilityCard key={cs.name} contact={cs} />
          ))}
        </>
      )}

      {/* ─── Overdue ────────────────────────────────────────────────────────── */}
      {stats.overdue.length > 0 && (
        <>
          <SectionTitle title={t("statistics.overdue")} icon="alert-circle" />
          {stats.overdue.map((loan) => (
            <View
              key={loan.id}
              style={[
                styles.overdueCard,
                {
                  backgroundColor:
                    ((theme as any).custom?.borrowed ?? "#dc2626") + "12",
                  borderLeftColor: (theme as any).custom?.borrowed ?? "#dc2626",
                  borderColor:
                    ((theme as any).custom?.borrowed ?? "#dc2626") + "30",
                },
              ]}>
              <Text
                variant="labelMedium"
                style={{ fontWeight: "700", letterSpacing: -0.2 }}>
                {loan.contact_name}
              </Text>
              <Text
                variant="bodySmall"
                style={{
                  color: (theme as any).custom?.borrowed ?? "#dc2626",
                  marginTop: 2,
                }}>
                {formatAmount(Number(loan.amount), loan.currency)} · Due:{" "}
                {formatDate(loan.due_date)}
              </Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function MonthRow({ item }: { item: MonthlyStats }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [year, month] = item.month.split("-");
  const label = new Date(Number(year), Number(month) - 1, 1).toLocaleString(
    "default",
    {
      month: "short",
      year: "2-digit",
    },
  );
  const total = item.lent + item.borrowed;
  const lentPct = total > 0 ? item.lent / total : 0;
  const lent = (theme as any).custom?.lent ?? "#16a34a";
  const borrowed = (theme as any).custom?.borrowed ?? "#dc2626";
  const muted = (theme as any).custom?.muted ?? theme.colors.outline;

  return (
    <View style={{ marginBottom: 14 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 4,
        }}>
        <Text
          variant="labelMedium"
          style={{ fontWeight: "700", color: theme.colors.onSurface }}>
          {label}
        </Text>
        {item.repaid > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <MaterialCommunityIcons
              name="arrow-u-left-top"
              size={12}
              color={muted}
            />
            <Text variant="labelSmall" style={{ color: muted }}>
              {item.repaid.toLocaleString()} {t("statistics.repaid")}
            </Text>
          </View>
        )}
      </View>
      {total > 0 ? (
        <>
          <View
            style={[
              styles.barTrack,
              { backgroundColor: theme.colors.outlineVariant ?? "#e4e4e7" },
            ]}>
            <View
              style={[
                styles.barSegment,
                { flex: lentPct, backgroundColor: lent },
              ]}
            />
            <View
              style={[
                styles.barSegment,
                { flex: 1 - lentPct, backgroundColor: borrowed },
              ]}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 3,
            }}>
            {item.lent > 0 && (
              <Text variant="labelSmall" style={{ color: lent }}>
                {t("loans.iLent")}: {item.lent.toLocaleString()}
              </Text>
            )}
            {item.borrowed > 0 && (
              <Text variant="labelSmall" style={{ color: borrowed }}>
                {t("loans.iBorrowed")}: {item.borrowed.toLocaleString()}
              </Text>
            )}
          </View>
        </>
      ) : (
        <Text variant="labelSmall" style={{ color: muted }}>
          —
        </Text>
      )}
    </View>
  );
}

function ContactReliabilityCard({ contact }: { contact: ContactStats }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const lent = (theme as any).custom?.lent ?? "#16a34a";
  const borrowed = (theme as any).custom?.borrowed ?? "#dc2626";
  const warning = (theme as any).custom?.warning ?? "#d97706";
  const muted = (theme as any).custom?.muted ?? theme.colors.outline;
  const paid = contact.paidOnTime + contact.paidLate;
  const reliabilityPct = paid > 0 ? contact.paidOnTime / paid : null;

  const handleCall = () => {
    if (contact.phone) Linking.openURL(`tel:${contact.phone}`);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
          paddingVertical: 14,
        },
      ]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
        <View style={{ flex: 1 }}>
          <Text
            variant="titleSmall"
            style={{ fontWeight: "800", letterSpacing: -0.2 }}>
            {contact.name}
          </Text>
          {contact.phone && (
            <Text variant="labelSmall" style={{ color: muted, marginTop: 1 }}>
              {contact.phone}
            </Text>
          )}
        </View>
        {contact.phone && (
          <TouchableOpacity
            onPress={handleCall}
            style={[
              styles.callBtn,
              {
                borderColor:
                  theme.colors.outlineVariant ?? theme.colors.outline,
              },
            ]}>
            <MaterialCommunityIcons name="phone" size={18} color={muted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <View
          style={[styles.reliabilityBadge, { backgroundColor: lent + "18" }]}>
          <MaterialCommunityIcons name="check" size={11} color={lent} />
          <Text
            variant="labelSmall"
            style={{ color: lent, fontWeight: "700", marginLeft: 3 }}>
            {contact.paidOnTime} {t("statistics.onTime")}
          </Text>
        </View>
        {contact.paidLate > 0 && (
          <View
            style={[
              styles.reliabilityBadge,
              { backgroundColor: borrowed + "18" },
            ]}>
            <MaterialCommunityIcons name="close" size={11} color={borrowed} />
            <Text
              variant="labelSmall"
              style={{ color: borrowed, fontWeight: "700", marginLeft: 3 }}>
              {contact.paidLate} {t("statistics.late")}
            </Text>
          </View>
        )}
        {contact.outstanding > 0 && (
          <View
            style={[
              styles.reliabilityBadge,
              { backgroundColor: warning + "18" },
            ]}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={11}
              color={warning}
            />
            <Text
              variant="labelSmall"
              style={{ color: warning, fontWeight: "700", marginLeft: 3 }}>
              {contact.outstanding} {t("statistics.pending")}
            </Text>
          </View>
        )}
      </View>

      {reliabilityPct !== null && (
        <View style={{ marginTop: 10 }}>
          <View
            style={[
              styles.barTrack,
              { backgroundColor: theme.colors.outlineVariant ?? "#e4e4e7" },
            ]}>
            <View
              style={[
                styles.barSegment,
                {
                  flex: reliabilityPct,
                  backgroundColor:
                    reliabilityPct >= 0.8
                      ? lent
                      : reliabilityPct >= 0.5
                        ? warning
                        : borrowed,
                },
              ]}
            />
            <View style={{ flex: 1 - reliabilityPct }} />
          </View>
          <Text variant="labelSmall" style={{ color: muted, marginTop: 3 }}>
            {Math.round(reliabilityPct * 100)}% {t("statistics.reliability")}
          </Text>
        </View>
      )}
    </View>
  );
}

function SectionTitle({ title, icon }: { title: string; icon?: string }) {
  const theme = useTheme();
  const muted = (theme as any).custom?.muted ?? theme.colors.outline;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 20,
        marginBottom: 10,
      }}>
      {icon && (
        <MaterialCommunityIcons name={icon as any} size={14} color={muted} />
      )}
      <Text
        variant="labelSmall"
        style={{
          fontWeight: "700",
          color: muted,
          letterSpacing: 0.8,
        }}>
        {title.toUpperCase()}
      </Text>
    </View>
  );
}

function StatItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.statItem}>
      <Text
        variant="headlineMedium"
        style={{ fontWeight: "800", color, letterSpacing: -1 }}>
        {value}
      </Text>
      <Text
        variant="labelSmall"
        style={{ color, textAlign: "center", marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function CurrencyStatItem({
  label,
  amount,
  outstanding,
  color,
}: {
  label: string;
  amount: string;
  outstanding: string;
  color: string;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.currencyItem}>
      <Text
        variant="labelSmall"
        style={{
          color: (theme as any).custom?.muted ?? theme.colors.outline,
          letterSpacing: 0.5,
        }}>
        {label.toUpperCase()}
      </Text>
      <Text
        variant="titleMedium"
        style={{ fontWeight: "800", color, letterSpacing: -0.5, marginTop: 2 }}>
        {amount}
      </Text>
      <Text
        variant="bodySmall"
        style={{
          color: (theme as any).custom?.muted ?? theme.colors.outline,
          marginTop: 2,
        }}>
        {t("statistics.outstanding")}: {outstanding}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  statItem: { alignItems: "center" },
  currencyRow: { flexDirection: "row", justifyContent: "space-between" },
  currencyItem: { flex: 1 },
  overdueCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderWidth: 1,
  },
  barTrack: {
    flexDirection: "row",
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  barSegment: { borderRadius: 999 },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  reliabilityBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
});
