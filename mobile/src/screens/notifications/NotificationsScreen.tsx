import React, { useState, useCallback } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { Text, useTheme, ActivityIndicator } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { EmptyState } from "@components/index";

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [scheduled, setScheduled] = useState<
    Notifications.NotificationRequest[]
  >([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setLoading(true);
        const all = await Notifications.getAllScheduledNotificationsAsync();

        const getFireMs = (n: Notifications.NotificationRequest): number => {
          const trigger = n.trigger as any;
          if (!trigger) return Infinity;
          // Android DATE trigger: value is epoch milliseconds
          if (typeof trigger.value === "number") return trigger.value;
          // iOS calendar trigger: dateComponents has year/month/day/hour/minute
          if (trigger.dateComponents) {
            const dc = trigger.dateComponents;
            if (dc.year && dc.month && dc.day) {
              return new Date(
                dc.year,
                dc.month - 1,
                dc.day,
                dc.hour ?? 0,
                dc.minute ?? 0,
              ).getTime();
            }
          }
          // timeInterval trigger: seconds is relative interval from now
          if (typeof trigger.seconds === "number") {
            // Large value (> year 2000 in seconds) = epoch seconds
            if (trigger.seconds > 946684800) return trigger.seconds * 1000;
            return Date.now() + trigger.seconds * 1000;
          }
          return Infinity;
        };

        // Sort soonest first, then deduplicate by title (keep only the next upcoming per loan)
        const sorted = [...all].sort((a, b) => getFireMs(a) - getFireMs(b));
        const seen = new Set<string>();
        const deduped = sorted.filter((n) => {
          const title = n.content.title ?? "";
          if (seen.has(title)) return false;
          seen.add(title);
          return true;
        });
        setScheduled(deduped);
        setLoading(false);
      };
      load();
    }, []),
  );

  if (loading)
    return (
      <ActivityIndicator style={{ flex: 1, marginTop: 60 }} size="large" />
    );

  if (scheduled.length === 0) {
    return (
      <EmptyState
        message={t("notifications.noNotifications")}
        icon="bell-outline"
      />
    );
  }

  return (
    <FlatList
      data={scheduled}
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      keyExtractor={(item) => item.identifier}
      renderItem={({ item }) => {
        const trigger = item.trigger as any;
        let fireDate: Date | null = null;
        if (trigger) {
          if (typeof trigger.value === "number") {
            fireDate = new Date(trigger.value);
          } else if (trigger.dateComponents) {
            const dc = trigger.dateComponents;
            if (dc.year && dc.month && dc.day) {
              fireDate = new Date(
                dc.year,
                dc.month - 1,
                dc.day,
                dc.hour ?? 0,
                dc.minute ?? 0,
              );
            }
          } else if (typeof trigger.seconds === "number") {
            fireDate =
              trigger.seconds > 946684800
                ? new Date(trigger.seconds * 1000)
                : new Date(Date.now() + trigger.seconds * 1000);
          }
        }

        const title = item.content.title ?? "Reminder";
        const body = item.content.body ?? "";

        // Determine if overdue relative to now
        const isToday = fireDate
          ? fireDate.toDateString() === new Date().toDateString()
          : false;

        return (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor:
                  theme.colors.outlineVariant ?? theme.colors.outline,
              },
            ]}>
            {/* Icon + title row */}
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: theme.colors.primary + "18" },
                ]}>
                <MaterialCommunityIcons
                  name="bell-outline"
                  size={18}
                  color={theme.colors.primary}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  variant="bodyMedium"
                  style={{ fontWeight: "700", color: theme.colors.onSurface }}
                  numberOfLines={1}>
                  {title}
                </Text>
                {fireDate && (
                  <Text
                    variant="bodySmall"
                    style={{
                      color: isToday
                        ? theme.colors.primary
                        : ((theme as any).custom?.muted ??
                          theme.colors.outline),
                      marginTop: 2,
                      fontWeight: isToday ? "700" : "400",
                    }}>
                    {fireDate.toLocaleDateString(undefined, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    ·{" "}
                    {fireDate.toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                )}
              </View>
            </View>

            {/* Body */}
            {body.length > 0 && (
              <Text
                variant="bodySmall"
                style={{
                  color: (theme as any).custom?.muted ?? theme.colors.outline,
                  marginTop: 10,
                  lineHeight: 18,
                }}>
                {body}
              </Text>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});
