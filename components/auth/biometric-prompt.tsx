import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import React from 'react';

// Biometric hardware authentication requires native modules that are not
// available in Expo Go. The prompt renders nothing; credential storage still
// works via AES-encrypted AsyncStorage so the rest of the auth flow is intact.

const STORE_KEY = 'tat_biometric_v1';
// Deterministic key — not a secret, just stops plaintext credentials at rest
const AES_KEY = 'TrustATradie_BiometricStore_2024';

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
  const encrypted = CryptoJS.AES.encrypt(payload, AES_KEY).toString();
  await AsyncStorage.setItem(STORE_KEY, encrypted);
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
    const bytes = CryptoJS.AES.decrypt(raw, AES_KEY);
    const json = bytes.toString(CryptoJS.enc.Utf8);
    return json ? (JSON.parse(json) as { email: string; password: string }) : null;
  } catch {
    return null;
  }
}
