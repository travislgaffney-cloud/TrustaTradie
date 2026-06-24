import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useJob } from '@/hooks/use-jobs';
import { startJobConversation } from '@/hooks/use-messages';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';

export default function TradieActiveJobScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { job, loading, refresh } = useJob(jobId);
  const { user } = useAuthStore();
  const [requesting, setRequesting] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);

  async function handleMessageCustomer() {
    if (!job || !user) return;
    setOpeningChat(true);
    try {
      const conversationId = await startJobConversation(job.customer_id, user.id, jobId);
      router.push(`/(tradie)/messages/${conversationId}`);
    } finally {
      setOpeningChat(false);
    }
  }

  async function handleRequestCompletion() {
    setRequesting(true);
    await supabase.from('jobs').update({ status: 'pending_completion' }).eq('id', jobId);
    await refresh();
    setRequesting(false);
  }

  if (loading) return <LoadingSpinner full />;
  if (!job) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.tint }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]}>Active Job</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.badges}>
          <JobStatusBadge status={job.status} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{job.title}</Text>
        <Text style={[styles.desc, { color: colors.textSecondary }]}>{job.description}</Text>

        <Card style={styles.infoCard}>
          <Text style={[styles.infoRow, { color: colors.textSecondary }]}>📍 {job.address_text}</Text>
        </Card>

        <Button variant="secondary" loading={openingChat} onPress={handleMessageCustomer}>
          💬 Message Customer
        </Button>

        {job.status === 'in_progress' && (
          <Button size="lg" loading={requesting} onPress={handleRequestCompletion}>
            🎉 Mark Job as Complete
          </Button>
        )}

        {job.status === 'pending_completion' && (
          <View style={[styles.waitingBox, { backgroundColor: '#fffbeb', borderColor: '#fcd34d' }]}>
            <Text style={styles.waitingText}>
              ⏳ Waiting for customer to confirm completion and release payment.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  back: { fontSize: 16 },
  navTitle: { fontSize: 17, fontWeight: '600' },
  scroll: { padding: 16, gap: 14 },
  badges: { flexDirection: 'row' },
  title: { fontSize: 22, fontWeight: '800' },
  desc: { fontSize: 15, lineHeight: 22 },
  infoCard: { gap: 8 },
  infoRow: { fontSize: 14 },
  waitingBox: { borderRadius: 12, borderWidth: 1, padding: 14 },
  waitingText: { fontSize: 13, color: '#92400e', lineHeight: 18 },
});
