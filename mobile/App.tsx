import React, { useEffect } from "react";
import { useColorScheme } from "react-native";
import { PaperProvider } from "react-native-paper";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import "@/i18n/setup";
import { lightTheme, darkTheme } from "@/theme";
import RootNavigator from "@/navigation/RootNavigator";
import { useAuthStore } from "@/store/auth";
import { useI18nStore } from "@/store/i18n";

export default function App() {
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? darkTheme : lightTheme;
  const initialize = useAuthStore((s) => s.initialize);
  const initLanguage = useI18nStore((s) => s.initLanguage);

  useEffect(() => {
    initialize();
    initLanguage();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
          <RootNavigator />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
