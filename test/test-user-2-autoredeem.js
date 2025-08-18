/**
 * Test Fixed AutoRedeem with TEST_USER_2
 * Verify the corrected implementation works consistently
 */

import { 
    Client, 
    TokenBurnTransaction,
    TokenMintTransaction,
    TransferTransaction,
    AccountBalanceQuery,
    PrivateKey,
    AccountId,
    Hbar
} from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

class TestUser2AutoRedeem {
    constructor() {
        this.client = Client.forTestnet();
        this.treasuryId = AccountId.fromString(process.env.CONTROLLER_ACCOUNT_ID);
        this.treasuryKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
        
        this.tokenIds = {
            DRIP: process.env.DRIP_TOKEN_ID,
            WISH: process.env.WISH_TOKEN_ID,
            DROP: process.env.DROP_TOKEN_ID
        };
    }

    async initialize() {
        console.log('🔧 Initializing TEST_USER_2 AutoRedeem Test...');
        this.client.setOperator(this.treasuryId, this.treasuryKey);
        console.log('✅ Client initialized');
    }

    async processCorrectAutoRedeem(userAccountId, userPrivateKey, memberName) {
        try {
            const accountId = AccountId.fromString(userAccountId);
            const accountKey = PrivateKey.fromString(userPrivateKey);
            
            console.log(`\n🔄 Processing CORRECTED AutoRedeem for ${memberName}...`);
            
            // Step 1: Check eligibility and record starting balances
            console.log('1️⃣ Recording starting balances...');
            const userBalance = await new AccountBalanceQuery()
                .setAccountId(accountId)
                .execute(this.client);
            
            const userWish = parseInt(userBalance.tokens.get(this.tokenIds.WISH) || 0);
            const userDrip = parseInt(userBalance.tokens.get(this.tokenIds.DRIP) || 0);
            const userHbar = userBalance.hbars.toTinybars();
            
            console.log(`   Starting WISH: ${userWish}`);
            console.log(`   Starting DRIP: ${userDrip}`);
            console.log(`   Starting HBAR: ${userHbar / 100000000} ℏ`);
            
            if (userWish < 1000) {
                throw new Error(`Insufficient WISH for AutoRedeem: ${userWish} < 1000`);
            }
            
            // Step 2: Transfer WISH from user to treasury
            console.log('2️⃣ Transferring 1000 WISH to treasury for burning...');
            
            const transferTx = new TransferTransaction()
                .addTokenTransfer(this.tokenIds.WISH, accountId, -1000)
                .addTokenTransfer(this.tokenIds.WISH, this.treasuryId, 1000)
                .freezeWith(this.client);
            
            const signedTransferTx = await transferTx.sign(accountKey);
            const transferResponse = await signedTransferTx.execute(this.client);
            const transferReceipt = await transferResponse.getReceipt(this.client);
            
            console.log(`   ✅ WISH transfer: ${transferResponse.transactionId}`);
            
            // Step 3: Burn WISH from treasury
            console.log('3️⃣ Burning 1000 WISH from treasury...');
            
            const burnTx = new TokenBurnTransaction()
                .setTokenId(this.tokenIds.WISH)
                .setAmount(1000);
            
            const burnResponse = await burnTx.execute(this.client);
            const burnReceipt = await burnResponse.getReceipt(this.client);
            
            console.log(`   ✅ WISH burn: ${burnResponse.transactionId}`);
            
            // Step 4: Pay out 1.8 HBAR
            console.log('4️⃣ Paying out 1.8 HBAR...');
            
            const payoutAmount = Hbar.fromTinybars(180000000);
            const payoutTx = new TransferTransaction()
                .addHbarTransfer(this.treasuryId, payoutAmount.negated())
                .addHbarTransfer(accountId, payoutAmount);
            
            const payoutResponse = await payoutTx.execute(this.client);
            
            console.log(`   ✅ HBAR payout: ${payoutResponse.transactionId}`);
            
            // Step 5: Collect 1 HBAR deposit
            console.log('5️⃣ Collecting 1 HBAR deposit...');
            
            const depositAmount = Hbar.fromTinybars(100000000);
            const depositTx = new TransferTransaction()
                .addHbarTransfer(accountId, depositAmount.negated())
                .addHbarTransfer(this.treasuryId, depositAmount)
                .freezeWith(this.client);
            
            const signedDepositTx = await depositTx.sign(accountKey);
            const depositResponse = await signedDepositTx.execute(this.client);
            
            console.log(`   ✅ HBAR deposit: ${depositResponse.transactionId}`);
            
            // Step 6: Mint and transfer new DRIP
            console.log('6️⃣ Minting and transferring new DRIP...');
            
            const dripMintTx = new TokenMintTransaction()
                .setTokenId(this.tokenIds.DRIP)
                .setAmount(1);
            
            const dripMintResponse = await dripMintTx.execute(this.client);
            
            const dripTransferTx = new TransferTransaction()
                .addTokenTransfer(this.tokenIds.DRIP, this.treasuryId, -1)
                .addTokenTransfer(this.tokenIds.DRIP, accountId, 1);
            
            const dripTransferResponse = await dripTransferTx.execute(this.client);
            
            console.log(`   ✅ DRIP mint: ${dripMintResponse.transactionId}`);
            console.log(`   ✅ DRIP transfer: ${dripTransferResponse.transactionId}`);
            
            // Step 7: Verify final state
            console.log('7️⃣ Verifying final balances...');
            
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            const finalBalance = await new AccountBalanceQuery()
                .setAccountId(accountId)
                .execute(this.client);
            
            const finalWish = parseInt(finalBalance.tokens.get(this.tokenIds.WISH) || 0);
            const finalDrip = parseInt(finalBalance.tokens.get(this.tokenIds.DRIP) || 0);
            const finalHbar = finalBalance.hbars.toTinybars();
            
            const wishReduction = userWish - finalWish;
            const hbarChange = finalHbar - userHbar;
            const expectedHbarProfit = 80000000; // 0.8 HBAR net
            
            console.log(`   📊 WISH: ${userWish} → ${finalWish} (reduced by ${wishReduction})`);
            console.log(`   📊 DRIP: ${userDrip} → ${finalDrip} (maintained)`);
            console.log(`   📊 HBAR: ${userHbar / 100000000} → ${finalHbar / 100000000} ℏ (change: ${hbarChange / 100000000} ℏ)`);
            
            // Verification
            const wishBurnSuccessful = wishReduction === 1000;
            const dripMaintained = finalDrip === userDrip;
            const hbarProfitCorrect = Math.abs(hbarChange - expectedHbarProfit) < 10000000; // Within 0.1 HBAR tolerance
            
            console.log(`   ✅ WISH burn verification: ${wishBurnSuccessful ? 'PASS' : 'FAIL'}`);
            console.log(`   ✅ DRIP maintenance: ${dripMaintained ? 'PASS' : 'FAIL'}`);
            console.log(`   ✅ HBAR profit verification: ${hbarProfitCorrect ? 'PASS' : 'FAIL'} (${hbarChange / 100000000} ℏ)`);
            
            const allValid = wishBurnSuccessful && dripMaintained && hbarProfitCorrect;
            
            if (allValid) {
                console.log('🎉 AutoRedeem FULLY VERIFIED - all checks passed!');
            } else {
                console.log('❌ AutoRedeem verification failed');
            }
            
            return {
                success: allValid,
                memberName,
                details: {
                    wishBurned: wishReduction,
                    hbarProfit: hbarChange,
                    dripMaintained: finalDrip === userDrip,
                    allChecksPass: allValid
                }
            };
            
        } catch (error) {
            console.error(`❌ AutoRedeem failed for ${memberName}:`, error.message);
            throw error;
        }
    }

    async run() {
        try {
            await this.initialize();
            
            const result = await this.processCorrectAutoRedeem(
                process.env.TEST_USER_2_ACCOUNT_ID,
                process.env.TEST_USER_2_PRIVATE_KEY,
                'TEST_USER_2'
            );
            
            console.log('\n🎯 FINAL VERIFICATION RESULT:');
            console.log(`✅ Success: ${result.success}`);
            console.log(`🔥 WISH Burned: ${result.details.wishBurned}`);
            console.log(`💰 HBAR Profit: ${result.details.hbarProfit / 100000000} ℏ`);
            console.log(`🎪 DRIP Maintained: ${result.details.dripMaintained}`);
            
            if (result.success) {
                console.log('\n🎉 CORRECTED AUTOREDEEM IMPLEMENTATION VERIFIED!');
                console.log('The transfer-then-burn approach successfully fixes the token burn issue.');
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Test failed:', error);
            throw error;
        } finally {
            this.client.close();
        }
    }
}

const tester = new TestUser2AutoRedeem();
tester.run();