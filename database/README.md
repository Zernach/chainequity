# Database Migrations

## Setup

1. Go to [Supabase Dashboard](https://app.supabase.com/project/wsnrrcuccyyleytrlmwz)
2. Navigate to SQL Editor
3. Run the migration files in order:
   - `001_create_users_table.sql`

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

## Tables

### users
- `id` (UUID) - Primary key
- `name` (TEXT) - User's name
- `wallet_address` (TEXT) - Solana wallet address (optional)
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

