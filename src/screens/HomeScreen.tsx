import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AliasLogo } from '../components/AliasLogo';
import { BigButton } from '../components/BigButton';
import { useCompactLandscape } from '../hooks/useCompactLandscape';
import { colors, radius } from '../theme';

/** First screen: play on one shared device, or online with everyone on their own phone. */
export function HomeScreen({ onLocal, onOnline }: { onLocal: () => void; onOnline: () => void }) {
  const insets = useSafeAreaInsets();
  // A phone on its side: logo beside the buttons, so everything fits the short screen.
  const landscape = useCompactLandscape();
  return (
    <View
      style={[
        styles.screen,
        landscape && styles.landscape,
        { paddingTop: insets.top + (landscape ? 12 : 24), paddingBottom: insets.bottom + (landscape ? 12 : 24) },
      ]}
    >
      <AliasLogo size={landscape ? 150 : 190} subtitle={'משחק מילים\nלכל המשפחה!'} />
      <View style={[styles.options, landscape && styles.optionsLandscape]}>
        <View style={styles.option}>
          <BigButton label="📱 מכשיר אחד" variant="light" large onPress={onLocal} />
          <Text style={styles.note}>כולם סביב טלפון אחד שעובר מיד ליד</Text>
        </View>
        <View style={styles.option}>
          <BigButton label="🌐 אונליין עם חברים" variant="light" large onPress={onOnline} />
          <Text style={styles.note}>כל שחקן מהטלפון שלו · התחברות עם Google · הזמנה בקישור</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 36, paddingHorizontal: 20 },
  landscape: { flexDirection: 'row', gap: 40 },
  // Full width on phones, a centred column of at most 460 px on wide screens.
  options: { alignSelf: 'center', maxWidth: 460, width: '100%', alignItems: 'stretch', gap: 22 },
  optionsLandscape: { flex: 1, width: 'auto', gap: 14 },
  option: { gap: 8 },
  note: {
    color: colors.white,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'center',
    overflow: 'hidden',
  },
});
