import { 
    Client, 
    TokenBurnTransaction,
    TransferTransaction,
    AccountBalanceQuery,
    Hbar,
    PrivateKey
} from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function autoReleaseTestUser3() {
    console.log("=== AUTORELEASE: TEST_USER_3 HBAR REDEMPTION ===\n");
    console.log("🔄 Processing AutoRelease for TEST_USER_3");
    console.log("💰 Redeeming 1000 $WISH for 1.8 HBAR payout");
    console.log("🔥 Burning $WISH tokens from circulation\n");
    
    const client = Client.forTestnet();
    
    // Account setup
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    const controllerPrivateKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    const testUser3AccountId = process.env.TEST_USER_3_ACCOUNT_ID;
    const testUser3PrivateKey = PrivateKey.fromString(process.env.TEST_USER_3_PRIVATE_KEY);
    const wishTokenId = process.env.WISH_TOKEN_ID;
    
    // Use CONTROLLER as default operator for treasury operations
    client.setOperator(controllerAccountId, controllerPrivateKey);
    
    const WISH_REDEMPTION_AMOUNT = 1000;
    const HBAR_PAYOUT_AMOUNT = 1.8;
    
    try {
        console.log("=== STEP 1: PRE-REDEMPTION BALANCE CHECK ===");
        
        // Check TEST_USER_3 balances
        const user3Balance = await new AccountBalanceQuery()
            .setAccountId(testUser3AccountId)
            .execute(client);
        
        const user3HbarBalance = user3Balance.hbars;
        const user3WishBalance = user3Balance.tokens.get(wishTokenId);
        const user3WishAmount = user3WishBalance ? parseInt(user3WishBalance.toString()) : 0;
        
        console.log(`TEST_USER_3 Pre-Redemption:`)
        console.log(`   HBAR: ${user3HbarBalance.toString()}`);
        console.log(`   $WISH: ${user3WishAmount} tokens`);
        
        // Check CONTROLLER treasury balances
        const controllerBalance = await new AccountBalanceQuery()
            .setAccountId(controllerAccountId)
            .execute(client);
        
        const controllerHbarBalance = controllerBalance.hbars;
        const controllerWishBalance = controllerBalance.tokens.get(wishTokenId);
        const controllerWishAmount = controllerWishBalance ? parseInt(controllerWishBalance.toString()) : 0;
        
        console.log(`\nCONTROLLER Treasury Pre-Redemption:`);
        console.log(`   HBAR: ${controllerHbarBalance.toString()}`);
        console.log(`   $WISH: ${controllerWishAmount} tokens`);
        
        // Validation checks
        if (user3WishAmount < WISH_REDEMPTION_AMOUNT) {
            throw new Error(`Insufficient $WISH balance. Has: ${user3WishAmount}, Needs: ${WISH_REDEMPTION_AMOUNT}`);
        }
        
        const requiredHbar = new Hbar(HBAR_PAYOUT_AMOUNT);
        if (controllerHbarBalance.toBigNumber().isLessThan(requiredHbar.toBigNumber())) {
            throw new Error(`Insufficient treasury HBAR for payout. Needs: ${HBAR_PAYOUT_AMOUNT} HBAR`);
        }
        
        console.log(`\n✅ Pre-redemption validation passed`);
        console.log(`   User has sufficient $WISH: ${user3WishAmount} ≥ ${WISH_REDEMPTION_AMOUNT}`);
        console.log(`   Treasury has sufficient HBAR for payout`);
        
        console.log("\n=== STEP 2: WISH TOKEN TRANSFER TO TREASURY ===");
        
        // Transfer $WISH from TEST_USER_3 to treasury for burning
        console.log(`Transferring ${WISH_REDEMPTION_AMOUNT} $WISH from TEST_USER_3 to treasury...`);
        
        const wishTransferTx = new TransferTransaction()
            .addTokenTransfer(wishTokenId, testUser3AccountId, -WISH_REDEMPTION_AMOUNT)
            .addTokenTransfer(wishTokenId, controllerAccountId, WISH_REDEMPTION_AMOUNT)
            .freezeWith(client);
        
        const signedWishTransferTx = await wishTransferTx.sign(testUser3PrivateKey);
        const wishTransferResponse = await signedWishTransferTx.execute(client);
        const wishTransferReceipt = await wishTransferResponse.getReceipt(client);
        
        console.log(`✅ $WISH Transfer: ${wishTransferResponse.transactionId}`);
        
        console.log("\n=== STEP 3: WISH TOKEN BURN ===");
        
        // Burn the $WISH tokens from treasury
        console.log(`Burning ${WISH_REDEMPTION_AMOUNT} $WISH tokens from circulation...`);
        
        const wishBurnTx = new TokenBurnTransaction()
            .setTokenId(wishTokenId)
            .setAmount(WISH_REDEMPTION_AMOUNT);
        
        const wishBurnResponse = await wishBurnTx.execute(client);
        const wishBurnReceipt = await wishBurnResponse.getReceipt(client);
        
        console.log(`✅ $WISH Burn: ${wishBurnResponse.transactionId}`);
        console.log(`🔥 ${WISH_REDEMPTION_AMOUNT} $WISH permanently removed from supply`);
        
        console.log("\n=== STEP 3.5: DRIP TOKEN BURN (AUTORELEASE) ===");
        
        // For full 1000 $WISH redemption, also burn the user's $DRIP membership token
        console.log(`AutoRelease: Burning user's $DRIP membership token...`);
        
        // First transfer $DRIP from user to treasury for burning
        const dripTransferTx = new TransferTransaction()
            .addTokenTransfer(process.env.DRIP_TOKEN_ID, testUser3AccountId, -1)
            .addTokenTransfer(process.env.DRIP_TOKEN_ID, controllerAccountId, 1)
            .freezeWith(client);
        
        const signedDripTransferTx = await dripTransferTx.sign(testUser3PrivateKey);
        const dripTransferResponse = await signedDripTransferTx.execute(client);
        const dripTransferReceipt = await dripTransferResponse.getReceipt(client);
        
        console.log(`✅ $DRIP Transfer: ${dripTransferResponse.transactionId}`);
        
        // Now burn the $DRIP token
        const dripBurnTx = new TokenBurnTransaction()
            .setTokenId(process.env.DRIP_TOKEN_ID)
            .setAmount(1);
        
        const dripBurnResponse = await dripBurnTx.execute(client);
        const dripBurnReceipt = await dripBurnResponse.getReceipt(client);
        
        console.log(`✅ $DRIP Burn: ${dripBurnResponse.transactionId}`);
        console.log(`🔥 1 $DRIP membership token permanently burned - AutoRelease complete`);
        
        console.log("\n=== STEP 4: HBAR PAYOUT ===");
        
        // Send HBAR payout to TEST_USER_3
        console.log(`Sending ${HBAR_PAYOUT_AMOUNT} HBAR payout to TEST_USER_3...`);
        
        const hbarPayoutTx = new TransferTransaction()
            .addHbarTransfer(controllerAccountId, new Hbar(-HBAR_PAYOUT_AMOUNT))
            .addHbarTransfer(testUser3AccountId, new Hbar(HBAR_PAYOUT_AMOUNT));
        
        const hbarPayoutResponse = await hbarPayoutTx.execute(client);
        const hbarPayoutReceipt = await hbarPayoutResponse.getReceipt(client);
        
        console.log(`✅ HBAR Payout: ${hbarPayoutResponse.transactionId}`);
        console.log(`💰 ${HBAR_PAYOUT_AMOUNT} HBAR sent to TEST_USER_3`);
        
        console.log("\n=== STEP 5: POST-REDEMPTION BALANCE VERIFICATION ===");
        
        // Check final balances
        const finalUser3Balance = await new AccountBalanceQuery()
            .setAccountId(testUser3AccountId)
            .execute(client);
        
        const finalUser3HbarBalance = finalUser3Balance.hbars;
        const finalUser3WishBalance = finalUser3Balance.tokens.get(wishTokenId);
        const finalUser3WishAmount = finalUser3WishBalance ? parseInt(finalUser3WishBalance.toString()) : 0;
        
        const finalControllerBalance = await new AccountBalanceQuery()
            .setAccountId(controllerAccountId)
            .execute(client);
        
        const finalControllerHbarBalance = finalControllerBalance.hbars;
        const finalControllerWishBalance = finalControllerBalance.tokens.get(wishTokenId);
        const finalControllerWishAmount = finalControllerWishBalance ? parseInt(finalControllerWishBalance.toString()) : 0;
        
        console.log(`TEST_USER_3 Post-Redemption:`)
        console.log(`   HBAR: ${finalUser3HbarBalance.toString()} (gain: +${HBAR_PAYOUT_AMOUNT})`);
        console.log(`   $WISH: ${finalUser3WishAmount} tokens (change: ${finalUser3WishAmount - user3WishAmount})`);
        
        console.log(`\nCONTROLLER Treasury Post-Redemption:`);
        console.log(`   HBAR: ${finalControllerHbarBalance.toString()} (change: -${HBAR_PAYOUT_AMOUNT})`);
        console.log(`   $WISH: ${finalControllerWishAmount} tokens (change: ${finalControllerWishAmount - controllerWishAmount})`);
        
        console.log("\n=== STEP 6: AUTORELEASE TRANSACTION SUMMARY ===");
        
        const expectedWishDecrease = WISH_REDEMPTION_AMOUNT;
        const actualWishDecrease = user3WishAmount - finalUser3WishAmount;
        const hbarIncrease = finalUser3HbarBalance.toTinybars().minus(user3HbarBalance.toTinybars());
        const expectedHbarIncrease = new Hbar(HBAR_PAYOUT_AMOUNT).toTinybars();
        
        console.log(`📊 Transaction Verification:`);
        console.log(`   $WISH burned: ${expectedWishDecrease} tokens`);
        console.log(`   $WISH decrease verified: ${actualWishDecrease === expectedWishDecrease ? '✅' : '❌'}`);
        console.log(`   HBAR payout: ${HBAR_PAYOUT_AMOUNT} HBAR`);
        console.log(`   HBAR increase verified: ${hbarIncrease.equals(expectedHbarIncrease) ? '✅' : '❌'}`);
        
        console.log(`\n🔄 AutoRelease Details:`);
        console.log(`   User: TEST_USER_3`);
        console.log(`   $WISH Redeemed: ${WISH_REDEMPTION_AMOUNT} tokens`);
        console.log(`   HBAR Received: ${HBAR_PAYOUT_AMOUNT} HBAR`);
        console.log(`   Exchange Rate: ${HBAR_PAYOUT_AMOUNT / WISH_REDEMPTION_AMOUNT * 1000} HBAR per 1000 $WISH`);
        console.log(`   Remaining $WISH: ${finalUser3WishAmount} tokens`);
        
        if (finalUser3WishAmount > 0) {
            console.log(`   🔄 TEST_USER_3 can redeem remaining ${finalUser3WishAmount} $WISH if desired`);
        }
        
        console.log("\n=== STEP 7: PROTOCOL IMPACT ANALYSIS ===");
        
        console.log(`💡 AutoRelease Impact:`);
        console.log(`   Token supply reduction: ${WISH_REDEMPTION_AMOUNT} $WISH permanently burned`);
        console.log(`   User HBAR gain: +${HBAR_PAYOUT_AMOUNT} HBAR`);
        console.log(`   Treasury HBAR cost: -${HBAR_PAYOUT_AMOUNT} HBAR`);
        console.log(`   Deflation mechanism: Active`);
        
        console.log(`\n🎯 Remaining AutoRelease Eligible Users:`);
        console.log(`   • CONTROLLER: 1125 $WISH (can redeem 1000)`);
        console.log(`   • TEST_USER_1: 1250 $WISH (can redeem 1000)`);
        console.log(`   • TEST_USER_5: 1100 $WISH (can redeem 1000)`);
        console.log(`   • TEST_USER_3: ${finalUser3WishAmount} $WISH (${finalUser3WishAmount >= 1000 ? 'can redeem ' + Math.min(finalUser3WishAmount, 1000) : 'below redemption threshold'})`);
        
        if (actualWishDecrease === expectedWishDecrease && hbarIncrease.equals(expectedHbarIncrease)) {
            console.log("\n🎉 AUTORELEASE SUCCESSFUL!");
            console.log("✅ All transactions verified and balances correct");
            console.log("🔄 Protocol AutoRelease mechanism working perfectly!");
        } else {
            console.log("\n⚠️  AutoRelease completed with verification issues");
            console.log("❌ Check transaction details above");
        }
        
    } catch (error) {
        console.error("❌ AutoRelease failed:", error.message);
    } finally {
        client.close();
    }
}

autoReleaseTestUser3();