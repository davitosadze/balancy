import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
  TouchableOpacity,
  Platform,
} from "react-native";
import {
  Text,
  Button,
  Divider,
  useTheme,
  ActivityIndicator,
  Chip,
  IconButton,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { LoansStackParamList, Repayment } from "@/types";
import { useLoansStore } from "@store/loans";
import { formatAmount } from "@utils/currency";
import { formatDate, isOverdue } from "@utils/date";
import { cancelLoanNotifications } from "@utils/loanNotifications";
import { removeLoanFromCalendar } from "@utils/loanCalendar";
import { usePDF } from "@hooks/usePDF";
import { useAuthStore } from "@store/auth";
import { StatusBadge } from "@components/index";
import type { LoanParticipant } from "@/types";

type Props = NativeStackScreenProps<LoansStackParamList, "LoanDetail">;

export default function LoanDetailScreen({ route, navigation }: Props) {
  const { loanId } = route.params;
  const { t } = useTranslation();
  const theme = useTheme();
  const { user } = useAuthStore();
  const {
    loans,
    repayments: repaymentsMap,
    loadRepayments,
    removeRepayment,
    removeLoan,
  } = useLoansStore();
  const { generatePDF } = usePDF();
  const [loadingRepayments, setLoadingRepayments] = useState(false);

  const loan = loans.find((l) => l.id === loanId);
  const repayments: Repayment[] = repaymentsMap[loanId] ?? [];

  useEffect(() => {
    const fetch = async () => {
      setLoadingRepayments(true);
      try {
        await loadRepayments(loanId);
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "Failed to load repayments");
      } finally {
        setLoadingRepayments(false);
      }
    };
    fetch();
  }, [loanId]);

  const handleDelete = useCallback(() => {
    Alert.alert(t("common.confirm"), t("loans.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          await cancelLoanNotifications(loanId);
          await removeLoanFromCalendar(loanId);
          await removeLoan(loanId);
          navigation.goBack();
        },
      },
    ]);
  }, [t, removeLoan, loanId, navigation]);

  useEffect(() => {
    if (!loan) return;
    navigation.setOptions({
      headerRight: () => (
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginRight: 4,
            alignItems: "center",
          }}>
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: theme.colors.primaryContainer,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 20,
            }}
            onPress={() =>
              navigation.navigate("AddLoan", { editLoanId: loanId })
            }>
            <MaterialCommunityIcons
              name="pencil-outline"
              size={14}
              color={theme.colors.primary}
            />
            <Text
              style={{
                color: theme.colors.primary,
                fontSize: 13,
                fontWeight: "600",
              }}>
              {t("common.edit")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: theme.colors.errorContainer,
              padding: 7,
              borderRadius: 20,
            }}
            onPress={handleDelete}>
            <MaterialCommunityIcons
              name="delete-outline"
              size={18}
              color={theme.colors.error}
            />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [loan, loanId, navigation, theme, t, handleDelete]);

  if (!loan) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const paidSum = repayments.reduce((s, r) => s + Number(r.amount), 0);
  const outstanding = Math.max(0, Number(loan.amount) - paidSum);
  const overdue = isOverdue(loan.due_date) && loan.status !== "paid";

  const loanColor =
    loan.type === "lent"
      ? (theme as any).custom.lent
      : (theme as any).custom.borrowed;

  const handleDeleteRepayment = (repaymentId: string) => {
    Alert.alert(t("common.confirm"), t("repayments.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => removeRepayment(repaymentId, loanId),
      },
    ]);
  };

  const handleGeneratePDF = async () => {
    await generatePDF({
      loan,
      repayments,
      userName: `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim(),
    });
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}>
      {/* Header card */}
      <View
        style={[
          styles.headerCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
            borderLeftColor: loanColor,
          },
        ]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text
              variant="titleLarge"
              style={{ fontWeight: "800", letterSpacing: -0.5 }}>
              {loan.contact_name}
            </Text>
            {loan.phone && (
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 4,
                  gap: 6,
                }}
                onPress={() => Linking.openURL(`tel:${loan.phone}`)}>
                <Text
                  variant="bodySmall"
                  style={{
                    color: (theme as any).custom?.muted ?? theme.colors.outline,
                  }}>
                  {loan.phone}
                </Text>
                <View
                  style={{
                    backgroundColor: (theme as any).custom?.lent + "18",
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}>
                  <MaterialCommunityIcons
                    name="phone"
                    size={12}
                    color={(theme as any).custom?.lent}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: (theme as any).custom?.lent,
                    }}>
                    Call
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Type pill */}
        <View
          style={[
            {
              backgroundColor: loanColor + "18",
              alignSelf: "flex-start",
              marginTop: 10,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
            },
          ]}>
          <Text style={{ color: loanColor, fontWeight: "700", fontSize: 12 }}>
            {loan.type === "lent" ? t("loans.iLent") : t("loans.iBorrowed")}
          </Text>
        </View>
      </View>

      {/* Amounts */}
      <View
        style={[
          styles.amountsRow,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
          },
        ]}>
        <View style={styles.amountItem}>
          <Text
            variant="labelSmall"
            style={{
              color: (theme as any).custom?.muted ?? theme.colors.outline,
              letterSpacing: 0.5,
            }}>
            {t("loans.totalAmount").toUpperCase()}
          </Text>
          <Text
            variant="titleMedium"
            style={{ fontWeight: "800", letterSpacing: -0.5, marginTop: 4 }}>
            {formatAmount(Number(loan.amount), loan.currency)}
          </Text>
        </View>
        <View
          style={[
            styles.amountItem,
            styles.amountMiddle,
            {
              borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
            },
          ]}>
          <Text
            variant="labelSmall"
            style={{
              color: (theme as any).custom?.muted ?? theme.colors.outline,
              letterSpacing: 0.5,
            }}>
            {t("loans.paidAmount").toUpperCase()}
          </Text>
          <Text
            variant="titleMedium"
            style={{
              fontWeight: "800",
              color: (theme as any).custom.lent,
              letterSpacing: -0.5,
              marginTop: 4,
            }}>
            {formatAmount(paidSum, loan.currency)}
          </Text>
        </View>
        <View style={styles.amountItem}>
          <Text
            variant="labelSmall"
            style={{
              color: (theme as any).custom?.muted ?? theme.colors.outline,
              letterSpacing: 0.5,
            }}>
            {t("loans.outstandingBalance").toUpperCase()}
          </Text>
          <Text
            variant="titleMedium"
            style={{
              fontWeight: "800",
              letterSpacing: -0.5,
              marginTop: 4,
              color:
                loan.type === "lent"
                  ? (theme as any).custom.lent
                  : outstanding > 0
                    ? (theme as any).custom.borrowed
                    : (theme as any).custom.lent,
            }}>
            {formatAmount(outstanding, loan.currency)}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View
        style={[
          styles.detailCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
          },
        ]}>
        <DetailRow
          label={t("loans.loanDate")}
          value={formatDate(loan.loan_date)}
        />
        <Divider />
        <DetailRow
          label={t("loans.dueDate")}
          value={loan.due_date ? formatDate(loan.due_date) : "—"}
          valueStyle={
            overdue ? { color: (theme as any).custom.overdue } : undefined
          }
        />
        {loan.interest_rate != null && loan.interest_rate > 0 && (
          <>
            <Divider />
            <DetailRow
              label={t("loans.interestRate")}
              value={`${loan.interest_rate}%`}
              valueStyle={{
                color:
                  loan.type === "lent"
                    ? (theme as any).custom?.lent
                    : (theme as any).custom?.borrowed,
                fontWeight: "700",
              }}
            />
            <Divider />
            <DetailRow
              label={t("loans.totalWithInterest")}
              value={formatAmount(
                Number(loan.amount) * (1 + loan.interest_rate / 100),
                loan.currency,
              )}
              valueStyle={{ fontWeight: "800" }}
            />
          </>
        )}
        <Divider />
        <View style={styles.detailRow}>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.outline, flex: 1 }}>
            {t("loans.status")}
          </Text>
          <StatusBadge status={loan.status} overdue={overdue} compact={false} />
        </View>
        {loan.notes && (
          <>
            <Divider />
            <View style={styles.detailRow}>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.outline, flex: 1 }}>
                {t("loans.notes")}
              </Text>
              <Text
                variant="bodyMedium"
                style={{ flex: 2, textAlign: "right" }}>
                {loan.notes}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Action buttons */}
      {loan.status !== "paid" && (
        <Button
          mode="contained"
          icon="cash-plus"
          onPress={() =>
            navigation.navigate("AddRepayment", {
              loanId,
              loanAmount: Number(loan.amount),
              paidAmount: paidSum,
              currency: loan.currency,
              loanType: loan.type as "lent" | "borrowed",
            })
          }
          style={styles.actionBtn}
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ fontWeight: "700" }}>
          {t("repayments.addRepayment")}
        </Button>
      )}

      <Button
        mode="outlined"
        icon="file-pdf-box"
        onPress={handleGeneratePDF}
        style={[
          styles.actionBtn,
          { borderColor: theme.colors.outlineVariant ?? theme.colors.outline },
        ]}
        contentStyle={{ paddingVertical: 6 }}
        textColor={(theme as any).custom?.muted ?? theme.colors.outline}>
        {t("pdf.generateAgreement")}
      </Button>

      {/* Send Reminder — only when phone is available and loan is lent + not paid */}
      {loan.phone && loan.type === "lent" && loan.status !== "paid" && (
        <Button
          mode="outlined"
          icon="whatsapp"
          onPress={async () => {
            const phone = loan.phone!.replace(/\D/g, "");
            const amount = formatAmount(Number(loan.amount), loan.currency);
            const due = loan.due_date ? formatDate(loan.due_date) : null;
            const msg = due
              ? `Hi ${loan.contact_name}, this is a friendly reminder that you have an outstanding loan of ${amount} due on ${due}. Please make sure to repay on time. Thank you! 🙏`
              : `Hi ${loan.contact_name}, this is a friendly reminder that you have an outstanding loan of ${amount}. Please make sure to repay as soon as possible. Thank you! 🙏`;

            const waUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(msg)}`;
            const smsUrl =
              Platform.OS === "ios"
                ? `sms:${loan.phone}&body=${encodeURIComponent(msg)}`
                : `sms:${loan.phone}?body=${encodeURIComponent(msg)}`;

            const canWA = await Linking.canOpenURL(waUrl).catch(() => false);
            if (canWA) {
              await Linking.openURL(waUrl);
            } else {
              await Linking.openURL(smsUrl);
            }
          }}
          style={[styles.actionBtn, { borderColor: "#25D366" }]}
          contentStyle={{ paddingVertical: 6 }}
          textColor="#25D366"
          labelStyle={{ fontWeight: "700" }}>
          {t("loans.sendReminder")}
        </Button>
      )}

      {/* Repayments section */}
      <View style={styles.sectionHeader}>
        <Text
          variant="labelMedium"
          style={{
            fontWeight: "700",
            letterSpacing: 0.8,
            color: (theme as any).custom?.muted ?? theme.colors.outline,
          }}>
          {t("repayments.repaymentHistory").toUpperCase()}
        </Text>
      </View>

      {loadingRepayments ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : repayments.length === 0 ? (
        <Text
          variant="bodyMedium"
          style={{
            color: theme.colors.outline,
            textAlign: "center",
            marginTop: 12,
          }}>
          {t("repayments.noRepayments")}
        </Text>
      ) : (
        repayments.map((r, index) => (
          <View
            key={r.id}
            style={[
              styles.repaymentItem,
              {
                backgroundColor: theme.colors.surface,
                borderColor:
                  theme.colors.outlineVariant ?? theme.colors.outline,
              },
            ]}>
            <View style={styles.repaymentLeft}>
              <Text
                variant="titleSmall"
                style={{
                  fontWeight: "700",
                  color: (theme as any).custom.lent,
                }}>
                {formatAmount(Number(r.amount), loan.currency)}
              </Text>
              <Text
                variant="bodySmall"
                style={{
                  color: (theme as any).custom?.muted ?? theme.colors.outline,
                  marginTop: 2,
                }}>
                {formatDate(r.date)}
              </Text>
              {r.notes && (
                <Text
                  variant="bodySmall"
                  style={{
                    color: (theme as any).custom?.muted ?? theme.colors.outline,
                    marginTop: 2,
                  }}>
                  {r.notes}
                </Text>
              )}
              {r.paid_by && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 4,
                  }}>
                  <MaterialCommunityIcons
                    name="account-outline"
                    size={12}
                    color={theme.colors.primary}
                  />
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.primary, fontWeight: "600" }}>
                    {t("repayments.paidBy")}: {r.paid_by}
                  </Text>
                </View>
              )}
            </View>
            <IconButton
              icon="delete-outline"
              size={20}
              iconColor={theme.colors.error}
              onPress={() => handleDeleteRepayment(r.id)}
            />
          </View>
        ))
      )}

      {loan.status === "paid" && (
        <View
          style={[
            styles.paidBanner,
            {
              backgroundColor: (theme as any).custom.lent + "15",
              borderColor: (theme as any).custom.lent + "44",
            },
          ]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MaterialCommunityIcons
              name="check-circle"
              size={18}
              color={(theme as any).custom.lent}
            />
            <Text
              style={{
                color: (theme as any).custom.lent,
                fontWeight: "700",
              }}>
              {t("repayments.fullyPaid")}
            </Text>
          </View>
        </View>
      )}

      {/* Shared participants section */}
      {(() => {
        if (!loan.participants) return null;
        let parts: LoanParticipant[] = [];
        try {
          parts = JSON.parse(loan.participants);
        } catch {
          return null;
        }
        if (parts.length === 0) return null;
        return (
          <>
            <View style={[styles.sectionHeader, { marginTop: 16 }]}>
              <Text
                variant="labelMedium"
                style={{
                  fontWeight: "700",
                  letterSpacing: 0.8,
                  color: (theme as any).custom?.muted ?? theme.colors.outline,
                }}>
                {t("loans.participants").toUpperCase()}
              </Text>
            </View>
            <View
              style={[
                styles.detailCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor:
                    theme.colors.outlineVariant ?? theme.colors.outline,
                },
              ]}>
              {parts.map((p, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <Divider />}
                  <View
                    style={[
                      styles.detailRow,
                      { alignItems: "flex-start", paddingVertical: 12 },
                    ]}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" style={{ fontWeight: "700" }}>
                        {p.name || `Person ${i + 1}`}
                      </Text>
                      {p.phone ? (
                        <TouchableOpacity
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            marginTop: 4,
                          }}
                          onPress={() => Linking.openURL(`tel:${p.phone}`)}>
                          <MaterialCommunityIcons
                            name="phone"
                            size={12}
                            color={(theme as any).custom?.lent}
                          />
                          <Text
                            variant="bodySmall"
                            style={{ color: (theme as any).custom?.lent }}>
                            {p.phone}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <Text
                      variant="bodyMedium"
                      style={{
                        fontWeight: "800",
                        color: loanColor,
                        letterSpacing: -0.5,
                      }}>
                      {p.amount} {loan.currency}
                    </Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </>
        );
      })()}
    </ScrollView>
  );
}

function DetailRow({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: any;
}) {
  const theme = useTheme();
  return (
    <View style={styles.detailRow}>
      <Text
        variant="bodySmall"
        style={{ color: theme.colors.outline, flex: 1 }}>
        {label}
      </Text>
      <Text
        variant="bodyMedium"
        style={[{ flex: 2, textAlign: "right" }, valueStyle]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  headerCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  amountsRow: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  amountItem: { flex: 1, alignItems: "center" },
  amountMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#e4e4e7",
  },
  detailCard: {
    borderRadius: 20,
    padding: 4,
    marginBottom: 10,
    borderWidth: 1,
  },
  detailRow: { flexDirection: "row", padding: 14, alignItems: "center" },
  actionBtn: { marginBottom: 10, borderRadius: 12 },
  sectionHeader: { marginTop: 12, marginBottom: 10 },
  repaymentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    paddingLeft: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  repaymentLeft: { flex: 1, paddingVertical: 12 },
  paidBanner: {
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
  },
});
