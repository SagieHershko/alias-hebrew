import { WORDS, WORDS_PER_CARD } from '../data/words';
import { TEAM_COLORS } from '../theme';
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

/**
 * Points the explaining team earns in a turn: +1 per correct word, optionally -1 per skip.
 * The last word counts only if the explaining team guessed it, and is never penalised.
 */
export function turnPoints(turnWords: TurnWord[], settings: Settings, teamId: string): number {
  return turnWords.reduce((sum, w) => {
    if (w.isLastWord) return w.guessedBy === teamId ? sum + 1 : sum;
    if (w.result === 'correct') return sum + 1;
    return settings.skipPenalty ? sum - 1 : sum;
  }, 0);
}

/** The other team that stole the last word (and its +1), if any. */
export function lastWordThief(turnWords: TurnWord[], teamId: string): string | null {
  const last = turnWords.find((w) => w.isLastWord);
  return last?.guessedBy && last.guessedBy !== teamId ? last.guessedBy : null;
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
      };
    }

    case 'BEGIN_TURN': {
      if (state.phase !== 'scoreboard') return state;
      const wordIndex = wordIndexFor(state.teams[state.currentTeamIndex].score);
      const next = { ...state, wordIndex };
      return { ...next, ...drawCard(next, []), phase: 'turn', turnWords: [] };
    }

    case 'ANSWER': {
      if (state.phase !== 'turn' || state.currentWord === null) return state;
      const turnWords = [...state.turnWords, { word: state.currentWord, result: action.result }];
      return { ...state, ...drawCard(state, turnWords), turnWords };
    }

    case 'LAST_WORD': {
      // Time ran out: whoever guesses the word on screen gets the point.
      if (state.phase !== 'turn' || state.currentWord === null) return state;
      const activeId = state.teams[state.currentTeamIndex].id;
      const lastWord: TurnWord = {
        word: state.currentWord,
        result: action.teamId === activeId ? 'correct' : 'skipped',
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
        i === action.index && !w.isLastWord
          ? { ...w, result: w.result === 'correct' ? ('skipped' as const) : ('correct' as const) }
          : w,
      );
      return { ...state, turnWords };
    }

    case 'CYCLE_LAST_WORD': {
      // Summary fix-up for the last word: explaining team → other teams → nobody → …
      if (state.phase !== 'summary') return state;
      const activeId = state.teams[state.currentTeamIndex].id;
      const order: (string | null)[] = [
        activeId,
        ...state.teams.filter((t) => t.id !== activeId).map((t) => t.id),
        null,
      ];
      const turnWords = state.turnWords.map((w) => {
        if (!w.isLastWord) return w;
        const next = order[(order.indexOf(w.guessedBy ?? null) + 1) % order.length];
        return { ...w, guessedBy: next, result: next === activeId ? ('correct' as const) : ('skipped' as const) };
      });
      return { ...state, turnWords };
    }

    case 'CONFIRM_TURN': {
      if (state.phase !== 'summary') return state;
      const activeId = state.teams[state.currentTeamIndex].id;
      const points = turnPoints(state.turnWords, state.settings, activeId);
      const thiefId = lastWordThief(state.turnWords, activeId);
      const previousScores = Object.fromEntries(state.teams.map((t) => [t.id, t.score]));
      const clamp = (n: number) => Math.min(state.settings.targetScore, Math.max(0, n));
      const teams = state.teams.map((t) => {
        if (t.id === activeId) return { ...t, score: clamp(t.score + points) };
        if (t.id === thiefId) return { ...t, score: clamp(t.score + 1) };
        return t;
      });
      // The explaining team is checked first, so it wins a tie on the finish square.
      const winner = [activeId, thiefId]
        .map((id) => teams.find((t) => t.id === id))
        .find((t) => t && t.score >= state.settings.targetScore);
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
        teams: state.teams.map((t) => ({ ...t, score: 0 })),
        deck: dealCards(),
      };

    case 'BACK_TO_SETUP':
      return { ...initialState, settings: state.settings, teams: state.teams.map((t) => ({ ...t, score: 0 })) };

    default:
      return state;
  }
}
