const {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
} = require('@solana/web3.js');
require('dotenv').config();

const network = process.env.SOLANA_NETWORK || 'devnet';
const connection = new Connection(clusterApiUrl(network), 'confirmed');

/**
 * Create a new Solana wallet (keypair)
 */
function createWallet() {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toString(),
    secretKey: Array.from(keypair.secretKey),
  };
}

/**
 * Mint SOL tokens (devnet only - this actually requests an airdrop)
 * In production, this would be a proper SPL token mint
 */
async function mintToken(publicKeyString, amount = 1) {
  try {
    const publicKey = new Keypair.generate().publicKey; // For demo, generate new wallet
    
    // Request airdrop (only works on devnet/testnet)
    console.log(`Requesting airdrop of ${amount} SOL to ${publicKey.toString()}`);
    const signature = await connection.requestAirdrop(
      publicKey,
      amount * LAMPORTS_PER_SOL
    );
    
    // Confirm transaction
    await connection.confirmTransaction(signature);
    
    const balance = await connection.getBalance(publicKey);
    
    return {
      success: true,
      signature,
      publicKey: publicKey.toString(),
      balance: balance / LAMPORTS_PER_SOL,
      network,
    };
  } catch (error) {
    console.error('Error minting token:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get wallet balance
 */
async function getBalance(publicKeyString) {
  try {
    const balance = await connection.getBalance(publicKeyString);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error getting balance:', error);
    return null;
  }
}

module.exports = {
  createWallet,
  mintToken,
  getBalance,
  connection,
};

