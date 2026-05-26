import * as LocalAuthentication from "expo-local-authentication";

export type BiometricType = "face" | "fingerprint" | "none";

export interface BiometricCapability {
  available: boolean;
  enrolled: boolean;
  type: BiometricType;
}

export async function getBiometricCapability(): Promise<BiometricCapability> {
  const available = await LocalAuthentication.hasHardwareAsync();
  if (!available) return { available: false, enrolled: false, type: "none" };

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  const type: BiometricType = types.includes(
    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
  )
    ? "face"
    : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
      ? "fingerprint"
      : "none";

  return { available, enrolled, type };
}

export async function authenticate(
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      disableDeviceFallback: false,
      cancelLabel: "Cancel",
    });
    return { success: result.success, error: (result as any).error };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "unknown" };
  }
}
