export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  '2xl': 40,
  xxxl: 48,
} as const;

export const radii = {
  sm: 6,
  md: 14,
  lg: 20,
  xl: 24,
  xxl: 32,
  full: 9999,
} as const;

export const typography = {
  display: { fontSize: 40, lineHeight: 48, fontWeight: '800' as const },
  h1: { fontSize: 32, lineHeight: 40, fontWeight: '800' as const },
  h2: { fontSize: 22, lineHeight: 30, fontWeight: '600' as const },
  h3: { fontSize: 18, lineHeight: 26, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const, letterSpacing: 0.15 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  button: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  mono: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const, fontFamily: 'monospace' },
} as const;

export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceVariant: string;
  surfaceElevated: string;
  primary: string;
  primaryContainer: string;
  onPrimary: string;
  secondary: string;
  secondaryContainer: string;
  accent: string;
  error: string;
  errorContainer: string;
  onError: string;
  success: string;
  successContainer: string;
  warning: string;
  warningContainer: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  textInverse: string;
  border: string;
  borderFocused: string;
  overlay: string;
  skeleton: string;
  headerBackground: string;
  headerText: string;
  tabBar: string;
  tabBarBorder: string;
  gridIconBg: string;
  gradientStart: string;
  gradientEnd: string;
  cardGlow: string;
  inputBackground: string;
  inputBorder: string;
  badgeBg: string;
  badgeText: string;
  shimmer: string;
  cardBorder: string;
}

export interface ShadowTokens {
  card: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  modal: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
}

export interface Theme {
  dark: boolean;
  colors: ColorTokens;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  shadows: ShadowTokens;
  iconSize: typeof iconSize;
}
