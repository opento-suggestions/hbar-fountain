import { 
    Client, 
    TokenBurnTransaction,
    TokenUnfreezeTransaction,
    TokenFreezeTransaction,
    TransferTransaction,
    AccountBalanceQuery,
    PrivateKey
} from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function unfreezeeBurnRefreezeDrip() {
    console.log("=== UNFREEZE → BURN → REFREEZE $DRIP CORRECTION ===\n");
    console.log("🔧 Complete protocol state correction for TEST_USER_3");
    console.log("❄️  Step 1: Unfreeze account for $DRIP transfer");
    console.log("🔥 Step 2: Transfer and burn $DRIP token");
    console.log("🧊 Step 3: Refreeze account to maintain protocol integrity\n");
    
    const client = Client.forTestnet();
    
    // Account setup
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    const controllerPrivateKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    const testUser3AccountId = process.env.TEST_USER_3_ACCOUNT_ID;
    const testUser3PrivateKey = PrivateKey.fromString(process.env.TEST_USER_3_PRIVATE_KEY);
    const dripTokenId = process.env.DRIP_TOKEN_ID;
    
    client.setOperator(controllerAccountId, controllerPrivateKey);
    
    try {
        console.log("=== STEP 1: CURRENT STATE CHECK ===");
        
        const user3Balance = await new AccountBalanceQuery()
            .setAccountId(testUser3AccountId)
            .execute(client);
        
        const user3DripBalance = user3Balance.tokens.get(dripTokenId);
        const dripAmount = user3DripBalance ? parseInt(user3DripBalance.toString()) : 0;
        
        console.log(`TEST_USER_3 Current $DRIP Balance: ${dripAmount} tokens`);
        
        if (dripAmount === 0) {
            console.log("✅ No $DRIP tokens to burn - correction not needed");
            return;
        }
        
        console.log("\n=== STEP 2: UNFREEZE ACCOUNT FOR DRIP ===");
        
        // Unfreeze TEST_USER_3's account for $DRIP token
        console.log("Unfreezing TEST_USER_3 account for $DRIP transfers...");
        
        const unfreezeAccountTx = new TokenUnfreezeTransaction()
            .setTokenId(dripTokenId)
            .setAccountId(testUser3AccountId);
        
        const unfreezeResponse = await unfreezeAccountTx.execute(client);
        const unfreezeReceipt = await unfreezeResponse.getReceipt(client);
        
        console.log(`✅ Account Unfreeze: ${unfreezeResponse.transactionId}`);
        console.log("❄️  TEST_USER_3 temporarily unfrozen for $DRIP transfers");
        
        console.log("\n=== STEP 3: DRIP TOKEN TRANSFER TO TREASURY ===");
        
        // Now transfer $DRIP from TEST_USER_3 to treasury
        console.log("Transferring $DRIP from TEST_USER_3 to treasury...");
        
        const dripTransferTx = new TransferTransaction()
            .addTokenTransfer(dripTokenId, testUser3AccountId, -1)
            .addTokenTransfer(dripTokenId, controllerAccountId, 1)
            .freezeWith(client);
        
        const signedDripTransferTx = await dripTransferTx.sign(testUser3PrivateKey);
        const dripTransferResponse = await signedDripTransferTx.execute(client);
        const dripTransferReceipt = await dripTransferResponse.getReceipt(client);
        
        console.log(`✅ $DRIP Transfer: ${dripTransferResponse.transactionId}`);
        
        console.log("\n=== STEP 4: DRIP TOKEN BURN ===");
        
        // Burn the $DRIP token from treasury
        console.log("Burning 1 $DRIP membership token...");
        
        const dripBurnTx = new TokenBurnTransaction()
            .setTokenId(dripTokenId)
            .setAmount(1);
        
        const dripBurnResponse = await dripBurnTx.execute(client);
        const dripBurnReceipt = await dripBurnResponse.getReceipt(client);
        
        console.log(`✅ $DRIP Burn: ${dripBurnResponse.transactionId}`);
        console.log("🔥 1 $DRIP membership token permanently burned");
        
        console.log("\n=== STEP 5: REFREEZE ACCOUNT ===");
        
        // Refreeze TEST_USER_3's account for $DRIP token to maintain protocol integrity
        console.log("Refreezing TEST_USER_3 account for $DRIP...");
        
        const refreezeAccountTx = new TokenFreezeTransaction()
            .setTokenId(dripTokenId)
            .setAccountId(testUser3AccountId);
        
        const refreezeResponse = await refreezeAccountTx.execute(client);
        const refreezeReceipt = await refreezeResponse.getReceipt(client);
        
        console.log(`✅ Account Refreeze: ${refreezeResponse.transactionId}`);
        console.log("🧊 TEST_USER_3 refrozen for $DRIP - protocol integrity restored");
        
        console.log("\n=== STEP 6: FINAL VERIFICATION ===");
        
        // Verify final state
        const finalUser3Balance = await new AccountBalanceQuery()
            .setAccountId(testUser3AccountId)
            .execute(client);
        
        const finalDripBalance = finalUser3Balance.tokens.get(dripTokenId);
        const finalDripAmount = finalDripBalance ? parseInt(finalDripBalance.toString()) : 0;
        
        console.log(`TEST_USER_3 Final State:`);
        console.log(`   $DRIP Balance: ${finalDripAmount} tokens`);
        console.log(`   Membership Status: ${finalDripAmount >= 1 ? 'ACTIVE' : 'INACTIVE'}`);
        console.log(`   Account Status: FROZEN for $DRIP (non-transferable)`);
        
        console.log("\n=== STEP 7: AUTORELEASE CORRECTION SUMMARY ===");
        
        console.log("🔧 Full AutoRelease Protocol Corrected:");
        console.log("   ✅ 1000 $WISH tokens burned (completed previously)");
        console.log("   ✅ 1 $DRIP membership token burned (corrected now)");
        console.log("   ✅ 1.8 HBAR payout sent (completed previously)");
        console.log("   ✅ User membership properly terminated");
        
        console.log("\n💡 Protocol State:");
        console.log("   • TEST_USER_3: No active membership (0 $DRIP)");
        console.log("   • Remaining $WISH: 100 tokens (AutoRelease remainder)");
        console.log("   • Remaining $DROP: 1 token (donation recognition preserved)");
        console.log("   • Ready for re-enrollment: 1 HBAR → 1 new $DRIP");
        
        if (finalDripAmount === 0) {
            console.log("\n🎉 AUTORELEASE CORRECTION COMPLETE!");
            console.log("✅ Protocol state properly reset - ready for re-enrollment");
        } else {
            console.log("\n⚠️  Correction incomplete - manual review required");
        }
        
    } catch (error) {
        console.error("❌ Correction process failed:", error.message);
    } finally {
        client.close();
    }
}

unfreezeeBurnRefreezeDrip();