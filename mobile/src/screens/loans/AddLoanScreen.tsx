import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  Linking,
  Platform,
  Switch,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Divider,
  Searchbar,
  ActivityIndicator,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Contacts from "expo-contacts";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { LoansStackParamList, LoanType, LoanParticipant } from "@/types";
import { useLoansStore } from "@store/loans";
import { CURRENCIES } from "@utils/currency";
import { todayISO, formatDate } from "@utils/date";
import {
  scheduleLoanNotifications,
  cancelLoanNotifications,
} from "@utils/loanNotifications";
import { addLoanToCalendar, removeLoanFromCalendar } from "@utils/loanCalendar";

type Props = NativeStackScreenProps<LoansStackParamList, "AddLoan">;

const loanSchema = z.object({
  type: z.enum(["lent", "borrowed"]),
  contact_name: z.string().min(1, "Contact name is required"),
  contact_id: z
    .union([z.string(), z.number()])
    .nullish()
    .transform((v) => (v != null ? String(v) : v)),
  phone: z.string().nullish(),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, {
      message: "Amount must be a positive number",
    }),
  currency: z.string().min(1, "Currency is required"),
  loan_date: z.string().min(1, "Loan date is required"),
  due_date: z.string().nullish(),
  notes: z.string().nullish(),
  interest_rate: z.string().nullish(),
});
type LoanFormData = z.infer<typeof loanSchema>;

function SectionLabel({
  icon,
  label,
  color,
}: {
  icon: string;
  label: string;
  color: string;
}) {
  return (
    <View style={sectionLabelStyle.wrap}>
      <MaterialCommunityIcons name={icon as any} size={14} color={color} />
      <Text style={[sectionLabelStyle.text, { color }]}>{label}</Text>
    </View>
  );
}
const sectionLabelStyle = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
    marginTop: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});

export default function AddLoanScreen({ route, navigation }: Props) {
  const { editLoanId } = route.params ?? {};
  const { t } = useTranslation();
  const theme = useTheme();
  const {
    addLoan,
    editLoan,
    loans,
    loadContacts,
    contacts,
    addContact,
    isLoading,
  } = useLoansStore();

  const existingLoan = editLoanId
    ? loans.find((l) => l.id === editLoanId)
    : null;

  const [showLoanDatePicker, setShowLoanDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [tempLoanDate, setTempLoanDate] = useState(new Date());
  const [tempDueDate, setTempDueDate] = useState(new Date());
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [phoneContacts, setPhoneContacts] = useState<
    Contacts.ExistingContact[]
  >([]);
  const [contactSearch, setContactSearch] = useState("");
  const [currencySearch, setCurrencySearch] = useState("");

  // ── Shared loan state ────────────────────────────────────────────────────
  const [isShared, setIsShared] = useState(() => {
    if (existingLoan?.participants) {
      try {
        const p = JSON.parse(existingLoan.participants) as LoanParticipant[];
        return p.length > 0;
      } catch {
        return false;
      }
    }
    return false;
  });
  const [participants, setParticipants] = useState<LoanParticipant[]>(() => {
    if (existingLoan?.participants) {
      try {
        return JSON.parse(existingLoan.participants) as LoanParticipant[];
      } catch {
        return [];
      }
    }
    return [];
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      type: existingLoan?.type ?? "lent",
      contact_name: existingLoan?.contact_name ?? "",
      contact_id: existingLoan?.contact_id ?? undefined,
      phone: existingLoan?.phone ?? "",
      amount: existingLoan ? String(existingLoan.amount) : "",
      currency: existingLoan?.currency ?? "GEL",
      loan_date: existingLoan?.loan_date ?? todayISO(),
      due_date: existingLoan?.due_date ?? undefined,
      notes: existingLoan?.notes ?? "",
      interest_rate:
        existingLoan?.interest_rate != null
          ? String(existingLoan.interest_rate)
          : "",
    },
  });

  const watchedValues = watch();
  const isLent = watchedValues.type === "lent";
  const typeAccent = isLent ? "#16a34a" : "#dc2626";

  // When toggling split on, seed 1 equal participant
  const handleToggleShared = (val: boolean) => {
    setIsShared(val);
    if (val && participants.length === 0) {
      const eq = Number(watchedValues.amount) || 0;
      setParticipants([{ name: "", amount: eq }]);
    }
    if (!val) setParticipants([]);
  };

  // Recompute equal split when amount changes and equal-split is active
  const recomputeEqualSplit = (pList: LoanParticipant[], totalStr: string) => {
    const total = Number(totalStr) || 0;
    if (pList.length === 0) return pList;
    const each = Math.round((total / pList.length) * 100) / 100;
    return pList.map((p) => ({ ...p, amount: each }));
  };

  const addParticipant = () => {
    if (participants.length >= 9) return;
    const total = Number(watchedValues.amount) || 0;
    const newList = [...participants, { name: "", amount: 0 }];
    setParticipants(recomputeEqualSplit(newList, String(total)));
  };

  const removeParticipant = (index: number) => {
    const newList = participants.filter((_, i) => i !== index);
    setParticipants(recomputeEqualSplit(newList, watchedValues.amount));
    if (newList.length === 0) setIsShared(false);
  };

  const updateParticipant = (
    index: number,
    field: keyof LoanParticipant,
    value: string,
  ) => {
    setParticipants((prev) =>
      prev.map((p, i) =>
        i === index
          ? { ...p, [field]: field === "amount" ? Number(value) || 0 : value }
          : p,
      ),
    );
  };

  // Load saved contacts on mount
  useEffect(() => {
    loadContacts();
  }, []);

  const openContactPicker = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status === "granted") {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });
      setPhoneContacts(data.filter((c) => c.name));
    } else {
      Alert.alert(
        t("loans.contactsPermissionTitle"),
        t("loans.contactsPermissionMessage"),
        [
          {
            text: t("common.cancel"),
            style: "cancel",
          },
          {
            text: t("loans.openSettings"),
            onPress: () => Linking.openSettings(),
          },
        ],
      );
    }
    setShowContactModal(true);
  };

  const selectPhoneContact = async (contact: Contacts.ExistingContact) => {
    const phone = contact.phoneNumbers?.[0]?.number ?? "";
    let contactId: string | undefined;
    try {
      const existing = contacts.find(
        (c) => c.name.toLowerCase() === (contact.name ?? "").toLowerCase(),
      );
      if (existing) {
        contactId = existing.id;
      } else {
        const created = await addContact({ name: contact.name ?? "", phone });
        contactId = created.id;
      }
    } catch {
      // contact_id is optional — proceed without it if creation fails
    }
    setValue("contact_name", contact.name ?? "");
    setValue("phone", phone);
    setValue("contact_id", contactId ? String(contactId) : undefined);
    setContactSearch("");
    setShowContactModal(false);
  };

  const selectSavedContact = (contact: {
    id: string;
    name: string;
    phone: string | null;
  }) => {
    setValue("contact_name", contact.name);
    setValue("phone", contact.phone ?? "");
    setValue("contact_id", String(contact.id));
    setContactSearch("");
    setShowContactModal(false);
  };

  const onSubmit = async (data: LoanFormData) => {
    try {
      // If no contact was picked from the list, create one from the typed name/phone
      let resolvedContactId = data.contact_id ?? null;
      if (!resolvedContactId && data.contact_name) {
        try {
          const created = await addContact({
            name: data.contact_name,
            phone: data.phone ?? "",
          });
          resolvedContactId = String(created.id);
        } catch {
          // Non-critical — proceed without contact_id if creation fails
        }
      }

      const payload = {
        type: data.type as LoanType,
        contact_name: data.contact_name,
        contact_id: resolvedContactId,
        phone: data.phone ?? null,
        amount: Number(data.amount),
        currency: data.currency,
        loan_date: data.loan_date,
        due_date: data.due_date ?? null,
        notes: data.notes ?? null,
        interest_rate:
          data.interest_rate && Number(data.interest_rate) > 0
            ? Number(data.interest_rate)
            : null,
        participants:
          isShared && participants.length > 0
            ? JSON.stringify(participants)
            : null,
      };
      if (editLoanId) {
        await editLoan(editLoanId, payload);
        if (payload.due_date) {
          await scheduleLoanNotifications({
            loanId: editLoanId,
            contactName: payload.contact_name,
            amount: payload.amount,
            currency: payload.currency,
            dueDate: payload.due_date,
            loanType: payload.type,
          });
          // Ask to update calendar
          Alert.alert(t("loans.addToCalendar"), t("loans.calendarPrompt"), [
            { text: t("common.no"), style: "cancel" },
            {
              text: t("common.yes"),
              onPress: async () => {
                await addLoanToCalendar({
                  ...payload,
                  id: editLoanId,
                  user_created: "",
                  date_created: "",
                  date_updated: "",
                  status: "active",
                });
              },
            },
          ]);
        } else {
          await cancelLoanNotifications(editLoanId);
          await removeLoanFromCalendar(editLoanId);
        }
      } else {
        const newLoan = await addLoan(payload);
        if (payload.due_date) {
          await scheduleLoanNotifications({
            loanId: newLoan.id,
            contactName: payload.contact_name,
            amount: payload.amount,
            currency: payload.currency,
            dueDate: payload.due_date,
            loanType: payload.type,
          });
          // Ask to add to calendar
          Alert.alert(t("loans.addToCalendar"), t("loans.calendarPrompt"), [
            { text: t("common.no"), style: "cancel" },
            {
              text: t("common.yes"),
              onPress: async () => {
                await addLoanToCalendar(newLoan);
              },
            },
          ]);
        }
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? t("common.error"));
    }
  };

  const filteredPhoneContacts = phoneContacts.filter((c) =>
    (c.name ?? "").toLowerCase().includes(contactSearch.toLowerCase()),
  );
  const filteredSavedContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()),
  );

  const filteredCurrencies = currencySearch
    ? CURRENCIES.filter(
        (c) =>
          c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
          c.name.toLowerCase().includes(currencySearch.toLowerCase()),
      )
    : CURRENCIES;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled">
      {/* ── TYPE SELECTOR ────────────────────────────────────────────────── */}
      <Controller
        control={control}
        name="type"
        render={({ field: { onChange, value } }) => (
          <View style={styles.typeRow}>
            {/* Lent card */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.typeCard,
                {
                  borderColor:
                    value === "lent" ? "#16a34a" : theme.colors.surfaceVariant,
                  backgroundColor:
                    value === "lent" ? "#f0fdf4" : theme.colors.surfaceVariant,
                },
              ]}
              onPress={() => onChange("lent")}>
              <View
                style={[
                  styles.typeIconWrap,
                  {
                    backgroundColor:
                      value === "lent" ? "#dcfce7" : theme.colors.surface,
                  },
                ]}>
                <MaterialCommunityIcons
                  name="arrow-up-circle"
                  size={28}
                  color={value === "lent" ? "#16a34a" : theme.colors.outline}
                />
              </View>
              <Text
                style={[
                  styles.typeLabel,
                  {
                    color:
                      value === "lent"
                        ? "#16a34a"
                        : theme.colors.onSurfaceVariant,
                  },
                ]}>
                {t("loans.iLent")}
              </Text>
              <Text
                style={[
                  styles.typeSubLabel,
                  {
                    color: value === "lent" ? "#22c55e" : theme.colors.outline,
                  },
                ]}>
                {t("loans.youGaveMoney")}
              </Text>
            </TouchableOpacity>

            {/* Borrowed card */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.typeCard,
                {
                  borderColor:
                    value === "borrowed"
                      ? "#dc2626"
                      : theme.colors.surfaceVariant,
                  backgroundColor:
                    value === "borrowed"
                      ? "#fef2f2"
                      : theme.colors.surfaceVariant,
                },
              ]}
              onPress={() => onChange("borrowed")}>
              <View
                style={[
                  styles.typeIconWrap,
                  {
                    backgroundColor:
                      value === "borrowed" ? "#fee2e2" : theme.colors.surface,
                  },
                ]}>
                <MaterialCommunityIcons
                  name="arrow-down-circle"
                  size={28}
                  color={
                    value === "borrowed" ? "#dc2626" : theme.colors.outline
                  }
                />
              </View>
              <Text
                style={[
                  styles.typeLabel,
                  {
                    color:
                      value === "borrowed"
                        ? "#dc2626"
                        : theme.colors.onSurfaceVariant,
                  },
                ]}>
                {t("loans.iBorrowed")}
              </Text>
              <Text
                style={[
                  styles.typeSubLabel,
                  {
                    color:
                      value === "borrowed" ? "#ef4444" : theme.colors.outline,
                  },
                ]}>
                {t("loans.youReceivedMoney")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* ── PERSON ───────────────────────────────────────────────────────── */}
      <SectionLabel
        icon="account-circle-outline"
        label={t("loans.person")}
        color={theme.colors.primary}
      />
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}>
        <View style={[styles.row, { alignItems: "flex-end" }]}>
          <Controller
            control={control}
            name="contact_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t("loans.contactName")}
                placeholder={t("loans.contactNamePlaceholder")}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                mode="outlined"
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                outlineColor={theme.colors.outlineVariant}
                activeOutlineColor={theme.colors.primary}
                outlineStyle={{ borderRadius: 12 }}
                error={!!errors.contact_name}
                left={<TextInput.Icon icon="account-outline" />}
              />
            )}
          />
          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: theme.colors.primaryContainer },
            ]}
            onPress={openContactPicker}>
            <MaterialCommunityIcons
              name="contacts-outline"
              size={20}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>
        {errors.contact_name && (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {t("common.required")}
          </Text>
        )}

        <View
          style={[
            styles.cardDivider,
            { backgroundColor: theme.colors.outlineVariant },
          ]}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label={`${t("loans.phone")} (${t("common.optional")})`}
              placeholder={t("loans.phonePlaceholder")}
              value={value ?? undefined}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="phone-pad"
              mode="outlined"
              style={[styles.input, { marginBottom: 0 }]}
              outlineColor={theme.colors.outlineVariant}
              activeOutlineColor={theme.colors.primary}
              outlineStyle={{ borderRadius: 12 }}
              left={<TextInput.Icon icon="phone-outline" />}
            />
          )}
        />
      </View>

      {/* ── AMOUNT ───────────────────────────────────────────────────────── */}
      <SectionLabel
        icon="cash-multiple"
        label={t("loans.amount")}
        color={theme.colors.primary}
      />
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}>
        <View style={[styles.row, { alignItems: "flex-end" }]}>
          <Controller
            control={control}
            name="amount"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t("loans.amount")}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                outlineColor={theme.colors.outlineVariant}
                activeOutlineColor={theme.colors.primary}
                outlineStyle={{ borderRadius: 12 }}
                error={!!errors.amount}
                left={<TextInput.Icon icon="cash" />}
              />
            )}
          />
          <TouchableOpacity
            style={[
              styles.currencyBtn,
              {
                borderColor: theme.colors.primary,
                backgroundColor: theme.colors.primaryContainer,
              },
            ]}
            onPress={() => setShowCurrencyModal(true)}>
            <Text
              style={[styles.currencyBtnText, { color: theme.colors.primary }]}>
              {watchedValues.currency}
            </Text>
          </TouchableOpacity>
        </View>
        {errors.amount && (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {errors.amount.type === "too_small"
              ? t("loans.amountRequired")
              : t("loans.amountMustBePositive")}
          </Text>
        )}
      </View>

      {/* ── DATES ────────────────────────────────────────────────────────── */}
      <SectionLabel
        icon="calendar-outline"
        label={t("loans.dates")}
        color={theme.colors.primary}
      />
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}>
        {/* Loan Date row */}
        <TouchableOpacity
          style={styles.dateRow}
          activeOpacity={0.7}
          onPress={() => {
            setTempLoanDate(new Date(watchedValues.loan_date || todayISO()));
            setShowLoanDatePicker(true);
          }}>
          <View
            style={[
              styles.dateIconWrap,
              { backgroundColor: theme.colors.primaryContainer },
            ]}>
            <MaterialCommunityIcons
              name="calendar-check"
              size={18}
              color={theme.colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.dateLabelTxt, { color: theme.colors.outline }]}>
              {t("loans.loanDate")}
            </Text>
            <Text
              style={[styles.dateValueTxt, { color: theme.colors.onSurface }]}>
              {formatDate(watchedValues.loan_date)}
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={theme.colors.outline}
          />
        </TouchableOpacity>

        <View
          style={[
            styles.cardDivider,
            { backgroundColor: theme.colors.outlineVariant },
          ]}
        />

        {/* Due Date row */}
        <TouchableOpacity
          style={styles.dateRow}
          activeOpacity={0.7}
          onPress={() => {
            setTempDueDate(
              watchedValues.due_date
                ? new Date(watchedValues.due_date)
                : new Date(),
            );
            setShowDueDatePicker(true);
          }}>
          <View
            style={[
              styles.dateIconWrap,
              {
                backgroundColor: watchedValues.due_date
                  ? "#fef3c7"
                  : theme.colors.surfaceVariant,
              },
            ]}>
            <MaterialCommunityIcons
              name="calendar-clock"
              size={18}
              color={watchedValues.due_date ? "#d97706" : theme.colors.outline}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.dateLabelTxt, { color: theme.colors.outline }]}>
              {t("loans.dueDate")} ({t("common.optional")})
            </Text>
            <Text
              style={[
                styles.dateValueTxt,
                {
                  color: watchedValues.due_date
                    ? theme.colors.onSurface
                    : theme.colors.outline,
                },
              ]}>
              {watchedValues.due_date
                ? formatDate(watchedValues.due_date)
                : t("common.notSet")}
            </Text>
          </View>
          {watchedValues.due_date ? (
            <TouchableOpacity
              onPress={() => setValue("due_date", undefined)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color={theme.colors.error}
              />
            </TouchableOpacity>
          ) : (
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={theme.colors.outline}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* ── NOTES ────────────────────────────────────────────────────────── */}
      <SectionLabel
        icon="note-text-outline"
        label={t("loans.notes")}
        color={theme.colors.primary}
      />
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}>
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label={`${t("loans.notes")} (${t("common.optional")})`}
              placeholder={t("loans.notesPlaceholder")}
              value={value ?? undefined}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              numberOfLines={3}
              mode="outlined"
              style={[styles.input, { marginBottom: 0 }]}
              outlineColor={theme.colors.outlineVariant}
              activeOutlineColor={theme.colors.primary}
              outlineStyle={{ borderRadius: 12 }}
              left={<TextInput.Icon icon="note-outline" />}
            />
          )}
        />
      </View>

      {/* ── SHARED LOAN ──────────────────────────────────────────────────── */}
      <SectionLabel
        icon="account-multiple-outline"
        label={t("loans.sharedLoan")}
        color={theme.colors.primary}
      />
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isShared
              ? typeAccent + "66"
              : (theme.colors.outlineVariant ?? theme.colors.outline),
          },
        ]}>
        {/* Toggle row */}
        <View
          style={[
            styles.row,
            { justifyContent: "space-between", paddingVertical: 4 },
          ]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                backgroundColor: isShared
                  ? typeAccent + "18"
                  : (theme.colors.outlineVariant ?? theme.colors.outline) +
                    "30",
                alignItems: "center",
                justifyContent: "center",
              }}>
              <MaterialCommunityIcons
                name="account-group-outline"
                size={20}
                color={isShared ? typeAccent : theme.colors.outline}
              />
            </View>
            <View>
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 15,
                  color: theme.colors.onSurface,
                }}>
                {t("loans.splitWith")}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.outline, marginTop: 1 }}>
                {isShared && participants.length > 0
                  ? `${participants.length} ${t("loans.participants").toLowerCase()}`
                  : t("common.optional")}
              </Text>
            </View>
          </View>
          <Switch
            value={isShared}
            onValueChange={handleToggleShared}
            trackColor={{ true: typeAccent }}
            thumbColor={isShared ? "#fff" : theme.colors.outline}
          />
        </View>

        {/* Participants list */}
        {isShared && (
          <>
            <View
              style={[
                styles.cardDivider,
                {
                  backgroundColor:
                    theme.colors.outlineVariant ?? theme.colors.outline,
                  marginTop: 16,
                },
              ]}
            />

            {participants.map((p, idx) => (
              <View
                key={idx}
                style={[
                  styles.participantCard,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor:
                      theme.colors.outlineVariant ?? theme.colors.outline,
                  },
                ]}>
                {/* Participant header: number + remove */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}>
                    <View
                      style={[
                        styles.participantBadge,
                        { backgroundColor: typeAccent + "20" },
                      ]}>
                      <Text
                        style={{
                          color: typeAccent,
                          fontWeight: "800",
                          fontSize: 12,
                        }}>
                        {idx + 1}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontWeight: "600",
                        color: theme.colors.outline,
                        fontSize: 12,
                      }}>
                      {t("loans.participants").replace(/s$/, "")} {idx + 1}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeParticipant(idx)}
                    style={[
                      styles.removeBtn,
                      { backgroundColor: theme.colors.error + "15" },
                    ]}>
                    <MaterialCommunityIcons
                      name="close"
                      size={14}
                      color={theme.colors.error}
                    />
                  </TouchableOpacity>
                </View>

                {/* Name field */}
                <TextInput
                  label={t("loans.participantName")}
                  value={p.name}
                  onChangeText={(v) => updateParticipant(idx, "name", v)}
                  mode="outlined"
                  style={[styles.input, { marginBottom: 8 }]}
                  outlineColor={
                    theme.colors.outlineVariant ?? theme.colors.outline
                  }
                  activeOutlineColor={typeAccent}
                  outlineStyle={{ borderRadius: 10 }}
                  left={<TextInput.Icon icon="account-outline" />}
                />

                {/* Amount */}
                <TextInput
                  label={`${t("loans.participantAmount")} (${watchedValues.currency})`}
                  value={String(p.amount)}
                  onChangeText={(v) => updateParticipant(idx, "amount", v)}
                  keyboardType="decimal-pad"
                  mode="outlined"
                  style={[styles.input, { marginBottom: 0 }]}
                  outlineColor={
                    theme.colors.outlineVariant ?? theme.colors.outline
                  }
                  activeOutlineColor={typeAccent}
                  outlineStyle={{ borderRadius: 10 }}
                  left={<TextInput.Icon icon="cash-outline" />}
                />
              </View>
            ))}

            {participants.length < 9 && (
              <TouchableOpacity
                style={[
                  styles.addParticipantBtn,
                  {
                    borderColor: typeAccent,
                    backgroundColor: typeAccent + "08",
                  },
                ]}
                onPress={addParticipant}>
                <MaterialCommunityIcons
                  name="account-plus-outline"
                  size={18}
                  color={typeAccent}
                />
                <Text
                  style={{
                    color: typeAccent,
                    fontWeight: "700",
                    marginLeft: 6,
                    fontSize: 14,
                  }}>
                  {t("loans.addParticipant")}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* ── SUBMIT ───────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: typeAccent }]}
        activeOpacity={0.85}
        disabled={isLoading}
        onPress={handleSubmit(onSubmit, (errs) => {
          const messages = Object.entries(errs)
            .map(([field, err]) => `${field}: ${(err as any)?.message}`)
            .join("\n");
          Alert.alert(t("common.validationError"), messages);
        })}>
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <MaterialCommunityIcons
              name={
                isLent ? "arrow-up-circle-outline" : "arrow-down-circle-outline"
              }
              size={20}
              color="#fff"
            />
            <Text style={styles.submitBtnText}>{t("common.save")}</Text>
          </>
        )}
      </TouchableOpacity>

      {/* ── DATE PICKER MODAL — Loan Date ─────────────────────────────────── */}
      <Modal visible={showLoanDatePicker} transparent animationType="slide">
        <View style={styles.dateModalOverlay}>
          <View
            style={[
              styles.dateModalContent,
              { backgroundColor: theme.colors.surface },
            ]}>
            <View
              style={[
                styles.dateModalHeader,
                { borderBottomColor: theme.colors.outlineVariant },
              ]}>
              <TouchableOpacity
                onPress={() => setShowLoanDatePicker(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ color: theme.colors.error, fontSize: 15 }}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <Text
                style={[
                  styles.dateModalTitle,
                  { color: theme.colors.onSurface },
                ]}>
                {t("loans.loanDate")}
              </Text>
              <TouchableOpacity
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => {
                  setValue(
                    "loan_date",
                    tempLoanDate.toISOString().split("T")[0],
                  );
                  setShowLoanDatePicker(false);
                }}>
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontSize: 15,
                    fontWeight: "700",
                  }}>
                  {t("common.done")}
                </Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempLoanDate}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "spinner"}
              onChange={(_, date) => {
                if (date) setTempLoanDate(date);
              }}
              style={{ alignSelf: "center" }}
            />
          </View>
        </View>
      </Modal>

      {/* ── DATE PICKER MODAL — Due Date ──────────────────────────────────── */}
      <Modal visible={showDueDatePicker} transparent animationType="slide">
        <View style={styles.dateModalOverlay}>
          <View
            style={[
              styles.dateModalContent,
              { backgroundColor: theme.colors.surface },
            ]}>
            <View
              style={[
                styles.dateModalHeader,
                { borderBottomColor: theme.colors.outlineVariant },
              ]}>
              <TouchableOpacity
                onPress={() => setShowDueDatePicker(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ color: theme.colors.error, fontSize: 15 }}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <Text
                style={[
                  styles.dateModalTitle,
                  { color: theme.colors.onSurface },
                ]}>
                {t("loans.dueDate")}
              </Text>
              <TouchableOpacity
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => {
                  setValue("due_date", tempDueDate.toISOString().split("T")[0]);
                  setShowDueDatePicker(false);
                }}>
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontSize: 15,
                    fontWeight: "700",
                  }}>
                  {t("common.done")}
                </Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempDueDate}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "spinner"}
              minimumDate={new Date()}
              onChange={(_, date) => {
                if (date) setTempDueDate(date);
              }}
              style={{ alignSelf: "center" }}
            />
          </View>
        </View>
      </Modal>

      {/* ── CURRENCY MODAL ───────────────────────────────────────────────── */}
      <Modal visible={showCurrencyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.surface },
            ]}>
            <Text variant="titleLarge" style={styles.modalTitle}>
              {t("loans.currency")}
            </Text>
            <Searchbar
              placeholder={t("common.search")}
              value={currencySearch}
              onChangeText={setCurrencySearch}
              style={{ marginBottom: 8 }}
              elevation={0}
            />
            <FlatList
              data={filteredCurrencies}
              keyExtractor={(c) => c.code}
              ItemSeparatorComponent={() => <Divider />}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.currencyItem,
                    watchedValues.currency === item.code && {
                      backgroundColor: theme.colors.primaryContainer,
                    },
                  ]}
                  onPress={() => {
                    setValue("currency", item.code);
                    setShowCurrencyModal(false);
                    setCurrencySearch("");
                  }}>
                  <Text
                    variant="bodyLarge"
                    style={{ fontWeight: item.popular ? "700" : "400" }}>
                    {item.code} {item.symbol}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.outline }}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <Button
              onPress={() => setShowCurrencyModal(false)}
              style={{ marginTop: 8 }}>
              {t("common.cancel")}
            </Button>
          </View>
        </View>
      </Modal>

      {/* ── CONTACT MODAL ────────────────────────────────────────────────── */}
      <Modal visible={showContactModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.surface },
            ]}>
            <Text variant="titleLarge" style={styles.modalTitle}>
              {t("loans.pickContact")}
            </Text>
            <Searchbar
              placeholder={t("common.search")}
              value={contactSearch}
              onChangeText={setContactSearch}
              style={{ marginBottom: 8 }}
              elevation={0}
            />

            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {filteredSavedContacts.length > 0 && (
                <>
                  <Text
                    variant="labelMedium"
                    style={{ color: theme.colors.outline, marginVertical: 4 }}>
                    {t("loans.inAppContacts")}
                  </Text>
                  {filteredSavedContacts.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.contactItem}
                      onPress={() => selectSavedContact(c)}>
                      <Text variant="bodyLarge">{c.name}</Text>
                      {c.phone && (
                        <Text
                          variant="bodySmall"
                          style={{ color: theme.colors.outline }}>
                          {c.phone}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                  <Divider style={{ marginVertical: 8 }} />
                </>
              )}

              {filteredPhoneContacts.length > 0 ? (
                <>
                  <Text
                    variant="labelMedium"
                    style={{ color: theme.colors.outline, marginVertical: 4 }}>
                    {t("loans.phoneContacts")}
                  </Text>
                  {filteredPhoneContacts.map((item) => (
                    <React.Fragment
                      key={item.id ?? item.name ?? Math.random().toString()}>
                      <TouchableOpacity
                        style={styles.contactItem}
                        onPress={() => selectPhoneContact(item)}>
                        <Text variant="bodyLarge">{item.name}</Text>
                        {item.phoneNumbers?.[0]?.number && (
                          <Text
                            variant="bodySmall"
                            style={{ color: theme.colors.outline }}>
                            {item.phoneNumbers[0].number}
                          </Text>
                        )}
                      </TouchableOpacity>
                      <Divider />
                    </React.Fragment>
                  ))}
                </>
              ) : (
                filteredSavedContacts.length === 0 && (
                  <Text
                    variant="bodyMedium"
                    style={{
                      color: theme.colors.outline,
                      textAlign: "center",
                      marginVertical: 16,
                    }}>
                    {t("common.noResults")}
                  </Text>
                )
              )}
            </ScrollView>

            <Button
              onPress={() => {
                setContactSearch("");
                setShowContactModal(false);
              }}
              style={{ marginTop: 8 }}>
              {t("common.cancel")}
            </Button>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },

  // ── Type selector
  typeRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  typeCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 2,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  typeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  typeLabel: { fontSize: 15, fontWeight: "700" },
  typeSubLabel: { fontSize: 11, textAlign: "center" },

  // ── Card sections
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  cardDivider: { height: 1, marginVertical: 12 },

  // ── Row / inputs
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: { backgroundColor: "transparent" },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  currencyBtn: {
    width: 68,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  currencyBtnText: { fontSize: 14, fontWeight: "800", letterSpacing: 0.5 },
  errorText: { fontSize: 12, marginTop: 4, marginLeft: 4 },

  // ── Date rows
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  dateIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  dateLabelTxt: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  dateValueTxt: { fontSize: 15, fontWeight: "600" },

  // ── Submit button
  submitBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // ── Date picker modals
  dateModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  dateModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  dateModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  dateModalTitle: { fontSize: 16, fontWeight: "700" },

  // ── Currency / contact modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "82%",
    flex: 1,
  },
  modalTitle: { fontWeight: "800", marginBottom: 14 },
  currencyItem: { padding: 14, borderRadius: 10 },
  contactItem: { padding: 14, borderRadius: 10 },
  addParticipantBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 4,
  },
  participantCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    marginTop: 4,
  },
  participantBadge: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  equalBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
