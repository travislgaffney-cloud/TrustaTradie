import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';

export default function RateJobScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { user } = useAuthStore();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [done, setDone] = useState(false);

  React.useEffect(() => {
    if (!user) return;
    supabase
      .from('ratings')
      .select('id')
      .eq('job_id', jobId)
      .eq('customer_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setDone(true);
        setChecking(false);
      });
  }, [jobId, user]);

  async function handleSubmit() {
    if (!user || score === 0) return;
    setLoading(true);

    const { data: job } = await supabase
      .from('jobs')
      .select('accepted_quote_id')
      .eq('id', jobId)
      .single();

    const { data: quote } = await supabase
      .from('quotes')
      .select('tradie_id')
      .eq('id', job?.accepted_quote_id)
      .single();

    if (quote) {
      await supabase.from('ratings').insert({
        job_id: jobId,
        quote_id: job?.accepted_quote_id,
        customer_id: user.id,
        tradie_id: quote.tradie_id,
        score,
        comment: comment.trim() || null,
      });
    }

    setLoading(false);
    setDone(true);
  }

  if (checking) return null;

  if (done) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.doneContainer}>
          <Text style={styles.doneIcon}>⭐</Text>
          <Text style={[styles.doneTitle, { color: colors.text }]}>Thanks for your review!</Text>
          <Text style={[styles.doneSubtitle, { color: colors.textSecondary }]}>
            Your rating helps other customers find quality tradies.
          </Text>
          <Button onPress={() => router.replace('/(customer)/home')}>Back to Home</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>Rate this job</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          How was your experience with the tradie?
        </Text>

        {/* Star selector */}
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Pressable key={s} onPress={() => setScore(s)}>
              <Text style={[styles.star, { color: s <= score ? '#F97316' : '#cbd5e1' }]}>★</Text>
            </Pressable>
          ))}
        </View>
        {score > 0 && (
          <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][score]}
          </Text>
        )}

        <Input
          label="Leave a comment (optional)"
          placeholder="Tell others about your experience..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={{ minHeight: 100 }}
          value={comment}
          onChangeText={setComment}
        />

        <Button size="lg" loading={loading} disabled={score === 0} onPress={handleSubmit}>
          Submit Review
        </Button>

        <Pressable onPress={() => router.replace('/(customer)/home')} style={styles.skipLink}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip for now</Text>
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, gap: 16, flexGrow: 1 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 15, lineHeight: 22 },
  stars: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  star: { fontSize: 48 },
  scoreLabel: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginTop: -8 },
  skipLink: { alignItems: 'center' },
  skipText: { fontSize: 14 },
  doneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  doneIcon: { fontSize: 64 },
  doneTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  doneSubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
