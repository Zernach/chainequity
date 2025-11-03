# ChainEquity Frontend

React Native frontend built with Expo Router for iOS, Android, and Web.

## Setup

```bash
npm install
```

## Development

```bash
# Start Metro bundler
npm start

# Run on specific platforms
npm run ios
npm run android
npm run web
```

## Configuration

Update the API URLs in `app/index.tsx`:
- `API_URL`: Backend REST API URL (default: http://localhost:3000)
- `WS_URL`: WebSocket server URL (default: ws://localhost:3001)

## Features

- ✅ User management (create/list users)
- ✅ Solana token minting on devnet
- ✅ Real-time WebSocket connection
- ✅ Cross-platform support (iOS, Android, Web)
- ✅ Expo Router for navigation
- ✅ TypeScript support

