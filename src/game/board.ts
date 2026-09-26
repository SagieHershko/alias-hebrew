/**
 * Steal squares ("משבצת גניבה"), the outlined squares on the printed board.
 * A team whose pawn lands on or passes one plays its next turn as a steal turn:
 * every team guesses at the same time, and whoever guesses a word first gets the step.
 *
 * They sit every 8 squares from square 6, never on the start, the finish or the
 * square just before it.
 */
export function isStealSquare(index: number, target: number): boolean {
  return index > 0 && index < target - 1 && index % 8 === 6;
}

/** Did a move from `from` to `to` land on or pass a steal square? */
export function crossesStealSquare(from: number, to: number, target: number): boolean {
  for (let i = from + 1; i <= to; i++) if (isStealSquare(i, target)) return true;
  return false;
}
