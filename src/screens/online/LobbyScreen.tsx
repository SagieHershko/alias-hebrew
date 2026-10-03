import type { User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../../components/Avatar';
import { BigButton } from '../../components/BigButton';
import { Chips, SECONDS_OPTIONS, TARGET_OPTIONS } from '../../components/Chips';
import { InviteQR } from '../../components/InviteQR';
import { PawnDot, PawnPalette } from '../../components/PawnColorPicker';
import { Toggle } from '../../components/Toggle';
import { MAX_TEAMS, MIN_TEAMS } from '../../game/gameReducer';
import {
  canStart,
  chooseTeam,
  inviteUrl,
  leaveLobby,
  removeTeam,
  roomColors,
  setTeamColor,
  startGame,
  suggestTeamName,
  teamPlayersOf,
  updateLobby,
  type Room,
} from '../../online/rooms';
import { colors, radius } from '../../theme';

/** Before the game: share the invite, everyone picks a team, the host sets up and starts. */
export function LobbyScreen({ room, user, onLeave }: { room: Room; user: User; onLeave: () => void }) {
  const insets = useSafeAreaInsets();
  const isHost = room.hostUid === user.uid;
  const me = room.players[user.uid];
  const teams = teamPlayersOf(room);
  const unassigned = Object.entries(room.players).filter(([, p]) => p.teamIndex === null);
  const url = inviteUrl(room.code);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const host = room.players[room.hostUid];

  const copy = () => {
    globalThis.navigator?.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  const whatsapp = () =>
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(`בואו לשחק איתי אליאס! 🎲 ${url}`)}`);

  const leave = () => {
    if (!isHost) leaveLobby(room.code, user.uid).catch(() => {});
    onLeave();
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
    >
      {/* Invite */}
      <View style={styles.card}>
        <Text style={styles.label}>קוד החדר</Text>
        <Text style={styles.code} selectable>
          {room.code}
        </Text>
        <View style={styles.row}>
          <BigButton label="💬 וואטסאפ" variant="correct" onPress={whatsapp} style={styles.flex} />
          <BigButton
            label={copied ? '✓ הועתק' : '🔗 העתקת קישור'}
            variant="primary"
            onPress={copy}
            style={styles.flex}
          />
        </View>
        <BigButton
          label={showQR ? 'הסתרת קוד QR' : '📷 קוד QR למי שלידך'}
          variant="light"
          onPress={() => setShowQR((v) => !v)}
        />
        {showQR && (
          <>
            <InviteQR url={url} size={200} />
            <Text style={styles.qrHint}>סרקו במצלמה של הטלפון כדי להצטרף</Text>
          </>
        )}
      </View>

      {/* Teams */}
      {teams.map((players, i) => (
        <TeamCard
          key={i}
          room={room}
          index={i}
          players={players.map((p) => ({ ...p, isHost: p.id === room.hostUid, isMe: p.id === user.uid }))}
          editable={isHost}
          mine={me?.teamIndex === i}
          onJoin={() => chooseTeam(room.code, user.uid, i)}
        />
      ))}
      {isHost && room.teamNames.length < MAX_TEAMS && (
        <BigButton
          label="+ הוספת קבוצה"
          variant="light"
          onPress={() =>
            updateLobby(room.code, {
              teamNames: [...room.teamNames, suggestTeamName(room.teamNames)],
              teamColors: roomColors(room),
            })
          }
        />
      )}
      {unassigned.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.label}>עוד לא בחרו קבוצה</Text>
          <View style={styles.wrap}>
            {unassigned.map(([id, p]) => (
              <View key={id} style={styles.person}>
                <Avatar name={p.name} photo={p.photo} size={26} />
                <Text style={styles.personName}>{p.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Settings: the host decides, everyone sees */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>הגדרות</Text>
        <Text style={styles.label}>משבצת הסיום</Text>
        <Chips
          options={TARGET_OPTIONS}
          value={room.settings.targetScore}
          disabled={!isHost}
          onChange={(v) => updateLobby(room.code, { settings: { ...room.settings, targetScore: v } })}
        />
        <Text style={styles.label}>זמן לכל תור (שניות)</Text>
        <Chips
          options={SECONDS_OPTIONS}
          value={room.settings.turnSeconds}
          disabled={!isHost}
          onChange={(v) => updateLobby(room.code, { settings: { ...room.settings, turnSeconds: v } })}
        />
        <View style={styles.row}>
          <Text style={[styles.label, styles.flex]}>דילוג מוריד צעד אחורה</Text>
          <Toggle
            value={room.settings.skipPenalty}
            disabled={!isHost}
            onValueChange={(v) => updateLobby(room.code, { settings: { ...room.settings, skipPenalty: v } })}
            label="דילוג מוריד צעד אחורה"
          />
        </View>
      </View>

      {isHost ? (
        <>
          <BigButton
            label="יאללה, מתחילים!"
            variant="light"
            large
            disabled={!canStart(room)}
            onPress={() => startGame(room.code)}
          />
          <Text style={styles.hint}>
            {canStart(room)
              ? 'בכל תור שחקן אחר מהקבוצה מסביר. מומלץ לפחות 2 שחקנים בכל קבוצה.'
              : 'בכל קבוצה צריך לפחות שחקן אחד'}
          </Text>
        </>
      ) : (
        <Text style={styles.waiting}>ממתינים ש{host?.name ?? 'המארח/ת'} יתחיל/תתחיל את המשחק…</Text>
      )}
      <Pressable onPress={leave} style={styles.leave}>
        <Text style={styles.leaveText}>יציאה מהחדר</Text>
      </Pressable>
    </ScrollView>
  );
}

interface TeamCardProps {
  room: Room;
  index: number;
  players: { id: string; name: string; photo?: string | null; isHost: boolean; isMe: boolean }[];
  editable: boolean;
  mine: boolean;
  onJoin: () => void;
}

function TeamCard({ room, index, players, editable, mine, onJoin }: TeamCardProps) {
  const [name, setName] = useState(room.teamNames[index]);
  useEffect(() => setName(room.teamNames[index]), [room.teamNames, index]);
  const saveName = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === room.teamNames[index]) return setName(room.teamNames[index]);
    updateLobby(room.code, { teamNames: room.teamNames.map((n, i) => (i === index ? trimmed : n)) });
  };
  const pawnColors = roomColors(room);
  const [colorOpen, setColorOpen] = useState(false);
  const remove = () => removeTeam(room.code, index);

  return (
    <View style={[styles.card, mine && styles.cardMine]}>
      <View style={styles.row}>
        <PawnDot
          color={pawnColors[index]}
          open={colorOpen}
          onPress={() => setColorOpen((v) => !v)}
          teamLabel={room.teamNames[index]}
        />
        {editable ? (
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={saveName}
            onSubmitEditing={saveName}
            maxLength={18}
            style={[styles.teamName, styles.teamInput, styles.flex]}
            accessibilityLabel={`שם קבוצה ${index + 1}`}
          />
        ) : (
          <Text style={[styles.teamName, styles.flex]}>{room.teamNames[index]}</Text>
        )}
        {editable && room.teamNames.length > MIN_TEAMS && (
          <Pressable onPress={remove} style={styles.remove} accessibilityLabel="הסרת הקבוצה">
            <Text style={styles.removeText}>✕</Text>
          </Pressable>
        )}
      </View>
      {colorOpen && (
        <PawnPalette
          color={pawnColors[index]}
          taken={pawnColors}
          onPick={(c) => {
            setColorOpen(false);
            setTeamColor(room.code, index, c).catch(() => {});
          }}
        />
      )}
      <View style={styles.wrap}>
        {players.length === 0 && <Text style={styles.empty}>עוד אין שחקנים</Text>}
        {players.map((p, order) => (
          <View key={p.id} style={styles.person}>
            <Avatar name={p.name} photo={p.photo} size={26} />
            <Text style={styles.personName}>
              {p.name}
              {p.isMe ? ' (אני)' : ''}
              {p.isHost ? ' 👑' : ''}
            </Text>
            <Text style={styles.order}>{order + 1}</Text>
          </View>
        ))}
      </View>
      {!mine && <BigButton label="הצטרפות לקבוצה" variant="primary" onPress={onJoin} />}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    gap: 10,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cardMine: { borderColor: colors.gold },
  cardTitle: { fontSize: 20, fontWeight: '900', color: colors.red },
  label: { fontSize: 15, fontWeight: '800', color: colors.ink },
  qrHint: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  code: {
    fontSize: 44,
    fontWeight: '900',
    color: colors.red,
    letterSpacing: 8,
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  teamName: { fontSize: 20, fontWeight: '900', color: colors.ink },
  teamInput: {
    backgroundColor: colors.offWhite,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: '#F1C6C9',
  },
  remove: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: colors.red, fontWeight: '900' },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.offWhite,
    borderRadius: radius.pill,
    paddingStart: 4,
    paddingEnd: 10,
    paddingVertical: 3,
  },
  personName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  order: { fontSize: 11, color: colors.muted, fontWeight: '800' },
  empty: { color: colors.muted, fontWeight: '600' },
  hint: { color: colors.white, textAlign: 'center', fontWeight: '600' },
  waiting: { color: colors.white, textAlign: 'center', fontWeight: '800', fontSize: 17 },
  leave: { alignSelf: 'center', padding: 8 },
  leaveText: { color: colors.white, fontWeight: '800', textDecorationLine: 'underline' },
});
