import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { currentTeam } from '../../game/gameReducer';
import { useGame } from '../../game/GameContext';
import { initSounds } from '../../sound/sounds';
import { Board3D, createView, resetView, type OrbitView, type SandState } from '../../three/Board3D';
import { ScoreboardPanel } from './ScoreboardPanel';
import { SummaryPanel } from './SummaryPanel';
import { TurnPanel } from './TurnPanel';
import { StageInsetsContext, type StageInsets } from './stageInsets';
import { WinnerPanel } from './WinnerPanel';

/**
 * The whole game after setup happens on one full-screen 3D table. The board,
 * pawns, decks and sand timer stay put; each phase only swaps the panels on top.
 */
export function GameStage() {
  const { state } = useGame();
  const view = useRef<OrbitView>(createView());
  const sand = useRef<SandState>({ turnId: 0, progress: 1 });
  // Card flights are triggered by the turn panel, once the timer has flipped.
  const [cardFlights, setCardFlights] = useState(0);
  const next = currentTeam(state)!;
  useEffect(initSounds, []);
  const insets = useMemo<StageInsets>(
    () => ({
      // Block bodies: these must return nothing (callers may use them as effect bodies).
      onTopLayout: (e) => {
        view.current.insetTop = e.nativeEvent.layout.height;
      },
      onBottomLayout: (e) => {
        view.current.insetBottom = e.nativeEvent.layout.height;
      },
      setTop: (px) => {
        view.current.insetTop = px;
      },
      setBottom: (px) => {
        view.current.insetBottom = px;
      },
    }),
    [],
  );

  return (
    <View style={styles.root}>
      <Board3D
        style={StyleSheet.absoluteFill}
        interactive
        view={view}
        sand={sand}
        teams={state.teams}
        target={state.settings.targetScore}
        activeTeamId={state.phase === 'winner' ? undefined : next.id}
        winnerId={state.winnerId}
        fromScores={state.previousScores}
        cardsDrawn={cardFlights}
        stealSquares={state.stealSquares}
      />
      <StageInsetsContext.Provider value={insets}>
        {state.phase === 'scoreboard' && <ScoreboardPanel onResetView={() => resetView(view.current)} />}
        {state.phase === 'turn' && <TurnPanel sand={sand} onCardShown={setCardFlights} />}
        {state.phase === 'summary' && <SummaryPanel />}
        {state.phase === 'winner' && <WinnerPanel />}
      </StageInsetsContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2A2C31' },
});
