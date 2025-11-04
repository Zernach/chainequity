/**
 * useAuth Hook
 * Provides access to authentication context
 */

import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export function useAuth() {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}

/**
 * Helper hook to check if user has a specific role
 */
export function useHasRole(requiredRoles: string | string[]) {
    const { user } = useAuth();

    if (!user) return false;

    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.includes(user.role);
}

/**
 * Helper hook to check if user is admin
 */
export function useIsAdmin() {
    return useHasRole('admin');
}

/**
 * Helper hook to check if user is issuer or admin
 */
export function useCanManageSecurities() {
    return useHasRole(['admin', 'issuer']);
}

