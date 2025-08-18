/**
 * Unfreeze and Burn Controller DRIP Tokens
 * Unfreeze DRIP for Controller, then burn all DRIP tokens
 */

import { 
    Client, 
    TokenBurnTransaction,
    TokenUnfreezeTransaction,
    AccountBalanceQuery,
    PrivateKey,
    AccountId
} from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

class UnfreezeAndBurnControllerDrip {
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
        console.log('🔓 Initializing Unfreeze and Burn Controller DRIP...');
        this.client.setOperator(this.controllerId, this.controllerKey);
        console.log('✅ Client initialized');
    }

    async unfreezeControllerForDrip() {
        console.log('\n🔓 Unfreezing Controller account for DRIP token...');
        
        try {
            const unfreezeTx = new TokenUnfreezeTransaction()
                .setTokenId(this.tokenIds.DRIP)
                .setAccountId(this.controllerId);
            
            const unfreezeResponse = await unfreezeTx.execute(this.client);
            const unfreezeReceipt = await unfreezeResponse.getReceipt(this.client);
            
            console.log(`   ✅ Unfreeze successful: ${unfreezeResponse.transactionId}`);
            console.log(`   Status: ${unfreezeReceipt.status}`);
            
            return {
                success: true,
                transactionId: unfreezeResponse.transactionId.toString()
            };
            
        } catch (error) {
            if (error.message.includes('ACCOUNT_NOT_FROZEN')) {
                console.log('   ℹ️ Controller already unfrozen for DRIP');
                return { success: true, reason: 'already_unfrozen' };
            } else {
                console.error(`   ❌ Unfreeze failed:`, error.message);
                return { success: false, error: error.message };
            }
        }
    }

    async checkControllerDripBalance() {
        console.log('\n📊 Checking Controller DRIP balance...');
        
        const balance = await new AccountBalanceQuery()
            .setAccountId(this.controllerId)
            .execute(this.client);
        
        const dripBalance = parseInt(balance.tokens.get(this.tokenIds.DRIP) || 0);
        console.log(`   DRIP tokens: ${dripBalance}`);
        
        return dripBalance;
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

    async verifyFinalState() {
        console.log('\n🔍 Verifying final Controller state...');
        
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
        console.log(`   WISH: ${finalWish} tokens ✅ (treasury function)`);
        console.log(`   DROP: ${(finalDrop / 100000000).toFixed(8)} tokens ${finalDrop === 0 ? '✅' : '❌'}`);
        
        const isClean = finalDrip === 0 && finalDrop === 0;
        
        console.log(`\n🎯 Controller Clean State: ${isClean ? '✅ CLEAN' : '❌ NEEDS ATTENTION'}`);
        
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
            
            // Step 1: Unfreeze Controller for DRIP
            const unfreezeResult = await this.unfreezeControllerForDrip();
            
            if (!unfreezeResult.success) {
                throw new Error(`Failed to unfreeze Controller: ${unfreezeResult.error}`);
            }
            
            // Step 2: Check current DRIP balance
            const dripBalance = await this.checkControllerDripBalance();
            
            // Step 3: Burn all DRIP tokens
            const burnResult = await this.burnControllerDrip(dripBalance);
            
            // Step 4: Verify final state
            const verificationResult = await this.verifyFinalState();
            
            console.log('\n' + '='.repeat(80));
            console.log('🔥 CONTROLLER DRIP CLEANUP COMPLETE');
            console.log('='.repeat(80));
            
            console.log('\n📊 OPERATION SUMMARY:');
            console.log(`   Unfreeze: ${unfreezeResult.success ? '✅ Success' : '❌ Failed'}`);
            
            if (burnResult.reason === 'no_tokens') {
                console.log('   DRIP Burn: No tokens to burn ✅');
            } else {
                console.log(`   DRIP Burn: ${burnResult.success ? '✅ Success' : '❌ Failed'} (${burnResult.amount} tokens)`);
                if (burnResult.transactionId) {
                    console.log(`   Transaction: ${burnResult.transactionId}`);
                }
            }
            
            console.log(`\n🎯 FINAL RESULT: ${verificationResult.isClean ? '✅ CONTROLLER CLEAN' : '❌ ISSUES REMAIN'}`);
            
            if (verificationResult.isClean) {
                console.log('\n🎉 SUCCESS! Controller is now properly configured:');
                console.log('   ✅ No membership tokens (DRIP)');
                console.log('   ✅ No donation recognition tokens (DROP)');
                console.log('   ✅ Treasury function only');
            }
            
            return {
                success: verificationResult.isClean,
                unfreezeResult,
                burnResult,
                finalState: verificationResult.finalTokens
            };
            
        } catch (error) {
            console.error('❌ Controller DRIP cleanup failed:', error);
            throw error;
        } finally {
            this.client.close();
        }
    }
}

// Execute the Controller DRIP cleanup
const cleanup = new UnfreezeAndBurnControllerDrip();
cleanup.run();