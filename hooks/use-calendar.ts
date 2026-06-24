import { format } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { addJobToDeviceCalendar } from '@/lib/device-calendar';
import { sendPushToUser } from '@/lib/notifications';
import type { BookingProposal, Job } from '@/types/database';
import { useAuthStore } from '@/store/auth-store';

export function useBookingProposals(conversationId: string) {
  const { user } = useAuthStore();
  const [proposals, setProposals] = useState<BookingProposal[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    fetchProposals();

    channelRef.current = supabase
      .channel(`booking_proposals:${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'booking_proposals',
        filter: `conversation_id=eq.${conversationId}`,
      }, fetchProposals)
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId]);

  async function fetchProposals() {
    const { data } = await supabase
      .from('booking_proposals')
      .select('*, proposer:profiles!booking_proposals_proposed_by_fkey(id, full_name, avatar_url)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setProposals((data as BookingProposal[]) ?? []);
  }

  async function proposeBooking(jobId: string, datetime: Date, recipientId: string) {
    if (!user) return;
    const { error } = await supabase.from('booking_proposals').insert({
      conversation_id: conversationId,
      job_id: jobId,
      proposed_by: user.id,
      proposed_datetime: datetime.toISOString(),
      status: 'pending',
    });
    if (error) { console.error('[proposeBooking]', error.message); return; }

    const label = format(datetime, "d MMM 'at' HH:mm");
    const body = `New booking proposal for ${label}`;
    await supabase.from('notifications').insert({
      user_id: recipientId,
      type: 'new_message',
      title: 'Booking Proposal',
      body,
      data: { conversation_id: conversationId },
      is_read: false,
    });
    sendPushToUser(recipientId, 'Booking Proposal', body, { conversation_id: conversationId });
  }

  async function respondToProposal(proposal: BookingProposal, accept: boolean, recipientId: string) {
    await supabase
      .from('booking_proposals')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', proposal.id);

    if (!accept) return;

    // Fetch job details for calendar event + notification
    const { data: job } = await supabase
      .from('jobs')
      .select('title, address_text')
      .eq('id', proposal.job_id)
      .single();

    if (!job) return;

    // Update the job's confirmed start time
    await supabase
      .from('jobs')
      .update({ scheduled_at: proposal.proposed_datetime })
      .eq('id', proposal.job_id);

    // Add to the user's device calendar
    await addJobToDeviceCalendar({
      jobTitle: job.title,
      jobAddress: job.address_text,
      startDate: new Date(proposal.proposed_datetime),
    });

    // Notify the proposer that their proposal was accepted
    const dt = new Date(proposal.proposed_datetime);
    const body = `Your booking for "${job.title}" on ${format(dt, "d MMM 'at' HH:mm")} was confirmed!`;
    await supabase.from('notifications').insert({
      user_id: recipientId,
      type: 'quote_accepted',
      title: 'Booking Confirmed!',
      body,
      data: { conversation_id: conversationId },
      is_read: false,
    });
    sendPushToUser(recipientId, 'Booking Confirmed!', body, { conversation_id: conversationId });
  }

  return { proposals, proposeBooking, respondToProposal };
}

export function useScheduledJobs() {
  const { user, profile } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchJobs();
  }, [user]);

  async function fetchJobs() {
    if (!user) return;
    setLoading(true);

    if (profile?.role === 'customer') {
      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('customer_id', user.id)
        .not('scheduled_at', 'is', null)
        .order('scheduled_at', { ascending: true });
      setJobs((data as Job[]) ?? []);
    } else {
      const { data: quotes } = await supabase
        .from('quotes')
        .select('job_id')
        .eq('tradie_id', user.id)
        .eq('status', 'accepted');

      const ids = (quotes ?? []).map((q: any) => q.job_id as string);
      if (ids.length === 0) { setJobs([]); setLoading(false); return; }

      const { data } = await supabase
        .from('jobs')
        .select('*')
        .in('id', ids)
        .not('scheduled_at', 'is', null)
        .order('scheduled_at', { ascending: true });
      setJobs((data as Job[]) ?? []);
    }
    setLoading(false);
  }

  return { jobs, loading, refresh: fetchJobs };
}
