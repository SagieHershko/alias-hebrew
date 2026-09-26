import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../theme';

export const TARGET_OPTIONS = [20, 30, 40, 50];
export const SECONDS_OPTIONS = [30, 45, 60];

/** A row of round option buttons (e.g. the finish square or the turn length). */
export function Chips({
  options,
  value,
  onChange,
  disabled,
}: {
  options: number[];
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const selected = o === value;
        return (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            disabled={disabled}
            style={[styles.chip, selected && styles.chipSelected, disabled && !selected && styles.chipDisabled]}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    minWidth: 56,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.red,
    alignItems: 'center',
  },
  chipSelected: { backgroundColor: colors.red },
  chipDisabled: { opacity: 0.35 },
  chipText: { color: colors.red, fontWeight: '800', fontSize: 16 },
  chipTextSelected: { color: colors.white },
});
