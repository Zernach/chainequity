# Epic 1: Foundation & Infrastructure

**Status:** ✅ COMPLETE  
**Goal:** Establish the project foundation with repository setup, database schema, theme system, reusable components, and core backend architecture. Deliver a functional home screen showing user data and WebSocket connectivity.

---

## Epic Goal (Expanded)

This epic establishes all foundational infrastructure required for ChainEquity. It creates the repository structure, sets up the database schema, implements the design system with reusable components, builds the backend server with TypeScript, and delivers a functional home screen that demonstrates real-time WebSocket connectivity and user management. By the end of this epic, the team can iterate on features with confidence that the core infrastructure is stable, type-safe, and follows best practices.

---

## Stories

### Story 1.1: Project Initialization & Repository Structure

**As a** developer,  
**I want** a properly structured monorepo with separate directories for backend, frontend, contracts, and database,  
**so that** the codebase is organized logically and team members can work independently on different components.

#### Acceptance Criteria

1. Repository created with `.gitignore` configured to exclude `node_modules`, `.env`, build artifacts, and IDE files
2. Directory structure created: `backend/`, `frontend/`, `contracts/`, `database/`, `@docs/`
3. Each subdirectory has its own `package.json` with appropriate dependencies
4. Root `README.md` created with project overview and setup instructions
5. Environment variable templates (`.env.example`) created for backend and frontend
6. Git repository initialized with initial commit

**Status:** ✅ Complete

---

### Story 1.2: Database Schema & Supabase Integration

**As a** backend developer,  
**I want** a PostgreSQL database schema that tracks users, securities, allowlists, balances, and transfers,  
**so that** the application can store and query all tokenized security data.

#### Acceptance Criteria

1. Supabase project created and configured
2. Migration file `001_create_users_table.sql` creates `users` table with id, name, email, wallet_address, role, created_at, updated_at
3. Migration file `002_create_securities_tables.sql` creates tables: `securities`, `allowlist`, `token_balances`, `corporate_actions`, `transfers`, `cap_table_snapshots`
4. All foreign key relationships defined correctly
5. Indexes created on frequently queried columns (mint_address, wallet_address, block_height)
6. Row Level Security (RLS) policies enabled on all tables
7. Triggers created for auto-updating timestamps
8. Database connection string stored in backend `.env` file
9. Backend can successfully connect to Supabase and query data

**Status:** ✅ Complete

---

### Story 1.3: Frontend Theme System & Design Tokens

**As a** frontend developer,  
**I want** a centralized theme system with colors, spacing, typography, and design tokens,  
**so that** the UI is consistent across all screens and easy to maintain.

#### Acceptance Criteria

1. File `frontend/constants/colors.ts` created with 50+ color tokens organized by purpose (primary, secondary, success, error, warning, info, etc.)
2. Dark mode color palette implemented (dark backgrounds, light text)
3. File `frontend/constants/spacing.ts` created with spacing scale (4, 8, 12, 16, 24, 32, 48, 64, 96px)
4. File `frontend/constants/typography.ts` created with font sizes, weights, line heights, letter spacing
5. File `frontend/constants/theme.ts` created combining all design tokens (colors, spacing, typography, radius, shadows, opacity, z-index)
6. Barrel export `frontend/constants/index.ts` exports all constants
7. All existing screens refactored to use theme constants instead of hardcoded values
8. Theme supports responsive design with platform-specific overrides where needed

**Status:** ✅ Complete

---

### Story 1.4: Reusable UI Components Library

**As a** frontend developer,  
**I want** a library of reusable UI components (Button, Card, Input, Badge, etc.),  
**so that** screens can be built quickly with consistent design and behavior.

#### Acceptance Criteria

1. `Button` component created with 5 variants (primary, secondary, danger, success, ghost), 3 sizes, loading states, disabled states
2. `Card` component created with padding, elevation, border radius, customizable background
3. `Input` component created with label, placeholder, error states, focus handling, dark mode styling
4. `Badge` component created with 10 status variants (approved, pending, rejected, connected, disconnected, success, error, warning, info, default)
5. `LoadingSpinner` component created with optional message prop
6. `Alert` component created with 4 variants (success, error, warning, info) and title/message props
7. `WalletAddress` component created with truncation logic and copy-to-clipboard functionality
8. `TransactionStatus` component created with Solana Explorer link generation
9. `Modal` component created with header, content, footer sections and show/hide logic
10. `Separator` component created supporting horizontal and vertical orientation
11. All components use TypeScript with proper prop interfaces
12. Barrel export `frontend/components/index.ts` exports all components

**Status:** ✅ Complete

---

### Story 1.5: Frontend Custom Hooks

**As a** frontend developer,  
**I want** custom React hooks for common patterns (WebSocket, API calls, Solana operations),  
**so that** screens can focus on presentation logic while hooks handle business logic.

#### Acceptance Criteria

1. `useWebSocket` hook created with auto-reconnect, message queue, connection status tracking
2. `useApi` hook created as generic wrapper for API calls with loading, error, data states
3. `useSolana` hook created for balance fetching, allowlist checking, token info queries
4. `useCapTable` hook created for cap table fetching with auto-refresh and export functionality
5. `useTokenOperations` hook created for minting, approval, revocation, corporate actions
6. `useUsers` hook created for user management (fetch, create)
7. `useWebSocketConnection` hook created for global WebSocket state management
8. `useTokenMint` hook created for Solana token minting operations
9. `useAuth` hook created for authentication state and operations
10. `useWalletConnection` hook created for wallet adapter integration
11. `useAlertModal` hook created for cross-platform modal dialogs
12. `useNetwork` hook created for Solana network selection (devnet/testnet)
13. Barrel export `frontend/hooks/index.ts` exports all hooks

**Status:** ✅ Complete

---

### Story 1.6: Backend TypeScript Migration & Architecture

**As a** backend developer,  
**I want** the entire backend codebase migrated to TypeScript with strict mode enabled,  
**so that** the code is type-safe, self-documenting, and easier to refactor.

#### Acceptance Criteria

1. All `.js` files in `backend/src/` converted to `.ts` files
2. `tsconfig.json` created with strict mode enabled and Node.js configuration
3. Type definition files created in `backend/src/types/` directory (database.types.ts, solana.types.ts, websocket.types.ts, cap-table.types.ts, indexer.types.ts)
4. All functions have explicit parameter types and return types
5. Interface definitions created for all API requests/responses
6. `package.json` updated with TypeScript dependencies (typescript, @types/node, @types/express, ts-node, nodemon)
7. `nodemon.json` configured to watch `.ts` files and use ts-node
8. Build script added to compile TypeScript to JavaScript in `dist/` directory
9. Dev script (`yarn dev`) runs ts-node with nodemon for hot reload
10. Production script (`yarn start`) runs compiled JavaScript
11. All TypeScript compilation errors resolved
12. No `any` types used (strict mode enforced)

**Status:** ✅ Complete

---

### Story 1.7: Backend Handler-Based Architecture

**As a** backend developer,  
**I want** the backend server refactored into a handler-based pattern,  
**so that** the main server file only defines routes and handlers contain all business logic.

#### Acceptance Criteria

1. Directory `backend/src/handlers/` created
2. Handler files created: `auth.handlers.ts`, `users.handlers.ts`, `solana.handlers.ts`, `cap-table.handlers.ts`, `securities.handlers.ts`, `admin.handlers.ts`
3. Barrel export `backend/src/handlers/index.ts` exports all handler functions
4. Main `server.ts` file reduced to < 100 lines containing only middleware setup and route definitions
5. Each handler function accepts (req, res) parameters with proper TypeScript types
6. All business logic moved from server.ts into appropriate handler files
7. Handlers use async/await for asynchronous operations
8. Try-catch blocks wrap all handler logic with error response handling
9. Consistent error response format: `{ success: false, error: string }`
10. Consistent success response format: `{ success: true, data: any }`

**Status:** ✅ Complete

---

### Story 1.8: Backend Utilities & Error Handling

**As a** backend developer,  
**I want** centralized utility functions for logging, validation, and custom error classes,  
**so that** error handling is consistent and debugging is easier.

#### Acceptance Criteria

1. File `backend/src/utils/logger.ts` created with structured JSON logger (log levels: ERROR, WARN, INFO, DEBUG)
2. File `backend/src/utils/validators.ts` created with 10+ validation functions (publicKey, amount, symbol, name, decimals, etc.)
3. File `backend/src/utils/errors.ts` created with 7 custom error classes extending Error base class
4. Custom error classes: `ValidationError`, `AuthenticationError`, `AuthorizationError`, `BlockchainError`, `DatabaseError`, `NotFoundError`, `ConflictError`
5. Express error handler middleware created in errors.ts that catches all errors and formats responses
6. Logger used throughout backend instead of console.log
7. Validators used in all handler functions before processing requests
8. Custom errors thrown with descriptive messages instead of generic errors
9. Error middleware added as last middleware in server.ts
10. Logging includes timestamp, level, message, and optional metadata

**Status:** ✅ Complete

---

### Story 1.9: Backend Database & WebSocket Services

**As a** backend developer,  
**I want** database client and WebSocket service modules,  
**so that** handlers can easily interact with the database and broadcast real-time updates.

#### Acceptance Criteria

1. File `backend/src/db.ts` created exporting configured Supabase client instance
2. Supabase client configured with URL and API key from environment variables
3. Two client instances: `supabase` (regular client with RLS) and `supabaseAdmin` (service role bypasses RLS)
4. File `backend/src/websocket.ts` created managing WebSocket server and connections
5. WebSocket server attached to HTTP server with upgrade handler on `/ws` path
6. Connection tracking with Set of active connections
7. Broadcast functions: `broadcastAllowlistUpdate`, `broadcastTokenMinted`, `broadcastTokenTransferred`, `broadcastCapTableUpdate`, `broadcastCorporateAction`
8. Supabase Realtime subscriptions set up for database changes
9. Database changes automatically broadcast to connected WebSocket clients
10. WebSocket message format standardized: `{ type: string, data: any, timestamp: number }`

**Status:** ✅ Complete

---

### Story 1.10: Frontend Home Screen & User Management

**As a** user,  
**I want** a home screen that displays my profile and token holdings,  
**so that** I can see my account information and owned securities at a glance.

#### Acceptance Criteria

1. File `frontend/app/index.tsx` refactored to use reusable components and hooks
2. Home screen reduced from 383 lines to < 100 lines
3. User profile card displays: name, email, wallet address (truncated with copy), role badge
4. Token holdings card displays list of owned securities with symbol, name, balance, ownership percentage
5. Empty state shown when no holdings exist with helpful message
6. Refresh button to manually reload holdings
7. Loading states displayed while fetching data
8. Error states displayed if data fetching fails
9. Real-time updates via WebSocket when holdings change
10. "Link Wallet" button shown if user has no wallet connected
11. Admin users see additional navigation options to admin screens
12. Connection status indicator in header shows backend connectivity
13. Network selector in header allows switching between devnet/testnet

**Status:** ✅ Complete

---

### Story 1.11: Authentication & Wallet Connection

**As a** user,  
**I want** to authenticate using my Solana wallet with cryptographic signature verification,  
**so that** I can securely access the application without traditional passwords.

#### Acceptance Criteria

1. File `backend/src/nonce.ts` created managing nonce generation, storage, and validation
2. Nonces are cryptographically secure (crypto.randomBytes), single-use, auto-expire after 5 minutes
3. Backend endpoint `POST /auth/request-nonce` returns new nonce for wallet address
4. Backend endpoint `GET /auth/wallet-message/:nonce` returns formatted message for signing
5. Backend endpoint `POST /auth/wallet-login` validates signature and returns JWT session
6. File `frontend/services/auth.ts` implements wallet authentication flow
7. Frontend hook `useAuth` provides login, logout, session restore functions
8. AuthContext created to manage global authentication state
9. Protected routes check authentication and redirect to auth screen if needed
10. JWT tokens stored securely in AsyncStorage
11. Access tokens included in Authorization header for all authenticated API calls
12. WalletConnect integration for mobile wallet apps (Phantom, Solflare, Backpack)
13. Web wallet adapter for browser extensions
14. Mock wallet mode for development without real wallet
15. Environment variable `EXPO_PUBLIC_USE_MOCK_WALLET` toggles mock wallet

**Status:** ✅ Complete

---

### Story 1.12: Cross-Platform Modal System

**As a** frontend developer,  
**I want** a cross-platform modal system that works consistently on web, iOS, and Android,  
**so that** users get proper confirmation dialogs and alerts regardless of platform.

#### Acceptance Criteria

1. Component `AlertModal` created with customizable types (success, error, warning, info, confirm)
2. Modal renders consistently on web (div overlay) and native (React Native Modal)
3. Hook `useAlertModal` created for easy modal management with state and helper methods
4. Helper methods: `alert()`, `success()`, `error()`, `warning()`, `confirm()`
5. Confirm modals support custom button configurations (text, style, callback)
6. Modal supports icon indicators for each alert type
7. Modal supports auto-dismiss with optional timeout
8. Modal supports backdrop press to close (configurable)
9. All `Alert.alert` calls replaced throughout the application
10. Hooks refactored to return error states instead of showing alerts directly
11. Components handle displaying modals based on hook error states
12. Modal styling matches dark theme design system

**Status:** ✅ Complete

---

### Story 1.13: Network Selection & Persistence

**As a** user,  
**I want** to select between Solana networks (Devnet, Testnet) with my preference saved,  
**so that** I can switch environments for testing without losing my selection.

#### Acceptance Criteria

1. File `frontend/contexts/NetworkContext.tsx` created managing network state
2. Network type: `'devnet' | 'testnet'` with default 'devnet'
3. Network selection persisted to AsyncStorage with key `@chainequity:solana_network`
4. Context provides `network` (current network) and `setNetwork` (update function)
5. Context automatically loads saved network on app initialization
6. Header component displays current network in dropdown
7. Dropdown shows both networks with checkmark next to active network
8. Clicking network in dropdown updates context and persists to storage
9. Active network highlighted with primary color and bold text
10. NetworkProvider wraps app in root layout
11. `useNetwork` hook exported from hooks/index.ts for easy access
12. Backend API calls (when implemented) will use selected network for RPC endpoint

**Status:** ✅ Complete

---

## Summary of Deliverables

### Backend (TypeScript)
- ✅ 17 source files fully migrated to TypeScript with strict mode
- ✅ Handler-based architecture (6 handler modules + barrel export)
- ✅ 3 utility modules (logger, validators, errors)
- ✅ 5 type definition files
- ✅ Database client (Supabase) with admin and regular clients
- ✅ WebSocket service with broadcast functions
- ✅ Authentication service with nonce management
- ✅ Health check endpoints

### Frontend (React Native + Expo)
- ✅ 11 reusable UI components
- ✅ 13 custom React hooks
- ✅ 5 theme/constant files (colors, spacing, typography, theme, barrel export)
- ✅ 2 context providers (AuthContext, NetworkContext)
- ✅ 3 service modules (api, auth, types)
- ✅ Home screen fully refactored
- ✅ Authentication screens (auth, link-wallet)
- ✅ WalletConnect integration (mobile + web)
- ✅ Cross-platform modal system

### Database
- ✅ 2 migration files (users, securities schema)
- ✅ 6 tables with relationships (users, securities, allowlist, token_balances, corporate_actions, transfers)
- ✅ RLS policies enabled
- ✅ Indexes on foreign keys

### Documentation
- ✅ Main README.md
- ✅ Backend README.md
- ✅ Architecture.md (comprehensive 535 lines)
- ✅ PROGRESS.md (tracking 1558 lines)
- ✅ .env.example files

---

## Key Architectural Decisions

1. **Monorepo Structure**: Single repository with clear directory separation enables coordinated changes across stack
2. **TypeScript Everywhere**: Backend and frontend both use TypeScript for type safety and better developer experience
3. **Handler Pattern**: Backend separates route definitions from business logic for maintainability
4. **Reusable Components**: 11 UI components reduce duplication and ensure consistency
5. **Custom Hooks**: 13 hooks separate presentation from business logic in frontend
6. **Supabase**: Managed PostgreSQL with realtime subscriptions and authentication
7. **Dark Theme**: Professional, modern appearance appropriate for technical/financial application
8. **Cross-Platform**: Single codebase targets web, iOS, Android via React Native + Expo
9. **WalletConnect**: Real Solana wallet authentication with nonce-based security
10. **Mock Wallet**: Development mode for testing without real blockchain transactions

---

**Epic 1 Status: ✅ COMPLETE**

All foundational infrastructure is in place. The team can now build features on a solid, type-safe, well-documented foundation.
