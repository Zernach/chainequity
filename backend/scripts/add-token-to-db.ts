/**
 * Script to manually add an existing token mint to the database
 * Use this for tokens that were initialized before the database storage fix
 * 
 * Usage: ts-node scripts/add-token-to-db.ts
 */

import { supabase } from '../src/db';

async function addTokenToDatabase() {
    const tokenMint = '9CiWk2jW7swuXd3yv5zA63Bj5wSwVu6UPqWG1GYmaPSf';
    const symbol = 'ACME'; // Replace with actual symbol
    const name = 'ACME Corp Token'; // Replace with actual name
    const decimals = 9;

    console.log('Adding token to database...');
    console.log('Token Mint:', tokenMint);
    console.log('Symbol:', symbol);
    console.log('Name:', name);
    console.log('Decimals:', decimals);

    const { data, error } = await supabase
        .from('securities')
        .upsert(
            {
                mint_address: tokenMint,
                symbol,
                name,
                decimals,
                total_supply: 0,
                current_supply: 0,
                program_id: process.env.GATED_TOKEN_PROGRAM_ID || '7zmjGpWX7frSmnFfyZuhhrfoLgV3yH44RJZbKob1FSJF',
                is_active: true,
            },
            {
                onConflict: 'mint_address',
            }
        )
        .select()
        .single();

    if (error) {
        console.error('Error adding token to database:', error);
        process.exit(1);
    }

    console.log('✅ Token successfully added to database!');
    console.log('Security ID:', data.id);
    console.log('Mint Address:', data.mint_address);
    console.log('Symbol:', data.symbol);
    console.log('Name:', data.name);

    process.exit(0);
}

addTokenToDatabase();

