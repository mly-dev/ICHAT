import React, { memo, useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '@/theme';

interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: number;
}

/** Palette déterministe : le même membre garde toujours la même couleur. */
const FALLBACK_COLORS = ['#0B5FFF', '#12B76A', '#F79009', '#7A5AF8', '#D92D20', '#0E9384'];

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function colorOf(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 997;
  }
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length] as string;
}

export const Avatar = memo(function Avatar({ name, uri, size = 48 }: AvatarProps) {
  const style = useMemo(
    () => ({ width: size, height: size, borderRadius: radius.pill }),
    [size]
  );

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, style]} accessibilityIgnoresInvertColors />;
  }

  return (
    <View style={[styles.fallback, style, { backgroundColor: colorOf(name) }]}>
      <Text style={[typography.captionStrong, styles.initials, { fontSize: size * 0.36 }]}>
        {initialsOf(name) || '?'}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surfaceAlt },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.textInverse },
});
