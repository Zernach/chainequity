# ChainEquity Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                                │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │         React Native App (Expo + expo-router)               │    │
│  │                                                              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │    │
│  │  │     iOS      │  │   Android    │  │     Web      │    │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │    │
│  │                                                              │    │
│  │  Components:                                                 │    │
│  │  • app/index.tsx (Home Screen)                              │    │
│  │  • app/_layout.tsx (Root Layout)                            │    │
│  │  • components/HelloWorld.tsx                                │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                       │
└───────────────────────┬───────────────────────────────────────────────┘
                        │
                        │ HTTP/WebSocket (Port 3000)
                        │
┌───────────────────────▼───────────────────────────────────────────────┐
│                        BACKEND LAYER                                  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │       Node.js Unified Server (Express + ws) - Port 3000     │    │
│  │                                                               │    │
│  │  ┌─────────────────────────────────────────────────────┐   │    │
│  │  │  REST API Routes (server.js)                        │   │    │
│  │  │  ├─ GET  /health                                     │   │    │
│  │  │  ├─ GET  /users                                      │   │    │
│  │  │  ├─ POST /users                                      │   │    │
│  │  │  ├─ POST /mint-token                                 │   │    │
│  │  │  ├─ POST /create-wallet                              │   │    │
│  │  │  └─ GET  /balance/:publicKey                         │   │    │
│  │  └─────────────────────────────────────────────────────┘   │    │
│  │                                                               │    │
│  │  ┌─────────────────────────────────────────────────────┐   │    │
│  │  │  WebSocket Endpoint (websocket.js) - /ws            │   │    │
│  │  │  ├─ HTTP → WebSocket upgrade on /ws path            │   │    │
│  │  │  ├─ Echo messages                                    │   │    │
│  │  │  ├─ Broadcast Solana transactions                    │   │    │
│  │  │  └─ Broadcast DB changes (Supabase Realtime)        │   │    │
│  │  └─────────────────────────────────────────────────────┘   │    │
│  │                                                               │    │
│  │  ┌─────────────────────────────────────────────────────┐   │    │
│  │  │  Solana Integration (solana.js)                      │   │    │
│  │  │  ├─ createWallet()                                   │   │    │
│  │  │  ├─ mintToken()                                      │   │    │
│  │  │  └─ getBalance()                                     │   │    │
│  │  └─────────────────────────────────────────────────────┘   │    │
│  │                                                               │    │
│  │  ┌─────────────────────────────────────────────────────┐   │    │
│  │  │  Database Client (db.js)                             │   │    │
│  │  │  └─ Supabase Client Instance                         │   │    │
│  │  └─────────────────────────────────────────────────────┘   │    │
│  │                                                               │    │
│  └───────────────────────────────────────────────────────────────┘    │
│                                                                        │
└────────────┬────────────────────────────────┬──────────────────────────┘
             │                                │
             │                                │
             │                                │
┌────────────▼────────────┐      ┌───────────▼──────────────────┐
│   DATABASE LAYER         │      │   BLOCKCHAIN LAYER           │
│                          │      │                              │
│  ┌────────────────────┐ │      │  ┌────────────────────────┐ │
│  │ Supabase PostgreSQL│ │      │  │   Solana Devnet        │ │
│  │                    │ │      │  │                        │ │
│  │ Tables:            │ │      │  │ Features:              │ │
│  │ • users            │ │      │  │ • Token minting        │ │
│  │   - id (UUID)      │ │      │  │ • Wallet generation    │ │
│  │   - name           │ │      │  │ • Balance checking     │ │
│  │   - wallet_address │ │      │  │ • Airdrop (testnet)    │ │
│  │   - created_at     │ │      │  │                        │ │
│  │   - updated_at     │ │      │  │ Network: devnet        │ │
│  │                    │ │      │  │ (Test environment)     │ │
│  │ Features:          │ │      │  └────────────────────────┘ │
│  │ • Real-time        │ │      │                              │
│  │ • RLS enabled      │ │      └──────────────────────────────┘
│  │ • Auto timestamps  │ │
│  └────────────────────┘ │
│                          │
└──────────────────────────┘
```

## Data Flow Examples

### 1. Creating a User

```
Frontend                 Backend                  Database
   │                        │                        │
   │  POST /users           │                        │
   │  {name: "John"}        │                        │
   ├───────────────────────>│                        │
   │                        │  INSERT INTO users     │
   │                        ├───────────────────────>│
   │                        │                        │
   │                        │  <── User created      │
   │                        │<───────────────────────┤
   │                        │                        │
   │                        │  Supabase Realtime     │
   │  WebSocket message     │<───────────────────────┤
   │<───────────────────────┤                        │
   │  (new user event)      │                        │
   │                        │                        │
   │  <── Success response  │                        │
   │<───────────────────────┤                        │
   │                        │                        │
```

### 2. Minting Solana Token

```
Frontend                 Backend                  Solana Network
   │                        │                        │
   │  POST /mint-token      │                        │
   │  {amount: 1}           │                        │
   ├───────────────────────>│                        │
   │                        │  Generate keypair      │
   │                        │  Request airdrop       │
   │                        ├───────────────────────>│
   │                        │                        │
   │                        │  <── Transaction sig   │
   │                        │<───────────────────────┤
   │                        │                        │
   │                        │  Confirm transaction   │
   │                        ├───────────────────────>│
   │                        │                        │
   │                        │  <── Confirmed         │
   │                        │<───────────────────────┤
   │                        │                        │
   │  WebSocket broadcast   │                        │
   │<───────────────────────┤                        │
   │  (transaction details) │                        │
   │                        │                        │
   │  <── Success response  │                        │
   │<───────────────────────┤                        │
   │  (signature, balance)  │                        │
```

### 3. Real-time Database Updates

```
Frontend A               Backend                 Frontend B
   │                        │                        │
   │  Create user           │                        │
   ├───────────────────────>│                        │
   │                        │                        │
   │                        │  Database change       │
   │                        │  detected (Supabase)   │
   │                        │                        │
   │  WebSocket message     │  WebSocket message     │
   │<───────────────────────┼───────────────────────>│
   │  (user created)        │  (user created)        │
   │                        │                        │
```

## Technology Stack

### Frontend
- **React Native** - Cross-platform mobile framework
- **Expo** - React Native toolchain and framework
- **Expo Router** - File-based routing system
- **TypeScript** - Type-safe development

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **ws** - WebSocket library
- **@solana/web3.js** - Solana blockchain SDK
- **@supabase/supabase-js** - Supabase client

### Database
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Relational database
- **Realtime** - Database change subscriptions

### Blockchain
- **Solana** - High-performance blockchain
- **Devnet** - Test network for development

## Communication Protocols

### REST API (HTTP)
- **Port**: 3000
- **Format**: JSON
- **Methods**: GET, POST
- **CORS**: Enabled for all origins (dev only)

### WebSocket
- **Endpoint**: `/ws` (HTTP upgrade)
- **Port**: Same as HTTP (3000)
- **Protocol**: ws:// (dev), wss:// (prod)
- **Format**: JSON messages
- **Auto-reconnect**: Yes (3 second delay)
- **Connection**: Derived from `EXPO_PUBLIC_API_URL` (http→ws) + `/ws`

### Database Connection
- **Protocol**: HTTPS (REST API)
- **Authentication**: API Key (anon key)
- **Realtime**: WebSocket subscription

### Blockchain Connection
- **Network**: Solana Devnet
- **RPC**: Solana's official devnet RPC
- **Protocol**: HTTPS

## Security Model

### Current (Development)
- ✅ Environment variables for secrets
- ✅ HTTPS to Supabase
- ✅ Gitignore for sensitive files
- ❌ No authentication
- ❌ Public API endpoints
- ❌ No rate limiting

### Recommended (Production)
- ✅ JWT or OAuth authentication
- ✅ API key authentication
- ✅ Rate limiting
- ✅ Input validation
- ✅ HTTPS/WSS only
- ✅ CORS whitelist
- ✅ Service role key (backend)
- ✅ RLS policies (database)

## Scalability Considerations

### Current Limitations
- Single server instance
- No load balancing
- No caching layer
- No connection pooling
- No message queue

### Future Enhancements
- **Load Balancer** - Distribute traffic
- **Redis** - Cache frequently accessed data
- **Message Queue** - Async job processing (Bull, RabbitMQ)
- **Connection Pool** - Database connection management
- **CDN** - Static asset delivery
- **Microservices** - Split into smaller services

## Monitoring & Logging

### Recommended Tools
- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **DataDog** - Infrastructure monitoring
- **Supabase Dashboard** - Database metrics
- **Solana Explorer** - Transaction monitoring

## File Organization

```
chainequity/
├── backend/                    # Backend services
│   ├── src/
│   │   ├── server.ts          # Main entry point (89 lines - routes only)
│   │   ├── handlers/          # Request handlers (modular)
│   │   │   ├── index.ts       # Barrel export
│   │   │   ├── auth.handlers.ts
│   │   │   ├── users.handlers.ts
│   │   │   ├── solana.handlers.ts
│   │   │   ├── cap-table.handlers.ts
│   │   │   ├── securities.handlers.ts
│   │   │   └── admin.handlers.ts
│   │   ├── websocket.ts       # WebSocket logic
│   │   ├── solana.ts          # Blockchain logic
│   │   ├── auth.ts            # Authentication logic
│   │   ├── cap-table.ts       # Cap table logic
│   │   ├── corporate-actions.ts # Corporate actions
│   │   ├── program-client.ts  # Smart contract client
│   │   ├── db.ts              # Database logic
│   │   ├── nonce.ts           # Nonce management
│   │   ├── indexer.ts         # Blockchain indexer
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Utilities
│   └── dist/                  # Compiled JavaScript
│
├── frontend/                  # Frontend application
│   ├── app/                   # Expo Router pages
│   ├── components/            # Reusable components
│   ├── hooks/                 # Custom React hooks
│   ├── services/              # API services
│   └── contexts/              # React contexts
│
├── contracts/                 # Smart contracts
│   └── gated-token/          # Anchor program
│
├── database/                  # Database migrations
│   └── *.sql                 # Migration files
│
└── @docs/                    # Documentation
    └── *.md                  # Architecture docs
```

## Development Workflow

```
┌──────────────┐
│  Make Changes│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Hot Reload  │
│  (Frontend)  │
│  Nodemon     │
│  (Backend)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Test Locally│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Commit      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Deploy      │
└──────────────┘
```

## Port Configuration

| Service        | Port | Protocol | Description                           |
|---------------|------|----------|---------------------------------------|
| HTTP Server   | 3000 | HTTP     | Express server (REST + WebSocket)     |
| WebSocket     | 3000 | WS       | `/ws` endpoint (HTTP upgrade)         |
| Expo Metro    | 8081 | HTTP     | React Native bundler                  |
| Supabase API  | 443  | HTTPS    | Database REST API                     |
| Solana RPC    | 443  | HTTPS    | Blockchain RPC                        |

## Environment Variables

### Backend (.env)
```
SUPABASE_URL     # Supabase project URL
SUPABASE_KEY     # Supabase anon key
SOLANA_NETWORK   # devnet/testnet/mainnet-beta
PORT             # HTTP server port (default: 3000)
```

### Frontend (.env)
```
EXPO_PUBLIC_API_URL  # Backend API URL (e.g., http://localhost:3000)
                     # WebSocket automatically connects to {API_URL}/ws
```

## Backend Architecture Pattern

### Handler-Based Route Organization

The backend uses a **handler-based architecture** to keep the main server file clean and maintainable:

**server.ts (89 lines)** - Route definitions only
- Middleware setup
- Route mapping
- Authentication and authorization middleware
- No business logic

**handlers/** - Request handling logic
- Each handler file focuses on a specific domain
- Handlers contain all endpoint logic
- Easy to test in isolation
- Simple to maintain and extend

**Benefits:**
- **Maintainability**: Server.ts reduced from 1107 lines to 89 lines (92% reduction)
- **Modularity**: Each handler file is self-contained
- **Testability**: Handlers can be unit tested independently
- **Scalability**: Easy to add new endpoints without cluttering main file
- **Code Navigation**: Clear separation makes finding code easier

**Example handler structure:**
```typescript
// handlers/auth.handlers.ts
export async function signup(req: Request, res: Response) {
    // All signup logic here
}

export async function login(req: Request, res: Response) {
    // All login logic here
}
```

**Example route mapping:**
```typescript
// server.ts
import * as handlers from './handlers';

app.post('/auth/signup', handlers.signup);
app.post('/auth/login', handlers.login);
```

## Best Practices Implemented

✅ Separation of concerns (modular files)
✅ Handler-based route organization
✅ Environment variable management
✅ Error handling with try-catch
✅ Reusable components
✅ TypeScript for type safety
✅ Git ignore for sensitive files
✅ Documentation at multiple levels
✅ Cross-platform support
✅ Real-time updates
✅ Auto-reconnect logic

## Future Improvements

- Add authentication
- Implement caching
- Add unit tests
- Add integration tests
- Set up CI/CD pipeline
- Add error monitoring
- Implement logging
- Add API versioning
- Create admin dashboard
- Add analytics

