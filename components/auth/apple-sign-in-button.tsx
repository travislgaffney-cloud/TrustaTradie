import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function AppleSignInButton() {
  const scheme = useColorScheme() ?? 'light';
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync().then(setAvailable);
  }, []);

  if (Platform.OS !== 'ios' || !available) return null;

  async function handleAppleSignIn() {
    try {
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) return;

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error) {
        console.error('Apple Sign-In error:', error);
        return;
      }

      // Apple only ever sends the name on the very first sign-in for this app —
      // stash it in user_metadata so the setup screen can prefill it, same as Google.
      if (credential.fullName?.givenName || credential.fullName?.familyName) {
        const fullName = [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(' ');
        await supabase.auth.updateUser({ data: { full_name: fullName } });
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_complete')
        .eq('id', user.id)
        .single();

      if (!profile?.onboarding_complete) {
        router.replace('/(auth)/google-setup');
      }
      // If onboarding is complete, onAuthStateChange fires and the root layout
      // navigates them to their home screen automatically.
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED') return;
      console.error('Apple Sign-In error:', err);
    }
  }

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={
        scheme === 'dark'
          ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
          : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
      }
      cornerRadius={10}
      style={styles.button}
      onPress={handleAppleSignIn}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 48,
  },
});
