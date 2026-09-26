import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GameProvider, useGame } from './src/game/GameContext';
import { SetupScreen } from './src/screens/SetupScreen';
import { GameStage } from './src/screens/stage/GameStage';
import { colors } from './src/theme';

/**
 * Setup is a regular form; everything after it happens on one full-screen 3D
 * table (GameStage), which swaps panels per phase: board → turn → summary → …
 */
function CurrentScreen() {
  const { state } = useGame();
  return state.phase === 'setup' ? <SetupScreen /> : <GameStage />;
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
