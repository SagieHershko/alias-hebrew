export type Phase = 'setup' | 'scoreboard' | 'turn' | 'summary' | 'winner';

export type WordResult = 'correct' | 'skipped';

export interface Team {
  id: string;
  name: string;
  color: string;
  /** Board position = accumulated points. */
  score: number;
}

export interface TurnWord {
  word: string;
  result: WordResult;
  /** The word on screen when time ran out; any team may guess it. */
  isLastWord?: boolean;
  /** Last word only: the team that guessed it, or null if nobody did. */
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
  /** Shuffled words not yet shown in this game. */
  deck: string[];
  currentWord: string | null;
  turnWords: TurnWord[];
  winnerId: string | null;
  /** Scores before the last confirmed turn, so the board can animate the pawns' moves. */
  previousScores: Record<string, number>;
}

export type GameAction =
  | { type: 'START_GAME'; teamNames: string[]; settings: Settings }
  | { type: 'BEGIN_TURN' }
  | { type: 'ANSWER'; result: WordResult }
  | { type: 'LAST_WORD'; teamId: string | null }
  | { type: 'CYCLE_LAST_WORD' }
  | { type: 'END_TURN' }
  | { type: 'TOGGLE_WORD'; index: number }
  | { type: 'CONFIRM_TURN' }
  | { type: 'REMATCH' }
  | { type: 'BACK_TO_SETUP' };
