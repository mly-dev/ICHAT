/**
 * Activation et réglage des notifications (ICH-056).
 *
 * Écran de mon périmètre. La logique est dans le service
 * `notificationPreferences`, pour que l'écran Paramètres d'Adam (ICH-075)
 * puisse l'appeler sans passer par ici.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Screen } from '@/components/ui';
import { toUserMessage } from '@/services/api';
import { notificationPreferences, registerForPushNotifications } from '@/services/notifications';
import { colors, radius, spacing, typography } from '@/theme';

function Row({ label, description, value, disabled, onChange }) {
  return (
    <View style={[styles.row, disabled ? styles.rowDisabled : null]}>
      <View style={styles.rowText}>
        <Text style={typography.body}>{label}</Text>
        <Text style={typography.caption}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: colors.primary, false: colors.border }}
        accessibilityLabel={label}
      />
    </View>
  );
}

export function NotificationSettingsScreen() {
  const [preferences, setPreferences] = useState(notificationPreferences.get());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = notificationPreferences.subscribe(setPreferences);
    void notificationPreferences.load();
    return unsubscribe;
  }, []);

  const toggle = useCallback(async (patch) => {
    setSaving(true);
    setError(null);
    try {
      await notificationPreferences.update(patch);
      // Réactivation : il faut aussi que la permission système soit accordée.
      if (patch.enabled) await registerForPushNotifications();
    } catch (updateError) {
      setError(toUserMessage(updateError));
    } finally {
      setSaving(false);
    }
  }, []);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Row
          label="Notifications"
          description="Recevoir les alertes de nouveaux messages"
          value={preferences.enabled}
          disabled={saving}
          onChange={(value) => void toggle({ enabled: value })}
        />
        <Row
          label="Messages privés"
          description="Alertes pour les conversations individuelles"
          value={preferences.directMessages}
          disabled={saving || !preferences.enabled}
          onChange={(value) => void toggle({ directMessages: value })}
        />
        <Row
          label="Messages de groupe"
          description="Alertes pour les groupes dont vous êtes membre"
          value={preferences.groupMessages}
          disabled={saving || !preferences.enabled}
          onChange={(value) => void toggle({ groupMessages: value })}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.hint}>
          Si vous ne recevez rien, vérifiez aussi les autorisations de l'application dans les
          réglages du téléphone.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  rowDisabled: { opacity: 0.5 },
  rowText: { flex: 1, gap: 2 },
  error: { ...typography.caption, color: colors.danger },
  hint: { ...typography.caption, paddingTop: spacing.sm },
});
