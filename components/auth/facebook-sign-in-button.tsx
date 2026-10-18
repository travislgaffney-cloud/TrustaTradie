import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const FACEBOOK_BLUE = '#1877F2';

export function FacebookSignInButton() {
  const [loading, setLoading] = useState(false);

  async function handleFacebookSignIn() {
    try {
      setLoading(true);

      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'trustatradie',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data.url) {
        console.error('OAuth init error:', error);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      if (result.type !== 'success') return;

      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
      if (sessionError) {
        console.error('Session exchange error:', sessionError);
        return;
      }

      // Check if this user has completed onboarding
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
    } catch (err) {
      console.error('Facebook Sign-In error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Pressable
      onPress={handleFacebookSignIn}
      disabled={loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: FACEBOOK_BLUE },
        pressed && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <Text style={styles.facebookF}>f</Text>
          <Text style={styles.text}>Continue with Facebook</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 20,
    minHeight: 48,
  },
  facebookF: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    fontStyle: 'italic',
  },
  text: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
