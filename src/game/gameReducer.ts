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

/** Points earned in a turn: +1 per correct word, and optionally -1 per skip. */
export function turnPoints(turnWords: TurnWord[], settings: Settings): number {
  return turnWords.reduce((sum, w) => {
    if (w.result === 'correct') return sum + 1;
    return settings.skipPenalty ? sum - 1 : sum;
  }, 0);
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
      // The "last word" is answered after the timer ran out: no new card, go straight to the summary.
      if (action.isLastWord) {
        return { ...state, phase: 'summary', turnWords, currentWord: null };
      }
      const { word, deck } = drawWord(state.deck, turnWords);
      return { ...state, turnWords, currentWord: word, deck };
    }

    case 'END_TURN': {
      if (state.phase !== 'turn') return state;
      // An unanswered card on screen is simply discarded (it is not scored either way).
      return { ...state, phase: 'summary', currentWord: null };
    }

    case 'TOGGLE_WORD': {
      if (state.phase !== 'summary') return state;
      const turnWords = state.turnWords.map((w, i) =>
        i === action.index
          ? { ...w, result: w.result === 'correct' ? ('skipped' as const) : ('correct' as const) }
          : w,
      );
      return { ...state, turnWords };
    }

    case 'CONFIRM_TURN': {
      if (state.phase !== 'summary') return state;
      const points = turnPoints(state.turnWords, state.settings);
      const teams = state.teams.map((t, i) =>
        i === state.currentTeamIndex
          ? { ...t, score: Math.min(state.settings.targetScore, Math.max(0, t.score + points)) }
          : t,
      );
      const active = teams[state.currentTeamIndex];
      if (active.score >= state.settings.targetScore) {
        return { ...state, teams, phase: 'winner', winnerId: active.id, turnWords: [] };
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
