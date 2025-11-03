# ChainEquity Backend

Node.js backend with Express, Solana integration, and WebSocket support.

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

## Development

```bash
# Start with nodemon (auto-reload)
npm run dev

# Or start normally
npm start
```

## API Endpoints

### REST API (Port 3000)

- `GET /health` - Health check
- `GET /users` - Get all users
- `POST /users` - Create new user
  ```json
  { "name": "John Doe", "wallet_address": "optional" }
  ```
- `POST /mint-token` - Mint SOL on devnet
  ```json
  { "amount": 1 }
  ```
- `POST /create-wallet` - Create new Solana wallet
- `GET /balance/:publicKey` - Get wallet balance

### WebSocket (Port 3001)

- Connects automatically
- Echoes messages back
- Broadcasts Solana transaction updates
- Broadcasts database changes in real-time

## Technologies

- Express.js - REST API
- WebSocket (ws) - Real-time updates
- @solana/web3.js - Solana blockchain integration
- @supabase/supabase-js - PostgreSQL database

