import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Share,
  Modal,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  Switch,
  useTheme,
  Avatar,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useAuthStore } from "@store/auth";
import { useI18nStore } from "@store/i18n";
import { useSettingsStore } from "@store/settings";
import {
  updateProfile,
  uploadFile,
  getFileUrl,
  deleteAccount,
  changePassword,
} from "@api/directus";
import { registerForPushNotificationsAsync } from "@hooks/useNotifications";
import { authenticate, getBiometricCapability } from "@hooks/useBiometrics";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user, logout, setUser } = useAuthStore();
  const { language, availableLanguages, changeLanguage } = useI18nStore();
  const { biometricEnabled, setBiometricEnabled } = useSettingsStore();
  const [editing, setEditing] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    getBiometricCapability().then((cap) =>
      setBiometricAvailable(cap.available && cap.enrolled),
    );
  }, []);

  useEffect(() => {
    getFileUrl(user?.avatar ?? null).then(setAvatarUrl);
  }, [user?.avatar]);

  const handleToggleBiometric = async (value: boolean) => {
    if (value) {
      const cap = await getBiometricCapability();
      if (!cap.available) {
        Alert.alert(t("common.error"), t("profile.biometricNotAvailable"));
        return;
      }
      if (!cap.enrolled) {
        Alert.alert(t("common.error"), t("profile.biometricNotEnrolled"));
        return;
      }
      const { success } = await authenticate(t("auth.biometricPrompt"));
      if (!success) return;
    }
    await setBiometricEnabled(value);
  };

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
    },
  });

  const onSave = async (data: { first_name: string; last_name: string }) => {
    try {
      const updated = await updateProfile(data);
      const merged = { ...user!, ...(updated as any) };
      setUser(merged);
      reset({
        first_name: merged.first_name ?? "",
        last_name: merged.last_name ?? "",
      });
      setEditing(false);
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message);
    }
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("common.error"), "Photo library permission denied");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setSavingPhoto(true);
      try {
        const file = await uploadFile(result.assets[0].uri, "avatar.jpg");
        await updateProfile({ avatar: file.id });
        setUser({ ...user!, avatar: file.id });
        // refresh the resolved URL immediately
        const url = await getFileUrl(file.id);
        setAvatarUrl(url);
      } catch (e: any) {
        Alert.alert(t("common.error"), e?.message);
      } finally {
        setSavingPhoto(false);
      }
    }
  };

  const handleLogout = () => {
    Alert.alert(t("auth.logout"), t("auth.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("auth.logout"), style: "destructive", onPress: logout },
    ]);
  };

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) {
      Alert.alert(t("common.error"), t("profile.passwordsMustMatch"));
      return;
    }
    if (newPw.length < 6) {
      Alert.alert(t("common.error"), t("auth.passwordTooShort"));
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(user!.email, currentPw, newPw);
      setShowPasswordModal(false);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      Alert.alert(t("common.success"), t("profile.passwordChanged"));
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (
        msg.toLowerCase().includes("invalid") ||
        msg.toLowerCase().includes("credentials")
      ) {
        Alert.alert(t("common.error"), t("profile.wrongCurrentPassword"));
      } else {
        Alert.alert(t("common.error"), msg);
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(t("profile.deleteAccount"), t("profile.deleteAccountConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.deleteAccount"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAccount();
            await logout();
          } catch (e: any) {
            Alert.alert(t("common.error"), e?.message);
          }
        },
      },
    ]);
  };

  const handleTestLocalNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "💰 Balancy Test",
        body: "Local notification is working correctly!",
        sound: true,
      },
      trigger: {
        seconds: 1,
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      },
    });
    Alert.alert("Scheduled", "You'll receive a notification in 1 second.");
  };

  const handleShowPushToken = async () => {
    setLoadingToken(true);
    try {
      const token = await registerForPushNotificationsAsync();
      setPushToken(token);
      if (token) {
        await Share.share({ message: token });
        setPushToken(token);
      } else {
        Alert.alert(
          "No Token",
          "Could not retrieve push token.\n\nMake sure:\n• You are on a real device\n• A valid EAS projectId is set in app.json\n• Notification permission is granted",
        );
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to get push token");
    } finally {
      setLoadingToken(false);
    }
  };

  const initials =
    `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.toUpperCase() ||
    "?";
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.container}>
        {/* ── Avatar / Header card ───────────────────────────────────── */}
        <View
          style={[
            styles.headerCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
            },
          ]}>
          <TouchableOpacity
            onPress={handlePickPhoto}
            disabled={savingPhoto}
            style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <Avatar.Text size={80} label={initials} />
            )}
            <View
              style={[
                styles.cameraBadge,
                { backgroundColor: theme.colors.primary },
              ]}>
              <MaterialCommunityIcons name="camera" size={13} color="#fff" />
            </View>
          </TouchableOpacity>

          {editing ? (
            <View style={{ width: "100%", marginTop: 16, gap: 10 }}>
              <Controller
                control={control}
                name="first_name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label={t("profile.firstName")}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    mode="outlined"
                    dense
                    outlineStyle={{ borderRadius: 12 }}
                    style={{ backgroundColor: "transparent" }}
                  />
                )}
              />
              <Controller
                control={control}
                name="last_name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label={t("profile.lastName")}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    mode="outlined"
                    dense
                    outlineStyle={{ borderRadius: 12 }}
                    style={{ backgroundColor: "transparent" }}
                  />
                )}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button
                  mode="contained"
                  onPress={handleSubmit(onSave)}
                  style={{ flex: 1, borderRadius: 10 }}
                  contentStyle={{ paddingVertical: 4 }}
                  labelStyle={{ fontWeight: "700" }}>
                  {t("profile.saveChanges")}
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setEditing(false);
                    reset();
                  }}
                  style={{ flex: 1, borderRadius: 10 }}
                  contentStyle={{ paddingVertical: 4 }}>
                  {t("common.cancel")}
                </Button>
              </View>
            </View>
          ) : (
            <>
              <Text
                variant="titleLarge"
                style={{
                  fontWeight: "800",
                  marginTop: 14,
                  letterSpacing: -0.5,
                }}>
                {user?.first_name} {user?.last_name}
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  color: (theme as any).custom?.muted ?? theme.colors.outline,
                  marginTop: 2,
                }}>
                {user?.email}
              </Text>
              <TouchableOpacity
                onPress={() => setEditing(true)}
                style={[
                  styles.editBtn,
                  {
                    backgroundColor: theme.colors.primary + "15",
                    borderColor: theme.colors.primary + "40",
                  },
                ]}>
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={13}
                  color={theme.colors.primary}
                />
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontSize: 13,
                    fontWeight: "600",
                    marginLeft: 4,
                  }}>
                  {t("profile.editProfile")}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Language ───────────────────────────────────────────────── */}
        <Text
          style={[
            styles.sectionLabel,
            { color: (theme as any).custom?.muted ?? theme.colors.outline },
          ]}>
          {t("profile.language").toUpperCase()}
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
            },
          ]}>
          <View style={styles.langRow}>
            {availableLanguages.map((lang) => {
              const active = language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langBtn,
                    {
                      backgroundColor: active
                        ? theme.colors.primary
                        : "transparent",
                      borderColor: active
                        ? theme.colors.primary
                        : (theme.colors.outlineVariant ?? theme.colors.outline),
                    },
                  ]}
                  onPress={() => changeLanguage(lang.code)}>
                  <Text
                    style={{
                      color: active ? "#fff" : theme.colors.onSurface,
                      fontWeight: "600",
                      fontSize: 14,
                    }}>
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Security ───────────────────────────────────────────────── */}
        <Text
          style={[
            styles.sectionLabel,
            { color: (theme as any).custom?.muted ?? theme.colors.outline },
          ]}>
          {t("profile.security").toUpperCase()}
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
            },
          ]}>
          {biometricAvailable && (
            <>
              <View style={styles.cardRow}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: theme.colors.primary + "18" },
                  ]}>
                  <MaterialCommunityIcons
                    name="face-recognition"
                    size={18}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: "600" }}>
                    {t("profile.biometricLock")}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{
                      color:
                        (theme as any).custom?.muted ?? theme.colors.outline,
                      marginTop: 1,
                    }}>
                    {t("profile.biometricLockDesc")}
                  </Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleToggleBiometric}
                />
              </View>
              <View
                style={[
                  styles.separator,
                  {
                    backgroundColor:
                      theme.colors.outlineVariant ?? theme.colors.outline,
                  },
                ]}
              />
            </>
          )}
          <TouchableOpacity
            style={styles.cardRow}
            onPress={() => setShowPasswordModal(true)}>
            <View
              style={[
                styles.iconBox,
                { backgroundColor: theme.colors.primary + "18" },
              ]}>
              <MaterialCommunityIcons
                name="lock-reset"
                size={18}
                color={theme.colors.primary}
              />
            </View>
            <Text
              variant="bodyMedium"
              style={{ flex: 1, marginLeft: 12, fontWeight: "600" }}>
              {t("profile.changePassword")}
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={(theme as any).custom?.muted ?? theme.colors.outline}
            />
          </TouchableOpacity>
        </View>

        {/* ── App info ───────────────────────────────────────────────── */}
        <Text
          style={[
            styles.sectionLabel,
            { color: (theme as any).custom?.muted ?? theme.colors.outline },
          ]}>
          {t("profile.appVersion").toUpperCase()}
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
            },
          ]}>
          <View style={styles.cardRow}>
            <View
              style={[
                styles.iconBox,
                { backgroundColor: theme.colors.primary + "18" },
              ]}>
              <MaterialCommunityIcons
                name="information-outline"
                size={18}
                color={theme.colors.primary}
              />
            </View>
            <Text
              variant="bodyMedium"
              style={{ flex: 1, marginLeft: 12, fontWeight: "600" }}>
              Balancy
            </Text>
            <Text
              variant="bodyMedium"
              style={{
                color: (theme as any).custom?.muted ?? theme.colors.outline,
                fontWeight: "600",
              }}>
              v{appVersion}
            </Text>
          </View>
        </View>

        {/* ── Developer (DEV only) ───────────────────────────────────── */}
        {__DEV__ && (
          <>
            <Text
              style={[
                styles.sectionLabel,
                { color: (theme as any).custom?.muted ?? theme.colors.outline },
              ]}>
              🛠 DEVELOPER
            </Text>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor:
                    theme.colors.outlineVariant ?? theme.colors.outline,
                },
              ]}>
              <View style={{ gap: 10, padding: 4 }}>
                <Button
                  mode="outlined"
                  icon="bell-ring-outline"
                  onPress={handleTestLocalNotification}
                  style={{ borderRadius: 10 }}>
                  Send local test notification
                </Button>
                <Button
                  mode="outlined"
                  icon="key-outline"
                  loading={loadingToken}
                  onPress={handleShowPushToken}
                  style={{ borderRadius: 10 }}>
                  {pushToken ? "Token shared ✓" : "Share push token"}
                </Button>
                {pushToken && (
                  <Text
                    variant="bodySmall"
                    style={{
                      color: theme.colors.outline,
                      fontFamily: "monospace",
                    }}
                    numberOfLines={2}>
                    {pushToken}
                  </Text>
                )}
              </View>
            </View>
          </>
        )}

        {/* ── Danger zone ────────────────────────────────────────────── */}
        <Text
          style={[
            styles.sectionLabel,
            { color: (theme as any).custom?.muted ?? theme.colors.outline },
          ]}>
          {t("common.account", { defaultValue: "ACCOUNT" }).toUpperCase()}
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
            },
          ]}>
          <TouchableOpacity style={styles.cardRow} onPress={handleLogout}>
            <View
              style={[
                styles.iconBox,
                { backgroundColor: theme.colors.error + "18" },
              ]}>
              <MaterialCommunityIcons
                name="logout"
                size={18}
                color={theme.colors.error}
              />
            </View>
            <Text
              variant="bodyMedium"
              style={{
                flex: 1,
                marginLeft: 12,
                fontWeight: "600",
                color: theme.colors.error,
              }}>
              {t("auth.logout")}
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={theme.colors.error + "80"}
            />
          </TouchableOpacity>
          <View
            style={[
              styles.separator,
              {
                backgroundColor:
                  theme.colors.outlineVariant ?? theme.colors.outline,
              },
            ]}
          />
          <TouchableOpacity
            style={styles.cardRow}
            onPress={handleDeleteAccount}>
            <View
              style={[
                styles.iconBox,
                { backgroundColor: theme.colors.error + "18" },
              ]}>
              <MaterialCommunityIcons
                name="account-remove-outline"
                size={18}
                color={theme.colors.error}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                variant="bodyMedium"
                style={{ fontWeight: "600", color: theme.colors.error }}>
                {t("profile.deleteAccount")}
              </Text>
              <Text
                variant="bodySmall"
                style={{
                  color: (theme as any).custom?.muted ?? theme.colors.outline,
                  marginTop: 1,
                }}>
                {t("profile.deleteAccountDesc")}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Change Password Modal ───────────────────────────────────── */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPasswordModal(false)}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: theme.colors.background },
          ]}>
          <View style={styles.modalHeader}>
            <Text variant="titleMedium" style={{ fontWeight: "700" }}>
              {t("profile.changePassword")}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowPasswordModal(false);
                setCurrentPw("");
                setNewPw("");
                setConfirmPw("");
              }}>
              <MaterialCommunityIcons
                name="close"
                size={22}
                color={theme.colors.onSurface}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <TextInput
              label={t("profile.currentPassword")}
              value={currentPw}
              onChangeText={setCurrentPw}
              secureTextEntry
              mode="outlined"
              style={styles.input}
              outlineStyle={{ borderRadius: 12 }}
              autoCapitalize="none"
            />
            <TextInput
              label={t("profile.newPassword")}
              value={newPw}
              onChangeText={setNewPw}
              secureTextEntry
              mode="outlined"
              style={styles.input}
              outlineStyle={{ borderRadius: 12 }}
              autoCapitalize="none"
            />
            <TextInput
              label={t("profile.confirmNewPassword")}
              value={confirmPw}
              onChangeText={setConfirmPw}
              secureTextEntry
              mode="outlined"
              style={styles.input}
              outlineStyle={{ borderRadius: 12 }}
              autoCapitalize="none"
              error={confirmPw.length > 0 && newPw !== confirmPw}
            />
            <Button
              mode="contained"
              onPress={handleChangePassword}
              loading={changingPassword}
              disabled={changingPassword || !currentPw || !newPw || !confirmPw}
              style={{ marginTop: 8, borderRadius: 12 }}
              contentStyle={{ paddingVertical: 6 }}
              labelStyle={{ fontWeight: "700" }}>
              {t("profile.changePassword")}
            </Button>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },

  // Header
  headerCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  avatarWrap: { position: "relative" },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.9,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Generic card
  card: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    overflow: "hidden",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  separator: {
    height: 1,
    marginHorizontal: 16,
    opacity: 0.5,
  },

  // Language
  langRow: { flexDirection: "row", padding: 14, gap: 10 },
  langBtn: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
  },

  // Modal
  input: { marginBottom: 12, backgroundColor: "transparent" },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  modalBody: { padding: 20 },
});
