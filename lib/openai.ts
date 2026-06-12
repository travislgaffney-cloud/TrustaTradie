import { supabase } from './supabase';

export async function generateJobImage(prompt: string, jobId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-ai-image', {
    body: { prompt, job_id: jobId },
  });

  if (error) throw error;
  return data.url as string;
}
