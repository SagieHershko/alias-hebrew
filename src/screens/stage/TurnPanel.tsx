import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BigButton } from '../../components/BigButton';
import { GuessCard } from '../../components/GuessCard';
import { MuteButton } from '../../components/MuteButton';
import { WordCard } from '../../components/WordCard';
import { currentTeam, turnPoints } from '../../game/gameReducer';
import { useGame } from '../../game/GameContext';
import type { WordResult } from '../../game/types';
import { useTurnClock } from '../../hooks/useTurnClock';
import { serverNow } from '../../online/serverTime';
import { colors, radius, readableOn, shadow } from '../../theme';
import { playSound } from '../../sound/sounds';
import type { SandState } from '../../three/Board3D';
import { panel } from './panel';
import { useStageInsets } from './stageInsets';

/** Vibration on the device that pressed (sounds play on every device, from the game state). */
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
const CARD_AREA = 362;

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
  const { state, dispatch, online } = useGame();
  // Online, only the explainer's phone shows the words and marks answers.
  const canAct = !online || online.canControlTurn;
  const insets = useSafeAreaInsets();
  const stage = useStageInsets({ top: false, bottom: true });
  const team = currentTeam(state)!;
  const total = state.settings.turnSeconds;
  const timer = useTurnClock(state.clock, () => {
    playSound('timeup');
    buzz('timeUp');
  });
  const pause = () => dispatch({ type: 'PAUSE', now: serverNow() });
  const resume = () => dispatch({ type: 'RESUME', now: serverNow() });
  const lastWord = timer.expired;
  const [leaving, setLeaving] = useState<LeavingCard[]>([]);

  // No top bar during a turn: the table may use the whole height (below the status bar).
  useEffect(() => {
    stage.setTop(insets.top);
  }, [stage, insets.top]);

  // Flip the sand timer when the turn starts; leave the sand at the bottom when it ends.
  useEffect(() => {
    const s = sand.current;
    if (!s) return;
    s.turnId += 1;
    s.progress = 0;
    playSound('flip');
    return () => {
      s.progress = 1;
    };
  }, [sand]);
  useEffect(() => {
    if (sand.current && timer.started) sand.current.progress = 1 - timer.remainingMs / (total * 1000);
  }, [sand, timer.remainingMs, timer.started, total]);

  // The clock ticks through the last 10 seconds, until the sand runs out.
  const secondsLeft = timer.secondsLeft;
  const ticking = timer.started && !timer.paused && !lastWord && secondsLeft <= 10 && secondsLeft > 0;
  useEffect(() => {
    if (ticking) playSound(secondsLeft % 2 === 0 ? 'tick' : 'tock', secondsLeft <= 3 ? 1 : 0.7);
  }, [ticking, secondsLeft]);

  // Every new card (once the clock runs) flies up from the 3D deck.
  useEffect(() => {
    if (timer.started) onCardShown(state.cardsDrawn);
  }, [timer.started, state.cardsDrawn, onCardShown]);

  // A chime / whoosh on every phone whenever a word is answered.
  const answered = useRef(state.turnWords.length);
  useEffect(() => {
    const n = state.turnWords.length;
    if (n > answered.current) {
      const w = state.turnWords[n - 1];
      const guessed = w.guessedBy !== undefined ? w.guessedBy !== null : w.result === 'correct';
      playSound(guessed ? 'correct' : 'skip');
    }
    answered.current = n;
  }, [state.turnWords]);

  const correctCount = state.turnWords.filter((w) => w.result === 'correct').length;
  const skippedCount = state.turnWords.length - correctCount;
  const points = turnPoints(state.turnWords, state.settings, team.id);
  // The explaining team first, then everyone else.
  const guessers = [team, ...state.teams.filter((t) => t.id !== team.id)];
  // What a guesser's phone says (online).
  const myTeamActive = online?.myTeamId === team.id;
  const guessMessage = state.stealTurn
    ? {
        headline: 'כולם מנחשים!',
        detail: `תור גניבה – ${online?.explainer?.name} מסביר/ה, מי שמנחש ראשון מקבל את הצעד`,
      }
    : myTeamActive
      ? { headline: 'נחשו!', detail: `${online?.explainer?.name} מסביר/ה לקבוצה שלכם` }
      : { headline: `${team.name} מנחשים`, detail: `${online?.explainer?.name} מסביר/ה · חכו לתור שלכם` };
  const title = `${team.name} מסבירים · מילה ${state.wordIndex + 1}${state.stealTurn ? ' · תור גניבה' : ''}`;

  // Ignore an accidental double tap (one card per tap).
  const lastTap = useRef(0);
  const answer = (result: WordResult, teamId?: string) => {
    if (timer.paused || !state.currentCard) return;
    if (Date.now() - lastTap.current < 250) return;
    lastTap.current = Date.now();
    buzz(result);
    setLeaving((cards) => [...cards, { key: state.cardsDrawn, words: state.currentCard!, result }]);
    dispatch({ type: 'ANSWER', result, teamId });
  };
  /** One button per team, in its pawn colour (explaining team first). */
  const teamButtons = (onPick: (teamId: string) => void, disabled = false) => (
    <View style={styles.guesserRow}>
      {guessers.map((t) => (
        <Pressable
          key={t.id}
          onPress={() => onPick(t.id)}
          disabled={disabled}
          style={({ pressed }) => [
            styles.guesserBtn,
            { backgroundColor: t.color, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${t.name} ניחשו, צעד ל${t.name}`}
        >
          <Text style={[styles.guesserText, { color: readableOn(t.color) }]} numberOfLines={1}>
            {t.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
  const awardLastWord = (teamId: string | null) => {
    buzz(teamId ? 'correct' : 'skipped');
    playSound(teamId ? 'correct' : 'skip');
    dispatch({ type: 'LAST_WORD', teamId });
  };

  return (
    <View style={panel.layer} pointerEvents="box-none">
      {/* ── Card + actions, stacked at the bottom so the table stays visible above ── */}
      <View style={styles.bottomStack} onLayout={stage.onBottomLayout} pointerEvents="box-none">
        <View style={styles.cardRow} pointerEvents="box-none">
          {/* Turn status floats on the table, to the right of the card (first child = right in RTL). */}
          <View style={styles.stats} pointerEvents="box-none">
            <View style={[styles.clock, timer.secondsLeft <= 10 && styles.clockUrgent]}>
              <Text style={styles.clockText} accessibilityLiveRegion="polite">
                {lastWord ? '0' : timer.secondsLeft}
              </Text>
              <Text style={styles.clockUnit}>שניות</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statText, { color: '#7BE39B' }]}>✓ {correctCount}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statText, { color: '#FF9A9A' }]}>↷ {skippedCount}</Text>
            </View>
            <View style={styles.points}>
              <Text style={styles.pointsText}>{points > 0 ? `+${points}` : points}</Text>
            </View>
            <Pressable
              onPress={timer.paused ? resume : pause}
              disabled={lastWord || !timer.started || !canAct}
              style={[styles.stat, (lastWord || !timer.started || !canAct) && styles.hidden]}
              accessibilityRole="button"
              accessibilityLabel={timer.paused ? 'המשך' : 'השהיה'}
            >
              <Text style={styles.statText}>{timer.paused ? '▶' : '❚❚'}</Text>
            </Pressable>
            <MuteButton style={styles.stat} />
          </View>
          <View style={styles.cardArea} pointerEvents="none">
            {!timer.started && (
              <View style={styles.flipNote}>
                <Text style={styles.flipText}>הופכים את שעון החול…</Text>
              </View>
            )}
            {leaving.map((c) => (
              <View key={`out-${c.key}`} style={styles.cardSlot}>
                <WordCard
                  title={title}
                  words={c.words}
                  highlight={state.wordIndex}
                  leaving={c.result}
                  onGone={() => setLeaving((cards) => cards.filter((x) => x.key !== c.key))}
                />
              </View>
            ))}
            {timer.started && !canAct && (
              <View style={styles.cardSlot}>
                <GuessCard explainer={online?.explainer ?? null} {...guessMessage} />
              </View>
            )}
            {timer.started && canAct && state.currentCard && (
              <View key={`in-${state.cardsDrawn}`} style={styles.cardSlot}>
                <WordCard
                  title={title}
                  words={state.currentCard}
                  highlight={state.wordIndex}
                  covered={timer.paused && !lastWord}
                />
              </View>
            )}
          </View>
        </View>

        <View style={[styles.actions, { paddingBottom: insets.bottom + 14 }]}>
          {!canAct ? (
            <Text style={styles.lastTitle}>
              {lastWord
                ? `מילה אחרונה – ${online?.explainer?.name} יסמן/תסמן מי ניחש`
                : timer.paused
                  ? 'המשחק מושהה'
                  : `${online?.explainer?.name} מסמן/ת את התשובות`}
            </Text>
          ) : lastWord ? (
            <>
              <Text style={styles.lastTitle}>החול נגמר! מילה אחרונה – מי ניחש?</Text>
              {teamButtons(awardLastWord)}
              <BigButton label="אף אחד לא ניחש" variant="skip" onPress={() => awardLastWord(null)} />
            </>
          ) : state.stealTurn ? (
            <>
              {/* Steal turn: every team guesses; tap the team that got the word first. */}
              <Text style={styles.lastTitle}>תור גניבה! מי ניחש ראשון?</Text>
              {teamButtons((teamId) => answer('correct', teamId), timer.paused)}
              <BigButton label="דלג/טעות" variant="skip" onPress={() => answer('skipped')} disabled={timer.paused} />
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
  cardRow: {
    height: CARD_AREA,
    flexDirection: 'row',
    alignItems: 'flex-end',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
    paddingHorizontal: 8,
    gap: 8,
  },
  stats: { width: 62, gap: 8, alignItems: 'center', paddingBottom: 10 },
  // Floating chips: dark glass so they read on top of the room.
  clock: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: colors.white,
    backgroundColor: 'rgba(20,20,24,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockUrgent: { borderColor: colors.gold },
  clockText: { color: colors.white, fontSize: 24, fontWeight: '900', fontVariant: ['tabular-nums'], lineHeight: 26 },
  clockUnit: { color: '#D8D8DC', fontSize: 10, fontWeight: '700' },
  stat: {
    minWidth: 56,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(20,20,24,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: { color: colors.white, fontSize: 17, fontWeight: '900' },
  points: {
    minWidth: 56,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    ...shadow,
  },
  pointsText: { color: colors.red, fontWeight: '900', fontSize: 18 },
  bottomStack: { position: 'absolute', bottom: 0, start: 0, end: 0 },
  cardArea: { flex: 1, height: CARD_AREA },
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
    paddingTop: 4,
    gap: 10,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
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
  lastTitle: {
    alignSelf: 'center',
    color: colors.gold,
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
    backgroundColor: 'rgba(20,20,24,0.75)',
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  guesserRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  guesserBtn: {
    flexGrow: 1,
    flexBasis: '30%',
    minHeight: 50,
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
