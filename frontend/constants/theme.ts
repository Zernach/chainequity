/**
 * Centralized Theme for ChainEquity
 * Combines colors, spacing, typography, and other design tokens
 */

import { colors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';

export const theme = {
    colors,
    spacing,
    typography,

    // Border radius
    radius: {
        none: 0,
        sm: 4,
        base: 6,
        md: 8,
        lg: 12,
        xl: 16,
        '2xl': 24,
        full: 9999,
    },

    // Shadows
    shadow: {
        none: {
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
        },
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 2,
        },
        base: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 4,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 6,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 8,
        },
    },

    // Opacity levels
    opacity: {
        disabled: 0.4,
        hover: 0.8,
        pressed: 0.6,
    },

    // Z-index layers
    zIndex: {
        base: 0,
        dropdown: 1000,
        sticky: 1020,
        fixed: 1030,
        modalBackdrop: 1040,
        modal: 1050,
        popover: 1060,
        tooltip: 1070,
    },
} as const;

export type Theme = typeof theme;

