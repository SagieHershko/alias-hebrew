import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

/** The speech-bubble logo from the box art: white-ringed red bubble with a tail. */
export function AliasLogo({ size = 180, subtitle }: { size?: number; subtitle?: string }) {
  const ring = Math.max(4, size * 0.035);
  return (
    <View style={{ width: size, height: size * 1.08, alignItems: 'center' }}>
      <View
        style={[
          styles.bubble,
          { width: size, height: size, borderRadius: size / 2, borderWidth: ring },
        ]}
      >
        <Text style={[styles.title, { fontSize: size * 0.3 }]} allowFontScaling={false}>
          אליאס
        </Text>
        {subtitle ? (
          <Text
            style={[styles.subtitle, { fontSize: size * 0.08, maxWidth: size * 0.7 }]}
            allowFontScaling={false}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.tail,
          {
            width: size * 0.16,
            height: size * 0.16,
            borderRightWidth: ring,
            borderBottomWidth: ring,
            top: size * 0.86,
            start: size * 0.16,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: colors.red,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  tail: {
    position: 'absolute',
    backgroundColor: colors.red,
    borderColor: colors.white,
    transform: [{ rotate: '45deg' }],
    zIndex: 1,
  },
  title: {
    color: colors.white,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    color: colors.white,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
});
