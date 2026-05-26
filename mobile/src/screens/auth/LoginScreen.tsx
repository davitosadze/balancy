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
import { Text, TextInput, Button, useTheme, Divider } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri, useAuthRequest } from "expo-auth-session";
import type { AuthStackParamList } from "@/types";
import { useAuthStore } from "@store/auth";
import * as SecureStore from "expo-secure-store";

WebBrowser.maybeCompleteAuthSession();

const DIRECTUS_URL =
  process.env.EXPO_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

const loginSchema = z.object({
  email: z.string().email("auth.invalidEmail"),
  password: z.string().min(6, "auth.passwordTooShort"),
});
type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { login, isLoading, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    try {
      await login(data.email, data.password);
    } catch (e: any) {
      Alert.alert(
        t("common.error"),
        e?.errors?.[0]?.message ?? e?.message ?? t("common.error"),
      );
    }
  };

  // ─── Google OAuth ─────────────────────────────────────────────────────────
  const redirectUri = makeRedirectUri({ scheme: "balancy" });
  const [googleRequest, googleResponse, googlePrompt] = useAuthRequest(
    {
      clientId: "google",
      scopes: ["openid", "email", "profile"],
      redirectUri,
    },
    { authorizationEndpoint: `${DIRECTUS_URL}/auth/login/google` },
  );

  const handleGoogleLogin = async () => {
    const result = await googlePrompt();
    if (result.type === "success" && result.params.access_token) {
      await SecureStore.setItemAsync(
        "access_token",
        result.params.access_token,
      );
      if (result.params.refresh_token) {
        await SecureStore.setItemAsync(
          "refresh_token",
          result.params.refresh_token,
        );
      }
      // Trigger re-initialize
      await useAuthStore.getState().initialize();
    }
  };

  const handleAppleLogin = async () => {
    await WebBrowser.openBrowserAsync(
      `${DIRECTUS_URL}/auth/login/apple?redirect=${encodeURIComponent(redirectUri)}`,
    );
  };

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
        {/* Logo / Title */}
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
            {t("auth.login")}
          </Text>
        </View>

        {/* Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
            },
          ]}>
          {/* Email */}
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t("auth.email")}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                mode="outlined"
                style={styles.input}
                error={!!errors.email}
                outlineStyle={styles.inputOutline}
              />
            )}
          />
          {errors.email && (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {t(errors.email.message as any)}
            </Text>
          )}

          {/* Password */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t("auth.password")}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showPassword}
                autoComplete="password"
                mode="outlined"
                style={styles.input}
                error={!!errors.password}
                outlineStyle={styles.inputOutline}
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off" : "eye"}
                    onPress={() => setShowPassword((v) => !v)}
                  />
                }
              />
            )}
          />
          {errors.password && (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {t(errors.password.message as any)}
            </Text>
          )}

          {/* Login button */}
          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={{ fontWeight: "700", fontSize: 15 }}>
            {t("auth.login")}
          </Button>
        </View>

        {/* Social divider */}
        <View style={styles.dividerRow}>
          <View
            style={[
              styles.dividerLine,
              {
                backgroundColor:
                  theme.colors.outlineVariant ?? theme.colors.outline,
              },
            ]}
          />
          <Text
            variant="labelSmall"
            style={{
              color: (theme as any).custom?.muted ?? theme.colors.outline,
              marginHorizontal: 12,
            }}>
            {t("auth.orContinueWith")}
          </Text>
          <View
            style={[
              styles.dividerLine,
              {
                backgroundColor:
                  theme.colors.outlineVariant ?? theme.colors.outline,
              },
            ]}
          />
        </View>

        {/* Google */}
        <Button
          mode="outlined"
          icon="google"
          onPress={handleGoogleLogin}
          style={[
            styles.button,
            styles.socialBtn,
            {
              borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
            },
          ]}
          contentStyle={styles.buttonContent}
          labelStyle={{ fontWeight: "600" }}
          textColor={theme.colors.onSurface}>
          {t("auth.signInWithGoogle")}
        </Button>

        {/* Apple (iOS only) */}
        {Platform.OS === "ios" && (
          <Button
            mode="outlined"
            icon="apple"
            onPress={handleAppleLogin}
            style={[
              styles.button,
              styles.socialBtn,
              {
                borderColor:
                  theme.colors.outlineVariant ?? theme.colors.outline,
              },
            ]}
            contentStyle={styles.buttonContent}
            labelStyle={{ fontWeight: "600" }}
            textColor={theme.colors.onSurface}>
            {t("auth.signInWithApple")}
          </Button>
        )}

        {/* Register link */}
        <View style={styles.linkRow}>
          <Text
            variant="bodyMedium"
            style={{
              color: (theme as any).custom?.muted ?? theme.colors.outline,
            }}>
            {t("auth.noAccount")}{" "}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurface, fontWeight: "700" }}>
              {t("auth.register")}
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
  button: { marginTop: 12, borderRadius: 12 },
  socialBtn: { backgroundColor: "transparent" },
  buttonContent: { paddingVertical: 6 },
  dividerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  dividerLine: { flex: 1, height: 1 },
  linkRow: { flexDirection: "row", justifyContent: "center", marginTop: 28 },
});
