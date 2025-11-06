/**
 * Transfers Handler
 * Handles token transfer history operations
 */

import { BaseClient } from './base';
import type { TransferHistoryResponse } from '../types';

export class TransfersHandler extends BaseClient {
    /**
     * Get transfer history for a token
     */
    async getTransferHistory(tokenMint: string): Promise<TransferHistoryResponse> {
        return this.get<TransferHistoryResponse>(`/transfers/${tokenMint}`, true);
    }
}

