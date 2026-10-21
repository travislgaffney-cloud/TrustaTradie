import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

type Bucket = 'avatars' | 'job-images' | 'portfolio' | 'chat-attachments' | 'completion-photos' | 'review-photos' | 'invoices';
type PrivateBucket = 'reward-slips' | 'documents' | 'dispute-evidence';

export async function uploadFile(
  bucket: Bucket,
  path: string,
  uri: string,
  contentType: string
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });

  const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, { contentType, upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(bucket: Bucket, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

export function getPublicUrl(bucket: Bucket, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// For buckets that are genuinely private (currently just reward-slips) —
// unlike every bucket above, these never get a public URL. uploadFile()
// can't be reused as-is because its last step always calls getPublicUrl(),
// which would silently succeed but return a URL nobody can actually load.
export async function uploadPrivateFile(
  bucket: PrivateBucket,
  path: string,
  uri: string,
  contentType: string
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });

  const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, { contentType, upsert: true });

  if (error) throw error;

  return path;
}

// Short-lived signed URL for displaying a private file — the only way this
// app ever reads from a private bucket, since RLS on storage.objects
// restricts who can even request one (the owning tradie, or an admin).
export async function getSignedUrl(
  bucket: PrivateBucket,
  path: string,
  expiresInSeconds: number = 300
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error) return null;
  return data.signedUrl;
}
