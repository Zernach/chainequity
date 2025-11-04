# Database Migrations

## Setup

1. Go to [Supabase Dashboard](https://app.supabase.com/project/wsnrrcuccyyleytrlmwz)
2. Navigate to SQL Editor
3. Run the migration files in order:
   - `001_create_users_table.sql`
   - `002_create_securities_tables.sql`
   - `003_add_helper_functions.sql`

## Alternative: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref wsnrrcuccyyleytrlmwz

# Run migrations
supabase db push
```

## Migrations

### 001_create_users_table.sql
Creates the basic users table for storing user information.

**Tables Created:**
- `users` - User account information

### 002_create_securities_tables.sql
Creates tables for tokenized securities management, cap table tracking, and event logging.

**Tables Created:**
- `securities` - Token mint metadata (symbol, name, supply)
- `allowlist` - Wallet approval status for restricted tokens
- `token_balances` - Current holder balances
- `corporate_actions` - History of splits, symbol changes
- `transfers` - Transfer event log with signatures
- `cap_table_snapshots` - Historical cap table snapshots

**Features:**
- Row Level Security (RLS) enabled on all tables
- Automatic `updated_at` triggers
- Comprehensive indexes for query performance
- Foreign key relationships

### 003_add_helper_functions.sql
Creates PostgreSQL functions to simplify common operations.

**Functions Created:**
- `update_balance(...)` - Update token balance (increment/decrement)
- `get_cap_table_at_block(...)` - Get historical cap table snapshot
- `calculate_concentration_metrics(...)` - Calculate ownership concentration
- `get_transfer_volume(...)` - Get transfer metrics for time period
- `is_wallet_approved(...)` - Check allowlist status

## Schema Overview

### Core Tables

#### users
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | User's name |
| wallet_address | text | Solana wallet address |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

#### securities
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| mint_address | text | Solana token mint address |
| symbol | text | Token ticker symbol |
| name | text | Token full name |
| decimals | integer | Token decimals (default 9) |
| total_supply | bigint | Total tokens minted |
| current_supply | bigint | Current circulating supply |
| program_id | text | Solana program ID |
| is_active | boolean | Whether token is active |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

#### allowlist
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| security_id | uuid | Foreign key to securities |
| wallet_address | text | Wallet address |
| status | text | approved/pending/rejected/revoked |
| approved_by | text | Who approved the wallet |
| approved_at | timestamptz | Approval timestamp |
| revoked_at | timestamptz | Revocation timestamp |
| notes | text | Optional notes |

#### token_balances
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| security_id | uuid | Foreign key to securities |
| wallet_address | text | Wallet address |
| balance | bigint | Token balance |
| block_height | bigint | Last updated block height |
| slot | bigint | Last updated slot |
| updated_at | timestamptz | Last update timestamp |

#### transfers
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| security_id | uuid | Foreign key to securities |
| transaction_signature | text | Solana transaction signature |
| from_wallet | text | Sender wallet |
| to_wallet | text | Recipient wallet |
| amount | bigint | Transfer amount |
| block_height | bigint | Block height |
| slot | bigint | Slot number |
| block_time | timestamptz | Block timestamp |
| status | text | confirmed/pending/failed |

#### corporate_actions
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| security_id | uuid | Foreign key to securities |
| action_type | text | split/reverse_split/symbol_change/metadata_update |
| old_mint_address | text | Original mint address |
| new_mint_address | text | New mint address |
| split_ratio | decimal | Split ratio (e.g., 7.0 for 7-for-1) |
| transaction_signature | text | Solana transaction signature |
| executed_by | text | Who executed the action |
| status | text | completed/pending/failed |
| metadata | jsonb | Additional metadata |

#### cap_table_snapshots
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| security_id | uuid | Foreign key to securities |
| block_height | bigint | Snapshot block height |
| slot | bigint | Snapshot slot |
| total_supply | bigint | Total supply at snapshot |
| holder_count | integer | Number of holders |
| snapshot_data | jsonb | Array of holder data |

## Performance Notes

All tables include appropriate indexes for:
- Foreign key lookups
- Query performance on frequently-accessed columns
- Block height and timestamp range queries

## Security

- Row Level Security (RLS) is enabled on all tables
- Current policies allow all operations (development mode)
- Production deployment should implement stricter RLS policies
