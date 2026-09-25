import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GameProvider, useGame } from './src/game/GameContext';
import { GameScreen } from './src/screens/GameScreen';
import { ScoreboardScreen } from './src/screens/ScoreboardScreen';
import { SetupScreen } from './src/screens/SetupScreen';
import { TurnSummaryScreen } from './src/screens/TurnSummaryScreen';
import { WinnerScreen } from './src/screens/WinnerScreen';
import { colors } from './src/theme';

/**
 * The game is a linear state machine (setup → scoreboard → turn → summary → …),
 * so the current phase in the game state decides which screen is shown.
 * A fresh <GameScreen> is mounted for every turn, which resets its timer.
 */
function CurrentScreen() {
  const { state } = useGame();
  switch (state.phase) {
    case 'setup':
      return <SetupScreen />;
    case 'scoreboard':
      return <ScoreboardScreen />;
    case 'turn':
      return <GameScreen />;
    case 'summary':
      return <TurnSummaryScreen />;
    case 'winner':
      return <WinnerScreen />;
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        {/* direction: 'rtl' makes every row flow right-to-left immediately, even
            before I18nManager.forceRTL has taken effect (Expo Go, web). */}
        <View style={styles.root}>
          <CurrentScreen />
        </View>
        <StatusBar style="light" />
      </GameProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    direction: 'rtl',
    backgroundColor: colors.red,
  },
});
