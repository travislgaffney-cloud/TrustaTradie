import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';

// Biometric hardware authentication requires native modules that are not
// available in Expo Go. The prompt renders nothing; credential storage still
// works via base64-encoded AsyncStorage so the rest of the auth flow is intact.

const STORE_KEY = 'tat_biometric_v1';

interface BiometricPromptProps {
  onSuccess: (email: string, password: string) => void;
  onSkip: () => void;
}

// Returns null — biometric hardware prompt is unavailable without a native build
export function BiometricPrompt(_props: BiometricPromptProps): null {
  return null;
}

export async function saveBiometricCredentials(
  email: string,
  password: string,
): Promise<void> {
  const payload = JSON.stringify({ email, password });
  await AsyncStorage.setItem(STORE_KEY, btoa(unescape(encodeURIComponent(payload))));
}

export async function clearBiometricCredentials(): Promise<void> {
  await AsyncStorage.removeItem(STORE_KEY);
}

export async function loadBiometricCredentials(): Promise<{
  email: string;
  password: string;
} | null> {
  const raw = await AsyncStorage.getItem(STORE_KEY);
  if (!raw) return null;
  try {
    const json = decodeURIComponent(escape(atob(raw)));
    return json ? (JSON.parse(json) as { email: string; password: string }) : null;
  } catch {
    return null;
  }
}
