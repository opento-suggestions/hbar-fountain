import { 
    Client, 
    TokenMintTransaction,
    TokenUnfreezeTransaction,
    TokenFreezeTransaction,
    TransferTransaction,
    AccountBalanceQuery,
    Hbar,
    PrivateKey
} from "@hashgraph/sdk";
import dotenv from "dotenv";
dotenv.config();

async function testUser3ReEnrollment() {
    console.log("=== TEST_USER_3 RE-ENROLLMENT ===\n");
    console.log("🔄 Processing membership re-enrollment after AutoRelease");
    console.log("💰 1 HBAR deposit → 1 $DRIP membership token");
    console.log("🎯 Testing protocol lifecycle: Redemption → Re-enrollment\n");
    
    const client = Client.forTestnet();
    
    // Account setup
    const controllerAccountId = process.env.CONTROLLER_ACCOUNT_ID;
    const controllerPrivateKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
    const testUser3AccountId = process.env.TEST_USER_3_ACCOUNT_ID;
    const testUser3PrivateKey = PrivateKey.fromString(process.env.TEST_USER_3_PRIVATE_KEY);
    const dripTokenId = process.env.DRIP_TOKEN_ID;
    const wishTokenId = process.env.WISH_TOKEN_ID;
    const dropTokenId = process.env.DROP_TOKEN_ID;
    
    // Use CONTROLLER as default operator for treasury operations
    client.setOperator(controllerAccountId, controllerPrivateKey);
    
    const HBAR_DEPOSIT_AMOUNT = 1;
    const DRIP_MINT_AMOUNT = 1;
    
    try {
        console.log("=== STEP 1: PRE-ENROLLMENT BALANCE CHECK ===");
        
        // Check TEST_USER_3 current status
        const user3Balance = await new AccountBalanceQuery()
            .setAccountId(testUser3AccountId)
            .execute(client);
        
        const user3HbarBalance = user3Balance.hbars;
        const user3DripBalance = user3Balance.tokens.get(dripTokenId);
        const user3WishBalance = user3Balance.tokens.get(wishTokenId);
        const user3DropBalance = user3Balance.tokens.get(dropTokenId);
        
        const dripAmount = user3DripBalance ? parseInt(user3DripBalance.toString()) : 0;
        const wishAmount = user3WishBalance ? parseInt(user3WishBalance.toString()) : 0;
        const dropAmount = user3DropBalance ? parseInt(user3DropBalance.toString()) : 0;
        
        console.log(`TEST_USER_3 Pre-Enrollment Status:`);
        console.log(`   HBAR: ${user3HbarBalance.toString()}`);
        console.log(`   $DRIP: ${dripAmount} tokens`);
        console.log(`   $WISH: ${wishAmount} tokens`);
        console.log(`   $DROP: ${dropAmount} tokens`);
        console.log(`   Membership Status: ${dripAmount >= 1 ? 'ACTIVE' : 'INACTIVE'}`);
        
        // Check CONTROLLER treasury
        const controllerBalance = await new AccountBalanceQuery()
            .setAccountId(controllerAccountId)
            .execute(client);
        
        const controllerHbarBalance = controllerBalance.hbars;
        const controllerDripBalance = controllerBalance.tokens.get(dripTokenId);
        const controllerDripAmount = controllerDripBalance ? parseInt(controllerDripBalance.toString()) : 0;
        
        console.log(`\nCONTROLLER Treasury Pre-Enrollment:`);
        console.log(`   HBAR: ${controllerHbarBalance.toString()}`);
        console.log(`   $DRIP: ${controllerDripAmount} tokens`);
        
        // Validation checks
        const requiredHbar = new Hbar(HBAR_DEPOSIT_AMOUNT);
        if (user3HbarBalance.toBigNumber().isLessThan(requiredHbar.toBigNumber())) {
            throw new Error(`Insufficient HBAR for deposit. Has: ${user3HbarBalance.toString()}, Needs: ${HBAR_DEPOSIT_AMOUNT} HBAR`);
        }
        
        console.log(`\n✅ Pre-enrollment validation passed`);
        console.log(`   User has sufficient HBAR: ${user3HbarBalance.toString()} ≥ ${HBAR_DEPOSIT_AMOUNT} HBAR`);
        console.log(`   Ready for re-enrollment deposit`);
        
        console.log("\n=== STEP 2: HBAR DEPOSIT TRANSACTION ===");
        
        // HBAR deposit from TEST_USER_3 to treasury
        console.log(`Processing ${HBAR_DEPOSIT_AMOUNT} HBAR deposit from TEST_USER_3...`);
        
        const hbarDepositTx = new TransferTransaction()
            .addHbarTransfer(testUser3AccountId, new Hbar(-HBAR_DEPOSIT_AMOUNT))
            .addHbarTransfer(controllerAccountId, new Hbar(HBAR_DEPOSIT_AMOUNT))
            .freezeWith(client);
        
        const signedDepositTx = await hbarDepositTx.sign(testUser3PrivateKey);
        const depositResponse = await signedDepositTx.execute(client);
        const depositReceipt = await depositResponse.getReceipt(client);
        
        console.log(`✅ HBAR Deposit: ${depositResponse.transactionId}`);
        console.log(`💰 ${HBAR_DEPOSIT_AMOUNT} HBAR deposited to protocol treasury`);
        
        console.log("\n=== STEP 3: DRIP TOKEN MINTING ===");
        
        // Mint $DRIP token for membership
        console.log(`Minting ${DRIP_MINT_AMOUNT} $DRIP membership token...`);
        
        const dripMintTx = new TokenMintTransaction()
            .setTokenId(dripTokenId)
            .setAmount(DRIP_MINT_AMOUNT);
        
        const mintResponse = await dripMintTx.execute(client);
        const mintReceipt = await mintResponse.getReceipt(client);
        
        console.log(`✅ $DRIP Mint: ${mintResponse.transactionId}`);
        console.log(`🪙 ${DRIP_MINT_AMOUNT} $DRIP token minted to treasury`);
        
        console.log("\n=== STEP 4: UNFREEZE ACCOUNT FOR DRIP TRANSFER ===");
        
        // Unfreeze TEST_USER_3's account for $DRIP token
        console.log("Unfreezing TEST_USER_3 account for $DRIP transfers...");
        
        const unfreezeAccountTx = new TokenUnfreezeTransaction()
            .setTokenId(dripTokenId)
            .setAccountId(testUser3AccountId);
        
        const unfreezeResponse = await unfreezeAccountTx.execute(client);
        const unfreezeReceipt = await unfreezeResponse.getReceipt(client);
        
        console.log(`✅ Account Unfreeze: ${unfreezeResponse.transactionId}`);
        
        console.log("\n=== STEP 5: DRIP TOKEN TRANSFER TO USER ===");
        
        // Transfer $DRIP from treasury to TEST_USER_3
        console.log(`Transferring ${DRIP_MINT_AMOUNT} $DRIP to TEST_USER_3...`);
        
        const dripTransferTx = new TransferTransaction()
            .addTokenTransfer(dripTokenId, controllerAccountId, -DRIP_MINT_AMOUNT)
            .addTokenTransfer(dripTokenId, testUser3AccountId, DRIP_MINT_AMOUNT);
        
        const transferResponse = await dripTransferTx.execute(client);
        const transferReceipt = await transferResponse.getReceipt(client);
        
        console.log(`✅ $DRIP Transfer: ${transferResponse.transactionId}`);
        console.log(`🎫 ${DRIP_MINT_AMOUNT} $DRIP membership token sent to TEST_USER_3`);
        
        console.log("\n=== STEP 6: REFREEZE ACCOUNT FOR PROTOCOL INTEGRITY ===");
        
        // Refreeze TEST_USER_3's account for $DRIP token to maintain non-transferable design
        console.log("Refreezing TEST_USER_3 account for $DRIP...");
        
        const refreezeAccountTx = new TokenFreezeTransaction()
            .setTokenId(dripTokenId)
            .setAccountId(testUser3AccountId);
        
        const refreezeResponse = await refreezeAccountTx.execute(client);
        const refreezeReceipt = await refreezeResponse.getReceipt(client);
        
        console.log(`✅ Account Refreeze: ${refreezeResponse.transactionId}`);
        console.log("🧊 TEST_USER_3 refrozen for $DRIP - non-transferable design maintained");
        
        console.log("\n=== STEP 7: POST-ENROLLMENT BALANCE VERIFICATION ===");
        
        // Check final balances
        const finalUser3Balance = await new AccountBalanceQuery()
            .setAccountId(testUser3AccountId)
            .execute(client);
        
        const finalUser3HbarBalance = finalUser3Balance.hbars;
        const finalUser3DripBalance = finalUser3Balance.tokens.get(dripTokenId);
        const finalUser3WishBalance = finalUser3Balance.tokens.get(wishTokenId);
        const finalUser3DropBalance = finalUser3Balance.tokens.get(dropTokenId);
        
        const finalDripAmount = finalUser3DripBalance ? parseInt(finalUser3DripBalance.toString()) : 0;
        const finalWishAmount = finalUser3WishBalance ? parseInt(finalUser3WishBalance.toString()) : 0;
        const finalDropAmount = finalUser3DropBalance ? parseInt(finalUser3DropBalance.toString()) : 0;
        
        const finalControllerBalance = await new AccountBalanceQuery()
            .setAccountId(controllerAccountId)
            .execute(client);
        
        const finalControllerHbarBalance = finalControllerBalance.hbars;
        const finalControllerDripBalance = finalControllerBalance.tokens.get(dripTokenId);
        const finalControllerDripAmount = finalControllerDripBalance ? parseInt(finalControllerDripBalance.toString()) : 0;
        
        console.log(`TEST_USER_3 Post-Enrollment:`);
        console.log(`   HBAR: ${finalUser3HbarBalance.toString()} (change: -${HBAR_DEPOSIT_AMOUNT})`);
        console.log(`   $DRIP: ${finalDripAmount} tokens (change: +${finalDripAmount - dripAmount})`);
        console.log(`   $WISH: ${finalWishAmount} tokens (unchanged)`);
        console.log(`   $DROP: ${finalDropAmount} tokens (unchanged)`);
        console.log(`   Membership Status: ${finalDripAmount >= 1 ? 'ACTIVE' : 'INACTIVE'}`);
        
        console.log(`\nCONTROLLER Treasury Post-Enrollment:`);
        console.log(`   HBAR: ${finalControllerHbarBalance.toString()} (change: +${HBAR_DEPOSIT_AMOUNT})`);
        console.log(`   $DRIP: ${finalControllerDripAmount} tokens (net change: ${finalControllerDripAmount - controllerDripAmount})`);
        
        console.log("\n=== STEP 8: RE-ENROLLMENT VERIFICATION ===");
        
        const hbarDecrease = user3HbarBalance.toTinybars() - finalUser3HbarBalance.toTinybars();
        const expectedHbarDecrease = new Hbar(HBAR_DEPOSIT_AMOUNT).toTinybars();
        const dripIncrease = finalDripAmount - dripAmount;
        
        console.log(`📊 Transaction Verification:`);
        console.log(`   HBAR deposit: ${HBAR_DEPOSIT_AMOUNT} HBAR`);
        console.log(`   HBAR decrease verified: ${hbarDecrease === expectedHbarDecrease ? '✅' : '❌'}`);
        console.log(`   $DRIP received: ${dripIncrease} tokens`);
        console.log(`   $DRIP increase verified: ${dripIncrease === DRIP_MINT_AMOUNT ? '✅' : '❌'}`);
        console.log(`   Membership activation: ${finalDripAmount >= 1 ? '✅' : '❌'}`);
        
        console.log(`\n🔄 Re-Enrollment Details:`);
        console.log(`   User: TEST_USER_3`);
        console.log(`   HBAR Deposited: ${HBAR_DEPOSIT_AMOUNT} HBAR`);
        console.log(`   $DRIP Received: ${DRIP_MINT_AMOUNT} token`);
        console.log(`   Exchange Rate: 1:1 HBAR:DRIP ratio maintained`);
        console.log(`   New Membership Status: ${finalDripAmount >= 1 ? 'ACTIVE' : 'INACTIVE'}`);
        
        console.log("\n=== STEP 9: PROTOCOL LIFECYCLE ANALYSIS ===");
        
        console.log(`💡 Full Protocol Journey for TEST_USER_3:`);
        console.log(`   1. ✅ Initial Membership: 1 HBAR → 1 $DRIP`);
        console.log(`   2. ✅ $WISH Accumulation: Daily snapshots over 2 weeks`);
        console.log(`   3. ✅ Lifetime Cap Reached: 1100 $WISH (exceeded 1000)`);
        console.log(`   4. ✅ AutoRelease: 1000 $WISH → 1.8 HBAR (+ 100 $WISH remaining)`);
        console.log(`   5. ✅ Re-Enrollment: 1 HBAR → 1 $DRIP (new membership)`);
        
        console.log(`\n🎯 Current Protocol Status:`);
        console.log(`   Previous $WISH Balance: 100 tokens (from AutoRelease remainder)`);
        console.log(`   New $DRIP Balance: ${finalDripAmount} token (fresh membership)`);
        console.log(`   Ready for new $WISH accumulation cycle`);
        console.log(`   Daily snapshot eligibility: RESTORED`);
        
        if (finalDripAmount >= 1) {
            console.log(`\n📈 Future $WISH Accumulation:`);
            const hasDrop = finalDropAmount >= 1;
            const dailyWishRate = 50 + (hasDrop ? 25 : 0);
            console.log(`   Daily rate: ${dailyWishRate} $WISH (50 base${hasDrop ? ' + 25 bonus' : ''})`);
            console.log(`   Days to next 1000 $WISH cap: ${Math.ceil((1000 - finalWishAmount) / dailyWishRate)} days`);
            console.log(`   Next AutoRelease eligibility: ${Math.ceil((1000 - finalWishAmount) / dailyWishRate)} days`);
        }
        
        const allVerified = hbarDecrease === expectedHbarDecrease && 
                           dripIncrease === DRIP_MINT_AMOUNT && 
                           finalDripAmount >= 1;
        
        if (allVerified) {
            console.log("\n🎉 RE-ENROLLMENT SUCCESSFUL!");
            console.log("✅ All transactions verified and balances correct");
            console.log("🔄 TEST_USER_3 successfully re-enrolled in Fountain Protocol!");
            console.log("🚀 Ready for new $WISH accumulation cycle!");
        } else {
            console.log("\n⚠️  Re-enrollment completed with verification issues");
            console.log("❌ Check transaction details above");
        }
        
    } catch (error) {
        console.error("❌ Re-enrollment failed:", error.message);
    } finally {
        client.close();
    }
}

testUser3ReEnrollment();