/**
 * Deposit System - Membership Registration
 * Handles 1 HBAR → 1 DRIP membership token flow
 */

const { CONFIG } = require('../config');
const { getTokenOperations } = require('../utils/token-operations');
const { getMembershipDatabase } = require('../database/membership-db');
const { getHederaClient } = require('../utils/hedera-client');

class DepositSystem {
  constructor() {
    this.tokenOps = null;
    this.database = null;
    this.client = null;
  }

  /**
   * Initialize deposit system
   */
  async initialize() {
    console.log('🎫 Initializing Deposit System...');
    
    this.tokenOps = await getTokenOperations();
    this.database = await getMembershipDatabase();
    this.client = await getHederaClient();
    
    console.log('✅ Deposit System initialized');
  }

  /**
   * Process membership deposit (1 HBAR → 1 DRIP)
   * @param {string} accountId - New member account ID
   * @param {number} depositAmount - HBAR amount in tinybars
   * @returns {Object} Complete deposit result
   */
  async processDeposit(accountId, depositAmount) {
    console.log(`🎫 Processing deposit for ${accountId}: ${depositAmount} tinybars`);
    
    try {
      // 1. Validate deposit amount
      await this.validateDeposit(accountId, depositAmount);
      
      // 2. Check for existing membership
      await this.validateNewMember(accountId);
      
      // 3. Execute token operations
      const tokenResult = await this.tokenOps.processMemershipDeposit(accountId, depositAmount);
      
      // 4. Create member record in database
      const memberRecord = await this.database.createMember(accountId, depositAmount);
      
      // 5. Verify DRIP token ownership
      const verified = await this.tokenOps.verifyDripOwnership(accountId);
      if (!verified) {
        throw new Error('DRIP token verification failed after minting');
      }
      
      console.log('✅ Deposit processed successfully');
      
      const result = {
        success: true,
        member: {
          accountId: accountId,
          depositAmount: depositAmount,
          depositAmountHbar: (depositAmount / CONFIG.constants.HBAR_TO_TINYBAR).toFixed(8),
          membershipActive: true,
          dripTokens: 1,
          maxWishAllowed: CONFIG.parameters.maxWishPerDrip,
          remainingWish: CONFIG.parameters.maxWishPerDrip,
          depositDate: memberRecord.deposit_date
        },
        transactions: tokenResult,
        database: {
          recordId: memberRecord.id,
          created: memberRecord.deposit_date
        },
        protocol: {
          treasuryAccount: CONFIG.accounts.treasury,
          dripTokenId: CONFIG.tokens.DRIP.id,
          wishTokenId: CONFIG.tokens.WISH.id
        }
      };
      
      // Log successful deposit
      console.log('📊 Deposit Summary:');
      console.log(`   Member: ${accountId}`);
      console.log(`   Deposit: ${result.member.depositAmountHbar} HBAR`);
      console.log(`   DRIP Token: ${CONFIG.tokens.DRIP.id}`);
      console.log(`   Max WISH: ${CONFIG.parameters.maxWishPerDrip}`);
      console.log(`   Status: Active`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Deposit processing failed:', error.message);
      
      // Return detailed error for debugging
      return {
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
          accountId: accountId,
          depositAmount: depositAmount,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Validate deposit parameters
   * @param {string} accountId - Account ID to validate
   * @param {number} depositAmount - Deposit amount to validate
   */
  async validateDeposit(accountId, depositAmount) {
    console.log('🔍 Validating deposit parameters...');
    
    // Validate account ID format
    if (!accountId || typeof accountId !== 'string') {
      throw new Error('Invalid account ID format');
    }
    
    if (!accountId.match(/^0\.0\.\d+$/)) {
      throw new Error('Account ID must be in format 0.0.XXXXXX');
    }
    
    // Validate deposit amount (exactly 1 HBAR)
    if (depositAmount !== CONFIG.parameters.membershipDeposit) {
      throw new Error(
        `Invalid deposit amount. Expected exactly ${CONFIG.parameters.membershipDeposit} tinybars (1 HBAR), got ${depositAmount}`
      );
    }
    
    // Validate account exists and has sufficient balance
    await this.validateAccountBalance(accountId, depositAmount);
    
    console.log('✅ Deposit validation passed');
  }

  /**
   * Validate account balance
   * @param {string} accountId - Account to check
   * @param {number} requiredAmount - Required balance in tinybars
   */
  async validateAccountBalance(accountId) {
    try {
      const { AccountBalanceQuery, AccountId } = require('@hashgraph/sdk');
      
      const balanceQuery = new AccountBalanceQuery()
        .setAccountId(AccountId.fromString(accountId));
      
      const balance = await this.client.executeQuery(
        balanceQuery,
        `Balance check for ${accountId}`
      );
      
      const hbarBalance = balance.hbars.toTinybars().toNumber();
      const requiredWithFees = CONFIG.parameters.membershipDeposit + 50000000; // +0.5 HBAR for fees
      
      if (hbarBalance < requiredWithFees) {
        throw new Error(
          `Insufficient HBAR balance. Has ${(hbarBalance / CONFIG.constants.HBAR_TO_TINYBAR).toFixed(8)} HBAR, needs ~${(requiredWithFees / CONFIG.constants.HBAR_TO_TINYBAR).toFixed(2)} HBAR`
        );
      }
      
      console.log(`💰 Account balance verified: ${balance.hbars.toString()}`);
      
    } catch (error) {
      if (error.message.includes('INVALID_ACCOUNT_ID')) {
        throw new Error(`Account ${accountId} does not exist on Hedera network`);
      }
      throw error;
    }
  }

  /**
   * Validate that account is not already a member
   * @param {string} accountId - Account to check
   */
  async validateNewMember(accountId) {
    console.log('🔍 Checking for existing membership...');
    
    // Check database for existing membership
    const existingMember = await this.database.getMember(accountId);
    if (existingMember && existingMember.is_active) {
      throw new Error(`Account ${accountId} is already an active member`);
    }
    
    // Check on-chain DRIP token balance
    const dripBalance = await this.tokenOps.getTokenBalance(accountId, CONFIG.tokens.DRIP.id);
    if (dripBalance > 0) {
      throw new Error(`Account ${accountId} already holds ${dripBalance} DRIP tokens`);
    }
    
    console.log('✅ New member validation passed');
  }

  /**
   * Get deposit requirements and information
   * @returns {Object} Deposit requirements
   */
  getDepositInfo() {
    return {
      requirements: {
        depositAmount: CONFIG.parameters.membershipDeposit,
        depositAmountHbar: CONFIG.parameters.membershipDeposit / CONFIG.constants.HBAR_TO_TINYBAR,
        estimatedFees: 0.1, // HBAR
        minimumAccountBalance: 1.1 // HBAR
      },
      benefits: {
        dripTokens: 1,
        maxLifetimeWish: CONFIG.parameters.maxWishPerDrip,
        dailyWishBase: CONFIG.parameters.baseDailyWish,
        redemptionRate: CONFIG.parameters.wishToHbarRate,
        maxLifetimeValue: CONFIG.parameters.maxWishPerDrip * CONFIG.parameters.wishToHbarRate
      },
      tokens: {
        drip: {
          id: CONFIG.tokens.DRIP.id,
          name: CONFIG.tokens.DRIP.name,
          symbol: CONFIG.tokens.DRIP.symbol,
          transferable: false,
          purpose: 'Membership verification'
        },
        wish: {
          id: CONFIG.tokens.WISH.id,
          name: CONFIG.tokens.WISH.name,
          symbol: CONFIG.tokens.WISH.symbol,
          transferable: true,
          purpose: 'Reward tokens'
        }
      },
      process: [
        'Validate 1 HBAR deposit amount',
        'Check account eligibility',
        'Associate account with DRIP and WISH tokens',
        'Mint 1 DRIP membership token',
        'Transfer DRIP to member account',
        'Apply freeze (make non-transferable)',
        'Create member record with lifetime quota',
        'Member can begin claiming daily WISH rewards'
      ]
    };
  }

  /**
   * Check deposit eligibility for account
   * @param {string} accountId - Account to check
   * @returns {Object} Eligibility status
   */
  async checkEligibility(accountId) {
    try {
      console.log(`🔍 Checking eligibility for ${accountId}...`);
      
      const results = {
        accountId: accountId,
        eligible: true,
        checks: {},
        issues: []
      };
      
      // Check 1: Account exists and has balance
      try {
        await this.validateAccountBalance(accountId);
        results.checks.accountBalance = true;
      } catch (error) {
        results.checks.accountBalance = false;
        results.issues.push(`Account balance: ${error.message}`);
        results.eligible = false;
      }
      
      // Check 2: Not already a member
      try {
        await this.validateNewMember(accountId);
        results.checks.newMember = true;
      } catch (error) {
        results.checks.newMember = false;
        results.issues.push(`Membership status: ${error.message}`);
        results.eligible = false;
      }
      
      // Check 3: Token associations (optional check)
      try {
        const dripBalance = await this.tokenOps.getTokenBalance(accountId, CONFIG.tokens.DRIP.id);
        const wishBalance = await this.tokenOps.getTokenBalance(accountId, CONFIG.tokens.WISH.id);
        
        results.checks.tokenAssociations = {
          drip: dripBalance !== null,
          wish: wishBalance !== null,
          currentDripBalance: dripBalance,
          currentWishBalance: wishBalance
        };
      } catch (error) {
        results.checks.tokenAssociations = false;
        results.issues.push(`Token association check failed: ${error.message}`);
      }
      
      console.log(`${results.eligible ? '✅' : '❌'} Eligibility check completed`);
      return results;
      
    } catch (error) {
      console.error('❌ Eligibility check failed:', error.message);
      return {
        accountId: accountId,
        eligible: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get recent deposits for monitoring
   * @param {number} limit - Number of recent deposits to return
   * @returns {Array} Recent deposit records
   */
  async getRecentDeposits(limit = 10) {
    try {
      const members = await this.database.getActiveMembers();
      
      return members
        .sort((a, b) => new Date(b.deposit_date) - new Date(a.deposit_date))
        .slice(0, limit)
        .map(member => ({
          accountId: member.account_id,
          depositAmount: member.deposited_hbar,
          depositAmountHbar: (member.deposited_hbar / CONFIG.constants.HBAR_TO_TINYBAR).toFixed(8),
          depositDate: member.deposit_date,
          dripTokens: member.drip_tokens,
          totalWishClaimed: member.total_wish_claimed,
          remainingWish: member.remaining_wish,
          isActive: member.is_active === 1,
          lifecycleCount: member.lifecycle_count
        }));
        
    } catch (error) {
      console.error('❌ Failed to get recent deposits:', error.message);
      return [];
    }
  }

  /**
   * Health check for deposit system
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
      // Check token operations
      health.components.tokenOperations = this.tokenOps ? 'connected' : 'disconnected';
      
      // Check database
      health.components.database = this.database && this.database.isReady() ? 'connected' : 'disconnected';
      
      // Check Hedera client
      health.components.hederaClient = this.client && this.client.isHealthy() ? 'connected' : 'disconnected';
      
      // Check treasury balance
      const { AccountBalanceQuery, AccountId } = require('@hashgraph/sdk');
      const treasuryBalance = await new AccountBalanceQuery()
        .setAccountId(AccountId.fromString(CONFIG.accounts.treasury))
        .execute(this.client.getClient());
      
      const treasuryHbar = treasuryBalance.hbars.toTinybars().toNumber();
      health.components.treasuryBalance = {
        amount: treasuryHbar,
        amountHbar: (treasuryHbar / CONFIG.constants.HBAR_TO_TINYBAR).toFixed(8),
        sufficient: treasuryHbar > CONFIG.monitoring.alerts.treasuryLowBalance
      };
      
      if (treasuryHbar < CONFIG.monitoring.alerts.treasuryLowBalance) {
        health.issues.push('Treasury balance is low');
        health.status = 'degraded';
      }
      
      // Check if any components are disconnected
      const disconnectedComponents = Object.entries(health.components)
        .filter(([key, value]) => value === 'disconnected' || (typeof value === 'object' && !value.sufficient))
        .map(([key]) => key);
      
      if (disconnectedComponents.length > 0) {
        health.issues.push(`Disconnected components: ${disconnectedComponents.join(', ')}`);
        health.status = disconnectedComponents.length > 1 ? 'unhealthy' : 'degraded';
      }
      
    } catch (error) {
      health.status = 'unhealthy';
      health.issues.push(`Health check failed: ${error.message}`);
    }
    
    return health;
  }
}

// Singleton instance
let depositSystemInstance = null;

/**
 * Get or create singleton deposit system instance
 */
async function getDepositSystem() {
  if (!depositSystemInstance) {
    depositSystemInstance = new DepositSystem();
    await depositSystemInstance.initialize();
  }
  return depositSystemInstance;
}

module.exports = {
  DepositSystem,
  getDepositSystem
};