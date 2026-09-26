import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AliasLogo } from '../components/AliasLogo';
import { BigButton } from '../components/BigButton';
import { colors, radius } from '../theme';

/** First screen: play on one shared device, or online with everyone on their own phone. */
export function HomeScreen({ onLocal, onOnline }: { onLocal: () => void; onOnline: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <AliasLogo size={190} subtitle={'משחק מילים\nלכל המשפחה!'} />
      <View style={styles.options}>
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
  options: { alignSelf: 'stretch', maxWidth: 460, width: '100%', alignItems: 'stretch', gap: 22 },
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
