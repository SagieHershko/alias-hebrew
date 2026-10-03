import { useWindowDimensions } from 'react-native';

/** Below this height a landscape screen (a phone on its side) can't stack panels top and bottom. */
export const COMPACT_LANDSCAPE_MAX_HEIGHT = 520;

export function isCompactLandscape(width: number, height: number) {
  return width > height && height < COMPACT_LANDSCAPE_MAX_HEIGHT;
}

/** A phone held sideways: wide and short, so screens lay their parts out side by side. */
export function useCompactLandscape() {
  const { width, height } = useWindowDimensions();
  return isCompactLandscape(width, height);
}
