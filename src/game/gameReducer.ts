import { WORDS, WORDS_PER_CARD } from '../data/words';
import { TEAM_COLORS } from '../theme';
import { crossesStealSquare, generateStealSquares } from './board';
import type { GameAction, GameState, Settings, Team, TurnWord } from './types';

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 6;

export const DEFAULT_SETTINGS: Settings = {
  targetScore: 30,
  turnSeconds: 60,
  skipPenalty: false,
};

export const initialState: GameState = {
  phase: 'setup',
  settings: DEFAULT_SETTINGS,
  teams: [],
  currentTeamIndex: 0,
  round: 1,
  deck: [],
  currentCard: null,
  cardsDrawn: 0,
  wordIndex: 0,
  currentWord: null,
  turnWords: [],
  winnerId: null,
  previousScores: {},
  stealTurn: false,
  stealSquares: [],
};

export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Deals the word bank onto shuffled 8-word cards, leaving out words in `exclude`. */
export function dealCards(exclude: ReadonlySet<string> = new Set()): string[][] {
  let words = shuffle(WORDS.filter((w) => !exclude.has(w)));
  if (words.length < WORDS_PER_CARD) words = shuffle(WORDS);
  const cards: string[][] = [];
  for (let i = 0; i + WORDS_PER_CARD <= words.length; i += WORDS_PER_CARD) {
    cards.push(words.slice(i, i + WORDS_PER_CARD));
  }
  return cards;
}

/** Draws the next card. When the deck runs out it is re-dealt, avoiding words already seen this turn. */
function drawCard(state: GameState, turnWords: TurnWord[]) {
  let deck = state.deck;
  if (deck.length === 0) deck = dealCards(new Set(turnWords.map((w) => w.word)));
  const [card, ...rest] = deck;
  return {
    deck: rest,
    currentCard: card,
    currentWord: card[state.wordIndex],
    cardsDrawn: state.cardsDrawn + 1,
  };
}

/** Square number 1–8 under a board position (the start square is a 1), as a 0-based word index. */
export function wordIndexFor(score: number): number {
  return score % WORDS_PER_CARD;
}

/** The team that won a word: whoever guessed it (last word, steal turn), else the explaining team if correct. */
function winnerOf(w: TurnWord, activeId: string): string | null {
  if (w.guessedBy !== undefined) return w.guessedBy;
  return w.result === 'correct' ? activeId : null;
}

/**
 * Steps each team earns in a turn: +1 per word it guessed. The explaining team
 * optionally loses a step per skipped word (never for the last word).
 */
export function turnAwards(turnWords: TurnWord[], settings: Settings, activeId: string): Record<string, number> {
  const awards: Record<string, number> = { [activeId]: 0 };
  for (const w of turnWords) {
    const winner = winnerOf(w, activeId);
    if (winner) awards[winner] = (awards[winner] ?? 0) + 1;
    else if (!w.isLastWord && settings.skipPenalty) awards[activeId] -= 1;
  }
  return awards;
}

/** Steps the explaining team earns in a turn. */
export function turnPoints(turnWords: TurnWord[], settings: Settings, teamId: string): number {
  return turnAwards(turnWords, settings, teamId)[teamId] ?? 0;
}

/** Guess order used when fixing who guessed a word: explaining team, the others, nobody. */
function guessOrder(state: GameState): (string | null)[] {
  const activeId = state.teams[state.currentTeamIndex].id;
  return [activeId, ...state.teams.filter((t) => t.id !== activeId).map((t) => t.id), null];
}

export function currentTeam(state: GameState): Team | undefined {
  return state.teams[state.currentTeamIndex];
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const names = action.teamNames.map((n) => n.trim()).slice(0, MAX_TEAMS);
      if (names.length < MIN_TEAMS || names.some((n) => n.length === 0)) return state;
      const teams: Team[] = names.map((name, i) => ({
        id: `team-${i}`,
        name,
        color: TEAM_COLORS[i % TEAM_COLORS.length],
        score: 0,
      }));
      return {
        ...initialState,
        phase: 'scoreboard',
        settings: action.settings,
        teams,
        deck: dealCards(),
        stealSquares: generateStealSquares(action.settings.targetScore),
      };
    }

    case 'BEGIN_TURN': {
      if (state.phase !== 'scoreboard') return state;
      const active = state.teams[state.currentTeamIndex];
      const wordIndex = wordIndexFor(active.score);
      // A pending steal turn is used up now.
      const teams = state.teams.map((t) => (t.id === active.id ? { ...t, stealNext: false } : t));
      const next = { ...state, teams, wordIndex, stealTurn: !!active.stealNext };
      return { ...next, ...drawCard(next, []), phase: 'turn', turnWords: [] };
    }

    case 'ANSWER': {
      if (state.phase !== 'turn' || state.currentWord === null) return state;
      const word: TurnWord = { word: state.currentWord, result: action.result };
      if (state.stealTurn) {
        // Steal turn: record which team guessed it first (or nobody, on a skip).
        word.guessedBy = action.result === 'correct' ? (action.teamId ?? state.teams[state.currentTeamIndex].id) : null;
      }
      const turnWords = [...state.turnWords, word];
      return { ...state, ...drawCard(state, turnWords), turnWords };
    }

    case 'LAST_WORD': {
      // Time ran out: whoever guesses the word on screen gets the point.
      if (state.phase !== 'turn' || state.currentWord === null) return state;
      const lastWord: TurnWord = {
        word: state.currentWord,
        result: action.teamId ? 'correct' : 'skipped',
        isLastWord: true,
        guessedBy: action.teamId,
      };
      return {
        ...state,
        phase: 'summary',
        turnWords: [...state.turnWords, lastWord],
        currentWord: null,
        currentCard: null,
      };
    }

    case 'END_TURN': {
      if (state.phase !== 'turn') return state;
      // An unanswered card on screen is simply discarded (it is not scored either way).
      return { ...state, phase: 'summary', currentWord: null, currentCard: null };
    }

    case 'TOGGLE_WORD': {
      if (state.phase !== 'summary') return state;
      const turnWords = state.turnWords.map((w, i) =>
        i === action.index && w.guessedBy === undefined
          ? { ...w, result: w.result === 'correct' ? ('skipped' as const) : ('correct' as const) }
          : w,
      );
      return { ...state, turnWords };
    }

    case 'CYCLE_LAST_WORD':
    case 'CYCLE_WORD': {
      if (state.phase !== 'summary') return state;
      const index = action.type === 'CYCLE_WORD' ? action.index : state.turnWords.findIndex((w) => w.isLastWord);
      const order = guessOrder(state);
      const turnWords = state.turnWords.map((w, i) => {
        if (i !== index || w.guessedBy === undefined) return w;
        const next = order[(order.indexOf(w.guessedBy) + 1) % order.length];
        return { ...w, guessedBy: next, result: next ? ('correct' as const) : ('skipped' as const) };
      });
      return { ...state, turnWords };
    }

    case 'CONFIRM_TURN': {
      if (state.phase !== 'summary') return state;
      const activeId = state.teams[state.currentTeamIndex].id;
      const target = state.settings.targetScore;
      const awards = turnAwards(state.turnWords, state.settings, activeId);
      const previousScores = Object.fromEntries(state.teams.map((t) => [t.id, t.score]));
      const clamp = (n: number) => Math.min(target, Math.max(0, n));
      const teams = state.teams.map((t) => {
        if (!awards[t.id]) return t;
        const score = clamp(t.score + awards[t.id]);
        // Landing on or passing a steal square makes the team's next turn a steal turn.
        return { ...t, score, stealNext: t.stealNext || crossesStealSquare(t.score, score, state.stealSquares) };
      });
      // The explaining team is checked first, so it wins a tie on the finish square.
      const winner = [activeId, ...teams.map((t) => t.id).filter((id) => id !== activeId)]
        .map((id) => teams.find((t) => t.id === id))
        .find((t) => t && t.score >= target);
      if (winner) {
        return { ...state, teams, previousScores, phase: 'winner', winnerId: winner.id, turnWords: [] };
      }
      const nextIndex = (state.currentTeamIndex + 1) % teams.length;
      return {
        ...state,
        teams,
        previousScores,
        phase: 'scoreboard',
        currentTeamIndex: nextIndex,
        round: nextIndex === 0 ? state.round + 1 : state.round,
        turnWords: [],
      };
    }

    case 'REMATCH':
      return {
        ...initialState,
        phase: 'scoreboard',
        settings: state.settings,
        teams: state.teams.map((t) => ({ ...t, score: 0, stealNext: false })),
        deck: dealCards(),
        stealSquares: generateStealSquares(state.settings.targetScore),
      };

    case 'BACK_TO_SETUP':
      return { ...initialState, settings: state.settings, teams: state.teams.map((t) => ({ ...t, score: 0 })) };

    default:
      return state;
  }
}
