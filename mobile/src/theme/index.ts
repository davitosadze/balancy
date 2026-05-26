import { MD3LightTheme, MD3DarkTheme } from "react-native-paper";

// ─── Design tokens ────────────────────────────────────────────────────────────
export const tokens = {
  radius: { xs: 6, sm: 10, md: 16, lg: 20, xl: 28, full: 999 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
};

const lightPalette = {
  primary: "#0a0a0a",
  primaryContainer: "#f0f0f0",
  secondary: "#3f3f3f",
  secondaryContainer: "#f5f5f5",
  error: "#dc2626",
  errorContainer: "#fef2f2",
  warning: "#d97706",
  warningContainer: "#fffbeb",
  surface: "#ffffff",
  background: "#ffffff",
  onPrimary: "#ffffff",
  onSecondary: "#ffffff",
  onSurface: "#0a0a0a",
  onBackground: "#0a0a0a",
  outline: "#d4d4d8",
  outlineVariant: "#e4e4e7",
  lent: "#16a34a",
  borrowed: "#dc2626",
  overdue: "#d97706",
  muted: "#71717a",
  inverseSurface: "#0a0a0a",
  inverseOnSurface: "#ffffff",
};

const darkPalette = {
  primary: "#fafafa",
  primaryContainer: "#1a1a1a",
  secondary: "#a1a1aa",
  secondaryContainer: "#27272a",
  error: "#f87171",
  errorContainer: "#450a0a",
  warning: "#fbbf24",
  warningContainer: "#451a03",
  surface: "#141414",
  background: "#0a0a0a",
  onPrimary: "#0a0a0a",
  onSecondary: "#0a0a0a",
  onSurface: "#fafafa",
  onBackground: "#fafafa",
  outline: "#3f3f46",
  outlineVariant: "#27272a",
  lent: "#4ade80",
  borrowed: "#f87171",
  overdue: "#fbbf24",
  muted: "#71717a",
  inverseSurface: "#fafafa",
  inverseOnSurface: "#0a0a0a",
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: lightPalette.primary,
    primaryContainer: lightPalette.primaryContainer,
    secondary: lightPalette.secondary,
    secondaryContainer: lightPalette.secondaryContainer,
    error: lightPalette.error,
    errorContainer: lightPalette.errorContainer,
    surface: lightPalette.surface,
    background: lightPalette.background,
    onPrimary: lightPalette.onPrimary,
    onSecondary: lightPalette.onSecondary,
    onSurface: lightPalette.onSurface,
    onBackground: lightPalette.onBackground,
    outline: lightPalette.outline,
    outlineVariant: lightPalette.outlineVariant,
    inverseSurface: lightPalette.inverseSurface,
    inverseOnSurface: lightPalette.inverseOnSurface,
  },
  custom: lightPalette,
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkPalette.primary,
    primaryContainer: darkPalette.primaryContainer,
    secondary: darkPalette.secondary,
    secondaryContainer: darkPalette.secondaryContainer,
    error: darkPalette.error,
    errorContainer: darkPalette.errorContainer,
    surface: darkPalette.surface,
    background: darkPalette.background,
    onPrimary: darkPalette.onPrimary,
    onSecondary: darkPalette.onSecondary,
    onSurface: darkPalette.onSurface,
    onBackground: darkPalette.onBackground,
    outline: darkPalette.outline,
    outlineVariant: darkPalette.outlineVariant,
    inverseSurface: darkPalette.inverseSurface,
    inverseOnSurface: darkPalette.inverseOnSurface,
  },
  custom: darkPalette,
};

export type AppTheme = typeof lightTheme;
