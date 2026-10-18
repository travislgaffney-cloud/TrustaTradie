import React from 'react';
import {
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  type KeyboardAvoidingViewProps,
  Platform,
} from 'react-native';

// Expo's default Android window mode already resizes the screen around the
// keyboard (adjustResize), so also setting `behavior="height"` here makes
// KeyboardAvoidingView apply its own resize on top of the OS's — the two
// fight each other and the net result is inputs/buttons ending up hidden
// behind the keyboard instead of pushed above it. Only iOS has no OS-level
// resize, so only iOS needs `padding` here; Android gets no behavior at all
// and just lets the window resize do its job.
export function KeyboardAvoidingView({ style, ...props }: KeyboardAvoidingViewProps) {
  return (
    <RNKeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={style ?? { flex: 1 }}
      {...props}
    />
  );
}
