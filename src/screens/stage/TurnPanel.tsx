import * as Haptics from 'expo-haptics';
import { useEffect, useState, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BigButton } from '../../components/BigButton';
import { WordCard } from '../../components/WordCard';
import { currentTeam, turnPoints } from '../../game/gameReducer';
import { useGame } from '../../game/GameContext';
import type { WordResult } from '../../game/types';
import { useCountdown } from '../../hooks/useCountdown';
import { colors, radius, readableOn, shadow } from '../../theme';
import { TIMER_FLIP_MS, type SandState } from '../../three/Board3D';
import { GLASS, panel } from './panel';
import { useStageInsets } from './stageInsets';

function buzz(kind: WordResult | 'timeUp') {
  const p =
    kind === 'correct'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : kind === 'skipped'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  p.catch(() => {}); // haptics are unavailable on web / some devices
}

/** Room for the card between the table and the buttons. */
const CARD_AREA = 262;

interface LeavingCard {
  key: number;
  words: string[];
  result: WordResult;
}

interface Props {
  sand: RefObject<SandState>;
  /** Tells the 3D table to fly the drawn card up from the deck. */
  onCardShown: (cardsDrawn: number) => void;
}

/**
 * Active turn over the 3D table. The sand timer flips, then the clock starts and
 * the first card rises from the deck. נכון / דלג send the card away and draw the next.
 */
export function TurnPanel({ sand, onCardShown }: Props) {
  const { state, dispatch } = useGame();
  const insets = useSafeAreaInsets();
  const stage = useStageInsets({ top: true, bottom: true });
  const team = currentTeam(state)!;
  const total = state.settings.turnSeconds;
  const timer = useCountdown(total, () => buzz('timeUp'), TIMER_FLIP_MS);
  const lastWord = timer.expired;
  const [leaving, setLeaving] = useState<LeavingCard[]>([]);

  // Flip the sand timer when the turn starts; leave the sand at the bottom when it ends.
  useEffect(() => {
    const s = sand.current;
    if (!s) return;
    s.turnId += 1;
    s.progress = 0;
    return () => {
      s.progress = 1;
    };
  }, [sand]);
  useEffect(() => {
    if (sand.current && timer.started) sand.current.progress = 1 - timer.remainingMs / (total * 1000);
  }, [sand, timer.remainingMs, timer.started, total]);

  // Every new card (once the clock runs) flies up from the 3D deck.
  useEffect(() => {
    if (timer.started) onCardShown(state.cardsDrawn);
  }, [timer.started, state.cardsDrawn, onCardShown]);

  const correctCount = state.turnWords.filter((w) => w.result === 'correct').length;
  const skippedCount = state.turnWords.length - correctCount;
  const points = turnPoints(state.turnWords, state.settings, team.id);
  // The explaining team first, then everyone else.
  const guessers = [team, ...state.teams.filter((t) => t.id !== team.id)];

  const answer = (result: WordResult) => {
    if (timer.paused || !state.currentCard) return;
    buzz(result);
    setLeaving((cards) => [...cards, { key: state.cardsDrawn, words: state.currentCard!, result }]);
    dispatch({ type: 'ANSWER', result });
  };
  const awardLastWord = (teamId: string | null) => {
    buzz(teamId ? 'correct' : 'skipped');
    dispatch({ type: 'LAST_WORD', teamId });
  };

  return (
    <View style={panel.layer} pointerEvents="box-none">
      {/* ── HUD ───────────────────────────── */}
      <View style={[panel.top, { paddingTop: insets.top + 8 }]} onLayout={stage.onTopLayout}>
        <View style={panel.row}>
          <Pressable
            onPress={timer.paused ? timer.resume : timer.pause}
            disabled={lastWord || !timer.started}
            style={[panel.iconBtn, (lastWord || !timer.started) && styles.hidden]}
            accessibilityRole="button"
            accessibilityLabel={timer.paused ? 'המשך' : 'השהיה'}
          >
            <Text style={panel.iconText}>{timer.paused ? '▶' : '❚❚'}</Text>
          </Pressable>
          <View style={panel.flex}>
            <Text style={panel.subtitle}>מסבירים</Text>
            <Text style={[panel.title, { fontSize: 20 }]} numberOfLines={1}>
              {team.name}
            </Text>
          </View>
          <Text style={styles.counter}>✓ {correctCount}</Text>
          <Text style={styles.counter}>↷ {skippedCount}</Text>
          <View style={[styles.clock, timer.secondsLeft <= 10 && styles.clockUrgent]}>
            <Text style={styles.clockText} accessibilityLiveRegion="polite">
              {lastWord ? '0' : timer.secondsLeft}
            </Text>
          </View>
          <View style={styles.points}>
            <Text style={styles.pointsText}>{points > 0 ? `+${points}` : points}</Text>
          </View>
        </View>
      </View>

      {/* ── Card + actions, stacked at the bottom so the table stays visible above ── */}
      <View style={styles.bottomStack} onLayout={stage.onBottomLayout} pointerEvents="box-none">
        <View style={styles.cardArea} pointerEvents="none">
          {!timer.started && (
            <View style={styles.flipNote}>
              <Text style={styles.flipText}>הופכים את שעון החול…</Text>
            </View>
          )}
          {leaving.map((c) => (
            <View key={`out-${c.key}`} style={styles.cardSlot}>
              <WordCard
                words={c.words}
                highlight={state.wordIndex}
                leaving={c.result}
                onGone={() => setLeaving((cards) => cards.filter((x) => x.key !== c.key))}
              />
            </View>
          ))}
          {timer.started && state.currentCard && (
            <View key={`in-${state.cardsDrawn}`} style={styles.cardSlot}>
              <WordCard words={state.currentCard} highlight={state.wordIndex} covered={timer.paused && !lastWord} />
            </View>
          )}
        </View>

        <View style={[styles.actions, { paddingBottom: insets.bottom + 14 }]}>
          {lastWord ? (
            <>
              <Text style={styles.lastTitle}>החול נגמר! מילה אחרונה – מי ניחש?</Text>
              <View style={styles.guesserRow}>
                {guessers.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => awardLastWord(t.id)}
                    style={({ pressed }) => [
                      styles.guesserBtn,
                      { backgroundColor: t.color, opacity: pressed ? 0.75 : 1 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${t.name} ניחשו, נקודה ל${t.name}`}
                  >
                    <Text style={[styles.guesserText, { color: readableOn(t.color) }]} numberOfLines={1}>
                      {t.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <BigButton label="אף אחד לא ניחש" variant="ghost" onPress={() => awardLastWord(null)} />
            </>
          ) : (
            <View style={panel.row}>
              <BigButton
                label="נכון"
                variant="correct"
                large
                onPress={() => answer('correct')}
                disabled={timer.paused}
                style={panel.flex}
              />
              <BigButton
                label="דלג/טעות"
                variant="skip"
                large
                onPress={() => answer('skipped')}
                disabled={timer.paused}
                style={panel.flex}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
  counter: { color: colors.white, fontSize: 17, fontWeight: '800' },
  clock: {
    minWidth: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  clockUrgent: { borderColor: colors.gold },
  clockText: { color: colors.white, fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
  points: {
    minWidth: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pointsText: { color: colors.red, fontWeight: '900', fontSize: 18 },
  bottomStack: { position: 'absolute', bottom: 0, start: 0, end: 0 },
  cardArea: { height: CARD_AREA },
  cardSlot: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    end: 0,
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  actions: {
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 10,
    backgroundColor: GLASS,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  flipNote: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  flipText: { color: colors.white, fontSize: 18, fontWeight: '800' },
  lastTitle: { color: colors.gold, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  guesserRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  guesserBtn: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    ...shadow,
  },
  guesserText: { fontSize: 19, fontWeight: '900' },
});
