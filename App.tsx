import { Analytics } from '@vercel/analytics/react';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from './src/components/ErrorBoundary';
import { GameProvider, useGame } from './src/game/GameContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { OnlineScreen } from './src/screens/online/OnlineScreen';
import { SetupScreen } from './src/screens/SetupScreen';
import { GameStage } from './src/screens/stage/GameStage';
import { colors } from './src/theme';

type Mode = 'home' | 'local' | 'online';

/** Room code from an invite link (?room=ABCDE), web only. */
function roomFromUrl(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('room');
}

/**
 * Single-device game: setup is a regular form; everything after it happens on one
 * full-screen 3D table (GameStage), which swaps panels per phase.
 */
function LocalGame({ onExit }: { onExit: () => void }) {
  const { state } = useGame();
  return state.phase === 'setup' ? <SetupScreen onBack={onExit} /> : <GameStage />;
}

export default function App() {
  const [inviteCode] = useState(roomFromUrl);
  const [mode, setMode] = useState<Mode>(inviteCode ? 'online' : 'home');
  const home = () => setMode('home');

  return (
    <SafeAreaProvider>
      {/* direction: 'rtl' makes every row flow right-to-left immediately, even
          before I18nManager.forceRTL has taken effect (Expo Go, web). */}
      <View style={styles.root}>
        <ErrorBoundary>
          {mode === 'home' && <HomeScreen onLocal={() => setMode('local')} onOnline={() => setMode('online')} />}
          {mode === 'local' && (
            <GameProvider>
              <LocalGame onExit={home} />
            </GameProvider>
          )}
          {mode === 'online' && <OnlineScreen initialCode={inviteCode} onExit={home} />}
        </ErrorBoundary>
      </View>
      <StatusBar style="light" />
      {/* Vercel Web Analytics (page views); the web build is what's deployed on Vercel. */}
      {Platform.OS === 'web' && <Analytics />}
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
