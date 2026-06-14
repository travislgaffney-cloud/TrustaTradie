import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNotifications } from '@/hooks/use-notifications';

function TabIcon({
  name,
  focused,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
}) {
  return <Ionicons name={name} size={22} color={color} style={{ opacity: focused ? 1 : 0.7 }} />;
}

export default function CustomerLayout() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { unreadCount } = useNotifications();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Brand.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs/index"
        options={{
          title: 'My Jobs',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'briefcase' : 'briefcase-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name={focused ? 'notifications' : 'notifications-outline'} focused={focused} color={color} />
          ),
        }}
      />
      {/* Hidden routes — not shown in tab bar */}
      <Tabs.Screen name="profile/index" options={{ href: null }} />
      <Tabs.Screen name="profile/settings" options={{ href: null }} />
      <Tabs.Screen name="payments/index" options={{ href: null }} />
      <Tabs.Screen name="payments/checkout" options={{ href: null }} />
      <Tabs.Screen name="post-job/details" options={{ href: null }} />
      <Tabs.Screen name="post-job/ai-image" options={{ href: null }} />
      <Tabs.Screen name="post-job/location" options={{ href: null }} />
      <Tabs.Screen name="post-job/review" options={{ href: null }} />
    </Tabs>
  );
}
