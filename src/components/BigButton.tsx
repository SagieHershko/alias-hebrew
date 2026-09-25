import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow } from '../theme';

type Variant = 'primary' | 'light' | 'correct' | 'skip' | 'ghost';

const VARIANTS: Record<Variant, { bg: string; pressed: string; text: string; border?: string }> = {
  primary: { bg: colors.red, pressed: colors.redDark, text: colors.white },
  light: { bg: colors.white, pressed: colors.offWhite, text: colors.red },
  correct: { bg: colors.correct, pressed: colors.correctDark, text: colors.white },
  skip: { bg: colors.skip, pressed: colors.skipDark, text: colors.white },
  ghost: { bg: 'transparent', pressed: colors.overlay, text: colors.white, border: colors.white },
};

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  large?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function BigButton({ label, onPress, variant = 'primary', disabled, large, style }: Props) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        large && styles.large,
        variant !== 'ghost' && shadow,
        {
          backgroundColor: pressed ? v.pressed : v.bg,
          borderColor: v.border ?? 'transparent',
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      <Text style={[styles.label, large && styles.largeLabel, { color: v.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: { minHeight: 84, borderRadius: radius.lg },
  label: { fontSize: 20, fontWeight: '800' },
  largeLabel: { fontSize: 28 },
});
