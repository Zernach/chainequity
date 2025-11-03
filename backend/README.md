# ChainEquity Backend

Node.js backend with Express, Solana integration, and WebSocket support. Written in TypeScript.

## Setup

Install dependencies:
```bash
yarn install
```

Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

## Development

```bash
# Start development server with hot-reload
yarn dev

# Build TypeScript to JavaScript
yarn build

# Type check without building
yarn type-check

# Run production build
yarn start
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

- TypeScript - Type-safe JavaScript
- Express.js - REST API
- WebSocket (ws) - Real-time updates
- @solana/web3.js - Solana blockchain integration
- @supabase/supabase-js - PostgreSQL database
- @coral-xyz/anchor - Solana program framework

## Project Structure

```
backend/
├── src/
│   ├── server.ts          # Main Express server
│   ├── db.ts              # Supabase client
│   ├── solana.ts          # Solana operations
│   ├── websocket.ts       # WebSocket server
│   ├── cap-table.ts       # Cap table generation
│   ├── indexer.ts         # Event indexer
│   ├── types/             # TypeScript type definitions
│   │   ├── database.types.ts
│   │   ├── solana.types.ts
│   │   ├── websocket.types.ts
│   │   ├── cap-table.types.ts
│   │   └── indexer.types.ts
│   └── utils/             # Utility functions
│       ├── logger.ts
│       ├── validators.ts
│       └── errors.ts
├── dist/                  # Compiled JavaScript (gitignored)
├── package.json
├── tsconfig.json
└── nodemon.json
```

