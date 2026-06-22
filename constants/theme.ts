export const THEME = {
  appName: 'Data Desk',
  tagline: 'Your Data, Your Way',
  colors: {
    // Greens — primary brand family
    primary: '#16A34A', // green-600, main brand
    primaryDark: '#15803D', // green-700
    primaryDeep: '#14532D', // green-900, deep gradient end / dark text accents
    primaryLight: '#4ADE80', // green-400, bright spring green
    primarySurface: '#E7F8EE', // soft green tint for selected/active surfaces
    primarySurfaceAlt: '#F0FBF4', // even softer green wash

    // Accent — bright spring green for CTAs / points
    accent: '#4ADE80',
    accentText: '#14532D', // deep green text that sits on accent

    // Neutrals
    background: '#F4FBF6', // near-white with a green tint
    card: '#FFFFFF',
    text: '#0F231A', // deep forest navy
    textSecondary: '#5F7268', // muted green-grey
    border: '#DCEDE2', // soft green-grey border
    tabBar: '#FFFFFF',
    overlay: 'rgba(8, 28, 18, 0.55)',

    // Status
    success: '#22C55E',
    error: '#EF4444',
    errorSurface: '#FEF2F2',
    warning: '#F59E0B',
    warningSurface: '#FFFBEB',
    successSurface: '#F0FDF4',

    // Misc
    white: '#FFFFFF',
    skeleton: '#E3EFE7',
  },
  // Tier gradients (deep → bright green) used by ad cards
  gradients: {
    premium: ['#15803D', '#14532D'],
    standard: ['#16A34A', '#15803D'],
    basic: ['#22C55E', '#16A34A'],
    mini: ['#4ADE80', '#22C55E'],
    brand: ['#22C55E', '#15803D'],
  },
  borderRadius: {
    card: 18,
    button: 50,
    input: 14,
    badge: 22,
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
    hero: 38,
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
      shadowColor: '#0F231A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 5,
      elevation: 2,
    },
    medium: {
      shadowColor: '#0F231A',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.09,
      shadowRadius: 12,
      elevation: 4,
    },
    large: {
      shadowColor: '#16A34A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 16,
      elevation: 8,
    },
    glow: {
      shadowColor: '#22C55E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 6,
    },
  },
};
