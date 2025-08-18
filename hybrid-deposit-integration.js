/**
 * Hybrid Deposit Integration
 * Combines Hedera Contract + Treasury Event Monitor + HCS Coordinator
 * Complete flow: User → Contract → Events → Treasury → HCS → DRIP Mint
 */

const { getHederaDepositContract } = require('./hedera-deposit-contract');
const { getTreasuryEventMonitor } = require('./treasury-event-monitor');
const { getUnifiedProtocolCoordinator } = require('./hcs-unified-protocol-coordinator');
const { CONFIG } = require('./config');

/**
 * Hybrid Deposit Integration Manager
 * Orchestrates the complete hybrid deposit flow
 */
class HybridDepositIntegration {
  constructor() {
    this.depositContract = null;
    this.eventMonitor = null;
    this.coordinator = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the complete hybrid system
   */
  async initialize() {
    console.log('🌊 Initializing Hybrid Deposit Integration...');
    console.log('═'.repeat(70));
    
    try {
      // Initialize all components
      console.log('1️⃣ Initializing Hedera Deposit Contract...');
      this.depositContract = await getHederaDepositContract();
      
      console.log('2️⃣ Initializing Treasury Event Monitor...');
      this.eventMonitor = await getTreasuryEventMonitor();
      
      console.log('3️⃣ Initializing HCS Protocol Coordinator...');
      this.coordinator = await getUnifiedProtocolCoordinator();
      
      // Start event monitoring
      console.log('4️⃣ Starting Treasury Event Monitoring...');
      await this.eventMonitor.startMonitoring();
      
      this.isInitialized = true;
      
      console.log('✅ Hybrid Deposit Integration ready');
      console.log('🎯 Complete Flow Architecture:');
      console.log('   📱 User deposits 1 HBAR → Hedera Contract');
      console.log('   📡 Contract emits HCS event → Treasury Monitor');
      console.log('   🏦 Monitor triggers → HCS Coordinator');
      console.log('   🪙 Coordinator executes → DRIP Mint & Transfer');
      console.log('═'.repeat(70));
      
    } catch (error) {
      console.error('❌ Hybrid system initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Process user deposit through hybrid flow
   * @param {string} userAccountId - User making deposit
   * @param {string} clientNonce - Unique operation identifier (optional)
   * @returns {Object} Complete deposit flow result
   */
  async processUserDeposit(userAccountId, clientNonce = null) {
    if (!this.isInitialized) {
      throw new Error('Hybrid system not initialized. Call initialize() first.');
    }
    
    // Generate nonce if not provided
    if (!clientNonce) {
      clientNonce = `user_deposit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    console.log(`💧 Processing user deposit through hybrid flow`);
    console.log(`👤 User: ${userAccountId}`);
    console.log(`🎲 Client Nonce: ${clientNonce}`);
    console.log(`💰 Deposit: ${CONFIG.parameters.membershipDeposit / CONFIG.constants.HBAR_TO_TINYBAR} HBAR`);
    
    try {
      // Phase 1: Submit to Hedera Deposit Contract
      console.log('\n📋 Phase 1: Hedera Contract Deposit');
      console.log('-'.repeat(50));
      
      const contractResult = await this.depositContract.createMembership(userAccountId, clientNonce);
      
      if (!contractResult.success) {
        throw new Error(`Contract deposit failed: ${contractResult.error}`);
      }
      
      console.log('✅ Contract deposit submitted successfully');
      console.log(`📄 Contract ID: ${contractResult.contractId}`);
      console.log(`💸 Deposit TX: ${contractResult.depositTransaction}`);
      console.log(`📡 HCS Event: ${contractResult.hcsEvent}`);
      
      // Phase 2: Monitor event processing
      console.log('\n👂 Phase 2: Treasury Event Processing');
      console.log('-'.repeat(50));
      
      const processingResult = await this.monitorEventProcessing(clientNonce);
      
      if (!processingResult.success) {
        throw new Error(`Event processing failed: ${processingResult.error}`);
      }
      
      console.log('✅ Treasury event processing completed');
      console.log(`🏦 Treasury Operation: ${processingResult.treasuryOperationId}`);
      console.log(`📡 Coordinator HCS: ${processingResult.coordinatorHcs}`);
      
      // Phase 3: Monitor DRIP minting
      console.log('\n🪙 Phase 3: DRIP Token Minting');
      console.log('-'.repeat(50));
      
      const mintingResult = await this.monitorDripMinting(clientNonce, processingResult.treasuryNonce);
      
      if (!mintingResult.success) {
        throw new Error(`DRIP minting failed: ${mintingResult.error}`);
      }
      
      console.log('✅ DRIP minting completed successfully');
      console.log(`🪙 DRIP Mint TX: ${mintingResult.mintTxId}`);
      console.log(`📤 Transfer TX: ${mintingResult.transferTxId}`);
      console.log(`🧊 Freeze TX: ${mintingResult.freezeTxId}`);
      
      // Phase 4: Final verification
      console.log('\n🔍 Phase 4: Final Verification');
      console.log('-'.repeat(50));
      
      const verification = await this.verifyMembershipCreation(userAccountId, clientNonce);
      
      console.log('🎉 Hybrid Deposit Flow Completed Successfully!');
      console.log('═'.repeat(70));
      
      return {
        success: true,
        userAccount: userAccountId,
        clientNonce: clientNonce,
        flow: 'HYBRID_DEPOSIT_COMPLETE',
        phases: {
          contract: contractResult,
          eventProcessing: processingResult,
          dripMinting: mintingResult,
          verification: verification
        },
        summary: {
          depositAmount: CONFIG.parameters.membershipDeposit,
          depositAmountHbar: CONFIG.parameters.membershipDeposit / CONFIG.constants.HBAR_TO_TINYBAR,
          dripTokensReceived: 1,
          membershipActive: true,
          maxLifetimeWish: CONFIG.parameters.maxWishPerDrip,
          remainingWish: CONFIG.parameters.maxWishPerDrip
        },
        transactions: {
          contractDeposit: contractResult.depositTransaction,
          hcsEvent: contractResult.hcsEvent,
          coordinatorHcs: processingResult.coordinatorHcs,
          dripMint: mintingResult.mintTxId,
          dripTransfer: mintingResult.transferTxId,
          dripFreeze: mintingResult.freezeTxId
        },
        timestamps: {
          started: new Date(),
          contractSubmitted: contractResult.timestamp,
          eventProcessed: processingResult.timestamp,
          dripMinted: mintingResult.timestamp,
          completed: new Date()
        }
      };
      
    } catch (error) {
      console.error('❌ Hybrid deposit flow failed:', error.message);
      
      return {
        success: false,
        userAccount: userAccountId,
        clientNonce: clientNonce,
        error: error.message,
        flow: 'HYBRID_DEPOSIT_FAILED',
        timestamp: new Date()
      };
    }
  }

  /**
   * Monitor event processing by Treasury monitor
   */
  async monitorEventProcessing(clientNonce, timeout = 30000) {
    console.log(`⏳ Monitoring event processing: ${clientNonce}`);
    
    const startTime = Date.now();
    const pollInterval = 2000; // Check every 2 seconds
    
    while (Date.now() - startTime < timeout) {
      try {
        // Check if Treasury monitor has picked up the event
        const processingStatus = this.eventMonitor.getProcessingStatus(clientNonce);
        
        if (processingStatus) {
          console.log(`📊 Processing Status: ${processingStatus.status}`);
          
          if (processingStatus.status === 'COORDINATOR_SUBMITTED') {
            return {
              success: true,
              treasuryOperationId: processingStatus.treasuryNonce,
              coordinatorHcs: processingStatus.coordinatorHcs,
              treasuryNonce: processingStatus.treasuryNonce,
              timestamp: processingStatus.startedAt
            };
          }
          
          if (processingStatus.status === 'FAILED') {
            throw new Error(processingStatus.error || 'Treasury processing failed');
          }
        }
        
        await this.sleep(pollInterval);
        
      } catch (error) {
        console.error(`❌ Error checking processing status: ${error.message}`);
        await this.sleep(pollInterval);
      }
    }
    
    throw new Error(`Event processing timeout after ${timeout}ms`);
  }

  /**
   * Monitor DRIP minting by HCS coordinator
   */
  async monitorDripMinting(clientNonce, treasuryNonce, timeout = 60000) {
    console.log(`⏳ Monitoring DRIP minting: ${treasuryNonce}`);
    
    const startTime = Date.now();
    const pollInterval = 3000; // Check every 3 seconds
    
    while (Date.now() - startTime < timeout) {
      try {
        // Check coordinator operation status
        const coordinatorStatus = this.coordinator.getOperationStatus(treasuryNonce);
        
        if (coordinatorStatus) {
          console.log(`📊 Coordinator Status: ${coordinatorStatus.status}`);
          
          if (coordinatorStatus.status === 'COMPLETED' && coordinatorStatus.result) {
            return {
              success: true,
              mintTxId: coordinatorStatus.result.mintTxId,
              transferTxId: coordinatorStatus.result.transferTxId,
              freezeTxId: coordinatorStatus.result.freezeTxId,
              memberRecordId: coordinatorStatus.result.memberRecordId,
              timestamp: coordinatorStatus.result.completedAt || new Date()
            };
          }
          
          if (coordinatorStatus.status === 'FAILED') {
            throw new Error(coordinatorStatus.result?.error || 'DRIP minting failed');
          }
        }
        
        await this.sleep(pollInterval);
        
      } catch (error) {
        console.error(`❌ Error checking minting status: ${error.message}`);
        await this.sleep(pollInterval);
      }
    }
    
    throw new Error(`DRIP minting timeout after ${timeout}ms`);
  }

  /**
   * Verify membership creation completion
   */
  async verifyMembershipCreation(userAccountId, clientNonce) {
    console.log(`🔍 Verifying membership creation: ${userAccountId}`);
    
    try {
      // Check contract records
      const contractDeposit = this.depositContract.getDeposit(clientNonce);
      const contractMembership = this.depositContract.getMembership(userAccountId);
      
      // Check coordinator database
      const coordinatorDb = this.coordinator.database;
      const memberRecord = await coordinatorDb.getMember(userAccountId);
      
      // Verify DRIP token balance
      const dripBalance = await this.coordinator.getTokenBalance(userAccountId, CONFIG.tokens.DRIP.id);
      
      const verification = {
        contractDeposit: {
          found: !!contractDeposit,
          processed: contractDeposit?.processed || false,
          membershipCreated: contractDeposit?.membershipCreated || false
        },
        contractMembership: {
          found: !!contractMembership,
          status: contractMembership?.status || 'UNKNOWN'
        },
        memberRecord: {
          found: !!memberRecord,
          isActive: memberRecord?.is_active === 1,
          dripTokens: memberRecord?.drip_tokens || 0,
          maxWish: memberRecord?.max_wish_allowed || 0,
          remainingWish: memberRecord?.remaining_wish || 0
        },
        dripBalance: {
          expected: 1,
          actual: dripBalance,
          verified: dripBalance === 1
        }
      };
      
      // Overall verification
      const isVerified = 
        verification.contractDeposit.membershipCreated &&
        verification.memberRecord.isActive &&
        verification.dripBalance.verified;
      
      console.log(`${isVerified ? '✅' : '❌'} Membership verification: ${isVerified ? 'PASSED' : 'FAILED'}`);
      
      if (isVerified) {
        console.log(`🪙 DRIP Balance: ${verification.dripBalance.actual}/1`);
        console.log(`🌟 WISH Quota: ${verification.memberRecord.remainingWish}/${verification.memberRecord.maxWish}`);
        console.log(`👤 Member Status: ${verification.memberRecord.isActive ? 'ACTIVE' : 'INACTIVE'}`);
      }
      
      return {
        verified: isVerified,
        details: verification
      };
      
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      return {
        verified: false,
        error: error.message
      };
    }
  }

  // ═══════════ MANAGEMENT FUNCTIONS ═══════════

  /**
   * Get complete system status
   */
  async getSystemStatus() {
    try {
      const contractHealth = await this.depositContract.getContractHealth();
      const monitorHealth = await this.eventMonitor.getMonitorHealth();
      const coordinatorHealth = await this.coordinator.getSystemHealth();
      
      const overallHealth = 
        contractHealth.status === 'healthy' &&
        monitorHealth.status === 'healthy' &&
        coordinatorHealth.status === 'healthy';
      
      return {
        status: overallHealth ? 'healthy' : 'degraded',
        initialized: this.isInitialized,
        components: {
          depositContract: contractHealth,
          eventMonitor: monitorHealth,
          coordinator: coordinatorHealth
        },
        flow: {
          contractDeployment: !!contractHealth.contractId,
          eventMonitoring: monitorHealth.monitoring,
          coordinatorActive: coordinatorHealth.hcsSubscription === 'active'
        },
        lastUpdated: new Date()
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats() {
    try {
      const contractStats = this.depositContract.getContractStats();
      const monitorStats = this.eventMonitor.getMonitoringStats();
      const coordinatorStats = await this.coordinator.getSystemHealth();
      
      return {
        deposits: {
          total: contractStats.totalDeposits,
          processed: contractStats.processedDeposits,
          completed: contractStats.completedMemberships,
          failed: contractStats.failedDeposits,
          pending: contractStats.pendingProcessing
        },
        events: {
          received: monitorStats.eventStats.totalReceived,
          processed: monitorStats.eventStats.processed,
          failed: monitorStats.eventStats.failed,
          duplicates: monitorStats.eventStats.duplicates
        },
        coordinator: {
          pendingOperations: coordinatorStats.pendingOperations,
          lastSequence: coordinatorStats.lastSequenceNumber,
          treasuryBalance: coordinatorStats.treasuryBalance
        },
        performance: {
          avgProcessingTime: 'TBD', // Could track this
          successRate: contractStats.totalDeposits > 0 ? 
            ((contractStats.completedMemberships / contractStats.totalDeposits) * 100).toFixed(2) : 0
        }
      };
      
    } catch (error) {
      return {
        error: error.message
      };
    }
  }

  /**
   * Stop the hybrid system
   */
  async stop() {
    console.log('🛑 Stopping Hybrid Deposit Integration...');
    
    try {
      if (this.eventMonitor) {
        await this.eventMonitor.stopMonitoring();
      }
      
      this.isInitialized = false;
      console.log('✅ Hybrid system stopped');
      
    } catch (error) {
      console.error('❌ Error stopping hybrid system:', error.message);
    }
  }

  /**
   * Restart the hybrid system
   */
  async restart() {
    console.log('🔄 Restarting Hybrid Deposit Integration...');
    
    await this.stop();
    await this.sleep(2000); // Brief pause
    await this.initialize();
    
    console.log('✅ Hybrid system restarted');
  }

  // ═══════════ UTILITY METHODS ═══════════

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate user account format
   */
  validateUserAccount(userAccountId) {
    if (!userAccountId || typeof userAccountId !== 'string') {
      throw new Error('Invalid user account ID');
    }
    
    if (!userAccountId.match(/^0\.0\.\d+$/)) {
      throw new Error('User account ID must be in format 0.0.XXXXXX');
    }
    
    return true;
  }

  /**
   * Generate unique client nonce
   */
  generateClientNonce(userAccountId) {
    return `hybrid_${userAccountId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
let hybridDepositIntegrationInstance = null;

/**
 * Get or create singleton hybrid deposit integration instance
 */
async function getHybridDepositIntegration() {
  if (!hybridDepositIntegrationInstance) {
    hybridDepositIntegrationInstance = new HybridDepositIntegration();
    await hybridDepositIntegrationInstance.initialize();
  }
  return hybridDepositIntegrationInstance;
}

module.exports = {
  HybridDepositIntegration,
  getHybridDepositIntegration
};