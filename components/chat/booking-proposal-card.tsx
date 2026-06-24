import { format } from 'date-fns';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Brand } from '@/constants/theme';
import type { BookingProposal } from '@/types/database';

interface Props {
  proposal: BookingProposal;
  isOwn: boolean;
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
}

export function BookingProposalCard({ proposal, isOwn, onAccept, onDecline }: Props) {
  const [busy, setBusy] = useState(false);
  const dt = new Date(proposal.proposed_datetime);

  async function handle(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  return (
    <View style={[styles.wrapper, isOwn ? styles.wrapperOwn : styles.wrapperOther]}>
      <View style={[styles.card, isOwn ? styles.cardOwn : styles.cardOther]}>
        <View style={styles.topRow}>
          <Text style={styles.calIcon}>📅</Text>
          <View>
            <Text style={[styles.heading, isOwn && styles.headingOwn]}>Booking Proposal</Text>
            <Text style={[styles.proposer, isOwn && styles.proposerOwn]}>
              {isOwn ? 'You proposed' : `${proposal.proposer?.full_name ?? 'Someone'} proposed`}
            </Text>
          </View>
        </View>

        <Text style={[styles.dateText, isOwn && styles.dateTextOwn]}>
          {format(dt, 'EEEE, d MMMM yyyy')}
        </Text>
        <Text style={[styles.timeText, isOwn && styles.timeTextOwn]}>
          {format(dt, 'HH:mm')}
        </Text>

        {proposal.status === 'pending' && !isOwn && (
          busy ? (
            <ActivityIndicator style={{ marginTop: 10 }} color={Brand.primary} />
          ) : (
            <View style={styles.actions}>
              <Pressable style={styles.declineBtn} onPress={() => handle(onDecline)}>
                <Text style={styles.declineTxt}>Decline</Text>
              </Pressable>
              <Pressable style={styles.acceptBtn} onPress={() => handle(onAccept)}>
                <Text style={styles.acceptTxt}>Accept</Text>
              </Pressable>
            </View>
          )
        )}

        {proposal.status === 'pending' && isOwn && (
          <Text style={styles.waitingTxt}>Waiting for response…</Text>
        )}
        {proposal.status === 'accepted' && (
          <Text style={styles.confirmedTxt}>✓ Booking confirmed</Text>
        )}
        {proposal.status === 'declined' && (
          <Text style={styles.declinedTxt}>✗ Booking declined</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 12, marginVertical: 4 },
  wrapperOwn: { alignItems: 'flex-end' },
  wrapperOther: { alignItems: 'flex-start' },
  card: { borderRadius: 16, padding: 14, maxWidth: '80%', gap: 6 },
  cardOwn: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' },
  cardOther: { backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd' },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  calIcon: { fontSize: 22 },
  heading: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  headingOwn: { color: '#9a3412' },
  proposer: { fontSize: 11, color: '#64748b', marginTop: 1 },
  proposerOwn: { color: '#c2410c' },
  dateText: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  dateTextOwn: { color: '#7c2d12' },
  timeText: { fontSize: 22, fontWeight: '900', color: Brand.primary, letterSpacing: 1 },
  timeTextOwn: { color: Brand.primary },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  declineBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
  },
  declineTxt: { fontSize: 13, fontWeight: '700', color: '#dc2626' },
  acceptBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Brand.primary,
    alignItems: 'center',
  },
  acceptTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  waitingTxt: { fontSize: 12, color: '#64748b', marginTop: 4 },
  confirmedTxt: { fontSize: 13, fontWeight: '700', color: '#16a34a', marginTop: 4 },
  declinedTxt: { fontSize: 13, fontWeight: '700', color: '#dc2626', marginTop: 4 },
});
