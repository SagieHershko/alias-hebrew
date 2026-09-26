export type Phase = 'setup' | 'scoreboard' | 'turn' | 'summary' | 'winner';

export type WordResult = 'correct' | 'skipped';

/** A signed-in player (online games). */
export interface Player {
  id: string;
  name: string;
  photo?: string | null;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  /** Board position = accumulated points. */
  score: number;
  /** Landed on / passed a steal square: the team's next turn is a steal turn. */
  stealNext?: boolean;
  /** Online games: the team's players, who take turns explaining. */
  players?: Player[];
  /** How many turns the team has played (picks the next explainer). */
  turnsPlayed?: number;
}

/**
 * The turn clock, in (server-synchronised) epoch milliseconds, so every device
 * shows the same time left. The sand timer flips first; the clock runs from startAt.
 */
export interface TurnClock {
  startAt: number;
  durationMs: number;
  pausedAt: number | null;
  pausedMs: number;
}

export interface TurnWord {
  word: string;
  result: WordResult;
  /** The word on screen when time ran out; any team may guess it. */
  isLastWord?: boolean;
  /**
   * For words any team may guess (the last word, every word of a steal turn):
   * the team that guessed it, or null if nobody did. Undefined for ordinary words.
   */
  guessedBy?: string | null;
}

export interface Settings {
  /** The finish square. First team to reach it wins. */
  targetScore: number;
  /** Seconds per turn (replaces the sand timer). */
  turnSeconds: number;
  /** Classic rule variant: every skipped word moves the team one step back. */
  skipPenalty: boolean;
}

export interface GameState {
  phase: Phase;
  settings: Settings;
  teams: Team[];
  currentTeamIndex: number;
  round: number;
  /** Shuffled 8-word cards not yet drawn in this game. */
  deck: string[][];
  /** The card on screen, and how many cards were drawn (animation key). */
  currentCard: string[] | null;
  cardsDrawn: number;
  /** Which word on each card (0–7) the team explains: the number of its square. */
  wordIndex: number;
  /** The word to explain: currentCard[wordIndex]. */
  currentWord: string | null;
  turnWords: TurnWord[];
  winnerId: string | null;
  /** The running turn's clock (null outside a turn). */
  clock: TurnClock | null;
  /** This game's steal squares (random per game). */
  stealSquares: number[];
  /** This turn is a steal turn: all teams guess at the same time. */
  stealTurn: boolean;
  /** Scores before the last confirmed turn, so the board can animate the pawns' moves. */
  previousScores: Record<string, number>;
}

export type GameAction =
  | { type: 'START_GAME'; teamNames: string[]; settings: Settings; teamPlayers?: Player[][] }
  | { type: 'BEGIN_TURN'; now: number }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  /** In a steal turn, `teamId` is the team that guessed the word (defaults to the explaining team). */
  | { type: 'ANSWER'; result: WordResult; teamId?: string }
  | { type: 'LAST_WORD'; teamId: string | null }
  | { type: 'CYCLE_LAST_WORD' }
  /** Summary fix-up for a word any team may guess: explaining team → other teams → nobody → … */
  | { type: 'CYCLE_WORD'; index: number }
  | { type: 'END_TURN' }
  | { type: 'TOGGLE_WORD'; index: number }
  | { type: 'CONFIRM_TURN' }
  | { type: 'REMATCH' }
  | { type: 'BACK_TO_SETUP' };
