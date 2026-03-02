import { useColorScheme } from 'nativewind';
import { colors, typography, spacing, radii, shadows, animation, type ColorPair } from './tokens';

export type ColorMode = 'light' | 'dark';

function resolve(pair: ColorPair, mode: ColorMode): string {
  return pair[mode];
}

export function useTheme() {
  const { colorScheme } = useColorScheme();
  const mode: ColorMode = colorScheme === 'dark' ? 'dark' : 'light';

  return {
    mode,
    colors: {
      background: {
        primary: resolve(colors.background.primary, mode),
        secondary: resolve(colors.background.secondary, mode),
        tertiary: resolve(colors.background.tertiary, mode),
        elevated: resolve(colors.background.elevated, mode),
      },
      text: {
        primary: resolve(colors.text.primary, mode),
        secondary: resolve(colors.text.secondary, mode),
        tertiary: resolve(colors.text.tertiary, mode),
        quaternary: resolve(colors.text.quaternary, mode),
      },
      system: {
        blue: resolve(colors.system.blue, mode),
        green: resolve(colors.system.green, mode),
        red: resolve(colors.system.red, mode),
        orange: resolve(colors.system.orange, mode),
        yellow: resolve(colors.system.yellow, mode),
        purple: resolve(colors.system.purple, mode),
        pink: resolve(colors.system.pink, mode),
        teal: resolve(colors.system.teal, mode),
        indigo: resolve(colors.system.indigo, mode),
      },
      gray: {
        1: resolve(colors.gray[1], mode),
        2: resolve(colors.gray[2], mode),
        3: resolve(colors.gray[3], mode),
        4: resolve(colors.gray[4], mode),
        5: resolve(colors.gray[5], mode),
        6: resolve(colors.gray[6], mode),
      },
      separator: resolve(colors.separator.opaque, mode),
      separatorNonOpaque: resolve(colors.separator.nonOpaque, mode),
      fill: {
        primary: resolve(colors.fill.primary, mode),
        secondary: resolve(colors.fill.secondary, mode),
        tertiary: resolve(colors.fill.tertiary, mode),
      },
      health: {
        heartRate: resolve(colors.health.heartRate, mode),
        sleep: resolve(colors.health.sleep, mode),
        activity: resolve(colors.health.activity, mode),
        energy: resolve(colors.health.energy, mode),
        mood: resolve(colors.health.mood, mode),
      },
      ring: colors.ring,
      score: {
        excellent: resolve(colors.score.excellent, mode),
        moderate: resolve(colors.score.moderate, mode),
        poor: resolve(colors.score.poor, mode),
      },
      brand: {
        primary: resolve(colors.brand.primary, mode),
        accent: resolve(colors.brand.accent, mode),
      },
    },
    typography,
    spacing,
    radii,
    shadows,
    animation,
  };
}

/** Get score color based on percentage (WHOOP traffic-light pattern) */
export function getScoreColor(percentage: number, mode: ColorMode): string {
  if (percentage >= 67) return resolve(colors.score.excellent, mode);
  if (percentage >= 34) return resolve(colors.score.moderate, mode);
  return resolve(colors.score.poor, mode);
}

/** Get score label based on percentage */
export function getScoreLabel(percentage: number): string {
  if (percentage >= 80) return 'Excellent';
  if (percentage >= 67) return 'Good';
  if (percentage >= 50) return 'Fair';
  if (percentage >= 34) return 'Low';
  return 'Rest';
}
