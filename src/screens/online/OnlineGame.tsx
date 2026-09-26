import type { User } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { currentExplainer } from '../../game/gameReducer';
import { GameContext, type GameContextValue } from '../../game/GameContext';
import type { GameState } from '../../game/types';
import { playerFromUser } from '../../online/auth';
import { createRoomDispatcher, inviteUrl, type Room } from '../../online/rooms';
import { GameStage } from '../stage/GameStage';

/**
 * Online game: the shared game state comes live from the room, and actions are applied
 * to the room for everyone. Each phone knows its own role: explainer, guesser or host.
 */
export function OnlineGame({
  room,
  game,
  user,
  onLeave,
}: {
  room: Room;
  game: GameState;
  user: User;
  onLeave: () => void;
}) {
  // A short notice if an action could not be saved (e.g. the connection dropped).
  const [problem, setProblem] = useState(false);
  useEffect(() => {
    if (!problem) return;
    const id = setTimeout(() => setProblem(false), 3500);
    return () => clearTimeout(id);
  }, [problem]);
  const dispatch = useMemo(() => createRoomDispatcher(room.code, () => setProblem(true)), [room.code]);

  const value = useMemo<GameContextValue>(() => {
    const explainer = currentExplainer(game);
    const isHost = room.hostUid === user.uid;
    const amExplainer = explainer?.id === user.uid;
    // If the explainer has left the room, the host runs the turn for them.
    const explainerHere = !!explainer && !!room.players[explainer.id];
    const myTeam = game.teams.find((t) => t.players?.some((p) => p.id === user.uid));
    return {
      state: game,
      dispatch,
      online: {
        roomCode: room.code,
        inviteUrl: inviteUrl(room.code),
        me: playerFromUser(user),
        isHost,
        myTeamId: myTeam?.id ?? null,
        explainer,
        amExplainer,
        canControlTurn: amExplainer || (isHost && !explainerHere) || !explainer,
        leave: onLeave,
      },
    };
  }, [game, room, user, dispatch, onLeave]);

  return (
    <GameContext.Provider value={value}>
      <GameStage />
      {problem && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>בעיית תקשורת – הפעולה לא נשמרה, נסו שוב</Text>
        </View>
      )}
    </GameContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    backgroundColor: 'rgba(160,0,10,0.92)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  toastText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
