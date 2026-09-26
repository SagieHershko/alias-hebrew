import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { setMuted, useMuted } from '../sound/sounds';

/** Toggles all sound effects on / off. */
export function MuteButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const muted = useMuted();
  return (
    <Pressable
      onPress={() => setMuted(!muted)}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={muted ? 'הפעלת צלילים' : 'השתקת צלילים'}
    >
      <Text style={styles.icon}>{muted ? '🔇' : '🔊'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 18 },
});
