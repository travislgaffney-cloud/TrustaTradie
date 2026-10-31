import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
  type PressableProps,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  onPressIn,
  onPressOut,
  ...props
}: ButtonProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: GestureResponderEvent) => {
    scale.value = withSpring(0.96, { damping: 14, stiffness: 400 });
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    scale.value = withSpring(1, { damping: 10, stiffness: 300 });
    onPressOut?.(e);
  };

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
    <AnimatedPressable
      style={[...(containerStyle as object[]), animatedStyle] as unknown as object}
      disabled={isDisabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
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
    </AnimatedPressable>
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
  text: { fontWeight: '600' },
  textSize_sm: { fontSize: 14 },
  textSize_md: { fontSize: 16 },
  textSize_lg: { fontSize: 18 },
});
