/**
 * HCS-Coordinated $DRIP Minting Flow
 * Treasury HTS key validation and transfer control implementation
 * 
 * Flow Architecture:
 * 1. HCS Consensus → 2. Validation → 3. HTS Operations → 4. State Update
 */

const {
  TopicMessageSubmitTransaction,
  TopicMessageQuery,
  TokenMintTransaction,
  TokenAssociateTransaction,
  TokenFreezeTransaction,
  TokenUnfreezeTransaction,
  TransferTransaction,
  AccountBalanceQuery,
  AccountId,
  TokenId,
  PrivateKey,
  Timestamp
} = require('@hashgraph/sdk');

const { CONFIG } = require('./config');
const { getHederaClient } = require('./hedera-client');
const { getMembershipDatabase } = require('./membership-db');

/**
 * HCS-Coordinated DRIP Minting System
 * Implements consensus-first minting with Treasury key validation
 */
class HCSCoordinatedDripMinting {
  constructor() {
    this.client = null;
    this.database = null;
    this.treasuryId = AccountId.fromString(CONFIG.accounts.treasury);
    this.treasuryKey = PrivateKey.fromString(CONFIG.accounts.treasuryKey);
    this.hcsTopicId = CONFIG.infrastructure.hcsTopic;
    
    // Message sequence tracking
    this.sequenceNumber = 0;
    this.pendingMints = new Map(); // Track pending HCS consensus
  }

  /**
   * Initialize the minting system
   */
  async initialize() {
    console.log('🎯 Initializing HCS-Coordinated DRIP Minting System...');
    
    this.client = await getHederaClient();
    this.database = await getMembershipDatabase();
    
    // Subscribe to HCS topic for consensus coordination
    await this.subscribeToHCSConsensus();
    
    console.log('✅ HCS-Coordinated minting system ready');
    console.log(`📡 HCS Topic: ${this.hcsTopicId}`);
    console.log(`🏦 Treasury: ${this.treasuryId}`);
    console.log(`🪙 DRIP Token: ${CONFIG.tokens.DRIP.id}`);
  }

  // ═══════════ HCS CONSENSUS COORDINATION ═══════════

  /**
   * Submit deposit intent to HCS for consensus ordering
   * @param {string} memberAccountId - Account requesting membership
   * @param {number} depositAmount - HBAR deposit in tinybars
   * @param {string} clientNonce - Client-provided nonce for idempotency
   * @returns {Object} HCS submission result
   */
  async submitDepositIntent(memberAccountId, depositAmount, clientNonce) {
    console.log(`📡 Submitting deposit intent to HCS: ${memberAccountId}`);
    
    // Create structured HCS message
    const depositIntent = {
      type: 'DRIP_MINT_REQUEST',
      version: '1.0',
      timestamp: Date.now(),
      sequenceNumber: ++this.sequenceNumber,
      clientNonce: clientNonce,
      memberAccount: memberAccountId,
      depositAmount: depositAmount,
      expectedDripAmount: 1,
      requestor: CONFIG.accounts.treasury,
      signature: await this.signDepositIntent(memberAccountId, depositAmount, clientNonce)
    };

    try {
      // Submit to HCS topic
      const hcsTransaction = new TopicMessageSubmitTransaction()
        .setTopicId(this.hcsTopicId)
        .setMessage(JSON.stringify(depositIntent));

      const client = this.client.getClient();
      const hcsSubmission = await client.executeTransaction(
        hcsTransaction,
        'HCS deposit intent submission'
      );

      const hcsReceipt = await hcsSubmission.getReceipt(client);
      
      console.log('✅ Deposit intent submitted to HCS consensus');
      console.log(`📋 HCS Transaction: ${hcsReceipt.transactionId}`);
      console.log(`🔢 Sequence: ${depositIntent.sequenceNumber}`);

      // Track pending mint
      this.pendingMints.set(clientNonce, {
        memberAccount: memberAccountId,
        depositAmount: depositAmount,
        hcsTransactionId: hcsReceipt.transactionId.toString(),
        status: 'HCS_SUBMITTED',
        submittedAt: new Date()
      });

      return {
        hcsTransactionId: hcsReceipt.transactionId.toString(),
        sequenceNumber: depositIntent.sequenceNumber,
        clientNonce: clientNonce,
        status: 'HCS_SUBMITTED',
        expectedConsensusTime: '2-5 seconds'
      };

    } catch (error) {
      console.error('❌ HCS submission failed:', error.message);
      throw new Error(`HCS consensus submission failed: ${error.message}`);
    }
  }

  /**
   * Subscribe to HCS topic for consensus coordination
   */
  async subscribeToHCSConsensus() {
    console.log('👂 Subscribing to HCS consensus messages...');
    
    const client = this.client.getClient();
    
    new TopicMessageQuery()
      .setTopicId(this.hcsTopicId)
      .setStartTime(Timestamp.fromDate(new Date()))
      .subscribe(
        client,
        (message) => this.handleHCSConsensusMessage(message),
        (error) => console.error('❌ HCS subscription error:', error)
      );
    
    console.log('✅ HCS consensus subscription active');
  }

  /**
   * Handle incoming HCS consensus messages
   * @param {TopicMessage} message - Consensus message from HCS
   */
  async handleHCSConsensusMessage(message) {
    try {
      const consensusData = JSON.parse(message.contents.toString());
      
      if (consensusData.type === 'DRIP_MINT_REQUEST') {
        console.log(`🎯 HCS Consensus reached for mint request: ${consensusData.clientNonce}`);
        
        // Execute HTS operations after consensus
        await this.executePostConsensusHTS(consensusData, message.consensusTimestamp);
      }
      
    } catch (error) {
      console.error('❌ Error processing HCS message:', error.message);
    }
  }

  // ═══════════ TREASURY HTS KEY VALIDATION ═══════════

  /**
   * Validate Treasury HTS key authority and execute mint operations
   * @param {Object} consensusData - Validated consensus data from HCS
   * @param {Timestamp} consensusTimestamp - HCS consensus timestamp
   */
  async executePostConsensusHTS(consensusData, consensusTimestamp) {
    const { memberAccount, depositAmount, clientNonce } = consensusData;
    
    console.log(`🔐 Executing Treasury HTS operations post-consensus`);
    console.log(`👤 Member: ${memberAccount}`);
    console.log(`💰 Deposit: ${depositAmount} tinybars`);
    
    try {
      // 1. Final validation with Treasury authority
      await this.validateTreasuryHTS(memberAccount, depositAmount);
      
      // 2. Execute HTS operations with Treasury keys
      const htsResult = await this.executeTreasuryHTS(memberAccount, depositAmount);
      
      // 3. Update state with consensus timestamp
      await this.finalizePostConsensus(memberAccount, depositAmount, htsResult, consensusTimestamp, clientNonce);
      
      console.log('✅ Post-consensus HTS execution completed');
      
    } catch (error) {
      console.error('❌ Post-consensus HTS execution failed:', error.message);
      
      // Mark pending mint as failed
      if (this.pendingMints.has(clientNonce)) {
        this.pendingMints.set(clientNonce, {
          ...this.pendingMints.get(clientNonce),
          status: 'HTS_FAILED',
          error: error.message,
          failedAt: new Date()
        });
      }
    }
  }

  /**
   * Validate Treasury HTS key authority and permissions
   * @param {string} memberAccount - Member account to validate
   * @param {number} depositAmount - Deposit amount to validate
   */
  async validateTreasuryHTS(memberAccount, depositAmount) {
    console.log('🔍 Validating Treasury HTS authority...');
    
    const client = this.client.getClient();
    
    // 1. Verify Treasury has mint authority
    const { TokenInfoQuery } = require('@hashgraph/sdk');
    const tokenInfo = await new TokenInfoQuery()
      .setTokenId(CONFIG.tokens.DRIP.id)
      .execute(client);
    
    if (!tokenInfo.supplyKey || tokenInfo.treasuryAccountId.toString() !== this.treasuryId.toString()) {
      throw new Error('Treasury lacks mint authority for DRIP token');
    }
    
    // 2. Validate deposit amount (exactly 1 HBAR)
    if (depositAmount !== CONFIG.parameters.membershipDeposit) {
      throw new Error(`Invalid deposit amount: ${depositAmount}, expected: ${CONFIG.parameters.membershipDeposit}`);
    }
    
    // 3. Verify Treasury balance for operations
    const treasuryBalance = await new AccountBalanceQuery()
      .setAccountId(this.treasuryId)
      .execute(client);
    
    const minRequiredBalance = 50000000; // 0.5 HBAR for fees
    if (treasuryBalance.hbars.toTinybars().toNumber() < minRequiredBalance) {
      throw new Error('Insufficient Treasury balance for operations');
    }
    
    // 4. Check member account eligibility (not already a member)
    const existingMember = await this.database.getMember(memberAccount);
    if (existingMember && existingMember.is_active) {
      throw new Error(`Account ${memberAccount} is already an active member`);
    }
    
    console.log('✅ Treasury HTS validation passed');
  }

  /**
   * Execute HTS operations using Treasury keys
   * @param {string} memberAccount - Member account
   * @param {number} depositAmount - Deposit amount in tinybars
   * @returns {Object} HTS operation results
   */
  async executeTreasuryHTS(memberAccount, depositAmount) {
    console.log('⚡ Executing Treasury HTS operations...');
    
    const client = this.client.getClient();
    const results = {
      associationTxId: null,
      mintTxId: null,
      transferTxId: null,
      freezeTxId: null
    };
    
    try {
      // 1. Associate member with DRIP token (if not already associated)
      try {
        const associateTransaction = new TokenAssociateTransaction()
          .setAccountId(memberAccount)
          .setTokenIds([CONFIG.tokens.DRIP.id])
          .freezeWith(client);
        
        const associateSigned = await associateTransaction.sign(this.treasuryKey);
        const associateReceipt = await client.executeTransaction(
          associateSigned,
          'DRIP token association'
        );
        
        results.associationTxId = associateReceipt.transactionId.toString();
        console.log('✅ Token association completed');
        
      } catch (error) {
        if (!error.message.includes('TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT')) {
          throw error;
        }
        console.log('ℹ️  Token already associated');
      }
      
      // 2. Mint 1 DRIP token to Treasury
      const mintTransaction = new TokenMintTransaction()
        .setTokenId(CONFIG.tokens.DRIP.id)
        .setAmount(1)
        .freezeWith(client);
      
      const mintSigned = await mintTransaction.sign(this.treasuryKey);
      const mintReceipt = await client.executeTransaction(
        mintSigned,
        'DRIP token mint'
      );
      
      results.mintTxId = mintReceipt.transactionId.toString();
      console.log('✅ DRIP token minted');
      
      // 3. Unfreeze member account temporarily for transfer
      const unfreezeTransaction = new TokenUnfreezeTransaction()
        .setTokenId(CONFIG.tokens.DRIP.id)
        .setAccountId(memberAccount)
        .freezeWith(client);
      
      const unfreezeSigned = await unfreezeTransaction.sign(this.treasuryKey);
      await client.executeTransaction(unfreezeSigned, 'Temporary unfreeze');
      
      // 4. Transfer DRIP to member
      const transferTransaction = new TransferTransaction()
        .addTokenTransfer(CONFIG.tokens.DRIP.id, this.treasuryId, -1)
        .addTokenTransfer(CONFIG.tokens.DRIP.id, memberAccount, 1)
        .freezeWith(client);
      
      const transferSigned = await transferTransaction.sign(this.treasuryKey);
      const transferReceipt = await client.executeTransaction(
        transferSigned,
        'DRIP token transfer'
      );
      
      results.transferTxId = transferReceipt.transactionId.toString();
      console.log('✅ DRIP token transferred');
      
      // 5. Re-freeze member account (make DRIP non-transferable)
      const freezeTransaction = new TokenFreezeTransaction()
        .setTokenId(CONFIG.tokens.DRIP.id)
        .setAccountId(memberAccount)
        .freezeWith(client);
      
      const freezeSigned = await freezeTransaction.sign(this.treasuryKey);
      const freezeReceipt = await client.executeTransaction(
        freezeSigned,
        'DRIP token freeze'
      );
      
      results.freezeTxId = freezeReceipt.transactionId.toString();
      console.log('✅ DRIP token frozen (non-transferable)');
      
      return results;
      
    } catch (error) {
      console.error('❌ Treasury HTS operation failed:', error.message);
      throw error;
    }
  }

  // ═══════════ DEPOSIT VALIDATION & TRANSFER CONTROL ═══════════

  /**
   * Comprehensive deposit validation pipeline
   * @param {string} memberAccount - Account to validate
   * @param {number} depositAmount - Deposit amount to validate
   * @param {string} clientNonce - Idempotency nonce
   */
  async validateDepositRequest(memberAccount, depositAmount, clientNonce) {
    console.log('🔍 Starting deposit validation pipeline...');
    
    // 1. Nonce validation (prevent duplicate submissions)
    if (this.pendingMints.has(clientNonce)) {
      const pending = this.pendingMints.get(clientNonce);
      throw new Error(`Duplicate nonce: ${clientNonce} (status: ${pending.status})`);
    }
    
    // 2. Account format validation
    if (!memberAccount.match(/^0\.0\.\d+$/)) {
      throw new Error('Invalid account ID format');
    }
    
    // 3. Deposit amount validation (exactly 1 HBAR)
    if (depositAmount !== CONFIG.parameters.membershipDeposit) {
      throw new Error(`Invalid deposit: ${depositAmount}, expected: ${CONFIG.parameters.membershipDeposit}`);
    }
    
    // 4. Member account balance check
    const client = this.client.getClient();
    const balance = await new AccountBalanceQuery()
      .setAccountId(memberAccount)
      .execute(client);
    
    const requiredBalance = depositAmount + 100000000; // +1 HBAR for fees
    if (balance.hbars.toTinybars().toNumber() < requiredBalance) {
      throw new Error('Insufficient account balance for deposit + fees');
    }
    
    // 5. Membership uniqueness check
    const existingMember = await this.database.getMember(memberAccount);
    if (existingMember && existingMember.is_active) {
      throw new Error('Account already holds active membership');
    }
    
    console.log('✅ Deposit validation completed');
  }

  /**
   * Transfer control validation using Treasury authority
   * @param {string} fromAccount - Source account
   * @param {string} toAccount - Destination account
   * @param {string} tokenId - Token being transferred
   * @param {number} amount - Transfer amount
   */
  async validateTransferControl(fromAccount, toAccount, tokenId, amount) {
    console.log('🔐 Validating transfer control with Treasury authority...');
    
    // Only Treasury can initiate DRIP transfers
    if (tokenId === CONFIG.tokens.DRIP.id && fromAccount !== this.treasuryId.toString()) {
      throw new Error('Only Treasury can transfer DRIP tokens');
    }
    
    // Validate transfer amount matches mint amount
    if (tokenId === CONFIG.tokens.DRIP.id && amount !== 1) {
      throw new Error('DRIP transfers must be exactly 1 token');
    }
    
    // Ensure destination account is properly associated
    const client = this.client.getClient();
    try {
      const balance = await new AccountBalanceQuery()
        .setAccountId(toAccount)
        .execute(client);
      
      const tokenBalance = balance.tokens.get(TokenId.fromString(tokenId));
      if (tokenBalance === null) {
        throw new Error(`Destination account not associated with token ${tokenId}`);
      }
    } catch (error) {
      throw new Error(`Transfer control validation failed: ${error.message}`);
    }
    
    console.log('✅ Transfer control validation passed');
  }

  // ═══════════ STATE FINALIZATION ═══════════

  /**
   * Finalize state after successful consensus and HTS operations
   * @param {string} memberAccount - Member account
   * @param {number} depositAmount - Deposit amount
   * @param {Object} htsResult - HTS operation results
   * @param {Timestamp} consensusTimestamp - HCS consensus timestamp
   * @param {string} clientNonce - Client nonce
   */
  async finalizePostConsensus(memberAccount, depositAmount, htsResult, consensusTimestamp, clientNonce) {
    console.log('🎯 Finalizing post-consensus state...');
    
    try {
      // 1. Create member record in database
      const memberRecord = await this.database.createMember(memberAccount, depositAmount, {
        hcsConsensusTimestamp: consensusTimestamp.toDate(),
        htsTransactions: htsResult,
        clientNonce: clientNonce
      });
      
      // 2. Update pending mint status
      this.pendingMints.set(clientNonce, {
        ...this.pendingMints.get(clientNonce),
        status: 'COMPLETED',
        htsResult: htsResult,
        memberRecordId: memberRecord.id,
        completedAt: new Date()
      });
      
      // 3. Clean up completed mint (optional, for memory management)
      setTimeout(() => {
        this.pendingMints.delete(clientNonce);
      }, 300000); // Clean up after 5 minutes
      
      console.log('✅ Post-consensus finalization completed');
      console.log(`👤 Member: ${memberAccount}`);
      console.log(`🪙 DRIP Token: 1 (frozen)`);
      console.log(`📊 Record ID: ${memberRecord.id}`);
      
    } catch (error) {
      console.error('❌ Post-consensus finalization failed:', error.message);
      throw error;
    }
  }

  // ═══════════ UTILITY METHODS ═══════════

  /**
   * Sign deposit intent with Treasury private key
   * @param {string} memberAccount - Member account
   * @param {number} depositAmount - Deposit amount
   * @param {string} clientNonce - Client nonce
   * @returns {string} Signature
   */
  async signDepositIntent(memberAccount, depositAmount, clientNonce) {
    const message = `${memberAccount}:${depositAmount}:${clientNonce}`;
    const signature = this.treasuryKey.sign(Buffer.from(message, 'utf8'));
    return signature.toString('hex');
  }

  /**
   * Get current pending mint status
   * @param {string} clientNonce - Client nonce to check
   * @returns {Object|null} Pending mint status
   */
  getPendingMintStatus(clientNonce) {
    return this.pendingMints.get(clientNonce) || null;
  }

  /**
   * Get system health status
   * @returns {Object} System health
   */
  async getSystemHealth() {
    return {
      hcsSubscription: 'active',
      treasuryBalance: await this.getTreasuryBalance(),
      pendingMints: this.pendingMints.size,
      dripTokenSupply: await this.getDripTokenSupply(),
      lastSequenceNumber: this.sequenceNumber
    };
  }

  /**
   * Get Treasury balance
   */
  async getTreasuryBalance() {
    const client = this.client.getClient();
    const balance = await new AccountBalanceQuery()
      .setAccountId(this.treasuryId)
      .execute(client);
    
    return {
      hbar: balance.hbars.toString(),
      tinybars: balance.hbars.toTinybars().toNumber()
    };
  }

  /**
   * Get DRIP token supply
   */
  async getDripTokenSupply() {
    const client = this.client.getClient();
    const { TokenInfoQuery } = require('@hashgraph/sdk');
    
    const tokenInfo = await new TokenInfoQuery()
      .setTokenId(CONFIG.tokens.DRIP.id)
      .execute(client);
    
    return {
      current: tokenInfo.totalSupply.toString(),
      max: CONFIG.tokens.DRIP.maxSupply
    };
  }
}

// Singleton instance
let hcsCoordinatedMintingInstance = null;

/**
 * Get or create singleton HCS-coordinated minting instance
 */
async function getHCSCoordinatedMinting() {
  if (!hcsCoordinatedMintingInstance) {
    hcsCoordinatedMintingInstance = new HCSCoordinatedDripMinting();
    await hcsCoordinatedMintingInstance.initialize();
  }
  return hcsCoordinatedMintingInstance;
}

module.exports = {
  HCSCoordinatedDripMinting,
  getHCSCoordinatedMinting
};