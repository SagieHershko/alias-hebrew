import { useEffect, useRef, useState } from 'react';

import { clockRemaining, clockStarted } from '../game/gameReducer';
import type { TurnClock } from '../game/types';
import { serverNow } from '../online/serverTime';

/**
 * Live view of the turn clock kept in the game state. Derived from timestamps, so it
 * never drifts and every device (online) shows the same time left.
 */
export function useTurnClock(clock: TurnClock | null, onExpire?: () => void) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), 200);
    return () => clearInterval(id);
  }, []);

  const durationMs = clock?.durationMs ?? 1;
  const remainingMs = clock ? clockRemaining(clock, now) : 0;
  const started = !!clock && clockStarted(clock, now);
  const expired = started && remainingMs === 0;

  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const fired = useRef(false);
  useEffect(() => {
    if (expired && !fired.current) {
      fired.current = true;
      onExpireRef.current?.();
    }
  }, [expired]);

  return {
    remainingMs,
    secondsLeft: Math.ceil(remainingMs / 1000),
    progress: remainingMs / durationMs,
    started,
    paused: !!clock?.pausedAt,
    expired,
  };
}
