# ChainEquity Frontend

React Native frontend built with Expo Router for iOS, Android, and Web.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the frontend directory (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`:
```bash
# Backend API Configuration
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_WS_URL=ws://localhost:3001

# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Wallet Configuration
# Set to 'true' to use mock wallet for development/testing
# Set to 'false' to use real WalletConnect integration
EXPO_PUBLIC_USE_MOCK_WALLET=true

# WalletConnect Project ID (required for production)
# Get yours at: https://cloud.walletconnect.com
EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id

# Optional: Custom mock wallet address for testing
# Only used when EXPO_PUBLIC_USE_MOCK_WALLET=true
EXPO_PUBLIC_MOCK_WALLET_ADDRESS=11111111111111111111111111111111
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

Environment variables are loaded from `.env`:

### Backend Connection
- `EXPO_PUBLIC_API_URL`: Backend REST API URL (default: http://localhost:3000)
- `EXPO_PUBLIC_WS_URL`: WebSocket server URL (default: ws://localhost:3001)

### Supabase
- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Wallet Configuration
- `EXPO_PUBLIC_USE_MOCK_WALLET`: `true` for development, `false` for production
- `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID`: Your WalletConnect project ID (get from https://cloud.walletconnect.com)
- `EXPO_PUBLIC_MOCK_WALLET_ADDRESS`: Optional custom address for mock wallet testing

**Note:** In Expo, environment variables must be prefixed with `EXPO_PUBLIC_` to be accessible in the client code.

### Wallet Modes

**Development Mode (Mock Wallet)**:
```bash
EXPO_PUBLIC_USE_MOCK_WALLET=true
```
- No native dependencies required
- Custom address input for testing
- Useful for automated testing

**Production Mode (Real Wallets)**:
```bash
EXPO_PUBLIC_USE_MOCK_WALLET=false
EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
```
- **Mobile**: Uses WalletConnect (Phantom, Solflare, Backpack, etc.)
- **Web**: Uses browser extension wallets
- Requires WalletConnect project ID

See `@docs/authentication-guide.md` for detailed wallet setup.

## Features

- ✅ User management (create/list users)
- ✅ Solana token minting on devnet
- ✅ Real-time WebSocket connection
- ✅ Cross-platform support (iOS, Android, Web)
- ✅ Expo Router for navigation
- ✅ TypeScript support
- ✅ **Multi-wallet support (WalletConnect, Web Wallets, Mock)**
- ✅ **Enhanced security with nonce-based authentication**
- ✅ **Environment-based wallet mode switching**

## Wallet Integration

ChainEquity supports three wallet modes:

1. **Mock Wallet** (Development)
   - No external dependencies
   - Custom address input
   - Instant connection

2. **WalletConnect** (Mobile: iOS & Android)
   - Phantom, Solflare, Backpack, and more
   - Deep linking support
   - QR code connection

3. **Web Wallets** (Browser)
   - Phantom extension
   - Solflare extension
   - Backpack extension

### Quick Start with Wallets

1. **Development**: Set `EXPO_PUBLIC_USE_MOCK_WALLET=true` in `.env`
2. **Production**: 
   - Get WalletConnect project ID from https://cloud.walletconnect.com
   - Set `EXPO_PUBLIC_USE_MOCK_WALLET=false`
   - Add your project ID to `.env`
3. For native builds: Run `npx expo prebuild` after configuration changes

See the comprehensive guide at `@docs/authentication-guide.md`

