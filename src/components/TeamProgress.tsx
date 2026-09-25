import { StyleSheet, Text, View } from 'react-native';

import type { Team } from '../game/types';
import { colors, radius } from '../theme';

interface Props {
  team: Team;
  target: number;
  rank: number;
  active?: boolean;
}

/** One team's row: name, score, a progress track toward the finish and the steps left. */
export function TeamProgress({ team, target, rank, active }: Props) {
  const pct = Math.min(1, team.score / target);
  const left = Math.max(0, target - team.score);
  return (
    <View style={[styles.card, active && styles.cardActive]}>
      <View style={styles.header}>
        <View style={[styles.rank, { backgroundColor: team.color }]}>
          <Text style={styles.rankText}>{rank}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {team.name}
        </Text>
        {active && <Text style={styles.turnBadge}>התור שלכם</Text>}
        <Text style={styles.score}>{team.score}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: team.color }]} />
      </View>
      <Text style={styles.left}>
        {left === 0 ? 'הגיעו לסיום!' : left === 1 ? 'עוד צעד אחד לסיום' : `עוד ${left} צעדים לסיום`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    gap: 8,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cardActive: { borderColor: colors.gold },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  rankText: { color: colors.white, fontWeight: '900', fontSize: 14 },
  name: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.ink },
  turnBadge: {
    backgroundColor: colors.red,
    color: colors.white,
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  score: { fontSize: 28, fontWeight: '900', color: colors.red, minWidth: 36, textAlign: 'center' },
  track: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F1D5D7',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 7 },
  left: { fontSize: 14, color: colors.muted, fontWeight: '600' },
});
