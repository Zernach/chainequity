/**
 * Script to add the missing MEOW token to the database
 * This token was likely created before database storage was implemented
 * 
 * Usage: cd backend && npx ts-node scripts/add-missing-token.ts
 */

import { supabaseAdmin } from '../src/db';

async function addMissingToken() {
    // The token mint from the error message
    const tokenMint = 'gCwN2t7hMqXF5NKHyUKqt9PPeNgjMLsDkWiTwCCfk61';
    const symbol = 'MEOW'; // Replace with actual symbol if different
    const name = 'MEOW Token'; // Replace with actual name if different
    const decimals = 9;

    console.log('=== Adding Missing Token to Database ===');
    console.log('Token Mint:', tokenMint);
    console.log('Symbol:', symbol);
    console.log('Name:', name);
    console.log('Decimals:', decimals);
    console.log('');

    // Check if token already exists
    const { data: existingToken } = await supabaseAdmin
        .from('securities')
        .select('*')
        .eq('mint_address', tokenMint)
        .single();

    if (existingToken) {
        console.log('✓ Token already exists in database!');
        console.log('Security ID:', existingToken.id);
        console.log('Symbol:', existingToken.symbol);
        console.log('Name:', existingToken.name);
        console.log('Is Active:', existingToken.is_active);
        process.exit(0);
    }

    // Add the token
    const { data, error } = await supabaseAdmin
        .from('securities')
        .insert({
            mint_address: tokenMint,
            symbol,
            name,
            decimals,
            total_supply: 0,
            current_supply: 0,
            program_id: process.env.GATED_TOKEN_PROGRAM_ID || '7zmjGpWX7frSmnFfyZuhhrfoLgV3yH44RJZbKob1FSJF',
            is_active: true,
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Error adding token to database:', error);
        process.exit(1);
    }

    console.log('✅ Token successfully added to database!');
    console.log('');
    console.log('Details:');
    console.log('  Security ID:', data.id);
    console.log('  Mint Address:', data.mint_address);
    console.log('  Symbol:', data.symbol);
    console.log('  Name:', data.name);
    console.log('  Decimals:', data.decimals);
    console.log('  Is Active:', data.is_active);
    console.log('');
    console.log('You can now execute corporate actions on this token.');

    process.exit(0);
}

addMissingToken();

