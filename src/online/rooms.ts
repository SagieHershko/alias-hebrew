import type { User } from 'firebase/auth';
import {
  deleteField,
  doc,
  getDocFromServer,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

import { DEFAULT_SETTINGS, gameReducer, initialState, MAX_TEAMS, MIN_TEAMS } from '../game/gameReducer';
import type { GameAction, GameState, Player, Settings } from '../game/types';
import { playerFromUser } from './auth';
import { firebase } from './firebase';
import { setServerOffset } from './serverTime';

/** A player in the room, with the team they picked in the lobby. */
export interface RoomPlayer {
  name: string;
  photo: string | null;
  teamIndex: number | null;
  joinedAt: number;
}

/** Firestore document rooms/{code}. The game itself is stored as JSON. */
export interface Room {
  code: string;
  hostUid: string;
  status: 'lobby' | 'playing';
  createdAt: number;
  players: Record<string, RoomPlayer>;
  teamNames: string[];
  settings: Settings;
  game: string | null;
  rev: number;
  /** Server time of the last game / settings change (the rules rate-limit on it). */
  updatedAt?: unknown;
}

/** At most this many players per room (the rules allow up to 20). */
export const MAX_PLAYERS = 20;

/** Firestore errors worth retrying: contention between players, network hiccups, rate limit. */
const RETRYABLE = new Set([
  'aborted',
  'unavailable',
  'deadline-exceeded',
  'resource-exhausted',
  'failed-precondition',
  'permission-denied', // e.g. two changes within 100 ms: the rate-limit rule refuses the second
]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Runs a Firestore operation, retrying transient failures with exponential backoff + jitter. */
async function withRetry<T>(op: () => Promise<T>, attempts = 5): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await op();
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      if (i >= attempts - 1 || !RETRYABLE.has(code)) throw e;
      await sleep(150 * 2 ** i + Math.random() * 150);
    }
  }
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no look-alikes (0/O, 1/I/L)
const DEFAULT_TEAM_NAMES = ['האריות', 'הנשרים', 'הכרישים', 'הנמרים', 'הדובים', 'הזאבים'];

const roomRef = (code: string) => doc(firebase().db, 'rooms', code);

function randomCode(length = 5) {
  return Array.from({ length }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
}

export function normaliseCode(input: string) {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function inviteUrl(code: string) {
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}${window.location.pathname}?room=${code}`;
  }
  return `?room=${code}`;
}

function roomPlayer(user: User, teamIndex: number | null): RoomPlayer {
  const p = playerFromUser(user);
  const photo = p.photo && p.photo.length <= 2048 ? p.photo : null;
  return { name: p.name.slice(0, 60), photo, teamIndex, joinedAt: Date.now() };
}

/** Creates a new room with the signed-in user as host. Returns the room code. */
export async function createRoom(user: User): Promise<string> {
  const { db } = firebase();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const created = await withRetry(() =>
      runTransaction(db, async (tx) => {
        const snap = await tx.get(roomRef(code));
        if (snap.exists()) return false;
        const room: Room = {
          code,
          hostUid: user.uid,
          status: 'lobby',
          createdAt: Date.now(),
          players: { [user.uid]: roomPlayer(user, 0) },
          teamNames: DEFAULT_TEAM_NAMES.slice(0, 2),
          settings: DEFAULT_SETTINGS,
          game: null,
          rev: 0,
          updatedAt: serverTimestamp(),
        };
        tx.set(roomRef(code), room);
        return true;
      }),
    );
    if (created) return code;
  }
  throw new Error('Could not create a room');
}

/** Adds the user to the room (or refreshes their name / photo). Throws 'not-found'. */
export async function joinRoom(code: string, user: User): Promise<void> {
  await withRetry(() =>
    runTransaction(firebase().db, async (tx) => {
      const snap = await tx.get(roomRef(code));
      if (!snap.exists()) throw new Error('not-found');
      const room = snap.data() as Room;
      const existing = room.players[user.uid];
      if (!existing && Object.keys(room.players).length >= MAX_PLAYERS) throw new Error('full');
      const fresh = roomPlayer(user, existing?.teamIndex ?? null);
      tx.update(roomRef(code), {
        [`players.${user.uid}`]: existing ? { ...existing, name: fresh.name, photo: fresh.photo } : fresh,
      });
    }),
  );
}

export function chooseTeam(code: string, uid: string, teamIndex: number) {
  return withRetry(() => updateDoc(roomRef(code), { [`players.${uid}.teamIndex`]: teamIndex }));
}

/** Leaves the lobby (removes the player). During a game the player keeps their seat. */
export function leaveLobby(code: string, uid: string) {
  return withRetry(() => updateDoc(roomRef(code), { [`players.${uid}`]: deleteField() }));
}

/** Host: rename teams, add / remove a team, change the settings. */
export async function updateLobby(code: string, patch: { teamNames?: string[]; settings?: Settings }) {
  await withRetry(() =>
    runTransaction(firebase().db, async (tx) => {
      const snap = await tx.get(roomRef(code));
      if (!snap.exists()) return;
      const room = snap.data() as Room;
      const update: Record<string, unknown> = { ...patch, updatedAt: serverTimestamp() };
      if (patch.teamNames) {
        const count = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, patch.teamNames.length));
        update.teamNames = patch.teamNames.slice(0, count);
        // Players of a removed team go back to "no team".
        for (const [uid, p] of Object.entries(room.players)) {
          if (p.teamIndex !== null && p.teamIndex >= count) update[`players.${uid}.teamIndex`] = null;
        }
      }
      tx.update(roomRef(code), update);
    }),
  );
}

export function suggestTeamName(names: string[]) {
  return DEFAULT_TEAM_NAMES.find((n) => !names.includes(n)) ?? `קבוצה ${names.length + 1}`;
}

/** Teams' players in join order (the explaining order). */
export function teamPlayersOf(room: Room): Player[][] {
  return room.teamNames.map((_, i) =>
    Object.entries(room.players)
      .filter(([, p]) => p.teamIndex === i)
      .sort(([, a], [, b]) => a.joinedAt - b.joinedAt)
      .map(([id, p]) => ({ id, name: p.name, photo: p.photo })),
  );
}

export function canStart(room: Room) {
  const teams = teamPlayersOf(room);
  return teams.length >= MIN_TEAMS && teams.every((t) => t.length > 0);
}

/** Host: deals the game with the lobby's teams and players, and starts it for everyone. */
export async function startGame(code: string) {
  await withRetry(() =>
    runTransaction(firebase().db, async (tx) => {
      const snap = await tx.get(roomRef(code));
      if (!snap.exists()) return;
      const room = snap.data() as Room;
      if (!canStart(room)) return;
      const game = gameReducer(initialState, {
        type: 'START_GAME',
        teamNames: room.teamNames,
        settings: room.settings,
        teamPlayers: teamPlayersOf(room),
      });
      tx.update(roomRef(code), {
        status: 'playing',
        game: JSON.stringify(game),
        rev: room.rev + 1,
        updatedAt: serverTimestamp(),
      });
    }),
  );
}

/**
 * Applies a game action for everyone: read the room, run the (pure) reducer and write
 * the result, atomically. "Back to setup" returns the whole room to the lobby.
 */
async function applyAction(code: string, action: GameAction) {
  await withRetry(() =>
    runTransaction(firebase().db, async (tx) => {
      const snap = await tx.get(roomRef(code));
      if (!snap.exists()) return;
      const room = snap.data() as Room;
      if (action.type === 'BACK_TO_SETUP') {
        tx.update(roomRef(code), { status: 'lobby', game: null, rev: room.rev + 1, updatedAt: serverTimestamp() });
        return;
      }
      const before = parseGame(room.game);
      if (!before) return;
      const after = gameReducer(before, action);
      if (after === before) return;
      tx.update(roomRef(code), { game: JSON.stringify(after), rev: room.rev + 1, updatedAt: serverTimestamp() });
    }),
  );
}

/** Parses the stored game, tolerating a missing or corrupt value (never crashes the screen). */
function parseGame(json: string | null | undefined): GameState | null {
  if (!json) return null;
  try {
    const game = JSON.parse(json) as GameState;
    return Array.isArray(game?.teams) && game.teams.length >= 2 ? game : null;
  } catch {
    return null;
  }
}

/** Dispatch for an online room: actions from this device are applied one after another, in order. */
export function createRoomDispatcher(code: string, onError?: (e: unknown) => void) {
  let queue: Promise<void> = Promise.resolve();
  let pending = 0;
  let lastWrite = 0;
  return (action: GameAction) => {
    // Guard against runaway input: never let more than a handful of actions pile up.
    // (A real player taps about once a second; this only trips on a flood or a dead connection.)
    if (pending >= 8) {
      onError?.(new Error('too-many-pending-actions'));
      return;
    }
    pending += 1;
    queue = queue
      .then(async () => {
        // Keep writes at least 120 ms apart (the rules refuse two within 100 ms).
        const wait = lastWrite + 120 - Date.now();
        if (wait > 0) await sleep(wait);
        await applyAction(code, action);
        lastWrite = Date.now();
      })
      .catch((e) => {
        console.error('Alias: action failed', e);
        onError?.(e);
      })
      .finally(() => {
        pending -= 1;
      });
  };
}

/** Live room document: undefined while loading, null if it does not exist. */
export function useRoom(code: string | null) {
  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  useEffect(() => {
    if (!code) return;
    setRoom(undefined);
    return onSnapshot(
      roomRef(code),
      (snap) => setRoom(snap.exists() ? (snap.data() as Room) : null),
      () => setRoom(null),
    );
  }, [code]);
  const game = useMemo(() => parseGame(room?.game), [room?.game]);
  return { room, game };
}

/**
 * Measures this device's clock against the server's (write a server timestamp, read it
 * back), so turn clocks line up on every phone.
 */
export async function syncServerClock(code: string, uid: string) {
  try {
    const ref = doc(firebase().db, 'rooms', code, 'clock', uid);
    const sent = Date.now();
    await setDoc(ref, { t: serverTimestamp() });
    const snap = await getDocFromServer(ref);
    const received = Date.now();
    const server = (snap.data()?.t as { toMillis(): number } | undefined)?.toMillis();
    if (server) setServerOffset(server - (sent + received) / 2);
  } catch {
    // Without a measurement, the device's own clock is used.
  }
}
