/**
 * Dark Mode Color Palette for ChainEquity
 * Consistent color system to avoid redefining colors throughout the app
 */

export const colors = {
    // Background colors
    background: {
        primary: '#0a0a0a',      // Main background
        secondary: '#141414',    // Card/section background
        tertiary: '#1e1e1e',     // Elevated elements
        overlay: 'rgba(0, 0, 0, 0.85)',
    },

    // Surface colors
    surface: {
        default: '#1e1e1e',
        elevated: '#252525',
        hover: '#2a2a2a',
        pressed: '#323232',
    },

    // Primary brand colors
    primary: {
        default: '#6366f1',      // Indigo
        light: '#818cf8',
        dark: '#4f46e5',
        contrast: '#ffffff',
    },

    // Secondary colors
    secondary: {
        default: '#8b5cf6',      // Purple
        light: '#a78bfa',
        dark: '#7c3aed',
        contrast: '#ffffff',
    },

    // Accent colors
    accent: {
        default: '#06b6d4',      // Cyan
        light: '#22d3ee',
        dark: '#0891b2',
        contrast: '#ffffff',
    },

    // Success colors
    success: {
        default: '#10b981',      // Green
        light: '#34d399',
        dark: '#059669',
        bg: 'rgba(16, 185, 129, 0.1)',
        contrast: '#ffffff',
    },

    // Error colors
    error: {
        default: '#ef4444',      // Red
        light: '#f87171',
        dark: '#dc2626',
        bg: 'rgba(239, 68, 68, 0.1)',
        contrast: '#ffffff',
    },

    // Warning colors
    warning: {
        default: '#f59e0b',      // Amber
        light: '#fbbf24',
        dark: '#d97706',
        bg: 'rgba(245, 158, 11, 0.1)',
        contrast: '#000000',
    },

    // Info colors
    info: {
        default: '#3b82f6',      // Blue
        light: '#60a5fa',
        dark: '#2563eb',
        bg: 'rgba(59, 130, 246, 0.1)',
        contrast: '#ffffff',
    },

    // Text colors
    text: {
        primary: '#ffffff',      // Main text
        secondary: '#a1a1aa',    // Secondary text
        tertiary: '#71717a',     // Disabled/subtle text
        inverse: '#0a0a0a',      // Text on light backgrounds
        link: '#818cf8',         // Links
        placeholder: '#52525b',  // Input placeholders
    },

    // Border colors
    border: {
        default: '#27272a',      // Default borders
        light: '#3f3f46',        // Lighter borders
        heavy: '#52525b',        // Emphasized borders
        focus: '#6366f1',        // Focus state
        error: '#ef4444',        // Error state
        success: '#10b981',      // Success state
    },

    // Status colors
    status: {
        approved: '#10b981',
        pending: '#f59e0b',
        rejected: '#ef4444',
        connected: '#10b981',
        disconnected: '#ef4444',
        active: '#06b6d4',
        inactive: '#71717a',
    },

    // Transparent overlays
    overlay: {
        light: 'rgba(255, 255, 255, 0.05)',
        medium: 'rgba(255, 255, 255, 0.1)',
        heavy: 'rgba(255, 255, 255, 0.15)',
        dark: 'rgba(0, 0, 0, 0.5)',
    },
} as const;

export type Colors = typeof colors;

