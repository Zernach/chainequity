# ChainEquity API Endpoints

Base URL: `http://localhost:3000` (development)

## Table of Contents
- [Health & Status](#health--status)
- [Cap Table Endpoints](#cap-table-endpoints)
- [Securities Endpoints](#securities-endpoints)
- [Allowlist Endpoints](#allowlist-endpoints)
- [Transfer Endpoints](#transfer-endpoints)
- [Legacy Endpoints](#legacy-endpoints)

---

## Health & Status

### GET /health
Health check endpoint to verify the server is running.

**Response:**
```json
{
  "status": "ok",
  "message": "ChainEquity backend is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Cap Table Endpoints

### GET /cap-table/:mintAddress
Get the current cap table for a token.

**Parameters:**
- `mintAddress` (path) - Token mint address

**Response:**
```json
{
  "success": true,
  "data": {
    "token": {
      "mint_address": "HN7cA...",
      "symbol": "ACME",
      "name": "ACME Corp Token",
      "decimals": 9,
      "total_supply": 1000000,
      "program_id": "7zmj..."
    },
    "snapshot": {
      "block_height": null,
      "timestamp": "2024-01-01T00:00:00.000Z",
      "is_historical": false
    },
    "summary": {
      "total_holders": 3,
      "total_shares": 1000000,
      "percentage_distributed": 100
    },
    "holders": [
      {
        "wallet_address": "9xQe...",
        "shares": 700000,
        "percentage": 70.0,
        "allowlist_status": "approved",
        "approved_at": "2024-01-01T00:00:00.000Z",
        "last_updated": "2024-01-01T00:00:00.000Z",
        "block_height": 123456
      }
    ]
  }
}
```

### GET /cap-table/:mintAddress/:blockHeight
Get a historical cap table snapshot at a specific block height.

**Parameters:**
- `mintAddress` (path) - Token mint address
- `blockHeight` (path) - Block height for snapshot

**Response:** Same structure as GET /cap-table/:mintAddress but with `is_historical: true`

### POST /cap-table/:mintAddress/export
Export cap table as CSV or JSON file.

**Parameters:**
- `mintAddress` (path) - Token mint address

**Request Body:**
```json
{
  "format": "csv",
  "blockHeight": 123456
}
```

**Response:** File download (CSV or JSON)

**CSV Format:**
```csv
Token: ACME (ACME Corp Token)
Mint Address: HN7cA...
Total Supply: 1000000
Total Holders: 3
Generated: 2024-01-01T00:00:00.000Z

Wallet Address,Shares,Percentage,Allowlist Status,Approved At,Last Updated
9xQe...,700000,70.0,approved,2024-01-01T00:00:00.000Z,2024-01-01T00:00:00.000Z
```

### GET /cap-table/:mintAddress/history/holder-count
Get holder count history over time.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "block_height": 123456,
      "holder_count": 3,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /cap-table/:mintAddress/metrics/concentration
Get ownership concentration metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "top_1_holders": 70.0,
    "top_5_holders": 95.0,
    "top_10_holders": 100.0,
    "gini_coefficient": 0.4567,
    "interpretation": "Moderate concentration"
  }
}
```

**Gini Coefficient Interpretation:**
- < 0.2: Very equal distribution
- 0.2-0.4: Relatively equal distribution
- 0.4-0.6: Moderate concentration
- 0.6-0.8: High concentration
- > 0.8: Very high concentration

---

## Securities Endpoints

### GET /securities
Get all active securities (token mints).

**Response:**
```json
{
  "success": true,
  "securities": [
    {
      "id": "uuid",
      "mint_address": "HN7cA...",
      "symbol": "ACME",
      "name": "ACME Corp Token",
      "decimals": 9,
      "total_supply": 1000000,
      "current_supply": 1000000,
      "program_id": "7zmj...",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### GET /securities/:mintAddress
Get details for a specific security.

**Parameters:**
- `mintAddress` (path) - Token mint address

**Response:**
```json
{
  "success": true,
  "security": {
    "id": "uuid",
    "mint_address": "HN7cA...",
    "symbol": "ACME",
    "name": "ACME Corp Token",
    "decimals": 9,
    "total_supply": 1000000,
    "current_supply": 1000000,
    "program_id": "7zmj...",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Allowlist Endpoints

### GET /allowlist/:mintAddress
Get all allowlist entries for a security.

**Parameters:**
- `mintAddress` (path) - Token mint address

**Response:**
```json
{
  "success": true,
  "allowlist": [
    {
      "id": "uuid",
      "security_id": "uuid",
      "wallet_address": "9xQe...",
      "status": "approved",
      "approved_by": "Admin...",
      "approved_at": "2024-01-01T00:00:00.000Z",
      "revoked_at": null,
      "notes": "Verified investor",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### GET /allowlist/:mintAddress/:walletAddress
Check if a specific wallet is on the allowlist.

**Parameters:**
- `mintAddress` (path) - Token mint address
- `walletAddress` (path) - Wallet address to check

**Response:**
```json
{
  "success": true,
  "wallet_address": "9xQe...",
  "is_approved": true,
  "status": "approved",
  "details": {
    "id": "uuid",
    "security_id": "uuid",
    "wallet_address": "9xQe...",
    "status": "approved",
    "approved_by": "Admin...",
    "approved_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Status Values:**
- `approved` - Wallet is approved and can send/receive tokens
- `pending` - Approval is pending
- `rejected` - Wallet was rejected
- `revoked` - Approval was revoked
- `not_found` - Wallet is not on the allowlist

---

## Transfer Endpoints

### GET /transfers/:mintAddress
Get transfer history for a token.

**Parameters:**
- `mintAddress` (path) - Token mint address

**Query Parameters:**
- `limit` (optional) - Number of results (default: 100)
- `offset` (optional) - Pagination offset (default: 0)
- `from` (optional) - Filter by sender wallet
- `to` (optional) - Filter by recipient wallet

**Example:** `/transfers/HN7cA...?limit=50&offset=0&from=9xQe...`

**Response:**
```json
{
  "success": true,
  "data": {
    "transfers": [
      {
        "id": "uuid",
        "security_id": "uuid",
        "transaction_signature": "5j7k...",
        "from_wallet": "9xQe...",
        "to_wallet": "8pRd...",
        "amount": 10000,
        "block_height": 123456,
        "slot": 123456,
        "block_time": "2024-01-01T00:00:00.000Z",
        "status": "confirmed",
        "error_message": null,
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "limit": 100,
    "offset": 0
  }
}
```

---

## Legacy Endpoints

### GET /users
Get all users.

**Response:**
```json
{
  "success": true,
  "users": [],
  "count": 0
}
```

### POST /users
Create a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "wallet_address": "9xQe..." // optional
}
```

### POST /mint-token
Mint SOL tokens (devnet airdrop).

**Request Body:**
```json
{
  "amount": 1
}
```

### POST /create-wallet
Create a new Solana wallet.

**Response:**
```json
{
  "success": true,
  "wallet": {
    "publicKey": "9xQe...",
    "secretKey": [1, 2, 3, ...]
  }
}
```

### GET /balance/:publicKey
Get wallet SOL balance.

**Parameters:**
- `publicKey` (path) - Wallet public key

**Response:**
```json
{
  "success": true,
  "publicKey": "9xQe...",
  "balance": 1.5
}
```

---

## WebSocket Events

Connect to WebSocket: `ws://localhost:3000/ws`

The WebSocket endpoint is on the same server as the REST API. The HTTP connection automatically upgrades to WebSocket when connecting to the `/ws` path.

### Event Types

#### connection
Sent when client connects.
```json
{
  "type": "connection",
  "message": "Connected to ChainEquity WebSocket server",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### allowlist_updated
Emitted when allowlist changes.
```json
{
  "type": "allowlist_updated",
  "data": {
    "event": "INSERT",
    "data": { /* allowlist entry */ }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### token_minted
Emitted when tokens are minted.
```json
{
  "type": "token_minted",
  "data": {
    "security_id": "uuid",
    "recipient": "9xQe...",
    "amount": 10000,
    "new_supply": 1000000
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### token_transferred
Emitted when tokens are transferred.
```json
{
  "type": "token_transferred",
  "data": {
    "security_id": "uuid",
    "from": "9xQe...",
    "to": "8pRd...",
    "amount": 10000
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### cap_table_updated
Emitted when balances change.
```json
{
  "type": "cap_table_updated",
  "data": {
    "event": "UPDATE",
    "data": { /* token_balance entry */ }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### corporate_action
Emitted when corporate actions occur.
```json
{
  "type": "corporate_action",
  "data": { /* corporate_action entry */ },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

---

## Notes

1. All timestamps are in ISO 8601 format (UTC)
2. Token amounts are in smallest units (e.g., lamports for 9 decimals)
3. To convert to human-readable: `amount / (10 ** decimals)`
4. Block heights are Solana slot numbers
5. WebSocket automatically reconnects on disconnect

