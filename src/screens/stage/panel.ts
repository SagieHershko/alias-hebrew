import { StyleSheet } from 'react-native';

import { colors, radius } from '../../theme';

/** Shared look of the panels floating over the 3D table. */
export const GLASS = 'rgba(18,18,22,0.62)';

export const panel = StyleSheet.create({
  layer: { position: 'absolute', top: 0, bottom: 0, start: 0, end: 0 },
  top: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 8,
    backgroundColor: GLASS,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 10,
    backgroundColor: GLASS,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  title: { color: colors.white, fontSize: 24, fontWeight: '900' },
  subtitle: { color: '#D8D8DC', fontSize: 14, fontWeight: '700' },
  text: { color: colors.white, fontSize: 18, textAlign: 'center' },
  hint: { color: '#C9C9CF', fontSize: 13, textAlign: 'center' },
  bold: { fontWeight: '900' },
  iconBtn: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { color: colors.white, fontSize: 18, fontWeight: '900' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 2,
    borderColor: 'transparent',
    maxWidth: '48%',
  },
  chipActive: { borderColor: colors.gold },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.white },
  chipName: { color: colors.white, fontWeight: '800', fontSize: 15, flexShrink: 1 },
  chipScore: { color: colors.gold, fontWeight: '900', fontSize: 16 },
});
