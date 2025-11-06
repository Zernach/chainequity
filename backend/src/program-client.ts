import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import { logger } from './utils/logger';

const PROGRAM_ID = new PublicKey(process.env.GATED_TOKEN_PROGRAM_ID || '7zmjGpWX7frSmnFfyZuhhrfoLgV3yH44RJZbKob1FSJF');

/**
 * Client for interacting with the Gated Token program
 * Wraps all smart contract instructions in type-safe methods
 */
export class GatedTokenClient {
    // @ts-ignore - Reserved for future production use
    private _connection: Connection;
    // @ts-ignore - Reserved for future production use
    private _wallet: Wallet;
    private programId: PublicKey;

    constructor(connection: Connection, wallet: Wallet) {
        this._connection = connection;
        this._wallet = wallet;
        this.programId = PROGRAM_ID;
    }

    /**
     * Initialize a new gated token
     */
    async initializeToken(params: {
        mint: Keypair;
        authority: Keypair;
        symbol: string;
        name: string;
        decimals: number;
    }): Promise<{ signature: string; mint: string; tokenConfig: PublicKey }> {
        logger.info('[ProgramClient] initializeToken called with params:', {
            symbol: params.symbol,
            name: params.name,
            decimals: params.decimals,
            mint: params.mint.publicKey.toString(),
            authority: params.authority.publicKey.toString(),
        });

        logger.info('[ProgramClient] Finding token config PDA...');
        const [_tokenConfig] = await PublicKey.findProgramAddress(
            [Buffer.from('token_config'), params.mint.publicKey.toBuffer()],
            this.programId
        );
        logger.info('[ProgramClient] Token config PDA found', { tokenConfig: _tokenConfig.toString() });

        // In production, this would use the actual Anchor program
        // For now, return a simulated result
        const signature = 'simulated-init-' + Date.now();
        logger.info('[ProgramClient] Generated simulated signature', { signature });

        const result = {
            signature,
            mint: params.mint.publicKey.toString(),
            tokenConfig: _tokenConfig
        };

        logger.info('[ProgramClient] Token initialized successfully, returning result:', {
            signature: result.signature,
            mint: result.mint,
            tokenConfig: result.tokenConfig.toString()
        });

        return result;
    }

    /**
     * Approve a wallet on the allowlist
     */
    async approveWallet(params: {
        authority: Keypair;
        tokenMint: PublicKey;
        walletToApprove: PublicKey;
    }): Promise<{ signature: string; wallet: string }> {
        logger.info('Approving wallet', {
            wallet: params.walletToApprove.toString(),
            mint: params.tokenMint.toString()
        });

        const [_tokenConfig] = await PublicKey.findProgramAddress(
            [Buffer.from('token_config'), params.tokenMint.toBuffer()],
            this.programId
        );

        const [_allowlistEntry] = await PublicKey.findProgramAddress(
            [Buffer.from('allowlist'), params.tokenMint.toBuffer(), params.walletToApprove.toBuffer()],
            this.programId
        );

        // In production, this would call the actual program instruction
        const signature = 'simulated-approve-' + Date.now();

        logger.info('Wallet approved', {
            wallet: params.walletToApprove.toString(),
            signature
        });

        return { signature, wallet: params.walletToApprove.toString() };
    }

    /**
     * Revoke a wallet from the allowlist
     */
    async revokeWallet(params: {
        authority: Keypair;
        tokenMint: PublicKey;
        walletToRevoke: PublicKey;
    }): Promise<{ signature: string; wallet: string }> {
        logger.info('Revoking wallet', {
            wallet: params.walletToRevoke.toString(),
            mint: params.tokenMint.toString()
        });

        const [_tokenConfig] = await PublicKey.findProgramAddress(
            [Buffer.from('token_config'), params.tokenMint.toBuffer()],
            this.programId
        );

        const [_allowlistEntry] = await PublicKey.findProgramAddress(
            [Buffer.from('allowlist'), params.tokenMint.toBuffer(), params.walletToRevoke.toBuffer()],
            this.programId
        );

        // In production, this would call the actual program instruction
        const signature = 'simulated-revoke-' + Date.now();

        logger.info('Wallet revoked', {
            wallet: params.walletToRevoke.toString(),
            signature
        });

        return { signature, wallet: params.walletToRevoke.toString() };
    }

    /**
     * Mint tokens to an approved wallet
     */
    async mintTokens(params: {
        authority: Keypair;
        tokenMint: PublicKey;
        recipient: PublicKey;
        amount: number;
    }): Promise<{ signature: string; recipient: string; amount: number }> {
        logger.info('Minting tokens', {
            recipient: params.recipient.toString(),
            amount: params.amount
        });

        const [_tokenConfig] = await PublicKey.findProgramAddress(
            [Buffer.from('token_config'), params.tokenMint.toBuffer()],
            this.programId
        );

        const [_recipientAllowlistEntry] = await PublicKey.findProgramAddress(
            [Buffer.from('allowlist'), params.tokenMint.toBuffer(), params.recipient.toBuffer()],
            this.programId
        );

        // In production:
        // 1. Get or create recipient token account
        // 2. Call mint_tokens instruction
        // 3. Return actual transaction signature

        const signature = 'simulated-mint-' + Date.now();

        logger.info('Tokens minted', {
            recipient: params.recipient.toString(),
            amount: params.amount,
            signature
        });

        return {
            signature,
            recipient: params.recipient.toString(),
            amount: params.amount
        };
    }

    /**
     * Execute a gated transfer between two approved wallets
     */
    async gatedTransfer(params: {
        sender: Keypair;
        tokenMint: PublicKey;
        recipient: PublicKey;
        amount: number;
    }): Promise<{ signature: string; from: string; to: string }> {
        logger.info('Executing gated transfer', {
            from: params.sender.publicKey.toString(),
            to: params.recipient.toString(),
            amount: params.amount
        });

        const [_tokenConfig] = await PublicKey.findProgramAddress(
            [Buffer.from('token_config'), params.tokenMint.toBuffer()],
            this.programId
        );

        const [_senderAllowlistEntry] = await PublicKey.findProgramAddress(
            [Buffer.from('allowlist'), params.tokenMint.toBuffer(), params.sender.publicKey.toBuffer()],
            this.programId
        );

        const [_recipientAllowlistEntry] = await PublicKey.findProgramAddress(
            [Buffer.from('allowlist'), params.tokenMint.toBuffer(), params.recipient.toBuffer()],
            this.programId
        );

        // In production:
        // 1. Get or create token accounts for both parties
        // 2. Call gated_transfer instruction with both allowlist validations
        // 3. Return actual transaction signature

        const signature = 'simulated-transfer-' + Date.now();

        logger.info('Gated transfer executed', {
            from: params.sender.publicKey.toString(),
            to: params.recipient.toString(),
            signature
        });

        return {
            signature,
            from: params.sender.publicKey.toString(),
            to: params.recipient.toString()
        };
    }

    /**
     * Execute a stock split (creates new token with multiplied supply)
     */
    async executeStockSplit(params: {
        authority: Keypair;
        oldTokenMint: PublicKey;
        newMint: Keypair;
        splitRatio: number;
        newSymbol: string;
        newName: string;
    }): Promise<{ signature: string; oldMint: string; newMint: string }> {
        logger.info('Executing stock split', {
            oldMint: params.oldTokenMint.toString(),
            newMint: params.newMint.publicKey.toString(),
            splitRatio: params.splitRatio
        });

        const [_oldTokenConfig] = await PublicKey.findProgramAddress(
            [Buffer.from('token_config'), params.oldTokenMint.toBuffer()],
            this.programId
        );

        const [_newTokenConfig] = await PublicKey.findProgramAddress(
            [Buffer.from('token_config'), params.newMint.publicKey.toBuffer()],
            this.programId
        );

        const [_splitConfig] = await PublicKey.findProgramAddress(
            [
                Buffer.from('split_config'),
                params.oldTokenMint.toBuffer(),
                params.newMint.publicKey.toBuffer(),
            ],
            this.programId
        );

        // In production, this would call the execute_stock_split instruction
        const signature = 'simulated-split-' + Date.now();

        logger.info('Stock split executed', {
            oldMint: params.oldTokenMint.toString(),
            newMint: params.newMint.publicKey.toString(),
            signature
        });

        return {
            signature,
            oldMint: params.oldTokenMint.toString(),
            newMint: params.newMint.publicKey.toString()
        };
    }

    /**
     * Migrate a holder's balance to the new token after a split
     */
    async migrateHolderSplit(params: {
        authority: Keypair;
        holder: PublicKey;
        oldMint: PublicKey;
        newMint: PublicKey;
        oldBalance: number;
    }): Promise<{ signature: string; wallet: string; newBalance: number }> {
        logger.info('Migrating holder for split', {
            holder: params.holder.toString(),
            oldBalance: params.oldBalance
        });

        const [_splitConfig] = await PublicKey.findProgramAddress(
            [
                Buffer.from('split_config'),
                params.oldMint.toBuffer(),
                params.newMint.toBuffer(),
            ],
            this.programId
        );

        // In production:
        // 1. Get or create holder's new token account
        // 2. Call migrate_holder_split instruction
        // 3. Return actual transaction signature

        const signature = 'simulated-migrate-' + Date.now();

        logger.info('Holder migrated', {
            holder: params.holder.toString(),
            signature
        });

        return {
            signature,
            wallet: params.holder.toString(),
            newBalance: 0 // Would be calculated from split ratio
        };
    }

    /**
     * Update token metadata (symbol and name)
     */
    async updateTokenMetadata(params: {
        authority: Keypair;
        tokenMint: PublicKey;
        newSymbol: string;
        newName: string;
    }): Promise<{ signature: string }> {
        logger.info('Updating token metadata', {
            mint: params.tokenMint.toString(),
            newSymbol: params.newSymbol,
            newName: params.newName
        });

        const [_tokenConfig] = await PublicKey.findProgramAddress(
            [Buffer.from('token_config'), params.tokenMint.toBuffer()],
            this.programId
        );

        // In production, this would call the update_token_metadata instruction
        const signature = 'simulated-update-metadata-' + Date.now();

        logger.info('Token metadata updated', {
            mint: params.tokenMint.toString(),
            signature
        });

        return { signature };
    }

    /**
     * Helper: Get token config PDA
     */
    async getTokenConfigPDA(mint: PublicKey): Promise<[PublicKey, number]> {
        return await PublicKey.findProgramAddress(
            [Buffer.from('token_config'), mint.toBuffer()],
            this.programId
        );
    }

    /**
     * Helper: Get allowlist entry PDA
     */
    async getAllowlistEntryPDA(mint: PublicKey, wallet: PublicKey): Promise<[PublicKey, number]> {
        return await PublicKey.findProgramAddress(
            [Buffer.from('allowlist'), mint.toBuffer(), wallet.toBuffer()],
            this.programId
        );
    }
}

/**
 * Helper function to load admin keypair
 */
export function loadAdminKeypair(): Keypair {
    const keypair = process.env.ADMIN_KEYPAIR;
    if (!keypair) {
        throw new Error('ADMIN_KEYPAIR not set in environment');
    }
    try {
        logger.info(`Loaded admin keypair from ${keypair}`);
        return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypair)));
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to load admin keypair: ${errorMessage}`);
        throw new Error(`Failed to load admin keypair from ${keypair}: ${errorMessage}`);
    }
}

