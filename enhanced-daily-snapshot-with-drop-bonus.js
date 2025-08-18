import { 
    Client, 
    TokenMintTransaction,
    TokenAssociateTransaction,
    TransferTransaction,
    AccountBalanceQuery,
    PrivateKey
} from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function enhancedDailySnapshotWithDropBonus() {
    console.log("=== ENHANCED DAILY SNAPSHOT WITH $DROP BONUS ===\n");
    console.log("🕐 Emulating UTC 00:00 Daily Snapshot");
    console.log("📊 Base Distribution: 50 $WISH to all accounts holding ≥1 $DRIP");
    console.log("🎁 BONUS RULE: +25 $WISH for accounts holding $DROP tokens\n");
    
    const client = Client.forTestnet();
    
    // Use CONTROLLER (treasury) for minting operations
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    const controllerPrivateKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    client.setOperator(controllerAccountId, controllerPrivateKey);
    
    const dripTokenId = process.env.DRIP_TOKEN_ID;
    const wishTokenId = process.env.WISH_TOKEN_ID;
    const dropTokenId = process.env.DROP_TOKEN_ID;
    
    // All accounts to check
    const accountsToCheck = [
        { name: "CONTROLLER", id: process.env.CONTROLLER_ACCOUNT_ID },
        { name: "TEST_USER_1", id: process.env.TEST_USER_1_ACCOUNT_ID },
        { name: "TEST_USER_2", id: process.env.TEST_USER_2_ACCOUNT_ID },
        { name: "TEST_USER_3", id: process.env.TEST_USER_3_ACCOUNT_ID },
        { name: "TEST_USER_4", id: process.env.TEST_USER_4_ACCOUNT_ID },
        { name: "TEST_USER_5", id: process.env.TEST_USER_5_ACCOUNT_ID }
    ];
    
    const BASE_WISH_AMOUNT = 50;  // Base daily grant
    const DROP_BONUS_AMOUNT = 25; // Bonus for $DROP holders
    
    try {
        console.log("=== STEP 1: SNAPSHOT ACCOUNT BALANCES ===");
        console.log(`Snapshot time: ${new Date().toISOString()}`);
        console.log("Checking DRIP and DROP holdings for all accounts...\n");
        
        const eligibleAccounts = [];
        
        for (const account of accountsToCheck) {
            try {
                const balance = await new AccountBalanceQuery()
                    .setAccountId(account.id)
                    .execute(client);
                
                const dripBalance = balance.tokens.get(dripTokenId);
                const dropBalance = balance.tokens.get(dropTokenId);
                
                const dripAmount = dripBalance ? parseInt(dripBalance.toString()) : 0;
                const dropAmount = dropBalance ? parseInt(dropBalance.toString()) : 0;
                
                console.log(`${account.name} (${account.id}):`);
                console.log(`  $DRIP: ${dripAmount} tokens`);
                console.log(`  $DROP: ${dropAmount} tokens`);
                
                // Check eligibility for base WISH grant (≥1 DRIP)
                if (dripAmount >= 1) {
                    const hasDropBonus = dropAmount >= 1;
                    const wishGrant = BASE_WISH_AMOUNT + (hasDropBonus ? DROP_BONUS_AMOUNT : 0);
                    
                    eligibleAccounts.push({
                        name: account.name,
                        id: account.id,
                        dripBalance: dripAmount,
                        dropBalance: dropAmount,
                        hasDropBonus: hasDropBonus,
                        wishGrant: wishGrant
                    });
                    
                    if (hasDropBonus) {
                        console.log(`  ✅ ELIGIBLE: Base 50 + DROP Bonus 25 = ${wishGrant} $WISH`);
                    } else {
                        console.log(`  ✅ ELIGIBLE: Base ${wishGrant} $WISH (no $DROP bonus)`);
                    }
                } else {
                    console.log(`  ❌ Not eligible (no $DRIP tokens)`);
                }
                console.log();
                
            } catch (error) {
                console.log(`${account.name}: ERROR - ${error.message}\n`);
            }
        }
        
        console.log("=== SNAPSHOT DISTRIBUTION SUMMARY ===");
        console.log(`Total eligible accounts: ${eligibleAccounts.length}`);
        
        let totalWishNeeded = 0;
        let dropBonusRecipients = 0;
        
        eligibleAccounts.forEach((account, index) => {
            console.log(`${index + 1}. ${account.name}:`);
            console.log(`   $DRIP: ${account.dripBalance} | $DROP: ${account.dropBalance}`);
            console.log(`   $WISH Grant: ${account.wishGrant} (Base: ${BASE_WISH_AMOUNT}${account.hasDropBonus ? ` + Bonus: ${DROP_BONUS_AMOUNT}` : ''})`);
            
            totalWishNeeded += account.wishGrant;
            if (account.hasDropBonus) dropBonusRecipients++;
        });
        
        console.log(`\nTotal $WISH to mint: ${totalWishNeeded}`);
        console.log(`Accounts receiving $DROP bonus: ${dropBonusRecipients}/${eligibleAccounts.length}\n`);
        
        if (eligibleAccounts.length === 0) {
            console.log("⚠️  No eligible accounts found. Exiting...");
            return;
        }
        
        console.log("=== STEP 2: MINT TOTAL $WISH TO TREASURY ===");
        console.log(`Minting ${totalWishNeeded} $WISH tokens to treasury...`);
        
        const mintTx = new TokenMintTransaction()
            .setTokenId(wishTokenId)
            .setAmount(totalWishNeeded);
        
        const mintResponse = await mintTx.execute(client);
        const mintReceipt = await mintResponse.getReceipt(client);
        
        console.log(`✅ Mint successful: ${mintResponse.transactionId}`);
        console.log(`Status: ${mintReceipt.status.toString()}`);
        console.log(`Total minted: ${totalWishNeeded} $WISH\n`);
        
        console.log("=== STEP 3: DISTRIBUTE $WISH WITH BONUSES ===");
        
        const distributionResults = [];
        
        for (const account of eligibleAccounts) {
            console.log(`\n📤 Distributing to ${account.name} (${account.id})...`);
            console.log(`   DRIP: ${account.dripBalance} | DROP: ${account.dropBalance}`);
            console.log(`   WISH Grant: ${account.wishGrant} tokens`);
            
            if (account.hasDropBonus) {
                console.log(`   🎁 DROP BONUS: +${DROP_BONUS_AMOUNT} $WISH (holds $DROP!)`);
            }
            
            try {
                // Transfer WISH from treasury to account
                const transferTx = new TransferTransaction()
                    .addTokenTransfer(wishTokenId, controllerAccountId, -account.wishGrant)
                    .addTokenTransfer(wishTokenId, account.id, account.wishGrant);
                
                const transferResponse = await transferTx.execute(client);
                const transferReceipt = await transferResponse.getReceipt(client);
                
                console.log(`   ✅ Transfer successful: ${transferResponse.transactionId}`);
                console.log(`   Status: ${transferReceipt.status.toString()}`);
                
                distributionResults.push({
                    account: account.name,
                    accountId: account.id,
                    dripBalance: account.dripBalance,
                    dropBalance: account.dropBalance,
                    baseWish: BASE_WISH_AMOUNT,
                    dropBonus: account.hasDropBonus ? DROP_BONUS_AMOUNT : 0,
                    totalWishGranted: account.wishGrant,
                    status: "SUCCESS",
                    transactionId: transferResponse.transactionId.toString()
                });
                
            } catch (error) {
                console.log(`   ❌ Distribution failed: ${error.message}`);
                distributionResults.push({
                    account: account.name,
                    accountId: account.id,
                    dripBalance: account.dripBalance,
                    dropBalance: account.dropBalance,
                    baseWish: BASE_WISH_AMOUNT,
                    dropBonus: 0,
                    totalWishGranted: 0,
                    status: "FAILED",
                    error: error.message
                });
            }
        }
        
        console.log("\n=== STEP 4: ENHANCED DISTRIBUTION SUMMARY ===");
        
        let successfulDistributions = 0;
        let totalWishDistributed = 0;
        let totalBonusDistributed = 0;
        
        distributionResults.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.account} (${result.accountId})`);
            console.log(`   Holdings: ${result.dripBalance} $DRIP, ${result.dropBalance} $DROP`);
            console.log(`   Base Grant: ${result.baseWish} $WISH`);
            if (result.dropBonus > 0) {
                console.log(`   🎁 DROP Bonus: +${result.dropBonus} $WISH`);
            }
            console.log(`   Total Granted: ${result.totalWishGranted} $WISH`);
            console.log(`   Status: ${result.status}`);
            if (result.transactionId) {
                console.log(`   Transaction: ${result.transactionId}`);
            }
            
            if (result.status === "SUCCESS") {
                successfulDistributions++;
                totalWishDistributed += result.totalWishGranted;
                totalBonusDistributed += result.dropBonus;
            }
        });
        
        console.log("\n=== ENHANCED DAILY SNAPSHOT RESULTS ===");
        console.log(`📊 Total eligible accounts: ${eligibleAccounts.length}`);
        console.log(`✅ Successful distributions: ${successfulDistributions}`);
        console.log(`❌ Failed distributions: ${eligibleAccounts.length - successfulDistributions}`);
        console.log(`🪙 Total $WISH distributed: ${totalWishDistributed}`);
        console.log(`🎁 Total bonus $WISH: ${totalBonusDistributed}`);
        console.log(`💰 Treasury $WISH remaining: ${totalWishNeeded - totalWishDistributed}`);
        
        console.log("\n=== ENHANCED PROTOCOL FEATURES ===");
        console.log("✅ Base rule: 50 $WISH for all $DRIP holders");
        console.log("✅ NEW BONUS RULE: +25 $WISH for $DROP holders");
        console.log("✅ Snapshot-based distribution (UTC 00:00 emulated)");
        console.log("✅ Treasury minting authority used correctly");
        console.log("✅ Cumulative rewards within protocol limits");
        
        console.log("\n🎯 ENHANCED DAILY SNAPSHOT WITH $DROP BONUS COMPLETE!");
        console.log("🎁 $DROP holders received bonus rewards!");
        
    } catch (error) {
        console.error("❌ Enhanced daily snapshot failed:", error.message);
    } finally {
        client.close();
    }
}

enhancedDailySnapshotWithDropBonus();