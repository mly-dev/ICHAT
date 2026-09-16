import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';

import type { RootStackParamList } from './types';

/** Deep links : ilimichat://conversation/<id> (utilisé par les notifications). */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'ilimichat://', 'https://ilimichat.adu.ne'],
  config: {
    screens: {
      Main: {
        screens: {
          ConversationsTab: 'conversations',
          DirectoryTab: 'annuaire',
          MarketTab: 'market',
          ProfileTab: 'profil',
        },
      },
      Chat: 'conversation/:conversationId',
      GroupInfo: 'groupe/:conversationId',
      NotificationSettings: 'notifications',
    },
  },
};
