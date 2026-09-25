import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BigButton } from '../components/BigButton';
import { currentTeam, turnPoints } from '../game/gameReducer';
import { useGame } from '../game/GameContext';
import { colors, radius } from '../theme';

/** End-of-turn review: the table can fix mistakes by tapping a word before points are applied. */
export function TurnSummaryScreen() {
  const { state, dispatch } = useGame();
  const insets = useSafeAreaInsets();
  const team = currentTeam(state)!;
  const points = turnPoints(state.turnWords, state.settings);
  const newScore = Math.min(state.settings.targetScore, Math.max(0, team.score + points));

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <Text style={styles.title}>נגמר הזמן!</Text>
      <Text style={styles.subtitle}>
        {team.name}: {points >= 0 ? `+${points}` : points} צעדים
      </Text>
      <Text style={styles.help}>עוברים למשבצת {newScore}</Text>
      <Text style={styles.help}>טעיתם בסימון? הקישו על מילה כדי לשנות</Text>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={state.turnWords}
        keyExtractor={(item, i) => `${item.word}-${i}`}
        ListEmptyComponent={<Text style={styles.empty}>לא הוצגו מילים בתור הזה</Text>}
        renderItem={({ item, index }) => {
          const ok = item.result === 'correct';
          return (
            <Pressable
              onPress={() => dispatch({ type: 'TOGGLE_WORD', index })}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={`${item.word}, ${ok ? 'נכון' : 'דילוג'}. הקשה משנה`}
            >
              <Text style={styles.word}>{item.word}</Text>
              <View style={[styles.badge, { backgroundColor: ok ? colors.correct : colors.skip }]}>
                <Text style={styles.badgeText}>{ok ? '✓ נכון' : '✗ דילוג'}</Text>
              </View>
            </Pressable>
          );
        }}
      />

      <BigButton label="אישור והמשך" variant="light" large onPress={() => dispatch({ type: 'CONFIRM_TURN' })} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, gap: 8 },
  title: { fontSize: 40, fontWeight: '900', color: colors.white, textAlign: 'center' },
  subtitle: { fontSize: 20, fontWeight: '800', color: colors.white, textAlign: 'center' },
  help: { fontSize: 14, color: colors.offWhite, textAlign: 'center', marginBottom: 4 },
  list: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg },
  listContent: { padding: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBC5C8',
  },
  word: { fontSize: 20, fontWeight: '700', color: colors.ink, flex: 1 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { color: colors.white, fontWeight: '800' },
  empty: { textAlign: 'center', color: colors.muted, padding: 24, fontSize: 16 },
});
