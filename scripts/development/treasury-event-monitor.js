/**
 * Treasury Event Monitor
 * Monitors HCS events from Hedera Deposit Contract
 * Integrates with HCSUnifiedProtocolCoordinator for DRIP minting
 * 
 * Flow: Contract Event → Monitor → HCS Coordinator → DRIP Mint
 */

const {
  TopicMessageQuery,
  AccountId,
  Timestamp
} = require('@hashgraph/sdk');

const { CONFIG } = require('./config');
const { getHederaClient } = require('./hedera-client');
const { getUnifiedProtocolCoordinator } = require('./hcs-unified-protocol-coordinator');
const { getHederaDepositContract } = require('./hedera-deposit-contract');

/**
 * Treasury Event Monitor
 * Listens to HCS events from deposit contract and triggers Treasury operations
 */
class TreasuryEventMonitor {
  constructor() {
    this.client = null;
    this.coordinator = null;
    this.depositContract = null;
    this.isMonitoring = false;
    this.messageSubscription = null;
    
    // Event tracking
    this.processedEvents = new Set();
    this.pendingProcessing = new Map();
    this.eventStats = {
      totalReceived: 0,
      processed: 0,
      failed: 0,
      duplicates: 0
    };
  }

  /**
   * Initialize the Treasury event monitor
   */
  async initialize() {
    console.log('👂 Initializing Treasury Event Monitor...');
    
    this.client = await getHederaClient();
    this.coordinator = await getUnifiedProtocolCoordinator();
    this.depositContract = await getHederaDepositContract();
    
    console.log('✅ Treasury Event Monitor ready');
    console.log(`📡 Monitoring HCS Topic: ${CONFIG.infrastructure.hcsTopic}`);
    console.log(`🏦 Treasury Account: ${CONFIG.accounts.treasury}`);
  }

  /**
   * Start monitoring HCS events from deposit contract
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️  Event monitoring already active');
      return;
    }
    
    console.log('🎯 Starting Treasury Event Monitoring...');
    console.log(`📡 Subscribing to HCS Topic: ${CONFIG.infrastructure.hcsTopic}`);
    
    try {
      const client = this.client.getClient();
      
      // Subscribe to HCS topic starting from now
      this.messageSubscription = new TopicMessageQuery()
        .setTopicId(CONFIG.infrastructure.hcsTopic)
        .setStartTime(Timestamp.fromDate(new Date()))
        .subscribe(
          client,
          (message) => this.handleHCSMessage(message),
          (error) => this.handleSubscriptionError(error)
        );
      
      this.isMonitoring = true;
      
      console.log('✅ Treasury Event Monitoring started');
      console.log('👂 Listening for deposit contract events...');
      
    } catch (error) {
      console.error('❌ Failed to start event monitoring:', error.message);
      throw error;
    }
  }

  /**
   * Stop monitoring HCS events
   */
  async stopMonitoring() {
    if (!this.isMonitoring) {
      console.log('ℹ️  Event monitoring not active');
      return;
    }
    
    console.log('🛑 Stopping Treasury Event Monitoring...');
    
    if (this.messageSubscription) {
      // Note: Hedera SDK doesn't have explicit unsubscribe method
      // The subscription will stop when the client is closed
      this.messageSubscription = null;
    }
    
    this.isMonitoring = false;
    console.log('✅ Treasury Event Monitoring stopped');
  }

  /**
   * Handle incoming HCS messages
   * @param {TopicMessage} message - HCS message from deposit contract
   */
  async handleHCSMessage(message) {
    try {
      const messageContent = message.contents.toString();
      const eventData = JSON.parse(messageContent);
      
      // Update statistics
      this.eventStats.totalReceived++;
      
      console.log(`📨 HCS Event Received: ${eventData.type}`);
      console.log(`🔗 Consensus Timestamp: ${message.consensusTimestamp}`);
      
      // Check for duplicate processing
      const eventId = this.generateEventId(eventData, message.consensusTimestamp);
      if (this.processedEvents.has(eventId)) {
        console.log(`⚠️  Duplicate event ignored: ${eventId}`);
        this.eventStats.duplicates++;
        return;
      }
      
      // Process based on event type
      switch (eventData.type) {
        case 'MEMBERSHIP_DEPOSIT_RECEIVED':
          await this.processMembershipDepositEvent(eventData, message.consensusTimestamp);
          break;
          
        case 'DRIP_MINT_REQUEST':
        case 'WISH_CLAIM_REQUEST':
        case 'DRIP_REDEEM_REQUEST':
          // These are handled by the coordinator directly
          console.log(`ℹ️  Coordinator event: ${eventData.type} - ${eventData.clientNonce}`);
          break;
          
        default:
          console.log(`⚠️  Unknown event type: ${eventData.type}`);
      }
      
      // Mark as processed
      this.processedEvents.add(eventId);
      
    } catch (error) {
      console.error('❌ Error processing HCS message:', error.message);
      this.eventStats.failed++;
    }
  }

  /**
   * Process membership deposit event from contract
   * @param {Object} eventData - Deposit event data
   * @param {Timestamp} consensusTimestamp - HCS consensus timestamp
   */
  async processMembershipDepositEvent(eventData, consensusTimestamp) {
    console.log(`💧 Processing membership deposit event: ${eventData.clientNonce}`);
    console.log(`👤 Depositor: ${eventData.depositor}`);
    console.log(`💰 Amount: ${eventData.amount / CONFIG.constants.HBAR_TO_TINYBAR} HBAR`);
    
    try {
      // 1. Validate event data
      await this.validateDepositEvent(eventData);
      
      // 2. Acknowledge processing with deposit contract
      await this.acknowledgeDepositProcessing(eventData);
      
      // 3. Submit DRIP mint request to coordinator
      const coordinatorResult = await this.submitDripMintRequest(eventData, consensusTimestamp);
      
      // 4. Track processing status
      this.trackProcessingStatus(eventData, coordinatorResult);
      
      // 5. Monitor coordinator completion
      this.monitorCoordinatorCompletion(eventData, coordinatorResult);
      
      this.eventStats.processed++;
      console.log(`✅ Deposit event processed successfully: ${eventData.clientNonce}`);
      
    } catch (error) {
      console.error(`❌ Failed to process deposit event: ${error.message}`);
      
      // Report failure to deposit contract
      await this.reportProcessingFailure(eventData, error.message);
      
      this.eventStats.failed++;
    }
  }

  /**
   * Validate deposit event data
   */
  async validateDepositEvent(eventData) {
    console.log('🔍 Validating deposit event...');
    
    // Check required fields
    const requiredFields = ['depositor', 'amount', 'clientNonce', 'depositTxId', 'contractId'];
    for (const field of requiredFields) {
      if (!eventData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate deposit amount
    if (eventData.amount !== CONFIG.parameters.membershipDeposit) {
      throw new Error(`Invalid deposit amount: ${eventData.amount}, expected: ${CONFIG.parameters.membershipDeposit}`);
    }
    
    // Validate depositor format
    if (!eventData.depositor.match(/^0\.0\.\d+$/)) {
      throw new Error(`Invalid depositor account format: ${eventData.depositor}`);
    }
    
    // Check for duplicate processing
    if (this.pendingProcessing.has(eventData.clientNonce)) {
      throw new Error(`Event already being processed: ${eventData.clientNonce}`);
    }
    
    console.log('✅ Deposit event validation passed');
  }

  /**
   * Acknowledge deposit processing with contract
   */
  async acknowledgeDepositProcessing(eventData) {
    console.log(`📋 Acknowledging deposit processing: ${eventData.clientNonce}`);
    
    try {
      // Generate Treasury operation ID
      const treasuryOperationId = `treasury_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Acknowledge with deposit contract
      await this.depositContract.acknowledgeProcessing(eventData.clientNonce, treasuryOperationId);
      
      console.log(`✅ Processing acknowledged: ${treasuryOperationId}`);
      return treasuryOperationId;
      
    } catch (error) {
      console.error('❌ Failed to acknowledge processing:', error.message);
      throw error;
    }
  }

  /**
   * Submit DRIP mint request to HCS coordinator
   */
  async submitDripMintRequest(eventData, consensusTimestamp) {
    console.log(`🪙 Submitting DRIP mint request: ${eventData.depositor}`);
    
    try {
      // Create Treasury operation nonce (different from user's clientNonce)
      const treasuryNonce = `treasury_mint_${eventData.clientNonce}_${Date.now()}`;
      
      // Submit to HCS coordinator
      const coordinatorResult = await this.coordinator.submitDripMintRequest(
        eventData.depositor,
        eventData.amount,
        treasuryNonce
      );
      
      console.log(`✅ DRIP mint submitted to coordinator: ${coordinatorResult.hcsTransactionId}`);
      
      return {
        ...coordinatorResult,
        treasuryNonce: treasuryNonce,
        originalClientNonce: eventData.clientNonce
      };
      
    } catch (error) {
      console.error('❌ Failed to submit DRIP mint request:', error.message);
      throw error;
    }
  }

  /**
   * Track processing status
   */
  trackProcessingStatus(eventData, coordinatorResult) {
    const processingRecord = {
      clientNonce: eventData.clientNonce,
      depositor: eventData.depositor,
      amount: eventData.amount,
      depositTxId: eventData.depositTxId,
      treasuryNonce: coordinatorResult.treasuryNonce,
      coordinatorHcs: coordinatorResult.hcsTransactionId,
      status: 'COORDINATOR_SUBMITTED',
      startedAt: new Date(),
      eventData: eventData
    };
    
    this.pendingProcessing.set(eventData.clientNonce, processingRecord);
    console.log(`📝 Processing tracked: ${eventData.clientNonce}`);
  }

  /**
   * Monitor coordinator completion (async)
   */
  monitorCoordinatorCompletion(eventData, coordinatorResult) {
    // Start async monitoring (don't await)
    this.asyncMonitorCompletion(eventData, coordinatorResult).catch(error => {
      console.error(`❌ Async monitoring failed for ${eventData.clientNonce}:`, error.message);
    });
  }

  /**
   * Async monitoring of coordinator completion
   */
  async asyncMonitorCompletion(eventData, coordinatorResult) {
    console.log(`⏳ Monitoring completion: ${eventData.clientNonce}`);
    
    const maxWaitTime = 60000; // 60 seconds
    const pollInterval = 5000;  // 5 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Check coordinator operation status
        const status = this.coordinator.getOperationStatus(coordinatorResult.treasuryNonce);
        
        if (status && status.status === 'COMPLETED') {
          console.log(`🎉 DRIP minting completed: ${eventData.clientNonce}`);
          
          // Confirm membership with deposit contract
          await this.confirmMembershipCreated(eventData, status.result);
          
          // Update tracking
          const processing = this.pendingProcessing.get(eventData.clientNonce);
          if (processing) {
            processing.status = 'COMPLETED';
            processing.completedAt = new Date();
            processing.result = status.result;
          }
          
          break;
          
        } else if (status && status.status === 'FAILED') {
          console.log(`❌ DRIP minting failed: ${eventData.clientNonce}`);
          
          // Report failure
          await this.reportProcessingFailure(eventData, status.result?.error || 'Unknown coordinator error');
          
          // Update tracking
          const processing = this.pendingProcessing.get(eventData.clientNonce);
          if (processing) {
            processing.status = 'FAILED';
            processing.failedAt = new Date();
            processing.error = status.result?.error;
          }
          
          break;
        }
        
        // Wait before next check
        await this.sleep(pollInterval);
        
      } catch (error) {
        console.error(`❌ Error monitoring completion: ${error.message}`);
        await this.sleep(pollInterval);
      }
    }
    
    // Check for timeout
    const processing = this.pendingProcessing.get(eventData.clientNonce);
    if (processing && processing.status === 'COORDINATOR_SUBMITTED') {
      console.log(`⏰ Monitoring timeout for ${eventData.clientNonce}`);
      processing.status = 'TIMEOUT';
      processing.timeoutAt = new Date();
      
      await this.reportProcessingFailure(eventData, 'Processing timeout');
    }
  }

  /**
   * Confirm membership created with deposit contract
   */
  async confirmMembershipCreated(eventData, result) {
    console.log(`✅ Confirming membership created: ${eventData.clientNonce}`);
    
    try {
      await this.depositContract.confirmMembershipCreated(
        eventData.clientNonce,
        result.hcsTransactionId || 'unknown',
        result.mintTxId || 'unknown'
      );
      
      console.log(`🎉 Membership confirmed for ${eventData.depositor}`);
      
    } catch (error) {
      console.error('❌ Failed to confirm membership:', error.message);
      // Don't throw - the DRIP was minted successfully
    }
  }

  /**
   * Report processing failure to deposit contract
   */
  async reportProcessingFailure(eventData, reason) {
    console.log(`📝 Reporting processing failure: ${eventData.clientNonce}`);
    
    try {
      await this.depositContract.reportProcessingFailure(eventData.clientNonce, reason);
      console.log(`📋 Failure reported: ${reason}`);
      
    } catch (error) {
      console.error('❌ Failed to report failure:', error.message);
    }
  }

  /**
   * Handle subscription errors
   */
  handleSubscriptionError(error) {
    console.error('❌ HCS subscription error:', error.message);
    
    // Attempt to restart monitoring after delay
    setTimeout(() => {
      if (this.isMonitoring) {
        console.log('🔄 Attempting to restart event monitoring...');
        this.restartMonitoring().catch(restartError => {
          console.error('❌ Failed to restart monitoring:', restartError.message);
        });
      }
    }, 10000); // 10 second delay
  }

  /**
   * Restart monitoring after error
   */
  async restartMonitoring() {
    try {
      this.isMonitoring = false;
      await this.sleep(2000); // Brief pause
      await this.startMonitoring();
      console.log('✅ Event monitoring restarted successfully');
      
    } catch (error) {
      console.error('❌ Failed to restart monitoring:', error.message);
      throw error;
    }
  }

  // ═══════════ UTILITY METHODS ═══════════

  /**
   * Generate unique event ID
   */
  generateEventId(eventData, consensusTimestamp) {
    return `${eventData.type}_${eventData.clientNonce}_${consensusTimestamp.seconds}_${consensusTimestamp.nanos}`;
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats() {
    return {
      isMonitoring: this.isMonitoring,
      eventStats: { ...this.eventStats },
      pendingProcessing: this.pendingProcessing.size,
      processedEvents: this.processedEvents.size,
      uptime: this.isMonitoring ? 'Active' : 'Stopped'
    };
  }

  /**
   * Get pending processing details
   */
  getPendingProcessing() {
    return Array.from(this.pendingProcessing.values());
  }

  /**
   * Get processing status for specific client nonce
   */
  getProcessingStatus(clientNonce) {
    return this.pendingProcessing.get(clientNonce) || null;
  }

  /**
   * Clean up old processed events (memory management)
   */
  cleanupOldEvents() {
    const oneHourAgo = Date.now() - 3600000;
    
    // Clean up pending processing
    for (const [nonce, record] of this.pendingProcessing.entries()) {
      if (record.startedAt.getTime() < oneHourAgo && 
          ['COMPLETED', 'FAILED', 'TIMEOUT'].includes(record.status)) {
        this.pendingProcessing.delete(nonce);
      }
    }
    
    // Clean up processed events (keep last 1000)
    if (this.processedEvents.size > 1000) {
      const eventsArray = Array.from(this.processedEvents);
      const toDelete = eventsArray.slice(0, eventsArray.length - 1000);
      toDelete.forEach(eventId => this.processedEvents.delete(eventId));
    }
  }

  /**
   * Get monitor health status
   */
  async getMonitorHealth() {
    try {
      const stats = this.getMonitoringStats();
      const coordinatorHealth = await this.coordinator.getSystemHealth();
      
      return {
        status: this.isMonitoring && coordinatorHealth.status === 'healthy' ? 'healthy' : 'degraded',
        monitoring: this.isMonitoring,
        eventProcessing: stats,
        coordinator: coordinatorHealth.status,
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
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let treasuryEventMonitorInstance = null;

/**
 * Get or create singleton Treasury event monitor instance
 */
async function getTreasuryEventMonitor() {
  if (!treasuryEventMonitorInstance) {
    treasuryEventMonitorInstance = new TreasuryEventMonitor();
    await treasuryEventMonitorInstance.initialize();
  }
  return treasuryEventMonitorInstance;
}

module.exports = {
  TreasuryEventMonitor,
  getTreasuryEventMonitor
};