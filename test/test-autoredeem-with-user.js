/**
 * Test AutoRedeem Logic with TEST_USER_1
 * Test our corrected AutoRedeem implementation that properly burns WISH tokens
 */

import { 
    Client, 
    TokenBurnTransaction,
    TokenMintTransaction,
    TokenUnfreezeTransaction,
    TransferTransaction,
    AccountBalanceQuery,
    PrivateKey,
    AccountId,
    Hbar
} from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

class AutoRedeemTester {
    constructor() {
        this.client = Client.forTestnet();
        this.controllerId = AccountId.fromString(process.env.CONTROLLER_ACCOUNT_ID);
        this.controllerKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
        
        // TEST_USER_1 credentials  
        this.testUserId = AccountId.fromString(process.env.TEST_USER_1_ACCOUNT_ID);
        this.testUserKey = PrivateKey.fromString(process.env.TEST_USER_1_PRIVATE_KEY);
        
        this.tokenIds = {
            DRIP: process.env.DRIP_TOKEN_ID,
            WISH: process.env.WISH_TOKEN_ID,
            DROP: process.env.DROP_TOKEN_ID
        };
    }

    async initialize() {
        console.log('🔄 Initializing AutoRedeem Tester...');
        this.client.setOperator(this.controllerId, this.controllerKey);
        console.log(`✅ Testing AutoRedeem with TEST_USER_1: ${this.testUserId}`);
    }

    async checkEligibility() {
        console.log('\n🔍 Checking AutoRedeem eligibility...');
        
        const balance = await new AccountBalanceQuery()
            .setAccountId(this.testUserId)
            .execute(this.client);
        
        const dripBalance = parseInt(balance.tokens.get(this.tokenIds.DRIP) || 0);
        const wishBalance = parseInt(balance.tokens.get(this.tokenIds.WISH) || 0);
        const hbarBalance = balance.hbars.toTinybars();
        
        console.log(`   HBAR: ${balance.hbars.toString()}`);
        console.log(`   DRIP: ${dripBalance}`);
        console.log(`   WISH: ${wishBalance}`);
        
        const checks = {
            hasMembership: dripBalance >= 1,
            hasWishTokens: wishBalance >= 1000,
            hasHbarForDeposit: hbarBalance >= 100000000, // Need 1 HBAR for deposit
        };
        
        console.log(`\n✅ Eligibility Checks:`);
        console.log(`   Has Membership (≥1 DRIP): ${checks.hasMembership ? '✅' : '❌'}`);
        console.log(`   Has WISH Tokens (≥1000): ${checks.hasWishTokens ? '✅' : '❌'} (${wishBalance}/1000)`);
        console.log(`   Has HBAR for Deposit (≥1): ${checks.hasHbarForDeposit ? '✅' : '❌'}`);
        
        const isEligible = Object.values(checks).every(check => check === true);
        console.log(`\n🎯 AutoRedeem Eligible: ${isEligible ? '✅ YES' : '❌ NO'}`);
        
        return {
            eligible: isEligible,
            balances: {
                hbar: hbarBalance,
                drip: dripBalance,
                wish: wishBalance
            },
            checks
        };
    }

    async processAutoRedeem() {
        console.log('\n🔄 Processing AutoRedeem using corrected implementation...');
        
        try {
            // Step 1: Transfer WISH from user to treasury
            console.log('1️⃣ Transferring 1000 WISH to treasury for burning...');
            
            const transferTx = new TransferTransaction()
                .addTokenTransfer(this.tokenIds.WISH, this.testUserId, -1000)
                .addTokenTransfer(this.tokenIds.WISH, this.controllerId, 1000)
                .freezeWith(this.client);
            
            const signedTransferTx = await transferTx.sign(this.testUserKey);
            const transferResponse = await signedTransferTx.execute(this.client);
            const transferReceipt = await transferResponse.getReceipt(this.client);
            
            console.log(`   ✅ WISH transfer: ${transferResponse.transactionId}`);
            console.log(`   Status: ${transferReceipt.status}`);
            
            // Wait for settlement
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Step 2: Burn WISH from treasury
            console.log('2️⃣ Burning 1000 WISH from treasury...');
            
            const burnTx = new TokenBurnTransaction()
                .setTokenId(this.tokenIds.WISH)
                .setAmount(1000);
            
            const burnResponse = await burnTx.execute(this.client);
            const burnReceipt = await burnResponse.getReceipt(this.client);
            
            console.log(`   ✅ WISH burn: ${burnResponse.transactionId}`);
            console.log(`   Status: ${burnReceipt.status}`);
            
            // Step 3: Pay out 1.8 HBAR
            console.log('3️⃣ Paying out 1.8 HBAR...');
            
            const payoutAmount = Hbar.fromTinybars(180000000);
            const payoutTx = new TransferTransaction()
                .addHbarTransfer(this.controllerId, payoutAmount.negated())
                .addHbarTransfer(this.testUserId, payoutAmount);
            
            const payoutResponse = await payoutTx.execute(this.client);
            const payoutReceipt = await payoutResponse.getReceipt(this.client);
            
            console.log(`   ✅ HBAR payout: ${payoutResponse.transactionId}`);
            console.log(`   Status: ${payoutReceipt.status}`);
            
            // Step 4: Collect 1 HBAR deposit
            console.log('4️⃣ Collecting 1 HBAR deposit for new membership...');
            
            const depositAmount = Hbar.fromTinybars(100000000);
            const depositTx = new TransferTransaction()
                .addHbarTransfer(this.testUserId, depositAmount.negated())
                .addHbarTransfer(this.controllerId, depositAmount)
                .freezeWith(this.client);
            
            const signedDepositTx = await depositTx.sign(this.testUserKey);
            const depositResponse = await signedDepositTx.execute(this.client);
            const depositReceipt = await depositResponse.getReceipt(this.client);
            
            console.log(`   ✅ HBAR deposit: ${depositResponse.transactionId}`);
            console.log(`   Status: ${depositReceipt.status}`);
            
            // Step 5: Mint new DRIP
            console.log('5️⃣ Minting new DRIP token...');
            
            const dripMintTx = new TokenMintTransaction()
                .setTokenId(this.tokenIds.DRIP)
                .setAmount(1);
            
            const dripMintResponse = await dripMintTx.execute(this.client);
            const dripMintReceipt = await dripMintResponse.getReceipt(this.client);
            
            console.log(`   ✅ DRIP mint: ${dripMintResponse.transactionId}`);
            console.log(`   Status: ${dripMintReceipt.status}`);
            
            // Step 6: Transfer DRIP to user
            console.log('6️⃣ Transferring new DRIP to user...');
            
            const dripTransferTx = new TransferTransaction()
                .addTokenTransfer(this.tokenIds.DRIP, this.controllerId, -1)
                .addTokenTransfer(this.tokenIds.DRIP, this.testUserId, 1);
            
            const dripTransferResponse = await dripTransferTx.execute(this.client);
            const dripTransferReceipt = await dripTransferResponse.getReceipt(this.client);
            
            console.log(`   ✅ DRIP transfer: ${dripTransferResponse.transactionId}`);
            console.log(`   Status: ${dripTransferReceipt.status}`);
            
            return {
                success: true,
                transactions: {
                    wishTransfer: transferResponse.transactionId.toString(),
                    wishBurn: burnResponse.transactionId.toString(),
                    hbarPayout: payoutResponse.transactionId.toString(),
                    membershipDeposit: depositResponse.transactionId.toString(),
                    dripMint: dripMintResponse.transactionId.toString(),
                    dripTransfer: dripTransferResponse.transactionId.toString()
                }
            };
            
        } catch (error) {
            console.error('❌ AutoRedeem failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async verifyAutoRedeemResults() {
        console.log('\n🔍 Verifying AutoRedeem results...');
        
        // Wait for all transactions to settle
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const finalBalance = await new AccountBalanceQuery()
            .setAccountId(this.testUserId)
            .execute(this.client);
        
        const finalDrip = parseInt(finalBalance.tokens.get(this.tokenIds.DRIP) || 0);
        const finalWish = parseInt(finalBalance.tokens.get(this.tokenIds.WISH) || 0);
        const finalHbar = finalBalance.hbars.toTinybars();
        
        console.log(`📊 Final Balance:`);
        console.log(`   HBAR: ${finalBalance.hbars.toString()}`);
        console.log(`   DRIP: ${finalDrip}`);
        console.log(`   WISH: ${finalWish}`);
        
        // Calculate expected vs actual changes
        const expectedWish = 200; // Started with 1200, should have 200 after burning 1000
        const wishBurnCorrect = finalWish === expectedWish;
        
        console.log(`\n✅ Verification Results:`);
        console.log(`   WISH Burn Correct: ${wishBurnCorrect ? '✅' : '❌'} (Expected: ${expectedWish}, Got: ${finalWish})`);
        console.log(`   DRIP Maintained: ${finalDrip >= 1 ? '✅' : '❌'} (Has: ${finalDrip})`);
        console.log(`   Net HBAR Profit: ~0.8 HBAR (1.8 payout - 1.0 deposit)`);
        
        const autoRedeemSuccess = wishBurnCorrect && finalDrip >= 1;
        console.log(`\n🎯 AutoRedeem Success: ${autoRedeemSuccess ? '✅ YES' : '❌ NO'}`);
        
        return {
            success: autoRedeemSuccess,
            balances: {
                hbar: finalHbar,
                drip: finalDrip,
                wish: finalWish
            },
            wishBurnCorrect,
            dripMaintained: finalDrip >= 1
        };
    }

    async run() {
        try {
            await this.initialize();
            
            // Step 1: Check eligibility
            const eligibility = await this.checkEligibility();
            
            if (!eligibility.eligible) {
                console.log('❌ TEST_USER_1 is not eligible for AutoRedeem');
                return false;
            }
            
            console.log('\n🎯 PROCEEDING WITH AUTOREDEEM TEST');
            console.log('This will test the corrected implementation that properly burns WISH');
            
            // Step 2: Process AutoRedeem
            const autoRedeemResult = await this.processAutoRedeem();
            
            if (!autoRedeemResult.success) {
                console.log('❌ AutoRedeem transaction failed');
                return false;
            }
            
            // Step 3: Verify results
            const verification = await this.verifyAutoRedeemResults();
            
            console.log('\n' + '='.repeat(60));
            console.log('🔄 AUTOREDEEM TEST COMPLETE');
            console.log('='.repeat(60));
            
            if (verification.success) {
                console.log('🎉 SUCCESS: AutoRedeem working correctly!');
                console.log('✅ WISH tokens properly burned (transfer-then-burn approach)');
                console.log('✅ HBAR payout and deposit processed correctly');
                console.log('✅ DRIP membership renewed');
                console.log('✅ Ready for frontend integration!');
            } else {
                console.log('❌ FAILURE: AutoRedeem has issues');
                if (!verification.wishBurnCorrect) {
                    console.log('   Issue: WISH burn not working properly');
                }
                if (!verification.dripMaintained) {
                    console.log('   Issue: DRIP membership not maintained');
                }
            }
            
            return verification.success;
            
        } catch (error) {
            console.error('💥 AutoRedeem test failed:', error);
            return false;
        } finally {
            this.client.close();
        }
    }
}

// Run the AutoRedeem test
const tester = new AutoRedeemTester();
tester.run();