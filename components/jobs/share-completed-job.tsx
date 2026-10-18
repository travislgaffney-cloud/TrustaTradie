import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { Brand } from '@/constants/theme';
import { uploadCompletionPhoto } from '@/hooks/use-jobs';
import { useAuthStore } from '@/store/auth-store';
import type { Job } from '@/types/database';

const CAPTION = 'Another successful job completed using Trust-a-Tradie! 🛠️';
const SHOT_SIZE = 1080;

interface Props {
  job: Job;
  role: 'customer' | 'tradie';
  onPhotoAdded?: (url: string) => void;
}

// No finished brand logo file exists yet — uses a styled "Trust-a-Tradie" wordmark
// in the real brand colors instead of the generic placeholder icon.png.
export function ShareCompletedJob({ job, role, onPhotoAdded }: Props) {
  const { user } = useAuthStore();
  const shotRef = useRef<View>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sharing, setSharing] = useState(false);

  function handleAddPhoto() {
    Alert.alert('Add Completion Photo', 'Add a photo of the finished work to share.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: () => pickImage('camera') },
      { text: 'Choose from Library', onPress: () => pickImage('library') },
    ]);
  }

  async function pickImage(source: 'camera' | 'library') {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', `Please allow ${source === 'camera' ? 'camera' : 'photo library'} access to add a photo.`);
      return;
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const url = await uploadCompletionPhoto(job.id, user!.id, result.assets[0].uri);
      onPhotoAdded?.(url);
    } catch {
      Alert.alert('Error', 'Could not upload the photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleShare() {
    if (!job.completion_photo_url) return;
    setSharing(true);
    try {
      const uri = await captureRef(shotRef, { format: 'jpg', quality: 0.92 });
      await Clipboard.setStringAsync(CAPTION);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { dialogTitle: 'Share Completed Job' });
      } else {
        Alert.alert('Sharing unavailable', 'Could not share the image on this device.');
      }
      Alert.alert(
        'Caption Copied',
        `We copied a suggested caption to your clipboard:\n\n"${CAPTION}"\n\nPaste it in when you post — Instagram and Facebook don't let apps fill this in for you.`
      );
    } catch {
      Alert.alert('Error', 'Could not prepare the image for sharing. Please try again.');
    } finally {
      setSharing(false);
    }
  }

  if (!job.completion_photo_url) {
    if (role !== 'tradie') return null;
    return (
      <Pressable style={styles.addBtn} onPress={handleAddPhoto} disabled={uploading}>
        {uploading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.addBtnText}>📸 Add Completion Photo</Text>
        }
      </Pressable>
    );
  }

  return (
    <>
      <Pressable
        style={[styles.shareBtn, (!imageLoaded || sharing) && { opacity: 0.6 }]}
        onPress={handleShare}
        disabled={!imageLoaded || sharing}
      >
        {sharing
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.shareBtnText}>{imageLoaded ? '📤 Share to Instagram / Facebook' : 'Preparing image...'}</Text>
        }
      </Pressable>

      {/* Off-screen composition used only to capture the watermarked image */}
      <View style={styles.offscreen} pointerEvents="none">
        <View ref={shotRef} collapsable={false} style={styles.shotContainer}>
          <Image
            source={{ uri: job.completion_photo_url }}
            style={styles.shotImage}
            onLoad={() => setImageLoaded(true)}
          />
          <View style={styles.watermarkPill}>
            <Text style={styles.watermarkText}>Trust-a-Tradie</Text>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  addBtn: { backgroundColor: Brand.secondary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  shareBtn: { backgroundColor: '#E1306C', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  shareBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  offscreen: { position: 'absolute', top: -9999, left: -9999 },
  shotContainer: { width: SHOT_SIZE, height: SHOT_SIZE, backgroundColor: '#000' },
  shotImage: { width: SHOT_SIZE, height: SHOT_SIZE, resizeMode: 'cover', position: 'absolute' },
  watermarkPill: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    backgroundColor: 'rgba(27,45,79,0.85)',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  watermarkText: { color: '#fff', fontSize: 40, fontWeight: '900', letterSpacing: 0.5 },
});
