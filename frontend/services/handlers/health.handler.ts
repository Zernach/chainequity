/**
 * Health Handler
 * Handles health check operations
 */

import { BaseClient } from './base';

export class HealthHandler extends BaseClient {
    /**
     * Check API health
     */
    async health(): Promise<{ status: string; message: string; timestamp: string }> {
        return this.get('/health');
    }
}

