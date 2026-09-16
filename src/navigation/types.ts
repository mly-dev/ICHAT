import type { NavigatorScreenParams } from '@react-navigation/native';

import type { ConversationId, UserId } from '@/types/models';

export type ChatScreenParams = {
  conversationId: ConversationId;
  /** Titre connu à l'ouverture : évite un écran vide le temps du chargement. */
  title?: string;
  /** Ouverture depuis un écran d'Adam : la conversation peut ne pas exister. */
  peerId?: UserId;
};

export type MainTabsParamList = {
  ConversationsTab: undefined;
  DirectoryTab: undefined;
  MarketTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  /* Périmètre Adam — placeholders, je ne les implémente pas. */
  Login: undefined;
  Settings: undefined;

  /* Mon périmètre */
  Main: NavigatorScreenParams<MainTabsParamList> | undefined;
  Chat: ChatScreenParams;
  ImageViewer: { url: string; name?: string };
  CreateGroup: undefined;
  GroupInfo: { conversationId: ConversationId };
  GroupMembers: { conversationId: ConversationId };
  AddMembers: { conversationId: ConversationId };
  NotificationSettings: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface RootParamList extends RootStackParamList {}
  }
}
