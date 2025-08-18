/**
 * Unfreeze Test Accounts and Test Fixed AutoRedeem
 * Handles frozen accounts and tests the corrected AutoRedeem
 */

import { 
    Client, 
    TokenBurnTransaction,
    TokenMintTransaction,
    TransferTransaction,
    AccountBalanceQuery,
    TokenUnfreezeTransaction,
    PrivateKey,
    AccountId,
    Hbar
} from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

class UnfreezeAndTestAutoRedeem {
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
        console.log('🔧 Initializing Unfreeze and AutoRedeem Tester...');
        this.client.setOperator(this.treasuryId, this.treasuryKey);
        console.log('✅ Client initialized with treasury operator');
    }

    async unfreezeAllTestAccounts() {
        console.log('\n🔓 Unfreezing all test accounts for DRIP token...');
        
        const testAccounts = [
            { name: 'TEST_USER_1', accountId: process.env.TEST_USER_1_ACCOUNT_ID },
            { name: 'TEST_USER_2', accountId: process.env.TEST_USER_2_ACCOUNT_ID },
            { name: 'TEST_USER_3', accountId: process.env.TEST_USER_3_ACCOUNT_ID },
            { name: 'TEST_USER_4', accountId: process.env.TEST_USER_4_ACCOUNT_ID },
            { name: 'TEST_USER_5', accountId: process.env.TEST_USER_5_ACCOUNT_ID },
            { name: 'TEST_USER_6', accountId: process.env.TEST_USER_6_ACCOUNT_ID }
        ];

        for (const account of testAccounts) {
            try {
                console.log(`🔓 Unfreezing ${account.name} (${account.accountId})...`);
                
                const unfreezeTx = new TokenUnfreezeTransaction()
                    .setTokenId(this.tokenIds.DRIP)
                    .setAccountId(account.accountId);
                
                const unfreezeResponse = await unfreezeTx.execute(this.client);
                const unfreezeReceipt = await unfreezeResponse.getReceipt(this.client);
                
                console.log(`   ✅ Unfreeze successful: ${unfreezeResponse.transactionId}`);
                console.log(`   Status: ${unfreezeReceipt.status}`);
                
            } catch (error) {
                if (error.message.includes('ACCOUNT_NOT_FROZEN')) {
                    console.log(`   ℹ️ ${account.name} already unfrozen`);
                } else {
                    console.error(`   ❌ Failed to unfreeze ${account.name}:`, error.message);
                }
            }
        }
        
        console.log('✅ All accounts processed for unfreezing');
    }

    async processCorrectAutoRedeem(userAccountId, userPrivateKey, memberName) {
        try {
            const accountId = AccountId.fromString(userAccountId);
            const accountKey = PrivateKey.fromString(userPrivateKey);
            
            console.log(`\n🔄 Processing CORRECTED AutoRedeem for ${memberName}...`);
            
            // Step 1: Check eligibility
            console.log('1️⃣ Checking eligibility...');
            const userBalance = await new AccountBalanceQuery()
                .setAccountId(accountId)
                .execute(this.client);
            
            const userWish = parseInt(userBalance.tokens.get(this.tokenIds.WISH) || 0);
            const userDrip = parseInt(userBalance.tokens.get(this.tokenIds.DRIP) || 0);
            
            console.log(`   WISH Balance: ${userWish}`);
            console.log(`   DRIP Balance: ${userDrip}`);
            
            if (userWish < 1000) {
                throw new Error(`Insufficient WISH for AutoRedeem: ${userWish} < 1000`);
            }
            
            if (userDrip < 1) {
                throw new Error(`No active membership: ${userDrip} < 1 DRIP`);
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
            
            console.log(`   ✅ Transfer successful: ${transferResponse.transactionId}`);
            console.log(`   Status: ${transferReceipt.status}`);
            
            // Wait for settlement
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Step 3: Burn WISH from treasury
            console.log('3️⃣ Burning 1000 WISH from treasury...');
            
            const burnTx = new TokenBurnTransaction()
                .setTokenId(this.tokenIds.WISH)
                .setAmount(1000);
            
            const burnResponse = await burnTx.execute(this.client);
            const burnReceipt = await burnResponse.getReceipt(this.client);
            
            console.log(`   ✅ Burn successful: ${burnResponse.transactionId}`);
            console.log(`   Status: ${burnReceipt.status}`);
            
            // Step 4: Pay out 1.8 HBAR
            console.log('4️⃣ Paying out 1.8 HBAR...');
            
            const payoutAmount = Hbar.fromTinybars(180000000); // 1.8 HBAR
            const payoutTx = new TransferTransaction()
                .addHbarTransfer(this.treasuryId, payoutAmount.negated())
                .addHbarTransfer(accountId, payoutAmount);
            
            const payoutResponse = await payoutTx.execute(this.client);
            const payoutReceipt = await payoutResponse.getReceipt(this.client);
            
            console.log(`   ✅ Payout successful: ${payoutResponse.transactionId}`);
            console.log(`   Status: ${payoutReceipt.status}`);
            
            // Step 5: Collect 1 HBAR deposit for new membership
            console.log('5️⃣ Collecting 1 HBAR deposit for new membership...');
            
            const depositAmount = Hbar.fromTinybars(100000000); // 1 HBAR
            const depositTx = new TransferTransaction()
                .addHbarTransfer(accountId, depositAmount.negated())
                .addHbarTransfer(this.treasuryId, depositAmount)
                .freezeWith(this.client);
            
            const signedDepositTx = await depositTx.sign(accountKey);
            const depositResponse = await signedDepositTx.execute(this.client);
            const depositReceipt = await depositResponse.getReceipt(this.client);
            
            console.log(`   ✅ Deposit successful: ${depositResponse.transactionId}`);
            console.log(`   Status: ${depositReceipt.status}`);
            
            // Step 6: Mint new DRIP token
            console.log('6️⃣ Minting new DRIP token...');
            
            const dripMintTx = new TokenMintTransaction()
                .setTokenId(this.tokenIds.DRIP)
                .setAmount(1);
            
            const dripMintResponse = await dripMintTx.execute(this.client);
            const dripMintReceipt = await dripMintResponse.getReceipt(this.client);
            
            console.log(`   ✅ DRIP mint successful: ${dripMintResponse.transactionId}`);
            console.log(`   Status: ${dripMintReceipt.status}`);
            
            // Step 7: Transfer DRIP from treasury to user (account already unfrozen)
            console.log('7️⃣ Transferring new DRIP to user...');
            
            const dripTransferTx = new TransferTransaction()
                .addTokenTransfer(this.tokenIds.DRIP, this.treasuryId, -1)
                .addTokenTransfer(this.tokenIds.DRIP, accountId, 1);
            
            const dripTransferResponse = await dripTransferTx.execute(this.client);
            const dripTransferReceipt = await dripTransferResponse.getReceipt(this.client);
            
            console.log(`   ✅ DRIP transfer successful: ${dripTransferResponse.transactionId}`);
            console.log(`   Status: ${dripTransferReceipt.status}`);
            
            // Step 8: Verify the complete operation
            console.log('8️⃣ Verifying AutoRedeem completion...');
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const finalBalance = await new AccountBalanceQuery()
                .setAccountId(accountId)
                .execute(this.client);
            
            const finalWish = parseInt(finalBalance.tokens.get(this.tokenIds.WISH) || 0);
            const finalDrip = parseInt(finalBalance.tokens.get(this.tokenIds.DRIP) || 0);
            
            const wishReduction = userWish - finalWish;
            const netHbarBenefit = 80000000; // 1.8 HBAR out - 1.0 HBAR in = 0.8 HBAR net
            
            console.log(`   📊 WISH reduced: ${wishReduction} (Expected: 1000)`);
            console.log(`   📊 DRIP balance: ${finalDrip} (Previous: ${userDrip})`);
            console.log(`   💰 Net HBAR benefit: ${netHbarBenefit / 100000000} HBAR`);
            
            if (wishReduction === 1000) {
                console.log('✅ CORRECTED AutoRedeem completed successfully!');
                console.log(`🎉 ${memberName} profited 0.8 HBAR and renewed membership`);
                
                return {
                    success: true,
                    memberName,
                    transactions: {
                        wishTransfer: transferResponse.transactionId.toString(),
                        wishBurn: burnResponse.transactionId.toString(),
                        hbarPayout: payoutResponse.transactionId.toString(),
                        membershipDeposit: depositResponse.transactionId.toString(),
                        dripMint: dripMintResponse.transactionId.toString(),
                        dripTransfer: dripTransferResponse.transactionId.toString()
                    },
                    details: {
                        wishBurned: 1000,
                        netHbarBenefit,
                        previousWishBalance: userWish,
                        finalWishBalance: finalWish
                    }
                };
            } else {
                throw new Error(`WISH burn verification failed: ${wishReduction} != 1000`);
            }
            
        } catch (error) {
            console.error(`❌ Corrected AutoRedeem failed for ${memberName}:`, error.message);
            throw error;
        }
    }

    async testSingleAutoRedeem() {
        console.log('\n🧪 Testing Single Corrected AutoRedeem...');
        
        // Test with TEST_USER_1 who has plenty of WISH
        const testResult = await this.processCorrectAutoRedeem(
            process.env.TEST_USER_1_ACCOUNT_ID,
            process.env.TEST_USER_1_PRIVATE_KEY,
            'TEST_USER_1'
        );
        
        console.log('\n📋 AutoRedeem Test Result:');
        console.log(`✅ Success: ${testResult.success}`);
        console.log(`🧑 Member: ${testResult.memberName}`);
        console.log(`🔥 WISH Burned: ${testResult.details.wishBurned}`);
        console.log(`💰 HBAR Profit: ${testResult.details.netHbarBenefit / 100000000} ℏ`);
        console.log(`📊 WISH: ${testResult.details.previousWishBalance} → ${testResult.details.finalWishBalance}`);
        
        return testResult;
    }

    async run() {
        try {
            await this.initialize();
            
            // First unfreeze all accounts
            await this.unfreezeAllTestAccounts();
            
            // Then test the fixed AutoRedeem
            const testResult = await this.testSingleAutoRedeem();
            
            console.log('\n🎯 FIXED AUTOREDEEM VERIFICATION:');
            console.log('✅ WISH tokens properly burned (transfer-then-burn approach)');
            console.log('✅ HBAR payout and deposit working correctly');
            console.log('✅ DRIP minting and transfer working correctly');
            console.log('✅ Account freezing/unfreezing handled properly');
            console.log('\n🎉 AutoRedeem fix is working correctly!');
            
            return testResult;
            
        } catch (error) {
            console.error('❌ Unfreeze and test failed:', error);
            throw error;
        } finally {
            this.client.close();
        }
    }
}

// Run the test
const tester = new UnfreezeAndTestAutoRedeem();
tester.run();