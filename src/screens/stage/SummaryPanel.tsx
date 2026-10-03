import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BigButton } from '../../components/BigButton';
import { currentTeam, turnAwards } from '../../game/gameReducer';
import { useGame } from '../../game/GameContext';
import { useCompactLandscape } from '../../hooks/useCompactLandscape';
import { colors, radius, readableOn, RLM } from '../../theme';
import { panel } from './panel';
import { useStageInsets } from './stageInsets';

/** End-of-turn review in a sheet over the table: tap a word to fix it before the points are applied. */
export function SummaryPanel() {
  const { state, dispatch, online } = useGame();
  // Online, the explainer (or the host) fixes mistakes and confirms; everyone else watches.
  const canEdit = !online || online.canControlTurn || online.isHost;
  const insets = useSafeAreaInsets();
  const stage = useStageInsets({ top: false, bottom: true });
  const landscape = useCompactLandscape();
  useEffect(() => {
    // The sheet covers the whole height beside the list; the table needs no room kept free.
    if (landscape) stage.setBottom(0);
  }, [stage, landscape]);
  const confirm = canEdit ? (
    <BigButton label="אישור והמשך" variant="light" large={!landscape} onPress={() => dispatch({ type: 'CONFIRM_TURN' })} />
  ) : (
    <Text style={styles.help}>ממתינים ש{online?.explainer?.name} יאשר/תאשר את התור…</Text>
  );
  const team = currentTeam(state)!;
  const awards = turnAwards(state.turnWords, state.settings, team.id);
  const points = awards[team.id] ?? 0;
  // Other teams that stole steps (last word, or any word of a steal turn).
  const thieves = state.teams.filter((t) => t.id !== team.id && (awards[t.id] ?? 0) > 0);
  const newScore = Math.min(state.settings.targetScore, Math.max(0, team.score + points));

  return (
    <View style={panel.layer} pointerEvents="box-none">
      <View
        style={[
          panel.bottom,
          styles.sheet,
          landscape && styles.landscapeSheet,
          { paddingBottom: insets.bottom + (landscape ? 10 : 14) },
          landscape && { paddingTop: insets.top + 10 },
        ]}
        onLayout={landscape ? undefined : stage.onBottomLayout}
      >
        {/* Phone on its side: the totals and the button beside the word list, not above it. */}
        <View style={landscape ? styles.landscapeInfo : styles.portraitInfo}>
        <Text style={styles.title}>{state.stealTurn ? 'נגמר תור הגניבה!' : 'נגמר הזמן!'}</Text>
        <Text style={styles.subtitle}>
          {RLM}
          {team.name}: {points >= 0 ? `+${points}` : points} צעדים
        </Text>
        <Text style={styles.help}>עוברים למשבצת {newScore}</Text>
        {thieves.map((t) => (
          <Text key={t.id} style={styles.steal}>
            {RLM}
            {t.name} גנבו {awards[t.id] === 1 ? 'צעד אחד' : `${awards[t.id]} צעדים`}
          </Text>
        ))}
        {canEdit && <Text style={styles.help}>טעיתם בסימון? הקישו על מילה כדי לשנות</Text>}
        {landscape && confirm}
        </View>

        <FlatList
          style={[styles.list, landscape && styles.landscapeList]}
          contentContainerStyle={styles.listContent}
          data={state.turnWords}
          keyExtractor={(item, i) => `${item.word}-${i}`}
          ListEmptyComponent={<Text style={styles.empty}>לא הוצגו מילים בתור הזה</Text>}
          renderItem={({ item, index }) => {
            // Words any team could guess (last word, steal turn): tap to change who guessed it.
            if (item.guessedBy !== undefined) {
              const guesser = state.teams.find((t) => t.id === item.guessedBy);
              return (
                <Pressable
                  onPress={() => dispatch({ type: 'CYCLE_WORD', index })}
                  disabled={!canEdit}
                  style={({ pressed }) => [styles.row, item.isLastWord && styles.lastRow, pressed && { opacity: 0.7 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.word}, ${guesser ? `ניחשו ${guesser.name}` : 'אף אחד לא ניחש'}. הקשה משנה`}
                >
                  <View style={styles.wordCol}>
                    {item.isLastWord && <Text style={styles.lastLabel}>מילה אחרונה</Text>}
                    <Text style={styles.word}>{item.word}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: guesser?.color ?? colors.muted }]}>
                    <Text style={[styles.badgeText, guesser && { color: readableOn(guesser.color) }]}>
                      {guesser ? `✓ ${guesser.name}` : '✗ אף אחד'}
                    </Text>
                  </View>
                </Pressable>
              );
            }
            const ok = item.result === 'correct';
            return (
              <Pressable
                onPress={() => dispatch({ type: 'TOGGLE_WORD', index })}
                disabled={!canEdit}
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

        {!landscape && confirm}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { maxHeight: '72%', gap: 6 },
  landscapeSheet: { top: 0, maxHeight: '100%', flexDirection: 'row', gap: 16, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  portraitInfo: { gap: 6 },
  landscapeInfo: { flex: 1, gap: 6, justifyContent: 'center' },
  landscapeList: { flex: 1.3, alignSelf: 'stretch' },
  title: { flexShrink: 0, fontSize: 32, fontWeight: '900', color: colors.white, textAlign: 'center' },
  subtitle: { flexShrink: 0, fontSize: 20, fontWeight: '800', color: colors.white, textAlign: 'center' },
  help: { flexShrink: 0, fontSize: 14, color: colors.offWhite, textAlign: 'center', marginBottom: 4 },
  list: { flexShrink: 1, backgroundColor: colors.white, borderRadius: radius.lg },
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
  wordCol: { flex: 1 },
  lastRow: { backgroundColor: '#FFF8E1', borderRadius: radius.sm },
  lastLabel: { fontSize: 12, fontWeight: '800', color: colors.muted },
  steal: {
    flexShrink: 0,
    alignSelf: 'center',
    backgroundColor: colors.gold,
    color: colors.ink,
    fontWeight: '800',
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  badge: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { color: colors.white, fontWeight: '800' },
  empty: { textAlign: 'center', color: colors.muted, padding: 24, fontSize: 16 },
});
