import { WORDS } from '../data/words';
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
  currentWord: null,
  turnWords: [],
  winnerId: null,
};

export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Draws the next card. When the deck runs out it is reshuffled, avoiding words already seen this turn. */
function drawWord(deck: string[], turnWords: TurnWord[]): { word: string; deck: string[] } {
  let source = deck;
  if (source.length === 0) {
    const seen = new Set(turnWords.map((w) => w.word));
    source = shuffle(WORDS.filter((w) => !seen.has(w)));
    if (source.length === 0) source = shuffle(WORDS);
  }
  const [word, ...rest] = source;
  return { word, deck: rest };
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
        deck: shuffle(WORDS),
      };
    }

    case 'BEGIN_TURN': {
      if (state.phase !== 'scoreboard') return state;
      const { word, deck } = drawWord(state.deck, []);
      return { ...state, phase: 'turn', currentWord: word, deck, turnWords: [] };
    }

    case 'ANSWER': {
      if (state.phase !== 'turn' || state.currentWord === null) return state;
      const turnWords = [...state.turnWords, { word: state.currentWord, result: action.result }];
      const { word, deck } = drawWord(state.deck, turnWords);
      return { ...state, turnWords, currentWord: word, deck };
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
      return { ...state, phase: 'summary', turnWords: [...state.turnWords, lastWord], currentWord: null };
    }

    case 'END_TURN': {
      if (state.phase !== 'turn') return state;
      // An unanswered card on screen is simply discarded (it is not scored either way).
      return { ...state, phase: 'summary', currentWord: null };
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
        return { ...state, teams, phase: 'winner', winnerId: winner.id, turnWords: [] };
      }
      const nextIndex = (state.currentTeamIndex + 1) % teams.length;
      return {
        ...state,
        teams,
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
        deck: shuffle(WORDS),
      };

    case 'BACK_TO_SETUP':
      return { ...initialState, settings: state.settings, teams: state.teams.map((t) => ({ ...t, score: 0 })) };

    default:
      return state;
  }
}
