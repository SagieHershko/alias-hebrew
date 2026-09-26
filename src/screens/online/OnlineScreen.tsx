import type { User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AliasLogo } from '../../components/AliasLogo';
import { BigButton } from '../../components/BigButton';
import { signInWithGoogle, signOut, useAuthUser } from '../../online/auth';
import { onlineConfigured } from '../../online/firebase';
import { createRoom, joinRoom, normaliseCode, syncServerClock, useRoom } from '../../online/rooms';
import { colors, radius } from '../../theme';
import { LobbyScreen } from './LobbyScreen';
import { OnlineGame } from './OnlineGame';

/** Keeps ?room=CODE in the address bar, so a refresh (or the link itself) returns to the room. */
function setUrlRoom(code: string | null) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (code) url.searchParams.set('room', code);
  else url.searchParams.delete('room');
  window.history.replaceState(null, '', url.toString());
}

/** Online play: sign in with Google → create or join a room → lobby → game. */
export function OnlineScreen({ initialCode, onExit }: { initialCode: string | null; onExit: () => void }) {
  if (Platform.OS !== 'web') {
    return <Notice text="משחק אונליין זמין כרגע בגרסת הדפדפן של אליאס." onBack={onExit} />;
  }
  if (!onlineConfigured) {
    return <Notice text="משחק אונליין עוד לא הוגדר בשרת (חסרות הגדרות Firebase)." onBack={onExit} />;
  }
  return <OnlineFlow initialCode={initialCode} onExit={onExit} />;
}

function OnlineFlow({ initialCode, onExit }: { initialCode: string | null; onExit: () => void }) {
  const { user, loading } = useAuthUser();
  const [code, setCode] = useState<string | null>(initialCode ? normaliseCode(initialCode) : null);
  const [error, setError] = useState<string | null>(null);

  // Join (or re-join) the room as soon as we know who is signed in.
  useEffect(() => {
    if (!user || !code) return;
    setError(null);
    setUrlRoom(code);
    joinRoom(code, user)
      .then(() => syncServerClock(code, user.uid))
      .catch((e: Error) =>
        setError(
          e.message === 'not-found'
            ? 'לא מצאנו חדר עם הקוד הזה'
            : e.message === 'full'
              ? 'החדר מלא (עד 20 שחקנים)'
              : 'ההצטרפות לחדר נכשלה, נסו שוב',
        ),
      );
  }, [user, code]);

  const leave = () => {
    setCode(null);
    setUrlRoom(null);
  };
  const exit = () => {
    setUrlRoom(null);
    onExit();
  };

  if (loading) return <Loading />;
  if (!user) return <SignIn onBack={exit} joining={!!code} />;
  if (!code || error) {
    return (
      <CreateOrJoin
        user={user}
        error={error}
        onRoom={(c) => {
          setError(null);
          setCode(c);
        }}
        onBack={exit}
      />
    );
  }
  return <RoomView code={code} user={user} onLeave={leave} />;
}

function RoomView({ code, user, onLeave }: { code: string; user: User; onLeave: () => void }) {
  const { room, game } = useRoom(code);
  if (room === undefined) return <Loading />;
  if (room === null) return <Notice text="החדר לא נמצא." onBack={onLeave} />;
  if (room.status === 'lobby' || !game) return <LobbyScreen room={room} user={user} onLeave={onLeave} />;
  return <OnlineGame room={room} game={game} user={user} onLeave={onLeave} />;
}

function Screen({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>{children}</View>
  );
}

function Loading() {
  return (
    <Screen>
      <ActivityIndicator size="large" color={colors.white} />
    </Screen>
  );
}

function Notice({ text, onBack }: { text: string; onBack: () => void }) {
  return (
    <Screen>
      <AliasLogo size={120} />
      <Text style={styles.title}>{text}</Text>
      <BigButton label="חזרה" variant="light" onPress={onBack} />
    </Screen>
  );
}

function SignIn({ onBack, joining }: { onBack: () => void; joining: boolean }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <Screen>
      <AliasLogo size={140} />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{joining ? 'הוזמנתם למשחק אליאס!' : 'משחק אונליין'}</Text>
        <Text style={styles.text}>
          כל שחקן מתחבר מהטלפון שלו, מצטרף לקבוצה, ובכל תור שחקן אחר מהקבוצה מסביר – כמו במשחק המקורי.
        </Text>
        <BigButton
          label={busy ? 'מתחברים…' : 'התחברות עם Google'}
          variant="primary"
          disabled={busy}
          onPress={() => {
            setBusy(true);
            setFailed(false);
            signInWithGoogle()
              .catch(() => setFailed(true))
              .finally(() => setBusy(false));
          }}
        />
        {failed && <Text style={styles.error}>ההתחברות נכשלה, נסו שוב</Text>}
      </View>
      <BackLink onPress={onBack} />
    </Screen>
  );
}

function CreateOrJoin({
  user,
  error,
  onRoom,
  onBack,
}: {
  user: User;
  error: string | null;
  onRoom: (code: string) => void;
  onBack: () => void;
}) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const code = normaliseCode(input);
  return (
    <Screen>
      <AliasLogo size={120} />
      <Text style={styles.hello}>שלום {user.displayName ?? ''} 👋</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>פתיחת חדר חדש</Text>
        <Text style={styles.text}>תקבלו קישור הזמנה לשלוח לחברים.</Text>
        <BigButton
          label={busy ? 'פותחים חדר…' : 'יצירת חדר'}
          variant="primary"
          disabled={busy}
          onPress={() => {
            setBusy(true);
            createRoom(user)
              .then(onRoom)
              .finally(() => setBusy(false));
          }}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>הצטרפות עם קוד</Text>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="קוד החדר, למשל K7M2Q"
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          style={styles.input}
          maxLength={8}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <BigButton label="הצטרפות" variant="primary" disabled={code.length < 4} onPress={() => onRoom(code)} />
      </View>
      <View style={styles.row}>
        <BackLink onPress={onBack} />
        <Pressable onPress={() => signOut()} style={styles.link}>
          <Text style={styles.linkText}>התנתקות</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function BackLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.link} accessibilityRole="button">
      <Text style={styles.linkText}>→ חזרה</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 20 },
  card: {
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 18,
    gap: 12,
  },
  cardTitle: { fontSize: 22, fontWeight: '900', color: colors.red, textAlign: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: colors.white, textAlign: 'center' },
  hello: { fontSize: 20, fontWeight: '800', color: colors.white },
  text: { fontSize: 15, color: colors.ink, textAlign: 'center', lineHeight: 22 },
  input: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
    color: colors.ink,
    backgroundColor: colors.offWhite,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: '#F1C6C9',
    paddingVertical: 10,
  },
  error: { color: colors.skip, fontWeight: '800', textAlign: 'center' },
  row: { flexDirection: 'row', gap: 16 },
  link: { padding: 8 },
  linkText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});
