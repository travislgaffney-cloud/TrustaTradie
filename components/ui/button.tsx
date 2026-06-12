import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from 'react-native';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends PressableProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const isDisabled = disabled || loading;

  const containerStyle = [
    styles.base,
    styles[`size_${size}`],
    variant === 'primary' && { backgroundColor: Brand.primary },
    variant === 'secondary' && { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    variant === 'outline' && { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Brand.primary },
    variant === 'ghost' && { backgroundColor: 'transparent' },
    variant === 'danger' && { backgroundColor: colors.error },
    isDisabled && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.text,
    styles[`textSize_${size}`],
    variant === 'primary' && { color: '#fff' },
    variant === 'secondary' && { color: colors.text },
    variant === 'outline' && { color: Brand.primary },
    variant === 'ghost' && { color: colors.textSecondary },
    variant === 'danger' && { color: '#fff' },
  ];

  return (
    <Pressable
      style={({ pressed }) => [...(containerStyle as object[]), pressed && !isDisabled ? styles.pressed : null] as unknown as object}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' || variant === 'ghost' ? Brand.primary : '#fff'}
          size={size === 'sm' ? 'small' : 'small'}
        />
      ) : (
        <Text style={textStyle}>{children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  size_sm: { paddingVertical: 8, paddingHorizontal: 16, minHeight: 36 },
  size_md: { paddingVertical: 12, paddingHorizontal: 20, minHeight: 48 },
  size_lg: { paddingVertical: 16, paddingHorizontal: 24, minHeight: 56 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  text: { fontWeight: '600' },
  textSize_sm: { fontSize: 14 },
  textSize_md: { fontSize: 16 },
  textSize_lg: { fontSize: 18 },
});
