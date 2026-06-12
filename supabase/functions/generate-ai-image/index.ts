import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')!;

Deno.serve(async (req) => {
  const { prompt, job_id } = await req.json();

  if (!prompt) return new Response('Missing prompt', { status: 400 });

  // Call DALL-E 3
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: `${prompt} Photo-realistic, bright, well-lit South African home interior/exterior. High quality.`,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'url',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return new Response(`OpenAI error: ${err}`, { status: 500 });
  }

  const { data } = await response.json();
  const imageUrl: string = data[0].url;

  // Download and upload to Supabase Storage
  const imgResponse = await fetch(imageUrl);
  const imgBuffer = await imgResponse.arrayBuffer();

  const fileName = `${job_id ?? 'draft'}_${Date.now()}.png`;
  const { error: uploadError } = await supabase.storage
    .from('job-images')
    .upload(`ai/${fileName}`, imgBuffer, { contentType: 'image/png', upsert: true });

  if (uploadError) {
    return new Response(`Upload error: ${uploadError.message}`, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from('job-images').getPublicUrl(`ai/${fileName}`);

  return new Response(JSON.stringify({ url: publicUrl }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
