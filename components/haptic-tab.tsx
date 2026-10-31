import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import type { GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPlatformPressable = Animated.createAnimatedComponent(PlatformPressable);

export function HapticTab(props: BottomTabBarButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPlatformPressable
      {...props}
      style={[props.style, animatedStyle]}
      onPressIn={(ev: GestureResponderEvent) => {
        scale.value = withSpring(0.85, { damping: 12, stiffness: 300 });
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
      onPressOut={(ev: GestureResponderEvent) => {
        scale.value = withSpring(1, { damping: 10, stiffness: 250 });
        props.onPressOut?.(ev);
      }}
    />
  );
}
