import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Encryption key derived from the anon key (public, but provides obfuscation at rest)
const STORAGE_KEY = supabaseAnonKey.slice(0, 32).padEnd(32, '0');

const EncryptedAsyncStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    try {
      const bytes = CryptoJS.AES.decrypt(raw, STORAGE_KEY);
      return bytes.toString(CryptoJS.enc.Utf8) || null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    const encrypted = CryptoJS.AES.encrypt(value, STORAGE_KEY).toString();
    await AsyncStorage.setItem(key, encrypted);
  },
  removeItem: (key: string): Promise<void> => AsyncStorage.removeItem(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: EncryptedAsyncStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
