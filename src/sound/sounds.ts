import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useSyncExternalStore } from 'react';

/** Sound effects, synthesised by scripts/make-sounds.mjs. */
const SOURCES = {
  correct: require('../../assets/sounds/correct.wav'),
  skip: require('../../assets/sounds/skip.wav'),
  hop: require('../../assets/sounds/hop.wav'),
  tick: require('../../assets/sounds/tick.wav'),
  tock: require('../../assets/sounds/tock.wav'),
  timeup: require('../../assets/sounds/timeup.wav'),
  flip: require('../../assets/sounds/flip.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

/** A few players per sound, used round-robin, so quick repeats (pawn hops) can overlap. */
const VOICES: Partial<Record<SoundName, number>> = { hop: 4, correct: 2, skip: 2 };

const pools: Partial<Record<SoundName, { players: AudioPlayer[]; next: number }>> = {};
let muted = false;
const listeners = new Set<() => void>();
let initialised = false;

function pool(name: SoundName) {
  let p = pools[name];
  if (!p) {
    const count = VOICES[name] ?? 1;
    p = { players: Array.from({ length: count }, () => createAudioPlayer(SOURCES[name])), next: 0 };
    pools[name] = p;
  }
  return p;
}

/** Creates the players up front so the first sounds are not delayed. */
export function initSounds() {
  if (initialised) return;
  initialised = true;
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  (Object.keys(SOURCES) as SoundName[]).forEach((name) => {
    try {
      pool(name);
    } catch {
      // Audio unavailable (e.g. no audio device): the game simply stays silent.
    }
  });
}

export function playSound(name: SoundName, volume = 1) {
  if (muted) return;
  try {
    const p = pool(name);
    const player = p.players[p.next % p.players.length];
    p.next += 1;
    player.volume = volume;
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // Never let a sound problem break the game.
  }
}

export function setMuted(value: boolean) {
  muted = value;
  listeners.forEach((l) => l());
}

export function useMuted(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => muted,
    () => muted,
  );
}
