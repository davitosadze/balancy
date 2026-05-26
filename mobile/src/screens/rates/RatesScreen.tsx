import React, { useCallback, useRef, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Pressable,
} from "react-native";
import { Text, useTheme, ActivityIndicator } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRatesStore } from "@store/rates";

const BASES = ["GEL", "USD", "EUR", "GBP"];
const TARGETS = [
  "USD",
  "EUR",
  "GBP",
  "GEL",
  "RUB",
  "TRY",
  "JPY",
  "CNY",
  "UAH",
  "CHF",
  "CAD",
  "AUD",
];

const CURRENCY_META: Record<string, { symbol: string; name: string }> = {
  GEL: { symbol: "\u20be", name: "Georgian Lari" },
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "\u20ac", name: "Euro" },
  GBP: { symbol: "\u00a3", name: "British Pound" },
  RUB: { symbol: "\u20bd", name: "Russian Ruble" },
  TRY: { symbol: "\u20ba", name: "Turkish Lira" },
  JPY: { symbol: "\u00a5", name: "Japanese Yen" },
  CNY: { symbol: "\u00a5", name: "Chinese Yuan" },
  UAH: { symbol: "\u20b4", name: "Ukrainian Hryvnia" },
  CHF: { symbol: "fr", name: "Swiss Franc" },
  CAD: { symbol: "C$", name: "Canadian Dollar" },
  AUD: { symbol: "A$", name: "Australian Dollar" },
};

function formatConverted(rate: number, amount: number): string {
  const v = amount * rate;
  if (v === 0) return "0";
  if (v >= 1_000_000)
    return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (v >= 1000) return v.toFixed(2);
  if (v >= 1) return v.toFixed(4);
  return v.toFixed(6);
}

function formatBaseRate(rate: number): string {
  if (rate >= 1000) return rate.toFixed(2);
  if (rate >= 1) return rate.toFixed(4);
  return rate.toFixed(6);
}

export default function RatesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { ratesMap, isLoading, error, fetchRates } = useRatesStore();
  const [base, setBase] = useState("GEL");
  const [amount, setAmount] = useState("1");
  const inputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      fetchRates(base);
    }, [base]),
  );

  const rates = ratesMap[base];
  const muted = (theme as any).custom?.muted ?? theme.colors.outline;
  const lentColor = (theme as any).custom?.lent ?? theme.colors.primary;
  const baseMeta = CURRENCY_META[base] ?? { symbol: base[0], name: base };
  const targets = TARGETS.filter((c) => c !== base && rates?.rates[c] != null);
  const numAmount = parseFloat(amount.replace(",", ".")) || 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => fetchRates(base)}
        />
      }>
      {/* Base selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
        style={{ marginHorizontal: -16 }}>
        {BASES.map((b) => {
          const active = b === base;
          const meta = CURRENCY_META[b];
          return (
            <TouchableOpacity
              key={b}
              onPress={() => setBase(b)}
              activeOpacity={0.7}
              style={[
                styles.pill,
                active
                  ? { backgroundColor: theme.colors.onSurface }
                  : {
                      backgroundColor: theme.colors.surface,
                      borderWidth: 1,
                      borderColor:
                        theme.colors.outlineVariant ?? theme.colors.outline,
                    },
              ]}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "900",
                  color: active ? theme.colors.surface : lentColor,
                  marginRight: 4,
                }}>
                {meta?.symbol}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: active ? theme.colors.surface : theme.colors.onSurface,
                }}>
                {b}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Converter card */}
      <Pressable onPress={() => inputRef.current?.focus()}>
        <View
          style={[
            styles.converterCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
            },
          ]}>
          <View
            style={[styles.symbolBadge, { backgroundColor: lentColor + "18" }]}>
            <Text style={{ fontSize: 22, fontWeight: "900", color: lentColor }}>
              {baseMeta.symbol}
            </Text>
          </View>

          <TextInput
            ref={inputRef}
            value={amount}
            onChangeText={(v) => {
              const clean = v.replace(/[^0-9.]/g, "");
              const parts = clean.split(".");
              setAmount(
                parts.length > 2
                  ? parts[0] + "." + parts.slice(1).join("")
                  : clean || "0",
              );
            }}
            keyboardType="decimal-pad"
            style={[styles.amountInput, { color: theme.colors.onSurface }]}
            placeholder="1"
            placeholderTextColor={muted}
            selectTextOnFocus
          />

          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: theme.colors.onSurface,
              }}>
              {base}
            </Text>
            {rates?.date ? (
              <Text style={{ fontSize: 10, color: muted, marginTop: 2 }}>
                {rates.date.substring(0, 10)}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>

      {/* Rates list */}
      {isLoading && !rates ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" />
      ) : error ? (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="wifi-off" size={40} color={muted} />
          <Text
            variant="bodyMedium"
            style={{ color: muted, marginTop: 10, textAlign: "center" }}>
            {t("rates.fetchError")}
          </Text>
          <TouchableOpacity
            onPress={() => fetchRates(base)}
            style={[
              styles.retryBtn,
              { backgroundColor: theme.colors.onSurface },
            ]}>
            <Text style={{ fontWeight: "700", color: theme.colors.surface }}>
              {t("common.retry")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : rates ? (
        <View
          style={[
            styles.ratesList,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
            },
          ]}>
          {targets.map((target, idx) => {
            const rate = rates.rates[target]!;
            const meta = CURRENCY_META[target] ?? {
              symbol: target[0],
              name: target,
            };
            const isLast = idx === targets.length - 1;

            return (
              <View key={target}>
                <View style={styles.rateRow}>
                  <View style={styles.rateLeft}>
                    <View
                      style={[
                        styles.currencyBadge,
                        { backgroundColor: theme.colors.background },
                      ]}>
                      <Text
                        style={{
                          fontSize: meta.symbol.length > 2 ? 11 : 18,
                          fontWeight: "900",
                          color: theme.colors.onSurface,
                        }}
                        adjustsFontSizeToFit
                        numberOfLines={1}>
                        {meta.symbol}
                      </Text>
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "800",
                          color: theme.colors.onSurface,
                          letterSpacing: -0.2,
                        }}>
                        {target}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: muted,
                          marginTop: 1,
                        }}
                        numberOfLines={1}>
                        {meta.name}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: "800",
                        color: theme.colors.onSurface,
                        letterSpacing: -0.3,
                      }}>
                      {meta.symbol}
                      {formatConverted(rate, numAmount)}
                    </Text>
                    <Text style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                      1 {base} = {formatBaseRate(rate)} {target}
                    </Text>
                  </View>
                </View>

                {!isLast && (
                  <View
                    style={[
                      styles.divider,
                      {
                        backgroundColor:
                          theme.colors.outlineVariant ?? theme.colors.outline,
                      },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  converterCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    gap: 12,
  },
  symbolBadge: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  amountInput: {
    flex: 1,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
    padding: 0,
  },
  ratesList: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rateLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  currencyBadge: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, marginHorizontal: 16 },
  errorBox: { alignItems: "center", marginTop: 80 },
  retryBtn: {
    marginTop: 16,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
});
