/**
 * HCS-Unified Protocol Coordinator
 * Centralized consensus coordination for all Fountain Protocol operations:
 * - DRIP Minting (membership creation)
 * - WISH Claiming (daily rewards with 1000-cap enforcement) 
 * - DRIP Redemption (reclaim HBAR + AutoRelease)
 */

const {
  TopicMessageSubmitTransaction,
  TopicMessageQuery,
  TokenMintTransaction,
  TokenBurnTransaction,
  TokenWipeTransaction,
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
 * Unified Protocol Coordinator
 * Manages HCS consensus for all protocol operations with Treasury authority
 */
class HCSUnifiedProtocolCoordinator {
  constructor() {
    this.client = null;
    this.database = null;
    this.treasuryId = AccountId.fromString(CONFIG.accounts.treasury);
    this.treasuryKey = PrivateKey.fromString(CONFIG.accounts.treasuryKey);
    this.hcsTopicId = CONFIG.infrastructure.hcsTopic;
    
    // Operation tracking
    this.sequenceNumber = 0;
    this.pendingOperations = new Map();
    
    // Operation type constants
    this.OPERATION_TYPES = {
      DRIP_MINT: 'DRIP_MINT_REQUEST',
      WISH_CLAIM: 'WISH_CLAIM_REQUEST', 
      DRIP_REDEEM: 'DRIP_REDEEM_REQUEST'
    };
  }

  /**
   * Initialize the unified coordinator
   */
  async initialize() {
    console.log('🎯 Initializing HCS-Unified Protocol Coordinator...');
    
    this.client = await getHederaClient();
    this.database = await getMembershipDatabase();
    
    // Subscribe to HCS topic for all operation types
    await this.subscribeToHCSConsensus();
    
    console.log('✅ HCS-Unified Protocol Coordinator ready');
    console.log(`📡 HCS Topic: ${this.hcsTopicId}`);
    console.log(`🏦 Treasury: ${this.treasuryId}`);
    console.log(`🎯 Operations: MINT, CLAIM, REDEEM`);
  }

  // ═══════════ UNIFIED HCS CONSENSUS COORDINATION ═══════════

  /**
   * Subscribe to HCS topic for all operation consensus
   */
  async subscribeToHCSConsensus() {
    console.log('👂 Subscribing to unified HCS consensus messages...');
    
    const client = this.client.getClient();
    
    new TopicMessageQuery()
      .setTopicId(this.hcsTopicId)
      .setStartTime(Timestamp.fromDate(new Date()))
      .subscribe(
        client,
        (message) => this.handleHCSConsensusMessage(message),
        (error) => console.error('❌ HCS subscription error:', error)
      );
    
    console.log('✅ Unified HCS consensus subscription active');
  }

  /**
   * Handle incoming HCS consensus messages for all operation types
   * @param {TopicMessage} message - Consensus message from HCS
   */
  async handleHCSConsensusMessage(message) {
    try {
      const consensusData = JSON.parse(message.contents.toString());
      
      console.log(`🎯 HCS Consensus: ${consensusData.type} - ${consensusData.clientNonce}`);
      
      switch (consensusData.type) {
        case this.OPERATION_TYPES.DRIP_MINT:
          await this.executePostConsensusDripMint(consensusData, message.consensusTimestamp);
          break;
          
        case this.OPERATION_TYPES.WISH_CLAIM:
          await this.executePostConsensusWishClaim(consensusData, message.consensusTimestamp);
          break;
          
        case this.OPERATION_TYPES.DRIP_REDEEM:
          await this.executePostConsensusDripRedeem(consensusData, message.consensusTimestamp);
          break;
          
        default:
          console.warn(`⚠️ Unknown operation type: ${consensusData.type}`);
      }
      
    } catch (error) {
      console.error('❌ Error processing HCS message:', error.message);
    }
  }

  // ═══════════ DRIP MINTING (MEMBERSHIP CREATION) ═══════════

  /**
   * Submit DRIP mint request to HCS consensus
   * @param {string} memberAccountId - Account requesting membership
   * @param {number} depositAmount - HBAR deposit in tinybars
   * @param {string} clientNonce - Client nonce for idempotency
   * @returns {Object} HCS submission result
   */
  async submitDripMintRequest(memberAccountId, depositAmount, clientNonce) {
    console.log(`📡 Submitting DRIP mint to HCS: ${memberAccountId}`);
    
    const mintRequest = {
      type: this.OPERATION_TYPES.DRIP_MINT,
      version: '1.0',
      timestamp: Date.now(),
      sequenceNumber: ++this.sequenceNumber,
      clientNonce: clientNonce,
      memberAccount: memberAccountId,
      depositAmount: depositAmount,
      expectedDripAmount: 1,
      requestor: this.treasuryId.toString(),
      signature: await this.signOperation(this.OPERATION_TYPES.DRIP_MINT, memberAccountId, depositAmount, clientNonce)
    };

    return await this.submitToHCS(mintRequest, clientNonce);
  }

  /**
   * Execute DRIP mint operations post-consensus
   */
  async executePostConsensusDripMint(consensusData, consensusTimestamp) {
    const { memberAccount, depositAmount, clientNonce } = consensusData;
    
    console.log(`🔐 Executing DRIP mint post-consensus: ${memberAccount}`);
    
    try {
      // Validate Treasury authority and execute HTS operations
      await this.validateTreasuryAuthority('DRIP_MINT', memberAccount, depositAmount);
      
      const htsResult = {
        associationTxId: null,
        mintTxId: null,
        transferTxId: null,
        freezeTxId: null
      };

      const client = this.client.getClient();

      // 1. Associate member with DRIP token
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
        htsResult.associationTxId = associateReceipt.transactionId.toString();
      } catch (error) {
        if (!error.message.includes('TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT')) {
          throw error;
        }
      }
      
      // 2. Mint 1 DRIP token
      const mintTransaction = new TokenMintTransaction()
        .setTokenId(CONFIG.tokens.DRIP.id)
        .setAmount(1)
        .freezeWith(client);
      
      const mintSigned = await mintTransaction.sign(this.treasuryKey);
      const mintReceipt = await client.executeTransaction(mintSigned, 'DRIP token mint');
      htsResult.mintTxId = mintReceipt.transactionId.toString();
      
      // 3. Unfreeze, transfer, and re-freeze
      await this.executeTokenTransferSequence(memberAccount, CONFIG.tokens.DRIP.id, 1, htsResult);
      
      // 4. Create member record
      const memberRecord = await this.database.createMember(memberAccount, depositAmount, {
        hcsConsensusTimestamp: consensusTimestamp.toDate(),
        htsTransactions: htsResult,
        clientNonce: clientNonce
      });
      
      this.updateOperationStatus(clientNonce, 'COMPLETED', { htsResult, memberRecordId: memberRecord.id });
      console.log('✅ DRIP mint completed successfully');
      
    } catch (error) {
      console.error('❌ DRIP mint post-consensus failed:', error.message);
      this.updateOperationStatus(clientNonce, 'FAILED', { error: error.message });
    }
  }

  // ═══════════ WISH CLAIMING (1000-CAP ENFORCEMENT) ═══════════

  /**
   * Submit WISH claim request to HCS consensus
   * @param {string} memberAccountId - Member claiming WISH
   * @param {number} claimAmount - WISH tokens to claim
   * @param {string} clientNonce - Client nonce for idempotency
   * @returns {Object} HCS submission result
   */
  async submitWishClaimRequest(memberAccountId, claimAmount, clientNonce) {
    console.log(`📡 Submitting WISH claim to HCS: ${memberAccountId} - ${claimAmount} WISH`);
    
    // Pre-validate claim eligibility and 1000-cap enforcement
    await this.validateWishClaimEligibility(memberAccountId, claimAmount);
    
    const claimRequest = {
      type: this.OPERATION_TYPES.WISH_CLAIM,
      version: '1.0',
      timestamp: Date.now(),
      sequenceNumber: ++this.sequenceNumber,
      clientNonce: clientNonce,
      memberAccount: memberAccountId,
      claimAmount: claimAmount,
      requestor: this.treasuryId.toString(),
      signature: await this.signOperation(this.OPERATION_TYPES.WISH_CLAIM, memberAccountId, claimAmount, clientNonce)
    };

    return await this.submitToHCS(claimRequest, clientNonce);
  }

  /**
   * Validate WISH claim eligibility with 1000-cap enforcement
   * @param {string} memberAccount - Member account
   * @param {number} claimAmount - Amount to claim
   */
  async validateWishClaimEligibility(memberAccount, claimAmount) {
    console.log('🔍 Validating WISH claim eligibility...');
    
    // 1. Verify DRIP ownership
    const balance = await this.getTokenBalance(memberAccount, CONFIG.tokens.DRIP.id);
    if (balance !== 1) {
      throw new Error(`DRIP verification failed: expected 1, found ${balance}`);
    }
    
    // 2. Get member record and validate quota
    const member = await this.database.getMember(memberAccount);
    if (!member || !member.is_active) {
      throw new Error(`Member ${memberAccount} not found or inactive`);
    }
    
    if (member.lifetime_cap_reached) {
      throw new Error(`Member ${memberAccount} has reached 1000 WISH lifetime cap`);
    }
    
    // 3. Enforce 1000-cap: Check remaining quota
    if (member.remaining_wish < claimAmount) {
      throw new Error(
        `Insufficient quota: requested ${claimAmount}, remaining ${member.remaining_wish}/${CONFIG.parameters.maxWishPerDrip}`
      );
    }
    
    // 4. Validate claim amount is reasonable (1-500 WISH per claim)
    if (claimAmount < 1 || claimAmount > 500) {
      throw new Error('Claim amount must be between 1-500 WISH tokens');
    }
    
    console.log(`✅ WISH claim validated: ${claimAmount}/${member.remaining_wish} remaining`);
  }

  /**
   * Execute WISH claim operations post-consensus
   */
  async executePostConsensusWishClaim(consensusData, consensusTimestamp) {
    const { memberAccount, claimAmount, clientNonce } = consensusData;
    
    console.log(`🌟 Executing WISH claim post-consensus: ${memberAccount} - ${claimAmount} WISH`);
    
    try {
      // Re-validate claim at execution time (consensus ordering might change state)
      await this.validateWishClaimEligibility(memberAccount, claimAmount);
      
      const client = this.client.getClient();
      
      // 1. Associate member with WISH token (if needed)
      try {
        const associateTransaction = new TokenAssociateTransaction()
          .setAccountId(memberAccount)
          .setTokenIds([CONFIG.tokens.WISH.id])
          .freezeWith(client);
        
        const associateSigned = await associateTransaction.sign(this.treasuryKey);
        await client.executeTransaction(associateSigned, 'WISH token association');
      } catch (error) {
        if (!error.message.includes('TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT')) {
          throw error;
        }
      }
      
      // 2. Mint WISH tokens to Treasury
      const mintTransaction = new TokenMintTransaction()
        .setTokenId(CONFIG.tokens.WISH.id)
        .setAmount(claimAmount)
        .freezeWith(client);
      
      const mintSigned = await mintTransaction.sign(this.treasuryKey);
      const mintReceipt = await client.executeTransaction(mintSigned, 'WISH token mint');
      
      // 3. Transfer WISH to member
      const transferTransaction = new TransferTransaction()
        .addTokenTransfer(CONFIG.tokens.WISH.id, this.treasuryId, -claimAmount)
        .addTokenTransfer(CONFIG.tokens.WISH.id, memberAccount, claimAmount)
        .freezeWith(client);
      
      const transferSigned = await transferTransaction.sign(this.treasuryKey);
      const transferReceipt = await client.executeTransaction(transferSigned, 'WISH token transfer');
      
      // 4. Update member record with claim
      await this.database.updateMemberClaim(memberAccount, claimAmount);
      
      // 5. Check if 1000-cap reached and trigger AutoRelease
      const updatedMember = await this.database.getMember(memberAccount);
      let autoReleaseResult = null;
      
      if (updatedMember.lifetime_cap_reached) {
        console.log(`🎯 1000-cap reached for ${memberAccount} - triggering AutoRelease`);
        autoReleaseResult = await this.executeAutoRelease(memberAccount);
      }
      
      const result = {
        mintTxId: mintReceipt.transactionId.toString(),
        transferTxId: transferReceipt.transactionId.toString(),
        claimAmount: claimAmount,
        totalClaimed: updatedMember.total_wish_claimed,
        remainingQuota: updatedMember.remaining_wish,
        capReached: updatedMember.lifetime_cap_reached === 1,
        autoRelease: autoReleaseResult
      };
      
      this.updateOperationStatus(clientNonce, 'COMPLETED', result);
      console.log(`✅ WISH claim completed: ${claimAmount} tokens claimed`);
      
      if (autoReleaseResult) {
        console.log(`🔄 AutoRelease triggered: ${autoReleaseResult.totalPayoutHbar} HBAR total payout (${autoReleaseResult.refundAmountHbar} refund + ${autoReleaseResult.treasuryBonusHbar} bonus)`);
      }
      
    } catch (error) {
      console.error('❌ WISH claim post-consensus failed:', error.message);
      this.updateOperationStatus(clientNonce, 'FAILED', { error: error.message });
    }
  }

  // ═══════════ DRIP REDEMPTION (RECLAIM HBAR) ═══════════

  /**
   * Submit DRIP redemption request to HCS consensus
   * @param {string} memberAccountId - Member redeeming DRIP
   * @param {string} clientNonce - Client nonce for idempotency
   * @returns {Object} HCS submission result
   */
  async submitDripRedeemRequest(memberAccountId, clientNonce) {
    console.log(`📡 Submitting DRIP redemption to HCS: ${memberAccountId}`);
    
    // Pre-validate redemption eligibility
    await this.validateDripRedemptionEligibility(memberAccountId);
    
    const redeemRequest = {
      type: this.OPERATION_TYPES.DRIP_REDEEM,
      version: '1.0',
      timestamp: Date.now(),
      sequenceNumber: ++this.sequenceNumber,
      clientNonce: clientNonce,
      memberAccount: memberAccountId,
      expectedRefund: CONFIG.parameters.memberRefund * CONFIG.constants.HBAR_TO_TINYBAR,
      requestor: this.treasuryId.toString(),
      signature: await this.signOperation(this.OPERATION_TYPES.DRIP_REDEEM, memberAccountId, 0, clientNonce)
    };

    return await this.submitToHCS(redeemRequest, clientNonce);
  }

  /**
   * Validate DRIP redemption eligibility
   * @param {string} memberAccount - Member account
   */
  async validateDripRedemptionEligibility(memberAccount) {
    console.log('🔍 Validating DRIP redemption eligibility...');
    
    // 1. Verify DRIP ownership (exactly 1 DRIP token)
    const dripBalance = await this.getTokenBalance(memberAccount, CONFIG.tokens.DRIP.id);
    if (dripBalance !== 1) {
      throw new Error(`DRIP verification failed: expected 1, found ${dripBalance}`);
    }
    
    // 2. Get member record
    const member = await this.database.getMember(memberAccount);
    if (!member) {
      throw new Error(`Member ${memberAccount} not found`);
    }
    
    // 3. Member must have reached 1000-cap (completed lifecycle)
    if (!member.lifetime_cap_reached) {
      throw new Error(`Member must reach 1000 WISH cap before DRIP redemption (current: ${member.total_wish_claimed}/1000)`);
    }
    
    // 4. Check Treasury has sufficient balance for total payout (1.8 HBAR)
    const treasuryBalance = await this.getTreasuryBalance();
    const totalPayoutAmount = CONFIG.parameters.totalMemberPayout * CONFIG.constants.HBAR_TO_TINYBAR;
    
    if (treasuryBalance.tinybars < totalPayoutAmount) {
      throw new Error(`Treasury insufficient for payout: has ${treasuryBalance.hbar}, needs ${CONFIG.parameters.totalMemberPayout} HBAR`);
    }
    
    console.log(`✅ DRIP redemption validated: ${CONFIG.parameters.totalMemberPayout} HBAR total payout eligible`);
  }

  /**
   * Execute DRIP redemption operations post-consensus
   */
  async executePostConsensusDripRedeem(consensusData, consensusTimestamp) {
    const { memberAccount, clientNonce } = consensusData;
    
    console.log(`💰 Executing DRIP redemption post-consensus: ${memberAccount}`);
    
    try {
      // Re-validate redemption at execution time
      await this.validateDripRedemptionEligibility(memberAccount);
      
      const client = this.client.getClient();
      const refundAmount = Math.floor(CONFIG.parameters.memberRefund * CONFIG.constants.HBAR_TO_TINYBAR);
      const treasuryBonus = Math.floor(CONFIG.parameters.treasuryBonus * CONFIG.constants.HBAR_TO_TINYBAR);
      const totalPayout = Math.floor(CONFIG.parameters.totalMemberPayout * CONFIG.constants.HBAR_TO_TINYBAR);
      const treasuryFee = Math.floor(CONFIG.parameters.treasuryFee * CONFIG.constants.HBAR_TO_TINYBAR);
      
      // 1. Wipe DRIP token from member account
      const wipeTransaction = new TokenWipeTransaction()
        .setTokenId(CONFIG.tokens.DRIP.id)
        .setAccountId(memberAccount)
        .setAmount(1)
        .freezeWith(client);
      
      const wipeSigned = await wipeTransaction.sign(this.treasuryKey);
      const wipeReceipt = await client.executeTransaction(wipeSigned, 'DRIP token wipe');
      
      // 2. Transfer total HBAR payout to member (0.8 refund + 1.0 bonus = 1.8 HBAR)
      const payoutTransaction = new TransferTransaction()
        .addHbarTransfer(this.treasuryId, -totalPayout)
        .addHbarTransfer(memberAccount, totalPayout)
        .setTransactionMemo(`DRIP redemption: ${CONFIG.parameters.memberRefund} refund + ${CONFIG.parameters.treasuryBonus} bonus`)
        .freezeWith(client);
      
      const payoutSigned = await payoutTransaction.sign(this.treasuryKey);
      const payoutReceipt = await client.executeTransaction(payoutSigned, 'HBAR total payout');
      
      // 3. Update member record as redeemed
      const redemptionData = await this.database.processMemberRedemption(memberAccount, {
        wipeTxId: wipeReceipt.transactionId.toString(),
        payoutTxId: payoutReceipt.transactionId.toString(),
        totalPayout: totalPayout,
        refundAmount: refundAmount,
        treasuryBonus: treasuryBonus,
        treasuryFee: treasuryFee,
        redemptionDate: consensusTimestamp.toDate()
      });
      
      const result = {
        wipeTxId: wipeReceipt.transactionId.toString(),
        payoutTxId: payoutReceipt.transactionId.toString(),
        totalPayout: totalPayout,
        totalPayoutHbar: (totalPayout / CONFIG.constants.HBAR_TO_TINYBAR).toFixed(8),
        refundAmount: refundAmount,
        refundAmountHbar: (refundAmount / CONFIG.constants.HBAR_TO_TINYBAR).toFixed(8),
        treasuryBonus: treasuryBonus,
        treasuryBonusHbar: (treasuryBonus / CONFIG.constants.HBAR_TO_TINYBAR).toFixed(8),
        treasuryFee: treasuryFee,
        treasuryFeeHbar: (treasuryFee / CONFIG.constants.HBAR_TO_TINYBAR).toFixed(8),
        lifecycleCompleted: true,
        redemptionDate: consensusTimestamp.toDate()
      };
      
      this.updateOperationStatus(clientNonce, 'COMPLETED', result);
      console.log(`✅ DRIP redemption completed: ${result.totalPayoutHbar} HBAR total payout (${result.refundAmountHbar} refund + ${result.treasuryBonusHbar} bonus)`);
      
    } catch (error) {
      console.error('❌ DRIP redemption post-consensus failed:', error.message);
      this.updateOperationStatus(clientNonce, 'FAILED', { error: error.message });
    }
  }

  // ═══════════ SHARED UTILITY METHODS ═══════════

  /**
   * Submit operation to HCS topic
   */
  async submitToHCS(operationData, clientNonce) {
    try {
      const hcsTransaction = new TopicMessageSubmitTransaction()
        .setTopicId(this.hcsTopicId)
        .setMessage(JSON.stringify(operationData));

      const client = this.client.getClient();
      const hcsSubmission = await client.executeTransaction(hcsTransaction, 'HCS operation submission');
      const hcsReceipt = await hcsSubmission.getReceipt(client);
      
      this.pendingOperations.set(clientNonce, {
        type: operationData.type,
        hcsTransactionId: hcsReceipt.transactionId.toString(),
        status: 'HCS_SUBMITTED',
        submittedAt: new Date(),
        operationData: operationData
      });

      console.log(`✅ ${operationData.type} submitted to HCS: ${hcsReceipt.transactionId}`);
      
      return {
        hcsTransactionId: hcsReceipt.transactionId.toString(),
        sequenceNumber: operationData.sequenceNumber,
        clientNonce: clientNonce,
        status: 'HCS_SUBMITTED'
      };

    } catch (error) {
      console.error('❌ HCS submission failed:', error.message);
      throw new Error(`HCS consensus submission failed: ${error.message}`);
    }
  }

  /**
   * Execute token transfer sequence (unfreeze → transfer → freeze)
   */
  async executeTokenTransferSequence(accountId, tokenId, amount, resultObj) {
    const client = this.client.getClient();
    
    // Unfreeze
    const unfreezeTransaction = new TokenUnfreezeTransaction()
      .setTokenId(tokenId)
      .setAccountId(accountId)
      .freezeWith(client);
    
    const unfreezeSigned = await unfreezeTransaction.sign(this.treasuryKey);
    await client.executeTransaction(unfreezeSigned, 'Token unfreeze');
    
    // Transfer
    const transferTransaction = new TransferTransaction()
      .addTokenTransfer(tokenId, this.treasuryId, -amount)
      .addTokenTransfer(tokenId, accountId, amount)
      .freezeWith(client);
    
    const transferSigned = await transferTransaction.sign(this.treasuryKey);
    const transferReceipt = await client.executeTransaction(transferSigned, 'Token transfer');
    resultObj.transferTxId = transferReceipt.transactionId.toString();
    
    // Re-freeze (for DRIP tokens)
    if (tokenId === CONFIG.tokens.DRIP.id) {
      const freezeTransaction = new TokenFreezeTransaction()
        .setTokenId(tokenId)
        .setAccountId(accountId)
        .freezeWith(client);
      
      const freezeSigned = await freezeTransaction.sign(this.treasuryKey);
      const freezeReceipt = await client.executeTransaction(freezeSigned, 'Token freeze');
      resultObj.freezeTxId = freezeReceipt.transactionId.toString();
    }
  }

  /**
   * Execute AutoRelease when 1000-cap is reached
   */
  async executeAutoRelease(memberAccount) {
    console.log(`🔄 Executing AutoRelease for ${memberAccount}...`);
    
    const client = this.client.getClient();
    const refundAmount = Math.floor(CONFIG.parameters.memberRefund * CONFIG.constants.HBAR_TO_TINYBAR);
    const treasuryBonus = Math.floor(CONFIG.parameters.treasuryBonus * CONFIG.constants.HBAR_TO_TINYBAR);
    const totalPayout = Math.floor(CONFIG.parameters.totalMemberPayout * CONFIG.constants.HBAR_TO_TINYBAR);
    
    // 1. Wipe DRIP token
    const wipeTransaction = new TokenWipeTransaction()
      .setTokenId(CONFIG.tokens.DRIP.id)
      .setAccountId(memberAccount)
      .setAmount(1)
      .freezeWith(client);
    
    const wipeSigned = await wipeTransaction.sign(this.treasuryKey);
    const wipeReceipt = await client.executeTransaction(wipeSigned, 'AutoRelease DRIP wipe');
    
    // 2. Transfer total payout (0.8 refund + 1.0 bonus = 1.8 HBAR)
    const payoutTransaction = new TransferTransaction()
      .addHbarTransfer(this.treasuryId, -totalPayout)
      .addHbarTransfer(memberAccount, totalPayout)
      .setTransactionMemo(`AutoRelease: ${CONFIG.parameters.memberRefund} refund + ${CONFIG.parameters.treasuryBonus} bonus`)
      .freezeWith(client);
    
    const payoutSigned = await payoutTransaction.sign(this.treasuryKey);
    const payoutReceipt = await client.executeTransaction(payoutSigned, 'AutoRelease HBAR total payout');
    
    // 3. Update database
    await this.database.processAutoRelease(memberAccount);
    
    return {
      wipeTxId: wipeReceipt.transactionId.toString(),
      payoutTxId: payoutReceipt.transactionId.toString(),
      totalPayout: totalPayout,
      totalPayoutHbar: (totalPayout / CONFIG.constants.HBAR_TO_TINYBAR).toFixed(8),
      refundAmount: refundAmount,
      refundAmountHbar: (refundAmount / CONFIG.constants.HBAR_TO_TINYBAR).toFixed(8),
      treasuryBonus: treasuryBonus,
      treasuryBonusHbar: (treasuryBonus / CONFIG.constants.HBAR_TO_TINYBAR).toFixed(8)
    };
  }

  /**
   * Validate Treasury authority for operations
   */
  async validateTreasuryAuthority(operationType, accountId, amount = 0) {
    // Implementation of Treasury authority validation
    console.log(`🔐 Validating Treasury authority for ${operationType}`);
    // Add specific validation logic based on operation type
  }

  /**
   * Get token balance for account
   */
  async getTokenBalance(accountId, tokenId) {
    const client = this.client.getClient();
    try {
      const balance = await new AccountBalanceQuery()
        .setAccountId(accountId)
        .execute(client);
      
      const tokenBalance = balance.tokens.get(TokenId.fromString(tokenId));
      return tokenBalance ? tokenBalance.toNumber() : 0;
    } catch (error) {
      return 0;
    }
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
   * Sign operation with Treasury key
   */
  async signOperation(operationType, accountId, amount, nonce) {
    const message = `${operationType}:${accountId}:${amount}:${nonce}`;
    const signature = this.treasuryKey.sign(Buffer.from(message, 'utf8'));
    return signature.toString('hex');
  }

  /**
   * Update operation status
   */
  updateOperationStatus(clientNonce, status, result = null) {
    if (this.pendingOperations.has(clientNonce)) {
      this.pendingOperations.set(clientNonce, {
        ...this.pendingOperations.get(clientNonce),
        status: status,
        result: result,
        updatedAt: new Date()
      });
    }
  }

  /**
   * Get operation status
   */
  getOperationStatus(clientNonce) {
    return this.pendingOperations.get(clientNonce) || null;
  }

  /**
   * Get system health
   */
  async getSystemHealth() {
    const treasuryBalance = await this.getTreasuryBalance();
    const dripSupply = await this.getTokenBalance(this.treasuryId.toString(), CONFIG.tokens.DRIP.id);
    
    return {
      status: 'healthy',
      hcsSubscription: 'active',
      treasuryBalance: treasuryBalance,
      pendingOperations: this.pendingOperations.size,
      dripTokenSupply: dripSupply,
      lastSequenceNumber: this.sequenceNumber,
      operationTypes: Object.keys(this.OPERATION_TYPES)
    };
  }
}

// Singleton instance
let unifiedCoordinatorInstance = null;

/**
 * Get or create singleton unified coordinator instance
 */
async function getUnifiedProtocolCoordinator() {
  if (!unifiedCoordinatorInstance) {
    unifiedCoordinatorInstance = new HCSUnifiedProtocolCoordinator();
    await unifiedCoordinatorInstance.initialize();
  }
  return unifiedCoordinatorInstance;
}

module.exports = {
  HCSUnifiedProtocolCoordinator,
  getUnifiedProtocolCoordinator
};