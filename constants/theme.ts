export const THEME = {
  appName: 'Data Desk',
  tagline: 'Your Data, Your Way',
  colors: {
    // Primary — deep navy / indigo (cards, buttons, active states)
    primary: '#1C1C4E',
    primaryDark: '#14143A',
    primaryDeep: '#0E0E28',
    primaryLight: '#3A3A7A',
    primarySurface: '#EAEAFB', // light indigo tint for selected/active surfaces
    primarySurfaceAlt: '#F3F3FC',

    // Accent — gold (points)
    accent: '#F5C518',
    accentText: '#1A1B2E',
    gold: '#F5C518',
    goldSurface: '#FEF3C7',

    // Neutrals
    background: '#F4F5FB',
    card: '#FFFFFF',
    text: '#1A1B2E',
    textSecondary: '#8A8AA3',
    border: '#ECEDF5',
    tabBar: '#FFFFFF',
    overlay: 'rgba(14, 14, 40, 0.55)',

    // Status
    success: '#22C55E',
    successSurface: '#DCFCE7',
    error: '#EF4444',
    errorSurface: '#FEE2E2',
    warning: '#F59E0B',
    warningSurface: '#FEF3C7',

    // Misc
    white: '#FFFFFF',
    skeleton: '#E8E9F2',
  },

  // Pastel category palette (ad tiers, quick actions, network icons)
  category: {
    purple: { color: '#8B5CF6', surface: '#EDE9FE' },
    green: { color: '#22C55E', surface: '#DCFCE7' },
    blue: { color: '#3B82F6', surface: '#DBEAFE' },
    orange: { color: '#F97316', surface: '#FFEDD5' },
    gold: { color: '#F5C518', surface: '#FEF3C7' },
    red: { color: '#EF4444', surface: '#FEE2E2' },
  },

  borderRadius: {
    card: 20,
    button: 14,
    pill: 50,
    input: 14,
    badge: 20,
    small: 10,
    xl: 26,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 30,
    hero: 40,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },
  shadow: {
    small: {
      shadowColor: '#1A1B2E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    medium: {
      shadowColor: '#1A1B2E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    large: {
      shadowColor: '#1C1C4E',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.22,
      shadowRadius: 24,
      elevation: 10,
    },
    glow: {
      shadowColor: '#F5C518',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 14,
      elevation: 6,
    },
  },
};
