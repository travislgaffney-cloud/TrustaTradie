import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { sendPushToUser } from '@/lib/notifications';
import type { Conversation, LocalMessage, Message } from '@/types/database';
import { useAuthStore } from '@/store/auth-store';

export async function startJobConversation(customerId: string, tradieId: string, jobId: string): Promise<string> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('customer_id', customerId)
    .eq('tradie_id', tradieId)
    .eq('job_id', jobId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('conversations')
    .insert({ customer_id: customerId, tradie_id: tradieId, job_id: jobId })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function startDirectConversation(customerId: string, tradieId: string): Promise<string> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('customer_id', customerId)
    .eq('tradie_id', tradieId)
    .is('job_id', null)
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('conversations')
    .insert({ customer_id: customerId, tradie_id: tradieId, job_id: null })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export function useConversations() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch();
    const channel = supabase
      .channel('conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function fetch() {
    setLoading(true);
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        job:jobs(id, title, category, status),
        customer:profiles!conversations_customer_id_fkey(id, full_name, avatar_url),
        tradie:profiles!conversations_tradie_id_fkey(id, full_name, avatar_url)
      `)
      .or(`customer_id.eq.${user!.id},tradie_id.eq.${user!.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    setConversations((data as Conversation[]) ?? []);
    setLoading(false);
  }

  return { conversations, loading, refresh: fetch };
}

export function useMessages(conversationId: string) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const instanceId = useRef(Math.random().toString(36).slice(2, 7)).current;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const conversationRef = useRef<Conversation | null>(null);

  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  useEffect(() => {
    fetchConversation();
    fetchMessages();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    channelRef.current = supabase
      .channel(`messages:${conversationId}:${instanceId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        // Skip messages we already added optimistically (matched by id)
        setMessages((prev) => {
          const incoming = payload.new as Message;
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
      })
      .on('postgres_changes', {
        // Catch is_read updates so sender's ticks turn blue in real-time
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const updated = payload.new as Message;
        setMessages((prev) =>
          prev.map((m) => m.id === updated.id ? { ...m, is_read: updated.is_read } : m)
        );
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId]);

  async function fetchConversation() {
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        job:jobs(id, title),
        customer:profiles!conversations_customer_id_fkey(id, full_name, avatar_url),
        tradie:profiles!conversations_tradie_id_fkey(id, full_name, avatar_url)
      `)
      .eq('id', conversationId)
      .single();
    setConversation((data as Conversation) ?? null);
  }

  async function fetchMessages() {
    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setMessages((data as LocalMessage[]) ?? []);

    if (user) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false);
    }
    setLoading(false);
  }

  async function sendMessage(params: {
    content?: string;
    attachmentUrl?: string;
    attachmentType?: string;
  }) {
    if (!user) return;

    // Show a single tick immediately (pending state)
    const tempId = `_p_${Date.now()}`;
    const optimistic: LocalMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      content: params.content ?? null,
      attachment_url: params.attachmentUrl ?? null,
      attachment_type: (params.attachmentType ?? null) as LocalMessage['attachment_type'],
      is_read: false,
      created_at: new Date().toISOString(),
      _pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data: newMsg, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: params.content ?? null,
        attachment_url: params.attachmentUrl ?? null,
        attachment_type: params.attachmentType ?? null,
        is_read: false,
      })
      .select('*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)')
      .single();

    if (!error && newMsg) {
      // Replace optimistic (1 tick) with confirmed message (2 grey ticks)
      setMessages((prev) =>
        prev.map((m) => m.id === tempId ? { ...(newMsg as Message), _pending: false } : m)
      );

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Notify the other party (in-app + push)
      const conv = conversationRef.current;
      if (conv) {
        const recipientId = conv.customer_id === user.id
          ? conv.tradie_id
          : conv.customer_id;
        const senderName = (newMsg as any).sender?.full_name ?? 'Someone';
        const notifBody = params.content
          ? `${senderName}: ${params.content.slice(0, 100)}`
          : `${senderName} sent an attachment`;

        await supabase.from('notifications').insert({
          user_id: recipientId,
          type: 'new_message',
          title: 'New Message',
          body: notifBody,
          data: { conversation_id: conversationId },
          is_read: false,
        });

        sendPushToUser(recipientId, 'New Message', notifBody, { conversation_id: conversationId });
      }
    } else {
      // Remove the optimistic message if DB insert failed
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  }

  return { messages, conversation, loading, sendMessage };
}
