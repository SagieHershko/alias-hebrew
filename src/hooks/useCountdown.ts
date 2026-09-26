import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Wall-clock based countdown: remaining time is derived from a deadline, so it
 * never drifts and stays correct if the JS thread stalls or the app is backgrounded.
 */
export function useCountdown(totalSeconds: number, onExpire: () => void, startDelayMs = 0) {
  const totalMs = totalSeconds * 1000;
  const [remainingMs, setRemainingMs] = useState(totalMs);
  // Waiting for the start (e.g. the sand timer flipping over) counts as paused.
  const [started, setStarted] = useState(startDelayMs === 0);
  const [paused, setPaused] = useState(startDelayMs > 0);
  const deadline = useRef(Date.now() + totalMs);
  const remainingAtPause = useRef(totalMs);
  const expired = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (started) return;
    const id = setTimeout(() => {
      deadline.current = Date.now() + totalMs;
      setStarted(true);
      setPaused(false);
    }, startDelayMs);
    return () => clearTimeout(id);
  }, [started, startDelayMs, totalMs]);

  useEffect(() => {
    if (paused) return;
    const tick = () => {
      const left = Math.max(0, deadline.current - Date.now());
      setRemainingMs(left);
      if (left === 0 && !expired.current) {
        expired.current = true;
        onExpireRef.current();
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [paused]);

  const pause = useCallback(() => {
    if (expired.current || !started) return;
    remainingAtPause.current = Math.max(0, deadline.current - Date.now());
    setPaused(true);
  }, [started]);

  const resume = useCallback(() => {
    deadline.current = Date.now() + remainingAtPause.current;
    setPaused(false);
  }, []);

  return {
    remainingMs,
    secondsLeft: Math.ceil(remainingMs / 1000),
    progress: remainingMs / totalMs,
    paused,
    started,
    expired: remainingMs === 0,
    pause,
    resume,
  };
}
