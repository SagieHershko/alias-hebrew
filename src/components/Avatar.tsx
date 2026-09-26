import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

/** A player's Google photo, or the first letter of their name. */
export function Avatar({ name, photo, size = 34 }: { name: string; photo?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (photo && !failed) {
    return <Image source={{ uri: photo }} style={[styles.avatar, shape]} onError={() => setFailed(true)} />;
  }
  return (
    <View style={[styles.avatar, styles.fallback, shape]}>
      <Text style={[styles.letter, { fontSize: size * 0.45 }]}>{name.slice(0, 1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { backgroundColor: '#ddd', borderWidth: 2, borderColor: colors.white },
  fallback: { backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  letter: { color: colors.white, fontWeight: '900' },
});
