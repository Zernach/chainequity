const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { supabase } = require('./db');
const { mintToken, createWallet, getBalance } = require('./solana');
const { initWebSocketServer, broadcastSolanaTransaction } = require('./websocket');

const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'ChainEquity backend is running',
    timestamp: new Date().toISOString(),
  });
});

// Get all users
app.get('/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      users: data,
      count: data.length,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Create new user
app.post('/users', async (req, res) => {
  try {
    const { name, wallet_address } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
      });
    }

    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          name,
          wallet_address: wallet_address || null,
        },
      ])
      .select();

    if (error) throw error;

    res.json({
      success: true,
      user: data[0],
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Mint Solana token (devnet airdrop)
app.post('/mint-token', async (req, res) => {
  try {
    const { amount } = req.body;
    const tokenAmount = amount || 1;

    console.log(`Minting ${tokenAmount} SOL on devnet...`);
    const result = await mintToken(null, tokenAmount);

    // Broadcast to WebSocket clients
    if (result.success) {
      broadcastSolanaTransaction(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error in mint-token endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Create new Solana wallet
app.post('/create-wallet', async (req, res) => {
  try {
    const wallet = createWallet();
    res.json({
      success: true,
      wallet,
    });
  } catch (error) {
    console.error('Error creating wallet:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get wallet balance
app.get('/balance/:publicKey', async (req, res) => {
  try {
    const { publicKey } = req.params;
    const balance = await getBalance(publicKey);

    if (balance === null) {
      return res.status(400).json({
        success: false,
        error: 'Invalid public key or unable to fetch balance',
      });
    }

    res.json({
      success: true,
      publicKey,
      balance,
    });
  } catch (error) {
    console.error('Error getting balance:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Start servers
app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});

// Initialize WebSocket server
initWebSocketServer(WS_PORT);

