import { Response } from 'express';
import {
    generateCapTable,
    exportCapTableCSV,
    exportCapTableJSON,
    getTransferHistory,
    getHolderCountHistory,
    getConcentrationMetrics,
} from '../cap-table';
import { AuthRequest } from '../types/auth.types';

/**
 * Get current cap table for a token
 * GET /cap-table/:mintAddress
 */
export async function getCapTable(req: AuthRequest, res: Response) {
    try {
        const { mintAddress } = req.params;
        const capTable = await generateCapTable(mintAddress);

        res.json({
            success: true,
            data: capTable,
        });
    } catch (error) {
        console.error('Error generating cap table:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
}

/**
 * Get historical cap table at a specific block height
 * GET /cap-table/:mintAddress/:blockHeight
 */
export async function getHistoricalCapTable(req: AuthRequest, res: Response) {
    try {
        const { mintAddress, blockHeight } = req.params;
        const blockHeightNum = parseInt(blockHeight, 10);

        if (isNaN(blockHeightNum) || blockHeightNum < 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid block height',
            });
        }

        const capTable = await generateCapTable(mintAddress, blockHeightNum);

        return res.json({
            success: true,
            data: capTable,
        });
    } catch (error) {
        console.error('Error generating historical cap table:', error);
        return res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
}

/**
 * Export cap table as CSV or JSON
 * POST /cap-table/:mintAddress/export
 */
export async function exportCapTable(req: AuthRequest, res: Response) {
    try {
        const { mintAddress } = req.params;
        const { format = 'json', blockHeight = null } = req.body;

        const capTable = await generateCapTable(mintAddress, blockHeight);

        if (format === 'csv') {
            const csv = exportCapTableCSV(capTable);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="cap-table-${mintAddress}-${Date.now()}.csv"`
            );
            return res.send(csv);
        } else if (format === 'json') {
            const json = exportCapTableJSON(capTable);
            res.setHeader('Content-Type', 'application/json');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="cap-table-${mintAddress}-${Date.now()}.json"`
            );
            return res.send(json);
        } else {
            return res.status(400).json({
                success: false,
                error: 'Invalid format. Use "csv" or "json"',
            });
        }
    } catch (error) {
        console.error('Error exporting cap table:', error);
        return res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
}

/**
 * Get transfer history for a token
 * GET /transfers/:mintAddress
 */
export async function getTransfers(req: AuthRequest, res: Response) {
    try {
        const { mintAddress } = req.params;
        const { limit, offset, from, to } = req.query;

        const options = {
            limit: limit ? parseInt(limit as string, 10) : 100,
            offset: offset ? parseInt(offset as string, 10) : 0,
            fromWallet: (from as string) || null,
            toWallet: (to as string) || null,
        };

        const result = await getTransferHistory(mintAddress, options);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('Error fetching transfer history:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
}

/**
 * Get holder count history over time
 * GET /cap-table/:mintAddress/history/holder-count
 */
export async function getHolderHistory(req: AuthRequest, res: Response) {
    try {
        const { mintAddress } = req.params;
        const history = await getHolderCountHistory(mintAddress);

        res.json({
            success: true,
            data: history,
        });
    } catch (error) {
        console.error('Error fetching holder count history:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
}

/**
 * Get concentration metrics (top holders, Gini coefficient)
 * GET /cap-table/:mintAddress/metrics/concentration
 */
export async function getConcentration(req: AuthRequest, res: Response) {
    try {
        const { mintAddress } = req.params;
        const metrics = await getConcentrationMetrics(mintAddress);

        res.json({
            success: true,
            data: metrics,
        });
    } catch (error) {
        console.error('Error calculating concentration metrics:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
}

/**
 * Create a cap table snapshot
 * POST /cap-table/:mintAddress/snapshots
 * Body: { block_height?: number, reason?: string }
 */
export async function createSnapshot(req: AuthRequest, res: Response) {
    try {
        const { mintAddress } = req.params;
        const { block_height = null, reason = 'Manual snapshot' } = req.body;

        // Import the function dynamically
        const { createCapTableSnapshot } = await import('../cap-table');
        
        const snapshot = await createCapTableSnapshot(mintAddress, block_height, reason);

        res.json({
            success: true,
            data: snapshot,
        });
    } catch (error) {
        console.error('Error creating snapshot:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
}

/**
 * List all cap table snapshots for a token
 * GET /cap-table/:mintAddress/snapshots
 */
export async function listSnapshots(req: AuthRequest, res: Response) {
    try {
        const { mintAddress } = req.params;

        // Import the function dynamically
        const { listCapTableSnapshots } = await import('../cap-table');
        
        const snapshots = await listCapTableSnapshots(mintAddress);

        res.json({
            success: true,
            data: snapshots,
            count: snapshots.length,
        });
    } catch (error) {
        console.error('Error listing snapshots:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
}

/**
 * Get a specific cap table snapshot by block height
 * GET /cap-table/:mintAddress/snapshots/:blockHeight
 */
export async function getSnapshot(req: AuthRequest, res: Response) {
    try {
        const { mintAddress, blockHeight } = req.params;
        const blockHeightNum = parseInt(blockHeight, 10);

        if (isNaN(blockHeightNum) || blockHeightNum < 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid block height',
            });
        }

        // Import the function dynamically
        const { getCapTableSnapshot } = await import('../cap-table');
        
        const snapshot = await getCapTableSnapshot(mintAddress, blockHeightNum);

        return res.json({
            success: true,
            data: snapshot,
        });
    } catch (error) {
        console.error('Error getting snapshot:', error);
        return res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
}

