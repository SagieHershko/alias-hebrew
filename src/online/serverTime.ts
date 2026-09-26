/**
 * Shared time base for online games. Each device measures how far its own clock is
 * from the server's; turn clocks are stored in server time so every phone shows the
 * same seconds left. In a single-device game the offset simply stays 0.
 */
let offsetMs = 0;

export function serverNow(): number {
  return Date.now() + offsetMs;
}

export function setServerOffset(ms: number) {
  offsetMs = ms;
}
