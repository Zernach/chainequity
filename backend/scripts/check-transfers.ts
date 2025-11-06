/**
 * Check transfers in database
 * Quick script to verify transfer records exist
 */

import { supabaseAdmin } from '../src/db';

async function checkTransfers() {
    console.log('Checking transfers in database...\n');

    // Get all securities
    const { data: securities } = await supabaseAdmin
        .from('securities')
        .select('id, symbol, name, mint_address');

    if (!securities || securities.length === 0) {
        console.log('No securities found in database');
        return;
    }

    console.log(`Found ${securities.length} securities:\n`);

    for (const security of securities) {
        console.log(`\n${security.symbol} (${security.name})`);
        console.log(`Mint: ${security.mint_address}`);
        console.log(`ID: ${security.id}`);

        // Check transfers for this security
        const { data: transfers, count } = await supabaseAdmin
            .from('transfers')
            .select('*', { count: 'exact' })
            .eq('security_id', security.id)
            .order('block_time', { ascending: false })
            .limit(5);

        console.log(`\nTransfers: ${count || 0}`);

        if (transfers && transfers.length > 0) {
            console.log('\nRecent transfers:');
            transfers.forEach((t, i) => {
                console.log(`  ${i + 1}. ${t.from_wallet.slice(0, 8)}... → ${t.to_wallet.slice(0, 8)}...`);
                console.log(`     Amount: ${t.amount}, Status: ${t.status}`);
                console.log(`     Signature: ${t.transaction_signature.slice(0, 16)}...`);
            });
        } else {
            console.log('  No transfers found for this security');
        }

        // Check token balances
        const { data: balances, count: balanceCount } = await supabaseAdmin
            .from('token_balances')
            .select('wallet_address, balance', { count: 'exact' })
            .eq('security_id', security.id)
            .gt('balance', 0)
            .order('balance', { ascending: false })
            .limit(5);

        console.log(`\nToken holders: ${balanceCount || 0}`);
        if (balances && balances.length > 0) {
            console.log('Top holders:');
            balances.forEach((b, i) => {
                console.log(`  ${i + 1}. ${b.wallet_address.slice(0, 16)}... : ${b.balance}`);
            });
        }

        console.log('\n' + '='.repeat(80));
    }

    console.log('\n✓ Check complete\n');
}

checkTransfers()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });

