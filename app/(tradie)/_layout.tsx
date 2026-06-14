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

export default function TradieLayout() {
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
      <Tabs.Screen name="home" options={{ title: 'Nearby Jobs', tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'map' : 'map-outline'} focused={focused} color={color} /> }} />
      <Tabs.Screen name="jobs" options={{ title: 'Browse', tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'search' : 'search-outline'} focused={focused} color={color} /> }} />
      <Tabs.Screen name="my-quotes" options={{ title: 'My Quotes', tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'document-text' : 'document-text-outline'} focused={focused} color={color} /> }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} focused={focused} color={color} /> }} />
      <Tabs.Screen name="notifications" options={{
        title: 'Alerts',
        tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'notifications' : 'notifications-outline'} focused={focused} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} color={color} /> }} />
      <Tabs.Screen name="active-jobs" options={{ href: null }} />
      <Tabs.Screen name="earnings" options={{ href: null }} />
    </Tabs>
  );
}
