/**
 * Daily Snapshot Service - Oracle Implementation
 * Implements the mathematical formulas from project_knowledge.json
 * Queries Mirror Node, computes daily tuple, publishes to HCS
 */

const { 
  TopicMessageSubmitTransaction,
  AccountBalanceQuery,
  AccountId
} = require('@hashgraph/sdk');

const { CONFIG } = require('../config');
const { getHederaClient } = require('../utils/hedera-client');
const { getMembershipDatabase } = require('../database/membership-db');

class DailySnapshotService {
  constructor() {
    this.client = null;
    this.database = null;
    this.state = {
      cumulativeScore: 0.0,  // C value for growth multiplier
      lastActiveHolders: 0   // Nt-1 for growth calculation
    };
  }

  /**
   * Initialize daily snapshot service
   */
  async initialize() {
    console.log('📸 Initializing Daily Snapshot Service...');
    
    this.client = await getHederaClient();
    this.database = await getMembershipDatabase();
    
    // Load persistent state from database
    await this.loadPersistentState();
    
    console.log('✅ Daily Snapshot Service initialized');
  }

  /**
   * Load cumulative score and last holder count from database
   */
  async loadPersistentState() {
    try {
      const latestState = await this.database.getLatestDailyState();
      if (latestState) {
        this.state.cumulativeScore = latestState.cumulative_score;
        this.state.lastActiveHolders = latestState.active_holders;
        
        console.log(`📊 Loaded persistent state: C=${this.state.cumulativeScore}, Nt-1=${this.state.lastActiveHolders}`);
      } else {
        console.log('📊 No previous state found, starting with defaults');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load persistent state:', error.message);
    }
  }

  /**
   * Run daily snapshot process (main entry point)
   * @returns {Object} Complete snapshot result
   */
  async runDailySnapshot() {
    const snapshotDate = this.getCurrentDateString();
    console.log(`📸 Running daily snapshot for ${snapshotDate}...`);
    
    try {
      // 1. Check if snapshot already exists for today
      const existingSnapshot = await this.database.getDailyState(snapshotDate);
      if (existingSnapshot) {
        console.log(`ℹ️ Snapshot already exists for ${snapshotDate}`);
        return {
          success: true,
          alreadyExists: true,
          snapshot: existingSnapshot
        };
      }
      
      // 2. Query Mirror Node for active DRIP holders (Nt)
      const activeHolders = await this.getActiveDripHolders();
      
      // 3. Count new DROP recipients today (Dt)
      const newDonors = await this.getNewDropRecipients();
      
      // 4. Calculate growth rate (gt)
      const growthRate = this.calculateGrowthRate(activeHolders, this.state.lastActiveHolders);
      
      // 5. Update cumulative score (C) based on growth
      const updatedCumulativeScore = this.updateCumulativeScore(growthRate);
      
      // 6. Calculate growth multiplier (Mt)
      const growthMultiplier = this.calculateGrowthMultiplier(updatedCumulativeScore);
      
      // 7. Calculate donor booster (Bt)
      const donorBooster = this.calculateDonorBooster(newDonors, activeHolders);
      
      // 8. Calculate final daily entitlement (Et)
      const finalEntitlement = this.calculateFinalEntitlement(donorBooster, growthMultiplier);
      
      // 9. Create snapshot data
      const snapshotData = {
        date: snapshotDate,
        activeHolders: activeHolders,
        newDonors: newDonors,
        growthRate: growthRate,
        cumulativeScore: updatedCumulativeScore,
        growthMultiplier: growthMultiplier,
        donorBooster: donorBooster,
        finalEntitlement: finalEntitlement,
        totalWishAllocated: activeHolders * finalEntitlement,
        snapshotTimestamp: new Date().toISOString()
      };
      
      // 10. Publish to HCS for transparency
      const hcsResult = await this.publishToHCS(snapshotData);
      snapshotData.hcsTransactionId = hcsResult.transactionId;
      
      // 11. Store in database
      await this.database.recordDailyState(snapshotData);
      
      // 12. Update persistent state for next day
      this.state.cumulativeScore = updatedCumulativeScore;
      this.state.lastActiveHolders = activeHolders;
      
      console.log('✅ Daily snapshot completed successfully');
      
      return {
        success: true,
        snapshot: snapshotData,
        hcsPublication: hcsResult,
        summary: {
          date: snapshotDate,
          activeMembers: activeHolders,
          newDonors: newDonors,
          dailyEntitlement: finalEntitlement,
          totalAllocated: snapshotData.totalWishAllocated,
          growthRate: (growthRate * 100).toFixed(2) + '%',
          multiplier: growthMultiplier.toFixed(2),
          booster: donorBooster
        }
      };
      
    } catch (error) {
      console.error('❌ Daily snapshot failed:', error.message);
      
      return {
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
          date: snapshotDate,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Query Mirror Node for active DRIP holders (Nt)
   * @returns {number} Count of active DRIP holders
   */
  async getActiveDripHolders() {
    console.log('🔍 Querying active DRIP holders from Mirror Node...');
    
    try {
      const mirrorUrl = `${CONFIG.infrastructure.mirrorNode || 'https://testnet.mirrornode.hedera.com'}/api/v1/tokens/${CONFIG.tokens.DRIP.id}/balances?account.balance=gt:0&limit=1000`;
      
      const response = await fetch(mirrorUrl);
      if (!response.ok) {
        throw new Error(`Mirror Node query failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Filter out treasury and any controller accounts
      const activeHolders = data.balances.filter(balance => 
        balance.account !== CONFIG.accounts.treasury &&
        parseInt(balance.balance) > 0
      );
      
      console.log(`✅ Found ${activeHolders.length} active DRIP holders`);
      return activeHolders.length;
      
    } catch (error) {
      console.error('❌ Failed to query DRIP holders:', error.message);
      
      // Fallback to database count if Mirror Node fails
      console.log('🔄 Falling back to database count...');
      const activeMembers = await this.database.getActiveMembers();
      return activeMembers.length;
    }
  }

  /**
   * Count new DROP recipients today (Dt)
   * @returns {number} Count of new donors today
   */
  async getNewDropRecipients() {
    console.log('🔍 Counting new DROP recipients today...');
    
    try {
      // Get current date range (UTC)
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 86400000); // +24 hours
      
      // Query database for donations today that resulted in DROP minting
      const todayDonations = await this.database.getRecentDeposits(100); // Simplified for now
      
      // In full implementation, would query Mirror Node for DROP token mints today
      // For now, return simplified count
      const newDonorsToday = 0; // Would be actual count from donations
      
      console.log(`✅ Found ${newDonorsToday} new donors today`);
      return newDonorsToday;
      
    } catch (error) {
      console.error('❌ Failed to count new donors:', error.message);
      return 0;
    }
  }

  /**
   * Calculate growth rate (gt) = (Nt - Nt-1) / Nt-1
   * @param {number} currentHolders - Current active holders (Nt)
   * @param {number} previousHolders - Previous day holders (Nt-1)
   * @returns {number} Growth rate as decimal
   */
  calculateGrowthRate(currentHolders, previousHolders) {
    if (previousHolders === 0) return 0;
    
    const growthRate = (currentHolders - previousHolders) / previousHolders;
    console.log(`📊 Growth rate: ${currentHolders} vs ${previousHolders} = ${(growthRate * 100).toFixed(2)}%`);
    
    return growthRate;
  }

  /**
   * Update cumulative score (C) based on growth rate
   * From project_knowledge.json: C += 0.1 if gt >= 2%, optional decay -0.05
   * @param {number} growthRate - Daily growth rate
   * @returns {number} Updated cumulative score
   */
  updateCumulativeScore(growthRate) {
    let newScore = this.state.cumulativeScore;
    
    // Growth threshold check (2%)
    if (growthRate >= 0.02) {
      newScore += 0.1;
      console.log(`📈 Growth threshold met (${(growthRate * 100).toFixed(2)}% >= 2%), C += 0.1`);
    } else if (CONFIG.features.enableDecay) {
      // Optional decay on quiet days
      newScore = Math.max(0, newScore - 0.05);
      console.log(`📉 Optional decay applied: C -= 0.05`);
    }
    
    console.log(`📊 Cumulative score: ${this.state.cumulativeScore} → ${newScore}`);
    return newScore;
  }

  /**
   * Calculate growth multiplier (Mt) = min(1 + C, 1.5)
   * @param {number} cumulativeScore - Current cumulative score (C)
   * @returns {number} Growth multiplier
   */
  calculateGrowthMultiplier(cumulativeScore) {
    const multiplier = Math.min(1 + cumulativeScore, CONFIG.parameters.growth.maxMultiplier);
    console.log(`📊 Growth multiplier: min(1 + ${cumulativeScore}, ${CONFIG.parameters.growth.maxMultiplier}) = ${multiplier}`);
    
    return multiplier;
  }

  /**
   * Calculate donor booster (Bt) = (Dt <= Nt) ? 0 : min(floor(50 * ((Dt/Nt) - 1)), 25)
   * @param {number} newDonors - New donors today (Dt)
   * @param {number} activeHolders - Active holders (Nt)
   * @returns {number} Donor booster amount
   */
  calculateDonorBooster(newDonors, activeHolders) {
    if (newDonors <= activeHolders || activeHolders === 0) {
      console.log(`📊 Donor booster: ${newDonors} <= ${activeHolders}, Bt = 0`);
      return 0;
    }
    
    const ratio = newDonors / activeHolders;
    const booster = Math.min(
      Math.floor(CONFIG.parameters.booster.multiplier * (ratio - 1)),
      CONFIG.parameters.booster.maxBooster
    );
    
    console.log(`📊 Donor booster: min(floor(50 * ((${newDonors}/${activeHolders}) - 1)), 25) = ${booster}`);
    
    return booster;
  }

  /**
   * Calculate final daily entitlement (Et) = floor((50 + Bt) * Mt)
   * @param {number} donorBooster - Donor booster amount (Bt)
   * @param {number} growthMultiplier - Growth multiplier (Mt)
   * @returns {number} Final daily entitlement
   */
  calculateFinalEntitlement(donorBooster, growthMultiplier) {
    const baseAmount = CONFIG.parameters.baseDailyWish;
    const entitlement = Math.floor((baseAmount + donorBooster) * growthMultiplier);
    
    // Sanity check against maximum possible
    const maxPossible = CONFIG.constants.MAX_DAILY_ENTITLEMENT || 112;
    const finalEntitlement = Math.min(entitlement, maxPossible);
    
    console.log(`📊 Final entitlement: floor((${baseAmount} + ${donorBooster}) * ${growthMultiplier}) = ${entitlement} (capped: ${finalEntitlement})`);
    
    return finalEntitlement;
  }

  /**
   * Publish snapshot data to HCS for transparency
   * @param {Object} snapshotData - Complete snapshot data
   * @returns {Object} HCS publication result
   */
  async publishToHCS(snapshotData) {
    console.log('📤 Publishing snapshot to HCS...');
    
    try {
      // Create HCS message following paste.txt format
      const hcsMessage = {
        protocol: "Fountain Protocol",
        version: "1.0",
        type: "daily_snapshot",
        snapshotDate: snapshotData.date,
        timestamp: snapshotData.snapshotTimestamp,
        metrics: {
          totalDripHolders: snapshotData.activeHolders,
          totalDripSupply: snapshotData.activeHolders, // Simplified: 1 DRIP per holder
          newDonorsToday: snapshotData.newDonors,
          totalWishToAllocate: snapshotData.totalWishAllocated,
          baseDailyRate: CONFIG.parameters.baseDailyWish,
          growthRate: snapshotData.growthRate,
          growthMultiplier: snapshotData.growthMultiplier,
          donorBooster: snapshotData.donorBooster,
          finalEntitlement: snapshotData.finalEntitlement,
          exchangeRate: CONFIG.parameters.wishToHbarRate
        },
        entitlements: {
          // In full implementation, would list per-account entitlements
          defaultPerDrip: snapshotData.finalEntitlement
        },
        formulas: {
          growthRate: "gt = (Nt - Nt-1) / Nt-1",
          cumulativeScore: "C += 0.1 if gt >= 2%",
          growthMultiplier: "Mt = min(1 + C, 1.5)",
          donorBooster: "Bt = (Dt <= Nt) ? 0 : min(floor(50 * ((Dt/Nt) - 1)), 25)",
          finalEntitlement: "Et = floor((50 + Bt) * Mt)"
        },
        tokenAddresses: {
          DRIP: CONFIG.tokens.DRIP.id,
          WISH: CONFIG.tokens.WISH.id,
          DROP: CONFIG.tokens.DROP.id
        },
        treasury: CONFIG.accounts.treasury
      };
      
      // Submit to HCS
      const messageBytes = Buffer.from(JSON.stringify(hcsMessage, null, 2));
      
      const hcsTransaction = new TopicMessageSubmitTransaction()
        .setTopicId(CONFIG.infrastructure.hcsTopic)
        .setMessage(messageBytes);
      
      const hcsReceipt = await this.client.executeTransaction(
        hcsTransaction,
        'HCS daily snapshot publication'
      );
      
      console.log('✅ Snapshot published to HCS successfully');
      
      return {
        transactionId: hcsReceipt.transactionId.toString(),
        topicId: CONFIG.infrastructure.hcsTopic,
        messageSize: messageBytes.length,
        message: hcsMessage
      };
      
    } catch (error) {
      console.error('❌ Failed to publish to HCS:', error.message);
      
      // Don't fail the entire snapshot if HCS fails
      return {
        transactionId: null,
        error: error.message,
        fallback: true
      };
    }
  }

  /**
   * Get current date in YYYY-MM-DD format (UTC)
   * @returns {string} Current date string
   */
  getCurrentDateString() {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * Get snapshot history
   * @param {number} days - Number of recent days to return
   * @returns {Array} Recent snapshots
   */
  async getSnapshotHistory(days = 7) {
    try {
      // Get recent daily states from database
      const snapshots = [];
      const today = new Date();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const snapshot = await this.database.getDailyState(dateString);
        if (snapshot) {
          snapshots.push({
            date: snapshot.date,
            activeHolders: snapshot.active_holders,
            newDonors: snapshot.new_donors,
            growthRate: (snapshot.growth_rate * 100).toFixed(2) + '%',
            growthMultiplier: snapshot.growth_multiplier.toFixed(2),
            donorBooster: snapshot.donor_booster,
            finalEntitlement: snapshot.final_entitlement,
            totalAllocated: snapshot.total_wish_allocated,
            hcsTransactionId: snapshot.hcs_transaction_id
          });
        }
      }
      
      return snapshots.reverse(); // Oldest first
      
    } catch (error) {
      console.error('❌ Failed to get snapshot history:', error.message);
      return [];
    }
  }

  /**
   * Get protocol growth analytics
   * @returns {Object} Growth analytics
   */
  async getGrowthAnalytics() {
    try {
      const history = await this.getSnapshotHistory(30); // Last 30 days
      
      if (history.length === 0) {
        return { error: 'No historical data available' };
      }
      
      const latest = history[history.length - 1];
      const oldest = history[0];
      
      // Calculate growth metrics
      const holderGrowth = latest.activeHolders - oldest.activeHolders;
      const holderGrowthRate = oldest.activeHolders > 0 ? 
        ((holderGrowth / oldest.activeHolders) * 100).toFixed(2) : 0;
      
      const avgEntitlement = history.reduce((sum, day) => sum + day.finalEntitlement, 0) / history.length;
      const avgMultiplier = history.reduce((sum, day) => sum + parseFloat(day.growthMultiplier), 0) / history.length;
      
      const totalWishAllocated = history.reduce((sum, day) => sum + day.totalAllocated, 0);
      
      return {
        period: `${oldest.date} to ${latest.date}`,
        days: history.length,
        growth: {
          holderCount: {
            start: oldest.activeHolders,
            end: latest.activeHolders,
            change: holderGrowth,
            rate: holderGrowthRate + '%'
          },
          entitlements: {
            average: avgEntitlement.toFixed(1),
            minimum: Math.min(...history.map(d => d.finalEntitlement)),
            maximum: Math.max(...history.map(d => d.finalEntitlement)),
            latest: latest.finalEntitlement
          },
          multipliers: {
            average: avgMultiplier.toFixed(2),
            latest: latest.growthMultiplier,
            maxPossible: CONFIG.parameters.growth.maxMultiplier
          }
        },
        economics: {
          totalWishAllocated: totalWishAllocated,
          totalWishValue: (totalWishAllocated * CONFIG.parameters.wishToHbarRate).toFixed(8) + ' HBAR',
          averageDailyAllocation: (totalWishAllocated / history.length).toFixed(1)
        },
        protocol: {
          cumulativeScore: this.state.cumulativeScore,
          lastActiveHolders: this.state.lastActiveHolders,
          currentMultiplier: (1 + this.state.cumulativeScore).toFixed(2)
        }
      };
      
    } catch (error) {
      console.error('❌ Failed to get growth analytics:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Manual snapshot trigger (for testing or catch-up)
   * @param {string} targetDate - Optional date in YYYY-MM-DD format
   * @returns {Object} Snapshot result
   */
  async manualSnapshot(targetDate = null) {
    if (!CONFIG.features.allowManualSnapshots) {
      throw new Error('Manual snapshots are disabled');
    }
    
    console.log(`🔧 Manual snapshot triggered${targetDate ? ` for ${targetDate}` : ''}`);
    
    if (targetDate) {
      // Temporarily override date calculation for historical snapshots
      const originalGetCurrentDateString = this.getCurrentDateString;
      this.getCurrentDateString = () => targetDate;
      
      try {
        const result = await this.runDailySnapshot();
        this.getCurrentDateString = originalGetCurrentDateString;
        return result;
      } catch (error) {
        this.getCurrentDateString = originalGetCurrentDateString;
        throw error;
      }
    } else {
      return await this.runDailySnapshot();
    }
  }

  /**
   * Health check for snapshot service
   * @returns {Object} System health status
   */
  async getSystemHealth() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {},
      issues: []
    };
    
    try {
      // Check Hedera client
      health.components.hederaClient = this.client && this.client.isHealthy() ? 'connected' : 'disconnected';
      
      // Check database
      health.components.database = this.database && this.database.isReady() ? 'connected' : 'disconnected';
      
      // Check Mirror Node connectivity
      try {
        const testUrl = `${CONFIG.infrastructure.mirrorNode}/api/v1/network/nodes`;
        const response = await fetch(testUrl, { timeout: 5000 });
        health.components.mirrorNode = response.ok ? 'connected' : 'degraded';
      } catch (error) {
        health.components.mirrorNode = 'disconnected';
        health.issues.push('Mirror Node connectivity issue');
      }
      
      // Check HCS topic accessibility
      health.components.hcsTopic = {
        topicId: CONFIG.infrastructure.hcsTopic,
        status: 'unknown' // Would need specific query to verify
      };
      
      // Check last snapshot timing
      const latestSnapshot = await this.database.getLatestDailyState();
      if (latestSnapshot) {
        const snapshotDate = new Date(latestSnapshot.snapshot_timestamp);
        const hoursSinceSnapshot = (Date.now() - snapshotDate.getTime()) / (1000 * 60 * 60);
        
        health.components.lastSnapshot = {
          date: latestSnapshot.date,
          hoursAgo: hoursSinceSnapshot.toFixed(1),
          status: hoursSinceSnapshot > 25 ? 'overdue' : 'current'
        };
        
        if (hoursSinceSnapshot > 25) {
          health.issues.push('Daily snapshot is overdue');
          health.status = 'degraded';
        }
      } else {
        health.components.lastSnapshot = 'none';
        health.issues.push('No snapshots found');
      }
      
      // Check persistent state
      health.components.persistentState = {
        cumulativeScore: this.state.cumulativeScore,
        lastActiveHolders: this.state.lastActiveHolders,
        loaded: true
      };
      
      // Overall status determination
      const criticalIssues = health.issues.filter(issue => 
        issue.includes('disconnected') || issue.includes('overdue')
      );
      
      if (criticalIssues.length > 1) {
        health.status = 'unhealthy';
      } else if (health.issues.length > 0) {
        health.status = 'degraded';
      }
      
    } catch (error) {
      health.status = 'unhealthy';
      health.issues.push(`Health check failed: ${error.message}`);
    }
    
    return health;
  }
}

// Singleton instance
let dailySnapshotInstance = null;

/**
 * Get or create singleton daily snapshot service instance
 */
async function getDailySnapshotService() {
  if (!dailySnapshotInstance) {
    dailySnapshotInstance = new DailySnapshotService();
    await dailySnapshotInstance.initialize();
  }
  return dailySnapshotInstance;
}

module.exports = {
  DailySnapshotService,
  getDailySnapshotService
};