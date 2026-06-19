import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

type Bucket = 'avatars' | 'job-images' | 'portfolio' | 'documents' | 'chat-attachments' | 'completion-photos';

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
