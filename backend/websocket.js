const WebSocket = require('ws');
const { supabase } = require('./db');

let wss = null;
let clients = new Set();

/**
 * Initialize WebSocket server
 */
function initWebSocketServer(port) {
  wss = new WebSocket.Server({ port });

  console.log(`WebSocket server running on port ${port}`);

  wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');
    clients.add(ws);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to ChainEquity WebSocket server',
      timestamp: new Date().toISOString(),
    }));

    // Handle incoming messages (echo functionality)
    ws.on('message', (message) => {
      console.log('Received:', message.toString());
      
      try {
        const data = JSON.parse(message.toString());
        
        // Echo message back
        ws.send(JSON.stringify({
          type: 'echo',
          data: data,
          timestamp: new Date().toISOString(),
        }));
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid JSON',
        }));
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Set up Supabase real-time subscription for database changes
  setupDatabaseSubscription();

  return wss;
}

/**
 * Broadcast message to all connected clients
 */
function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Broadcast Solana transaction update
 */
function broadcastSolanaTransaction(txData) {
  broadcast({
    type: 'solana_transaction',
    data: txData,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Setup Supabase real-time subscription for database changes
 */
function setupDatabaseSubscription() {
  const subscription = supabase
    .channel('db-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'users',
      },
      (payload) => {
        console.log('Database change detected:', payload);
        broadcast({
          type: 'database_change',
          event: payload.eventType,
          table: 'users',
          data: payload.new || payload.old,
          timestamp: new Date().toISOString(),
        });
      }
    )
    .subscribe();

  console.log('Subscribed to database changes');
}

module.exports = {
  initWebSocketServer,
  broadcast,
  broadcastSolanaTransaction,
};

