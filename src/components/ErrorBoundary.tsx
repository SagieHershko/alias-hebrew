import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import { BigButton } from './BigButton';

interface State {
  error: Error | null;
}

/**
 * If a screen crashes, show a friendly message instead of an empty screen.
 * The game state lives above this boundary, so "back to the game" keeps the score.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Alias crashed:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>אופס, משהו השתבש</Text>
        <Text style={styles.text}>הניקוד נשמר. אפשר לחזור למשחק ולהמשיך.</Text>
        <BigButton label="חזרה למשחק" variant="light" onPress={() => this.setState({ error: null })} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  title: { color: colors.white, fontSize: 28, fontWeight: '900', textAlign: 'center' },
  text: { color: colors.offWhite, fontSize: 17, textAlign: 'center' },
});
