import { createContext, useContext, useReducer, type ReactNode } from 'react';

import { gameReducer, initialState } from './gameReducer';
import type { GameAction, GameState, Player } from './types';

/** Extra information when the game is played online, each player on their own phone. */
export interface OnlineInfo {
  roomCode: string;
  inviteUrl: string;
  me: Player;
  isHost: boolean;
  myTeamId: string | null;
  /** Who explains this turn. */
  explainer: Player | null;
  amExplainer: boolean;
  /** May this device run the turn (the explainer; the host if the explainer is gone). */
  canControlTurn: boolean;
  leave: () => void;
}

export interface GameContextValue {
  state: GameState;
  dispatch: (action: GameAction) => void;
  /** null for a single-device game. */
  online: OnlineInfo | null;
}

export const GameContext = createContext<GameContextValue | null>(null);

/** Single-device game: plain local state. */
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  return <GameContext.Provider value={{ state, dispatch, online: null }}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside a game provider');
  return ctx;
}
