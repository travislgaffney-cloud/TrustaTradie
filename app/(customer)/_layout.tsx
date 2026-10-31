import { Tabs } from 'expo-router';
import React from 'react';
import { Brand, Colors } from '@/constants/theme';
import { HapticTab } from '@/components/haptic-tab';
import { TabBarIcon } from '@/components/ui/tab-bar-icon';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNotifications } from '@/hooks/use-notifications';

export default function CustomerLayout() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { unreadCount } = useNotifications();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        tabBarActiveTintColor: Brand.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarButton: HapticTab,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? 'home' : 'home-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'My Jobs',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? 'briefcase' : 'briefcase-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Chats',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tradies"
        options={{
          title: 'Tradies',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? 'people' : 'people-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? 'notifications' : 'notifications-outline'} focused={focused} color={color} />
          ),
        }}
      />
      {/* Hidden sections — detail screens live inside each folder's Stack layout */}
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="payments" options={{ href: null }} />
      <Tabs.Screen name="post-job" options={{ href: null }} />
      <Tabs.Screen name="calendar" options={{ href: null }} />
    </Tabs>
  );
}
