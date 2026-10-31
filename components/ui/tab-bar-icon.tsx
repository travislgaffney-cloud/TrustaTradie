import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { ColorValue, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

export function TabBarIcon({
  name,
  focused,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: ColorValue;
}) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, { damping: 14, stiffness: 180 });
  }, [focused, progress]);

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.5 + progress.value * 0.5 }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 0.12 }],
  }));

  return (
    <Animated.View style={styles.container}>
      <Animated.View style={[styles.bubble, bubbleStyle, { backgroundColor: `${String(color)}26` }]} />
      <Animated.View style={iconStyle}>
        <Ionicons name={name} size={22} color={color} style={{ opacity: focused ? 1 : 0.7 }} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 46,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    position: 'absolute',
    width: 46,
    height: 32,
    borderRadius: 16,
  },
});
