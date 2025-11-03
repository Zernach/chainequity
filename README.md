# ChainEquity - Hello World Fullstack

A simple fullstack application demonstrating:
- React Native (Expo) frontend working on iOS, Android, and Web
- Node.js backend with Solana integration
- PostgreSQL database via Supabase
- Real-time WebSocket communication

## Project Structure

```
chainequity/
├── backend/          # Node.js + Express + Solana + WebSocket
├── frontend/         # React Native + Expo Router
└── database/         # SQL migrations for Supabase
```

## Quick Start

### 1. Database Setup

1. Go to [Supabase Dashboard](https://app.supabase.com/project/wsnrrcuccyyleytrlmwz)
2. Navigate to SQL Editor
3. Run the migration: `database/001_create_users_table.sql`

### 2. Backend Setup

```bash
cd backend
npm install
# Create .env file with your Supabase credentials (see .env.example)
npm run dev
```

Backend will start on:
- REST API: http://localhost:3000
- WebSocket: ws://localhost:3001

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

Then choose your platform:
- Press `w` for web
- Press `i` for iOS simulator
- Press `a` for Android emulator

## Features

### Backend
- ✅ Express REST API
- ✅ Solana token minting (devnet)
- ✅ WebSocket server for real-time updates
- ✅ Supabase PostgreSQL integration
- ✅ User CRUD operations

### Frontend
- ✅ Cross-platform (iOS, Android, Web)
- ✅ Expo Router navigation
- ✅ User management UI
- ✅ Solana token minting interface
- ✅ Real-time WebSocket connection
- ✅ TypeScript support

### Database
- ✅ Users table with UUID
- ✅ Wallet address support
- ✅ Timestamps (created_at, updated_at)
- ✅ Row Level Security enabled

## Testing the Integration

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm start` (then press `w` for web)
3. In the app:
   - Create a user → saves to Supabase
   - Get all users → fetches from Supabase
   - Mint token → creates Solana token on devnet
   - Watch WebSocket messages in real-time

## Technologies

- **Frontend**: React Native, Expo, Expo Router, TypeScript
- **Backend**: Node.js, Express, WebSocket (ws)
- **Blockchain**: Solana Web3.js (devnet)
- **Database**: Supabase (PostgreSQL)
- **Real-time**: WebSocket + Supabase Realtime

