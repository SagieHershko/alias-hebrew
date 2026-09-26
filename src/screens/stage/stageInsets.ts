import { createContext, useContext, useEffect } from 'react';
import type { LayoutChangeEvent } from 'react-native';

export interface StageInsets {
  onTopLayout: (e: LayoutChangeEvent) => void;
  onBottomLayout: (e: LayoutChangeEvent) => void;
  setTop: (px: number) => void;
  setBottom: (px: number) => void;
}

const noop = () => {};
export const StageInsetsContext = createContext<StageInsets>({
  onTopLayout: noop,
  onBottomLayout: noop,
  setTop: noop,
  setBottom: noop,
});

/**
 * Panels tell the 3D table how much of the screen they cover (via onLayout of their
 * top / bottom parts), so the camera fits the whole board into the space in between.
 * A panel without a top or bottom part clears that inset when it appears.
 */
export function useStageInsets(parts: { top: boolean; bottom: boolean }) {
  const insets = useContext(StageInsetsContext);
  useEffect(() => {
    if (!parts.top) insets.setTop(0);
    if (!parts.bottom) insets.setBottom(0);
  }, [insets, parts.top, parts.bottom]);
  return insets;
}
