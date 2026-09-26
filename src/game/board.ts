/**
 * Steal squares ("משבצת גניבה"), the outlined squares on the printed board.
 * A team whose pawn lands on or passes one plays its next turn as a steal turn:
 * every team guesses at the same time, and whoever guesses a word first gets the step.
 *
 * Each game places them at random: about one per 9 squares, spread along the whole
 * track (one in each stretch), never on the start or the last two squares.
 */
export function generateStealSquares(target: number, random: () => number = Math.random): number[] {
  const count = Math.max(2, Math.round(target / 9));
  const first = 3;
  const last = target - 2;
  const stretch = (last - first + 1) / count;
  const squares: number[] = [];
  for (let k = 0; k < count; k++) {
    // Keep a square's distance from the stretch edges so two steal squares never touch.
    const lo = Math.ceil(first + k * stretch + (k > 0 ? 1 : 0));
    const hi = Math.floor(first + (k + 1) * stretch - 1);
    const square = lo + Math.floor(random() * Math.max(1, hi - lo + 1));
    if (!squares.includes(square)) squares.push(Math.min(square, last));
  }
  return squares.sort((a, b) => a - b);
}

/** Did a move from `from` to `to` land on or pass one of the steal squares? */
export function crossesStealSquare(from: number, to: number, stealSquares: readonly number[]): boolean {
  return stealSquares.some((s) => s > from && s <= to);
}
