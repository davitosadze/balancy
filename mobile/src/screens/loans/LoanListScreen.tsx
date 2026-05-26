import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  SectionList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { FAB, useTheme, ActivityIndicator, Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { LoansStackParamList, Loan } from "@/types";
import { useLoansStore } from "@store/loans";
import { useRatesStore } from "@store/rates";
import { useAuthStore } from "@store/auth";
import { useI18nStore } from "@store/i18n";
import { LoanCard, EmptyState } from "@components/index";
import { formatAmount } from "@utils/currency";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<LoansStackParamList, "LoanList">;

type FilterType = "all" | "lent" | "borrowed";
const DISPLAY_CURRENCIES = ["GEL", "USD", "EUR"] as const;
type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export default function LoanListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { loans, isLoading, loadLoans } = useLoansStore();
  const { fetchRates, convert } = useRatesStore();
  const { user } = useAuthStore();
  const { language } = useI18nStore();
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [displayCurrency, setDisplayCurrency] =
    useState<DisplayCurrency>("GEL");
  const [hideAmounts, setHideAmounts] = useState(false);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("loans.greetingMorning");
    if (hour < 18) return t("loans.greetingAfternoon");
    return t("loans.greetingEvening");
  }, [t]);

  const firstName = user?.first_name ?? "";

  const overdueCount = useMemo(
    () =>
      loans.filter((l) => {
        if (l.status === "paid" || !l.due_date) return false;
        return new Date(l.due_date) < new Date();
      }).length,
    [loans],
  );

  useFocusEffect(
    useCallback(() => {
      loadLoans();
      fetchRates("GEL");
    }, []),
  );

  // Compute outstanding per loan then sum lent vs borrowed in display currency
  const { totalLent, totalBorrowed } = React.useMemo(() => {
    let lent = 0;
    let borrowed = 0;
    for (const loan of loans) {
      if (loan.status === "paid") continue;
      const repaidSum = (loan as any).repayments
        ? (loan as any).repayments.reduce(
            (s: number, r: any) => s + Number(r.amount),
            0,
          )
        : 0;
      const outstanding = Math.max(0, Number(loan.amount) - repaidSum);
      const converted = convert(outstanding, loan.currency, displayCurrency);
      const value = converted ?? outstanding;
      if (loan.type === "lent") {
        lent += value;
      } else {
        borrowed += value;
      }
    }
    return { totalLent: lent, totalBorrowed: borrowed };
  }, [loans, displayCurrency, convert]);

  const netBalance = totalLent - totalBorrowed;

  const filtered = loans.filter((loan) => {
    const matchType = filter === "all" || loan.type === filter;
    const matchSearch =
      !search || loan.contact_name.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const activeLoans = filtered.filter((l) => l.status !== "paid");
  const paidLoans = filtered.filter((l) => l.status === "paid");

  const sections = [
    ...(activeLoans.length > 0
      ? [{ key: "active", title: t("loans.activeLoans"), data: activeLoans }]
      : []),
    ...(paidLoans.length > 0
      ? [{ key: "paid", title: t("loans.paidLoans"), data: paidLoans }]
      : []),
  ];

  const renderItem = ({ item }: { item: Loan }) => (
    <LoanCard
      loan={item}
      hideAmounts={hideAmounts}
      onPress={() => navigation.navigate("LoanDetail", { loanId: item.id })}
    />
  );

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: t("loans.myLoans") },
    { key: "lent", label: t("loans.lent") },
    { key: "borrowed", label: t("loans.borrowed") },
  ];

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Greeting header */}
      <View
        style={[
          styles.greetingRow,
          { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
        ]}>
        <View style={{ flex: 1 }}>
          <Text
            variant="titleMedium"
            style={{
              fontWeight: "800",
              letterSpacing: -0.3,
              color: theme.colors.onBackground,
            }}>
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </Text>
          <Text
            variant="bodySmall"
            style={{
              color: (theme as any).custom?.muted ?? theme.colors.outline,
              marginTop: 1,
            }}>
            {new Date().toLocaleDateString(
              language === "ka" ? "ka-GE" : "en-US",
              {
                weekday: "long",
                month: "long",
                day: "numeric",
              },
            )}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {overdueCount > 0 && (
            <View
              style={[
                styles.overduePill,
                { backgroundColor: (theme as any).custom?.overdue + "20" },
              ]}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={13}
                color={(theme as any).custom?.overdue}
              />
              <Text
                style={{
                  color: (theme as any).custom?.overdue,
                  fontSize: 12,
                  fontWeight: "700",
                  marginLeft: 4,
                }}>
                {overdueCount} {t("loans.overdue")}
              </Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => setHideAmounts((v) => !v)}
            style={[
              styles.eyeBtn,
              {
                backgroundColor: theme.colors.surface,
                borderColor:
                  theme.colors.outlineVariant ?? theme.colors.outline,
              },
            ]}>
            <MaterialCommunityIcons
              name={hideAmounts ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={(theme as any).custom?.muted ?? theme.colors.outline}
            />
          </TouchableOpacity>
        </View>
      </View>
      {/* Search bar */}
      <View
        style={[
          styles.search,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
          },
        ]}>
        <MaterialCommunityIcons
          name="magnify"
          size={18}
          color={(theme as any).custom?.muted ?? theme.colors.outline}
          style={{ marginRight: 6 }}
        />
        <TextInput
          placeholder={t("common.search")}
          placeholderTextColor={
            (theme as any).custom?.muted ?? theme.colors.outline
          }
          value={search}
          onChangeText={setSearch}
          style={{
            flex: 1,
            fontSize: 14,
            color: theme.colors.onSurface,
            padding: 0,
          }}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <MaterialCommunityIcons
              name="close-circle"
              size={16}
              color={(theme as any).custom?.muted ?? theme.colors.outline}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Balance summary card */}
      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
          },
        ]}>
        {/* Header row: label + currency toggle */}
        <View style={styles.summaryHeader}>
          <Text
            variant="labelSmall"
            style={{
              color: (theme as any).custom?.muted ?? theme.colors.outline,
              letterSpacing: 0.5,
              fontWeight: "600",
            }}>
            {t("summary.displayIn").toUpperCase()}
          </Text>
          <View style={styles.currencyToggle}>
            {DISPLAY_CURRENCIES.map((cur) => (
              <TouchableOpacity
                key={cur}
                onPress={() => setDisplayCurrency(cur)}
                style={[
                  styles.currencyPill,
                  displayCurrency === cur
                    ? { backgroundColor: theme.colors.onSurface }
                    : {
                        backgroundColor: "transparent",
                        borderColor:
                          theme.colors.outlineVariant ?? theme.colors.outline,
                        borderWidth: 1,
                      },
                ]}>
                <Text
                  variant="labelSmall"
                  style={{
                    color:
                      displayCurrency === cur
                        ? theme.colors.surface
                        : ((theme as any).custom?.muted ??
                          theme.colors.outline),
                    fontWeight: "700",
                  }}>
                  {cur}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Amounts row */}
        <View style={styles.summaryAmounts}>
          <View style={styles.summaryItem}>
            <Text
              variant="labelSmall"
              style={{
                color: (theme as any).custom?.muted ?? theme.colors.outline,
                letterSpacing: 0.5,
              }}>
              {t("summary.totalLent").toUpperCase()}
            </Text>
            <Text
              variant="titleMedium"
              style={{
                fontWeight: "800",
                letterSpacing: -0.5,
                marginTop: 2,
                color: (theme as any).custom?.lent ?? theme.colors.primary,
              }}>
              {hideAmounts
                ? "••••••"
                : formatAmount(totalLent, displayCurrency)}
            </Text>
          </View>

          <View
            style={[
              styles.summaryItem,
              styles.summaryMiddle,
              {
                borderColor:
                  theme.colors.outlineVariant ?? theme.colors.outline,
              },
            ]}>
            <Text
              variant="labelSmall"
              style={{
                color: (theme as any).custom?.muted ?? theme.colors.outline,
                letterSpacing: 0.5,
              }}>
              {t("summary.totalBorrowed").toUpperCase()}
            </Text>
            <Text
              variant="titleMedium"
              style={{
                fontWeight: "800",
                letterSpacing: -0.5,
                marginTop: 2,
                color: (theme as any).custom?.borrowed ?? theme.colors.error,
              }}>
              {hideAmounts
                ? "••••••"
                : formatAmount(totalBorrowed, displayCurrency)}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text
              variant="labelSmall"
              style={{
                color: (theme as any).custom?.muted ?? theme.colors.outline,
                letterSpacing: 0.5,
              }}>
              {t("summary.netBalance").toUpperCase()}
            </Text>
            <Text
              variant="titleMedium"
              style={{
                fontWeight: "800",
                letterSpacing: -0.5,
                marginTop: 2,
                color:
                  netBalance >= 0
                    ? ((theme as any).custom?.lent ?? theme.colors.primary)
                    : ((theme as any).custom?.borrowed ?? theme.colors.error),
              }}>
              {hideAmounts
                ? "••••••"
                : `${netBalance >= 0 ? "+" : ""}${formatAmount(Math.abs(netBalance), displayCurrency)}`}
            </Text>
          </View>
        </View>
      </View>

      {/* Filter pills */}
      <View style={styles.filters}>
        {filters.map(({ key, label }) => {
          const active = filter === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setFilter(key)}
              style={[
                styles.pill,
                active
                  ? {
                      backgroundColor: theme.colors.onSurface,
                      borderColor: theme.colors.onSurface,
                    }
                  : {
                      backgroundColor: theme.colors.surface,
                      borderColor:
                        theme.colors.outlineVariant ?? theme.colors.outline,
                    },
              ]}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: active
                    ? theme.colors.surface
                    : ((theme as any).custom?.muted ?? theme.colors.outline),
                }}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading && loans.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" />
      ) : filtered.length === 0 ? (
        <EmptyState message={t("loans.noLoans")} icon="handshake-outline" />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <View
              style={[
                styles.sectionHeader,
                { backgroundColor: theme.colors.background },
              ]}>
              <Text
                variant="labelSmall"
                style={{
                  fontWeight: "700",
                  letterSpacing: 0.5,
                  color: (theme as any).custom?.muted ?? theme.colors.outline,
                }}>
                {section.title.toUpperCase()}
              </Text>
            </View>
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={loadLoans} />
          }
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.onSurface }]}
        color={theme.colors.surface}
        onPress={() => navigation.navigate("AddLoan", {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  summaryCard: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  currencyToggle: {
    flexDirection: "row",
    gap: 6,
  },
  currencyPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  summaryAmounts: {
    flexDirection: "row",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    marginHorizontal: 0,
    paddingHorizontal: 8,
  },
  filters: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 12,
  },
  filtersContent: {},
  pill: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingHorizontal: 12, paddingBottom: 88 },
  sectionHeader: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
  },
  fab: { position: "absolute", right: 16, bottom: 24, borderRadius: 16 },
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  overduePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  eyeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
