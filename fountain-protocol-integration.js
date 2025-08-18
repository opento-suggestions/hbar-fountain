/**
 * Fountain Protocol Integration
 * Complete lifecycle management for DRIP membership with HCS coordination
 * 
 * Full Member Journey:
 * 1. Deposit 1 HBAR → Mint 1 DRIP (membership creation)
 * 2. Claim WISH tokens → Up to 1000 WISH lifetime cap
 * 3. Redeem DRIP → Reclaim 0.8 HBAR (AutoRelease when cap reached)
 */

const { getUnifiedProtocolCoordinator } = require('./hcs-unified-protocol-coordinator');
const { CONFIG } = require('./config');

/**
 * Fountain Protocol Integration Manager
 * Orchestrates complete member lifecycle with HCS coordination
 */
class FountainProtocolIntegration {
  constructor() {
    this.coordinator = null;
    this.memberJourneys = new Map(); // Track member lifecycle progress
  }

  /**
   * Initialize the complete protocol integration
   */
  async initialize() {
    console.log('🌊 Initializing Fountain Protocol Integration...');
    
    this.coordinator = await getUnifiedProtocolCoordinator();
    
    console.log('✅ Fountain Protocol Integration ready');
    console.log('🎯 Available Operations:');
    console.log('   💧 Create Membership (1 HBAR → 1 DRIP)');
    console.log('   🌟 Claim WISH Rewards (up to 1000 lifetime)');
    console.log('   💰 Redeem DRIP (reclaim 0.8 HBAR)');
  }

  // ═══════════ COMPLETE MEMBER LIFECYCLE ═══════════

  /**
   * Create new membership (Deposit → DRIP mint)
   * @param {string} memberAccountId - New member account
   * @param {number} depositAmount - HBAR deposit (must be exactly 1 HBAR)
   * @returns {Object} Membership creation result
   */
  async createMembership(memberAccountId, depositAmount = CONFIG.parameters.membershipDeposit) {
    const operationId = `membership_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`💧 Creating membership for ${memberAccountId}`);
    console.log(`📊 Deposit: ${depositAmount / CONFIG.constants.HBAR_TO_TINYBAR} HBAR`);
    console.log(`🎲 Operation ID: ${operationId}`);
    
    try {
      // 1. Validate membership creation requirements
      await this.validateMembershipCreation(memberAccountId, depositAmount);
      
      // 2. Submit to HCS for consensus coordination
      const hcsResult = await this.coordinator.submitDripMintRequest(
        memberAccountId,
        depositAmount,
        operationId
      );
      
      // 3. Track member journey
      this.trackMemberJourney(memberAccountId, 'MEMBERSHIP_CREATING', {
        operationId: operationId,
        depositAmount: depositAmount,
        hcsTransactionId: hcsResult.hcsTransactionId,
        startedAt: new Date()
      });
      
      console.log(`✅ Membership creation submitted to HCS consensus`);
      
      return {
        success: true,
        operationId: operationId,
        memberAccount: memberAccountId,
        hcsSubmission: hcsResult,
        expectedOutcome: {
          dripTokens: 1,
          membershipActive: true,
          maxLifetimeWish: CONFIG.parameters.maxWishPerDrip,
          remainingWish: CONFIG.parameters.maxWishPerDrip
        },
        monitoring: {
          checkStatusWith: 'getMembershipStatus',
          expectedCompletionTime: '10-20 seconds'
        }
      };
      
    } catch (error) {
      console.error('❌ Membership creation failed:', error.message);
      return {
        success: false,
        error: error.message,
        memberAccount: memberAccountId,
        operationId: operationId
      };
    }
  }

  /**
   * Claim WISH rewards with 1000-cap enforcement
   * @param {string} memberAccountId - Member claiming rewards
   * @param {number} claimAmount - WISH tokens to claim
   * @returns {Object} Claim result
   */
  async claimWishRewards(memberAccountId, claimAmount) {
    const operationId = `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🌟 Claiming WISH rewards for ${memberAccountId}`);
    console.log(`📊 Claim Amount: ${claimAmount} WISH`);
    console.log(`🎲 Operation ID: ${operationId}`);
    
    try {
      // 1. Pre-validate claim eligibility
      const eligibility = await this.validateWishClaimEligibility(memberAccountId, claimAmount);
      
      // 2. Submit to HCS for consensus coordination
      const hcsResult = await this.coordinator.submitWishClaimRequest(
        memberAccountId,
        claimAmount,
        operationId
      );
      
      // 3. Track member journey
      this.updateMemberJourney(memberAccountId, 'CLAIMING_WISH', {
        operationId: operationId,
        claimAmount: claimAmount,
        preClaimQuota: eligibility.remainingQuota,
        hcsTransactionId: hcsResult.hcsTransactionId
      });
      
      console.log(`✅ WISH claim submitted to HCS consensus`);
      
      return {
        success: true,
        operationId: operationId,
        memberAccount: memberAccountId,
        claimAmount: claimAmount,
        hcsSubmission: hcsResult,
        eligibility: eligibility,
        expectedOutcome: {
          wishTokensReceived: claimAmount,
          newTotalClaimed: eligibility.totalClaimed + claimAmount,
          remainingQuota: eligibility.remainingQuota - claimAmount,
          willReachCap: (eligibility.totalClaimed + claimAmount) >= CONFIG.parameters.maxWishPerDrip
        },
        monitoring: {
          checkStatusWith: 'getClaimStatus',
          expectedCompletionTime: '10-20 seconds'
        }
      };
      
    } catch (error) {
      console.error('❌ WISH claim failed:', error.message);
      return {
        success: false,
        error: error.message,
        memberAccount: memberAccountId,
        operationId: operationId
      };
    }
  }

  /**
   * Redeem DRIP for HBAR refund (complete lifecycle)
   * @param {string} memberAccountId - Member redeeming DRIP
   * @returns {Object} Redemption result
   */
  async redeemDripForHbar(memberAccountId) {
    const operationId = `redeem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`💰 Redeeming DRIP for HBAR: ${memberAccountId}`);
    console.log(`🎲 Operation ID: ${operationId}`);
    
    try {
      // 1. Validate redemption eligibility
      const eligibility = await this.validateDripRedemptionEligibility(memberAccountId);
      
      // 2. Submit to HCS for consensus coordination
      const hcsResult = await this.coordinator.submitDripRedeemRequest(
        memberAccountId,
        operationId
      );
      
      // 3. Track member journey completion
      this.updateMemberJourney(memberAccountId, 'REDEEMING_DRIP', {
        operationId: operationId,
        completingLifecycle: true,
        hcsTransactionId: hcsResult.hcsTransactionId
      });
      
      console.log(`✅ DRIP redemption submitted to HCS consensus`);
      
      return {
        success: true,
        operationId: operationId,
        memberAccount: memberAccountId,
        hcsSubmission: hcsResult,
        eligibility: eligibility,
        expectedOutcome: {
          dripTokenWiped: true,
          hbarRefund: CONFIG.parameters.memberRefund,
          treasuryFee: CONFIG.parameters.treasuryFee,
          lifecycleCompleted: true,
          membershipEnded: true
        },
        monitoring: {
          checkStatusWith: 'getRedemptionStatus',
          expectedCompletionTime: '10-20 seconds'
        }
      };
      
    } catch (error) {
      console.error('❌ DRIP redemption failed:', error.message);
      return {
        success: false,
        error: error.message,
        memberAccount: memberAccountId,
        operationId: operationId
      };
    }
  }

  // ═══════════ VALIDATION METHODS ═══════════

  /**
   * Validate membership creation requirements
   */
  async validateMembershipCreation(memberAccountId, depositAmount) {
    console.log('🔍 Validating membership creation...');
    
    // 1. Validate deposit amount (exactly 1 HBAR)
    if (depositAmount !== CONFIG.parameters.membershipDeposit) {
      throw new Error(`Invalid deposit: expected ${CONFIG.parameters.membershipDeposit} tinybars, got ${depositAmount}`);
    }
    
    // 2. Check account format
    if (!memberAccountId.match(/^0\.0\.\d+$/)) {
      throw new Error('Invalid account ID format');
    }
    
    // 3. Verify account balance
    const balance = await this.coordinator.getTokenBalance(memberAccountId, 'HBAR');
    const requiredBalance = depositAmount + 100000000; // +1 HBAR for fees
    
    if (balance < requiredBalance) {
      throw new Error(`Insufficient balance: needs ${requiredBalance / CONFIG.constants.HBAR_TO_TINYBAR} HBAR`);
    }
    
    // 4. Check for existing membership
    const existingDrip = await this.coordinator.getTokenBalance(memberAccountId, CONFIG.tokens.DRIP.id);
    if (existingDrip > 0) {
      throw new Error('Account already holds DRIP membership token');
    }
    
    console.log('✅ Membership creation validation passed');
  }

  /**
   * Validate WISH claim eligibility
   */
  async validateWishClaimEligibility(memberAccountId, claimAmount) {
    console.log('🔍 Validating WISH claim eligibility...');
    
    // Get member data from database
    const member = await this.coordinator.database.getMember(memberAccountId);
    if (!member || !member.is_active) {
      throw new Error('Member not found or inactive');
    }
    
    // Verify DRIP ownership
    const dripBalance = await this.coordinator.getTokenBalance(memberAccountId, CONFIG.tokens.DRIP.id);
    if (dripBalance !== 1) {
      throw new Error(`DRIP verification failed: expected 1, found ${dripBalance}`);
    }
    
    // Check 1000-cap enforcement
    if (member.lifetime_cap_reached) {
      throw new Error('Member has reached 1000 WISH lifetime cap');
    }
    
    if (member.remaining_wish < claimAmount) {
      throw new Error(`Insufficient quota: ${claimAmount} requested, ${member.remaining_wish} remaining`);
    }
    
    console.log(`✅ WISH claim validation passed: ${member.remaining_wish} WISH remaining`);
    
    return {
      totalClaimed: member.total_wish_claimed,
      remainingQuota: member.remaining_wish,
      maxAllowed: member.max_wish_allowed,
      willReachCap: (member.total_wish_claimed + claimAmount) >= CONFIG.parameters.maxWishPerDrip
    };
  }

  /**
   * Validate DRIP redemption eligibility
   */
  async validateDripRedemptionEligibility(memberAccountId) {
    console.log('🔍 Validating DRIP redemption eligibility...');
    
    // Get member data
    const member = await this.coordinator.database.getMember(memberAccountId);
    if (!member) {
      throw new Error('Member not found');
    }
    
    // Must have reached 1000-cap to redeem
    if (!member.lifetime_cap_reached) {
      throw new Error(`Must reach 1000 WISH cap before redemption (current: ${member.total_wish_claimed}/1000)`);
    }
    
    // Verify DRIP ownership
    const dripBalance = await this.coordinator.getTokenBalance(memberAccountId, CONFIG.tokens.DRIP.id);
    if (dripBalance !== 1) {
      throw new Error(`DRIP verification failed: expected 1, found ${dripBalance}`);
    }
    
    // Check Treasury balance for refund
    const treasuryBalance = await this.coordinator.getTreasuryBalance();
    const refundAmount = CONFIG.parameters.memberRefund * CONFIG.constants.HBAR_TO_TINYBAR;
    
    if (treasuryBalance.tinybars < refundAmount) {
      throw new Error('Treasury insufficient for HBAR refund');
    }
    
    console.log(`✅ DRIP redemption validation passed: ${CONFIG.parameters.memberRefund} HBAR refund eligible`);
    
    return {
      totalWishClaimed: member.total_wish_claimed,
      lifecycleCompleted: true,
      expectedRefund: CONFIG.parameters.memberRefund,
      treasuryFee: CONFIG.parameters.treasuryFee
    };
  }

  // ═══════════ MEMBER JOURNEY TRACKING ═══════════

  /**
   * Track member journey progress
   */
  trackMemberJourney(memberAccountId, stage, data) {
    this.memberJourneys.set(memberAccountId, {
      accountId: memberAccountId,
      currentStage: stage,
      stages: [{
        stage: stage,
        timestamp: new Date(),
        data: data
      }],
      startedAt: new Date()
    });
  }

  /**
   * Update member journey
   */
  updateMemberJourney(memberAccountId, stage, data) {
    const journey = this.memberJourneys.get(memberAccountId);
    if (journey) {
      journey.currentStage = stage;
      journey.stages.push({
        stage: stage,
        timestamp: new Date(),
        data: data
      });
      journey.updatedAt = new Date();
    } else {
      this.trackMemberJourney(memberAccountId, stage, data);
    }
  }

  /**
   * Get member journey status
   */
  getMemberJourney(memberAccountId) {
    return this.memberJourneys.get(memberAccountId) || null;
  }

  // ═══════════ STATUS MONITORING ═══════════

  /**
   * Get membership creation status
   */
  async getMembershipStatus(operationId) {
    const status = this.coordinator.getOperationStatus(operationId);
    if (!status) {
      return { found: false, operationId };
    }
    
    return {
      found: true,
      operationId: operationId,
      type: status.type,
      status: status.status,
      submittedAt: status.submittedAt,
      result: status.result,
      progress: this.getProgressDescription(status.status)
    };
  }

  /**
   * Get WISH claim status
   */
  async getClaimStatus(operationId) {
    return await this.getMembershipStatus(operationId); // Same structure
  }

  /**
   * Get DRIP redemption status
   */
  async getRedemptionStatus(operationId) {
    return await this.getMembershipStatus(operationId); // Same structure
  }

  /**
   * Get complete member status and lifecycle position
   */
  async getMemberStatus(memberAccountId) {
    try {
      console.log(`📊 Getting complete status for ${memberAccountId}...`);
      
      // Get database record
      const member = await this.coordinator.database.getMember(memberAccountId);
      
      // Get on-chain token balances
      const dripBalance = await this.coordinator.getTokenBalance(memberAccountId, CONFIG.tokens.DRIP.id);
      const wishBalance = await this.coordinator.getTokenBalance(memberAccountId, CONFIG.tokens.WISH.id);
      
      // Get journey tracking
      const journey = this.getMemberJourney(memberAccountId);
      
      // Determine lifecycle stage
      let lifecycleStage = 'NOT_MEMBER';
      if (member && member.is_active && dripBalance === 1) {
        if (member.lifetime_cap_reached) {
          lifecycleStage = 'CAP_REACHED_REDEEMABLE';
        } else {
          lifecycleStage = 'ACTIVE_CLAIMING';
        }
      } else if (member && !member.is_active) {
        lifecycleStage = 'LIFECYCLE_COMPLETED';
      }
      
      return {
        accountId: memberAccountId,
        lifecycleStage: lifecycleStage,
        membership: {
          isActive: member ? member.is_active === 1 : false,
          hasActiveDrip: dripBalance === 1,
          depositDate: member ? member.deposit_date : null,
          lifecycleCount: member ? member.lifecycle_count : 0
        },
        wishQuota: {
          totalClaimed: member ? member.total_wish_claimed : 0,
          maxAllowed: CONFIG.parameters.maxWishPerDrip,
          remaining: member ? member.remaining_wish : 0,
          capReached: member ? member.lifetime_cap_reached === 1 : false,
          percentageUsed: member ? ((member.total_wish_claimed / CONFIG.parameters.maxWishPerDrip) * 100).toFixed(2) : 0
        },
        tokenBalances: {
          drip: dripBalance,
          wish: wishBalance
        },
        availableActions: this.getAvailableActions(lifecycleStage, member),
        journey: journey,
        lastUpdated: new Date()
      };
      
    } catch (error) {
      console.error('❌ Failed to get member status:', error.message);
      return {
        accountId: memberAccountId,
        error: error.message,
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Get available actions for member based on lifecycle stage
   */
  getAvailableActions(lifecycleStage, member) {
    const actions = [];
    
    switch (lifecycleStage) {
      case 'NOT_MEMBER':
        actions.push({
          action: 'CREATE_MEMBERSHIP',
          description: 'Deposit 1 HBAR to create membership and receive 1 DRIP token',
          method: 'createMembership',
          parameters: ['memberAccountId', 'depositAmount?']
        });
        break;
        
      case 'ACTIVE_CLAIMING':
        actions.push({
          action: 'CLAIM_WISH',
          description: `Claim WISH rewards (${member.remaining_wish} remaining)`,
          method: 'claimWishRewards',
          parameters: ['memberAccountId', 'claimAmount']
        });
        break;
        
      case 'CAP_REACHED_REDEEMABLE':
        actions.push({
          action: 'REDEEM_DRIP',
          description: `Redeem DRIP token for ${CONFIG.parameters.memberRefund} HBAR refund`,
          method: 'redeemDripForHbar',
          parameters: ['memberAccountId']
        });
        break;
        
      case 'LIFECYCLE_COMPLETED':
        actions.push({
          action: 'CREATE_NEW_MEMBERSHIP',
          description: 'Start new lifecycle with fresh 1 HBAR deposit',
          method: 'createMembership',
          parameters: ['memberAccountId', 'depositAmount?']
        });
        break;
    }
    
    return actions;
  }

  /**
   * Get progress description for operation status
   */
  getProgressDescription(status) {
    const descriptions = {
      'HCS_SUBMITTED': 'Waiting for HCS consensus (2-5 seconds)',
      'EXECUTING_HTS': 'Executing Hedera Token Service operations',
      'COMPLETED': 'Operation completed successfully',
      'FAILED': 'Operation failed - check error details'
    };
    
    return descriptions[status] || 'Unknown status';
  }

  // ═══════════ SYSTEM UTILITIES ═══════════

  /**
   * Get complete protocol statistics
   */
  async getProtocolStats() {
    try {
      const stats = await this.coordinator.database.getProtocolStats();
      const systemHealth = await this.coordinator.getSystemHealth();
      
      return {
        members: {
          total: stats.totalMembers,
          active: stats.activeMembers,
          atCap: stats.membersAtCap,
          completed: stats.autoReleases
        },
        tokens: {
          totalWishClaimed: stats.totalWishClaimed,
          avgClaimedPerMember: stats.activeMembers > 0 ? 
            (stats.totalWishClaimed / stats.activeMembers).toFixed(2) : 0,
          protocolUtilization: stats.activeMembers > 0 ? 
            ((stats.totalWishClaimed / (stats.activeMembers * CONFIG.parameters.maxWishPerDrip)) * 100).toFixed(2) : 0
        },
        system: systemHealth,
        parameters: {
          membershipDeposit: CONFIG.parameters.membershipDeposit / CONFIG.constants.HBAR_TO_TINYBAR,
          maxWishPerDrip: CONFIG.parameters.maxWishPerDrip,
          memberRefund: CONFIG.parameters.memberRefund,
          treasuryFee: CONFIG.parameters.treasuryFee,
          wishToHbarRate: CONFIG.parameters.wishToHbarRate
        },
        journeys: {
          tracked: this.memberJourneys.size,
          stages: Array.from(this.memberJourneys.values()).map(j => j.currentStage)
        }
      };
      
    } catch (error) {
      console.error('❌ Failed to get protocol stats:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Get system health with integration status
   */
  async getIntegrationHealth() {
    const coordinatorHealth = await this.coordinator.getSystemHealth();
    
    return {
      ...coordinatorHealth,
      integration: {
        memberJourneys: this.memberJourneys.size,
        coordinator: coordinatorHealth.status,
        allSystemsOperational: coordinatorHealth.status === 'healthy'
      }
    };
  }
}

// Singleton instance
let fountainIntegrationInstance = null;

/**
 * Get or create singleton Fountain Protocol Integration instance
 */
async function getFountainProtocolIntegration() {
  if (!fountainIntegrationInstance) {
    fountainIntegrationInstance = new FountainProtocolIntegration();
    await fountainIntegrationInstance.initialize();
  }
  return fountainIntegrationInstance;
}

module.exports = {
  FountainProtocolIntegration,
  getFountainProtocolIntegration
};