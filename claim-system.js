/**
 * Claim System - Daily WISH Token Distribution
 * Handles daily entitlement claims with lifetime quota enforcement
 */

const { CONFIG } = require('../config');
const { getTokenOperations } = require('../utils/token-operations');
const { getMembershipDatabase } = require('../database/membership-db');

class ClaimSystem {
  constructor() {
    this.tokenOps = null;
    this.database = null;
    this.lastProcessedClaims = new Map(); // Rate limiting cache
  }

  /**
   * Initialize claim system
   */
  async initialize() {
    console.log('🌟 Initializing Claim System...');
    
    this.tokenOps = await getTokenOperations();
    this.database = await getMembershipDatabase();
    
    console.log('✅ Claim System initialized');
  }

  /**
   * Process WISH token claim for member
   * @param {string} accountId - Member account ID
   * @param {number} claimAmount - Amount of WISH to claim
   * @returns {Object} Claim result
   */
  async processClaim(accountId, claimAmount) {
    console.log(`🌟 Processing claim for ${accountId}: ${claimAmount} WISH`);
    
    try {
      // 1. Validate claim request
      await this.validateClaim(accountId, claimAmount);
      
      // 2. Check rate limiting
      await this.checkRateLimit(accountId);
      
      // 3. Get member record and validate quota
      const member = await this.validateMemberQuota(accountId, claimAmount);
      
      // 4. Verify on-chain DRIP ownership
      const hasDrip = await this.tokenOps.verifyDripOwnership(accountId);
      if (!hasDrip) {
        throw new Error('DRIP token verification failed - account must hold exactly 1 DRIP');
      }
      
      // 5. Execute token minting and transfer
      const tokenResult = await this.tokenOps.mintWishTokens(accountId, claimAmount);
      
      // 6. Update member record in database
      await this.database.updateMemberClaim(accountId, claimAmount);
      
      // 7. Record claim transaction
      const claimRecord = await this.recordClaim(accountId, claimAmount, member, tokenResult);
      
      // 8. Check for AutoRelease trigger
      const updatedMember = await this.database.getMember(accountId);
      let autoReleaseResult = null;
      
      if (updatedMember.lifetime_cap_reached) {
        autoReleaseResult = await this.processAutoRelease(accountId);
      }
      
      // 9. Update rate limiting
      this.updateRateLimit(accountId);
      
      console.log('✅ Claim processed successfully');
      
      const result = {
        success: true,
        claim: {
          accountId: accountId,
          claimAmount: claimAmount,
          claimDate: claimRecord.claimDate,
          transactionId: tokenResult.transferTxId,
          cumulativeClaimed: claimRecord.cumulativeClaimed,
          remainingQuota: claimRecord.remainingQuota
        },
        member: {
          totalWishClaimed: updatedMember.total_wish_claimed,
          remainingWish: updatedMember.remaining_wish,
          maxWishAllowed: updatedMember.max_wish_allowed,
          lifetimeCapReached: updatedMember.lifetime_cap_reached === 1,
          isActive: updatedMember.is_active === 1,
          lifecycleCount: updatedMember.lifecycle_count
        },
        transactions: tokenResult,
        autoRelease: autoReleaseResult,
        protocol: {
          baseDailyWish: CONFIG.parameters.baseDailyWish,
          maxWishPerDrip: CONFIG.parameters.maxWishPerDrip,
          wishToHbarRate: CONFIG.parameters.wishToHbarRate
        }
      };
      
      // Log successful claim
      console.log('📊 Claim Summary:');
      console.log(`   Member: ${accountId}`);
      console.log(`   Claimed: ${claimAmount} WISH`);
      console.log(`   Total Claimed: ${result.member.totalWishClaimed}/${result.member.maxWishAllowed}`);
      console.log(`   Remaining: ${result.member.remainingWish} WISH`);
      console.log(`   At Cap: ${result.member.lifetimeCapReached ? 'Yes' : 'No'}`);
      
      if (autoReleaseResult) {
        console.log(`   AutoRelease: Triggered (${autoReleaseResult.refundAmountHbar} HBAR refund)`);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Claim processing failed:', error.message);
      
      return {
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
          accountId: accountId,
          claimAmount: claimAmount,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Validate claim request parameters
   * @param {string} accountId - Account ID to validate
   * @param {number} claimAmount - Claim amount to validate
   */
  async validateClaim(accountId, claimAmount) {
    console.log('🔍 Validating claim parameters...');
    
    // Validate account ID
    if (!accountId || typeof accountId !== 'string') {
      throw new Error('Invalid account ID format');
    }
    
    if (!accountId.match(/^0\.0\.\d+$/)) {
      throw new Error('Account ID must be in format 0.0.XXXXXX');
    }
    
    // Validate claim amount
    if (!Number.isInteger(claimAmount) || claimAmount <= 0) {
      throw new Error('Claim amount must be a positive integer');
    }
    
    if (claimAmount > CONFIG.parameters.baseDailyWish * 10) { // Allow up to 10x daily for batching
      throw new Error(`Claim amount too large. Maximum ${CONFIG.parameters.baseDailyWish * 10} WISH per claim`);
    }
    
    console.log('✅ Claim validation passed');
  }

  /**
   * Check rate limiting for claims
   * @param {string} accountId - Account to check
   */
  async checkRateLimit(accountId) {
    if (!CONFIG.security.claimCooldown) return;
    
    const lastClaim = this.lastProcessedClaims.get(accountId);
    if (lastClaim) {
      const timeSince = Date.now() - lastClaim;
      if (timeSince < CONFIG.security.claimCooldown) {
        const remainingTime = Math.ceil((CONFIG.security.claimCooldown - timeSince) / 1000);
        throw new Error(`Rate limit: Please wait ${remainingTime} seconds before next claim`);
      }
    }
  }

  /**
   * Validate member exists and has sufficient quota
   * @param {string} accountId - Member account ID
   * @param {number} claimAmount - Amount to claim
   * @returns {Object} Member record
   */
  async validateMemberQuota(accountId, claimAmount) {
    console.log('🔍 Validating member quota...');
    
    const member = await this.database.getMember(accountId);
    if (!member) {
      throw new Error(`Account ${accountId} is not a registered member`);
    }
    
    if (!member.is_active) {
      throw new Error(`Member ${accountId} is not active`);
    }
    
    if (member.lifetime_cap_reached) {
      throw new Error(`Member ${accountId} has already reached lifetime cap`);
    }
    
    if (member.remaining_wish < claimAmount) {
      throw new Error(
        `Insufficient quota. Requested ${claimAmount} WISH, but only ${member.remaining_wish} remaining`
      );
    }
    
    console.log(`✅ Member quota validated: ${member.remaining_wish} WISH remaining`);
    return member;
  }

  /**
   * Record claim transaction in database
   * @param {string} accountId - Member account ID
   * @param {number} claimAmount - Amount claimed
   * @param {Object} member - Member record
   * @param {Object} tokenResult - Token operation result
   * @returns {Object} Claim record
   */
  async recordClaim(accountId, claimAmount, member, tokenResult) {
    const claimData = {
      accountId: accountId,
      claimAmount: claimAmount,
      claimDate: new Date().toISOString(),
      dailyEntitlement: CONFIG.parameters.baseDailyWish, // Simplified for now
      cumulativeClaimed: member.total_wish_claimed + claimAmount,
      remainingQuota: member.remaining_wish - claimAmount,
      transactionId: tokenResult.transferTxId,
      blockTimestamp: null // Could be populated from receipt if needed
    };
    
    return await this.database.recordClaim(claimData);
  }

  /**
   * Process AutoRelease when member reaches lifetime cap
   * @param {string} accountId - Member account ID
   * @returns {Object} AutoRelease result
   */
  async processAutoRelease(accountId) {
    console.log(`🔄 Processing AutoRelease for ${accountId}...`);
    
    try {
      // 1. Update member status in database
      const releaseData = await this.database.processAutoRelease(accountId);
      
      // 2. Wipe DRIP token from member account
      const wipeResult = await this.tokenOps.wipeDripToken(accountId);
      
      // 3. Calculate and send refund (0.8 HBAR to member)
      const refundAmount = Math.floor(CONFIG.parameters.memberRefund * CONFIG.constants.HBAR_TO_TINYBAR);
      const refundResult = await this.tokenOps.transferHbar(
        CONFIG.accounts.treasury,
        accountId,
        refundAmount
      );
      
      console.log('✅ AutoRelease completed successfully');
      
      return {
        accountId: accountId,
        releaseDate: releaseData.releaseDate,
        dripWiped: true,
        wipeTransactionId: wipeResult.txId,
        refundAmount: refundAmount,
        refundAmountHbar: (refundAmount / CONFIG.constants.HBAR_TO_TINYBAR).toFixed(8),
        refundTransactionId: refundResult.txId,
        treasuryFee: Math.floor(CONFIG.parameters.treasuryFee * CONFIG.constants.HBAR_TO_TINYBAR),
        treasuryFeeHbar: CONFIG.parameters.treasuryFee.toFixed(8),
        newLifecycleCount: releaseData.lifecycleCount || 1
      };
      
    } catch (error) {
      console.error('❌ AutoRelease failed:', error.message);
      throw new Error(`AutoRelease failed: ${error.message}`);
    }
  }

  /**
   * Update rate limiting cache
   * @param {string} accountId - Account ID
   */
  updateRateLimit(accountId) {
    this.lastProcessedClaims.set(accountId, Date.now());
    
    // Clean up old entries (keep only last hour)
    const oneHourAgo = Date.now() - 3600000;
    for (const [account, timestamp] of this.lastProcessedClaims.entries()) {
      if (timestamp < oneHourAgo) {
        this.lastProcessedClaims.delete(account);
      }
    }
  }

  /**
   * Calculate daily entitlement for member (simplified version)
   * In full implementation, this would use oracle data with booster/multiplier formulas
   * @param {string} accountId - Member account ID
   * @returns {Object} Daily entitlement calculation
   */
  async calculateDailyEntitlement(accountId) {
    console.log(`📊 Calculating daily entitlement for ${accountId}...`);
    
    try {
      // Verify DRIP ownership
      const hasDrip = await this.tokenOps.verifyDripOwnership(accountId);
      if (!hasDrip) {
        return {
          eligible: false,
          reason: 'No DRIP token held',
          entitlement: 0
        };
      }
      
      // Get member record
      const member = await this.database.getMember(accountId);
      if (!member || !member.is_active) {
        return {
          eligible: false,
          reason: 'Member not active',
          entitlement: 0
        };
      }
      
      if (member.lifetime_cap_reached) {
        return {
          eligible: false,
          reason: 'Lifetime cap reached',
          entitlement: 0
        };
      }
      
      // Simplified calculation (base daily amount)
      // In full implementation, this would incorporate:
      // - Growth multiplier (Mt)
      // - Donor booster (Bt)  
      // - Oracle-provided daily state
      const baseEntitlement = CONFIG.parameters.baseDailyWish;
      const maxClaimable = Math.min(baseEntitlement, member.remaining_wish);
      
      return {
        eligible: true,
        entitlement: maxClaimable,
        calculation: {
          baseDailyWish: CONFIG.parameters.baseDailyWish,
          growthMultiplier: 1.0, // Would come from oracle
          donorBooster: 0,       // Would come from oracle
          finalEntitlement: baseEntitlement,
          cappedByQuota: maxClaimable
        },
        quota: {
          totalClaimed: member.total_wish_claimed,
          maxAllowed: member.max_wish_allowed,
          remaining: member.remaining_wish,
          percentageUsed: ((member.total_wish_claimed / member.max_wish_allowed) * 100).toFixed(2)
        }
      };
      
    } catch (error) {
      console.error('❌ Daily entitlement calculation failed:', error.message);
      return {
        eligible: false,
        reason: `Calculation error: ${error.message}`,
        entitlement: 0
      };
    }
  }

  /**
   * Get claimable amount for member based on daily entitlements
   * @param {string} accountId - Member account ID
   * @param {number} days - Number of days to calculate for (default 1)
   * @returns {Object} Claimable amount details
   */
  async getClaimableAmount(accountId, days = 1) {
    try {
      const entitlement = await this.calculateDailyEntitlement(accountId);
      
      if (!entitlement.eligible) {
        return {
          claimable: 0,
          reason: entitlement.reason,
          details: entitlement
        };
      }
      
      const claimablePerDay = entitlement.entitlement;
      const totalClaimable = Math.min(claimablePerDay * days, entitlement.quota.remaining);
      
      return {
        claimable: totalClaimable,
        details: {
          dailyEntitlement: claimablePerDay,
          requestedDays: days,
          cappedByQuota: totalClaimable < (claimablePerDay * days),
          quota: entitlement.quota,
          calculation: entitlement.calculation
        }
      };
      
    } catch (error) {
      console.error('❌ Get claimable amount failed:', error.message);
      return {
        claimable: 0,
        reason: `Error: ${error.message}`
      };
    }
  }

  /**
   * Batch process claims for multiple days
   * @param {string} accountId - Member account ID
   * @param {number} days - Number of days to claim for
   * @returns {Object} Batch claim result
   */
  async processBatchClaim(accountId, days) {
    console.log(`🌟 Processing batch claim for ${accountId}: ${days} days`);
    
    if (days > CONFIG.parameters.maxClaimDays) {
      throw new Error(`Batch claim limited to ${CONFIG.parameters.maxClaimDays} days maximum`);
    }
    
    const claimableInfo = await this.getClaimableAmount(accountId, days);
    
    if (claimableInfo.claimable === 0) {
      return {
        success: false,
        reason: claimableInfo.reason,
        details: claimableInfo.details
      };
    }
    
    // Process as single claim with total amount
    return await this.processClaim(accountId, claimableInfo.claimable);
  }

  /**
   * Get claim history for member
   * @param {string} accountId - Member account ID
   * @param {number} limit - Number of recent claims to return
   * @returns {Array} Claim history
   */
  async getClaimHistory(accountId, limit = 20) {
    try {
      const claims = await this.database.getClaimHistory(accountId, limit);
      
      return claims.map(claim => ({
        claimDate: claim.claim_date,
        claimAmount: claim.claim_amount,
        dailyEntitlement: claim.daily_entitlement,
        cumulativeClaimed: claim.cumulative_claimed,
        remainingQuota: claim.remaining_quota,
        transactionId: claim.transaction_id,
        blockTimestamp: claim.block_timestamp
      }));
      
    } catch (error) {
      console.error('❌ Failed to get claim history:', error.message);
      return [];
    }
  }

  /**
   * Get claim system statistics
   * @returns {Object} Claim statistics
   */
  async getClaimStats() {
    try {
      const stats = await this.database.getProtocolStats();
      
      return {
        totalMembers: stats.totalMembers,
        activeMembers: stats.activeMembers,
        totalWishClaimed: stats.totalWishClaimed,
        membersAtCap: stats.membersAtCap,
        autoReleases: stats.autoReleases,
        averageClaimedPerMember: stats.activeMembers > 0 ? 
          (stats.totalWishClaimed / stats.activeMembers).toFixed(2) : 0,
        protocolUtilization: stats.activeMembers > 0 ? 
          ((stats.totalWishClaimed / (stats.activeMembers * CONFIG.parameters.maxWishPerDrip)) * 100).toFixed(2) : 0,
        parameters: {
          baseDailyWish: CONFIG.parameters.baseDailyWish,
          maxWishPerDrip: CONFIG.parameters.maxWishPerDrip,
          maxLifetimeValue: CONFIG.parameters.maxWishPerDrip * CONFIG.parameters.wishToHbarRate
        }
      };
      
    } catch (error) {
      console.error('❌ Failed to get claim stats:', error.message);
      return null;
    }
  }

  /**
   * Health check for claim system
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
      // Check dependencies
      health.components.tokenOperations = this.tokenOps ? 'connected' : 'disconnected';
      health.components.database = this.database && this.database.isReady() ? 'connected' : 'disconnected';
      
      // Check rate limiting system
      health.components.rateLimiting = {
        activeLimits: this.lastProcessedClaims.size,
        status: 'operational'
      };
      
      // Get recent claim activity
      const recentClaims = await this.database.getProtocolStats();
      health.components.claimActivity = {
        totalMembers: recentClaims.totalMembers,
        activeMembers: recentClaims.activeMembers,
        membersAtCap: recentClaims.membersAtCap
      };
      
      // Check for issues
      const disconnectedComponents = Object.entries(health.components)
        .filter(([key, value]) => value === 'disconnected')
        .map(([key]) => key);
      
      if (disconnectedComponents.length > 0) {
        health.issues.push(`Disconnected components: ${disconnectedComponents.join(', ')}`);
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
let claimSystemInstance = null;

/**
 * Get or create singleton claim system instance
 */
async function getClaimSystem() {
  if (!claimSystemInstance) {
    claimSystemInstance = new ClaimSystem();
    await claimSystemInstance.initialize();
  }
  return claimSystemInstance;
}

module.exports = {
  ClaimSystem,
  getClaimSystem
};