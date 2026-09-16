/**
 * Fil d'une conversation (ICH-019 à ICH-028).
 *
 * Liste inversée : c'est le sens naturel d'une messagerie, et ça évite de
 * scroller à la main après chaque message. L'historique se charge en remontant
 * (onEndReached sur une liste inversée = haut de l'écran).
 */
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DaySeparator, MessageBubble, MessageInput, ReplyBar } from '@/components/chat';
import { UploadProgress, useUpload } from '@/components/upload';
import type { ChatItem } from '@/components/chat/chatItems';
import { ErrorState, LoadingState, Screen } from '@/components/ui';
import { useAttachmentActions } from '@/hooks/useAttachmentActions';
import { useMessages } from '@/hooks/useMessages';
import { useResolvedConversation } from '@/hooks/useResolvedConversation';
import { getCurrentUserId } from '@/mocks';
import type { RootStackParamList } from '@/navigation/types';
import { joinConversation, leaveConversation, markConversationAsRead } from '@/services/socket';
import { useMessagesStore } from '@/store/messagesStore';
import { colors, spacing, typography } from '@/theme';
import type { Message, MessageAttachment } from '@/types/models';

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

  const { items, messages, status, error, loadingOlder, onEndReached, retry } =
    useMessages(conversationId);
  const sendText = useMessagesStore((state) => state.sendText);
  const retryMessage = useMessagesStore((state) => state.retryMessage);
  const deleteMessage = useMessagesStore((state) => state.deleteMessage);
  const sendAttachment = useMessagesStore((state) => state.sendAttachment);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  /*
   * ICH-029 / ICH-032 : la pièce jointe est téléversée d'abord, puis envoyée
   * comme message. Le composant d'upload est celui partagé avec Adam, on ne
   * lui ajoute rien de spécifique à la messagerie.
   */
  const { uploading, progress, error: uploadError, pickAndUploadImage, pickAndUploadDocument, cancel } =
    useUpload({
      onUploaded: (attachment: MessageAttachment) => {
        if (!conversationId) return;
        void sendAttachment(conversationId, attachment, { replyToId: replyTo?.id ?? null });
        setReplyTo(null);
      },
    });

  const openImage = useCallback(
    (attachment: MessageAttachment) => {
      navigation.navigate('ImageViewer', { url: attachment.url, name: attachment.name });
    },
    [navigation]
  );
  const { onPressImage, onPressFile } = useAttachmentActions(openImage);

  const handleAttach = useCallback(() => {
    Alert.alert(
      'Joindre',
      undefined,
      [
        { text: 'Prendre une photo', onPress: () => void pickAndUploadImage('camera') },
        { text: 'Choisir une image', onPress: () => void pickAndUploadImage('library') },
        { text: 'Choisir un fichier', onPress: () => void pickAndUploadDocument() },
        { text: 'Annuler', style: 'cancel' as const },
      ],
      { cancelable: true }
    );
  }, [pickAndUploadDocument, pickAndUploadImage]);

  /** Dernier message reçu : sert de repère de lecture côté serveur. */
  const lastIncomingMessageId = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message && message.senderId !== currentUserId) return message.id;
    }
    return undefined;
  }, [messages, currentUserId]);

  useLayoutEffect(() => {
    const isGroup = conversation?.type === 'group';
    navigation.setOptions({
      title: conversation?.title ?? title ?? '',
      // Accès aux infos du groupe depuis l'en-tête (ICH-046).
      headerRight: isGroup && conversationId
        ? () => (
            <Pressable
              onPress={() => navigation.navigate('GroupInfo', { conversationId })}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Informations du groupe"
            >
              <Text style={styles.headerAction}>Infos</Text>
            </Pressable>
          )
        : undefined,
    });
  }, [conversation?.title, conversation?.type, conversationId, navigation, title]);

  useEffect(() => {
    setSendError(null);
    setReplyTo(null);
  }, [conversationId]);

  /* Abonnement temps réel au fil ouvert (ICH-022). */
  useEffect(() => {
    if (!conversationId) return;
    joinConversation(conversationId);
    return () => leaveConversation(conversationId);
  }, [conversationId]);

  /*
   * ICH-026 : la conversation est marquée comme lue à l'ouverture, et de
   * nouveau quand un message arrive alors qu'elle est à l'écran — sinon le
   * badge se remet à compter sous les yeux de quelqu'un qui est en train de
   * lire.
   */
  useEffect(() => {
    if (!conversationId || !lastIncomingMessageId) return;
    void markConversationAsRead(conversationId, lastIncomingMessageId);
  }, [conversationId, lastIncomingMessageId]);

  const handleSend = useCallback(
    (text: string) => {
      if (!conversationId) {
        setSendError("La conversation n'est pas encore prête, réessayez dans un instant.");
        return;
      }
      void sendText(conversationId, text, replyTo?.id ?? null);
      setReplyTo(null);
    },
    [conversationId, replyTo, sendText]
  );

  /** ICH-027 / ICH-028 : répondre ou supprimer, via appui long. */
  const handleLongPress = useCallback(
    (message: Message) => {
      const isOwn = message.senderId === currentUserId;
      Alert.alert(
        'Message',
        undefined,
        [
          { text: 'Répondre', onPress: () => setReplyTo(message) },
          ...(isOwn
            ? [
                {
                  text: 'Supprimer',
                  style: 'destructive' as const,
                  onPress: () => {
                    if (conversationId) void deleteMessage(conversationId, message.id);
                  },
                },
              ]
            : []),
          { text: 'Annuler', style: 'cancel' as const },
        ],
        { cancelable: true }
      );
    },
    [conversationId, currentUserId, deleteMessage]
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
          onLongPress={handleLongPress}
          onRetry={handleRetry}
          onPressImage={onPressImage}
          onPressFile={onPressFile}
        />
      );
    },
    [conversation?.type, currentUserId, handleLongPress, handleRetry, onPressFile, onPressImage]
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
        {uploadError ? <Text style={styles.error}>{uploadError}</Text> : null}

        <UploadProgress progress={progress} onCancel={cancel} label="Envoi de la pièce jointe…" />

        {replyTo ? <ReplyBar message={replyTo} onCancel={() => setReplyTo(null)} /> : null}

        <MessageInput onSend={handleSend} onAttach={handleAttach} disabled={uploading} />
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
  headerAction: { ...typography.body, color: colors.primary, fontWeight: '600' },
  error: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
});
