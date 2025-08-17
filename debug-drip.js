import { FOUNTAIN_CONFIG } from './config.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

class DripDebugger {
    constructor() {
        this.config = FOUNTAIN_CONFIG;
        this.mirrorNodeUrl = 'https://testnet.mirrornode.hedera.com';
    }
    
    async debugDripToken() {
        console.log("🔍 DEBUGGING DRIP TOKEN HOLDINGS");
        console.log("=" * 50);
        console.log(`DRIP Token ID: ${this.config.tokens.DRIP}`);
        console.log(`Treasury Account: ${this.config.accounts.treasury}`);
        console.log("");
        
        try {
            // Check raw token balances
            console.log("📊 Fetching ALL DRIP balances (including treasury)...");
            const response = await fetch(
                `${this.mirrorNodeUrl}/api/v1/tokens/${this.config.tokens.DRIP}/balances`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`✅ API Response received`);
            console.log(`Total balance entries: ${data.balances.length}`);
            console.log("");
            
            // Show all balances
            console.log("💧 ALL DRIP BALANCES:");
            for (const balance of data.balances) {
                const isTreasury = balance.account === this.config.accounts.treasury;
                console.log(`  ${balance.account}: ${balance.balance} DRIP ${isTreasury ? '(TREASURY)' : ''}`);
            }
            console.log("");
            
            // Show non-zero balances
            const nonZeroBalances = data.balances.filter(b => b.balance > 0);
            console.log(`💪 NON-ZERO BALANCES: ${nonZeroBalances.length}`);
            
            // Show non-treasury balances
            const nonTreasuryBalances = data.balances.filter(b => 
                b.balance > 0 && b.account !== this.config.accounts.treasury
            );
            console.log(`🏠 NON-TREASURY HOLDERS: ${nonTreasuryBalances.length}`);
            
            if (nonTreasuryBalances.length > 0) {
                console.log("📋 NON-TREASURY HOLDERS:");
                for (const holder of nonTreasuryBalances) {
                    console.log(`  ${holder.account}: ${holder.balance} DRIP`);
                }
            }
            
            return data;
            
        } catch (error) {
            console.error("❌ Debug failed:", error.message);
            return null;
        }
    }
}

// Run the debug
async function runDebug() {
    const dripDebugger = new DripDebugger();
    await dripDebugger.debugDripToken();
}

runDebug().catch(console.error);