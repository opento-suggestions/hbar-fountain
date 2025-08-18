/**
 * Burn Controller DRIP and DROP Tokens
 * Controller should never hold membership or donation tokens long-term
 */

import { 
    Client, 
    TokenBurnTransaction,
    AccountBalanceQuery,
    PrivateKey,
    AccountId
} from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

class ControllerTokenBurner {
    constructor() {
        this.client = Client.forTestnet();
        this.controllerId = AccountId.fromString(process.env.CONTROLLER_ACCOUNT_ID);
        this.controllerKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
        
        this.tokenIds = {
            DRIP: process.env.DRIP_TOKEN_ID,
            WISH: process.env.WISH_TOKEN_ID,
            DROP: process.env.DROP_TOKEN_ID
        };
    }

    async initialize() {
        console.log('🔥 Initializing Controller Token Burner...');
        this.client.setOperator(this.controllerId, this.controllerKey);
        console.log('✅ Client initialized');
        console.log('\n🎯 OBJECTIVE: Burn all DRIP and DROP tokens from Controller');
        console.log('   - DRIP tokens represent membership (users only)');
        console.log('   - DROP tokens represent donation recognition (users only)');
        console.log('   - Controller should only manage protocol treasury, not hold these tokens');
    }

    async checkCurrentControllerTokens() {
        console.log('\n📊 Checking current Controller token holdings...');
        
        const balance = await new AccountBalanceQuery()
            .setAccountId(this.controllerId)
            .execute(this.client);
        
        const dripBalance = parseInt(balance.tokens.get(this.tokenIds.DRIP) || 0);
        const wishBalance = parseInt(balance.tokens.get(this.tokenIds.WISH) || 0);
        const dropBalance = parseInt(balance.tokens.get(this.tokenIds.DROP) || 0);
        
        console.log(`   DRIP: ${dripBalance} tokens`);
        console.log(`   WISH: ${wishBalance} tokens`);
        console.log(`   DROP: ${(dropBalance / 100000000).toFixed(8)} tokens`);
        
        return {
            drip: dripBalance,
            wish: wishBalance,
            drop: dropBalance
        };
    }

    async burnControllerDrip(amount) {
        if (amount === 0) {
            console.log('\n✅ No DRIP tokens to burn');
            return { success: true, amount: 0, reason: 'no_tokens' };
        }
        
        try {
            console.log(`\n🔥 Burning ${amount} DRIP tokens from Controller...`);
            console.log('   💡 Reason: Controller should not hold membership tokens');
            
            const dripBurnTx = new TokenBurnTransaction()
                .setTokenId(this.tokenIds.DRIP)
                .setAmount(amount);
            
            const dripBurnResponse = await dripBurnTx.execute(this.client);
            const dripBurnReceipt = await dripBurnResponse.getReceipt(this.client);
            
            console.log(`   ✅ DRIP burn successful: ${dripBurnResponse.transactionId}`);
            console.log(`   Status: ${dripBurnReceipt.status}`);
            
            return {
                success: true,
                amount: amount,
                transactionId: dripBurnResponse.transactionId.toString()
            };
            
        } catch (error) {
            console.error(`   ❌ DRIP burn failed:`, error.message);
            return {
                success: false,
                amount: amount,
                error: error.message
            };
        }
    }

    async burnControllerDrop(amount) {
        if (amount === 0) {
            console.log('\n✅ No DROP tokens to burn');
            return { success: true, amount: 0, reason: 'no_tokens' };
        }
        
        try {
            console.log(`\n🔥 Burning ${(amount / 100000000).toFixed(8)} DROP tokens from Controller...`);
            console.log('   💡 Reason: Controller should not hold donation recognition tokens');
            
            const dropBurnTx = new TokenBurnTransaction()
                .setTokenId(this.tokenIds.DROP)
                .setAmount(amount);
            
            const dropBurnResponse = await dropBurnTx.execute(this.client);
            const dropBurnReceipt = await dropBurnResponse.getReceipt(this.client);
            
            console.log(`   ✅ DROP burn successful: ${dropBurnResponse.transactionId}`);
            console.log(`   Status: ${dropBurnReceipt.status}`);
            
            return {
                success: true,
                amount: amount,
                transactionId: dropBurnResponse.transactionId.toString()
            };
            
        } catch (error) {
            console.error(`   ❌ DROP burn failed:`, error.message);
            return {
                success: false,
                amount: amount,
                error: error.message
            };
        }
    }

    async verifyCleanControllerState() {
        console.log('\n🔍 Verifying clean Controller state...');
        
        // Wait for settlement
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const finalBalance = await new AccountBalanceQuery()
            .setAccountId(this.controllerId)
            .execute(this.client);
        
        const finalDrip = parseInt(finalBalance.tokens.get(this.tokenIds.DRIP) || 0);
        const finalWish = parseInt(finalBalance.tokens.get(this.tokenIds.WISH) || 0);
        const finalDrop = parseInt(finalBalance.tokens.get(this.tokenIds.DROP) || 0);
        
        console.log('\n📋 FINAL CONTROLLER TOKEN STATE:');
        console.log(`   DRIP: ${finalDrip} tokens ${finalDrip === 0 ? '✅' : '❌'}`);
        console.log(`   WISH: ${finalWish} tokens ${finalWish === 0 ? '✅' : '⚠️ (acceptable for treasury)'}`);
        console.log(`   DROP: ${(finalDrop / 100000000).toFixed(8)} tokens ${finalDrop === 0 ? '✅' : '❌'}`);
        
        const isClean = finalDrip === 0 && finalDrop === 0;
        
        console.log(`\n🎯 Controller Clean State: ${isClean ? '✅ CLEAN' : '❌ NEEDS ATTENTION'}`);
        
        if (isClean) {
            console.log('✅ Controller properly configured:');
            console.log('   - No membership tokens (DRIP)');
            console.log('   - No donation recognition tokens (DROP)');
            console.log('   - Treasury function only');
        }
        
        return {
            isClean,
            finalTokens: {
                drip: finalDrip,
                wish: finalWish,
                drop: finalDrop
            }
        };
    }

    async run() {
        try {
            await this.initialize();
            
            // Step 1: Check current holdings
            const currentTokens = await this.checkCurrentControllerTokens();
            
            // Step 2: Burn DRIP tokens
            const dripBurnResult = await this.burnControllerDrip(currentTokens.drip);
            
            // Step 3: Burn DROP tokens  
            const dropBurnResult = await this.burnControllerDrop(currentTokens.drop);
            
            // Step 4: Verify clean state
            const verificationResult = await this.verifyCleanControllerState();
            
            console.log('\n' + '='.repeat(80));
            console.log('🔥 CONTROLLER TOKEN BURN COMPLETE');
            console.log('='.repeat(80));
            
            console.log('\n📊 BURN SUMMARY:');
            
            if (dripBurnResult.reason === 'no_tokens') {
                console.log('   DRIP: No tokens to burn ✅');
            } else {
                console.log(`   DRIP: ${dripBurnResult.success ? '✅ Burned' : '❌ Failed'} ${dripBurnResult.amount} tokens`);
                if (dripBurnResult.transactionId) {
                    console.log(`         Transaction: ${dripBurnResult.transactionId}`);
                }
            }
            
            if (dropBurnResult.reason === 'no_tokens') {
                console.log('   DROP: No tokens to burn ✅');
            } else {
                console.log(`   DROP: ${dropBurnResult.success ? '✅ Burned' : '❌ Failed'} ${(dropBurnResult.amount / 100000000).toFixed(8)} tokens`);
                if (dropBurnResult.transactionId) {
                    console.log(`         Transaction: ${dropBurnResult.transactionId}`);
                }
            }
            
            console.log(`\n🎯 FINAL STATUS: ${verificationResult.isClean ? '✅ CONTROLLER CLEAN' : '❌ ISSUES REMAIN'}`);
            
            if (verificationResult.isClean) {
                console.log('\n🎉 SUCCESS! Controller is now properly configured:');
                console.log('   ✅ Treasury function only');
                console.log('   ✅ No membership or donation tokens');
                console.log('   ✅ Ready for protocol operations');
            }
            
            return {
                success: verificationResult.isClean,
                dripBurn: dripBurnResult,
                dropBurn: dropBurnResult,
                finalState: verificationResult.finalTokens
            };
            
        } catch (error) {
            console.error('❌ Controller token burn failed:', error);
            throw error;
        } finally {
            this.client.close();
        }
    }
}

// Execute the Controller token burn
const burner = new ControllerTokenBurner();
burner.run();