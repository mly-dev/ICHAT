import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Badge } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';
import { formatConversationDate } from '@/utils/time';

/** Hauteur fixe : permet getItemLayout, donc un scroll fluide sur petit Android. */
export const CONVERSATION_ROW_HEIGHT = 76;

function ConversationRowComponent({ conversation, currentUserId, onPress }) {
  const { lastMessage, unreadCount } = conversation;
  const unread = unreadCount > 0;

  let prefix = '';
  if (lastMessage) {
    if (conversation.type === 'group') {
      prefix = `${lastMessage.senderId === currentUserId ? 'Vous' : lastMessage.senderName || 'Membre'} : `;
    } else if (lastMessage.senderId === currentUserId) {
      prefix = 'Vous : ';
    }
  }

  return (
    <Pressable
      onPress={() => onPress(conversation)}
      accessibilityRole="button"
      accessibilityLabel={`Conversation avec ${conversation.title}`}
      style={({ pressed }) => [styles.container, pressed ? styles.pressed : null]}
    >
      <Avatar name={conversation.title} uri={conversation.avatarUrl} size={48} />

      <View style={styles.center}>
        <Text style={[typography.subtitle, styles.title]} numberOfLines={1}>
          {conversation.title}
        </Text>
        <Text
          style={[unread ? styles.previewUnread : typography.bodyMuted, styles.preview]}
          numberOfLines={1}
        >
          {lastMessage ? `${prefix}${lastMessage.preview}` : 'Aucun message'}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={typography.caption}>
          {lastMessage ? formatConversationDate(lastMessage.createdAt) : ''}
        </Text>
        <Badge count={unreadCount} />
      </View>
    </Pressable>
  );
}

export const ConversationRow = memo(ConversationRowComponent, (prev, next) => {
  const a = prev.conversation;
  const b = next.conversation;
  return (
    a.id === b.id &&
    a.title === b.title &&
    a.unreadCount === b.unreadCount &&
    a.updatedAt === b.updatedAt &&
    a.avatarUrl === b.avatarUrl &&
    (a.lastMessage && a.lastMessage.id) === (b.lastMessage && b.lastMessage.id) &&
    (a.lastMessage && a.lastMessage.preview) === (b.lastMessage && b.lastMessage.preview) &&
    prev.currentUserId === next.currentUserId
  );
});

const styles = StyleSheet.create({
  container: {
    height: CONVERSATION_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  pressed: { backgroundColor: colors.surface },
  center: { flex: 1, gap: 2 },
  title: { fontSize: 16 },
  preview: { fontSize: 14 },
  previewUnread: { fontSize: 14, color: colors.text, fontWeight: '600' },
  right: { alignItems: 'flex-end', gap: spacing.xs, minWidth: 52 },
});
