import { Platform } from 'react-native';

export const Brand = {
  primary: '#F97316',       // orange-500
  primaryDark: '#EA6C0A',   // orange-600
  primaryLight: '#FED7AA',  // orange-200
  secondary: '#1B2D4F',     // logo navy
  accent: '#FBBF24',        // amber-400
};

export const Colors = {
  light: {
    text: '#0f172a',
    textSecondary: '#64748b',
    background: '#f8fafc',
    surface: '#ffffff',
    border: '#e2e8f0',
    tint: Brand.primary,
    icon: '#64748b',
    tabIconDefault: '#94a3b8',
    tabIconSelected: Brand.primary,
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  dark: {
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    background: '#0f172a',
    surface: '#1e293b',
    border: '#334155',
    tint: Brand.accent,
    icon: '#94a3b8',
    tabIconDefault: '#475569',
    tabIconSelected: Brand.accent,
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
