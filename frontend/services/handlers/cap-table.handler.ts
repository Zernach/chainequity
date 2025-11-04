/**
 * Cap Table Handler
 * Handles capitalization table operations
 */

import { BaseClient } from './base';
import type { CapTableResponse } from '../types';

export class CapTableHandler extends BaseClient {
    /**
     * Get cap table for a token
     */
    async getCapTable(
        tokenMint: string,
        blockHeight?: number
    ): Promise<CapTableResponse> {
        const endpoint = blockHeight
            ? `/cap-table/${tokenMint}/${blockHeight}`
            : `/cap-table/${tokenMint}`;
        return this.get<CapTableResponse>(endpoint);
    }

    /**
     * Export cap table
     */
    async exportCapTable(
        tokenMint: string,
        format: 'csv' | 'json'
    ): Promise<{ success: boolean; data: string }> {
        return this.post(`/cap-table/${tokenMint}/export`, { format });
    }
}

