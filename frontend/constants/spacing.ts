/**
 * Spacing Scale for ChainEquity
 * Consistent spacing system using 4px base unit
 */

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
    '4xl': 96,
} as const;

export type Spacing = typeof spacing;

