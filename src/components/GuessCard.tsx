import { StyleSheet, Text, View } from 'react-native';

import type { Player } from '../game/types';
import { colors, shadow } from '../theme';
import { Avatar } from './Avatar';

/**
 * What guessers see during an online turn instead of the words: the back of the card,
 * who is explaining, and whether they should be guessing right now.
 */
export function GuessCard({
  explainer,
  headline,
  detail,
}: {
  explainer: Player | null;
  headline: string;
  detail: string;
}) {
  return (
    <View style={styles.card} pointerEvents="none">
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>אליאס</Text>
      </View>
      {explainer && <Avatar name={explainer.name} photo={explainer.photo} size={64} />}
      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.detail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 270,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 22,
    paddingHorizontal: 14,
    backgroundColor: colors.red,
    borderRadius: 20,
    borderWidth: 5,
    borderColor: colors.white,
    ...shadow,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 14,
  },
  bubble: { borderWidth: 3, borderColor: colors.white, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 2 },
  bubbleText: { color: colors.white, fontWeight: '900', fontSize: 22 },
  headline: { color: colors.white, fontWeight: '900', fontSize: 30, textAlign: 'center' },
  detail: { color: colors.offWhite, fontWeight: '700', fontSize: 15, textAlign: 'center' },
});
