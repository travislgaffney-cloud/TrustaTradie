import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Option {
  value: 'customer' | 'tradie';
  icon: string;
  title: string;
  description: string;
}

const OPTIONS: Option[] = [
  {
    value: 'customer',
    icon: '🏡',
    title: 'I need work done',
    description: 'Post a job and receive quotes from qualified tradies in your area.',
  },
  {
    value: 'tradie',
    icon: '🔨',
    title: 'I am a tradie',
    description: 'Browse nearby jobs, submit quotes, and grow your business.',
  },
];

interface UserTypeSelectorProps {
  value: 'customer' | 'tradie' | null;
  onChange: (value: 'customer' | 'tradie') => void;
}

export function UserTypeSelector({ value, onChange }: UserTypeSelectorProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <View style={styles.container}>
      {OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.card,
              { borderColor: isSelected ? Brand.primary : colors.border, backgroundColor: colors.surface },
              isSelected && styles.selectedCard,
            ]}
          >
            <Text style={styles.icon}>{opt.icon}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{opt.title}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {opt.description}
            </Text>
            {isSelected && (
              <View style={styles.checkBadge}>
                <Text style={styles.checkText}>✓</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  card: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 20,
    gap: 6,
  },
  selectedCard: { borderColor: Brand.primary },
  icon: { fontSize: 36 },
  title: { fontSize: 18, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 20 },
  checkBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
