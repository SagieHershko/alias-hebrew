import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AliasLogo } from '../components/AliasLogo';
import { BigButton } from '../components/BigButton';
import { DigitalBoard } from '../components/DigitalBoard';
import { TeamProgress } from '../components/TeamProgress';
import { currentTeam } from '../game/gameReducer';
import { useGame } from '../game/GameContext';
import { colors } from '../theme';

/** Digital board shown between turns: pawns on the board, standings and whose turn is next. */
export function ScoreboardScreen() {
  const { state, dispatch } = useGame();
  const insets = useSafeAreaInsets();
  const next = currentTeam(state)!;
  const target = state.settings.targetScore;
  const standings = [...state.teams].sort((a, b) => b.score - a.score);

  const quit = () => {
    const leave = () => dispatch({ type: 'BACK_TO_SETUP' });
    if (Platform.OS === 'web') {
      // Alert with buttons is not supported on web.
      if (globalThis.confirm?.('לצאת מהמשחק? הניקוד יימחק.')) leave();
      return;
    }
    Alert.alert('יציאה מהמשחק', 'הניקוד יימחק. להמשיך?', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'יציאה', style: 'destructive', onPress: leave },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <AliasLogo size={74} />
          <View style={styles.headerText}>
            <Text style={styles.round}>סיבוב {state.round}</Text>
            <Text style={styles.target}>משבצת הסיום: {target}</Text>
          </View>
        </View>

        <DigitalBoard teams={state.teams} target={target} activeTeamId={next.id} />

        <Text style={styles.section}>טבלת המיקומים</Text>
        {standings.map((t, i) => (
          <TeamProgress key={t.id} team={t} target={target} rank={i + 1} active={t.id === next.id} />
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.nextLabel}>
          התור של: <Text style={styles.nextName}>{next.name}</Text>
        </Text>
        <Text style={styles.nextHint}>בחרו מסביר, והעבירו לו את הטלפון</Text>
        <BigButton label="התחלת תור ⏱" variant="light" large onPress={() => dispatch({ type: 'BEGIN_TURN' })} />
        <BigButton label="יציאה למסך הפתיחה" variant="ghost" onPress={quit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1 },
  round: { color: colors.white, fontSize: 28, fontWeight: '900' },
  target: { color: colors.offWhite, fontSize: 16, fontWeight: '700' },
  section: { color: colors.white, fontSize: 20, fontWeight: '900', marginTop: 4 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
    backgroundColor: colors.redDark,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  nextLabel: { color: colors.white, fontSize: 20, textAlign: 'center' },
  nextName: { fontWeight: '900' },
  nextHint: { color: colors.offWhite, fontSize: 14, textAlign: 'center' },
});
