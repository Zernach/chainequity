/**
 * Create test transfer records for testing the transaction history UI
 * This simulates what would happen when tokens are transferred on-chain
 */

import { supabaseAdmin } from '../src/db';
import { PublicKey } from '@solana/web3.js';

async function createTestTransfers() {
    console.log('Creating test transfer records...\n');

    // Get the MEOW token security (since it has holders)
    const { data: security } = await supabaseAdmin
        .from('securities')
        .select('*')
        .eq('symbol', 'MEOW')
        .single();

    if (!security) {
        console.error('MEOW security not found');
        process.exit(1);
    }

    console.log(`Found security: ${security.symbol} (${security.name})`);
    console.log(`Mint: ${security.mint_address}\n`);

    // Get token holders
    const { data: balances } = await supabaseAdmin
        .from('token_balances')
        .select('wallet_address, balance')
        .eq('security_id', security.id)
        .gt('balance', 0)
        .order('balance', { ascending: false })
        .limit(2);

    if (!balances || balances.length < 2) {
        console.error('Need at least 2 token holders to create test transfers');
        process.exit(1);
    }

    const wallet1 = balances[0].wallet_address;
    const wallet2 = balances[1].wallet_address;

    console.log(`Wallet 1: ${wallet1} (balance: ${balances[0].balance})`);
    console.log(`Wallet 2: ${wallet2} (balance: ${balances[1].balance})\n`);

    // Create test transfer records
    const transfers = [
        {
            security_id: security.id,
            transaction_signature: new PublicKey(Math.floor(Math.random() * 1000000000)).toString() + 'TestSig1',
            from_wallet: wallet1,
            to_wallet: wallet2,
            amount: 500000000, // 0.5 tokens (with 9 decimals)
            block_height: 100000,
            slot: 100000,
            block_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            status: 'confirmed',
        },
        {
            security_id: security.id,
            transaction_signature: new PublicKey(Math.floor(Math.random() * 1000000000)).toString() + 'TestSig2',
            from_wallet: wallet2,
            to_wallet: wallet1,
            amount: 250000000, // 0.25 tokens
            block_height: 100500,
            slot: 100500,
            block_time: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
            status: 'confirmed',
        },
        {
            security_id: security.id,
            transaction_signature: new PublicKey(Math.floor(Math.random() * 1000000000)).toString() + 'TestSig3',
            from_wallet: wallet1,
            to_wallet: wallet2,
            amount: 1000000000, // 1 token
            block_height: 101000,
            slot: 101000,
            block_time: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
            status: 'confirmed',
        },
    ];

    console.log(`Creating ${transfers.length} test transfer records...`);

    const { data: createdTransfers, error } = await supabaseAdmin
        .from('transfers')
        .insert(transfers)
        .select();

    if (error) {
        console.error('Error creating transfers:', error);
        process.exit(1);
    }

    console.log(`\n✓ Successfully created ${createdTransfers?.length || 0} test transfers\n`);

    if (createdTransfers) {
        createdTransfers.forEach((transfer, i) => {
            console.log(`${i + 1}. ${transfer.from_wallet.slice(0, 8)}... → ${transfer.to_wallet.slice(0, 8)}...`);
            console.log(`   Amount: ${transfer.amount} (${transfer.amount / 1e9} tokens)`);
            console.log(`   Status: ${transfer.status}`);
            console.log(`   Signature: ${transfer.transaction_signature.slice(0, 20)}...`);
            console.log(`   Time: ${transfer.block_time}\n`);
        });
    }

    console.log('You can now test the transaction history UI!\n');
}

createTestTransfers()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });

