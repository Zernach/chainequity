import { supabaseAdmin } from './db';
import { logger } from './utils/logger';
import { validatePublicKey } from './utils/validators';
import {
    Security,
    TokenBalance,
    Allowlist,
    CapTableSnapshot as DbCapTableSnapshot,
} from './types/database.types';
import {
    CapTableData,
    CapTableHolder,
    TransferHistoryOptions,
    TransferHistoryResult,
    ConcentrationMetrics,
} from './types/cap-table.types';

/**
 * Cap Table Generator
 * Generates cap tables from indexed blockchain data
 */

/**
 * Generate cap table for a token at a specific block height
 */
export async function generateCapTable(
    mintAddress: string,
    blockHeight: number | null = null
): Promise<CapTableData> {
    logger.info('Generating cap table', { mintAddress, blockHeight });

    // Validate mint address
    if (!validatePublicKey(mintAddress)) {
        throw new Error('Invalid mint address');
    }

    // Get security from mint address
    const { data: security, error: securityError } = await supabaseAdmin
        .from('securities')
        .select('*')
        .eq('mint_address', mintAddress)
        .single();

    if (securityError || !security) {
        throw new Error(`Security not found: ${mintAddress}`);
    }

    // If block height is specified, check if we have a cached snapshot
    if (blockHeight !== null) {
        const cached = await getCachedSnapshot(security.id, blockHeight);
        if (cached) {
            logger.info('Using cached snapshot', { blockHeight });
            return formatCapTableResponse(security, cached.snapshot_data, blockHeight);
        }
    }

    // Get all token balances at the specified block height
    let balancesQuery = supabaseAdmin
        .from('token_balances')
        .select('wallet_address, balance, block_height, updated_at')
        .eq('security_id', security.id)
        .gt('balance', 0); // Only include non-zero balances

    if (blockHeight !== null) {
        balancesQuery = balancesQuery.lte('block_height', blockHeight);
    }

    const { data: balances, error: balancesError } = await balancesQuery.order('balance', {
        ascending: false,
    });

    if (balancesError) {
        logger.error('Failed to fetch balances', balancesError as any);
        throw balancesError;
    }

    // Calculate ownership percentages
    const capTable = calculateOwnershipPercentages(balances || [], security.current_supply);

    // Get allowlist status for each holder
    const enrichedCapTable = await enrichWithAllowlistStatus(security.id, capTable);

    // Cache the snapshot if block height is specified
    if (blockHeight !== null) {
        await cacheSnapshot(security.id, blockHeight, security.current_supply, enrichedCapTable);
    }

    return formatCapTableResponse(security, enrichedCapTable, blockHeight);
}

/**
 * Calculate ownership percentages for each holder
 */
function calculateOwnershipPercentages(
    balances: Partial<TokenBalance>[],
    totalSupply: number
): CapTableHolder[] {
    if (!totalSupply || totalSupply === 0) {
        return balances.map((b) => ({
            wallet_address: b.wallet_address!,
            shares: Number(b.balance),
            percentage: 0,
            last_updated: b.updated_at!,
            block_height: b.block_height!,
        }));
    }

    return balances.map((balance) => {
        const shares = Number(balance.balance);
        const percentage = (shares / totalSupply) * 100;

        return {
            wallet_address: balance.wallet_address!,
            shares: shares,
            percentage: parseFloat(percentage.toFixed(4)),
            last_updated: balance.updated_at!,
            block_height: balance.block_height!,
        };
    });
}

/**
 * Enrich cap table with allowlist status
 */
async function enrichWithAllowlistStatus(
    securityId: string,
    capTable: CapTableHolder[]
): Promise<CapTableHolder[]> {
    const walletAddresses = capTable.map((entry) => entry.wallet_address);

    if (walletAddresses.length === 0) {
        return capTable;
    }

    const { data: allowlistEntries } = await supabaseAdmin
        .from('allowlist')
        .select('wallet_address, status, approved_at')
        .eq('security_id', securityId)
        .in('wallet_address', walletAddresses);

    const allowlistMap = new Map<string, Partial<Allowlist>>(
        allowlistEntries?.map((entry) => [entry.wallet_address, entry]) || []
    );

    return capTable.map((entry) => ({
        ...entry,
        allowlist_status: allowlistMap.get(entry.wallet_address)?.status || 'unknown',
        approved_at: allowlistMap.get(entry.wallet_address)?.approved_at || null,
    }));
}

/**
 * Format cap table response
 */
function formatCapTableResponse(
    security: Security,
    capTable: CapTableHolder[],
    blockHeight: number | null
): CapTableData {
    const holderCount = capTable.length;
    const totalShares = capTable.reduce((sum, entry) => sum + entry.shares, 0);

    return {
        token: {
            mint_address: security.mint_address,
            symbol: security.symbol,
            name: security.name,
            decimals: security.decimals,
            total_supply: Number(security.current_supply),
            program_id: security.program_id,
        },
        snapshot: {
            block_height: blockHeight,
            timestamp: new Date().toISOString(),
            is_historical: blockHeight !== null,
        },
        summary: {
            total_holders: holderCount,
            total_shares: totalShares,
            percentage_distributed:
                totalShares > 0
                    ? parseFloat(((totalShares / security.current_supply) * 100).toFixed(2))
                    : 0,
        },
        holders: capTable,
    };
}

/**
 * Get cached snapshot from database
 */
async function getCachedSnapshot(
    securityId: string,
    blockHeight: number
): Promise<DbCapTableSnapshot | null> {
    const { data } = await supabaseAdmin
        .from('cap_table_snapshots')
        .select('*')
        .eq('security_id', securityId)
        .eq('block_height', blockHeight)
        .single();

    return data;
}

/**
 * Cache snapshot in database
 */
async function cacheSnapshot(
    securityId: string,
    blockHeight: number,
    totalSupply: number,
    capTable: CapTableHolder[]
): Promise<void> {
    const holderCount = capTable.length;

    const { error } = await supabaseAdmin.from('cap_table_snapshots').upsert(
        [
            {
                security_id: securityId,
                block_height: blockHeight,
                slot: blockHeight, // Simplified - in production, track slot separately
                total_supply: totalSupply,
                holder_count: holderCount,
                snapshot_data: capTable,
            },
        ],
        {
            onConflict: 'security_id,block_height',
        }
    );

    if (error) {
        logger.error('Failed to cache snapshot', error as any);
    } else {
        logger.info('Snapshot cached', { securityId, blockHeight, holderCount });
    }
}

/**
 * Export cap table as CSV
 */
export function exportCapTableCSV(capTableData: CapTableData): string {
    const { token, holders } = capTableData;

    // CSV header
    const header = [
        'Wallet Address',
        'Shares',
        'Percentage',
        'Allowlist Status',
        'Approved At',
        'Last Updated',
    ].join(',');

    // CSV rows
    const rows = holders.map((holder) => {
        return [
            holder.wallet_address,
            holder.shares,
            holder.percentage,
            holder.allowlist_status,
            holder.approved_at || 'N/A',
            holder.last_updated || 'N/A',
        ].join(',');
    });

    // Metadata rows
    const metadata = [
        `Token: ${token.symbol} (${token.name})`,
        `Mint Address: ${token.mint_address}`,
        `Total Supply: ${token.total_supply}`,
        `Total Holders: ${holders.length}`,
        `Generated: ${new Date().toISOString()}`,
        '', // Empty row separator
        header,
        ...rows,
    ];

    return metadata.join('\n');
}

/**
 * Export cap table as JSON
 */
export function exportCapTableJSON(capTableData: CapTableData): string {
    return JSON.stringify(capTableData, null, 2);
}

/**
 * Get transfer history for a token
 */
export async function getTransferHistory(
    mintAddress: string,
    options: TransferHistoryOptions = {}
): Promise<TransferHistoryResult> {
    const { limit = 100, offset = 0, fromWallet = null, toWallet = null } = options;

    logger.info('Fetching transfer history', { mintAddress, options });

    // Get security from mint address
    const { data: security } = await supabaseAdmin
        .from('securities')
        .select('id')
        .eq('mint_address', mintAddress)
        .single();

    if (!security) {
        throw new Error(`Security not found: ${mintAddress}`);
    }

    // Build query
    let query = supabaseAdmin
        .from('transfers')
        .select('*', { count: 'exact' })
        .eq('security_id', security.id)
        .order('block_time', { ascending: false })
        .range(offset, offset + limit - 1);

    if (fromWallet) {
        query = query.eq('from_wallet', fromWallet);
    }

    if (toWallet) {
        query = query.eq('to_wallet', toWallet);
    }

    const { data: transfers, error, count } = await query;

    if (error) {
        logger.error('Failed to fetch transfers', error as any);
        throw error;
    }

    return {
        transfers: transfers || [],
        total: count || 0,
        limit,
        offset,
    };
}

/**
 * Get holder count over time
 */
export async function getHolderCountHistory(mintAddress: string): Promise<any[]> {
    const { data: security } = await supabaseAdmin
        .from('securities')
        .select('id')
        .eq('mint_address', mintAddress)
        .single();

    if (!security) {
        throw new Error(`Security not found: ${mintAddress}`);
    }

    const { data: snapshots } = await supabaseAdmin
        .from('cap_table_snapshots')
        .select('block_height, holder_count, created_at')
        .eq('security_id', security.id)
        .order('block_height', { ascending: true });

    return snapshots || [];
}

/**
 * Get concentration metrics (e.g., top 10 holders percentage)
 */
export async function getConcentrationMetrics(mintAddress: string): Promise<ConcentrationMetrics> {
    const capTable = await generateCapTable(mintAddress);
    const holders = capTable.holders;

    if (holders.length === 0) {
        return {
            top_1_holders: 0,
            top_5_holders: 0,
            top_10_holders: 0,
            gini_coefficient: 0,
            interpretation: 'No holders',
        };
    }

    // Sort by shares descending (should already be sorted)
    const sortedHolders = [...holders].sort((a, b) => b.shares - a.shares);

    const top1Percentage = sortedHolders.slice(0, 1).reduce((sum, h) => sum + h.percentage, 0);
    const top5Percentage = sortedHolders.slice(0, 5).reduce((sum, h) => sum + h.percentage, 0);
    const top10Percentage = sortedHolders.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);

    // Calculate Gini coefficient (measure of inequality)
    const gini = calculateGiniCoefficient(sortedHolders.map((h) => h.shares));

    return {
        top_1_holders: parseFloat(top1Percentage.toFixed(2)),
        top_5_holders: parseFloat(top5Percentage.toFixed(2)),
        top_10_holders: parseFloat(top10Percentage.toFixed(2)),
        gini_coefficient: parseFloat(gini.toFixed(4)),
        interpretation: interpretGini(gini),
    };
}

/**
 * Calculate Gini coefficient
 * 0 = perfect equality, 1 = perfect inequality
 */
function calculateGiniCoefficient(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    if (sum === 0) return 0;

    let numerator = 0;
    for (let i = 0; i < n; i++) {
        numerator += (i + 1) * sorted[i];
    }

    return (2 * numerator) / (n * sum) - (n + 1) / n;
}

/**
 * Interpret Gini coefficient
 */
function interpretGini(gini: number): string {
    if (gini < 0.2) return 'Very equal distribution';
    if (gini < 0.4) return 'Relatively equal distribution';
    if (gini < 0.6) return 'Moderate concentration';
    if (gini < 0.8) return 'High concentration';
    return 'Very high concentration';
}

/**
 * Create a cap table snapshot at a specific block height
 * Story 3.11: Cap Table Snapshots
 */
export async function createCapTableSnapshot(
    mintAddress: string,
    blockHeight: number | null = null,
    reason: string = 'Manual snapshot'
): Promise<any> {
    logger.info('Creating cap table snapshot', { mintAddress, blockHeight, reason });

    // Validate mint address
    if (!validatePublicKey(mintAddress)) {
        throw new Error('Invalid mint address');
    }

    // Get security from mint address
    const { data: security, error: securityError } = await supabaseAdmin
        .from('securities')
        .select('*')
        .eq('mint_address', mintAddress)
        .single();

    if (securityError || !security) {
        throw new Error(`Security not found: ${mintAddress}`);
    }

    // Use current block height if not specified
    const snapshotBlockHeight = blockHeight || Date.now(); // Simplified - in production, get actual block height

    // Generate cap table at the specified block height
    const capTable = await generateCapTable(mintAddress, blockHeight);
    const holders = capTable.holders;

    // Store snapshot in database
    const { data: snapshot, error } = await supabaseAdmin
        .from('cap_table_snapshots')
        .insert([
            {
                security_id: security.id,
                block_height: snapshotBlockHeight,
                slot: snapshotBlockHeight, // Simplified
                total_supply: capTable.token.total_supply,
                holder_count: holders.length,
                snapshot_data: holders,
                metadata: {
                    reason: reason,
                    created_by: 'system',
                },
            },
        ])
        .select()
        .single();

    if (error) {
        logger.error('Failed to create snapshot', error as any);
        throw error;
    }

    logger.info('Snapshot created successfully', {
        snapshotId: snapshot.id,
        blockHeight: snapshotBlockHeight,
        holderCount: holders.length
    });

    return {
        id: snapshot.id,
        security_id: snapshot.security_id,
        block_height: snapshot.block_height,
        holder_count: snapshot.holder_count,
        total_supply: snapshot.total_supply,
        reason: reason,
        created_at: snapshot.created_at,
        snapshot_data: snapshot.snapshot_data,
    };
}

/**
 * List all cap table snapshots for a token
 * Story 3.11: Cap Table Snapshots
 */
export async function listCapTableSnapshots(mintAddress: string): Promise<any[]> {
    logger.info('Listing cap table snapshots', { mintAddress });

    // Get security from mint address
    const { data: security } = await supabaseAdmin
        .from('securities')
        .select('id')
        .eq('mint_address', mintAddress)
        .single();

    if (!security) {
        throw new Error(`Security not found: ${mintAddress}`);
    }

    const { data: snapshots, error } = await supabaseAdmin
        .from('cap_table_snapshots')
        .select('id, block_height, slot, total_supply, holder_count, created_at')
        .eq('security_id', security.id)
        .order('block_height', { ascending: false });

    if (error) {
        logger.error('Failed to list snapshots', error as any);
        throw error;
    }

    return snapshots || [];
}

/**
 * Get a specific cap table snapshot by block height
 * Story 3.11: Cap Table Snapshots
 * If exact block height not found, returns nearest snapshot before requested block
 */
export async function getCapTableSnapshot(
    mintAddress: string,
    blockHeight: number
): Promise<any> {
    logger.info('Getting cap table snapshot', { mintAddress, blockHeight });

    // Get security from mint address
    const { data: security } = await supabaseAdmin
        .from('securities')
        .select('id')
        .eq('mint_address', mintAddress)
        .single();

    if (!security) {
        throw new Error(`Security not found: ${mintAddress}`);
    }

    // Try exact match first
    let { data: snapshot } = await supabaseAdmin
        .from('cap_table_snapshots')
        .select('*')
        .eq('security_id', security.id)
        .eq('block_height', blockHeight)
        .single();

    // If no exact match, find nearest snapshot before requested block
    if (!snapshot) {
        const { data: nearestSnapshot } = await supabaseAdmin
            .from('cap_table_snapshots')
            .select('*')
            .eq('security_id', security.id)
            .lte('block_height', blockHeight)
            .order('block_height', { ascending: false })
            .limit(1)
            .single();

        snapshot = nearestSnapshot;
    }

    if (!snapshot) {
        throw new Error(`No snapshot found at or before block height ${blockHeight}`);
    }

    return snapshot;
}

