import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Conversation, Message } from '@/types/database';
import { useAuthStore } from '@/store/auth-store';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  async function fetch() {
    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);

    // Mark messages as read
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
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: params.content ?? null,
      attachment_url: params.attachmentUrl ?? null,
      attachment_type: params.attachmentType ?? null,
      is_read: false,
    });

    if (!error) {
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    }
  }

  return { messages, loading, sendMessage };
}
