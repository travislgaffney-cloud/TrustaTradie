import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface StepIndicatorProps {
  steps: number;
  current: number;
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <View style={styles.container}>
      {Array.from({ length: steps }, (_, i) => {
        const isCompleted = i < current - 1;
        const isActive = i === current - 1;
        return (
          <React.Fragment key={i}>
            <View
              style={[
                styles.dot,
                isCompleted && { backgroundColor: Brand.primary },
                isActive && { backgroundColor: Brand.primary, borderColor: Brand.primary },
                !isCompleted && !isActive && { backgroundColor: colors.border },
              ]}
            >
              {isCompleted && <Text style={styles.check}>✓</Text>}
              {isActive && <View style={styles.inner} />}
            </View>
            {i < steps - 1 && (
              <View
                style={[
                  styles.line,
                  { backgroundColor: isCompleted ? Brand.primary : colors.border },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  check: { color: '#fff', fontSize: 13, fontWeight: '700' },
  line: { flex: 1, height: 2, marginHorizontal: 4 },
});
