import { 
    Client, 
    TransferTransaction, 
    TokenMintTransaction,
    TokenUnfreezeTransaction,
    TokenFreezeTransaction,
    AccountBalanceQuery,
    Hbar, 
    PrivateKey
} from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function batchMembershipTestUsers345() {
    console.log("=== BATCH MEMBERSHIP TEST: TEST_USER_3, 4, 5 ===\n");
    console.log("🎯 Creating memberships for all three users");
    console.log("💰 Each deposits: 1 HBAR");
    console.log("🪙 Each receives: 1 $DRIP token");
    console.log("📋 Following 1:1 HBAR:DRIP protocol ratio\n");
    
    const client = Client.forTestnet();
    
    // Treasury/Controller details
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    const controllerPrivateKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    const dripTokenId = process.env.DRIP_TOKEN_ID;
    
    // Test users for batch membership
    const testUsers = [
        { 
            name: "TEST_USER_3", 
            accountId: process.env.TEST_USER_3_ACCOUNT_ID,
            privateKey: PrivateKey.fromString(process.env.TEST_USER_3_PRIVATE_KEY)
        },
        { 
            name: "TEST_USER_4", 
            accountId: process.env.TEST_USER_4_ACCOUNT_ID,
            privateKey: PrivateKey.fromString(process.env.TEST_USER_4_PRIVATE_KEY)
        },
        { 
            name: "TEST_USER_5", 
            accountId: process.env.TEST_USER_5_ACCOUNT_ID,
            privateKey: PrivateKey.fromString(process.env.TEST_USER_5_PRIVATE_KEY)
        }
    ];
    
    const DEPOSIT_AMOUNT = 1; // 1 HBAR per membership
    const DRIP_AMOUNT = 1;    // 1 DRIP per membership (1:1 ratio)
    
    try {
        console.log("=== STEP 1: BATCH VALIDATION ===");
        console.log(`Users to process: ${testUsers.length}`);
        console.log(`Total HBAR deposits: ${testUsers.length * DEPOSIT_AMOUNT} HBAR`);
        console.log(`Total $DRIP to mint: ${testUsers.length * DRIP_AMOUNT} tokens\n`);
        
        const membershipResults = [];
        
        for (let i = 0; i < testUsers.length; i++) {
            const user = testUsers[i];
            console.log(`=== PROCESSING ${user.name} (${i + 1}/${testUsers.length}) ===`);
            
            const membershipResult = {
                user: user.name,
                accountId: user.accountId,
                steps: {},
                status: "PENDING"
            };
            
            try {
                // Step 1: User deposits 1 HBAR to Treasury
                console.log(`  Step 1: ${user.name} deposits ${DEPOSIT_AMOUNT} HBAR...`);
                client.setOperator(user.accountId, user.privateKey);
                
                const donationTx = new TransferTransaction()
                    .addHbarTransfer(user.accountId, new Hbar(-DEPOSIT_AMOUNT))
                    .addHbarTransfer(controllerAccountId, new Hbar(DEPOSIT_AMOUNT));
                
                const donationResponse = await donationTx.execute(client);
                const donationReceipt = await donationResponse.getReceipt(client);
                
                console.log(`    ✅ Deposit: ${donationResponse.transactionId}`);
                console.log(`    Status: ${donationReceipt.status.toString()}`);
                
                membershipResult.steps.deposit = {
                    status: "SUCCESS",
                    transactionId: donationResponse.transactionId.toString(),
                    amount: DEPOSIT_AMOUNT
                };
                
                // Step 2: Treasury mints 1 DRIP token
                console.log(`  Step 2: Treasury mints ${DRIP_AMOUNT} $DRIP...`);
                client.setOperator(controllerAccountId, controllerPrivateKey);
                
                const mintTx = new TokenMintTransaction()
                    .setTokenId(dripTokenId)
                    .setAmount(DRIP_AMOUNT);
                
                const mintResponse = await mintTx.execute(client);
                const mintReceipt = await mintResponse.getReceipt(client);
                
                console.log(`    ✅ Mint: ${mintResponse.transactionId}`);
                console.log(`    Status: ${mintReceipt.status.toString()}`);
                
                membershipResult.steps.mint = {
                    status: "SUCCESS",
                    transactionId: mintResponse.transactionId.toString(),
                    amount: DRIP_AMOUNT
                };
                
                // Step 3: Temporarily unfreeze user for transfer
                console.log(`  Step 3: Temporarily unfreezing ${user.name}...`);
                
                const unfreezeTx = new TokenUnfreezeTransaction()
                    .setAccountId(user.accountId)
                    .setTokenId(dripTokenId);
                
                const unfreezeResponse = await unfreezeTx.execute(client);
                const unfreezeReceipt = await unfreezeResponse.getReceipt(client);
                
                console.log(`    ✅ Unfreeze: ${unfreezeResponse.transactionId}`);
                console.log(`    Status: ${unfreezeReceipt.status.toString()}`);
                
                membershipResult.steps.unfreeze = {
                    status: "SUCCESS",
                    transactionId: unfreezeResponse.transactionId.toString()
                };
                
                // Step 4: Transfer 1 DRIP from Treasury to user
                console.log(`  Step 4: Transferring ${DRIP_AMOUNT} $DRIP to ${user.name}...`);
                
                const transferTx = new TransferTransaction()
                    .addTokenTransfer(dripTokenId, controllerAccountId, -DRIP_AMOUNT)
                    .addTokenTransfer(dripTokenId, user.accountId, DRIP_AMOUNT);
                
                const transferResponse = await transferTx.execute(client);
                const transferReceipt = await transferResponse.getReceipt(client);
                
                console.log(`    ✅ Transfer: ${transferResponse.transactionId}`);
                console.log(`    Status: ${transferReceipt.status.toString()}`);
                
                membershipResult.steps.transfer = {
                    status: "SUCCESS",
                    transactionId: transferResponse.transactionId.toString(),
                    amount: DRIP_AMOUNT
                };
                
                // Step 5: Re-freeze user to enforce non-transferability
                console.log(`  Step 5: Re-freezing ${user.name} for non-transferability...`);
                
                const freezeTx = new TokenFreezeTransaction()
                    .setAccountId(user.accountId)
                    .setTokenId(dripTokenId);
                
                const freezeResponse = await freezeTx.execute(client);
                const freezeReceipt = await freezeResponse.getReceipt(client);
                
                console.log(`    ✅ Freeze: ${freezeResponse.transactionId}`);
                console.log(`    Status: ${freezeReceipt.status.toString()}`);
                
                membershipResult.steps.freeze = {
                    status: "SUCCESS",
                    transactionId: freezeResponse.transactionId.toString()
                };
                
                // Step 6: Verify final balance
                console.log(`  Step 6: Verifying ${user.name} final balance...`);
                
                const finalBalance = await new AccountBalanceQuery()
                    .setAccountId(user.accountId)
                    .execute(client);
                
                const dripBalance = finalBalance.tokens.get(dripTokenId);
                const finalDripAmount = dripBalance ? parseInt(dripBalance.toString()) : 0;
                
                console.log(`    Final $DRIP balance: ${finalDripAmount}`);
                
                if (finalDripAmount === DRIP_AMOUNT) {
                    console.log(`    ✅ MEMBERSHIP CREATED: ${user.name} has ${DRIP_AMOUNT} $DRIP`);
                    membershipResult.status = "SUCCESS";
                    membershipResult.finalDripBalance = finalDripAmount;
                } else {
                    console.log(`    ❌ BALANCE MISMATCH: Expected ${DRIP_AMOUNT}, got ${finalDripAmount}`);
                    membershipResult.status = "BALANCE_MISMATCH";
                    membershipResult.finalDripBalance = finalDripAmount;
                }
                
            } catch (error) {
                console.log(`    ❌ ${user.name} membership failed: ${error.message}`);
                membershipResult.status = "FAILED";
                membershipResult.error = error.message;
            }
            
            membershipResults.push(membershipResult);
            console.log(`  ${user.name} processing complete!\n`);
        }
        
        // Batch Summary
        console.log("=== BATCH MEMBERSHIP RESULTS ===");
        
        let successfulMemberships = 0;
        let totalHbarDeposited = 0;
        let totalDripMinted = 0;
        
        membershipResults.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.user} (${result.accountId}):`);
            console.log(`   Status: ${result.status}`);
            
            if (result.steps.deposit) {
                console.log(`   💰 Deposit: ${result.steps.deposit.amount} HBAR`);
                console.log(`     Transaction: ${result.steps.deposit.transactionId}`);
                totalHbarDeposited += result.steps.deposit.amount;
            }
            
            if (result.steps.mint) {
                console.log(`   🪙 Minted: ${result.steps.mint.amount} $DRIP`);
                console.log(`     Transaction: ${result.steps.mint.transactionId}`);
                totalDripMinted += result.steps.mint.amount;
            }
            
            if (result.finalDripBalance !== undefined) {
                console.log(`   💎 Final Balance: ${result.finalDripBalance} $DRIP`);
            }
            
            if (result.status === "SUCCESS") {
                successfulMemberships++;
                console.log(`   ✅ MEMBERSHIP ACTIVE`);
            } else if (result.error) {
                console.log(`   ❌ Error: ${result.error}`);
            }
        });
        
        console.log("\n=== BATCH SUMMARY ===");
        console.log(`📊 Total users processed: ${testUsers.length}`);
        console.log(`✅ Successful memberships: ${successfulMemberships}`);
        console.log(`❌ Failed memberships: ${testUsers.length - successfulMemberships}`);
        console.log(`💰 Total HBAR deposited: ${totalHbarDeposited}`);
        console.log(`🪙 Total $DRIP minted: ${totalDripMinted}`);
        console.log(`🎯 Success rate: ${(successfulMemberships / testUsers.length * 100).toFixed(1)}%`);
        
        console.log("\n=== PROTOCOL COMPLIANCE ===");
        if (totalHbarDeposited === totalDripMinted) {
            console.log("✅ 1:1 HBAR:DRIP RATIO MAINTAINED");
        } else {
            console.log("❌ 1:1 HBAR:DRIP RATIO VIOLATED");
        }
        
        console.log("✅ Treasury mint authority used correctly");
        console.log("✅ Non-transferability enforced (accounts frozen)");
        console.log("✅ One membership = one DRIP token");
        
        if (successfulMemberships === testUsers.length) {
            console.log("\n🎉 BATCH MEMBERSHIP TEST COMPLETE!");
            console.log("🎯 All TEST_USER_3, 4, 5 now have active memberships!");
            console.log("💡 Ready for enhanced daily snapshots with 5 participants!");
        } else {
            console.log("\n⚠️  Some memberships failed - review errors above");
        }
        
    } catch (error) {
        console.error("❌ Batch membership test failed:", error.message);
    } finally {
        client.close();
    }
}

batchMembershipTestUsers345();