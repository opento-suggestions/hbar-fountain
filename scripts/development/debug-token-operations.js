/**
 * Debug Token Operations and Permissions
 * Check what went wrong with WISH burns and DRIP mints
 */

import { 
    Client, 
    TokenInfoQuery,
    AccountBalanceQuery,
    PrivateKey,
    AccountId
} from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

class TokenOperationsDebugger {
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
        console.log('🔍 Initializing Token Operations Debugger...');
        this.client.setOperator(this.treasuryId, this.treasuryKey);
    }

    async checkTokenInfo(tokenId, tokenName) {
        console.log(`\n🪙 Checking ${tokenName} Token Info (${tokenId})...`);
        
        try {
            const tokenInfo = await new TokenInfoQuery()
                .setTokenId(tokenId)
                .execute(this.client);
            
            console.log(`   Treasury: ${tokenInfo.treasuryAccountId}`);
            console.log(`   Supply Type: ${tokenInfo.supplyType}`);
            console.log(`   Total Supply: ${tokenInfo.totalSupply}`);
            console.log(`   Max Supply: ${tokenInfo.maxSupply}`);
            console.log(`   Supply Key: ${tokenInfo.supplyKey ? '✅ Present' : '❌ Missing'}`);
            console.log(`   Admin Key: ${tokenInfo.adminKey ? '✅ Present' : '❌ Missing'}`);
            console.log(`   Freeze Key: ${tokenInfo.freezeKey ? '✅ Present' : '❌ Missing'}`);
            
            return tokenInfo;
            
        } catch (error) {
            console.error(`   ❌ Failed to get ${tokenName} info: ${error.message}`);
            return null;
        }
    }

    async calculateExpectedBalances() {
        console.log('\n🧮 Calculating Expected vs Actual WISH Balances...');
        
        const testUsers = [
            { name: 'TEST_USER_1', accountId: process.env.TEST_USER_1_ACCOUNT_ID, startingWish: 1250, hasDrop: true },
            { name: 'TEST_USER_2', accountId: process.env.TEST_USER_2_ACCOUNT_ID, startingWish: 850, hasDrop: false },
            { name: 'TEST_USER_3', accountId: process.env.TEST_USER_3_ACCOUNT_ID, startingWish: 100, hasDrop: true },
            { name: 'TEST_USER_4', accountId: process.env.TEST_USER_4_ACCOUNT_ID, startingWish: 750, hasDrop: false },
            { name: 'TEST_USER_5', accountId: process.env.TEST_USER_5_ACCOUNT_ID, startingWish: 1100, hasDrop: true },
            { name: 'TEST_USER_6', accountId: process.env.TEST_USER_6_ACCOUNT_ID, startingWish: 0, hasDrop: true }
        ];
        
        for (const user of testUsers) {
            console.log(`\n📊 ${user.name}:`);
            
            // Calculate expected balance
            const dailyRate = user.hasDrop ? 75 : 50;
            const daysOfIssuance = 7;
            const wishFromIssuance = dailyRate * daysOfIssuance;
            
            // Calculate AutoRedeems based on accumulation
            let expectedBalance = user.startingWish;
            let autoRedeemCount = 0;
            
            for (let day = 1; day <= 7; day++) {
                expectedBalance += dailyRate;
                
                if (expectedBalance >= 1000) {
                    autoRedeemCount++;
                    expectedBalance -= 1000; // Burn 1000 WISH
                    console.log(`     Day ${day}: AutoRedeem triggered, balance: ${expectedBalance}`);
                }
            }
            
            // Get actual balance
            try {
                const accountId = AccountId.fromString(user.accountId);
                const balance = await new AccountBalanceQuery()
                    .setAccountId(accountId)
                    .execute(this.client);
                
                const actualWish = parseInt(balance.tokens.get(this.tokenIds.WISH) || 0);
                
                console.log(`   Starting WISH: ${user.startingWish}`);
                console.log(`   Daily Rate: ${dailyRate} WISH/day`);
                console.log(`   Expected AutoRedeems: ${autoRedeemCount}`);
                console.log(`   Expected Final Balance: ${expectedBalance} WISH`);
                console.log(`   Actual Final Balance: ${actualWish} WISH`);
                console.log(`   Difference: ${actualWish - expectedBalance} WISH ${actualWish === expectedBalance ? '✅' : '❌'}`);
                
            } catch (error) {
                console.error(`   ❌ Failed to get balance: ${error.message}`);
            }
        }
    }

    async checkRecentTransactions() {
        console.log('\n📋 Recent Transaction Analysis...');
        console.log('This would require Mirror Node API integration for full transaction history');
        console.log('Key questions:');
        console.log('- Did TokenBurnTransaction succeed for WISH?');
        console.log('- Did TokenMintTransaction succeed for DRIP?');
        console.log('- Were there any transaction failures we missed?');
    }

    async run() {
        try {
            await this.initialize();
            
            // Check token configurations
            await this.checkTokenInfo(this.tokenIds.DRIP, 'DRIP');
            await this.checkTokenInfo(this.tokenIds.WISH, 'WISH');
            await this.checkTokenInfo(this.tokenIds.DROP, 'DROP');
            
            // Calculate expected vs actual balances
            await this.calculateExpectedBalances();
            
            // Analyze transactions
            await this.checkRecentTransactions();
            
            console.log('\n🎯 LIKELY ISSUES IDENTIFIED:');
            console.log('1. TokenBurnTransaction for WISH may have failed silently');
            console.log('2. Our AutoRedeem logic may not have proper burn permissions');
            console.log('3. We may be issuing WISH without burning, creating infinite loops');
            console.log('4. DROP bonus calculation appears to be incorrect');
            
            console.log('\n🔧 RECOMMENDED FIXES:');
            console.log('1. Verify treasury has burn permissions for WISH token');
            console.log('2. Add proper error handling for burn transactions');
            console.log('3. Implement proper balance checks before/after operations');
            console.log('4. Fix DROP bonus calculation in daily WISH issuance');
            
        } catch (error) {
            console.error('❌ Debug failed:', error);
            throw error;
        } finally {
            this.client.close();
        }
    }
}

// Run the token operations debugger
const tokenDebugger = new TokenOperationsDebugger();
tokenDebugger.run();