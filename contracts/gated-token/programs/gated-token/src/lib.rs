use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod gated_token {
    use super::*;

    /// Initialize a new gated token with allowlist controls
    pub fn initialize_token(
        ctx: Context<InitializeToken>,
        symbol: String,
        name: String,
        decimals: u8,
    ) -> Result<()> {
        require!(symbol.len() >= 3 && symbol.len() <= 10, ErrorCode::InvalidSymbol);
        require!(name.len() >= 2 && name.len() <= 50, ErrorCode::InvalidName);
        require!(decimals <= 9, ErrorCode::InvalidDecimals);

        let token_config = &mut ctx.accounts.token_config;
        token_config.authority = ctx.accounts.authority.key();
        token_config.mint = ctx.accounts.mint.key();
        token_config.symbol = symbol;
        token_config.name = name;
        token_config.decimals = decimals;
        token_config.total_supply = 0;
        token_config.bump = ctx.bumps.token_config;

        emit!(TokenInitializedEvent {
            authority: ctx.accounts.authority.key(),
            mint: ctx.accounts.mint.key(),
            symbol: token_config.symbol.clone(),
            name: token_config.name.clone(),
            decimals,
        });

        Ok(())
    }

    /// Approve a wallet to send/receive tokens
    pub fn approve_wallet(ctx: Context<ApproveWallet>) -> Result<()> {
        let allowlist_entry = &mut ctx.accounts.allowlist_entry;
        let clock = Clock::get()?;

        allowlist_entry.wallet = ctx.accounts.wallet.key();
        allowlist_entry.is_approved = true;
        allowlist_entry.approved_at = clock.unix_timestamp;
        allowlist_entry.bump = ctx.bumps.allowlist_entry;

        emit!(WalletApprovedEvent {
            token_mint: ctx.accounts.token_config.mint,
            wallet: ctx.accounts.wallet.key(),
            approved_by: ctx.accounts.authority.key(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Revoke wallet approval
    pub fn revoke_wallet(ctx: Context<RevokeWallet>) -> Result<()> {
        let allowlist_entry = &mut ctx.accounts.allowlist_entry;
        let clock = Clock::get()?;

        allowlist_entry.is_approved = false;
        allowlist_entry.revoked_at = Some(clock.unix_timestamp);

        emit!(WalletRevokedEvent {
            token_mint: ctx.accounts.token_config.mint,
            wallet: ctx.accounts.wallet.key(),
            revoked_by: ctx.accounts.authority.key(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Mint tokens to an approved wallet
    pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        // Verify recipient is approved
        let recipient_entry = &ctx.accounts.recipient_allowlist_entry;
        require!(recipient_entry.is_approved, ErrorCode::WalletNotApproved);

        // Mint tokens
        let cpi_accounts = token::MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::mint_to(cpi_ctx, amount)?;

        // Update total supply
        let token_config = &mut ctx.accounts.token_config;
        token_config.total_supply = token_config.total_supply.checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;

        emit!(TokensMintedEvent {
            token_mint: ctx.accounts.mint.key(),
            recipient: ctx.accounts.recipient.key(),
            amount,
            new_supply: token_config.total_supply,
        });

        Ok(())
    }

    /// Transfer tokens with allowlist validation
    pub fn gated_transfer(ctx: Context<GatedTransfer>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        // Verify sender is approved
        let sender_entry = &ctx.accounts.sender_allowlist_entry;
        require!(sender_entry.is_approved, ErrorCode::SenderNotApproved);

        // Verify recipient is approved
        let recipient_entry = &ctx.accounts.recipient_allowlist_entry;
        require!(recipient_entry.is_approved, ErrorCode::RecipientNotApproved);

        // Execute transfer
        let cpi_accounts = Transfer {
            from: ctx.accounts.from_token_account.to_account_info(),
            to: ctx.accounts.to_token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        emit!(TokensTransferredEvent {
            token_mint: ctx.accounts.mint.key(),
            from: ctx.accounts.authority.key(),
            to: ctx.accounts.recipient.key(),
            amount,
        });

        Ok(())
    }
}

// Account structures
#[account]
pub struct TokenConfig {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub total_supply: u64,
    pub bump: u8,
}

#[account]
pub struct AllowlistEntry {
    pub wallet: Pubkey,
    pub is_approved: bool,
    pub approved_at: i64,
    pub revoked_at: Option<i64>,
    pub bump: u8,
}

// Context structures
#[derive(Accounts)]
#[instruction(symbol: String, name: String)]
pub struct InitializeToken<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        mint::decimals = 9,
        mint::authority = authority,
    )]
    pub mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 40 + 100 + 1 + 8 + 1,
        seeds = [b"token_config", mint.key().as_ref()],
        bump
    )]
    pub token_config: Account<'info, TokenConfig>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ApproveWallet<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Wallet to be approved
    pub wallet: AccountInfo<'info>,
    
    #[account(
        seeds = [b"token_config", token_config.mint.as_ref()],
        bump = token_config.bump,
        constraint = token_config.authority == authority.key() @ ErrorCode::UnauthorizedAuthority
    )]
    pub token_config: Account<'info, TokenConfig>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 1 + 8 + 9 + 1,
        seeds = [b"allowlist", token_config.mint.as_ref(), wallet.key().as_ref()],
        bump
    )]
    pub allowlist_entry: Account<'info, AllowlistEntry>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeWallet<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Wallet to be revoked
    pub wallet: AccountInfo<'info>,
    
    #[account(
        seeds = [b"token_config", token_config.mint.as_ref()],
        bump = token_config.bump,
        constraint = token_config.authority == authority.key() @ ErrorCode::UnauthorizedAuthority
    )]
    pub token_config: Account<'info, TokenConfig>,
    
    #[account(
        mut,
        seeds = [b"allowlist", token_config.mint.as_ref(), wallet.key().as_ref()],
        bump = allowlist_entry.bump
    )]
    pub allowlist_entry: Account<'info, AllowlistEntry>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Recipient wallet
    pub recipient: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [b"token_config", mint.key().as_ref()],
        bump = token_config.bump,
        constraint = token_config.authority == authority.key() @ ErrorCode::UnauthorizedAuthority
    )]
    pub token_config: Account<'info, TokenConfig>,
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    #[account(
        mut,
        constraint = recipient_token_account.mint == mint.key(),
        constraint = recipient_token_account.owner == recipient.key()
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,
    
    #[account(
        seeds = [b"allowlist", token_config.mint.as_ref(), recipient.key().as_ref()],
        bump = recipient_allowlist_entry.bump
    )]
    pub recipient_allowlist_entry: Account<'info, AllowlistEntry>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct GatedTransfer<'info> {
    pub authority: Signer<'info>,
    
    /// CHECK: Recipient wallet
    pub recipient: AccountInfo<'info>,
    
    #[account(
        seeds = [b"token_config", mint.key().as_ref()],
        bump = token_config.bump
    )]
    pub token_config: Account<'info, TokenConfig>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(
        mut,
        constraint = from_token_account.mint == mint.key(),
        constraint = from_token_account.owner == authority.key()
    )]
    pub from_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = to_token_account.mint == mint.key(),
        constraint = to_token_account.owner == recipient.key()
    )]
    pub to_token_account: Account<'info, TokenAccount>,
    
    #[account(
        seeds = [b"allowlist", token_config.mint.as_ref(), authority.key().as_ref()],
        bump = sender_allowlist_entry.bump
    )]
    pub sender_allowlist_entry: Account<'info, AllowlistEntry>,
    
    #[account(
        seeds = [b"allowlist", token_config.mint.as_ref(), recipient.key().as_ref()],
        bump = recipient_allowlist_entry.bump
    )]
    pub recipient_allowlist_entry: Account<'info, AllowlistEntry>,
    
    pub token_program: Program<'info, Token>,
}

// Events
#[event]
pub struct TokenInitializedEvent {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
}

#[event]
pub struct WalletApprovedEvent {
    pub token_mint: Pubkey,
    pub wallet: Pubkey,
    pub approved_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct WalletRevokedEvent {
    pub token_mint: Pubkey,
    pub wallet: Pubkey,
    pub revoked_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct TokensMintedEvent {
    pub token_mint: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub new_supply: u64,
}

#[event]
pub struct TokensTransferredEvent {
    pub token_mint: Pubkey,
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
}

// Error codes
#[error_code]
pub enum ErrorCode {
    #[msg("Invalid symbol: must be 3-10 uppercase letters")]
    InvalidSymbol,
    
    #[msg("Invalid name: must be 2-50 characters")]
    InvalidName,
    
    #[msg("Invalid decimals: must be 0-9")]
    InvalidDecimals,
    
    #[msg("Invalid amount: must be greater than 0")]
    InvalidAmount,
    
    #[msg("Wallet is not approved on the allowlist")]
    WalletNotApproved,
    
    #[msg("Sender wallet is not approved")]
    SenderNotApproved,
    
    #[msg("Recipient wallet is not approved")]
    RecipientNotApproved,
    
    #[msg("Unauthorized: only authority can perform this action")]
    UnauthorizedAuthority,
    
    #[msg("Arithmetic overflow")]
    Overflow,
}

