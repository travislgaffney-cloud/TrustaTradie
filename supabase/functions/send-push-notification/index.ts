import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  const { user_id, title, body, data } = await req.json();

  if (!user_id || !title || !body) {
    return new Response('Missing fields', { status: 400 });
  }

  // Get push token
  const { data: profile } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('id', user_id)
    .single();

  // Store notification in DB regardless of push token
  await supabase.from('notifications').insert({
    user_id,
    type: data?.type ?? 'new_message',
    title,
    body,
    data: data ?? null,
    is_read: false,
  });

  if (!profile?.push_token) {
    return new Response('No push token — notification stored only', { status: 200 });
  }

  // Send via Expo Push API
  const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN') ?? ''}`,
    },
    body: JSON.stringify({
      to: profile.push_token,
      title,
      body,
      data: data ?? {},
      sound: 'default',
      priority: 'high',
    }),
  });

  const result = await pushResponse.json();

  return new Response(JSON.stringify({ success: true, expo: result }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
