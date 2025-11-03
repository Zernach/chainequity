/**
 * Input validation functions for ChainEquity backend
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Validate Solana public key
 */
export function isValidPublicKey(address: string): boolean {
    if (!address || typeof address !== 'string') {
        return false;
    }

    try {
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
}

/**
 * Alias for consistency with cap-table usage
 */
export const validatePublicKey = isValidPublicKey;

/**
 * Validate positive number
 */
export function isPositiveNumber(value: any): boolean {
    const num = Number(value);
    return !isNaN(num) && num > 0 && isFinite(num);
}

/**
 * Validate token amount (must be positive and within bounds)
 */
export function isValidTokenAmount(amount: any, decimals: number = 9): boolean {
    if (!isPositiveNumber(amount)) {
        return false;
    }

    const num = Number(amount);
    const maxAmount = Number.MAX_SAFE_INTEGER / Math.pow(10, decimals);

    return num <= maxAmount;
}

/**
 * Validate token symbol (3-10 uppercase letters)
 */
export function isValidSymbol(symbol: string): boolean {
    if (!symbol || typeof symbol !== 'string') {
        return false;
    }

    return /^[A-Z]{3,10}$/.test(symbol);
}

/**
 * Validate token name (2-50 characters)
 */
export function isValidTokenName(name: string): boolean {
    if (!name || typeof name !== 'string') {
        return false;
    }

    return name.length >= 2 && name.length <= 50;
}

/**
 * Validate split ratio (must be positive integer)
 */
export function isValidSplitRatio(ratio: any): boolean {
    const num = Number(ratio);
    return Number.isInteger(num) && num > 0 && num <= 1000;
}

/**
 * Validate decimals (0-9)
 */
export function isValidDecimals(decimals: any): boolean {
    const num = Number(decimals);
    return Number.isInteger(num) && num >= 0 && num <= 9;
}

/**
 * Sanitize string input (remove potentially dangerous characters)
 */
export function sanitizeString(input: string, maxLength: number = 255): string {
    if (!input || typeof input !== 'string') {
        return '';
    }

    return input
        .slice(0, maxLength)
        .replace(/[<>]/g, '') // Remove HTML tags
        .trim();
}

/**
 * Validate request body has required fields
 */
export function validateRequiredFields(
    body: Record<string, any>,
    fields: string[]
): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const field of fields) {
        if (body[field] === undefined || body[field] === null || body[field] === '') {
            missing.push(field);
        }
    }

    return {
        valid: missing.length === 0,
        missing,
    };
}

