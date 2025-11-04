# ChainEquity Authentication System

## Overview

ChainEquity implements a hybrid authentication system that combines traditional email/password authentication with Web3 wallet-based authentication. Users can choose either path to create and access their accounts.

## Architecture

### Components

1. **Backend** (`backend/src/auth.ts`)
   - Authentication middleware
   - JWT verification
   - Role-based access control
   - Wallet signature verification
   - User management

2. **Frontend** (`frontend/contexts/AuthContext.tsx`, `frontend/services/auth.ts`)
   - Auth state management
   - Session persistence
   - API integration
   - Secure storage

3. **Database** (`database/004_add_auth_and_roles.sql`)
   - User authentication tables
   - Role-based permissions
   - RLS policies
   - Helper functions

## Authentication Flows

### Flow 1: Email/Password First, Then Link Wallet

```
User Journey:
1. User clicks "Sign Up" or "Login" on auth screen
2. Enters email and password
3. Backend creates/verifies Supabase Auth user
4. Backend creates/fetches user profile in users table
5. Session token issued and stored securely
6. User redirected to home screen
7. (Optional) User clicks "Link Wallet" to connect Solana wallet
8. Wallet prompts for signature to prove ownership
9. Backend verifies signature and updates user profile
10. Wallet address persisted but requires re-connection per session for transactions
```

### Flow 2: Wallet First, Creates/Links Account

```
User Journey:
1. User clicks "Connect with Wallet" on auth screen
2. Wallet selector appears (Phantom, Solflare, etc.)
3. User approves connection
4. Frontend requests nonce from backend (POST /auth/request-nonce)
5. Backend generates cryptographically secure nonce (single-use, expires in 5 minutes)
6. Frontend generates verification message with nonce and timestamp
7. User signs message with wallet
8. Frontend sends wallet_address, signature, and message to backend
9. Backend validates:
   - Nonce exists and hasn't been used
   - Nonce hasn't expired
   - Timestamp is within acceptable window
   - Signature is valid for the wallet address
10. Backend checks if wallet address exists in database
   
   If wallet exists:
   - Backend finds associated user
   - Issues session token
   - User logged in
   
   If wallet is new:
   - Optional: User prompted for email (for account recovery)
   - Backend creates Supabase Auth user
   - Backend creates user profile with wallet_address
   - Default role assigned (investor)
   - Session token issued
   - User account created and logged in

11. User redirected to home screen
```

## Role-Based Access Control

### User Roles

| Role     | Description                                    | Permissions                                    |
|----------|------------------------------------------------|------------------------------------------------|
| admin    | Full system access                             | All operations, user management, role changes  |
| issuer   | Can create and manage securities               | Create tokens, manage allowlists               |
| investor | Standard user, can trade approved tokens       | View securities, transfer tokens, check balances |
| viewer   | Read-only access                               | View public data only                          |

### Backend Middleware

```typescript
// Require authentication
app.get('/protected', authenticateRequest, handler);

// Require specific role(s)
app.get('/admin-only', authenticateRequest, requireRole(['admin']), handler);

// Optional authentication
app.get('/public', optionalAuth, handler);
```

### RLS Policies

Database enforces row-level security based on `auth.uid()`:
- Users can read/update their own profile
- Admins can read/update all users
- Service role bypasses RLS for backend operations

## API Endpoints

### Authentication Endpoints

#### POST /auth/signup
Create new account with email/password.
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "investor" // optional, defaults to investor
}
```

#### POST /auth/login
Login with email/password.
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### POST /auth/logout
Logout current user (requires auth header).

#### GET /auth/me
Get current user profile (requires auth header).

#### POST /auth/link-wallet
Link wallet to authenticated account (requires auth header).
```json
{
  "wallet_address": "BxY8...",
  "signature": "base58_encoded_signature",
  "message": "Sign this message to verify..."
}
```

#### POST /auth/verify-wallet
Verify wallet signature without linking.
```json
{
  "wallet_address": "BxY8...",
  "signature": "base58_encoded_signature",
  "message": "Sign this message to verify..."
}
```

#### POST /auth/wallet-login
Login or create account with wallet.
```json
{
  "wallet_address": "BxY8...",
  "signature": "base58_encoded_signature",
  "message": "Sign this message to verify...",
  "email": "user@example.com", // optional
  "name": "John Doe" // optional
}
```

## Frontend Integration

### Using Auth in Components

```typescript
import { useAuth } from '../hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, signIn, signOut, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <LoginPrompt />;
  
  return (
    <View>
      <Text>Welcome, {user.name}!</Text>
      <Text>Role: {user.role}</Text>
      {user.wallet_address && (
        <Text>Wallet: {user.wallet_address}</Text>
      )}
      <Button title="Sign Out" onPress={signOut} />
    </View>
  );
}
```

### Role-Based UI

```typescript
import { useHasRole, useIsAdmin } from '../hooks/useAuth';

function AdminPanel() {
  const isAdmin = useIsAdmin();
  
  if (!isAdmin) return <Text>Access Denied</Text>;
  
  return <AdminDashboard />;
}
```

### Wallet Connection

```typescript
import { useWalletConnection } from '../hooks/useWalletConnection';

function WalletButton() {
  const { connected, walletAddress, connect, disconnect, signMessage } = useWalletConnection();
  
  if (connected) {
    return (
      <View>
        <Text>{formatWalletAddress(walletAddress)}</Text>
        <Button title="Disconnect" onPress={disconnect} />
      </View>
    );
  }
  
  return <Button title="Connect Wallet" onPress={connect} />;
}
```

## Security Considerations

### Backend Security

1. **Service Role Key**: Never exposed to frontend. Used only for backend admin operations.
2. **Anon Key**: Used in frontend for user-scoped operations.
3. **JWT Verification**: All protected endpoints verify JWT tokens.
4. **Signature Verification**: Wallet ownership proven via nacl signature verification.
5. **Rate Limiting**: Should be added to auth endpoints in production.

### Frontend Security

1. **Secure Storage**: Session tokens stored in `expo-secure-store` (native) or `localStorage` (web).
2. **Token Expiration**: Automatically handled by Supabase Auth.
3. **Auto-refresh**: Tokens refreshed automatically before expiration.
4. **Logout Cleanup**: All tokens and session data cleared on logout.

### Database Security

1. **RLS Policies**: Enforce row-level access control.
2. **Auth Helper Functions**: `get_user_role()`, `has_role()`, `has_any_role()`.
3. **Separate Service Role**: Backend uses service role, frontend uses anon key.

## Session Management

### Session Storage

- **Access Token**: Short-lived JWT (default 1 hour)
- **Refresh Token**: Long-lived token for obtaining new access tokens
- **Storage**: `expo-secure-store` (native), `localStorage` (web)

### Session Lifecycle

1. **Login**: Tokens stored in secure storage
2. **Active**: Auth context provides user/session state
3. **Refresh**: Automatic before expiration
4. **Logout**: All tokens cleared
5. **Restore**: Session restored on app restart (if not expired)

### Wallet Session

- Wallet address **persisted** in user profile
- Wallet must **re-connect** per session for transactions
- Connection state tracked separately from authentication state
- Signing operations require active wallet connection

## Testing Authentication

### Manual Testing Checklist

1. **Email/Password Signup**
   - ✅ Create account with valid email/password
   - ✅ Verify user created with default role
   - ✅ Check session token issued
   - ✅ Verify redirect to home screen

2. **Email/Password Login**
   - ✅ Login with valid credentials
   - ✅ Check session token issued
   - ✅ Verify user profile loaded
   - ✅ Test invalid credentials rejected

3. **Link Wallet (Email First)**
   - ✅ Connect wallet while authenticated
   - ✅ Sign verification message
   - ✅ Verify wallet address saved
   - ✅ Check wallet_verified flag set

4. **Wallet Login (New User)**
   - ✅ Connect wallet on auth screen
   - ✅ Sign verification message
   - ✅ Verify new account created
   - ✅ Check default role assigned
   - ✅ Verify session issued

5. **Wallet Login (Existing User)**
   - ✅ Connect wallet on auth screen
   - ✅ Sign verification message
   - ✅ Verify logged into existing account
   - ✅ Check user profile loaded

6. **Role-Based Access**
   - ✅ Admin can access admin endpoints
   - ✅ Investor cannot access admin endpoints
   - ✅ Verify RLS policies enforced

7. **Session Persistence**
   - ✅ Refresh app, session restored
   - ✅ Token expiration handled
   - ✅ Logout clears all tokens

## Environment Variables

### Backend (.env)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3000
```

### Frontend (process.env / Expo)

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Database Setup

1. Apply migration:
```bash
psql -h your-db-host -U postgres -d your-db -f database/004_add_auth_and_roles.sql
```

2. Verify tables created:
```sql
SELECT * FROM users LIMIT 1;
```

3. Check RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'users';
```

## Next Steps

1. **Production Deployment**
   - Enable rate limiting on auth endpoints
   - Configure CORS for production domains
   - Use environment-specific Supabase projects
   - Set up monitoring/logging for auth events

2. **Enhanced Security**
   - Implement 2FA for email accounts
   - Add email verification flow
   - Implement account recovery
   - Add session timeout/idle logout

3. **Wallet Integration**
   - Integrate real wallet adapters (Phantom, Solflare)
   - Support multiple wallet providers
   - Implement wallet switching
   - Add wallet disconnect handling

4. **User Management**
   - Admin dashboard for user management
   - Bulk role assignment
   - User activity logs
   - Account suspension/deletion

## Deployment Commands

### Backend
```bash
cd backend
yarn install
yarn build
yarn start
```

### Frontend
```bash
cd frontend
yarn install
yarn web    # For web
yarn ios    # For iOS
yarn android # For Android
```

### Database
```bash
# Apply migration
psql -h your-host -U postgres -d chainequity -f database/004_add_auth_and_roles.sql
```

## Troubleshooting

### Common Issues

1. **"Invalid or expired token"**
   - Check token expiration
   - Verify SUPABASE_SERVICE_ROLE_KEY set correctly
   - Ensure Authorization header format: `Bearer <token>`

2. **"User profile not found"**
   - Verify user entry created in users table
   - Check auth_user_id matches Supabase Auth user ID
   - Verify RLS policies not blocking query

3. **"Invalid signature"**
   - Check message format matches backend expectation
   - Verify signature encoding (base58)
   - Ensure wallet address matches public key

4. **Session not persisting**
   - Check SecureStore permissions (native)
   - Verify localStorage available (web)
   - Check token expiration time

## WalletConnect Integration

### Overview

ChainEquity now supports real Solana wallet connections via:
- **WalletConnect** - For mobile apps (iOS, Android)
- **Web Wallets** - Browser extensions (Phantom, Solflare, Backpack)
- **Mock Wallet** - Development and testing mode

### Wallet Adapter Selection

The system automatically selects the appropriate wallet adapter based on:
1. Environment variable: `EXPO_PUBLIC_USE_MOCK_WALLET`
2. Platform: Web uses browser extensions, mobile uses WalletConnect
3. Availability: Falls back to mock wallet if no real wallet detected

### Setup Instructions

#### 1. Get WalletConnect Project ID

```bash
# Visit https://cloud.walletconnect.com
# Create a project
# Copy your project ID
```

#### 2. Configure Environment Variables

**Frontend (.env)**:
```bash
# Wallet Configuration
EXPO_PUBLIC_USE_MOCK_WALLET=false  # Set to false for production
EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id-here
EXPO_PUBLIC_MOCK_WALLET_ADDRESS=11111111111111111111111111111111  # Dev only
```

**Backend (.env)**:
```bash
# Security Configuration
WALLET_NONCE_EXPIRY=300000  # 5 minutes
WALLET_TIMESTAMP_WINDOW=300000  # 5 minutes
```

#### 3. Deep Linking Configuration

Already configured in `app.json`:
- **iOS**: URL scheme `chainequity://`, LSApplicationQueriesSchemes for wallet apps
- **Android**: Intent filters for `chainequity://` and `https://peaksix.chainequity.archlife.org/wc`

#### 4. Supported Wallets

**Mobile (via WalletConnect)**:
- Phantom
- Solflare
- Backpack
- Glow
- Slope
- Trust Wallet
- Any WalletConnect-compatible Solana wallet

**Web (via Browser Extensions)**:
- Phantom
- Solflare
- Backpack
- Any wallet exposing `window.solana` provider

### Enhanced Security Model

#### Nonce-Based Signature Verification

ChainEquity implements a robust security model to prevent replay attacks:

```
Signature Flow with Nonce:
1. Frontend requests nonce from backend
   POST /auth/request-nonce
   Body: { wallet_address: "..." }
   
2. Backend generates cryptographically secure nonce
   - 32 bytes of random data
   - Stored with timestamp
   - Expires in 5 minutes (configurable)
   
3. Frontend generates message with nonce + timestamp
   Message format:
   "Sign this message to verify wallet ownership.\n\nNonce: <nonce>\nTimestamp: <timestamp>"
   
4. User signs message in wallet app
   
5. Frontend sends signature to backend
   POST /auth/link-wallet or /auth/wallet-login
   Body: { wallet_address, signature, message }
   
6. Backend validates:
   ✓ Nonce exists and not used
   ✓ Nonce not expired
   ✓ Timestamp within acceptable window
   ✓ Signature cryptographically valid
   ✓ Wallet address matches signer
   
7. Backend consumes nonce (single-use)
   
8. Wallet linked or user authenticated
```

#### Security Features

1. **Nonce Management**
   - Single-use nonces prevent replay attacks
   - Automatic expiration after 5 minutes
   - Optional wallet address association
   - In-memory storage (Redis recommended for production)

2. **Timestamp Validation**
   - Must be within 5-minute window of current time
   - Prevents old signed messages from being reused
   - Configurable via `WALLET_TIMESTAMP_WINDOW`

3. **Signature Verification**
   - Ed25519 cryptographic verification
   - Base58 encoding (Solana standard)
   - Validates message content integrity

4. **Rate Limiting**
   - Backend should implement rate limiting on nonce requests
   - Recommended: 10 requests per minute per IP

### Testing with Mock Wallet

For development and testing:

```bash
# Set environment to use mock wallet
EXPO_PUBLIC_USE_MOCK_WALLET=true
```

**Features**:
- No native dependencies required
- Custom address input for testing different wallets
- Deterministic mock signatures
- Simulates network delays
- Useful for automated testing

**Usage**:
1. App shows "Development (Mock)" mode indicator
2. Enter any valid Solana address
3. Click "Connect with Custom Address"
4. Proceed with linking/authentication
5. Backend validates nonce but accepts mock signature

### Production Deployment Checklist

- [ ] Set `EXPO_PUBLIC_USE_MOCK_WALLET=false`
- [ ] Configure valid WalletConnect project ID
- [ ] Enable rate limiting on nonce endpoints
- [ ] Consider Redis for nonce storage (multi-server)
- [ ] Monitor nonce generation/consumption metrics
- [ ] Set up alerts for failed signature verifications
- [ ] Configure proper CORS for WalletConnect
- [ ] Test deep linking on physical devices
- [ ] Verify wallet app installations work
- [ ] Test on multiple wallet providers

### API Endpoints

#### Request Nonce
```bash
POST /auth/request-nonce
Content-Type: application/json

{
  "wallet_address": "D8nYRLs4xjKN..." # Optional
}

Response:
{
  "success": true,
  "nonce": "sJ8kx...",
  "expiresAt": 1699564800000,
  "expiresIn": 300
}
```

#### Get Formatted Message
```bash
GET /auth/wallet-message/:nonce

Response:
{
  "success": true,
  "message": "Sign this message...\n\nNonce: sJ8kx...\nTimestamp: 1699564500000",
  "nonce": "sJ8kx...",
  "timestamp": 1699564500000
}
```

### Troubleshooting Wallet Issues

1. **"no PRNG" or "RNGetRandomValues" errors**
   - Fixed: We don't use nacl for mock signatures anymore
   - For real wallets: Ensure `react-native-get-random-values` installed

2. **WalletConnect QR code not appearing**
   - Check WalletConnect project ID is valid
   - Verify network access allowed
   - Check console for WalletConnect errors

3. **Deep linking not working**
   - Rebuild native apps after app.json changes
   - Test deep links with `npx uri-scheme open chainequity:// --ios`
   - Check wallet app is installed on device

4. **"Invalid nonce" errors**
   - Nonce may have expired (5 min limit)
   - Request new nonce and retry
   - Check server time synchronization

5. **Signature verification fails**
   - Ensure message format exactly matches
   - Check nonce and timestamp in message
   - Verify wallet signed correct message

6. **Web wallet not detected**
   - Ensure wallet extension installed
   - Refresh page after installing
   - Check browser console for errors

### Architecture Files

**Backend**:
- `backend/src/nonce.ts` - Nonce management system
- `backend/src/auth.ts` - Enhanced signature verification
- `backend/src/server.ts` - Nonce endpoints

**Frontend**:
- `frontend/hooks/useWalletConnection.ts` - Wallet factory
- `frontend/hooks/wallets/MockWallet.ts` - Mock implementation
- `frontend/hooks/wallets/WalletConnectAdapter.ts` - WalletConnect
- `frontend/hooks/wallets/WebWalletAdapter.ts` - Browser extensions
- `frontend/services/auth.ts` - Nonce integration
- `frontend/app/link-wallet.tsx` - Enhanced UI

**Configuration**:
- `frontend/app.json` - Deep linking setup
- `.env` files - Environment configuration

## Support

For issues or questions:
- Check logs: Backend console, React Native debugger
- Review RLS policies: Supabase dashboard
- Test auth endpoints: Use Postman/Insomnia
- Verify database state: Query users table directly
- WalletConnect issues: Check https://cloud.walletconnect.com

