/**
 * Clean Up Testing Environment
 * Have all accounts donate excess HBAR (>2 ℏ) back to Controller
 */

import { 
    Client, 
    TransferTransaction,
    AccountBalanceQuery,
    PrivateKey,
    AccountId,
    Hbar
} from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

class TestingEnvironmentCleanup {
    constructor() {
        this.client = Client.forTestnet();
        this.controllerId = AccountId.fromString(process.env.CONTROLLER_ACCOUNT_ID);
        this.controllerKey = PrivateKey.fromString(process.env.CONTROLLER_PRIVATE_KEY);
        
        // All accounts that might have excess HBAR
        this.accounts = [
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
            },
            { 
                name: 'OPERATOR', 
                accountId: process.env.OPERATOR_ACCOUNT_ID,
                privateKey: process.env.OPERATOR_PRIVATE_KEY
            },
            { 
                name: 'TREASURY', 
                accountId: process.env.TREASURY_ACCOUNT_ID,
                privateKey: process.env.TREASURY_PRIVATE_KEY
            }
        ].filter(account => account.accountId && account.privateKey); // Only include configured accounts

        this.targetBalance = Hbar.from(2); // Keep 2 HBAR per account
    }

    async initialize() {
        console.log('🧹 Initializing Testing Environment Cleanup...');
        this.client.setOperator(this.controllerId, this.controllerKey);
        console.log('✅ Client initialized with Controller operator');
        console.log(`🎯 Target: Keep 2 ℏ per account, donate excess to Controller`);
    }

    async checkAccountBalance(account) {
        try {
            const accountId = AccountId.fromString(account.accountId);
            const balance = await new AccountBalanceQuery()
                .setAccountId(accountId)
                .execute(this.client);
            
            const currentHbar = balance.hbars;
            const excessHbar = currentHbar.toTinybars() - this.targetBalance.toTinybars();
            
            return {
                name: account.name,
                accountId: account.accountId,
                privateKey: account.privateKey,
                currentBalance: currentHbar,
                excessAmount: excessHbar > 0 ? Hbar.fromTinybars(excessHbar) : Hbar.from(0),
                needsDonation: excessHbar > 0
            };
            
        } catch (error) {
            console.error(`❌ Failed to check balance for ${account.name}:`, error.message);
            return {
                name: account.name,
                accountId: account.accountId,
                error: error.message,
                needsDonation: false
            };
        }
    }

    async donateExcessHbar(accountInfo) {
        try {
            const accountId = AccountId.fromString(accountInfo.accountId);
            const accountKey = PrivateKey.fromString(accountInfo.privateKey);
            
            console.log(`💰 ${accountInfo.name}: Donating ${accountInfo.excessAmount.toString()} back to Controller...`);
            
            const donationTx = new TransferTransaction()
                .addHbarTransfer(accountId, accountInfo.excessAmount.negated())
                .addHbarTransfer(this.controllerId, accountInfo.excessAmount)
                .freezeWith(this.client);
            
            const signedTx = await donationTx.sign(accountKey);
            const response = await signedTx.execute(this.client);
            const receipt = await response.getReceipt(this.client);
            
            console.log(`   ✅ Donation successful: ${response.transactionId}`);
            console.log(`   Status: ${receipt.status}`);
            
            // Verify new balance
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const newBalance = await new AccountBalanceQuery()
                .setAccountId(accountId)
                .execute(this.client);
            
            console.log(`   📊 New balance: ${newBalance.hbars.toString()}`);
            
            return {
                success: true,
                transactionId: response.transactionId.toString(),
                amountDonated: accountInfo.excessAmount.toString(),
                newBalance: newBalance.hbars.toString()
            };
            
        } catch (error) {
            console.error(`❌ Donation failed for ${accountInfo.name}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async cleanupAllAccounts() {
        console.log(`\n🔍 Checking balances for ${this.accounts.length} accounts...\n`);
        
        // Check all balances first
        const balanceChecks = [];
        for (const account of this.accounts) {
            const balanceInfo = await this.checkAccountBalance(account);
            balanceChecks.push(balanceInfo);
            
            if (balanceInfo.error) {
                console.log(`❌ ${balanceInfo.name}: Error - ${balanceInfo.error}`);
            } else {
                const excessAmount = balanceInfo.excessAmount.toTinybars();
                if (excessAmount > 0) {
                    console.log(`💰 ${balanceInfo.name}: ${balanceInfo.currentBalance.toString()} → needs to donate ${balanceInfo.excessAmount.toString()}`);
                } else {
                    console.log(`✅ ${balanceInfo.name}: ${balanceInfo.currentBalance.toString()} (no excess)`);
                }
            }
        }
        
        // Execute donations for accounts with excess
        const accountsNeedingDonation = balanceChecks.filter(account => account.needsDonation);
        
        console.log(`\n📊 Summary:`);
        console.log(`   Total accounts checked: ${balanceChecks.length}`);
        console.log(`   Accounts needing donation: ${accountsNeedingDonation.length}`);
        
        if (accountsNeedingDonation.length === 0) {
            console.log('🎉 All accounts already at target balance!');
            return { allClean: true, donations: [] };
        }
        
        console.log(`\n🚀 Executing donations...`);
        
        const donationResults = [];
        let totalDonated = 0;
        
        for (const account of accountsNeedingDonation) {
            const result = await this.donateExcessHbar(account);
            donationResults.push({
                account: account.name,
                ...result
            });
            
            if (result.success) {
                totalDonated += account.excessAmount.toTinybars();
            }
            
            // Small delay between donations
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log(`\n📋 DONATION SUMMARY:`);
        console.log(`   Total donated to Controller: ${Hbar.fromTinybars(totalDonated).toString()}`);
        console.log(`   Successful donations: ${donationResults.filter(r => r.success).length}`);
        console.log(`   Failed donations: ${donationResults.filter(r => !r.success).length}`);
        
        return {
            allClean: false,
            donations: donationResults,
            totalDonated: Hbar.fromTinybars(totalDonated).toString()
        };
    }

    async checkControllerBalance() {
        console.log('\n💎 Checking Controller balance after cleanup...');
        
        const controllerBalance = await new AccountBalanceQuery()
            .setAccountId(this.controllerId)
            .execute(this.client);
        
        console.log(`📊 Controller final balance: ${controllerBalance.hbars.toString()}`);
        
        return controllerBalance.hbars.toString();
    }

    async run() {
        try {
            await this.initialize();
            
            const cleanupResults = await this.cleanupAllAccounts();
            const finalControllerBalance = await this.checkControllerBalance();
            
            console.log('\n' + '='.repeat(80));
            console.log('🧹 TESTING ENVIRONMENT HBAR CLEANUP COMPLETE');
            console.log('='.repeat(80));
            
            if (cleanupResults.allClean) {
                console.log('✅ All accounts were already at target balance (≤2 ℏ)');
            } else {
                console.log(`✅ Successfully cleaned up ${cleanupResults.donations.filter(d => d.success).length} accounts`);
                console.log(`💰 Total HBAR returned to Controller: ${cleanupResults.totalDonated}`);
            }
            
            console.log(`💎 Controller final balance: ${finalControllerBalance}`);
            console.log('\n🎯 Next step: Clean up token allocations');
            
            return {
                success: true,
                cleanupResults,
                finalControllerBalance
            };
            
        } catch (error) {
            console.error('❌ Cleanup failed:', error);
            throw error;
        } finally {
            this.client.close();
        }
    }
}

// Execute the cleanup
const cleanup = new TestingEnvironmentCleanup();
cleanup.run();