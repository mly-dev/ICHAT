import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { ConversationsScreen } from '@/screens/conversations/ConversationsScreen';
import { selectTotalUnread, useConversationsStore } from '@/store/conversationsStore';
import { DirectoryScreen, MarketScreen, ProfileScreen } from '@/screens/placeholders';
import { colors } from '@/theme';

import type { MainTabsParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

/** Icônes en texte pour l'instant : les pictos Figma arrivent plus tard. */
function tabIcon(label: string) {
  return function TabIcon({ color }: { color: string }) {
    return <Text style={[styles.icon, { color }]}>{label}</Text>;
  };
}

export function MainTabs() {
  // Badge de l'onglet : lu depuis l'unique source de vérité des non-lus.
  const totalUnread = useConversationsStore(selectTotalUnread);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerTitleStyle: { color: colors.text },
      }}
    >
      <Tab.Screen
        name="ConversationsTab"
        component={ConversationsScreen}
        options={{
          title: 'Discussions',
          tabBarIcon: tabIcon('💬'),
          tabBarBadge: totalUnread > 0 ? (totalUnread > 99 ? '99+' : totalUnread) : undefined,
        }}
      />
      <Tab.Screen
        name="DirectoryTab"
        component={DirectoryScreen}
        options={{ title: 'Annuaire', tabBarIcon: tabIcon('🔎') }}
      />
      <Tab.Screen
        name="MarketTab"
        component={MarketScreen}
        options={{ title: 'ilimiMarket', tabBarIcon: tabIcon('🛍️') }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Profil', tabBarIcon: tabIcon('👤') }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({ icon: { fontSize: 18 } });
