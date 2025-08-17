import { Client, AccountId, PrivateKey, TopicMessageSubmitTransaction } from '@hashgraph/sdk';
import { FOUNTAIN_CONFIG } from './config.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

class DailyScheduler {
    constructor() {
        this.operatorId = AccountId.fromString(process.env.OPERATOR_ID);
        this.operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
        this.client = Client.forTestnet();
        this.client.setOperator(this.operatorId, this.operatorKey);
        
        this.config = FOUNTAIN_CONFIG;
        this.mirrorNodeUrl = 'https://testnet.mirrornode.hedera.com';
        
        // Scheduler state
        this.isRunning = false;
        this.lastSnapshotDate = null;
        this.currentEntitlements = new Map();
        
        // Schedule tracking
        this.schedulerInterval = null;
        this.nextSnapshotTime = null;
    }
    
    // Calculate next UTC midnight
    getNextMidnightUTC() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);
        return tomorrow;
    }
    
    // Calculate milliseconds until next UTC midnight
    getMillisecondsUntilMidnight() {
        const now = new Date();
        const nextMidnight = this.getNextMidnightUTC();
        return nextMidnight.getTime() - now.getTime();
    }
    
    // Log with timestamp
    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${level}] ${message}`);
    }
    
    // Fetch DRIP holders from Mirror Node
    async fetchDripHolders() {
        try {
            this.log("Fetching DRIP token holders from Mirror Node...");
            
            const response = await fetch(
                `${this.mirrorNodeUrl}/api/v1/tokens/${this.config.tokens.DRIP}/balances`
            );
            
            if (!response.ok) {
                throw new Error(`Mirror Node error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Filter for accounts with positive balances
            const holders = data.balances.filter(holder => holder.balance > 0);
            
            this.log(`Found ${holders.length} DRIP holders`);
            return holders;
            
        } catch (error) {
            this.log(`Failed to fetch DRIP holders: ${error.message}`, 'ERROR');
            return [];
        }
    }
    
    // Calculate daily entitlements for all holders
    calculateDailyEntitlements(holders) {
        this.log("Calculating daily WISH entitlements...");
        
        const entitlements = new Map();
        let totalMint = 0;
        let totalDrip = 0;
        
        for (const holder of holders) {
            const accountId = holder.account;
            const dripBalance = parseInt(holder.balance);
            
            // Base daily entitlement: 50 WISH per DRIP
            const dailyWish = dripBalance * this.config.parameters.baseDailyWish;
            
            // Note: In full implementation, would check lifetime caps from database
            entitlements.set(accountId, {
                accountId,
                dripBalance,
                dailyWish,
                claimable: dailyWish,
                calculatedAt: new Date().toISOString()
            });
            
            totalMint += dailyWish;
            totalDrip += dripBalance;
        }
        
        this.log(`Calculated entitlements for ${entitlements.size} accounts`);
        this.log(`Total DRIP: ${totalDrip}, Total WISH to allocate: ${totalMint}`);
        
        return { entitlements, totalMint, totalDrip };
    }
    
    // Publish snapshot data to HCS
    async publishSnapshotToHCS(snapshotData) {
        try {
            this.log("Publishing daily snapshot to HCS...");
            
            const message = JSON.stringify(snapshotData, null, 2);
            
            const submitTx = await new TopicMessageSubmitTransaction()
                .setTopicId(this.config.infrastructure.hcsTopic)
                .setMessage(message)
                .execute(this.client);
            
            const receipt = await submitTx.getReceipt(this.client);
            
            this.log(`Snapshot published to HCS! Sequence: ${receipt.topicSequenceNumber}`);
            return receipt.topicSequenceNumber;
            
        } catch (error) {
            this.log(`Failed to publish to HCS: ${error.message}`, 'ERROR');
            return null;
        }
    }
    
    // Execute daily snapshot
    async executeSnapshot() {
        const snapshotDate = new Date().toISOString().split('T')[0];
        
        try {
            this.log(`=== EXECUTING DAILY SNAPSHOT - ${snapshotDate} ===`);
            
            // Prevent duplicate snapshots on same day
            if (this.lastSnapshotDate === snapshotDate) {
                this.log("Snapshot already executed today, skipping", 'WARN');
                return false;
            }
            
            // Step 1: Fetch current DRIP holders
            const holders = await this.fetchDripHolders();
            
            if (holders.length === 0) {
                this.log("No DRIP holders found, creating empty snapshot", 'WARN');
            }
            
            // Step 2: Calculate entitlements
            const { entitlements, totalMint, totalDrip } = this.calculateDailyEntitlements(holders);
            
            // Step 3: Create snapshot data
            const snapshotData = {
                protocol: "Fountain Protocol",
                version: "1.0",
                type: "daily_snapshot",
                snapshotDate,
                timestamp: new Date().toISOString(),
                metrics: {
                    totalDripHolders: entitlements.size,
                    totalDripSupply: totalDrip,
                    totalWishToAllocate: totalMint,
                    baseDailyRate: this.config.parameters.baseDailyWish,
                    exchangeRate: this.config.parameters.wishToHbarRate
                },
                entitlements: Object.fromEntries(entitlements),
                tokenAddresses: this.config.tokens,
                treasury: this.config.accounts.treasury,
                nextSnapshotScheduled: this.getNextMidnightUTC().toISOString()
            };
            
            // Step 4: Publish to HCS
            const sequenceNumber = await this.publishSnapshotToHCS(snapshotData);
            
            // Step 5: Update scheduler state
            this.lastSnapshotDate = snapshotDate;
            this.currentEntitlements = entitlements;
            
            this.log("=== SNAPSHOT EXECUTION COMPLETE ===");
            this.log(`📊 DRIP Holders: ${entitlements.size}`);
            this.log(`💧 Total DRIP: ${totalDrip}`);
            this.log(`✨ WISH Allocated: ${totalMint}`);
            this.log(`📡 HCS Sequence: ${sequenceNumber}`);
            
            return true;
            
        } catch (error) {
            this.log(`Snapshot execution failed: ${error.message}`, 'ERROR');
            return false;
        }
    }
    
    // Start the scheduler
    async start() {
        if (this.isRunning) {
            this.log("Scheduler already running", 'WARN');
            return;
        }
        
        this.isRunning = true;
        this.log("🤖 FOUNTAIN PROTOCOL DAILY SCHEDULER STARTING");
        this.log(`⏰ Target: Daily snapshots at UTC 00:00`);
        
        // Calculate initial delay to next midnight
        const msUntilMidnight = this.getMillisecondsUntilMidnight();
        this.nextSnapshotTime = this.getNextMidnightUTC();
        
        this.log(`⏳ Next snapshot scheduled for: ${this.nextSnapshotTime.toISOString()}`);
        this.log(`⏳ Time until next snapshot: ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);
        
        // Set initial timeout to next midnight
        setTimeout(async () => {
            await this.executeSnapshot();
            
            // Then set interval for every 24 hours
            this.schedulerInterval = setInterval(async () => {
                await this.executeSnapshot();
            }, 24 * 60 * 60 * 1000); // 24 hours
            
        }, msUntilMidnight);
        
        this.log("✅ Scheduler started successfully");
        
        // Optional: Execute initial snapshot for testing
        if (process.env.NODE_ENV === 'development') {
            this.log("🧪 Development mode: executing immediate test snapshot");
            await this.executeSnapshot();
        }
    }
    
    // Stop the scheduler
    stop() {
        if (!this.isRunning) {
            this.log("Scheduler not running", 'WARN');
            return;
        }
        
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            this.schedulerInterval = null;
        }
        
        this.isRunning = false;
        this.log("🛑 Scheduler stopped");
    }
    
    // Get current entitlements for an account
    getAccountEntitlement(accountId) {
        return this.currentEntitlements.get(accountId) || null;
    }
    
    // Get all current entitlements
    getAllEntitlements() {
        return Object.fromEntries(this.currentEntitlements);
    }
    
    // Get scheduler status
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastSnapshotDate: this.lastSnapshotDate,
            nextSnapshotTime: this.nextSnapshotTime,
            totalAccounts: this.currentEntitlements.size,
            schedulerInterval: this.schedulerInterval !== null
        };
    }
}

// Production runner
async function runScheduler() {
    const scheduler = new DailyScheduler();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        scheduler.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
        scheduler.stop();
        process.exit(0);
    });
    
    // Start the scheduler
    await scheduler.start();
    
    // Keep process alive and show status updates
    setInterval(() => {
        const status = scheduler.getStatus();
        console.log(`\n📊 SCHEDULER STATUS:`);
        console.log(`   🤖 Running: ${status.isRunning}`);
        console.log(`   📅 Last snapshot: ${status.lastSnapshotDate || 'None'}`);
        console.log(`   ⏰ Next snapshot: ${status.nextSnapshotTime?.toISOString() || 'Unknown'}`);
        console.log(`   👥 Accounts tracked: ${status.totalAccounts}`);
    }, 60000); // Status update every minute
}

// Run the scheduler
runScheduler().catch(console.error);


export { DailyScheduler };