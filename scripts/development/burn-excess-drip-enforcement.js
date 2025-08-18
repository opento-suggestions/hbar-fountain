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

async function burnExcessDripEnforcement() {
    console.log("=== CRITICAL: BURN EXCESS $DRIP TOKEN ===\n");
    console.log("🚨 PROTOCOL VIOLATION DETECTED!");
    console.log("⚠️  TEST_USER_3 has 2 $DRIP tokens - MAXIMUM IS 1!");
    console.log("🔥 ENFORCING HARD RULE: ONE $DRIP PER WALLET, EVER!\n");
    
    const client = Client.forTestnet();
    
    // Account setup
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    const controllerPrivateKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    const testUser3AccountId = process.env.TEST_USER_3_ACCOUNT_ID;
    const testUser3PrivateKey = PrivateKey.fromString(process.env.TEST_USER_3_PRIVATE_KEY);
    const dripTokenId = process.env.DRIP_TOKEN_ID;
    
    client.setOperator(controllerAccountId, controllerPrivateKey);
    
    try {
        console.log("=== STEP 1: VIOLATION VERIFICATION ===");
        
        // Check TEST_USER_3's current $DRIP balance
        const user3Balance = await new AccountBalanceQuery()
            .setAccountId(testUser3AccountId)
            .execute(client);
        
        const user3DripBalance = user3Balance.tokens.get(dripTokenId);
        const dripAmount = user3DripBalance ? parseInt(user3DripBalance.toString()) : 0;
        
        console.log(`TEST_USER_3 Current $DRIP Balance: ${dripAmount} tokens`);
        
        if (dripAmount <= 1) {
            console.log("✅ No violation - user has ≤1 $DRIP token");
            return;
        }
        
        const excessAmount = dripAmount - 1;
        console.log(`❌ VIOLATION CONFIRMED: ${excessAmount} excess $DRIP token(s) detected!`);
        console.log(`🔥 Must burn ${excessAmount} $DRIP to comply with protocol rules`);
        
        console.log("\n=== STEP 2: UNFREEZE ACCOUNT ===");
        
        // Unfreeze TEST_USER_3's account for $DRIP token transfers
        console.log("Unfreezing TEST_USER_3 account for enforcement action...");
        
        const unfreezeAccountTx = new TokenUnfreezeTransaction()
            .setTokenId(dripTokenId)
            .setAccountId(testUser3AccountId);
        
        const unfreezeResponse = await unfreezeAccountTx.execute(client);
        const unfreezeReceipt = await unfreezeResponse.getReceipt(client);
        
        console.log(`✅ Account Unfreeze: ${unfreezeResponse.transactionId}`);
        
        console.log("\n=== STEP 3: TRANSFER EXCESS $DRIP TO TREASURY ===");
        
        // Transfer excess $DRIP from TEST_USER_3 to treasury for burning
        console.log(`Transferring ${excessAmount} excess $DRIP to treasury...`);
        
        const dripTransferTx = new TransferTransaction()
            .addTokenTransfer(dripTokenId, testUser3AccountId, -excessAmount)
            .addTokenTransfer(dripTokenId, controllerAccountId, excessAmount)
            .freezeWith(client);
        
        const signedDripTransferTx = await dripTransferTx.sign(testUser3PrivateKey);
        const dripTransferResponse = await signedDripTransferTx.execute(client);
        const dripTransferReceipt = await dripTransferResponse.getReceipt(client);
        
        console.log(`✅ $DRIP Transfer: ${dripTransferResponse.transactionId}`);
        
        console.log("\n=== STEP 4: BURN EXCESS $DRIP ===");
        
        // Burn the excess $DRIP token(s) from treasury
        console.log(`Burning ${excessAmount} excess $DRIP token(s)...`);
        
        const dripBurnTx = new TokenBurnTransaction()
            .setTokenId(dripTokenId)
            .setAmount(excessAmount);
        
        const dripBurnResponse = await dripBurnTx.execute(client);
        const dripBurnReceipt = await dripBurnResponse.getReceipt(client);
        
        console.log(`✅ $DRIP Burn: ${dripBurnResponse.transactionId}`);
        console.log(`🔥 ${excessAmount} excess $DRIP token(s) permanently burned!`);
        
        console.log("\n=== STEP 5: REFREEZE ACCOUNT ===");
        
        // Refreeze TEST_USER_3's account to maintain protocol integrity
        console.log("Refreezing TEST_USER_3 account...");
        
        const refreezeAccountTx = new TokenFreezeTransaction()
            .setTokenId(dripTokenId)
            .setAccountId(testUser3AccountId);
        
        const refreezeResponse = await refreezeAccountTx.execute(client);
        const refreezeReceipt = await refreezeResponse.getReceipt(client);
        
        console.log(`✅ Account Refreeze: ${refreezeResponse.transactionId}`);
        console.log("🧊 Account refrozen - non-transferable design maintained");
        
        console.log("\n=== STEP 6: FINAL VERIFICATION ===");
        
        // Verify final state
        const finalUser3Balance = await new AccountBalanceQuery()
            .setAccountId(testUser3AccountId)
            .execute(client);
        
        const finalDripBalance = finalUser3Balance.tokens.get(dripTokenId);
        const finalDripAmount = finalDripBalance ? parseInt(finalDripBalance.toString()) : 0;
        
        console.log(`TEST_USER_3 Final $DRIP Balance: ${finalDripAmount} token(s)`);
        
        if (finalDripAmount === 1) {
            console.log("✅ PROTOCOL COMPLIANCE RESTORED!");
            console.log("✅ User has exactly 1 $DRIP token");
        } else if (finalDripAmount === 0) {
            console.log("⚠️  User has 0 $DRIP tokens - membership inactive");
        } else {
            console.log(`❌ CRITICAL ERROR: User still has ${finalDripAmount} $DRIP tokens!`);
        }
        
        console.log("\n=== STEP 7: PROTOCOL RULES SUMMARY ===");
        
        console.log("🔒 HARD PROTOCOL RULES ENFORCED:");
        console.log("   • ONE $DRIP PER WALLET - MAXIMUM, EVER!");
        console.log("   • ONE $DROP PER WALLET - MAXIMUM, EVER!");
        console.log("   • $DRIP tokens are NON-TRANSFERABLE (frozen)");
        console.log("   • $DROP tokens are NON-TRANSFERABLE (frozen)");
        console.log("   • AutoRelease burns BOTH $WISH (1000) AND $DRIP (1)");
        console.log("   • Re-enrollment requires new 1 HBAR deposit");
        
        console.log("\n💡 PROTOCOL ENFORCEMENT:");
        console.log("   • Any excess tokens MUST be burned immediately");
        console.log("   • No wallet can ever hold >1 $DRIP or >1 $DROP");
        console.log("   • These rules are ABSOLUTE and NON-NEGOTIABLE");
        
        if (finalDripAmount === 1) {
            console.log("\n🎉 ENFORCEMENT ACTION COMPLETE!");
            console.log("✅ Protocol integrity restored");
            console.log("✅ TEST_USER_3 compliant with ONE $DRIP rule");
        }
        
    } catch (error) {
        console.error("❌ Enforcement action failed:", error.message);
    } finally {
        client.close();
    }
}

burnExcessDripEnforcement();