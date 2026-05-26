import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "react-native-paper";

import type {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
  LoansStackParamList,
} from "@/types";
import { useAuthStore } from "@store/auth";
import { useSettingsStore } from "@store/settings";

// ─── Screens (lazy imports to keep initial bundle small) ──────────────────────
import LoginScreen from "@screens/auth/LoginScreen";
import RegisterScreen from "@screens/auth/RegisterScreen";
import BiometricLockScreen from "@screens/auth/BiometricLockScreen";
import LoanListScreen from "@screens/loans/LoanListScreen";
import LoanDetailScreen from "@screens/loans/LoanDetailScreen";
import AddLoanScreen from "@screens/loans/AddLoanScreen";
import AddRepaymentScreen from "@screens/loans/AddRepaymentScreen";
import StatisticsScreen from "@screens/statistics/StatisticsScreen";
import RatesScreen from "@screens/rates/RatesScreen";
import NotificationsScreen from "@screens/notifications/NotificationsScreen";
import ProfileScreen from "@screens/profile/ProfileScreen";

// ─── Stack / Tab creators ─────────────────────────────────────────────────────
const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTabs = createBottomTabNavigator<MainTabParamList>();
const LoansStack = createNativeStackNavigator<LoansStackParamList>();

// ─── Auth navigator ───────────────────────────────────────────────────────────
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Loans stack ──────────────────────────────────────────────────────────────
function LoansNavigator() {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <LoansStack.Navigator
      screenOptions={{
        headerTintColor: theme.colors.primary,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.colors.background },
        headerBackButtonDisplayMode: "minimal",
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
      }}>
      <LoansStack.Screen
        name="LoanList"
        component={LoanListScreen}
        options={{ title: t("loans.title") }}
      />
      <LoansStack.Screen
        name="LoanDetail"
        component={LoanDetailScreen}
        options={{ title: t("loans.loanDetail") }}
      />
      <LoansStack.Screen
        name="AddLoan"
        component={AddLoanScreen}
        options={({ route }) => ({
          title: route.params?.editLoanId
            ? t("loans.editLoan")
            : t("loans.addLoan"),
        })}
      />
      <LoansStack.Screen
        name="AddRepayment"
        component={AddRepaymentScreen}
        options={{ title: t("repayments.addRepayment") }}
      />
    </LoansStack.Navigator>
  );
}

// ─── Main tabs ────────────────────────────────────────────────────────────────
function MainNavigator() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <MainTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarStyle: { borderTopColor: theme.colors.outline },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            LoansTab: "wallet-outline",
            StatisticsTab: "chart-bar",
            RatesTab: "currency-usd",
            NotificationsTab: "bell-outline",
            ProfileTab: "account-circle-outline",
          };
          return (
            <MaterialCommunityIcons
              name={icons[route.name] as any}
              size={size}
              color={color}
            />
          );
        },
      })}>
      <MainTabs.Screen
        name="LoansTab"
        component={LoansNavigator}
        options={{ title: t("loans.title") }}
      />
      <MainTabs.Screen
        name="StatisticsTab"
        component={StatisticsScreen}
        options={{ title: t("statistics.title"), headerShown: true }}
      />
      <MainTabs.Screen
        name="RatesTab"
        component={RatesScreen}
        options={{ title: t("rates.title"), headerShown: true }}
      />
      <MainTabs.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{ title: t("notifications.title"), headerShown: true }}
      />
      <MainTabs.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: t("profile.title"), headerShown: true }}
      />
    </MainTabs.Navigator>
  );
}

// ─── Root navigator ───────────────────────────────────────────────────────────
export default function RootNavigator() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { isLocked, initialized } = useSettingsStore();

  // Show spinner until auth resolves.
  // Settings load in parallel (self-initialized), so initialized is usually
  // true by the time authLoading flips to false.
  if (authLoading || (isAuthenticated && !initialized)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isAuthenticated && isLocked) {
    return <BiometricLockScreen />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
