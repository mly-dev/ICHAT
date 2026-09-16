/** Deep links : ilimichat://conversation/<id> (utilisé par les notifications). */
export const linking = {
  prefixes: ['ilimichat://', 'https://ilimichat.adu.ne'],
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
