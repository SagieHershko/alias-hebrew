import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../../components/Avatar';
import { BigButton } from '../../components/BigButton';
import { MuteButton } from '../../components/MuteButton';
import { currentTeam, wordIndexFor } from '../../game/gameReducer';
import { useGame } from '../../game/GameContext';
import { colors } from '../../theme';
import { serverNow } from '../../online/serverTime';
import { panel } from './panel';
import { useStageInsets } from './stageInsets';

/** Between turns: standings on top, whose turn it is and the start button at the bottom. */
export function ScoreboardPanel({ onResetView }: { onResetView: () => void }) {
  const { state, dispatch, online } = useGame();
  const insets = useSafeAreaInsets();
  const stage = useStageInsets({ top: true, bottom: true });
  const next = currentTeam(state)!;
  const standings = [...state.teams].sort((a, b) => b.score - a.score);
  const wordNo = wordIndexFor(next.score) + 1;

  const quit = () => {
    // Online: the host ends the game for everyone (back to the lobby); others just leave.
    const [message, leave] = !online
      ? ['לצאת מהמשחק? הניקוד יימחק.', () => dispatch({ type: 'BACK_TO_SETUP' })]
      : online.isHost
        ? ['לסיים את המשחק לכולם ולחזור ללובי?', () => dispatch({ type: 'BACK_TO_SETUP' })]
        : ['לצאת מהמשחק? אפשר לחזור עם הקישור.', online.leave];
    if (Platform.OS === 'web') {
      // Alert with buttons is not supported on web.
      if (globalThis.confirm?.(message)) leave();
      return;
    }
    Alert.alert('יציאה מהמשחק', message, [
      { text: 'ביטול', style: 'cancel' },
      { text: 'יציאה', style: 'destructive', onPress: leave },
    ]);
  };
  const explainer = online?.explainer;
  const canStartTurn = !online || online.canControlTurn;

  return (
    <View style={panel.layer} pointerEvents="box-none">
      <View style={[panel.top, panel.clear, { paddingTop: insets.top + 8 }]} onLayout={stage.onTopLayout}>
        <View style={panel.row}>
          <View style={panel.flex}>
            <View style={panel.pill}>
              <Text style={panel.title}>סיבוב {state.round}</Text>
              <Text style={panel.subtitle}>משבצת הסיום: {state.settings.targetScore}</Text>
            </View>
          </View>
          <Pressable
            onPress={onResetView}
            style={panel.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="איפוס זווית הלוח"
          >
            <Text style={panel.iconText}>⟲</Text>
          </Pressable>
          <MuteButton style={panel.iconBtn} />
          <Pressable
            onPress={quit}
            style={panel.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="יציאה למסך הפתיחה"
          >
            <Text style={panel.iconText}>✕</Text>
          </Pressable>
        </View>
        <View style={panel.chips}>
          {standings.map((t) => (
            <View key={t.id} style={[panel.chip, t.id === next.id && panel.chipActive]}>
              <View style={[panel.dot, { backgroundColor: t.color }]} />
              <Text style={panel.chipName} numberOfLines={1}>
                {t.name}
              </Text>
              <Text style={panel.chipScore}>{t.score}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[panel.bottom, panel.clear, { paddingBottom: insets.bottom + 14 }]} onLayout={stage.onBottomLayout}>
        <View style={[panel.pill, { alignSelf: 'center', alignItems: 'center', gap: 2 }]}>
          <View style={[panel.row, { justifyContent: 'center' }]}>
            <View style={[panel.dot, { backgroundColor: next.color, width: 18, height: 18, borderRadius: 9 }]} />
            <Text style={panel.text}>
              התור של: <Text style={panel.bold}>{next.name}</Text>
            </Text>
          </View>
          {explainer && (
            <View style={[panel.row, { justifyContent: 'center', gap: 6 }]}>
              <Avatar name={explainer.name} photo={explainer.photo} size={24} />
              <Text style={panel.text}>
                {online?.amExplainer ? 'את/ה מסביר/ה בתור הזה!' : `מסביר/ה: ${explainer.name}`}
              </Text>
            </View>
          )}
          <Text style={panel.hint}>
            הפיון על משבצת {wordNo}, לכן מסבירים את מילה {wordNo} בכל קלף · גררו לסיבוב הלוח, צבטו לזום
          </Text>
          {next.stealNext && (
            <Text style={styles.steal}>⚡ תור גניבה! כל הקבוצות מנחשות בו זמנית – מי שמנחש ראשון מקבל את הצעד</Text>
          )}
        </View>
        {canStartTurn ? (
          <BigButton
            label="התחלת תור ⏳"
            variant="primary"
            large
            onPress={() => dispatch({ type: 'BEGIN_TURN', now: serverNow() })}
          />
        ) : (
          <Text style={[panel.pill, styles.waiting]}>ממתינים ש{explainer?.name} יתחיל/תתחיל את התור…</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  waiting: { alignSelf: 'center', color: colors.white, fontWeight: '800', fontSize: 17, textAlign: 'center' },
  steal: {
    marginTop: 4,
    color: colors.ink,
    backgroundColor: colors.gold,
    fontWeight: '900',
    fontSize: 14,
    textAlign: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
});
