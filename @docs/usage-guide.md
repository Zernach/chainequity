# ChainEquity Usage Guide

This guide shows you how to use the ChainEquity API to manage tokenized securities, track cap tables, and monitor transfers.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Setting Up a Security](#setting-up-a-security)
3. [Managing Allowlist](#managing-allowlist)
4. [Tracking Cap Tables](#tracking-cap-tables)
5. [Monitoring Transfers](#monitoring-transfers)
6. [Real-time Updates](#real-time-updates)
7. [Advanced Analytics](#advanced-analytics)

---

## Quick Start

### Starting the Backend

```bash
cd backend
yarn install
yarn dev
```

The server will start on:
- REST API: http://localhost:3000
- WebSocket: ws://localhost:3001

### Starting the Frontend

1. Configure environment variables:
```bash
cd frontend
cp .env.example .env
```

2. Edit `.env` to match your backend URLs:
```
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_WS_URL=ws://localhost:3001
```

3. Start the app:
```bash
npm install
npm start
```

### Database Setup

1. Run migrations in Supabase SQL Editor (in order):
   - `database/001_create_users_table.sql`
   - `database/002_create_securities_tables.sql`
   - `database/003_add_helper_functions.sql`

2. Verify tables exist in Supabase dashboard

---

## Setting Up a Security

### 1. Deploy Token on Solana

First, deploy your gated token smart contract (see contracts/gated-token/README.md).

```bash
cd contracts/gated-token
anchor build
anchor deploy --provider.cluster devnet
```

Note the mint address from the deployment.

### 2. Initialize Security in Database

The event indexer will automatically create the security record when it detects a `TokenInitializedEvent`. Alternatively, you can manually insert:

```sql
INSERT INTO securities (mint_address, symbol, name, decimals, program_id, is_active)
VALUES (
  'YOUR_MINT_ADDRESS',
  'ACME',
  'ACME Corp Token',
  9,
  'YOUR_PROGRAM_ID',
  true
);
```

### 3. Start Event Indexer

```javascript
const { createIndexer } = require('./backend/indexer');
const { connection } = require('./backend/solana');

const PROGRAM_ID = 'YOUR_PROGRAM_ID';

const indexer = createIndexer(connection, PROGRAM_ID);

// Listen to events
indexer.on('token_initialized', (data) => {
  console.log('New token:', data);
});

indexer.on('wallet_approved', (data) => {
  console.log('Wallet approved:', data);
});

indexer.on('tokens_minted', (data) => {
  console.log('Tokens minted:', data);
});

indexer.on('tokens_transferred', (data) => {
  console.log('Tokens transferred:', data);
});

// Start listening
await indexer.start();

// Optionally backfill historical events
await indexer.backfillEvents('YOUR_MINT_ADDRESS');
```

---

## Managing Allowlist

### Get All Approved Wallets

```bash
curl http://localhost:3000/allowlist/YOUR_MINT_ADDRESS
```

**Response:**
```json
{
  "success": true,
  "allowlist": [
    {
      "wallet_address": "9xQe...",
      "status": "approved",
      "approved_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Check Specific Wallet

```bash
curl http://localhost:3000/allowlist/YOUR_MINT_ADDRESS/9xQe...
```

**Response:**
```json
{
  "success": true,
  "wallet_address": "9xQe...",
  "is_approved": true,
  "status": "approved"
}
```

---

## Tracking Cap Tables

### Get Current Cap Table

```bash
curl http://localhost:3000/cap-table/YOUR_MINT_ADDRESS
```

**Response includes:**
- Token metadata
- List of all holders with shares and percentages
- Summary statistics (total holders, total shares, distribution %)
- Allowlist status for each holder

### Get Historical Cap Table

```bash
curl http://localhost:3000/cap-table/YOUR_MINT_ADDRESS/123456
```

Replace `123456` with the Solana block height you want to query.

### Export Cap Table

**As JSON:**
```bash
curl -X POST http://localhost:3000/cap-table/YOUR_MINT_ADDRESS/export \
  -H "Content-Type: application/json" \
  -d '{"format": "json"}' \
  --output cap-table.json
```

**As CSV:**
```bash
curl -X POST http://localhost:3000/cap-table/YOUR_MINT_ADDRESS/export \
  -H "Content-Type: application/json" \
  -d '{"format": "csv"}' \
  --output cap-table.csv
```

**Historical Export:**
```bash
curl -X POST http://localhost:3000/cap-table/YOUR_MINT_ADDRESS/export \
  -H "Content-Type: application/json" \
  -d '{"format": "csv", "blockHeight": 123456}' \
  --output cap-table-historical.csv
```

---

## Monitoring Transfers

### Get All Transfers

```bash
curl http://localhost:3000/transfers/YOUR_MINT_ADDRESS?limit=100&offset=0
```

### Filter by Sender

```bash
curl "http://localhost:3000/transfers/YOUR_MINT_ADDRESS?from=9xQe...&limit=50"
```

### Filter by Recipient

```bash
curl "http://localhost:3000/transfers/YOUR_MINT_ADDRESS?to=8pRd...&limit=50"
```

### Pagination

```bash
# First page
curl "http://localhost:3000/transfers/YOUR_MINT_ADDRESS?limit=10&offset=0"

# Second page
curl "http://localhost:3000/transfers/YOUR_MINT_ADDRESS?limit=10&offset=10"

# Third page
curl "http://localhost:3000/transfers/YOUR_MINT_ADDRESS?limit=10&offset=20"
```

---

## Real-time Updates

### JavaScript/TypeScript Example

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onopen = () => {
  console.log('Connected to ChainEquity WebSocket');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'connection':
      console.log('Connected:', message.message);
      break;
      
    case 'allowlist_updated':
      console.log('Allowlist updated:', message.data);
      // Update UI to reflect new allowlist status
      break;
      
    case 'token_minted':
      console.log('Tokens minted:', message.data);
      // Refresh cap table display
      break;
      
    case 'token_transferred':
      console.log('Transfer detected:', message.data);
      // Update transfer history and cap table
      break;
      
    case 'cap_table_updated':
      console.log('Balance changed:', message.data);
      // Refresh cap table
      break;
      
    case 'corporate_action':
      console.log('Corporate action:', message.data);
      // Handle split, symbol change, etc.
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from WebSocket');
  // Implement reconnection logic
};
```

### React Hook Example

```javascript
import { useEffect, useState } from 'react';

function useCapTableUpdates(mintAddress) {
  const [capTable, setCapTable] = useState(null);
  const [ws, setWs] = useState(null);
  
  // Fetch initial cap table
  useEffect(() => {
    fetch(`http://localhost:3000/cap-table/${mintAddress}`)
      .then(res => res.json())
      .then(data => setCapTable(data.data));
  }, [mintAddress]);
  
  // Subscribe to WebSocket updates
  useEffect(() => {
    const socket = new WebSocket('ws://localhost:3001');
    
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'cap_table_updated' || 
          message.type === 'token_minted' || 
          message.type === 'token_transferred') {
        // Refresh cap table
        fetch(`http://localhost:3000/cap-table/${mintAddress}`)
          .then(res => res.json())
          .then(data => setCapTable(data.data));
      }
    };
    
    setWs(socket);
    
    return () => {
      socket.close();
    };
  }, [mintAddress]);
  
  return capTable;
}

// Usage in component
function CapTableView({ mintAddress }) {
  const capTable = useCapTableUpdates(mintAddress);
  
  if (!capTable) return <div>Loading...</div>;
  
  return (
    <div>
      <h2>{capTable.token.symbol} Cap Table</h2>
      <p>Total Holders: {capTable.summary.total_holders}</p>
      <table>
        <thead>
          <tr>
            <th>Wallet</th>
            <th>Shares</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          {capTable.holders.map(holder => (
            <tr key={holder.wallet_address}>
              <td>{holder.wallet_address}</td>
              <td>{holder.shares}</td>
              <td>{holder.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Advanced Analytics

### Ownership Concentration

Get concentration metrics including Gini coefficient:

```bash
curl http://localhost:3000/cap-table/YOUR_MINT_ADDRESS/metrics/concentration
```

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

**Interpretation:**
- **top_1_holders**: Percentage owned by largest holder
- **top_5_holders**: Percentage owned by top 5 holders
- **top_10_holders**: Percentage owned by top 10 holders
- **gini_coefficient**: 0 = perfect equality, 1 = perfect inequality
  - 0.0-0.2: Very equal distribution
  - 0.2-0.4: Relatively equal distribution
  - 0.4-0.6: Moderate concentration ⬅️ Our example
  - 0.6-0.8: High concentration
  - 0.8-1.0: Very high concentration

### Holder Count Over Time

```bash
curl http://localhost:3000/cap-table/YOUR_MINT_ADDRESS/history/holder-count
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "block_height": 123456,
      "holder_count": 1,
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    {
      "block_height": 123789,
      "holder_count": 3,
      "created_at": "2024-01-02T00:00:00.000Z"
    }
  ]
}
```

Use this data to create charts showing holder growth over time.

---

## Common Use Cases

### 1. Compliance Reporting

Generate monthly cap table reports:

```bash
# Get cap table at end of month (specific block height)
curl -X POST http://localhost:3000/cap-table/YOUR_MINT_ADDRESS/export \
  -H "Content-Type: application/json" \
  -d '{"format": "csv", "blockHeight": END_OF_MONTH_BLOCK}' \
  --output reports/cap-table-2024-01.csv
```

### 2. Investor Portal

Show investors their holdings and transaction history:

```javascript
// Get investor's transfers
const response = await fetch(
  `http://localhost:3000/transfers/YOUR_MINT_ADDRESS?from=${walletAddress}&limit=100`
);
const data = await response.json();
const transfers = data.data.transfers;

// Get current balance from cap table
const capTableResponse = await fetch(
  `http://localhost:3000/cap-table/YOUR_MINT_ADDRESS`
);
const capTable = await capTableResponse.json();
const holder = capTable.data.holders.find(
  h => h.wallet_address === walletAddress
);
```

### 3. Admin Dashboard

Monitor all activity in real-time:

```javascript
// Subscribe to all events
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  // Log to admin activity feed
  addToActivityFeed({
    timestamp: message.timestamp,
    type: message.type,
    data: message.data
  });
  
  // Update statistics
  if (message.type === 'token_transferred') {
    incrementTransferCount();
  }
  
  if (message.type === 'allowlist_updated') {
    refreshAllowlistDisplay();
  }
};
```

### 4. Regulatory Audit

Generate comprehensive audit trail:

```bash
# Get all transfers
curl "http://localhost:3000/transfers/YOUR_MINT_ADDRESS?limit=1000" > audit/transfers.json

# Get allowlist history
curl "http://localhost:3000/allowlist/YOUR_MINT_ADDRESS" > audit/allowlist.json

# Get current cap table
curl "http://localhost:3000/cap-table/YOUR_MINT_ADDRESS" > audit/cap-table.json

# Get concentration metrics
curl "http://localhost:3000/cap-table/YOUR_MINT_ADDRESS/metrics/concentration" > audit/concentration.json
```

---

## Troubleshooting

### Event Indexer Not Receiving Events

1. Verify WebSocket connection to Solana RPC
2. Check program ID matches deployed contract
3. Ensure transactions are confirming on-chain
4. Check indexer logs for errors

### Cap Table Shows Zero Holders

1. Ensure event indexer is running
2. Check if `token_balances` table has data
3. Verify mint address is correct
4. Run backfill: `indexer.backfillEvents(mintAddress)`

### WebSocket Disconnects Frequently

1. Implement exponential backoff reconnection
2. Check network stability
3. Consider using a WebSocket library with auto-reconnect (e.g., `reconnecting-websocket`)

### Historical Cap Table Returns Wrong Data

1. Verify block height is correct
2. Check if transfers were indexed at that block
3. Ensure block height is not in the future
4. Check database for transfer records at that height

---

## Best Practices

1. **Cache Cap Tables**: Use the built-in caching system for historical snapshots
2. **Pagination**: Always use pagination for transfer history (don't fetch all at once)
3. **Real-time Updates**: Use WebSocket for UI updates, not polling
4. **Error Handling**: Always check the `success` field in API responses
5. **Block Heights**: Store block heights for regulatory snapshots
6. **Backfill**: Run backfill when starting indexer on existing tokens
7. **Monitoring**: Set up alerts for failed transactions and indexer errors

---

## Next Steps

- Implement corporate actions (stock splits, symbol changes)
- Build admin UI for token management
- Add investor portal screens
- Set up monitoring and logging
- Deploy to production environment

See `@docs/PROGRESS.md` for the full development roadmap.

