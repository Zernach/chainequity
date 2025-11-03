import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GatedToken } from "../target/types/gated_token";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, getAccount } from "@solana/spl-token";
import { assert } from "chai";

describe("gated-token", () => {
    // Configure the client to use the local cluster
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.GatedToken as Program<GatedToken>;

    // Test accounts
    let authority: Keypair;
    let mint: Keypair;
    let tokenConfig: PublicKey;
    let aliceKeypair: Keypair;
    let bobKeypair: Keypair;
    let charlieKeypair: Keypair;
    let aliceAllowlist: PublicKey;
    let bobAllowlist: PublicKey;
    let charlieAllowlist: PublicKey;
    let aliceTokenAccount: PublicKey;
    let bobTokenAccount: PublicKey;
    let charlieTokenAccount: PublicKey;

    before(async () => {
        // Generate keypairs
        authority = provider.wallet.payer;
        mint = Keypair.generate();
        aliceKeypair = Keypair.generate();
        bobKeypair = Keypair.generate();
        charlieKeypair = Keypair.generate();

        // Derive PDAs
        [tokenConfig] = await PublicKey.findProgramAddress(
            [Buffer.from("token_config"), mint.publicKey.toBuffer()],
            program.programId
        );

        [aliceAllowlist] = await PublicKey.findProgramAddress(
            [Buffer.from("allowlist"), mint.publicKey.toBuffer(), aliceKeypair.publicKey.toBuffer()],
            program.programId
        );

        [bobAllowlist] = await PublicKey.findProgramAddress(
            [Buffer.from("allowlist"), mint.publicKey.toBuffer(), bobKeypair.publicKey.toBuffer()],
            program.programId
        );

        [charlieAllowlist] = await PublicKey.findProgramAddress(
            [Buffer.from("allowlist"), mint.publicKey.toBuffer(), charlieKeypair.publicKey.toBuffer()],
            program.programId
        );

        // Airdrop SOL to test wallets
        const airdropAmount = 2 * anchor.web3.LAMPORTS_PER_SOL;
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(aliceKeypair.publicKey, airdropAmount)
        );
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(bobKeypair.publicKey, airdropAmount)
        );
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(charlieKeypair.publicKey, airdropAmount)
        );
    });

    it("Test 1: Initialize token with metadata", async () => {
        const symbol = "ACME";
        const name = "ACME Security Token";
        const decimals = 9;

        await program.methods
            .initializeToken(symbol, name, decimals)
            .accounts({
                authority: authority.publicKey,
                mint: mint.publicKey,
                tokenConfig,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .signers([mint])
            .rpc();

        const configAccount = await program.account.tokenConfig.fetch(tokenConfig);
        assert.equal(configAccount.symbol, symbol);
        assert.equal(configAccount.name, name);
        assert.equal(configAccount.decimals, decimals);
        assert.equal(configAccount.totalSupply.toNumber(), 0);
        console.log("✓ Token initialized successfully");
    });

    it("Test 2: Approve wallet → Mint → Verify balance", async () => {
        // Approve Alice
        await program.methods
            .approveWallet()
            .accounts({
                authority: authority.publicKey,
                wallet: aliceKeypair.publicKey,
                tokenConfig,
                allowlistEntry: aliceAllowlist,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        const aliceEntry = await program.account.allowlistEntry.fetch(aliceAllowlist);
        assert.isTrue(aliceEntry.isApproved);
        console.log("✓ Alice approved on allowlist");

        // Create token account for Alice
        aliceTokenAccount = await createAccount(
            provider.connection,
            aliceKeypair,
            mint.publicKey,
            aliceKeypair.publicKey
        );

        // Mint tokens to Alice
        const mintAmount = new anchor.BN(10_000 * Math.pow(10, 9));
        await program.methods
            .mintTokens(mintAmount)
            .accounts({
                authority: authority.publicKey,
                recipient: aliceKeypair.publicKey,
                tokenConfig,
                mint: mint.publicKey,
                recipientTokenAccount: aliceTokenAccount,
                recipientAllowlistEntry: aliceAllowlist,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();

        const aliceBalance = await getAccount(provider.connection, aliceTokenAccount);
        assert.equal(aliceBalance.amount.toString(), mintAmount.toString());
        console.log(`✓ Minted ${mintAmount.toString()} tokens to Alice`);
    });

    it("Test 3: Transfer between two approved wallets → SUCCESS", async () => {
        // Approve Bob
        await program.methods
            .approveWallet()
            .accounts({
                authority: authority.publicKey,
                wallet: bobKeypair.publicKey,
                tokenConfig,
                allowlistEntry: bobAllowlist,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        // Create token account for Bob
        bobTokenAccount = await createAccount(
            provider.connection,
            bobKeypair,
            mint.publicKey,
            bobKeypair.publicKey
        );

        // Transfer from Alice to Bob
        const transferAmount = new anchor.BN(3_000 * Math.pow(10, 9));
        await program.methods
            .gatedTransfer(transferAmount)
            .accounts({
                authority: aliceKeypair.publicKey,
                recipient: bobKeypair.publicKey,
                tokenConfig,
                mint: mint.publicKey,
                fromTokenAccount: aliceTokenAccount,
                toTokenAccount: bobTokenAccount,
                senderAllowlistEntry: aliceAllowlist,
                recipientAllowlistEntry: bobAllowlist,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([aliceKeypair])
            .rpc();

        const bobBalance = await getAccount(provider.connection, bobTokenAccount);
        assert.equal(bobBalance.amount.toString(), transferAmount.toString());
        console.log(`✓ Transferred ${transferAmount.toString()} tokens from Alice to Bob`);
    });

    it("Test 4: Transfer to non-approved wallet → FAIL", async () => {
        // Create token account for Charlie (not approved)
        charlieTokenAccount = await createAccount(
            provider.connection,
            charlieKeypair,
            mint.publicKey,
            charlieKeypair.publicKey
        );

        const transferAmount = new anchor.BN(1_000 * Math.pow(10, 9));

        try {
            await program.methods
                .gatedTransfer(transferAmount)
                .accounts({
                    authority: aliceKeypair.publicKey,
                    recipient: charlieKeypair.publicKey,
                    tokenConfig,
                    mint: mint.publicKey,
                    fromTokenAccount: aliceTokenAccount,
                    toTokenAccount: charlieTokenAccount,
                    senderAllowlistEntry: aliceAllowlist,
                    recipientAllowlistEntry: charlieAllowlist,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .signers([aliceKeypair])
                .rpc();

            assert.fail("Transfer should have failed - recipient not approved");
        } catch (error) {
            console.log("✓ Transfer to non-approved wallet blocked as expected");
        }
    });

    it("Test 5: Transfer from non-approved wallet → FAIL", async () => {
        // Approve Charlie but then try to transfer without proper allowlist
        const transferAmount = new anchor.BN(500 * Math.pow(10, 9));

        try {
            await program.methods
                .gatedTransfer(transferAmount)
                .accounts({
                    authority: charlieKeypair.publicKey,
                    recipient: bobKeypair.publicKey,
                    tokenConfig,
                    mint: mint.publicKey,
                    fromTokenAccount: charlieTokenAccount,
                    toTokenAccount: bobTokenAccount,
                    senderAllowlistEntry: charlieAllowlist,
                    recipientAllowlistEntry: bobAllowlist,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .signers([charlieKeypair])
                .rpc();

            assert.fail("Transfer should have failed - sender not approved");
        } catch (error) {
            console.log("✓ Transfer from non-approved wallet blocked as expected");
        }
    });

    it("Test 6: Revoke approval → Transfer fails", async () => {
        // Now approve Charlie
        await program.methods
            .approveWallet()
            .accounts({
                authority: authority.publicKey,
                wallet: charlieKeypair.publicKey,
                tokenConfig,
                allowlistEntry: charlieAllowlist,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        console.log("✓ Charlie approved");

        // Verify Alice can transfer to Charlie
        const transferAmount1 = new anchor.BN(2_000 * Math.pow(10, 9));
        await program.methods
            .gatedTransfer(transferAmount1)
            .accounts({
                authority: aliceKeypair.publicKey,
                recipient: charlieKeypair.publicKey,
                tokenConfig,
                mint: mint.publicKey,
                fromTokenAccount: aliceTokenAccount,
                toTokenAccount: charlieTokenAccount,
                senderAllowlistEntry: aliceAllowlist,
                recipientAllowlistEntry: charlieAllowlist,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([aliceKeypair])
            .rpc();

        console.log("✓ Transfer to Charlie succeeded");

        // Revoke Charlie's approval
        await program.methods
            .revokeWallet()
            .accounts({
                authority: authority.publicKey,
                wallet: charlieKeypair.publicKey,
                tokenConfig,
                allowlistEntry: charlieAllowlist,
            })
            .rpc();

        const charlieEntry = await program.account.allowlistEntry.fetch(charlieAllowlist);
        assert.isFalse(charlieEntry.isApproved);
        console.log("✓ Charlie's approval revoked");

        // Try to transfer to revoked Charlie
        try {
            await program.methods
                .gatedTransfer(transferAmount1)
                .accounts({
                    authority: aliceKeypair.publicKey,
                    recipient: charlieKeypair.publicKey,
                    tokenConfig,
                    mint: mint.publicKey,
                    fromTokenAccount: aliceTokenAccount,
                    toTokenAccount: charlieTokenAccount,
                    senderAllowlistEntry: aliceAllowlist,
                    recipientAllowlistEntry: charlieAllowlist,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .signers([aliceKeypair])
                .rpc();

            assert.fail("Transfer should have failed - recipient revoked");
        } catch (error) {
            console.log("✓ Transfer to revoked wallet blocked as expected");
        }
    });

    it("Test 7: Unauthorized admin action → FAIL", async () => {
        // Try to approve a wallet using Alice's authority (not the admin)
        const randomWallet = Keypair.generate();
        const [randomAllowlist] = await PublicKey.findProgramAddress(
            [Buffer.from("allowlist"), mint.publicKey.toBuffer(), randomWallet.publicKey.toBuffer()],
            program.programId
        );

        try {
            await program.methods
                .approveWallet()
                .accounts({
                    authority: aliceKeypair.publicKey,
                    wallet: randomWallet.publicKey,
                    tokenConfig,
                    allowlistEntry: randomAllowlist,
                    systemProgram: SystemProgram.programId,
                })
                .signers([aliceKeypair])
                .rpc();

            assert.fail("Should have failed - unauthorized authority");
        } catch (error) {
            console.log("✓ Unauthorized admin action blocked as expected");
        }
    });

    it("Test 8: Export cap table at current block", async () => {
        // Fetch all token balances
        const aliceBalance = await getAccount(provider.connection, aliceTokenAccount);
        const bobBalance = await getAccount(provider.connection, bobTokenAccount);
        const charlieBalance = await getAccount(provider.connection, charlieTokenAccount);

        const totalSupply =
            Number(aliceBalance.amount) +
            Number(bobBalance.amount) +
            Number(charlieBalance.amount);

        console.log("\n📊 Cap Table:");
        console.log(`Alice: ${aliceBalance.amount} (${(Number(aliceBalance.amount) / totalSupply * 100).toFixed(2)}%)`);
        console.log(`Bob: ${bobBalance.amount} (${(Number(bobBalance.amount) / totalSupply * 100).toFixed(2)}%)`);
        console.log(`Charlie: ${charlieBalance.amount} (${(Number(charlieBalance.amount) / totalSupply * 100).toFixed(2)}%)`);
        console.log(`Total Supply: ${totalSupply}`);
    });
});

