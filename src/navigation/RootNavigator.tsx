import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { ChatScreen } from '@/screens/chat/ChatScreen';
import { ImageViewerScreen } from '@/screens/chat/ImageViewerScreen';
import { AddMembersScreen } from '@/screens/groups/AddMembersScreen';
import { CreateGroupScreen } from '@/screens/groups/CreateGroupScreen';
import { GroupInfoScreen } from '@/screens/groups/GroupInfoScreen';
import { GroupMembersScreen } from '@/screens/groups/GroupMembersScreen';
import { NotificationSettingsScreen } from '@/screens/notifications/NotificationSettingsScreen';
import { SettingsScreen } from '@/screens/placeholders';
import { colors } from '@/theme';

import { MainTabs } from './MainTabs';
import { linking } from './linking';
import { navigationRef } from './navigationRef';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  onReady?: () => void;
}

export function RootNavigator({ onReady }: RootNavigatorProps) {
  return (
    <NavigationContainer ref={navigationRef} linking={linking} onReady={onReady}>
      <Stack.Navigator
        screenOptions={{
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ title: '' }} />
        <Stack.Screen
          name="ImageViewer"
          component={ImageViewerScreen}
          options={{ headerShown: false, animation: 'fade', presentation: 'fullScreenModal' }}
        />
        <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'Nouveau groupe' }} />
        <Stack.Screen name="GroupInfo" component={GroupInfoScreen} options={{ title: 'Infos du groupe' }} />
        <Stack.Screen name="GroupMembers" component={GroupMembersScreen} options={{ title: 'Membres' }} />
        <Stack.Screen name="AddMembers" component={AddMembersScreen} options={{ title: 'Ajouter des membres' }} />
        <Stack.Screen
          name="NotificationSettings"
          component={NotificationSettingsScreen}
          options={{ title: 'Notifications' }}
        />
        {/* Périmètre Adam */}
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Paramètres' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
