import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Props {
  visible: boolean;
  submitting: boolean;
  initialFirstName?: string;
  initialLastName?: string;
  initialEmail?: string;
  onClose: () => void;
  onSubmit: (firstName: string, lastName: string, email: string, message: string) => void;
}

export function ContactUsModal({
  visible,
  submitting,
  initialFirstName = '',
  initialLastName = '',
  initialEmail = '',
  onClose,
  onSubmit,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState('');

  function handleSubmit() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Missing info', 'Please enter your name and surname.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Missing info', 'Please enter a valid email address.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Missing info', 'Please enter a message.');
      return;
    }
    onSubmit(firstName.trim(), lastName.trim(), email.trim(), message.trim());
  }

  function handleClose() {
    setMessage('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
          <Pressable onPress={handleClose} disabled={submitting}>
            <Text style={[styles.cancel, { color: colors.tint }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.navTitle, { color: colors.text }]}>Contact Us</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.intro, { color: colors.textSecondary }]}>
            Send a message to the Trust-a-Tradie team and we&apos;ll get back to you.
          </Text>

          <Text style={[styles.label, { color: colors.text }]}>Name *</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            placeholder="First name"
            placeholderTextColor={colors.textSecondary}
            value={firstName}
            onChangeText={setFirstName}
          />

          <Text style={[styles.label, { color: colors.text }]}>Surname *</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            placeholder="Surname"
            placeholderTextColor={colors.textSecondary}
            value={lastName}
            onChangeText={setLastName}
          />

          <Text style={[styles.label, { color: colors.text }]}>Email *</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            placeholder="you@example.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: colors.text }]}>Message *</Text>
          <TextInput
            style={[styles.textarea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            placeholder="How can we help?"
            placeholderTextColor={colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <Pressable
            style={[styles.submitBtn, { backgroundColor: Brand.primary, opacity: submitting ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitBtnText}>{submitting ? 'Sending...' : 'Send Message'}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cancel: { fontSize: 15 },
  navTitle: { fontSize: 17, fontWeight: '600' },
  scroll: { padding: 16, gap: 10 },
  intro: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 120,
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
