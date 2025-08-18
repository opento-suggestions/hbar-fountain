/**
 * Test WISH Issuance for TEST_USER_1
 * Since TEST_USER_1 has 0 WISH but is an active member, let's issue some WISH
 * so we can test the AutoRedeem functionality
 */

import { 
    Client, 
    TokenMintTransaction,
    TokenUnfreezeTransaction,
    TransferTransaction,
    AccountBalanceQuery,
    AccountId,
    PrivateKey
} from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

class WishIssuanceTester {
    constructor() {
        this.client = Client.forTestnet();
        this.controllerId = AccountId.fromString(process.env.CONTROLLER_ACCOUNT_ID);
        this.controllerKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
        
        this.testUserId = AccountId.fromString(process.env.TEST_USER_1_ACCOUNT_ID);
        
        this.tokenIds = {
            DRIP: process.env.DRIP_TOKEN_ID,
            WISH: process.env.WISH_TOKEN_ID,
            DROP: process.env.DROP_TOKEN_ID
        };
    }

    async initialize() {
        console.log('🪙 Initializing WISH Issuance Tester...');
        this.client.setOperator(this.controllerId, this.controllerKey);
        console.log(`✅ Will issue WISH to TEST_USER_1: ${this.testUserId}`);
    }

    async checkCurrentBalance() {
        console.log('\n📊 Checking TEST_USER_1 current balance...');
        
        const balance = await new AccountBalanceQuery()
            .setAccountId(this.testUserId)
            .execute(this.client);
        
        const dripBalance = parseInt(balance.tokens.get(this.tokenIds.DRIP) || 0);
        const wishBalance = parseInt(balance.tokens.get(this.tokenIds.WISH) || 0);
        const dropBalance = parseInt(balance.tokens.get(this.tokenIds.DROP) || 0);
        const hbarBalance = balance.hbars.toTinybars();
        
        console.log(`   HBAR: ${balance.hbars.toString()}`);
        console.log(`   DRIP: ${dripBalance}`);
        console.log(`   WISH: ${wishBalance}`);
        console.log(`   DROP: ${(dropBalance / 100000000).toFixed(8)}`);
        
        return {
            hbar: hbarBalance,
            drip: dripBalance,
            wish: wishBalance,
            drop: dropBalance
        };
    }

    async issueWishTokens(amount) {
        console.log(`\n🏭 Issuing ${amount} WISH tokens to TEST_USER_1...`);
        
        try {
            // Step 1: Mint WISH tokens to treasury
            console.log('1️⃣ Minting WISH tokens to treasury...');
            
            const mintTx = new TokenMintTransaction()
                .setTokenId(this.tokenIds.WISH)
                .setAmount(amount);
            
            const mintResponse = await mintTx.execute(this.client);
            const mintReceipt = await mintResponse.getReceipt(this.client);
            
            console.log(`   ✅ Mint successful: ${mintResponse.transactionId}`);
            
            // Step 2: Unfreeze TEST_USER_1 for WISH token (if needed)
            console.log('2️⃣ Ensuring account is unfrozen for WISH...');
            
            try {
                const unfreezeTx = new TokenUnfreezeTransaction()
                    .setTokenId(this.tokenIds.WISH)
                    .setAccountId(this.testUserId);
                
                const unfreezeResponse = await unfreezeTx.execute(this.client);
                console.log(`   ✅ Unfreeze successful: ${unfreezeResponse.transactionId}`);
            } catch (unfreezeError) {
                console.log('   ℹ️ Account already unfrozen or unfreeze not needed');
            }
            
            // Step 3: Transfer WISH from treasury to user
            console.log('3️⃣ Transferring WISH from treasury to user...');
            
            const transferTx = new TransferTransaction()
                .addTokenTransfer(this.tokenIds.WISH, this.controllerId, -amount)
                .addTokenTransfer(this.tokenIds.WISH, this.testUserId, amount);
            
            const transferResponse = await transferTx.execute(this.client);
            const transferReceipt = await transferResponse.getReceipt(this.client);
            
            console.log(`   ✅ Transfer successful: ${transferResponse.transactionId}`);
            
            return {
                success: true,
                transactions: {
                    mint: mintResponse.transactionId.toString(),
                    transfer: transferResponse.transactionId.toString()
                }
            };
            
        } catch (error) {
            console.error('❌ WISH issuance failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async simulateDailyWishAccumulation(days) {
        console.log(`\n📅 Simulating ${days} days of WISH accumulation...`);
        
        // TEST_USER_1 has 1 DRIP (member) but no DROP (no bonus)
        // Daily rate: 50 WISH per day
        const dailyRate = 50;
        const totalWish = dailyRate * days;
        
        console.log(`   Daily Rate: ${dailyRate} WISH/day`);
        console.log(`   Days: ${days}`);
        console.log(`   Total WISH to issue: ${totalWish}`);
        
        const result = await this.issueWishTokens(totalWish);
        
        if (result.success) {
            console.log(`✅ Successfully simulated ${days} days of WISH accumulation`);
            console.log(`💰 TEST_USER_1 should now have ${totalWish} WISH tokens`);
        }
        
        return result;
    }

    async verifyFinalBalance() {
        console.log('\n🔍 Verifying final balance after issuance...');
        
        // Wait for settlement
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const finalBalance = await this.checkCurrentBalance();
        
        // Check if user can now AutoRedeem
        const canAutoRedeem = finalBalance.drip >= 1 && finalBalance.wish >= 1000;
        
        console.log(`\n🎯 AutoRedeem Status:`);
        console.log(`   Has Membership (≥1 DRIP): ${finalBalance.drip >= 1 ? '✅' : '❌'}`);
        console.log(`   Has WISH (≥1000): ${finalBalance.wish >= 1000 ? '✅' : '❌'}`);
        console.log(`   Can AutoRedeem: ${canAutoRedeem ? '✅ YES' : '❌ NO'}`);
        
        if (canAutoRedeem) {
            const daysUntilNext = Math.ceil((1000) / 50); // Next AutoRedeem cycle
            console.log(`   Next AutoRedeem: Available now!`);
            console.log(`   After AutoRedeem: ${finalBalance.wish - 1000} WISH remaining`);
            console.log(`   Days until next cycle: ~${daysUntilNext} days`);
        }
        
        return finalBalance;
    }

    async run() {
        try {
            await this.initialize();
            
            // Check current balance
            const initialBalance = await this.checkCurrentBalance();
            
            if (initialBalance.wish >= 1000) {
                console.log('✅ TEST_USER_1 already has enough WISH for AutoRedeem testing');
                return initialBalance;
            }
            
            // Calculate how much WISH needed for testing
            const wishNeeded = 1200; // Give extra for multiple tests
            const daysEquivalent = Math.ceil(wishNeeded / 50);
            
            console.log(`\n🎯 TESTING STRATEGY:`);
            console.log(`   Need: ${wishNeeded} WISH for comprehensive testing`);
            console.log(`   Equivalent to: ${daysEquivalent} days of accumulation`);
            
            // Issue the WISH tokens
            const result = await this.simulateDailyWishAccumulation(daysEquivalent);
            
            if (result.success) {
                // Verify the result
                const finalBalance = await this.verifyFinalBalance();
                
                console.log('\n🎉 WISH ISSUANCE TEST COMPLETE');
                console.log('✅ TEST_USER_1 is now ready for AutoRedeem testing');
                console.log('✅ Frontend can test all protocol functions');
                
                return finalBalance;
            } else {
                console.log('❌ WISH issuance failed - cannot proceed with AutoRedeem testing');
                return null;
            }
            
        } catch (error) {
            console.error('💥 WISH issuance test failed:', error);
            throw error;
        } finally {
            this.client.close();
        }
    }
}

// Run the WISH issuance test
const tester = new WishIssuanceTester();
tester.run();