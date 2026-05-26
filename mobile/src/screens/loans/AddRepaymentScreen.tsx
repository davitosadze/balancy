import React, { useMemo, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Text, TextInput, Button, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { LoanParticipant, LoansStackParamList } from "@/types";
import { useLoansStore } from "@store/loans";
import { formatAmount } from "@utils/currency";
import { formatDate, todayISO } from "@utils/date";

type Props = NativeStackScreenProps<LoansStackParamList, "AddRepayment">;

const schema = z.object({
  amount: z
    .string()
    .min(1)
    .refine(
      (v) => !isNaN(Number(v)) && Number(v) > 0,
      "Must be a positive number",
    ),
  date: z.string().min(1),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function AddRepaymentScreen({ route, navigation }: Props) {
  const { loanId, loanAmount, paidAmount, currency, loanType } = route.params;
  const { t } = useTranslation();
  const theme = useTheme();
  const {
    addRepayment,
    isLoading,
    loans,
    repayments: repaymentsMap,
  } = useLoansStore();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedPaidBy, setSelectedPaidBy] = useState<string | null>(null);

  const outstanding = Math.max(0, loanAmount - paidAmount);
  const loanRepayments = repaymentsMap[loanId] ?? [];

  // Derive participants from the loan in the store
  const participants = useMemo<LoanParticipant[]>(() => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan?.participants) return [];
    try {
      return JSON.parse(loan.participants) as LoanParticipant[];
    } catch {
      return [];
    }
  }, [loans, loanId]);

  // How much the selected participant can still pay (their share minus what they already paid)
  const participantRemaining = useMemo<number | null>(() => {
    if (!selectedPaidBy) return null;
    const p = participants.find((p) => p.name === selectedPaidBy);
    if (!p) return null;
    const alreadyPaid = loanRepayments
      .filter((r) => r.paid_by === selectedPaidBy)
      .reduce((sum, r) => sum + Number(r.amount), 0);
    return Math.max(0, Number(p.amount) - alreadyPaid);
  }, [selectedPaidBy, participants, loanRepayments]);

  // Base for info card and quick-fill: use participant's remaining when one is selected
  const activeBalance =
    participantRemaining !== null ? participantRemaining : outstanding;

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { amount: "", date: todayISO(), notes: "" },
  });

  const watchedDate = watch("date");

  const onSubmit = async (data: FormData) => {
    // Validate against participant's remaining share
    if (
      participantRemaining !== null &&
      Number(data.amount) > participantRemaining
    ) {
      Alert.alert(
        t("common.error"),
        `${selectedPaidBy} ${t("repayments.exceedsShare")} (${formatAmount(participantRemaining, currency)})`,
      );
      return;
    }
    try {
      await addRepayment({
        loan_id: loanId,
        amount: Number(data.amount),
        date: data.date,
        notes: data.notes || undefined,
        paid_by: selectedPaidBy || undefined,
        loanTotal: loanAmount,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? t("common.error"));
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled">
      {/* Outstanding balance info */}
      <View
        style={[
          styles.infoCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
          },
        ]}>
        <Text
          variant="labelSmall"
          style={{
            color: (theme as any).custom?.muted ?? theme.colors.outline,
            letterSpacing: 0.8,
          }}>
          {selectedPaidBy
            ? `${selectedPaidBy.toUpperCase()} — ${t("repayments.remaining").toUpperCase()}`
            : t("loans.outstandingBalance").toUpperCase()}
        </Text>
        <Text
          variant="headlineMedium"
          style={{
            fontWeight: "800",
            color:
              loanType === "lent"
                ? (theme as any).custom?.lent
                : (theme as any).custom?.borrowed,
            marginTop: 4,
            letterSpacing: -1,
          }}>
          {formatAmount(activeBalance, currency)}
        </Text>
      </View>

      {/* Amount */}
      <Controller
        control={control}
        name="amount"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label={t("repayments.repaymentAmount")}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
            error={!!errors.amount}
            right={<TextInput.Affix text={currency} />}
          />
        )}
      />
      {errors.amount && (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {errors.amount.message}
        </Text>
      )}

      {/* Quick fill buttons */}
      <View style={styles.quickFill}>
        {[25, 50, 75, 100].map((pct) => (
          <TouchableOpacity
            key={pct}
            style={[
              styles.pctBtn,
              {
                borderColor:
                  theme.colors.outlineVariant ?? theme.colors.outline,
              },
            ]}
            onPress={() =>
              setValue(
                "amount",
                String(((activeBalance * pct) / 100).toFixed(2)),
              )
            }>
            <Text
              style={{
                color: theme.colors.onSurface,
                fontSize: 12,
                fontWeight: "600",
              }}>
              {pct}%
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date */}
      <TouchableOpacity
        style={[
          styles.dateField,
          {
            borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
            backgroundColor: theme.colors.surface,
          },
        ]}
        onPress={() => setShowDatePicker(true)}>
        <Text
          variant="labelSmall"
          style={{
            color: (theme as any).custom?.muted ?? theme.colors.outline,
          }}>
          {t("repayments.repaymentDate")}
        </Text>
        <Text variant="bodyLarge" style={{ fontWeight: "600" }}>
          {formatDate(watchedDate)}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={new Date(watchedDate)}
          mode="date"
          onChange={(_, date) => {
            setShowDatePicker(false);
            if (date) setValue("date", date.toISOString().split("T")[0]);
          }}
        />
      )}

      {/* Paid by — only shown for shared loans */}
      {participants.length > 0 && (
        <View style={styles.paidBySection}>
          <Text
            variant="labelMedium"
            style={{
              color: (theme as any).custom?.muted ?? theme.colors.outline,
              marginBottom: 10,
              letterSpacing: 0.5,
            }}>
            {t("repayments.paidBy").toUpperCase()}
          </Text>
          <View style={styles.paidByRow}>
            {participants.map((p) => {
              const active = selectedPaidBy === p.name;
              return (
                <TouchableOpacity
                  key={p.name}
                  style={[
                    styles.paidByChip,
                    {
                      backgroundColor: active
                        ? theme.colors.primary
                        : theme.colors.surface,
                      borderColor: active
                        ? theme.colors.primary
                        : (theme.colors.outlineVariant ?? theme.colors.outline),
                    },
                  ]}
                  onPress={() => setSelectedPaidBy(active ? null : p.name)}>
                  <Text
                    style={{
                      color: active
                        ? theme.colors.onPrimary
                        : theme.colors.onSurface,
                      fontWeight: "600",
                      fontSize: 13,
                    }}>
                    {p.name}
                  </Text>
                  {(() => {
                    const alreadyPaid = loanRepayments
                      .filter((r) => r.paid_by === p.name)
                      .reduce((s, r) => s + Number(r.amount), 0);
                    const rem = Math.max(0, Number(p.amount) - alreadyPaid);
                    return (
                      <Text
                        style={{
                          color: active
                            ? theme.colors.onPrimary + "cc"
                            : ((theme as any).custom?.muted ??
                              theme.colors.outline),
                          fontSize: 10,
                          marginTop: 1,
                        }}>
                        {formatAmount(rem, currency)}
                      </Text>
                    );
                  })()}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Notes */}
      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label={`${t("loans.notes")} (${t("common.optional")})`}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            multiline
            numberOfLines={3}
            mode="outlined"
            style={styles.input}
            outlineStyle={styles.inputOutline}
          />
        )}
      />

      <Button
        mode="contained"
        onPress={handleSubmit(onSubmit)}
        loading={isLoading}
        disabled={isLoading}
        style={[styles.submitBtn, { marginTop: 16 }]}
        contentStyle={{ paddingVertical: 8 }}
        labelStyle={{ fontWeight: "700", fontSize: 15 }}>
        {t("common.save")}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  infoCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
  },
  input: { marginBottom: 12, backgroundColor: "transparent" },
  inputOutline: { borderRadius: 12 },
  errorText: { fontSize: 12, marginTop: -8, marginBottom: 8, marginLeft: 4 },
  dateField: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quickFill: { flexDirection: "row", gap: 8, marginBottom: 16 },
  pctBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  paidBySection: { marginBottom: 16 },
  paidByRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  paidByChip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  submitBtn: { borderRadius: 12 },
});
