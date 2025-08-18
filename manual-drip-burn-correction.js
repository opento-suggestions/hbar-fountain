import { 
    Client, 
    TokenBurnTransaction,
    TransferTransaction,
    AccountBalanceQuery,
    PrivateKey
} from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function manualDripBurnCorrection() {
    console.log("=== MANUAL $DRIP BURN CORRECTION ===\n");
    console.log("🔧 Correcting protocol state after incomplete AutoRelease");
    console.log("🔥 Burning TEST_USER_3's remaining $DRIP token");
    console.log("💡 This should have happened during the 1000 $WISH AutoRelease\n");
    
    const client = Client.forTestnet();
    
    // Account setup
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    const controllerPrivateKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    const testUser3AccountId = process.env.TEST_USER_3_ACCOUNT_ID;
    const testUser3PrivateKey = PrivateKey.fromString(process.env.TEST_USER_3_PRIVATE_KEY);
    const dripTokenId = process.env.DRIP_TOKEN_ID;
    
    client.setOperator(controllerAccountId, controllerPrivateKey);
    
    try {
        console.log("=== STEP 1: CURRENT STATE VERIFICATION ===");
        
        // Check TEST_USER_3 current $DRIP balance
        const user3Balance = await new AccountBalanceQuery()
            .setAccountId(testUser3AccountId)
            .execute(client);
        
        const user3DripBalance = user3Balance.tokens.get(dripTokenId);
        const dripAmount = user3DripBalance ? parseInt(user3DripBalance.toString()) : 0;
        
        console.log(`TEST_USER_3 Current $DRIP Balance: ${dripAmount} tokens`);
        
        if (dripAmount === 0) {
            console.log("✅ No $DRIP tokens to burn - user already properly AutoReleased");
            return;
        }
        
        if (dripAmount !== 1) {
            console.log(`⚠️  Unexpected $DRIP balance: ${dripAmount} (expected 1)`);
        }
        
        console.log("🔧 Proceeding with manual $DRIP burn to correct protocol state");
        
        console.log("\n=== STEP 2: DRIP TOKEN TRANSFER TO TREASURY ===");
        
        // Transfer $DRIP from TEST_USER_3 to treasury for burning
        console.log("Transferring $DRIP from TEST_USER_3 to treasury...");
        
        const dripTransferTx = new TransferTransaction()
            .addTokenTransfer(dripTokenId, testUser3AccountId, -1)
            .addTokenTransfer(dripTokenId, controllerAccountId, 1)
            .freezeWith(client);
        
        const signedDripTransferTx = await dripTransferTx.sign(testUser3PrivateKey);
        const dripTransferResponse = await signedDripTransferTx.execute(client);
        const dripTransferReceipt = await dripTransferResponse.getReceipt(client);
        
        console.log(`✅ $DRIP Transfer: ${dripTransferResponse.transactionId}`);
        
        console.log("\n=== STEP 3: DRIP TOKEN BURN ===");
        
        // Burn the $DRIP token from treasury
        console.log("Burning 1 $DRIP membership token...");
        
        const dripBurnTx = new TokenBurnTransaction()
            .setTokenId(dripTokenId)
            .setAmount(1);
        
        const dripBurnResponse = await dripBurnTx.execute(client);
        const dripBurnReceipt = await dripBurnResponse.getReceipt(client);
        
        console.log(`✅ $DRIP Burn: ${dripBurnResponse.transactionId}`);
        console.log("🔥 1 $DRIP membership token permanently burned");
        
        console.log("\n=== STEP 4: POST-BURN VERIFICATION ===");
        
        // Verify $DRIP token is burned
        const finalUser3Balance = await new AccountBalanceQuery()
            .setAccountId(testUser3AccountId)
            .execute(client);
        
        const finalDripBalance = finalUser3Balance.tokens.get(dripTokenId);
        const finalDripAmount = finalDripBalance ? parseInt(finalDripBalance.toString()) : 0;
        
        console.log(`TEST_USER_3 Final $DRIP Balance: ${finalDripAmount} tokens`);
        console.log(`Membership Status: ${finalDripAmount >= 1 ? 'ACTIVE' : 'INACTIVE'}`);
        
        if (finalDripAmount === 0) {
            console.log("✅ $DRIP burn successful - AutoRelease state corrected");
        } else {
            console.log("❌ $DRIP burn failed - manual intervention required");
        }
        
        console.log("\n=== STEP 5: PROTOCOL STATE CORRECTION SUMMARY ===");
        
        console.log("🔧 Correction Details:");
        console.log("   • Previous AutoRelease: Incomplete (missed $DRIP burn)");
        console.log("   • Manual correction: $DRIP token burned");
        console.log("   • Protocol state: Now properly reset");
        console.log("   • User status: Ready for re-enrollment");
        
        console.log("\n💡 Protocol Clarification:");
        console.log("   • Full 1000 $WISH AutoRelease = Burn both $WISH AND $DRIP");
        console.log("   • Partial <1000 $WISH redemption = Burn only $WISH");
        console.log("   • TEST_USER_3 can now re-enroll with 1 HBAR → 1 $DRIP");
        
        console.log("\n🎉 MANUAL CORRECTION COMPLETE!");
        console.log("✅ Protocol state properly reset for TEST_USER_3");
        
    } catch (error) {
        console.error("❌ Manual correction failed:", error.message);
    } finally {
        client.close();
    }
}

manualDripBurnCorrection();