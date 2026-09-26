import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AliasLogo } from '../components/AliasLogo';
import { BigButton } from '../components/BigButton';
import { TeamProgress } from '../components/TeamProgress';
import { currentTeam } from '../game/gameReducer';
import { useGame } from '../game/GameContext';
import { Board3D } from '../three/Board3D';
import { colors, radius } from '../theme';

/** Digital board shown between turns: pawns on the board, standings and whose turn is next. */
export function ScoreboardScreen() {
  const { state, dispatch } = useGame();
  const insets = useSafeAreaInsets();
  const next = currentTeam(state)!;
  const target = state.settings.targetScore;
  const standings = [...state.teams].sort((a, b) => b.score - a.score);
  const [fullScreen, setFullScreen] = useState(false);
  const beginTurn = () => dispatch({ type: 'BEGIN_TURN' });

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

        {/* Only one live 3D board at a time: the small one unmounts while full screen is open. */}
        {!fullScreen && (
          <Pressable
            onPress={() => setFullScreen(true)}
            accessibilityRole="button"
            accessibilityLabel="פתיחת הלוח במסך מלא"
          >
            <Board3D
              teams={state.teams}
              target={target}
              activeTeamId={next.id}
              fromScores={state.previousScores}
              style={styles.board}
            />
            <View style={styles.expandBadge} pointerEvents="none">
              <Text style={styles.expandText}>⤢ מסך מלא</Text>
            </View>
          </Pressable>
        )}

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
        <BigButton label="התחלת תור ⏱" variant="light" large onPress={beginTurn} />
        <BigButton label="יציאה למסך הפתיחה" variant="ghost" onPress={quit} />
      </View>

      {fullScreen && (
        <View style={styles.full}>
          <Board3D
            teams={state.teams}
            target={target}
            activeTeamId={next.id}
            fromScores={state.previousScores}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.fullTop, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
            <View style={styles.fullHeader}>
              <View style={styles.flex}>
                <Text style={styles.fullRound}>סיבוב {state.round}</Text>
                <Text style={styles.fullTarget}>משבצת הסיום: {target}</Text>
              </View>
              <Pressable
                onPress={() => setFullScreen(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="סגירת מסך מלא"
              >
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>
            <View style={styles.chips}>
              {standings.map((t) => (
                <View key={t.id} style={[styles.chip, t.id === next.id && styles.chipActive]}>
                  <View style={[styles.chipDot, { backgroundColor: t.color }]} />
                  <Text style={styles.chipName} numberOfLines={1}>
                    {t.name}
                  </Text>
                  <Text style={styles.chipScore}>{t.score}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={[styles.fullBottom, { paddingBottom: insets.bottom + 14 }]}>
            <View style={styles.nextRow}>
              <View style={[styles.chipDot, styles.nextDot, { backgroundColor: next.color }]} />
              <Text style={styles.nextLabel}>
                התור של: <Text style={styles.nextName}>{next.name}</Text>
              </Text>
            </View>
            <BigButton label="התחלת תור ⏱" variant="primary" large onPress={beginTurn} />
          </View>
        </View>
      )}
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
  flex: { flex: 1 },
  board: { height: 270, borderRadius: 20, marginHorizontal: -4 },
  expandBadge: {
    position: 'absolute',
    top: 10,
    end: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  expandText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  full: { position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, zIndex: 10, backgroundColor: '#2A2C31' },
  fullTop: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
    backgroundColor: 'rgba(20,20,24,0.55)',
  },
  fullHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fullRound: { color: colors.white, fontSize: 26, fontWeight: '900' },
  fullTarget: { color: '#D8D8DC', fontSize: 14, fontWeight: '700' },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: colors.white, fontSize: 20, fontWeight: '900' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 2,
    borderColor: 'transparent',
    maxWidth: '48%',
  },
  chipActive: { borderColor: colors.gold },
  chipDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.white },
  chipName: { color: colors.white, fontWeight: '800', fontSize: 15, flexShrink: 1 },
  chipScore: { color: colors.gold, fontWeight: '900', fontSize: 16 },
  fullBottom: {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    backgroundColor: 'rgba(20,20,24,0.55)',
  },
  nextRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextDot: { width: 18, height: 18, borderRadius: 9 },
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
