// Classic Alias box / board palette: vibrant red with white.
export const colors = {
  red: '#E30613',
  redDark: '#B0000E',
  redDeep: '#7A0009',
  white: '#FFFFFF',
  offWhite: '#FFF5F5',
  ink: '#1A1A1A',
  muted: '#8A8A8A',
  correct: '#1FA84F',
  correctDark: '#15803B',
  skip: '#D32F2F',
  skipDark: '#9A1B1B',
  gold: '#FFC107',
  overlay: 'rgba(0,0,0,0.25)',
} as const;

// Pawn colours, picked to stay visible on both the red board and white squares.
export const TEAM_COLORS = [
  '#FFC107', // צהוב
  '#1E63D6', // כחול
  '#1FA84F', // ירוק
  '#212121', // שחור
  '#8E24AA', // סגול
  '#FF7A00', // כתום
] as const;

export const TEAM_COLOR_NAMES = ['צהוב', 'כחול', 'ירוק', 'שחור', 'סגול', 'כתום'] as const;

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

export const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 5,
} as const;
