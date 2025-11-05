# ChainEquity Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** November 5, 2025  
**Status:** Draft

---

## Goals and Background Context

### Goals

- Demonstrate a working prototype of tokenized securities on Solana with compliance-enforced transfer restrictions
- Implement a gated token contract with allowlist-based access control that prevents unauthorized transfers
- Build an operator-focused backend service for managing wallet approvals, token minting, and corporate actions
- Create an event indexer that produces accurate cap-table snapshots at any point in time
- Implement at least two corporate action mechanisms: 7-for-1 stock splits and symbol/ticker changes
- Provide a cross-platform mobile/web interface for administrators to demonstrate all core workflows
- Deliver comprehensive test coverage proving the system works correctly in both success and failure scenarios
- Document all architectural decisions, gas costs, and known limitations without making false compliance claims
- Create reproducible setup scripts and deployment procedures for demonstration purposes

### Background Context

Traditional cap-table management for private companies relies on manual spreadsheets, slow transfer agents, and opaque processes that limit liquidity and increase operational friction. Blockchain technology offers the potential to revolutionize this through tokenization: instant settlement, transparent ownership records, and automated compliance checks. However, most existing "security token" platforms are proprietary black-box solutions that hide the underlying mechanics and lock users into specific vendors.

ChainEquity addresses this gap by building an open, demonstrable prototype showing how tokenized securities could function on Solana. The system uses programmable smart contracts to enforce compliance rules (via allowlists), provides real-time ownership tracking through blockchain event indexing, and enables corporate actions like stock splits and ticker changes. This is explicitly a **technical prototype for educational purposes** - not a production-ready compliance solution. The goal is to prove the technical feasibility and explore the architectural patterns required, while clearly documenting limitations and risks.

**Key Technical Context from Existing Implementation:**
- ✅ Phases 1-3 are complete: foundation, smart contracts, event indexer, and cap table generator
- ✅ Solana blockchain chosen for high throughput, low fees, and mature tooling (Anchor framework)
- ✅ Backend built in TypeScript with Express, Supabase (PostgreSQL), and WebSocket for real-time updates
- ✅ Frontend is React Native (Expo) for cross-platform support (iOS, Android, Web)
- ✅ Smart contract implements 5 core instructions: initialize, approve, revoke, mint, gated_transfer
- ✅ Database schema tracks securities, allowlists, balances, transfers, and cap table snapshots
- ✅ WalletConnect integration enables real Solana wallet connections with enhanced security (nonce-based auth)

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-05 | 1.0 | Initial PRD creation based on completed work and new requirements | Bob (Scrum Master) |

---

## Requirements

### Functional Requirements

#### Core Token & Allowlist Management

**FR1:** The system shall implement a gated SPL token on Solana with transfer restrictions enforced by an on-chain allowlist, using Program Derived Addresses (PDAs) for deterministic account discovery.

**FR2:** Only wallets explicitly approved by the admin authority shall be able to send or receive tokens - all transfer attempts must validate BOTH sender AND recipient are on the allowlist before execution.

**FR3:** Admin operators shall be able to approve wallets for allowlist inclusion, storing approval status, timestamp, and approving authority on-chain.

**FR4:** Admin operators shall be able to revoke wallet approvals, immediately preventing the wallet from participating in future transfers.

**FR5:** The system shall mint tokens only to wallets that are currently approved on the allowlist, rejecting mint attempts to non-approved recipients.

**FR6:** Token transfers between two approved wallets shall succeed with proper signature validation and balance updates.

**FR7:** Token transfers involving at least one non-approved wallet (either sender or recipient) shall fail with a clear error indicating which party is not approved.

**FR8:** The system shall emit blockchain events for all state changes: token initialization, wallet approvals/revocations, token minting, and transfers.

#### Event Indexing & Cap Table

**FR9:** The backend event indexer shall listen to blockchain events in real-time via WebSocket subscription and store all events in the PostgreSQL database.

**FR10:** The system shall generate current cap-table snapshots showing wallet addresses, token balances, and percentage ownership based on current supply.

**FR11:** The system shall generate historical cap-table snapshots "as-of" any specified block height, reconstructing ownership state at that point in time.

**FR12:** Cap tables shall be exportable in both CSV and JSON formats with metadata including token symbol, total supply, holder count, and snapshot timestamp.

**FR13:** The system shall track complete transfer history with pagination support, including sender, recipient, amount, block height, signature, and timestamp.

**FR14:** The system shall calculate and provide ownership concentration metrics including top holder percentages and Gini coefficient.

#### Corporate Actions

**FR15:** The system shall support 7-for-1 stock splits by deploying a new token with the original supply multiplied by 7 and migrating all holder balances proportionally.

**FR16:** During stock splits, the system shall preserve percentage ownership for all holders (e.g., holder with 10% before split maintains 10% after split).

**FR17:** The system shall copy the allowlist from the original token to the new split token, maintaining approval status for all wallets.

**FR18:** The system shall support symbol/ticker changes by updating token metadata (symbol and name fields) while preserving all balances and ownership.

**FR19:** Corporate action execution shall be restricted to the admin authority and shall emit events documenting the action type, old values, new values, executor, and timestamp.

**FR20:** The system shall record all corporate actions in the database with complete audit trail including action type, affected token, parameters, execution time, and executor.

#### Authentication & Security

**FR21:** The system shall support wallet-based authentication using cryptographic signature verification with nonce-based replay attack prevention.

**FR22:** Nonces shall be single-use, cryptographically secure, and automatically expire after 5 minutes to prevent replay attacks.

**FR23:** The system shall generate JWT session tokens after successful wallet authentication to enable stateless API authentication.

**FR24:** The system shall support role-based access control with at least two roles: admin (full access to token operations) and investor (read-only access to portfolio).

**FR25:** All admin operations (approve, revoke, mint, corporate actions) shall require authenticated admin role and validate authority matches token configuration.

#### User Interface

**FR26:** The mobile/web application shall provide a home screen displaying the authenticated user's token holdings with symbol, name, balance, and ownership percentage.

**FR27:** The admin interface shall provide screens for: allowlist management, token minting, token initialization, cap table viewing/export, transfer history, and corporate actions.

**FR28:** The admin interface shall display all available securities in dropdowns/selectors to eliminate manual mint address entry errors.

**FR29:** The mint tokens screen shall allow admins to select recipients from the pre-approved allowlist, reducing the chance of minting to unapproved wallets.

**FR30:** The application shall show real-time connection status (backend connected/disconnected, network selected) in the header of all screens.

**FR31:** The application shall support switching between Solana networks (Devnet and Testnet) with user preference persisted across sessions.

**FR32:** The application shall use cross-platform modal dialogs instead of native alerts to ensure consistent UX across web, iOS, and Android.

**FR33:** All wallet addresses shall be displayed in truncated format (e.g., "ABC...XYZ") with a copy-to-clipboard button for full address access.

**FR34:** Transaction signatures shall be displayed as clickable links that open the transaction in Solana Explorer for verification.

#### Developer Experience & Testing

**FR35:** The system shall provide a simulation mode for local development where smart contract calls return mock data without requiring real blockchain transactions.

**FR36:** In simulation mode, database records shall be created/updated to match what would happen in production, enabling full workflow testing.

**FR37:** The smart contract test suite shall cover all 8 required scenarios: initialization, approval, minting, successful transfers, blocked transfers, revocation, unauthorized actions, and cap table export.

**FR38:** The backend shall provide health check endpoints that return service status, database connectivity, and Solana RPC connectivity.

**FR39:** The system shall log all admin operations with structured JSON logging including user, action, parameters, timestamp, and result.

**FR40:** The codebase shall include reproducible setup scripts that allow anyone to run the full stack with a single command (e.g., `docker-compose up`).

### Non-Functional Requirements

#### Performance

**NFR1:** Token transfer confirmation time shall be within Solana devnet/testnet normal latency (typically 1-5 seconds).

**NFR2:** The event indexer shall process blockchain events and update the database to produce an accurate cap table within 10 seconds of transaction finality.

**NFR3:** API endpoints shall respond within 2 seconds for all read operations under normal load.

**NFR4:** Gas costs (compute units) shall remain under project targets: initialize (<100k), approve (<50k), revoke (<50k), mint (<100k), transfer (<100k).

**NFR5:** The database shall use appropriate indexes on foreign keys, mint addresses, and wallet addresses to ensure query performance at scale.

#### Scalability & Reliability

**NFR6:** The backend server shall handle at least 100 concurrent WebSocket connections without degradation.

**NFR7:** The event indexer shall implement automatic reconnection logic with exponential backoff if the WebSocket connection to Solana RPC is lost.

**NFR8:** The system shall handle blockchain reorganizations gracefully, though devnet/testnet reorgs are extremely rare.

**NFR9:** The database schema shall use Row Level Security (RLS) policies to prevent unauthorized data access at the database layer.

**NFR10:** All database writes shall be wrapped in transactions to ensure atomicity and prevent partial state updates.

#### Code Quality & Maintainability

**NFR11:** The backend codebase shall be fully TypeScript with strict mode enabled and comprehensive type definitions for all modules.

**NFR12:** The backend shall use a handler-based architecture pattern, separating route definitions from business logic for maintainability.

**NFR13:** The frontend shall use reusable component patterns with at least 10 shared UI components (Button, Card, Input, Badge, Modal, etc.).

**NFR14:** The frontend shall use custom React hooks to separate presentation logic from business logic (useAuth, useWebSocket, useSolana, useTokenOperations, etc.).

**NFR15:** All secrets (database URLs, API keys, private keys) shall be managed via environment variables and never committed to version control.

**NFR16:** The codebase shall include `.env.example` files documenting all required environment variables with example values.

**NFR17:** All code shall follow consistent formatting and linting rules enforced by ESLint and Prettier.

#### Security

**NFR18:** The admin keypair for the smart contract authority shall be stored securely and never exposed in API responses or logs.

**NFR19:** All HTTP traffic to/from the backend shall use HTTPS in production deployments (HTTP allowed only in local development).

**NFR20:** WebSocket connections shall use WSS (secure WebSocket) protocol in production.

**NFR21:** API endpoints shall implement input validation using centralized validator functions to prevent injection attacks.

**NFR22:** Error messages shall not expose sensitive internal details (stack traces, database schema, private keys) to API consumers.

**NFR23:** The smart contract authority account shall be the only account authorized to perform admin operations (approve, revoke, mint).

#### Documentation & Compliance

**NFR24:** All documentation shall include a prominent disclaimer stating this is a technical prototype not suitable for real securities without legal review and regulatory approval.

**NFR25:** The system shall document all known limitations including: single admin authority (no multi-sig), no KYC/AML integration, no emergency pause mechanism.

**NFR26:** Smart contract documentation shall include account structures, instruction parameters, event schemas, error codes, and gas benchmarks.

**NFR27:** API documentation shall include endpoint URLs, request/response schemas, authentication requirements, and example curl commands.

**NFR28:** The README shall include step-by-step setup instructions that enable a new developer to run the full stack within 15 minutes.

---

## User Interface Design Goals

### Overall UX Vision

ChainEquity targets **technical administrators and operators** managing tokenized securities. The UX prioritizes clarity, precision, and transparency over consumer-friendly simplicity. Users need to see exactly what's happening on-chain, verify transactions, and have confidence in the system's state. The interface should feel like a professional financial tool - serious, data-rich, and reliable.

The application uses a **dark modern theme** reflecting the technical nature of blockchain operations. Real-time connection status is always visible to build trust. All operations provide clear feedback via modals and alerts. Transaction signatures link directly to blockchain explorers for verification. The system assumes users understand concepts like wallet addresses, token mints, and blockchain transactions.

### Key Interaction Paradigms

- **Progressive Disclosure**: Admin screens show essential information first, with expandable sections for advanced details (e.g., mint addresses, PDAs).
- **Real-time Feedback**: WebSocket connections provide live updates when allowlists change, tokens are minted, or transfers occur.
- **Confirmation Flows**: High-stakes operations (minting, corporate actions) require explicit confirmation modals showing exactly what will happen.
- **Copy-Paste Friendly**: All addresses, signatures, and technical identifiers have copy buttons since users often need to reference them elsewhere.
- **Selection over Entry**: Dropdowns and lists replace manual text entry wherever possible to reduce errors (e.g., select security from list vs. entering mint address).

### Core Screens and Views

1. **Authentication Screen** - Wallet connection (WalletConnect/Web wallets) with nonce-based signature verification
2. **Home Screen (Investor View)** - Token holdings card showing owned securities with balances and ownership percentages
3. **Admin Dashboard** - Navigation hub with tiles for all admin operations
4. **Token Initialization Screen** - Create new gated token with symbol, name, and decimals
5. **Allowlist Management Screen** - View and manage wallet approvals per security with approve/revoke actions
6. **Mint Tokens Screen** - Select security and recipient from allowlist, enter amount, mint tokens
7. **Cap Table Screen** - View current ownership breakdown, export as CSV/JSON, see historical snapshots
8. **Transfer History Screen** - Paginated list of all transfers with filters by token, date range
9. **Corporate Actions Screen** - Execute stock splits (7-for-1) and symbol changes
10. **Link Wallet Screen** - Connect Solana wallet to user profile (supports mock wallets for dev)

### Accessibility

**None** - This is a technical prototype targeting blockchain developers and administrators. Accessibility features are out of scope for the MVP but should be considered for production versions. The dark theme with sufficient contrast is the baseline accessibility consideration.

### Branding

ChainEquity uses a **dark, professional, modern theme** inspired by blockchain explorers and financial terminals:

- **Colors**: Dark backgrounds (#0a0a0a, #141414, #1e1e1e), white text (#ffffff), gray text for secondary content (#a1a1aa), accent colors for status (green for approved/connected, red for error/revoked, yellow for warnings, blue for info)
- **Typography**: Clean sans-serif fonts, monospace for addresses/signatures, clear hierarchy with font sizes from 12px to 32px
- **Components**: Card-based layouts with subtle borders, rounded corners (8px), shadow elevation for depth, consistent spacing scale (4, 8, 12, 16, 24, 32, 48px)
- **Iconography**: Status dots for connection state, checkmarks for approvals, warning triangles for errors, copy icons for addresses

Existing theme system is comprehensive (50+ color tokens, typography scale, spacing scale) and already implemented across all screens.

### Target Device and Platforms

**Cross-Platform: Mobile (iOS, Android) and Web Responsive**

The application is built with React Native (Expo) and targets:
- **iOS**: iPhone (iOS 13+) via Expo Go or native build
- **Android**: Android phones (Android 8+) via Expo Go or native build
- **Web**: Modern browsers (Chrome, Safari, Firefox, Edge) at responsive breakpoints (mobile 375px, tablet 768px, desktop 1024px+)

The admin workflows are optimized for larger screens (tablet/desktop) where data tables and forms are easier to read. Investor view (portfolio) works well on mobile. Real wallet connections require native builds for WalletConnect deep linking.

---

## Technical Assumptions

### Repository Structure

**Monorepo** - The project uses a single repository with three main directories:
- `backend/` - Node.js/TypeScript backend with Express, WebSocket, Solana integration, event indexer
- `frontend/` - React Native (Expo) cross-platform application
- `contracts/` - Anchor framework Rust smart contracts for Solana
- `database/` - SQL migration files for Supabase/PostgreSQL schema

This structure allows coordinated changes across the stack (e.g., updating API types when smart contract events change) and simplifies CI/CD pipelines.

### Service Architecture

**Unified Backend Service (Monolith within Monorepo)** - The backend is a single Express server that:
- Serves REST API endpoints on port 3000
- Handles WebSocket connections on the same port via HTTP upgrade at `/ws` path
- Runs the event indexer as an internal module (subscribes to Solana events via WebSocket)
- Connects to external Supabase PostgreSQL database
- Connects to Solana devnet/testnet RPC via HTTPS

This monolithic approach is appropriate for the prototype scale. The architecture is documented to enable future migration to microservices if needed (e.g., separate indexer service, separate API gateway).

**Smart Contract Architecture**: Single Anchor program (`gated-token`) deployed to Solana with PDA-based account structure for token config, allowlist entries, and split config records.

### Testing Requirements

**Comprehensive Testing Pyramid**:

1. **Smart Contract Tests** (Anchor test framework with Mocha/Chai):
   - ✅ Complete test suite implemented covering all 8 required scenarios
   - Unit tests for each instruction (initialize, approve, revoke, mint, transfer)
   - Integration tests for end-to-end workflows
   - Gas benchmarking logged during test execution

2. **Backend Integration Tests** (Jest or Mocha) - **TODO**:
   - API endpoint tests with mock Solana client
   - Database interaction tests with test database
   - Event processing tests with mock blockchain events
   - WebSocket message broadcast tests

3. **Frontend Tests** - **DEFERRED TO POST-MVP**:
   - Component unit tests for reusable components
   - Hook tests for custom hooks
   - E2E tests with Detox or Playwright (optional)

4. **Manual Testing Procedures**:
   - Demo script (`scripts/demo.js`) that runs through all workflows automatically
   - Manual test checklist for UI flows on different devices
   - Manual verification of transactions on Solana Explorer

**Testing Philosophy**: Prioritize backend and smart contract testing (where bugs are most costly). Frontend testing focuses on integration testing via manual demo procedures. Test coverage should catch:
- False positives (unapproved wallet incorrectly allowed to transfer)
- False negatives (approved wallet incorrectly blocked from transfer)
- State corruption (e.g., supply mismatch between blockchain and database)

### Additional Technical Assumptions and Requests

1. **Blockchain Network**: Use Solana **Devnet** for all development and demonstrations. Never use mainnet. Testnet is acceptable alternative. Network selection is user-configurable in the UI.

2. **Database Provider**: Use **Supabase** (managed PostgreSQL) for database, authentication, and realtime subscriptions. Supabase provides:
   - Postgres database with Row Level Security (RLS)
   - Realtime WebSocket subscriptions for database changes
   - Authentication with JWT tokens
   - REST API for database access

3. **Smart Contract Framework**: Use **Anchor framework (v0.29+)** for Solana program development. Anchor provides:
   - High-level abstractions for account management
   - Automatic (de)serialization with Borsh
   - PDA derivation helpers
   - IDL generation for client integration
   - Testing framework with TypeScript

4. **Frontend Framework**: Use **React Native with Expo** for cross-platform mobile/web support. Expo provides:
   - File-based routing via expo-router
   - Hot reload during development
   - Web export (npx expo export:web)
   - Native builds when needed
   - No need for separate codebases per platform

5. **Wallet Integration**: Support both **WalletConnect** (for mobile) and **web3 wallet adapters** (for browser extensions like Phantom, Solflare). Include **mock wallet mode** for development without real wallet requirements.

6. **Environment Configuration**:
   - Backend requires: `SUPABASE_URL`, `SUPABASE_KEY`, `SOLANA_NETWORK`, `PORT`, `ADMIN_KEYPAIR_PATH`, `GATED_TOKEN_PROGRAM_ID`
   - Frontend requires: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_USE_MOCK_WALLET`, `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID`
   - All `.env` files tracked in git with `.env.example` templates

7. **Deployment Target**: Prototype is designed for **local development and demo purposes**. Production deployment would require:
   - Backend deployed to cloud (AWS, Heroku, Render, etc.)
   - Frontend web build deployed to static hosting (Vercel, Netlify)
   - Frontend mobile builds distributed via TestFlight (iOS) or APK (Android)
   - Smart contracts deployed to Solana testnet or mainnet

8. **CI/CD**: Not implemented in MVP but architecture supports:
   - GitHub Actions for running tests on push
   - Automated smart contract deployment to devnet on merge to main
   - Automated backend deployment on release tags
   - Frontend web build deployment on release

9. **Error Handling Philosophy**: Use custom error classes (`ValidationError`, `AuthenticationError`, `BlockchainError`, etc.) throughout the backend. Frontend displays user-friendly error messages via modal dialogs. All errors logged with structured JSON format for debugging.

10. **Real-time Updates**: Use dual-channel approach:
    - Supabase Realtime for database changes (allowlist updates, balance changes)
    - Custom WebSocket for Solana transaction broadcasts (pending tx, confirmed tx)
    - Frontend subscribes to both channels and updates UI optimistically where appropriate

11. **Development Workflow**:
    - Hot reload for frontend (Expo dev server)
    - Nodemon auto-restart for backend (ts-node in watch mode)
    - Anchor localnet for smart contract development (solana-test-validator)
    - All three services run concurrently during development

12. **Code Style**: Use Prettier for consistent formatting. ESLint for linting with recommended TypeScript rules. All files must pass linting before commit (enforced via git hooks if time permits).

---

## Epic List

The following epics represent the logical progression to complete the ChainEquity prototype. Each epic delivers a significant, deployable increment of functionality.

**CURRENT STATUS NOTE**: Epics 1-3 are already **COMPLETE** based on the existing codebase. This PRD documents what has been completed and specifies the remaining work.

### Epic 1: ✅ COMPLETE - Foundation & Infrastructure (COMPLETE)

**Goal**: Establish the project foundation with repository setup, database schema, theme system, reusable components, and core backend architecture. Deliver a functional home screen showing user data and WebSocket connectivity.

**Status**: All stories complete. Backend fully migrated to TypeScript. Home screen refactored. WalletConnect integration complete. Cross-platform modal system implemented.

### Epic 2: ✅ COMPLETE - Gated Token Smart Contract (COMPLETE)

**Goal**: Implement and test the Solana smart contract with allowlist-based transfer restrictions. Deploy to devnet and verify all core instructions work correctly.

**Status**: All 5 core instructions implemented (initialize, approve, revoke, mint, gated_transfer). Complete test suite with 8 scenarios passing. Gas benchmarks documented.

### Epic 3: ✅ COMPLETE - Event Indexer & Cap Table System (COMPLETE)

**Goal**: Build the blockchain event listener that processes all token events and stores them in the database. Implement cap table generation with historical snapshot support and CSV/JSON export.

**Status**: Event indexer fully functional. Cap table generator complete with concentration metrics. 10+ API endpoints. WebSocket broadcasts for real-time updates.

### Epic 4: 🚧 IN PROGRESS - Corporate Actions System

**Goal**: Implement stock split (7-for-1) and symbol/ticker change functionality. Enable admins to execute corporate actions via the UI with proper migration workflows and audit trails.

**Key Deliverables**:
- Stock split instruction in smart contract (deploy new token approach)
- Migration script to copy holders and allowlist to new token
- Symbol/ticker change instruction (mutable metadata)
- Corporate actions screen in admin UI
- Database records and API endpoints for corporate action history

**Dependencies**: Requires Epic 2 (smart contract) and Epic 3 (event indexer)

### Epic 5: ⏳ TODO - Admin Interface Enhancement

**Goal**: Polish and complete all admin screens with improved UX, validation, and error handling. Ensure all admin workflows are intuitive and production-ready.

**Key Deliverables**:
- Improved navigation between admin screens
- Enhanced validation and error messaging
- Bulk operations (approve multiple wallets)
- Admin dashboard with key metrics
- Help/documentation tooltips

**Dependencies**: Requires Epic 4 (corporate actions complete)

### Epic 6: ⏳ TODO - Testing, Documentation & Demo

**Goal**: Complete the test suite, write comprehensive documentation, create demo scripts, and prepare the project for submission/presentation.

**Key Deliverables**:
- Backend integration tests (Jest)
- Demo script that runs through all workflows
- Technical writeup (2-3 pages)
- Gas benchmark report
- API reference documentation
- Demo video or presentation slides

**Dependencies**: Requires Epic 5 (all features complete)

---

## Next Steps

This PRD will be expanded with detailed **Epic Detail sections** for each epic (Epics 4-6 require full story breakdowns). After epic details are complete, the following prompts will guide the next phases:

### UX Expert Prompt

_"Using the ChainEquity PRD as input, review the UI Design Goals section and create detailed screen specifications for all admin screens (Corporate Actions, Admin Dashboard, and any enhanced screens from Epic 5). Include wireframes, component breakdowns, user interaction flows, and error states. Follow the existing dark theme design system and reusable component library."_

### Architect Prompt

_"Using the ChainEquity PRD and existing architecture.md as input, extend the architecture documentation to cover corporate actions implementation (stock splits and symbol changes). Document the migration approach for splits, the data flow for symbol changes, and any new API endpoints or database schema changes required. Update the architecture diagrams to include corporate action workflows."_

---

**END OF MAIN PRD DOCUMENT**

Next: Detailed epic breakdowns will be created in separate files (`epic-1-foundation.md`, `epic-2-smart-contract.md`, etc.) per the sharded PRD structure.
