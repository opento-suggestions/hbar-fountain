/**
 * HTS Token Operations
 * Native Hedera Token Service operations for Fountain Protocol
 */

const {
  TokenMintTransaction,
  TokenBurnTransaction,
  TokenAssociateTransaction,
  TokenFreezeTransaction,
  TokenUnfreezeTransaction,
  TokenWipeTransaction,
  TransferTransaction,
  AccountBalanceQuery,
  TokenInfoQuery,
  AccountId,
  TokenId,
  PrivateKey
} = require('@hashgraph/sdk');

const { CONFIG } = require('../config');
const { getHederaClient } = require('./hedera-client');

class TokenOperations {
  constructor() {
    this.client = null;
    this.treasuryId = AccountId.fromString(CONFIG.accounts.treasury);
    this.treasuryKey = PrivateKey.fromString(CONFIG.accounts.treasuryKey);
  }

  /**
   * Initialize with Hedera client
   */
  async initialize() {
    this.client = await getHederaClient();
    return this.client.getClient();
  }

  // ═══════════ DRIP TOKEN OPERATIONS ═══════════

  /**
   * Mint DRIP membership token (1 per member)
   * @param {string} memberAccountId - Member account to receive DRIP
   * @returns {Object} Transaction receipt and details
   */
  async mintDripToken(memberAccountId) {
    const client = await this.initialize();
    
    console.log(`🪙 Minting 1 DRIP token for member ${memberAccountId}`);
    
    try {
      // 1. Mint 1 DRIP token to treasury
      const mintTransaction = new TokenMintTransaction()
        .setTokenId(CONFIG.tokens.DRIP.id)
        .setAmount(1)
        .freezeWith(client);
      
      const mintSigned = await mintTransaction.sign(this.treasuryKey);
      const mintReceipt = await client.executeTransaction(
        mintSigned,
        'DRIP token mint'
      );
      
      // 2. Unfreeze member account for transfer
      await this.unfreezeAccount(CONFIG.tokens.DRIP.id, memberAccountId);
      
      // 3. Transfer DRIP to member
      const transferTransaction = new TransferTransaction()
        .addTokenTransfer(CONFIG.tokens.DRIP.id, this.treasuryId, -1)
        .addTokenTransfer(CONFIG.tokens.DRIP.id, memberAccountId, 1)
        .freezeWith(client);
      
      const transferSigned = await transferTransaction.sign(this.treasuryKey);
      const transferReceipt = await client.executeTransaction(
        transferSigned,
        'DRIP token transfer'
      );
      
      // 4. Re-freeze member account (non-transferable)
      await this.freezeAccount(CONFIG.tokens.DRIP.id, memberAccountId);
      
      console.log('✅ DRIP token minted and transferred successfully');
      
      return {
        mintTxId: mintReceipt.transactionId.toString(),
        transferTxId: transferReceipt.transactionId.toString(),
        tokenId: CONFIG.tokens.DRIP.id,
        amount: 1,
        recipient: memberAccountId,
        frozen: true
      };
      
    } catch (error) {
      console.error('❌ DRIP token mint failed:', error.message);
      throw error;
    }
  }

  /**
   * Verify DRIP token ownership
   * @param {string} accountId - Account to verify
   * @returns {boolean} True if account holds exactly 1 DRIP
   */
  async verifyDripOwnership(accountId) {
    try {
      const balance = await this.getTokenBalance(accountId, CONFIG.tokens.DRIP.id);
      const hasOneDrip = balance === 1;
      
      console.log(`🔍 DRIP verification for ${accountId}: ${balance} tokens (valid: ${hasOneDrip})`);
      return hasOneDrip;
      
    } catch (error) {
      console.error('❌ DRIP verification failed:', error.message);
      return false;
    }
  }

  /**
   * Wipe DRIP token (AutoRelease mechanism)
   * @param {string} accountId - Account to wipe DRIP from
   * @returns {Object} Transaction receipt
   */
  async wipeDripToken(accountId) {
    const client = await this.initialize();
    
    console.log(`🗑️ Wiping DRIP token from ${accountId} (AutoRelease)`);
    
    try {
      const wipeTransaction = new TokenWipeTransaction()
        .setTokenId(CONFIG.tokens.DRIP.id)
        .setAccountId(accountId)
        .setAmount(1)
        .freezeWith(client);
      
      const wipeSigned = await wipeTransaction.sign(this.treasuryKey);
      const wipeReceipt = await client.executeTransaction(
        wipeSigned,
        'DRIP token wipe (AutoRelease)'
      );
      
      console.log('✅ DRIP token wiped successfully');
      
      return {
        txId: wipeReceipt.transactionId.toString(),
        tokenId: CONFIG.tokens.DRIP.id,
        wipedFrom: accountId,
        amount: 1
      };
      
    } catch (error) {
      console.error('❌ DRIP token wipe failed:', error.message);
      throw error;
    }
  }

  // ═══════════ WISH TOKEN OPERATIONS ═══════════

  /**
   * Mint WISH reward tokens
   * @param {string} recipientAccountId - Account to receive WISH
   * @param {number} amount - Amount of WISH to mint
   * @returns {Object} Transaction receipt and details
   */
  async mintWishTokens(recipientAccountId, amount) {
    const client = await this.initialize();
    
    console.log(`🌟 Minting ${amount} WISH tokens for ${recipientAccountId}`);
    
    try {
      // 1. Mint WISH tokens to treasury
      const mintTransaction = new TokenMintTransaction()
        .setTokenId(CONFIG.tokens.WISH.id)
        .setAmount(amount)
        .freezeWith(client);
      
      const mintSigned = await mintTransaction.sign(this.treasuryKey);
      const mintReceipt = await client.executeTransaction(
        mintSigned,
        'WISH token mint'
      );
      
      // 2. Transfer WISH to recipient
      const transferTransaction = new TransferTransaction()
        .addTokenTransfer(CONFIG.tokens.WISH.id, this.treasuryId, -amount)
        .addTokenTransfer(CONFIG.tokens.WISH.id, recipientAccountId, amount)
        .freezeWith(client);
      
      const transferSigned = await transferTransaction.sign(this.treasuryKey);
      const transferReceipt = await client.executeTransaction(
        transferSigned,
        'WISH token transfer'
      );
      
      console.log('✅ WISH tokens minted and transferred successfully');
      
      return {
        mintTxId: mintReceipt.transactionId.toString(),
        transferTxId: transferReceipt.transactionId.toString(),
        tokenId: CONFIG.tokens.WISH.id,
        amount: amount,
        recipient: recipientAccountId
      };
      
    } catch (error) {
      console.error('❌ WISH token mint failed:', error.message);
      throw error;
    }
  }

  /**
   * Burn WISH tokens (redemption mechanism)
   * @param {string} holderAccountId - Account holding WISH to burn
   * @param {number} amount - Amount of WISH to burn
   * @returns {Object} Transaction receipt and details
   */
  async burnWishTokens(holderAccountId, amount) {
    const client = await this.initialize();
    
    console.log(`🔥 Burning ${amount} WISH tokens from ${holderAccountId}`);
    
    try {
      // 1. Transfer WISH from holder to treasury (for burning)
      const transferTransaction = new TransferTransaction()
        .addTokenTransfer(CONFIG.tokens.WISH.id, holderAccountId, -amount)
        .addTokenTransfer(CONFIG.tokens.WISH.id, this.treasuryId, amount)
        .freezeWith(client);
      
      const transferSigned = await transferTransaction.sign(this.treasuryKey);
      const transferReceipt = await client.executeTransaction(
        transferSigned,
        'WISH token transfer for burning'
      );
      
      // 2. Burn WISH tokens from treasury
      const burnTransaction = new TokenBurnTransaction()
        .setTokenId(CONFIG.tokens.WISH.id)
        .setAmount(amount)
        .freezeWith(client);
      
      const burnSigned = await burnTransaction.sign(this.treasuryKey);
      const burnReceipt = await client.executeTransaction(
        burnSigned,
        'WISH token burn'
      );
      
      console.log('✅ WISH tokens burned successfully');
      
      return {
        transferTxId: transferReceipt.transactionId.toString(),
        burnTxId: burnReceipt.transactionId.toString(),
        tokenId: CONFIG.tokens.WISH.id,
        amount: amount,
        burnedFrom: holderAccountId
      };
      
    } catch (error) {
      console.error('❌ WISH token burn failed:', error.message);
      throw error;
    }
  }

  // ═══════════ DROP TOKEN OPERATIONS ═══════════

  /**
   * Mint DROP donor badge (one per donor wallet)
   * @param {string} donorAccountId - Donor account to receive DROP
   * @returns {Object} Transaction receipt and details
   */
  async mintDropToken(donorAccountId) {
    const client = await this.initialize();
    
    // 1 DROP with 8 decimals = 100,000,000 units
    const dropAmount = 100000000;
    
    console.log(`💧 Minting 1 DROP token for donor ${donorAccountId}`);
    
    try {
      // 1. Mint DROP token to treasury
      const mintTransaction = new TokenMintTransaction()
        .setTokenId(CONFIG.tokens.DROP.id)
        .setAmount(dropAmount)
        .freezeWith(client);
      
      const mintSigned = await mintTransaction.sign(this.treasuryKey);
      const mintReceipt = await client.executeTransaction(
        mintSigned,
        'DROP token mint'
      );
      
      // 2. Transfer DROP to donor
      const transferTransaction = new TransferTransaction()
        .addTokenTransfer(CONFIG.tokens.DROP.id, this.treasuryId, -dropAmount)
        .addTokenTransfer(CONFIG.tokens.DROP.id, donorAccountId, dropAmount)
        .freezeWith(client);
      
      const transferSigned = await transferTransaction.sign(this.treasuryKey);
      const transferReceipt = await client.executeTransaction(
        transferSigned,
        'DROP token transfer'
      );
      
      console.log('✅ DROP token minted and transferred successfully');
      
      return {
        mintTxId: mintReceipt.transactionId.toString(),
        transferTxId: transferReceipt.transactionId.toString(),
        tokenId: CONFIG.tokens.DROP.id,
        amount: dropAmount,
        recipient: donorAccountId
      };
      
    } catch (error) {
      console.error('❌ DROP token mint failed:', error.message);
      throw error;
    }
  }

  // ═══════════ GENERAL TOKEN OPERATIONS ═══════════

  /**
   * Associate account with token
   * @param {string} accountId - Account to associate
   * @param {string} tokenId - Token to associate with
   * @param {string} accountKey - Private key for account (if different from treasury)
   * @returns {Object} Transaction receipt
   */
  async associateToken(accountId, tokenId, accountKey = null) {
    const client = await this.initialize();
    
    console.log(`🔗 Associating ${accountId} with token ${tokenId}`);
    
    try {
      const associateTransaction = new TokenAssociateTransaction()
        .setAccountId(accountId)
        .setTokenIds([tokenId])
        .freezeWith(client);
      
      // Sign with account key or treasury key
      const signingKey = accountKey ? PrivateKey.fromString(accountKey) : this.treasuryKey;
      const associateSigned = await associateTransaction.sign(signingKey);
      
      const associateReceipt = await client.executeTransaction(
        associateSigned,
        'Token association'
      );
      
      console.log('✅ Token association successful');
      
      return {
        txId: associateReceipt.transactionId.toString(),
        accountId: accountId,
        tokenId: tokenId
      };
      
    } catch (error) {
      console.error('❌ Token association failed:', error.message);
      throw error;
    }
  }

  /**
   * Get token balance for account
   * @param {string} accountId - Account to query
   * @param {string} tokenId - Token to check balance for
   * @returns {number} Token balance
   */
  async getTokenBalance(accountId, tokenId) {
    const client = await this.initialize();
    
    try {
      const balanceQuery = new AccountBalanceQuery()
        .setAccountId(accountId);
      
      const balance = await client.executeQuery(
        balanceQuery,
        `Token balance query for ${accountId}`
      );
      
      const tokenBalance = balance.tokens.get(TokenId.fromString(tokenId));
      const balanceAmount = tokenBalance ? tokenBalance.toNumber() : 0;
      
      console.log(`💰 Token balance for ${accountId}: ${balanceAmount} ${tokenId}`);
      return balanceAmount;
      
    } catch (error) {
      console.error('❌ Token balance query failed:', error.message);
      return 0;
    }
  }

  /**
   * Freeze account for token (make non-transferable)
   * @param {string} tokenId - Token to freeze
   * @param {string} accountId - Account to freeze
   * @returns {Object} Transaction receipt
   */
  async freezeAccount(tokenId, accountId) {
    const client = await this.initialize();
    
    console.log(`🧊 Freezing ${accountId} for token ${tokenId}`);
    
    try {
      const freezeTransaction = new TokenFreezeTransaction()
        .setTokenId(tokenId)
        .setAccountId(accountId)
        .freezeWith(client);
      
      const freezeSigned = await freezeTransaction.sign(this.treasuryKey);
      const freezeReceipt = await client.executeTransaction(
        freezeSigned,
        'Token freeze'
      );
      
      console.log('✅ Account frozen successfully');
      
      return {
        txId: freezeReceipt.transactionId.toString(),
        tokenId: tokenId,
        frozenAccount: accountId
      };
      
    } catch (error) {
      console.error('❌ Token freeze failed:', error.message);
      throw error;
    }
  }

  /**
   * Unfreeze account for token (allow transfers)
   * @param {string} tokenId - Token to unfreeze
   * @param {string} accountId - Account to unfreeze
   * @returns {Object} Transaction receipt
   */
  async unfreezeAccount(tokenId, accountId) {
    const client = await this.initialize();
    
    console.log(`🔓 Unfreezing ${accountId} for token ${tokenId}`);
    
    try {
      const unfreezeTransaction = new TokenUnfreezeTransaction()
        .setTokenId(tokenId)
        .setAccountId(accountId)
        .freezeWith(client);
      
      const unfreezeSigned = await unfreezeTransaction.sign(this.treasuryKey);
      const unfreezeReceipt = await client.executeTransaction(
        unfreezeSigned,
        'Token unfreeze'
      );
      
      console.log('✅ Account unfrozen successfully');
      
      return {
        txId: unfreezeReceipt.transactionId.toString(),
        tokenId: tokenId,
        unfrozenAccount: accountId
      };
      
    } catch (error) {
      console.error('❌ Token unfreeze failed:', error.message);
      throw error;
    }
  }

  /**
   * Transfer HBAR between accounts
   * @param {string} fromAccountId - Sender account
   * @param {string} toAccountId - Recipient account  
   * @param {number} amount - Amount in tinybars
   * @param {string} fromAccountKey - Private key for sender (if different from treasury)
   * @returns {Object} Transaction receipt
   */
  async transferHbar(fromAccountId, toAccountId, amount, fromAccountKey = null) {
    const client = await this.initialize();
    
    console.log(`💸 Transferring ${amount} tinybars from ${fromAccountId} to ${toAccountId}`);
    
    try {
      const transferTransaction = new TransferTransaction()
        .addHbarTransfer(fromAccountId, -amount)
        .addHbarTransfer(toAccountId, amount)
        .freezeWith(client);
      
      // Sign with appropriate key
      const signingKey = fromAccountKey ? PrivateKey.fromString(fromAccountKey) : this.treasuryKey;
      const transferSigned = await transferTransaction.sign(signingKey);
      
      const transferReceipt = await client.executeTransaction(
        transferSigned,
        'HBAR transfer'
      );
      
      console.log('✅ HBAR transfer successful');
      
      return {
        txId: transferReceipt.transactionId.toString(),
        from: fromAccountId,
        to: toAccountId,
        amount: amount,
        amountHbar: (amount / CONFIG.constants.HBAR_TO_TINYBAR).toFixed(8)
      };
      
    } catch (error) {
      console.error('❌ HBAR transfer failed:', error.message);
      throw error;
    }
  }

  /**
   * Get comprehensive token information
   * @param {string} tokenId - Token to query
   * @returns {Object} Token information
   */
  async getTokenInfo(tokenId) {
    const client = await this.initialize();
    
    try {
      const tokenInfoQuery = new TokenInfoQuery()
        .setTokenId(tokenId);
      
      const tokenInfo = await client.executeQuery(
        tokenInfoQuery,
        `Token info query for ${tokenId}`
      );
      
      return {
        tokenId: tokenInfo.tokenId.toString(),
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals,
        totalSupply: tokenInfo.totalSupply.toString(),
        treasury: tokenInfo.treasuryAccountId.toString(),
        defaultFreezeStatus: tokenInfo.defaultFreezeStatus,
        defaultKycStatus: tokenInfo.defaultKycStatus,
        pauseStatus: tokenInfo.pauseStatus,
        supplyType: tokenInfo.supplyType,
        maxSupply: tokenInfo.maxSupply?.toString() || 'infinite'
      };
      
    } catch (error) {
      console.error('❌ Token info query failed:', error.message);
      throw error;
    }
  }

  // ═══════════ PROTOCOL-SPECIFIC OPERATIONS ═══════════

  /**
   * Execute complete membership deposit flow
   * @param {string} memberAccountId - New member account
   * @param {number} depositAmount - HBAR deposit in tinybars
   * @returns {Object} Complete transaction details
   */
  async processMemershipDeposit(memberAccountId, depositAmount) {
    console.log(`🎫 Processing membership deposit for ${memberAccountId}`);
    
    // Validate deposit amount (exactly 1 HBAR)
    if (depositAmount !== CONFIG.parameters.membershipDeposit) {
      throw new Error(`Invalid deposit amount. Expected ${CONFIG.parameters.membershipDeposit} tinybars, got ${depositAmount}`);
    }
    
    try {
      // 1. Associate member with DRIP token
      await this.associateToken(memberAccountId, CONFIG.tokens.DRIP.id);
      
      // 2. Associate member with WISH token (for future claims)
      await this.associateToken(memberAccountId, CONFIG.tokens.WISH.id);
      
      // 3. Mint and transfer DRIP token
      const dripResult = await this.mintDripToken(memberAccountId);
      
      console.log('✅ Membership deposit completed successfully');
      
      return {
        member: memberAccountId,
        depositAmount: depositAmount,
        dripToken: dripResult,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Membership deposit failed:', error.message);
      throw error;
    }
  }

  /**
   * Execute complete redemption flow (burn-then-pay)
   * @param {string} redeemerAccountId - Account redeeming WISH
   * @param {number} wishAmount - Amount of WISH to redeem
   * @returns {Object} Complete redemption details
   */
  async processRedemption(redeemerAccountId, wishAmount) {
    console.log(`💱 Processing redemption for ${redeemerAccountId}: ${wishAmount} WISH`);
    
    // Validate redemption amount
    if (wishAmount < 1 || wishAmount > CONFIG.parameters.maxRedemptionAmount) {
      throw new Error(`Invalid redemption amount. Must be between 1 and ${CONFIG.parameters.maxRedemptionAmount} WISH`);
    }
    
    try {
      // 1. Verify WISH balance
      const wishBalance = await this.getTokenBalance(redeemerAccountId, CONFIG.tokens.WISH.id);
      if (wishBalance < wishAmount) {
        throw new Error(`Insufficient WISH balance. Has ${wishBalance}, needs ${wishAmount}`);
      }
      
      // 2. Calculate HBAR payout
      const hbarPayout = Math.floor(wishAmount * CONFIG.parameters.wishToHbarRate * CONFIG.constants.HBAR_TO_TINYBAR);
      
      // 3. Burn WISH tokens (burn-then-pay pattern)
      const burnResult = await this.burnWishTokens(redeemerAccountId, wishAmount);
      
      // 4. Pay HBAR to redeemer
      const paymentResult = await this.transferHbar(
        CONFIG.accounts.treasury,
        redeemerAccountId,
        hbarPayout
      );
      
      console.log('✅ Redemption completed successfully');
      
      return {
        redeemer: redeemerAccountId,
        wishBurned: wishAmount,
        hbarPaid: hbarPayout,
        hbarPaidFormatted: (hbarPayout / CONFIG.constants.HBAR_TO_TINYBAR).toFixed(8),
        rate: CONFIG.parameters.wishToHbarRate,
        burnTransaction: burnResult,
        paymentTransaction: paymentResult,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Redemption failed:', error.message);
      throw error;
    }
  }
}

// Singleton instance
let tokenOperationsInstance = null;

/**
 * Get or create singleton token operations instance
 */
async function getTokenOperations() {
  if (!tokenOperationsInstance) {
    tokenOperationsInstance = new TokenOperations();
    await tokenOperationsInstance.initialize();
  }
  return tokenOperationsInstance;
}

module.exports = {
  TokenOperations,
  getTokenOperations
};