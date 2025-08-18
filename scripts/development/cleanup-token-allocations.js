/**
 * Clean Up Token Allocations
 * Reset token distributions to clean testing state
 */

import { 
    Client, 
    TokenBurnTransaction,
    TransferTransaction,
    AccountBalanceQuery,
    PrivateKey,
    AccountId
} from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

class TokenAllocationCleanup {
    constructor() {
        this.client = Client.forTestnet();
        this.controllerId = AccountId.fromString(process.env.CONTROLLER_ACCOUNT_ID);
        this.controllerKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
        
        this.tokenIds = {
            DRIP: process.env.DRIP_TOKEN_ID,
            WISH: process.env.WISH_TOKEN_ID,
            DROP: process.env.DROP_TOKEN_ID
        };

        // All test accounts
        this.testAccounts = [
            { 
                name: 'TEST_USER_1', 
                accountId: process.env.TEST_USER_1_ACCOUNT_ID,
                privateKey: process.env.TEST_USER_1_PRIVATE_KEY
            },
            { 
                name: 'TEST_USER_2', 
                accountId: process.env.TEST_USER_2_ACCOUNT_ID,
                privateKey: process.env.TEST_USER_2_PRIVATE_KEY
            },
            { 
                name: 'TEST_USER_3', 
                accountId: process.env.TEST_USER_3_ACCOUNT_ID,
                privateKey: process.env.TEST_USER_3_PRIVATE_KEY
            },
            { 
                name: 'TEST_USER_4', 
                accountId: process.env.TEST_USER_4_ACCOUNT_ID,
                privateKey: process.env.TEST_USER_4_PRIVATE_KEY
            },
            { 
                name: 'TEST_USER_5', 
                accountId: process.env.TEST_USER_5_ACCOUNT_ID,
                privateKey: process.env.TEST_USER_5_PRIVATE_KEY
            },
            { 
                name: 'TEST_USER_6', 
                accountId: process.env.TEST_USER_6_ACCOUNT_ID,
                privateKey: process.env.TEST_USER_6_PRIVATE_KEY
            }
        ].filter(account => account.accountId && account.privateKey);
    }

    async initialize() {
        console.log('🧹 Initializing Token Allocation Cleanup...');
        this.client.setOperator(this.controllerId, this.controllerKey);
        console.log('✅ Client initialized');
        console.log('\n📋 Current Token Allocations (from last query):');
        console.log('   CONTROLLER: 3 DRIP, 75 WISH, 0 DROP');
        console.log('   TEST_USER_1: 1 DRIP, 775 WISH, 0.00000001 DROP');
        console.log('   TEST_USER_2: 1 DRIP, 200 WISH, 0 DROP');
        console.log('   TEST_USER_3: 1 DRIP, 625 WISH, 0.00000001 DROP');
        console.log('   TEST_USER_4: 1 DRIP, 1100 WISH, 0 DROP');
        console.log('   TEST_USER_5: 1 DRIP, 1625 WISH, 0.00000001 DROP');
        console.log('   TEST_USER_6: 1 DRIP, 525 WISH, 1 DROP');
        console.log('   OPERATOR: 0 DRIP, 0 WISH, 0 DROP');
        console.log('   TREASURY: 0 DRIP, 0 WISH, 0 DROP');
    }

    async transferAllTokensToController(account) {
        try {
            const accountId = AccountId.fromString(account.accountId);
            const accountKey = PrivateKey.fromString(account.privateKey);
            
            console.log(`\n🔄 Processing ${account.name}...`);
            
            // Check current balances
            const balance = await new AccountBalanceQuery()
                .setAccountId(accountId)
                .execute(this.client);
            
            const dripBalance = parseInt(balance.tokens.get(this.tokenIds.DRIP) || 0);
            const wishBalance = parseInt(balance.tokens.get(this.tokenIds.WISH) || 0);
            const dropBalance = parseInt(balance.tokens.get(this.tokenIds.DROP) || 0);
            
            console.log(`   Current: ${dripBalance} DRIP, ${wishBalance} WISH, ${dropBalance / 100000000} DROP`);
            
            let transfers = [];
            
            // Transfer DRIP (if any)
            if (dripBalance > 0) {
                transfers.push({
                    tokenId: this.tokenIds.DRIP,
                    amount: dripBalance,
                    tokenName: 'DRIP'
                });
            }
            
            // Transfer WISH (if any)
            if (wishBalance > 0) {
                transfers.push({
                    tokenId: this.tokenIds.WISH,
                    amount: wishBalance,
                    tokenName: 'WISH'
                });
            }
            
            // Transfer DROP (if any)
            if (dropBalance > 0) {
                transfers.push({
                    tokenId: this.tokenIds.DROP,
                    amount: dropBalance,
                    tokenName: 'DROP'
                });
            }
            
            if (transfers.length === 0) {
                console.log('   ✅ No tokens to transfer');
                return { success: true, transfers: [] };
            }
            
            // Execute transfers
            const results = [];
            
            for (const transfer of transfers) {
                try {
                    console.log(`   💸 Transferring ${transfer.amount} ${transfer.tokenName} to Controller...`);
                    
                    const transferTx = new TransferTransaction()
                        .addTokenTransfer(transfer.tokenId, accountId, -transfer.amount)
                        .addTokenTransfer(transfer.tokenId, this.controllerId, transfer.amount)
                        .freezeWith(this.client);
                    
                    const signedTx = await transferTx.sign(accountKey);
                    const response = await signedTx.execute(this.client);
                    const receipt = await response.getReceipt(this.client);
                    
                    console.log(`   ✅ ${transfer.tokenName} transfer: ${response.transactionId}`);
                    
                    results.push({
                        tokenName: transfer.tokenName,
                        amount: transfer.amount,
                        success: true,
                        transactionId: response.transactionId.toString()
                    });
                    
                } catch (error) {
                    console.error(`   ❌ ${transfer.tokenName} transfer failed:`, error.message);
                    results.push({
                        tokenName: transfer.tokenName,
                        amount: transfer.amount,
                        success: false,
                        error: error.message
                    });
                }
                
                // Small delay between transfers
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            return {
                success: results.every(r => r.success),
                transfers: results
            };
            
        } catch (error) {
            console.error(`❌ Failed to process ${account.name}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async burnExcessTokensFromController() {
        console.log('\n🔥 Burning excess tokens from Controller...');
        
        try {
            // Check Controller's current token balances
            const controllerBalance = await new AccountBalanceQuery()
                .setAccountId(this.controllerId)
                .execute(this.client);
            
            const controllerDrip = parseInt(controllerBalance.tokens.get(this.tokenIds.DRIP) || 0);
            const controllerWish = parseInt(controllerBalance.tokens.get(this.tokenIds.WISH) || 0);
            const controllerDrop = parseInt(controllerBalance.tokens.get(this.tokenIds.DROP) || 0);
            
            console.log(`📊 Controller tokens: ${controllerDrip} DRIP, ${controllerWish} WISH, ${controllerDrop / 100000000} DROP`);
            
            const burnResults = [];
            
            // Burn all WISH tokens (utility tokens should be regenerated)
            if (controllerWish > 0) {
                try {
                    console.log(`🔥 Burning ${controllerWish} WISH tokens...`);
                    
                    const wishBurnTx = new TokenBurnTransaction()
                        .setTokenId(this.tokenIds.WISH)
                        .setAmount(controllerWish);
                    
                    const wishBurnResponse = await wishBurnTx.execute(this.client);
                    const wishBurnReceipt = await wishBurnResponse.getReceipt(this.client);
                    
                    console.log(`   ✅ WISH burn: ${wishBurnResponse.transactionId}`);
                    
                    burnResults.push({
                        tokenName: 'WISH',
                        amount: controllerWish,
                        success: true,
                        transactionId: wishBurnResponse.transactionId.toString()
                    });
                    
                } catch (error) {
                    console.error(`   ❌ WISH burn failed:`, error.message);
                    burnResults.push({
                        tokenName: 'WISH',
                        amount: controllerWish,
                        success: false,
                        error: error.message
                    });
                }
            }
            
            // Burn excess DRIP tokens (keep 1 for treasury, burn rest)
            const excessDrip = Math.max(0, controllerDrip - 1);
            if (excessDrip > 0) {
                try {
                    console.log(`🔥 Burning ${excessDrip} excess DRIP tokens (keeping 1)...`);
                    
                    const dripBurnTx = new TokenBurnTransaction()
                        .setTokenId(this.tokenIds.DRIP)
                        .setAmount(excessDrip);
                    
                    const dripBurnResponse = await dripBurnTx.execute(this.client);
                    const dripBurnReceipt = await dripBurnResponse.getReceipt(this.client);
                    
                    console.log(`   ✅ DRIP burn: ${dripBurnResponse.transactionId}`);
                    
                    burnResults.push({
                        tokenName: 'DRIP',
                        amount: excessDrip,
                        success: true,
                        transactionId: dripBurnResponse.transactionId.toString()
                    });
                    
                } catch (error) {
                    console.error(`   ❌ DRIP burn failed:`, error.message);
                    burnResults.push({
                        tokenName: 'DRIP',
                        amount: excessDrip,
                        success: false,
                        error: error.message
                    });
                }
            }
            
            // Keep all DROP tokens (they represent donations)
            if (controllerDrop > 0) {
                console.log(`💎 Keeping ${controllerDrop / 100000000} DROP tokens (donation records)`);
            }
            
            return burnResults;
            
        } catch (error) {
            console.error('❌ Failed to burn excess tokens:', error.message);
            return [];
        }
    }

    async generateFinalReport() {
        console.log('\n📊 Generating final cleanup report...');
        
        // Check all balances after cleanup
        const finalBalances = [];
        
        // Check Controller
        const controllerBalance = await new AccountBalanceQuery()
            .setAccountId(this.controllerId)
            .execute(this.client);
        
        finalBalances.push({
            name: 'CONTROLLER',
            drip: parseInt(controllerBalance.tokens.get(this.tokenIds.DRIP) || 0),
            wish: parseInt(controllerBalance.tokens.get(this.tokenIds.WISH) || 0),
            drop: parseInt(controllerBalance.tokens.get(this.tokenIds.DROP) || 0)
        });
        
        // Check all test accounts
        for (const account of this.testAccounts) {
            try {
                const balance = await new AccountBalanceQuery()
                    .setAccountId(account.accountId)
                    .execute(this.client);
                
                finalBalances.push({
                    name: account.name,
                    drip: parseInt(balance.tokens.get(this.tokenIds.DRIP) || 0),
                    wish: parseInt(balance.tokens.get(this.tokenIds.WISH) || 0),
                    drop: parseInt(balance.tokens.get(this.tokenIds.DROP) || 0)
                });
                
            } catch (error) {
                console.error(`Failed to check ${account.name}:`, error.message);
            }
        }
        
        console.log('\n📋 FINAL TOKEN ALLOCATIONS:');
        console.log('-'.repeat(60));
        
        finalBalances.forEach(account => {
            console.log(`${account.name.padEnd(12)} │ ${account.drip.toString().padStart(3)} DRIP │ ${account.wish.toString().padStart(4)} WISH │ ${(account.drop / 100000000).toFixed(8)} DROP`);
        });
        
        console.log('-'.repeat(60));
        
        const totals = finalBalances.reduce((sum, account) => ({
            drip: sum.drip + account.drip,
            wish: sum.wish + account.wish,
            drop: sum.drop + account.drop
        }), { drip: 0, wish: 0, drop: 0 });
        
        console.log(`${'TOTALS'.padEnd(12)} │ ${totals.drip.toString().padStart(3)} DRIP │ ${totals.wish.toString().padStart(4)} WISH │ ${(totals.drop / 100000000).toFixed(8)} DROP`);
        
        return finalBalances;
    }

    async run() {
        try {
            await this.initialize();
            
            console.log('\n🚀 Starting token cleanup process...');
            
            // Step 1: Transfer all tokens from test accounts to Controller
            console.log('\n=== STEP 1: COLLECT ALL TOKENS ===');
            
            const transferResults = [];
            for (const account of this.testAccounts) {
                const result = await this.transferAllTokensToController(account);
                transferResults.push({
                    account: account.name,
                    ...result
                });
            }
            
            // Step 2: Burn excess tokens from Controller
            console.log('\n=== STEP 2: BURN EXCESS TOKENS ===');
            
            const burnResults = await this.burnExcessTokensFromController();
            
            // Step 3: Generate final report
            console.log('\n=== STEP 3: FINAL VERIFICATION ===');
            
            const finalBalances = await this.generateFinalReport();
            
            console.log('\n' + '='.repeat(80));
            console.log('🧹 TOKEN ALLOCATION CLEANUP COMPLETE');
            console.log('='.repeat(80));
            
            console.log('\n✅ CLEANUP SUMMARY:');
            console.log(`   Token transfers completed: ${transferResults.filter(r => r.success).length}/${transferResults.length}`);
            console.log(`   Token burns completed: ${burnResults.filter(r => r.success).length}/${burnResults.length}`);
            console.log('\n🎯 RESULT: Clean testing environment ready for fresh protocol testing!');
            
            return {
                success: true,
                transferResults,
                burnResults,
                finalBalances
            };
            
        } catch (error) {
            console.error('❌ Token cleanup failed:', error);
            throw error;
        } finally {
            this.client.close();
        }
    }
}

// Execute the token cleanup
const cleanup = new TokenAllocationCleanup();
cleanup.run();