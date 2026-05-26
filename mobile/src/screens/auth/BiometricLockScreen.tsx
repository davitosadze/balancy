import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { Text, Button, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { authenticate, getBiometricCapability } from "@hooks/useBiometrics";
import { useSettingsStore } from "@store/settings";
import { useAuthStore } from "@store/auth";

export default function BiometricLockScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { unlock } = useSettingsStore();
  const { logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [biometricType, setBiometricType] = useState<
    "face" | "fingerprint" | "none"
  >("face");

  useEffect(() => {
    getBiometricCapability().then((cap) => setBiometricType(cap.type));
  }, []);

  const triggerAuth = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { success, error } = await authenticate(t("auth.biometricPrompt"));
      if (success) {
        unlock();
      } else if (error === "lockout" || error === "lockout_permanent") {
        Alert.alert(
          "Face ID Locked",
          "Too many failed attempts. Use your device passcode to unlock, then try again.",
        );
      }
      // user_cancel / system_cancel: user dismissed — no-op, they can tap again
    } finally {
      setLoading(false);
    }
  };

  const handleUsePassword = () => {
    logout();
  };

  const icon = biometricType === "face" ? "face-recognition" : "fingerprint";

  const unlockLabel =
    biometricType === "face"
      ? t("auth.unlockWithFaceId")
      : t("auth.unlockWithBiometrics");

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.iconBox,
          { backgroundColor: theme.colors.primaryContainer },
        ]}>
        <MaterialCommunityIcons
          name={icon}
          size={56}
          color={theme.colors.primary}
        />
      </View>

      <Text
        variant="headlineSmall"
        style={[styles.title, { color: theme.colors.onBackground }]}>
        Balancy
      </Text>

      <Text
        variant="bodyMedium"
        style={[styles.subtitle, { color: theme.colors.outline }]}>
        {t("auth.biometricPrompt")}
      </Text>

      <Button
        mode="contained"
        icon={icon}
        onPress={triggerAuth}
        loading={loading}
        disabled={loading}
        style={styles.button}
        contentStyle={styles.buttonContent}
        labelStyle={{ fontWeight: "700" }}>
        {unlockLabel}
      </Button>

      <Button
        mode="text"
        onPress={handleUsePassword}
        style={styles.textButton}
        textColor={theme.colors.outline}>
        {t("auth.usePassword")}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  iconBox: {
    width: 100,
    height: 100,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 40,
  },
  button: {
    width: "100%",
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  textButton: {
    marginTop: 12,
  },
});
