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
                        │ HTTP REST API (Port 3000)
                        │ WebSocket (Port 3001)
                        │
┌───────────────────────▼───────────────────────────────────────────────┐
│                        BACKEND LAYER                                  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │            Node.js Server (Express + ws)                     │    │
│  │                                                               │    │
│  │  ┌─────────────────────────────────────────────────────┐   │    │
│  │  │  REST API Server (server.js) - Port 3000            │   │    │
│  │  │  ├─ GET  /health                                     │   │    │
│  │  │  ├─ GET  /users                                      │   │    │
│  │  │  ├─ POST /users                                      │   │    │
│  │  │  ├─ POST /mint-token                                 │   │    │
│  │  │  ├─ POST /create-wallet                              │   │    │
│  │  │  └─ GET  /balance/:publicKey                         │   │    │
│  │  └─────────────────────────────────────────────────────┘   │    │
│  │                                                               │    │
│  │  ┌─────────────────────────────────────────────────────┐   │    │
│  │  │  WebSocket Server (websocket.js) - Port 3001        │   │    │
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
- **Port**: 3001
- **Protocol**: ws:// (dev), wss:// (prod)
- **Format**: JSON messages
- **Auto-reconnect**: Yes (3 second delay)

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
├── backend/              # Backend services
│   ├── server.js        # Main entry point
│   ├── websocket.js     # WebSocket logic
│   ├── solana.js        # Blockchain logic
│   └── db.js            # Database logic
│
├── frontend/            # Frontend application
│   ├── app/             # Expo Router pages
│   └── components/      # Reusable components
│
├── database/            # Database migrations
│   └── *.sql           # Migration files
│
└── @docs/              # Documentation
    └── *.md            # Architecture docs
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

| Service        | Port | Protocol | Description                |
|---------------|------|----------|----------------------------|
| REST API      | 3000 | HTTP     | Express server             |
| WebSocket     | 3001 | WS       | Real-time communication    |
| Expo Metro    | 8081 | HTTP     | React Native bundler       |
| Supabase API  | 443  | HTTPS    | Database REST API          |
| Solana RPC    | 443  | HTTPS    | Blockchain RPC             |

## Environment Variables

### Backend (.env)
```
SUPABASE_URL     # Supabase project URL
SUPABASE_KEY     # Supabase anon key
SOLANA_NETWORK   # devnet/testnet/mainnet-beta
PORT             # REST API port (default: 3000)
WS_PORT          # WebSocket port (default: 3001)
```

### Frontend (hardcoded in app/index.tsx)
```
API_URL          # Backend REST API URL
WS_URL           # Backend WebSocket URL
```

## Best Practices Implemented

✅ Separation of concerns (modular files)
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

