import * as Haptics from 'expo-haptics';
import { useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BigButton } from '../components/BigButton';
import { currentTeam, turnPoints } from '../game/gameReducer';
import { useGame } from '../game/GameContext';
import type { WordResult } from '../game/types';
import { useCountdown } from '../hooks/useCountdown';
import { colors, radius, shadow } from '../theme';

const SWIPE_THRESHOLD = 90;

function buzz(result: WordResult | 'timeUp') {
  const p =
    result === 'correct'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : result === 'skipped'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  p.catch(() => {}); // haptics are unavailable on web / some devices
}

/** Active turn: countdown on top, the word in the middle, נכון / דלג at the bottom. */
export function GameScreen() {
  const { state, dispatch } = useGame();
  const insets = useSafeAreaInsets();
  const team = currentTeam(state)!;
  const timer = useCountdown(state.settings.turnSeconds, () => buzz('timeUp'));
  const lastWord = timer.expired;

  const correctCount = state.turnWords.filter((w) => w.result === 'correct').length;
  const skippedCount = state.turnWords.length - correctCount;
  const points = turnPoints(state.turnWords, state.settings);

  // Keep the latest handler reachable from the (stable) PanResponder.
  const answerRef = useRef<(r: WordResult) => void>(() => {});
  const answer = (result: WordResult) => {
    if (timer.paused || state.currentWord === null) return;
    buzz(result);
    dispatch({ type: 'ANSWER', result, isLastWord: lastWord });
  };
  answerRef.current = answer;

  const dragY = useRef(new Animated.Value(0)).current;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 12 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: Animated.event([null, { dy: dragY }], { useNativeDriver: false }),
        onPanResponderRelease: (_, g) => {
          if (g.dy < -SWIPE_THRESHOLD) answerRef.current('correct');
          else if (g.dy > SWIPE_THRESHOLD) answerRef.current('skipped');
          Animated.spring(dragY, { toValue: 0, useNativeDriver: false }).start();
        },
        onPanResponderTerminate: () =>
          Animated.spring(dragY, { toValue: 0, useNativeDriver: false }).start(),
      }),
    [dragY],
  );

  const urgent = timer.secondsLeft <= 10;
  const cardTint = dragY.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    outputRange: ['#E4F7EA', '#FFFFFF', '#FDE4E4'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      {/* ── Timer ───────────────────────────── */}
      <View style={styles.timerRow}>
        <Pressable
          onPress={timer.paused ? timer.resume : timer.pause}
          disabled={lastWord}
          style={[styles.pauseBtn, lastWord && styles.hidden]}
          accessibilityRole="button"
          accessibilityLabel={timer.paused ? 'המשך' : 'השהיה'}
        >
          <Text style={styles.pauseText}>{timer.paused ? '▶' : '❚❚'}</Text>
        </Pressable>
        <View style={styles.timerCenter}>
          <Text
            style={[styles.timerText, urgent && styles.timerUrgent, lastWord && styles.timeUpText]}
            accessibilityLiveRegion="polite"
            allowFontScaling={false}
          >
            {lastWord ? 'הזמן נגמר!' : timer.secondsLeft}
          </Text>
        </View>
        <View style={styles.pointsBubble}>
          <Text style={styles.pointsText}>{points > 0 ? `+${points}` : points}</Text>
        </View>
      </View>
      <View style={styles.timerTrack}>
        <View
          style={[
            styles.timerFill,
            { width: `${timer.progress * 100}%`, backgroundColor: urgent ? colors.gold : colors.white },
          ]}
        />
      </View>

      <Text style={styles.teamLine}>
        מסבירים: <Text style={styles.teamName}>{team.name}</Text>
      </Text>

      {/* ── Word card ───────────────────────── */}
      <View style={styles.cardArea}>
        {lastWord && <Text style={styles.lastWordBanner}>מילה אחרונה – כולם יכולים לנחש!</Text>}
        <Animated.View
          {...pan.panHandlers}
          style={[
            styles.card,
            { backgroundColor: cardTint, transform: [{ translateY: dragY }] },
          ]}
        >
          {timer.paused ? (
            <Text style={styles.pausedText}>המשחק מושהה</Text>
          ) : (
            <Text
              style={styles.word}
              adjustsFontSizeToFit
              numberOfLines={2}
              minimumFontScale={0.5}
              accessibilityRole="header"
            >
              {state.currentWord}
            </Text>
          )}
          <Text style={styles.hint}>החליקו למעלה = נכון · למטה = דילוג</Text>
        </Animated.View>
        <View style={styles.counters}>
          <Text style={styles.counter}>✓ {correctCount}</Text>
          <Text style={styles.counter}>↷ {skippedCount}</Text>
        </View>
      </View>

      {/* ── Actions ─────────────────────────── */}
      <View style={styles.actions}>
        <BigButton
          label="נכון"
          variant="correct"
          large
          onPress={() => answer('correct')}
          disabled={timer.paused}
          style={styles.flex}
        />
        <BigButton
          label="דלג/טעות"
          variant="skip"
          large
          onPress={() => answer('skipped')}
          disabled={timer.paused}
          style={styles.flex}
        />
      </View>
      {lastWord && (
        <BigButton
          label="אף אחד לא ניחש – סיום התור"
          variant="ghost"
          onPress={() => dispatch({ type: 'END_TURN' })}
          style={styles.endBtn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, paddingHorizontal: 16, gap: 10 },
  timerRow: { flexDirection: 'row', alignItems: 'center' },
  timerCenter: { flex: 1, alignItems: 'center' },
  timerText: {
    fontSize: 64,
    fontWeight: '900',
    color: colors.white,
    fontVariant: ['tabular-nums'],
  },
  timerUrgent: { color: colors.gold },
  timeUpText: { fontSize: 36 },
  pauseBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hidden: { opacity: 0 },
  pauseText: { color: colors.white, fontSize: 18, fontWeight: '900' },
  pointsBubble: {
    minWidth: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pointsText: { color: colors.red, fontWeight: '900', fontSize: 18 },
  timerTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.redDeep,
    overflow: 'hidden',
  },
  timerFill: { height: '100%', borderRadius: 6 },
  teamLine: { color: colors.white, fontSize: 18, textAlign: 'center', marginTop: 4 },
  teamName: { fontWeight: '900' },
  cardArea: { flex: 1, justifyContent: 'center', gap: 12 },
  lastWordBanner: {
    alignSelf: 'center',
    backgroundColor: colors.gold,
    color: colors.ink,
    fontWeight: '900',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  card: {
    minHeight: 240,
    borderRadius: radius.lg,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: colors.redDark,
    ...shadow,
  },
  word: {
    fontSize: 60,
    fontWeight: '900',
    color: colors.ink,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  pausedText: { fontSize: 30, fontWeight: '800', color: colors.muted },
  hint: { position: 'absolute', bottom: 10, fontSize: 12, color: colors.muted },
  counters: { flexDirection: 'row', justifyContent: 'center', gap: 32 },
  counter: { color: colors.white, fontSize: 22, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 12 },
  endBtn: { marginTop: 2 },
});
