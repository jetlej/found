// Mila - Light Theme with Elegant Typography
// Sans-serif for body text, cursive/serif for headings

export const colors = {
  // Backgrounds
  background: '#F0F0F0',
  surface: '#FFFFFF',
  surfaceSecondary: '#F5F5F5',
  
  // Text
  text: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  textPlaceholder: '#BBBBBB',
  
  // Accent / Interactive
  primary: '#000000',
  primaryText: '#FFFFFF',
  
  // Borders
  border: '#E5E5E5',
  borderFocused: '#000000',
  
  // Status
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

export const fonts = {
  // Body text
  sans: 'Figtree-Regular',
  sansBold: 'Figtree-Bold',
  // Headings
  serif: 'Figtree-Medium',
  serifBold: 'Figtree-Bold',
  serifItalic: 'Figtree-Regular',
  // Logo
  logo: 'Avigea',
  logoItalic: 'Avigea-Italic',
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// Common style patterns
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

// Shared text styles
export const textStyles = {
  pageTitle: {
    fontFamily: 'Figtree-Bold',
    fontSize: 18 as number,
    color: '#1A1A1A',
  },
} as const;
