/**
 * Design Tokens — Single source of truth for all visual values.
 *
 * References:
 *  - Apple iOS System Colors (HIG)
 *  - Apple Health category colors
 *  - WHOOP traffic-light scoring
 *  - Apple 8pt spacing grid
 *  - Apple SF Pro typography scale (mapped to Inter)
 */

// ── Color System ────────────────────────────────────────────────────

export type ColorPair = { light: string; dark: string };

export const colors = {
  // Semantic Backgrounds (Apple systemGroupedBackground hierarchy)
  background: {
    primary: { light: '#F2F2F7', dark: '#000000' } as ColorPair,
    secondary: { light: '#FFFFFF', dark: '#1C1C1E' } as ColorPair,
    tertiary: { light: '#F2F2F7', dark: '#2C2C2E' } as ColorPair,
    elevated: { light: '#FFFFFF', dark: '#2C2C2E' } as ColorPair,
  },

  // Semantic Text (Apple label hierarchy)
  text: {
    primary: { light: '#000000', dark: '#FFFFFF' } as ColorPair,
    secondary: { light: '#3C3C43', dark: '#EBEBF5' } as ColorPair,
    tertiary: { light: '#3C3C4399', dark: '#EBEBF599' } as ColorPair,
    quaternary: { light: '#3C3C434D', dark: '#EBEBF54D' } as ColorPair,
  },

  // iOS System Colors (light/dark pairs from Apple HIG)
  system: {
    blue: { light: '#007AFF', dark: '#0A84FF' } as ColorPair,
    green: { light: '#34C759', dark: '#30D158' } as ColorPair,
    red: { light: '#FF3B30', dark: '#FF453A' } as ColorPair,
    orange: { light: '#FF9500', dark: '#FF9F0A' } as ColorPair,
    yellow: { light: '#FFCC00', dark: '#FFD60A' } as ColorPair,
    purple: { light: '#AF52DE', dark: '#BF5AF2' } as ColorPair,
    pink: { light: '#FF2D55', dark: '#FF375F' } as ColorPair,
    teal: { light: '#5AC8FA', dark: '#64D2FF' } as ColorPair,
    indigo: { light: '#5856D6', dark: '#5E5CE6' } as ColorPair,
  },

  // System Grays
  gray: {
    1: { light: '#8E8E93', dark: '#8E8E93' } as ColorPair,
    2: { light: '#AEAEB2', dark: '#636366' } as ColorPair,
    3: { light: '#C7C7CC', dark: '#48484A' } as ColorPair,
    4: { light: '#D1D1D6', dark: '#3A3A3C' } as ColorPair,
    5: { light: '#E5E5EA', dark: '#2C2C2E' } as ColorPair,
    6: { light: '#F2F2F7', dark: '#1C1C1E' } as ColorPair,
  },

  // Separators
  separator: {
    opaque: { light: '#C6C6C8', dark: '#38383A' } as ColorPair,
    nonOpaque: { light: '#3C3C4349', dark: '#54545860' } as ColorPair,
  },

  // Fill colors
  fill: {
    primary: { light: '#78788033', dark: '#7878805C' } as ColorPair,
    secondary: { light: '#78788028', dark: '#78788052' } as ColorPair,
    tertiary: { light: '#7676801F', dark: '#7676803D' } as ColorPair,
  },

  // Health-specific metric colors (Apple Health category colors)
  health: {
    heartRate: { light: '#FF2D55', dark: '#FF375F' } as ColorPair,
    sleep: { light: '#5856D6', dark: '#5E5CE6' } as ColorPair,
    activity: { light: '#34C759', dark: '#30D158' } as ColorPair,
    energy: { light: '#FF9500', dark: '#FF9F0A' } as ColorPair,
    mood: { light: '#5AC8FA', dark: '#64D2FF' } as ColorPair,
    mindfulness: { light: '#5AC8FA', dark: '#64D2FF' } as ColorPair,
    nutrition: { light: '#34C759', dark: '#30D158' } as ColorPair,
  },

  // Apple Activity Ring colors (single values, always on dark bg)
  ring: {
    move: '#FA114F',
    exercise: '#92E82A',
    stand: '#1EEAEF',
  },

  // Score traffic-light (WHOOP pattern)
  score: {
    excellent: { light: '#34C759', dark: '#30D158' } as ColorPair, // 67-100%
    moderate: { light: '#FF9500', dark: '#FF9F0A' } as ColorPair,  // 34-66%
    poor: { light: '#FF3B30', dark: '#FF453A' } as ColorPair,      // 0-33%
  },

  // Brand (minimal, Apple approach)
  brand: {
    primary: { light: '#007AFF', dark: '#0A84FF' } as ColorPair,
    accent: { light: '#AF52DE', dark: '#BF5AF2' } as ColorPair,
  },
} as const;

// ── Typography ──────────────────────────────────────────────────────
// Apple SF Pro scale mapped to Inter

export type TypographyStyle = {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
  fontFamily: string;
};

export const typography = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' as const, fontFamily: 'Inter-Bold' },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, fontFamily: 'Inter-Bold' },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, fontFamily: 'Inter-Bold' },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' as const, fontFamily: 'Inter-SemiBold' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const, fontFamily: 'Inter-SemiBold' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' as const, fontFamily: 'Inter-Regular' },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' as const, fontFamily: 'Inter-Regular' },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const, fontFamily: 'Inter-Regular' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const, fontFamily: 'Inter-Regular' },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const, fontFamily: 'Inter-Regular' },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '400' as const, fontFamily: 'Inter-Regular' },
} as const;

// ── Spacing ─────────────────────────────────────────────────────────
// Apple 8pt grid

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  screenHorizontal: 16,
  cardPadding: 16,
  sectionGap: 24,
} as const;

// ── Corner Radius ───────────────────────────────────────────────────

export const radii = {
  sm: 8,
  md: 10,   // Apple standard for cards
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

// ── Shadows ─────────────────────────────────────────────────────────

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

// ── Animation ───────────────────────────────────────────────────────
// Apple WWDC23 spring recommendations

export const animation = {
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  springFast: {
    damping: 20,
    stiffness: 300,
    mass: 0.8,
  },
  springBouncy: {
    damping: 12,
    stiffness: 150,
    mass: 1,
  },
  timing: {
    fast: 200,
    normal: 350,
    slow: 500,
  },
  minTouchTarget: 44,
} as const;
