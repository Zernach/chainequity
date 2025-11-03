/**
 * Event indexer types
 */

export interface ParsedEvent {
    discriminator: string;
    data: Buffer;
    raw: boolean;
}

export interface TokenInitializedEventData {
    authority: string;
    mint: string;
    symbol: string;
    name: string;
    decimals: number;
}

export interface WalletApprovedEventData {
    token_mint: string;
    wallet: string;
    approved_by: string;
    timestamp: number;
}

export interface WalletRevokedEventData {
    token_mint: string;
    wallet: string;
    revoked_by: string;
    timestamp: number;
}

export interface TokensMintedEventData {
    token_mint: string;
    recipient: string;
    amount: number;
    new_supply: number;
}

export interface TokensTransferredEventData {
    token_mint: string;
    from: string;
    to: string;
    amount: number;
}

export interface IndexerEvent {
    event: ParsedEvent;
    signature: string;
    slot: number;
    blockTime: number | null;
}

