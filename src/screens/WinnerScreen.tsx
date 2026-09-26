import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BigButton } from '../components/BigButton';
import { useGame } from '../game/GameContext';
import { Board3D } from '../three/Board3D';
import { colors } from '../theme';

export function WinnerScreen() {
  const { state, dispatch } = useGame();
  const insets = useSafeAreaInsets();
  const winner = state.teams.find((t) => t.id === state.winnerId);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
      <Text style={styles.trophy}>🏆</Text>
      <Text style={styles.title}>יש לנו מנצחים!</Text>
      <View style={[styles.winnerPill, { borderColor: winner?.color ?? colors.gold }]}>
        <Text style={styles.winnerName}>{winner?.name}</Text>
      </View>
      <Text style={styles.subtitle}>
        הגיעו ראשונים למשבצת הסיום אחרי {state.round} סיבובים
      </Text>
      <View style={styles.board}>
        <Board3D
          teams={state.teams}
          target={state.settings.targetScore}
          fromScores={state.previousScores}
          winnerId={winner?.id}
          style={styles.board3d}
        />
      </View>
      <View style={styles.actions}>
        <BigButton label="משחק חוזר" variant="light" large onPress={() => dispatch({ type: 'REMATCH' })} />
        <BigButton label="קבוצות חדשות" variant="ghost" onPress={() => dispatch({ type: 'BACK_TO_SETUP' })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, alignItems: 'center', gap: 12 },
  trophy: { fontSize: 88 },
  title: { fontSize: 40, fontWeight: '900', color: colors.white },
  winnerPill: {
    backgroundColor: colors.white,
    borderRadius: 999,
    borderWidth: 5,
    paddingHorizontal: 28,
    paddingVertical: 10,
  },
  winnerName: { fontSize: 32, fontWeight: '900', color: colors.red },
  subtitle: { fontSize: 16, color: colors.offWhite, textAlign: 'center' },
  board: { alignSelf: 'stretch', flex: 1, justifyContent: 'center' },
  board3d: { flex: 1, maxHeight: 340, borderRadius: 20 },
  actions: { alignSelf: 'stretch', gap: 10 },
});
