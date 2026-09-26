import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import type { WordResult } from '../game/types';
import { colors, radius, shadow } from '../theme';

interface Props {
  /** Header line, e.g. which team explains and the word number. */
  title: string;
  words: string[];
  /** 0-based index of the word the team explains (its board square number − 1). */
  highlight: number;
  /** Set once the card has been answered: it flies away. */
  leaving?: WordResult;
  onGone?: () => void;
  covered?: boolean;
}

const ENTER_DELAY = 280; // let the 3D card fly up from the deck first
const ENTER_MS = 420;
const EXIT_MS = 260;

/**
 * An Alias card with 8 numbered words. The word matching the team's square is
 * big and highlighted. It rises up from the deck when drawn and flies off when answered.
 */
export function WordCard({ title, words, highlight, leaving, onGone, covered }: Props) {
  const enter = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: ENTER_MS,
      delay: ENTER_DELAY,
      easing: Easing.out(Easing.back(1.3)),
      useNativeDriver: true,
    }).start();
  }, [enter]);

  useEffect(() => {
    if (!leaving) return;
    Animated.timing(exit, {
      toValue: 1,
      duration: EXIT_MS,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => onGone?.());
  }, [leaving, exit, onGone]);

  const correct = leaving === 'correct';
  const transform = [
    { perspective: 900 },
    { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-320, 0] }) },
    { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
    { rotateX: enter.interpolate({ inputRange: [0, 1], outputRange: ['70deg', '0deg'] }) },
    { translateY: exit.interpolate({ inputRange: [0, 1], outputRange: [0, correct ? -520 : 40] }) },
    { translateX: exit.interpolate({ inputRange: [0, 1], outputRange: [0, correct ? 0 : -460] }) },
    { rotate: exit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', correct ? '-6deg' : '-22deg'] }) },
  ];
  const opacity = Animated.multiply(
    enter.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] }),
    exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] }),
  );

  return (
    <Animated.View style={[styles.card, { opacity, transform }]} pointerEvents="none">
      <View style={styles.header}>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>אליאס</Text>
        </View>
        <Text style={styles.headerText} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {covered ? (
        <View style={styles.covered}>
          <Text style={styles.coveredText}>המשחק מושהה</Text>
        </View>
      ) : (
        <>
          {/* The team's word: big, on the red band. */}
          <View style={styles.mine}>
            <View style={styles.numMine}>
              <Text style={styles.numTextMine}>{highlight + 1}</Text>
            </View>
            <Text style={styles.wordMine} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {words[highlight]}
            </Text>
          </View>
          {/* The rest of the card, small, in two columns (numbers in card order). */}
          <View style={styles.grid}>
            {words.map((w, i) =>
              i === highlight ? null : (
                <View key={i} style={styles.cell}>
                  <View style={styles.num}>
                    <Text style={styles.numText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.word} numberOfLines={1}>
                    {w}
                  </Text>
                </View>
              ),
            )}
          </View>
        </>
      )}
      <View style={styles.bars}>
        {['#FFC107', '#1E63D6', '#1FA84F', '#8E24AA', '#FF7A00'].map((c) => (
          <View key={c} style={[styles.bar, { backgroundColor: c }]} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 5,
    borderColor: colors.red,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.red,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bubble: {
    borderWidth: 2.5,
    borderColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 1,
  },
  bubbleText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  headerText: { color: colors.white, fontWeight: '800', fontSize: 15, flex: 1 },
  mine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.red,
    borderRadius: 14,
    margin: 8,
    marginBottom: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  numMine: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numTextMine: { color: colors.red, fontWeight: '900', fontSize: 20 },
  wordMine: { flex: 1, fontSize: 36, fontWeight: '900', color: colors.white },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, opacity: 0.55 },
  cell: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3, paddingHorizontal: 4 },
  num: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { color: colors.white, fontWeight: '900', fontSize: 11 },
  word: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  covered: { height: 160, alignItems: 'center', justifyContent: 'center' },
  coveredText: { fontSize: 26, fontWeight: '800', color: colors.muted },
  bars: { flexDirection: 'row', gap: 4, alignSelf: 'flex-end', paddingHorizontal: 10, paddingBottom: 8, paddingTop: 2 },
  bar: { width: 9, height: 12, borderRadius: 3 },
});
