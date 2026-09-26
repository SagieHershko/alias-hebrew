import { Pressable, StyleSheet, View } from 'react-native';

import { colors, PAWN_COLORS } from '../theme';

/** A team's pawn colour; tap it to open the palette (shown by the parent under the row). */
export function PawnDot({
  color,
  open,
  onPress,
  disabled,
  teamLabel,
}: {
  color: string;
  open: boolean;
  onPress: () => void;
  disabled?: boolean;
  teamLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [styles.pawn, { backgroundColor: color }, open && styles.pawnOpen, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`שינוי צבע הפיון של ${teamLabel}`}
    />
  );
}

/** Pawn colours to pick from; colours other teams already use are dimmed and can't be picked. */
export function PawnPalette({
  color,
  taken,
  onPick,
}: {
  color: string;
  taken: readonly string[];
  onPick: (color: string) => void;
}) {
  return (
    <View style={styles.palette}>
      {PAWN_COLORS.map((c) => {
        const used = c !== color && taken.includes(c);
        return (
          <Pressable
            key={c}
            disabled={used}
            onPress={() => onPick(c)}
            style={({ pressed }) => [
              styles.swatch,
              { backgroundColor: c },
              c === color && styles.swatchCurrent,
              used && styles.swatchUsed,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: used, selected: c === color }}
            accessibilityLabel={used ? 'צבע תפוס' : 'בחירת צבע'}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pawn: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#0003' },
  pawnOpen: { borderWidth: 3, borderColor: colors.ink },
  pressed: { opacity: 0.6 },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: colors.offWhite,
    borderRadius: 16,
  },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#0002' },
  swatchCurrent: { borderWidth: 4, borderColor: colors.ink },
  swatchUsed: { opacity: 0.15 },
});
