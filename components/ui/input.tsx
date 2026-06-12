import React, { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, hint, style, ...props }, ref) => {
    const scheme = useColorScheme() ?? 'light';
    const colors = Colors[scheme];

    return (
      <View style={styles.wrapper}>
        {label && (
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        )}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: error ? colors.error : colors.border,
            },
            style,
          ]}
          placeholderTextColor={colors.textSecondary}
          {...props}
        />
        {error && (
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        )}
        {hint && !error && (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48,
  },
  error: { fontSize: 12 },
  hint: { fontSize: 12 },
});
