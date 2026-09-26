import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AliasLogo } from '../components/AliasLogo';
import { generateStealSquares } from '../game/board';
import { Board3D } from '../three/Board3D';
import { BigButton } from '../components/BigButton';
import { Chips, SECONDS_OPTIONS, TARGET_OPTIONS } from '../components/Chips';
import { MAX_TEAMS, MIN_TEAMS } from '../game/gameReducer';
import { useGame } from '../game/GameContext';
import type { Team } from '../game/types';
import { PawnDot, PawnPalette } from '../components/PawnColorPicker';
import { colors, radius, teamColors } from '../theme';

const SUGGESTED_NAMES = ['האריות', 'הנשרים', 'הכרישים', 'הנמרים', 'הדובים', 'הזאבים'];

const RULES = [
  'מתחלקים ל־2 עד 6 קבוצות (4 עד 12 שחקנים).',
  'בכל תור שחקן אחד מסביר לחברי הקבוצה כמה שיותר מילים עד שהזמן נגמר.',
  'מותר להשתמש במילים נרדפות, הפכים, רמזים ואסוציאציות.',
  'אסור להגיד את המילה עצמה או כל חלק ממנה!',
  'כל מילה שנוחשה נכון = צעד אחד קדימה על הלוח.',
  'כשהזמן נגמר – כולם יכולים לנחש את המילה האחרונה, והנקודה הולכת לקבוצה שניחשה.',
  'משבצת גניבה (עיגול אדום): מי שנוחת עליה או עובר אותה – בתור הבא שלו כל הקבוצות מנחשות בו זמנית, ומי שמנחש ראשון מקבל את הצעד.',
  'הקבוצה הראשונה שמגיעה למשבצת הסיום – מנצחת!',
];

export function SetupScreen({ onBack }: { onBack?: () => void }) {
  const { state, dispatch } = useGame();
  const insets = useSafeAreaInsets();
  const [names, setNames] = useState<string[]>(() =>
    state.teams.length >= MIN_TEAMS ? state.teams.map((t) => t.name) : SUGGESTED_NAMES.slice(0, 2),
  );
  const [picked, setPicked] = useState<string[]>(() => state.teams.map((t) => t.color));
  const pawnColors = useMemo(() => teamColors(names.length, picked), [names.length, picked]);
  const [colorOpen, setColorOpen] = useState<number | null>(null);
  const [target, setTarget] = useState(state.settings.targetScore);
  const [seconds, setSeconds] = useState(state.settings.turnSeconds);
  const [skipPenalty, setSkipPenalty] = useState(state.settings.skipPenalty);
  const [showRules, setShowRules] = useState(false);

  const trimmed = names.map((n) => n.trim());
  const hasEmpty = trimmed.some((n) => n.length === 0);
  const hasDuplicates = new Set(trimmed).size !== trimmed.length;
  const canStart = names.length >= MIN_TEAMS && !hasEmpty && !hasDuplicates;

  const addTeam = () => {
    if (names.length >= MAX_TEAMS) return;
    const unused = SUGGESTED_NAMES.find((s) => !names.includes(s)) ?? `קבוצה ${names.length + 1}`;
    setNames([...names, unused]);
    setPicked(pawnColors);
  };
  const removeTeam = (index: number) => {
    if (names.length <= MIN_TEAMS) return;
    setNames(names.filter((_, i) => i !== index));
    setPicked(pawnColors.filter((_, i) => i !== index));
    setColorOpen(null);
  };
  const rename = (index: number, value: string) => setNames(names.map((n, i) => (i === index ? value : n)));

  // Live preview: one pawn per team waiting on the start square.
  const previewTeams: Team[] = useMemo(
    () => names.map((name, i) => ({ id: `preview-${i}`, name, color: pawnColors[i], score: 0 })),
    [names, pawnColors],
  );

  // A sample of steal squares for the preview; the real game draws its own at random.
  const previewSteal = useMemo(() => generateStealSquares(target), [target]);

  const start = () =>
    dispatch({
      type: 'START_GAME',
      teamNames: trimmed,
      teamColors: pawnColors,
      settings: { targetScore: target, turnSeconds: seconds, skipPenalty },
    });

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {onBack && (
          <Pressable
            onPress={onBack}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="חזרה למסך הבית"
          >
            <Text style={styles.backText}>→ חזרה</Text>
          </Pressable>
        )}
        <View style={styles.hero}>
          <Board3D teams={previewTeams} target={target} stealSquares={previewSteal} style={styles.heroBoard} />
          <View style={styles.logo} pointerEvents="none">
            <AliasLogo size={112} subtitle={'משחק מילים\nלכל המשפחה!'} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            הקבוצות ({names.length}/{MAX_TEAMS})
          </Text>
          {names.map((name, i) => (
            <View key={i} style={styles.team}>
              <View style={styles.teamRow}>
                <PawnDot
                  color={pawnColors[i]}
                  open={colorOpen === i}
                  onPress={() => setColorOpen(colorOpen === i ? null : i)}
                  teamLabel={name || `קבוצה ${i + 1}`}
                />
                <TextInput
                  value={name}
                  onChangeText={(v) => rename(i, v)}
                  placeholder={`שם קבוצה ${i + 1}`}
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  maxLength={18}
                  returnKeyType="done"
                  accessibilityLabel={`שם קבוצה ${i + 1}`}
                />
                <Pressable
                  onPress={() => removeTeam(i)}
                  disabled={names.length <= MIN_TEAMS}
                  style={({ pressed }) => [
                    styles.removeBtn,
                    { opacity: names.length <= MIN_TEAMS ? 0.25 : pressed ? 0.6 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`הסרת ${name || `קבוצה ${i + 1}`}`}
                >
                  <Text style={styles.removeText}>✕</Text>
                </Pressable>
              </View>
              {colorOpen === i && (
                <PawnPalette
                  color={pawnColors[i]}
                  taken={pawnColors}
                  onPick={(c) => {
                    setPicked(pawnColors.map((old, j) => (j === i ? c : old)));
                    setColorOpen(null);
                  }}
                />
              )}
            </View>
          ))}
          {hasDuplicates && <Text style={styles.error}>לכל קבוצה צריך שם אחר</Text>}
          {names.length < MAX_TEAMS && (
            <BigButton label="+ הוספת קבוצה" variant="light" onPress={addTeam} style={styles.addBtn} />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>הגדרות</Text>
          <Text style={styles.label}>משבצת הסיום (נקודות לניצחון)</Text>
          <Chips options={TARGET_OPTIONS} value={target} onChange={setTarget} />
          <Text style={styles.label}>זמן לכל תור (שניות)</Text>
          <Chips options={SECONDS_OPTIONS} value={seconds} onChange={setSeconds} />
          <View style={styles.switchRow}>
            <Text style={[styles.label, styles.flex]}>דילוג מוריד צעד אחורה</Text>
            <Switch
              value={skipPenalty}
              onValueChange={setSkipPenalty}
              trackColor={{ true: colors.red, false: '#ccc' }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        <Pressable onPress={() => setShowRules((s) => !s)} style={styles.rulesToggle}>
          <Text style={styles.rulesToggleText}>{showRules ? '▲' : '▼'} איך משחקים?</Text>
        </Pressable>
        {showRules && (
          <View style={styles.card}>
            {RULES.map((r, i) => (
              <Text key={i} style={styles.rule}>
                • {r}
              </Text>
            ))}
          </View>
        )}

        <BigButton label="יאללה, מתחילים!" variant="light" large disabled={!canStart} onPress={start} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  back: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  backText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  hero: { marginTop: 56 },
  heroBoard: { height: 230, borderRadius: radius.lg },
  logo: { position: 'absolute', top: -56, alignSelf: 'center' },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    gap: 10,
  },
  cardTitle: { fontSize: 22, fontWeight: '900', color: colors.red },
  team: { gap: 8 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    backgroundColor: colors.offWhite,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: '#F1C6C9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    writingDirection: 'rtl',
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: colors.red, fontSize: 16, fontWeight: '900' },
  addBtn: { marginTop: 4, borderColor: colors.red, borderStyle: 'dashed' },
  error: { color: colors.skip, fontWeight: '700' },
  label: { fontSize: 16, fontWeight: '700', color: colors.ink },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rulesToggle: { alignSelf: 'center', padding: 6 },
  rulesToggleText: { color: colors.white, fontSize: 18, fontWeight: '800' },
  rule: { fontSize: 16, lineHeight: 24, color: colors.ink },
});
