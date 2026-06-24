import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { submitBugReport } from '@/lib/bug-report';
import { Brand } from '@/constants/theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  sending: boolean;
  sent: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, sending: false, sent: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleSendReport = async () => {
    const { error } = this.state;
    if (!error) return;

    this.setState({ sending: true });
    try {
      await submitBugReport({
        errorMessage: error.message,
        stackTrace: error.stack ?? undefined,
        screen: 'ErrorBoundary (crash)',
      });
      this.setState({ sent: true, sending: false });
    } catch {
      this.setState({ sending: false });
    }
  };

  handleDismiss = () => {
    this.setState({ hasError: false, error: null, sending: false, sent: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { sending, sent, error } = this.state;

    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.overlay}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.card}>
              <Text style={styles.icon}>⚠️</Text>
              <Text style={styles.title}>Something went wrong</Text>
              <Text style={styles.message}>
                The app encountered an unexpected error. You can send a diagnostic report to help us fix it.
              </Text>

              <View style={styles.errorBox}>
                <Text style={styles.errorText} numberOfLines={4}>
                  {error?.message ?? 'Unknown error'}
                </Text>
              </View>

              {sent ? (
                <View style={styles.sentBox}>
                  <Text style={styles.sentText}>✅ Report sent. Thank you!</Text>
                </View>
              ) : (
                <Pressable
                  style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
                  onPress={this.handleSendReport}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.sendBtnText}>Send Bug Report</Text>
                  )}
                </Pressable>
              )}

              <Pressable style={styles.dismissBtn} onPress={this.handleDismiss}>
                <Text style={styles.dismissBtnText}>
                  {sent ? 'Close' : 'Dismiss'}
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    width: '100%',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 12,
  },
  icon: { fontSize: 48 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  message: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { fontSize: 12, color: '#991b1b', fontFamily: 'monospace' },
  sentBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 12,
    width: '100%',
    alignItems: 'center',
  },
  sentText: { fontSize: 14, color: '#166534', fontWeight: '600' },
  sendBtn: {
    backgroundColor: Brand.primary,
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dismissBtn: {
    paddingVertical: 8,
  },
  dismissBtnText: { color: '#64748b', fontSize: 14, fontWeight: '500' },
});
