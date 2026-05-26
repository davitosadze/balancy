import React, { useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Text, TextInput, Button, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/types";
import { useAuthStore } from "@store/auth";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const registerSchema = z
  .object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    email: z.string().email("auth.invalidEmail"),
    password: z.string().min(6, "auth.passwordTooShort"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "auth.passwordMismatch",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { register, isLoading, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    clearError();
    try {
      await register({
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
      });
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? t("common.error"));
    }
  };

  const field = (
    name: keyof RegisterFormData,
    label: string,
    opts?: { secure?: boolean; keyboard?: any },
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <>
          <TextInput
            label={label}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            secureTextEntry={opts?.secure && !showPassword}
            keyboardType={opts?.keyboard}
            autoCapitalize={name === "email" ? "none" : "words"}
            mode="outlined"
            style={styles.input}
            error={!!errors[name]}
            outlineStyle={styles.inputOutline}
            right={
              opts?.secure ? (
                <TextInput.Icon
                  icon={showPassword ? "eye-off" : "eye"}
                  onPress={() => setShowPassword((v) => !v)}
                />
              ) : undefined
            }
          />
          {errors[name] && (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {t((errors[name]?.message as any) ?? "common.error")}
            </Text>
          )}
        </>
      )}
    />
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View
            style={[
              styles.logoBox,
              { backgroundColor: theme.colors.onSurface },
            ]}>
            <Text style={styles.logoIcon}>💰</Text>
          </View>
          <Text
            variant="headlineMedium"
            style={{
              color: theme.colors.onBackground,
              fontWeight: "800",
              marginTop: 16,
              letterSpacing: -0.5,
            }}>
            Balancy
          </Text>
          <Text
            variant="bodyMedium"
            style={{
              color: (theme as any).custom?.muted ?? theme.colors.outline,
              marginTop: 4,
            }}>
            {t("auth.register")}
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
            },
          ]}>
          {field("first_name", t("auth.firstName"))}
          {field("last_name", t("auth.lastName"))}
          {field("email", t("auth.email"), { keyboard: "email-address" })}
          {field("password", t("auth.password"), { secure: true })}
          {field("confirmPassword", t("auth.confirmPassword"), {
            secure: true,
          })}

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={{ fontWeight: "700", fontSize: 15 }}>
            {t("auth.register")}
          </Button>
        </View>

        <View style={styles.linkRow}>
          <Text
            variant="bodyMedium"
            style={{
              color: (theme as any).custom?.muted ?? theme.colors.outline,
            }}>
            {t("auth.haveAccount")}{" "}
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurface, fontWeight: "700" }}>
              {t("auth.login")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 32 },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  logoIcon: { fontSize: 28 },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 24 },
  input: { marginBottom: 4, backgroundColor: "transparent" },
  inputOutline: { borderRadius: 12 },
  errorText: { fontSize: 12, marginBottom: 10, marginLeft: 4 },
  button: { marginTop: 16, borderRadius: 12 },
  buttonContent: { paddingVertical: 6 },
  linkRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
});
