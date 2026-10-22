import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ContactUsModal } from '@/components/contact-us-modal';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { uploadFile } from '@/lib/storage';
import { submitBugReport } from '@/lib/bug-report';
import { submitContactMessage } from '@/lib/contact';
import { deleteAccount } from '@/lib/account';
import { useAuthStore } from '@/store/auth-store';

export default function CustomerProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { profile, setProfile } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);

  async function handleSubmitContact(firstName: string, lastName: string, email: string, message: string) {
    setContactSubmitting(true);
    try {
      await submitContactMessage({ firstName, lastName, email, message });
      setContactVisible(false);
      Alert.alert('Message sent', 'Thanks for reaching out — we\'ll get back to you soon.');
    } catch {
      Alert.alert('Error', 'Could not send your message. Please try again.');
    }
    setContactSubmitting(false);
  }

  async function handleAvatarChange() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !profile) return;
    setUploading(true);
    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop() ?? 'jpg';
    const url = await uploadFile('avatars', `${profile.id}.${ext}`, asset.uri, `image/${ext}`);
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id);
    setProfile({ ...profile, avatar_url: url });
    setUploading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/(auth)/welcome');
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and personal information (name, photo, phone, address). This cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
              await supabase.auth.signOut();
              router.replace('/(auth)/welcome');
            } catch {
              Alert.alert('Error', 'Could not delete your account. Please try again or contact support.');
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  if (!profile) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>

        {/* Avatar */}
        <Pressable onPress={handleAvatarChange} style={styles.avatarWrapper} disabled={uploading}>
          <Avatar uri={profile.avatar_url} name={profile.full_name} size={90} />
          <Text style={[styles.changePhoto, { color: colors.tint }]}>
            {uploading ? 'Uploading...' : 'Change photo'}
          </Text>
        </Pressable>

        <Card style={styles.infoCard}>
          <Text style={[styles.name, { color: colors.text }]}>{profile.full_name}</Text>
          <Text style={[styles.infoLine, { color: colors.textSecondary }]}>
            📍 {profile.address_text ?? 'No location set'}
          </Text>
          {profile.phone && (
            <Text style={[styles.infoLine, { color: colors.textSecondary }]}>
              📞 {profile.phone}
            </Text>
          )}
        </Card>

        <Card style={styles.section}>
          <Pressable onPress={() => router.push('/(customer)/profile/settings')} style={styles.menuItem}>
            <Text style={[styles.menuText, { color: colors.text }]}>⚙️ Settings & Preferences</Text>
            <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
          </Pressable>
        </Card>

        <Pressable
          style={[styles.bugBtn, { borderColor: colors.border }]}
          onPress={() => {
            Alert.alert(
              'Report a Bug',
              'Send a diagnostic report to help us improve the app?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Send Report',
                  onPress: async () => {
                    try {
                      await submitBugReport({
                        errorMessage: 'Manual bug report from customer profile',
                        screen: '(customer)/profile',
                      });
                      Alert.alert('Thank you!', 'Your report has been sent.');
                    } catch {
                      Alert.alert('Error', 'Could not send report. Please try again.');
                    }
                  },
                },
              ]
            );
          }}
        >
          <Text style={[styles.bugBtnText, { color: colors.textSecondary }]}>🐛 Report a Bug</Text>
        </Pressable>

        <Pressable
          style={[styles.bugBtn, { borderColor: colors.border }]}
          onPress={() => setContactVisible(true)}
        >
          <Text style={[styles.bugBtnText, { color: colors.textSecondary }]}>✉️ Contact Us</Text>
        </Pressable>

        <Button variant="danger" onPress={handleSignOut}>Sign Out</Button>

        <Pressable onPress={handleDeleteAccount} disabled={deleting} style={styles.deleteAccountBtn}>
          <Text style={styles.deleteAccountText}>
            {deleting ? 'Deleting account...' : 'Delete Account'}
          </Text>
        </Pressable>
      </ScrollView>

      <ContactUsModal
        visible={contactVisible}
        submitting={contactSubmitting}
        initialFirstName={profile.full_name?.split(' ')[0] ?? ''}
        initialLastName={profile.full_name?.split(' ').slice(1).join(' ') ?? ''}
        onClose={() => setContactVisible(false)}
        onSubmit={handleSubmitContact}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: '800' },
  avatarWrapper: { alignItems: 'center', gap: 8 },
  changePhoto: { fontSize: 14 },
  infoCard: { gap: 8 },
  name: { fontSize: 20, fontWeight: '700' },
  infoLine: { fontSize: 14 },
  section: { padding: 0, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  menuText: { fontSize: 15 },
  menuArrow: { fontSize: 20 },
  bugBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bugBtnText: { fontSize: 15, fontWeight: '600' },
  deleteAccountBtn: { alignItems: 'center', paddingVertical: 10 },
  deleteAccountText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
});
