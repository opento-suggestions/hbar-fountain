/**
 * Query All Wallet Balances
 * Comprehensive balance check for all accounts in .env file
 * Shows HBAR and all protocol token balances
 */

import { 
    Client, 
    AccountBalanceQuery,
    AccountId
} from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

class WalletBalanceQuery {
    constructor() {
        this.client = Client.forTestnet();
        
        // Set operator (treasury for queries)
        this.client.setOperator(
            AccountId.fromString(process.env.CONTROLLER_ACCOUNT_ID),
            process.env.CONTROLLER_PRIVATE_KEY
        );
        
        this.tokenIds = {
            DRIP: process.env.DRIP_TOKEN_ID,
            WISH: process.env.WISH_TOKEN_ID,
            DROP: process.env.DROP_TOKEN_ID
        };
        
        // All wallets from .env
        this.wallets = this.loadWalletsFromEnv();
    }

    /**
     * Load all wallet addresses from environment variables
     */
    loadWalletsFromEnv() {
        const wallets = [];
        
        // Treasury/Controller
        if (process.env.CONTROLLER_ACCOUNT_ID) {
            wallets.push({
                name: 'CONTROLLER/TREASURY',
                accountId: process.env.CONTROLLER_ACCOUNT_ID,
                hasPrivateKey: !!process.env.CONTROLLER_PRIVATE_KEY,
                role: 'Treasury & Protocol Controller'
            });
        }
        
        // Test Users
        for (let i = 1; i <= 6; i++) {
            const accountEnvVar = `TEST_USER_${i}_ACCOUNT_ID`;
            const keyEnvVar = `TEST_USER_${i}_PRIVATE_KEY`;
            
            if (process.env[accountEnvVar]) {
                wallets.push({
                    name: `TEST_USER_${i}`,
                    accountId: process.env[accountEnvVar],
                    hasPrivateKey: !!process.env[keyEnvVar],
                    role: 'Test Account'
                });
            }
        }
        
        // Additional protocol accounts
        const additionalAccounts = [
            'OPERATOR_ACCOUNT_ID',
            'TREASURY_ACCOUNT_ID',
            'ADMIN_ACCOUNT_ID'
        ];
        
        additionalAccounts.forEach(envVar => {
            if (process.env[envVar] && !wallets.find(w => w.accountId === process.env[envVar])) {
                wallets.push({
                    name: envVar.replace('_ACCOUNT_ID', ''),
                    accountId: process.env[envVar],
                    hasPrivateKey: !!process.env[envVar.replace('_ACCOUNT_ID', '_PRIVATE_KEY')],
                    role: 'Protocol Account'
                });
            }
        });
        
        return wallets;
    }

    /**
     * Query balance for a single wallet
     */
    async queryWalletBalance(wallet) {
        try {
            console.log(`🔍 Querying ${wallet.name} (${wallet.accountId})...`);
            
            const balance = await new AccountBalanceQuery()
                .setAccountId(wallet.accountId)
                .execute(this.client);
            
            // Get token balances
            const dripBalance = balance.tokens.get(this.tokenIds.DRIP) || 0;
            const wishBalance = balance.tokens.get(this.tokenIds.WISH) || 0;
            const dropBalance = balance.tokens.get(this.tokenIds.DROP) || 0;
            
            // Calculate protocol status
            const membershipActive = parseInt(dripBalance.toString()) >= 1;
            const donorRecognized = parseInt(dropBalance.toString()) >= 100000000; // 1 DROP with 8 decimals
            const wishEligible = membershipActive;
            
            // Calculate daily WISH rate
            let dailyWishRate = 0;
            if (membershipActive) {
                dailyWishRate = 50; // Base rate
                if (donorRecognized) {
                    dailyWishRate += 25; // DROP bonus
                }
            }
            
            const walletInfo = {
                ...wallet,
                balances: {
                    hbar: balance.hbars.toString(),
                    hbarTinybars: balance.hbars.toTinybars(),
                    drip: parseInt(dripBalance.toString()),
                    wish: parseInt(wishBalance.toString()),
                    drop: parseInt(dropBalance.toString()),
                    dropFormatted: (parseInt(dropBalance.toString()) / 100000000).toFixed(8)
                },
                protocolStatus: {
                    membershipActive,
                    donorRecognized,
                    wishEligible,
                    dailyWishRate,
                    lifetimeWishQuota: membershipActive ? 1000 : 0,
                    wishRemaining: membershipActive ? (1000 - parseInt(wishBalance.toString())) : 0
                },
                query: {
                    success: true,
                    timestamp: new Date().toISOString()
                }
            };
            
            return walletInfo;
            
        } catch (error) {
            console.error(`❌ Failed to query ${wallet.name}:`, error.message);
            
            return {
                ...wallet,
                balances: null,
                protocolStatus: null,
                query: {
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    /**
     * Query all wallets and generate comprehensive report
     */
    async queryAllWallets() {
        console.log('🌊 Querying All Fountain Protocol Wallets...');
        console.log(`📋 Found ${this.wallets.length} wallets in .env configuration\n`);
        
        const results = [];
        
        // Query each wallet
        for (const wallet of this.wallets) {
            const walletInfo = await this.queryWalletBalance(wallet);
            results.push(walletInfo);
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        return results;
    }

    /**
     * Generate detailed balance report
     */
    generateBalanceReport(walletResults) {
        console.log('\n' + '='.repeat(80));
        console.log('📊 FOUNTAIN PROTOCOL WALLET BALANCE REPORT');
        console.log('='.repeat(80));
        
        // Successful queries
        const successful = walletResults.filter(w => w.query.success);
        const failed = walletResults.filter(w => !w.query.success);
        
        console.log(`\n📋 QUERY SUMMARY:`);
        console.log(`   Total Wallets: ${walletResults.length}`);
        console.log(`   Successful Queries: ${successful.length}`);
        console.log(`   Failed Queries: ${failed.length}`);
        
        // Protocol statistics
        const activeMembers = successful.filter(w => w.protocolStatus?.membershipActive).length;
        const recognizedDonors = successful.filter(w => w.protocolStatus?.donorRecognized).length;
        const totalHbar = successful.reduce((sum, w) => sum + (w.balances?.hbarTinybars || 0), 0);
        const totalDrip = successful.reduce((sum, w) => sum + (w.balances?.drip || 0), 0);
        const totalWish = successful.reduce((sum, w) => sum + (w.balances?.wish || 0), 0);
        const totalDrop = successful.reduce((sum, w) => sum + (w.balances?.drop || 0), 0);
        
        console.log(`\n🎯 PROTOCOL STATISTICS:`);
        console.log(`   Active Members (≥1 DRIP): ${activeMembers}`);
        console.log(`   Recognized Donors (≥1 DROP): ${recognizedDonors}`);
        console.log(`   Total HBAR Across Wallets: ${(totalHbar / 100000000).toFixed(8)} ℏ`);
        console.log(`   Total DRIP Supply: ${totalDrip} tokens`);
        console.log(`   Total WISH Supply: ${totalWish} tokens`);
        console.log(`   Total DROP Supply: ${(totalDrop / 100000000).toFixed(8)} tokens`);
        
        console.log(`\n📊 DETAILED WALLET BALANCES:`);
        console.log('-'.repeat(80));
        
        successful.forEach((wallet, index) => {
            const b = wallet.balances;
            const p = wallet.protocolStatus;
            
            console.log(`\n${index + 1}. ${wallet.name} (${wallet.accountId})`);
            console.log(`   Role: ${wallet.role}`);
            console.log(`   Private Key: ${wallet.hasPrivateKey ? '✅ Available' : '❌ Missing'}`);
            console.log(`   HBAR: ${b.hbar} (${b.hbarTinybars.toLocaleString()} tinybars)`);
            console.log(`   DRIP: ${b.drip} tokens`);
            console.log(`   WISH: ${b.wish} tokens`);
            console.log(`   DROP: ${b.dropFormatted} tokens`);
            
            console.log(`   Protocol Status:`);
            console.log(`     Membership: ${p.membershipActive ? '✅ ACTIVE' : '❌ INACTIVE'}`);
            console.log(`     Donor: ${p.donorRecognized ? '✅ RECOGNIZED' : '❌ NOT RECOGNIZED'}`);
            console.log(`     Daily WISH Rate: ${p.dailyWishRate} WISH/day`);
            
            if (p.membershipActive) {
                console.log(`     WISH Quota: ${p.wishRemaining}/${p.lifetimeWishQuota} remaining`);
                const quotaPercent = ((p.lifetimeWishQuota - p.wishRemaining) / p.lifetimeWishQuota * 100).toFixed(1);
                console.log(`     Quota Used: ${quotaPercent}%`);
            }
        });
        
        // Failed queries
        if (failed.length > 0) {
            console.log(`\n❌ FAILED QUERIES:`);
            console.log('-'.repeat(40));
            failed.forEach(wallet => {
                console.log(`   ${wallet.name} (${wallet.accountId}): ${wallet.query.error}`);
            });
        }
        
        console.log(`\n🔗 PROTOCOL INFORMATION:`);
        console.log(`   DRIP Token: ${this.tokenIds.DRIP}`);
        console.log(`   WISH Token: ${this.tokenIds.WISH}`);
        console.log(`   DROP Token: ${this.tokenIds.DROP}`);
        console.log(`   HCS Topic: 0.0.6591043`);
        console.log(`   Dashboard: https://opento-suggestions.github.io/hbar-fountain/`);
        
        return {
            summary: {
                totalWallets: walletResults.length,
                successfulQueries: successful.length,
                failedQueries: failed.length,
                activeMembers,
                recognizedDonors,
                totalHbarTinybars: totalHbar,
                totalDrip,
                totalWish,
                totalDrop
            },
            wallets: walletResults,
            successful,
            failed
        };
    }

    /**
     * Generate .env verification report
     */
    generateEnvReport(results) {
        console.log('\n' + '='.repeat(80));
        console.log('🔧 .ENV CONFIGURATION VERIFICATION');
        console.log('='.repeat(80));
        
        console.log(`\n📋 WALLET CONFIGURATION CHECK:`);
        
        results.successful.forEach(wallet => {
            console.log(`\n✅ ${wallet.name}:`);
            console.log(`   Account ID: ${wallet.accountId}`);
            console.log(`   Private Key: ${wallet.hasPrivateKey ? '✅ Configured' : '❌ Missing'}`);
            console.log(`   Balance Query: ✅ Successful`);
            console.log(`   Protocol Access: ${wallet.protocolStatus.membershipActive ? '✅ Member' : '⚠️ Non-member'}`);
        });
        
        if (results.failed.length > 0) {
            console.log(`\n❌ CONFIGURATION ISSUES:`);
            results.failed.forEach(wallet => {
                console.log(`   ${wallet.name}: ${wallet.query.error}`);
            });
        }
        
        console.log(`\n🎯 RECOMMENDATIONS:`);
        
        // Check for missing private keys
        const missingKeys = results.successful.filter(w => !w.hasPrivateKey);
        if (missingKeys.length > 0) {
            console.log(`   ⚠️ Missing private keys for: ${missingKeys.map(w => w.name).join(', ')}`);
        }
        
        // Check for inactive members
        const inactiveMembers = results.successful.filter(w => !w.protocolStatus.membershipActive && w.name.includes('TEST_USER'));
        if (inactiveMembers.length > 0) {
            console.log(`   💡 Consider activating membership for: ${inactiveMembers.map(w => w.name).join(', ')}`);
        }
        
        // Check for potential donors
        const potentialDonors = results.successful.filter(w => 
            w.protocolStatus.membershipActive && 
            !w.protocolStatus.donorRecognized && 
            w.balances.hbarTinybars > 100000000 // Has > 1 HBAR
        );
        if (potentialDonors.length > 0) {
            console.log(`   🎁 Consider donations from: ${potentialDonors.map(w => w.name).join(', ')}`);
        }
        
        console.log(`\n✅ Configuration verification complete!`);
    }

    /**
     * Run complete wallet balance query and reporting
     */
    async run() {
        try {
            console.log('🔍 Starting comprehensive wallet balance query...');
            console.log(`🌐 Network: Hedera Testnet`);
            console.log(`📡 Operator: ${process.env.CONTROLLER_ACCOUNT_ID}\n`);
            
            const walletResults = await this.queryAllWallets();
            const report = this.generateBalanceReport(walletResults);
            this.generateEnvReport(report);
            
            console.log('\n🎉 Wallet balance query completed successfully!');
            
            return report;
            
        } catch (error) {
            console.error('❌ Wallet balance query failed:', error);
            throw error;
        } finally {
            this.client.close();
        }
    }
}

// Execute the wallet balance query
const balanceQuery = new WalletBalanceQuery();
balanceQuery.run()
    .then(() => {
        console.log('\n✨ Balance query complete - all wallets analyzed!');
    })
    .catch(error => {
        console.error('\n💥 Balance query failed:', error);
        process.exit(1);
    });