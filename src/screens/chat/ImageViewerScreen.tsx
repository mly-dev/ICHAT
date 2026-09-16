/**
 * Visionneuse plein écran (ICH-031).
 * Volontairement sobre : pas de zoom gestuel pour l'instant, ça demanderait
 * reanimated + gesture-handler et du travail de perf sur petits Android.
 */
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/navigation/types';
import { colors, spacing, typography } from '@/theme';

type ImageViewerRoute = RouteProp<RootStackParamList, 'ImageViewer'>;

export function ImageViewerScreen() {
  const route = useRoute<ImageViewerRoute>();
  const navigation = useNavigation();
  const { url, name } = route.params;

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {name ?? 'Image'}
        </Text>
        <Pressable
          onPress={navigation.goBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        >
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {failed ? (
          <Text style={styles.error}>
            L'image n'a pas pu être chargée. Vérifiez votre connexion.
          </Text>
        ) : (
          <>
            <Image
              source={{ uri: url }}
              style={styles.image}
              resizeMode="contain"
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setFailed(true);
              }}
              accessibilityIgnoresInvertColors
            />
            {loading ? <ActivityIndicator style={styles.loader} color={colors.textInverse} /> : null}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.overlay },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { ...typography.subtitle, color: colors.textInverse, flex: 1 },
  close: { color: colors.textInverse, fontSize: 20 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  loader: { position: 'absolute' },
  error: { ...typography.body, color: colors.textInverse, textAlign: 'center', padding: spacing.xl },
});
