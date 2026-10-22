import { supabase } from './supabase';
import { sendPushToUser } from './notifications';

export async function submitContactMessage(params: {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { error } = await supabase.from('contact_messages').insert({
    user_id: user.id,
    first_name: params.firstName,
    last_name: params.lastName,
    email: params.email,
    message: params.message,
  });

  if (error) throw error;

  // `admins` is admin-read-only under RLS, so a direct select from here
  // (a customer/tradie) always returns empty — admin_user_ids() is a
  // SECURITY DEFINER RPC that bypasses that for just the id list.
  const { data: adminIds } = await supabase.rpc('admin_user_ids');
  if (adminIds && adminIds.length > 0) {
    const title = 'New Contact Us Message';
    const body = `${params.firstName} ${params.lastName}: ${params.message.slice(0, 100)}${params.message.length > 100 ? '...' : ''}`;
    for (const id of adminIds) {
      sendPushToUser(id, title, body);
    }
  }
}
