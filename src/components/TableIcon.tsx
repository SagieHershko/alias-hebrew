import { StyleSheet, View } from 'react-native';

const OUTLINE = '#111111';
const TOP = '#F7A21B';
const LEG = '#B4B4BE';
const LEG_BACK = '#7C7C86';

/**
 * A little table (orange top, grey legs, dark outline), drawn with Views so it looks the same
 * on every platform. Used for the view button: living room ↔ back to the board.
 * Geometry is in a 24-unit box, scaled to `size`.
 */
export function TableIcon({ size = 24 }: { size?: number }) {
  const s = size / 24;
  const line = Math.max(1, 1.25 * s);
  const part = (left: number, top: number, width: number, height: number, color: string, radius = 1) => ({
    left: left * s,
    top: top * s,
    width: width * s,
    height: height * s,
    borderWidth: line,
    borderRadius: radius * s,
    backgroundColor: color,
  });
  return (
    <View style={{ width: size, height: size * 0.9 }}>
      {/* Back legs: shorter and darker, between the front ones. */}
      <View style={[styles.part, part(6, 9, 3.5, 8, LEG_BACK)]} />
      <View style={[styles.part, part(14.5, 9, 3.5, 8, LEG_BACK)]} />
      {/* Front legs */}
      <View style={[styles.part, part(1.5, 9, 4.5, 12.5, LEG)]} />
      <View style={[styles.part, part(18, 9, 4.5, 12.5, LEG)]} />
      {/* Table top seen in perspective, then its front edge. */}
      <View style={[styles.part, part(2.5, 1, 19, 6.5, TOP, 1.5), styles.tilt]} />
      <View style={[styles.part, part(0, 5.5, 24, 4.5, TOP, 1.5)]} />
    </View>
  );
}

const styles = StyleSheet.create({
  part: { position: 'absolute', borderColor: OUTLINE },
  tilt: { transform: [{ perspective: 60 }, { rotateX: '40deg' }] },
});
