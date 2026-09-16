/**
 * Fil d'une conversation (ICH-019 à ICH-028).
 *
 * Liste inversée : c'est le sens naturel d'une messagerie, et ça évite de
 * scroller à la main après chaque message. L'historique se charge en remontant
 * (onEndReached sur une liste inversée = haut de l'écran).
 */
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DaySeparator, MessageBubble, MessageInput } from '@/components/chat';
import type { ChatItem } from '@/components/chat/chatItems';
import { ErrorState, LoadingState, Screen } from '@/components/ui';
import { useMessages } from '@/hooks/useMessages';
import { useResolvedConversation } from '@/hooks/useResolvedConversation';
import { getCurrentUserId } from '@/mocks';
import type { RootStackParamList } from '@/navigation/types';
import { useMessagesStore } from '@/store/messagesStore';
import { colors, spacing, typography } from '@/theme';
import type { Message } from '@/types/models';

type ChatRoute = RouteProp<RootStackParamList, 'Chat'>;
type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function ChatScreen() {
  const route = useRoute<ChatRoute>();
  const navigation = useNavigation<Navigation>();
  const { conversationId: routeConversationId, peerId, title } = route.params ?? {};

  const { conversation, resolving, error: resolveError } = useResolvedConversation({
    conversationId: routeConversationId || undefined,
    peerId,
  });

  const conversationId = conversation?.id ?? (routeConversationId || null);
  const currentUserId = getCurrentUserId();
  const [sendError, setSendError] = useState<string | null>(null);

  const { items, status, error, loadingOlder, onEndReached, retry } = useMessages(conversationId);
  const sendText = useMessagesStore((state) => state.sendText);
  const retryMessage = useMessagesStore((state) => state.retryMessage);

  useLayoutEffect(() => {
    navigation.setOptions({ title: conversation?.title ?? title ?? '' });
  }, [conversation?.title, navigation, title]);

  useEffect(() => {
    setSendError(null);
  }, [conversationId]);

  const handleSend = useCallback(
    (text: string) => {
      if (!conversationId) {
        setSendError("La conversation n'est pas encore prête, réessayez dans un instant.");
        return;
      }
      void sendText(conversationId, text);
    },
    [conversationId, sendText]
  );

  const handleRetry = useCallback(
    (message: Message) => {
      if (!conversationId || !message.clientId) return;
      void retryMessage(conversationId, message.clientId);
    },
    [conversationId, retryMessage]
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatItem }) => {
      if (item.type === 'day') return <DaySeparator date={item.date} />;
      return (
        <MessageBubble
          message={item.message}
          isOwn={item.message.senderId === currentUserId}
          showSender={item.showSender && conversation?.type === 'group'}
          onRetry={handleRetry}
        />
      );
    },
    [conversation?.type, currentUserId, handleRetry]
  );

  const keyExtractor = useCallback((item: ChatItem) => item.key, []);

  if (resolving || (status === 'loading' && !items.length)) {
    return (
      <Screen>
        <LoadingState label="Chargement de la conversation…" />
      </Screen>
    );
  }

  if ((resolveError || status === 'error') && !items.length) {
    return (
      <Screen>
        <ErrorState message={resolveError ?? error ?? 'Conversation indisponible.'} onRetry={retry} />
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          inverted
          contentContainerStyle={items.length ? styles.list : styles.emptyList}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={typography.bodyMuted}>
                Aucun message pour l'instant. Écrivez le premier.
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingOlder ? <ActivityIndicator style={styles.loader} color={colors.primary} /> : null
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          initialNumToRender={20}
          maxToRenderPerBatch={15}
          windowSize={9}
          removeClippedSubviews
          keyboardDismissMode="on-drag"
        />

        {sendError ? <Text style={styles.error}>{sendError}</Text> : null}

        <MessageInput onSend={handleSend} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingVertical: spacing.sm },
  emptyList: { flexGrow: 1, justifyContent: 'center', transform: [{ scaleY: -1 }] },
  empty: { alignItems: 'center', padding: spacing.xl },
  loader: { paddingVertical: spacing.lg },
  error: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
});
