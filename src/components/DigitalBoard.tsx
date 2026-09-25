import { StyleSheet, Text, View } from 'react-native';

import type { Team } from '../game/types';
import { colors, radius, shadow } from '../theme';

interface Props {
  teams: Team[];
  target: number;
  activeTeamId?: string;
}

/**
 * Digital take on the red board: numbered white squares from start (0) to the
 * finish square, with each team's pawn sitting on its current position.
 * Squares flow right-to-left, just like the Hebrew board.
 */
export function DigitalBoard({ teams, target, activeTeamId }: Props) {
  const squares = Array.from({ length: target + 1 }, (_, i) => i);
  return (
    <View style={styles.board}>
      <View style={styles.grid}>
        {squares.map((n) => {
          const pawns = teams.filter((t) => t.score === n);
          const isStart = n === 0;
          const isFinish = n === target;
          return (
            <View
              key={n}
              style={[styles.square, isFinish && styles.finish, isStart && styles.start]}
              accessibilityLabel={
                isFinish ? 'משבצת הסיום' : isStart ? 'משבצת ההתחלה' : `משבצת ${n}`
              }
            >
              <Text style={[styles.squareText, isFinish && styles.finishText]} allowFontScaling={false}>
                {isStart ? 'התחלה' : isFinish ? '🏁' : n}
              </Text>
              {pawns.length > 0 && (
                <View style={styles.pawnRow}>
                  {pawns.map((t) => (
                    <View
                      key={t.id}
                      style={[
                        styles.pawn,
                        { backgroundColor: t.color },
                        t.id === activeTeamId && styles.pawnActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const SQUARE = 30;

const styles = StyleSheet.create({
  board: {
    backgroundColor: colors.red,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 3,
    borderColor: colors.redDark,
    ...shadow,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  square: {
    width: SQUARE,
    height: SQUARE,
    borderRadius: SQUARE / 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  start: { width: SQUARE * 1.9 },
  finish: { width: SQUARE * 1.4, backgroundColor: colors.gold },
  squareText: { color: colors.red, fontWeight: '800', fontSize: 12 },
  finishText: { fontSize: 14 },
  pawnRow: {
    position: 'absolute',
    bottom: -5,
    flexDirection: 'row',
    gap: 1,
  },
  pawn: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  pawnActive: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
});
