import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '../theme';

/**
 * On / off switch. Drawn by hand because React Native Web's Switch misplaces its thumb
 * (outside the track, in the wrong colour) on right-to-left pages.
 */
export function Toggle({
  value,
  onValueChange,
  disabled,
  label,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.track,
        value && styles.trackOn,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
    >
      <View style={styles.thumb} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // RTL like the page: off = thumb on the right, on = thumb slides to the left.
  track: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 3,
    backgroundColor: '#CCCCCC',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  trackOn: { backgroundColor: colors.red, justifyContent: 'flex-end' },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
});
