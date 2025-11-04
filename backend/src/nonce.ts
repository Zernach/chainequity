/**
 * Nonce Management System
 * Handles generation, storage, and validation of nonces for wallet signature verification
 * Prevents replay attacks by ensuring each nonce is single-use and time-limited
 */

import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const NONCE_EXPIRY_MS = parseInt(process.env.WALLET_NONCE_EXPIRY || '300000'); // 5 minutes default
const CLEANUP_INTERVAL_MS = 60000; // Cleanup every minute

export interface StoredNonce {
    nonce: string;
    createdAt: number;
    expiresAt: number;
    used: boolean;
    walletAddress?: string; // Optional: associate nonce with specific wallet
}

export interface NonceValidationResult {
    valid: boolean;
    error?: string;
    nonce?: string;
}

/**
 * In-memory nonce storage
 * For production, consider using Redis or a database for persistence across server restarts
 */
class NonceManager {
    private nonces: Map<string, StoredNonce> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.startCleanup();
    }

    /**
     * Generate a cryptographically secure nonce
     */
    generateNonce(): string {
        return crypto.randomBytes(32).toString('base64url');
    }

    /**
     * Store a nonce with expiry
     */
    storeNonce(nonce: string, walletAddress?: string): StoredNonce {
        const now = Date.now();
        const storedNonce: StoredNonce = {
            nonce,
            createdAt: now,
            expiresAt: now + NONCE_EXPIRY_MS,
            used: false,
            walletAddress,
        };

        this.nonces.set(nonce, storedNonce);
        console.log(`[Nonce] Stored nonce: ${nonce.substring(0, 8)}... (expires in ${NONCE_EXPIRY_MS / 1000}s)`);

        return storedNonce;
    }

    /**
     * Create and store a new nonce
     */
    createNonce(walletAddress?: string): StoredNonce {
        const nonce = this.generateNonce();
        return this.storeNonce(nonce, walletAddress);
    }

    /**
     * Validate and consume a nonce
     * Returns validation result and marks nonce as used if valid
     */
    validateAndConsume(nonce: string, walletAddress?: string): NonceValidationResult {
        const stored = this.nonces.get(nonce);

        // Check if nonce exists
        if (!stored) {
            return {
                valid: false,
                error: 'Invalid nonce: not found',
            };
        }

        // Check if already used
        if (stored.used) {
            return {
                valid: false,
                error: 'Invalid nonce: already used',
            };
        }

        // Check if expired
        const now = Date.now();
        if (now > stored.expiresAt) {
            this.nonces.delete(nonce);
            return {
                valid: false,
                error: 'Invalid nonce: expired',
            };
        }

        // Optional: Verify wallet address matches
        if (walletAddress && stored.walletAddress && stored.walletAddress !== walletAddress) {
            return {
                valid: false,
                error: 'Invalid nonce: wallet address mismatch',
            };
        }

        // Mark as used
        stored.used = true;
        this.nonces.set(nonce, stored);

        console.log(`[Nonce] Consumed nonce: ${nonce.substring(0, 8)}...`);

        return {
            valid: true,
            nonce,
        };
    }

    /**
     * Check if a nonce exists and is valid (without consuming it)
     */
    isValid(nonce: string): boolean {
        const stored = this.nonces.get(nonce);
        if (!stored || stored.used) {
            return false;
        }

        const now = Date.now();
        return now <= stored.expiresAt;
    }

    /**
     * Get nonce information
     */
    getNonce(nonce: string): StoredNonce | null {
        return this.nonces.get(nonce) || null;
    }

    /**
     * Remove a specific nonce
     */
    removeNonce(nonce: string): boolean {
        return this.nonces.delete(nonce);
    }

    /**
     * Clean up expired and used nonces
     */
    cleanup(): void {
        const now = Date.now();
        let removedCount = 0;

        for (const [nonce, stored] of this.nonces.entries()) {
            // Remove if expired or used for more than 1 hour
            if (now > stored.expiresAt || (stored.used && now - stored.createdAt > 3600000)) {
                this.nonces.delete(nonce);
                removedCount++;
            }
        }

        if (removedCount > 0) {
            console.log(`[Nonce] Cleaned up ${removedCount} expired/used nonce(s)`);
        }
    }

    /**
     * Start periodic cleanup
     */
    private startCleanup(): void {
        if (this.cleanupInterval) {
            return;
        }

        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, CLEANUP_INTERVAL_MS);

        // Ensure cleanup runs when process exits
        process.on('beforeExit', () => {
            this.stopCleanup();
        });
    }

    /**
     * Stop periodic cleanup
     */
    stopCleanup(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    /**
     * Get statistics about stored nonces
     */
    getStats(): {
        total: number;
        active: number;
        used: number;
        expired: number;
    } {
        const now = Date.now();
        let active = 0;
        let used = 0;
        let expired = 0;

        for (const stored of this.nonces.values()) {
            if (stored.used) {
                used++;
            } else if (now > stored.expiresAt) {
                expired++;
            } else {
                active++;
            }
        }

        return {
            total: this.nonces.size,
            active,
            used,
            expired,
        };
    }

    /**
     * Clear all nonces (useful for testing)
     */
    clearAll(): void {
        this.nonces.clear();
        console.log('[Nonce] Cleared all nonces');
    }
}

// Export singleton instance
export const nonceManager = new NonceManager();

/**
 * Helper function to parse and extract nonce from signature message
 */
export function extractNonceFromMessage(message: string): string | null {
    const nonceMatch = message.match(/Nonce:\s*([A-Za-z0-9_-]+)/);
    return nonceMatch ? nonceMatch[1] : null;
}

/**
 * Helper function to extract timestamp from signature message
 */
export function extractTimestampFromMessage(message: string): number | null {
    const timestampMatch = message.match(/Timestamp:\s*(\d+)/);
    return timestampMatch ? parseInt(timestampMatch[1]) : null;
}

/**
 * Validate timestamp is within acceptable window
 */
export function validateTimestamp(timestamp: number): boolean {
    const now = Date.now();
    const window = parseInt(process.env.WALLET_TIMESTAMP_WINDOW || '300000'); // 5 minutes default
    const diff = Math.abs(now - timestamp);

    return diff <= window;
}

