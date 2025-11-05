/**
 * Corporate Actions Handler
 * Handles corporate action operations like stock splits and symbol changes
 */

import { BaseClient } from './base';
import type {
    StockSplitRequest,
    StockSplitResponse,
    ChangeSymbolRequest,
    ChangeSymbolResponse,
} from '../types';

export class CorporateActionsHandler extends BaseClient {
    /**
     * Execute a stock split
     */
    async executeStockSplit(data: StockSplitRequest): Promise<StockSplitResponse> {
        return this.post<StockSplitResponse>(
            '/admin/corporate-actions/split',
            data,
            true
        );
    }

    /**
     * Change token symbol
     */
    async changeSymbol(data: ChangeSymbolRequest): Promise<ChangeSymbolResponse> {
        return this.post<ChangeSymbolResponse>(
            '/admin/corporate-actions/change-symbol',
            data,
            true
        );
    }
}

