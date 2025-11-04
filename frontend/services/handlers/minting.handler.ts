/**
 * Minting Handler
 * Handles token minting operations
 */

import { BaseClient } from './base';
import type { MintTokenRequest, MintTokenResponse } from '../types';

export class MintingHandler extends BaseClient {
    /**
     * Mint tokens to a wallet
     */
    async mintTokens(data: MintTokenRequest): Promise<MintTokenResponse> {
        return this.post<MintTokenResponse>('/admin/mint', data);
    }
}

