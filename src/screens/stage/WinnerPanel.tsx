import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BigButton } from '../../components/BigButton';
import { useGame } from '../../game/GameContext';
import { colors } from '../../theme';
import { panel } from './panel';
import { useStageInsets } from './stageInsets';

/** The winners' pawn dances on the finish disc while this sheet celebrates them. */
export function WinnerPanel() {
  const { state, dispatch, online } = useGame();
  const canRestart = !online || online.isHost;
  const insets = useSafeAreaInsets();
  const stage = useStageInsets({ top: false, bottom: true });
  const winner = state.teams.find((t) => t.id === state.winnerId);

  return (
    <View style={panel.layer} pointerEvents="box-none">
      <View style={[panel.bottom, styles.sheet, { paddingBottom: insets.bottom + 14 }]} onLayout={stage.onBottomLayout}>
        <Text style={styles.trophy}>🏆</Text>
        <Text style={styles.title}>יש לנו מנצחים!</Text>
        <View style={[styles.winnerPill, { borderColor: winner?.color ?? colors.gold }]}>
          <Text style={styles.winnerName}>{winner?.name}</Text>
        </View>
        <Text style={panel.hint}>הגיעו ראשונים ל✌ אחרי {state.round} סיבובים</Text>
        {canRestart ? (
          <>
            <BigButton label="משחק חוזר" variant="primary" large onPress={() => dispatch({ type: 'REMATCH' })} />
            <BigButton
              label={online ? 'חזרה ללובי' : 'קבוצות חדשות'}
              variant="ghost"
              onPress={() => dispatch({ type: 'BACK_TO_SETUP' })}
            />
          </>
        ) : (
          <>
            <Text style={panel.hint}>המארח/ת יכול/ה להתחיל משחק חוזר</Text>
            <BigButton label="יציאה" variant="ghost" onPress={online!.leave} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { alignItems: 'stretch' },
  trophy: { fontSize: 56, textAlign: 'center' },
  title: { fontSize: 32, fontWeight: '900', color: colors.white, textAlign: 'center' },
  winnerPill: {
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: 999,
    borderWidth: 5,
    paddingHorizontal: 28,
    paddingVertical: 8,
  },
  winnerName: { fontSize: 28, fontWeight: '900', color: colors.red },
});
