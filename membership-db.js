/**
 * Membership Database Management
 * Persistent storage for member state and quota tracking
 */

const sqlite3 = require('sqlite3').verbose();
const { CONFIG } = require('../config');

class MembershipDatabase {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize database connection and create tables
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      console.log('📚 Initializing membership database...');
      
      this.db = new sqlite3.Database(CONFIG.infrastructure.database.url, (err) => {
        if (err) {
          console.error('❌ Database connection failed:', err.message);
          reject(err);
          return;
        }
        
        console.log('✅ Connected to SQLite database');
        this.createTables()
          .then(() => {
            this.isInitialized = true;
            console.log('✅ Database initialized successfully');
            resolve();
          })
          .catch(reject);
      });
    });
  }

  /**
   * Create necessary database tables
   */
  async createTables() {
    return new Promise((resolve, reject) => {
      const createMembersTable = `
        CREATE TABLE IF NOT EXISTS members (
          account_id TEXT PRIMARY KEY,
          drip_tokens INTEGER NOT NULL DEFAULT 1,
          deposited_hbar INTEGER NOT NULL,
          total_wish_claimed INTEGER NOT NULL DEFAULT 0,
          max_wish_allowed INTEGER NOT NULL DEFAULT ${CONFIG.parameters.maxWishPerDrip},
          remaining_wish INTEGER NOT NULL DEFAULT ${CONFIG.parameters.maxWishPerDrip},
          deposit_date TEXT NOT NULL,
          last_claim_date TEXT,
          is_active BOOLEAN NOT NULL DEFAULT 1,
          lifecycle_count INTEGER NOT NULL DEFAULT 1,
          lifetime_cap_reached BOOLEAN NOT NULL DEFAULT 0,
          auto_release_date TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createClaimsTable = `
        CREATE TABLE IF NOT EXISTS claims (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id TEXT NOT NULL,
          claim_amount INTEGER NOT NULL,
          claim_date TEXT NOT NULL,
          daily_entitlement INTEGER NOT NULL,
          cumulative_claimed INTEGER NOT NULL,
          remaining_quota INTEGER NOT NULL,
          transaction_id TEXT NOT NULL,
          block_timestamp TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (account_id) REFERENCES members (account_id)
        )
      `;

      const createRedemptionsTable = `
        CREATE TABLE IF NOT EXISTS redemptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id TEXT NOT NULL,
          wish_amount INTEGER NOT NULL,
          hbar_amount INTEGER NOT NULL,
          exchange_rate REAL NOT NULL,
          burn_transaction_id TEXT NOT NULL,
          payment_transaction_id TEXT NOT NULL,
          redemption_date TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (account_id) REFERENCES members (account_id)
        )
      `;

      const createDailyStatesTable = `
        CREATE TABLE IF NOT EXISTS daily_states (
          date TEXT PRIMARY KEY,
          active_holders INTEGER NOT NULL,
          new_donors INTEGER NOT NULL,
          growth_rate REAL NOT NULL DEFAULT 0.0,
          cumulative_score REAL NOT NULL DEFAULT 0.0,
          growth_multiplier REAL NOT NULL DEFAULT 1.0,
          donor_booster INTEGER NOT NULL DEFAULT 0,
          final_entitlement INTEGER NOT NULL,
          total_wish_allocated INTEGER NOT NULL,
          hcs_transaction_id TEXT,
          snapshot_timestamp TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createDonationsTable = `
        CREATE TABLE IF NOT EXISTS donations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          donor_account_id TEXT NOT NULL,
          amount_hbar INTEGER NOT NULL,
          drop_minted BOOLEAN NOT NULL DEFAULT 0,
          rebate_wish INTEGER NOT NULL DEFAULT 0,
          donation_date TEXT NOT NULL,
          transaction_id TEXT NOT NULL,
          drop_transaction_id TEXT,
          rebate_transaction_id TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Execute table creation
      this.db.serialize(() => {
        this.db.run(sql, [
        stateData.date,
        stateData.activeHolders,
        stateData.newDonors,
        stateData.growthRate,
        stateData.cumulativeScore,
        stateData.growthMultiplier,
        stateData.donorBooster,
        stateData.finalEntitlement,
        stateData.totalWishAllocated,
        stateData.hcsTransactionId,
        stateData.snapshotTimestamp
      ], function(err) {
        if (err) {
          console.error('❌ Failed to record daily state:', err.message);
          reject(err);
          return;
        }
        
        console.log(`✅ Daily state recorded: ${stateData.date}`);
        resolve({ ...stateData, id: this.lastID });
      });
    });
  }

  /**
   * Get daily state by date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Object|null} Daily state or null if not found
   */
  async getDailyState(date) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM daily_states WHERE date = ?`;
      
      this.db.get(sql, [date], (err, row) => {
        if (err) {
          console.error('❌ Failed to get daily state:', err.message);
          reject(err);
          return;
        }
        
        resolve(row || null);
      });
    });
  }

  /**
   * Get latest daily state (for cumulative score tracking)
   * @returns {Object|null} Latest daily state
   */
  async getLatestDailyState() {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM daily_states ORDER BY date DESC LIMIT 1`;
      
      this.db.get(sql, [], (err, row) => {
        if (err) {
          console.error('❌ Failed to get latest daily state:', err.message);
          reject(err);
          return;
        }
        
        resolve(row || null);
      });
    });
  }

  // ═══════════ REDEMPTION TRACKING ═══════════

  /**
   * Record a redemption transaction
   * @param {Object} redemptionData - Redemption details
   * @returns {Object} Recorded redemption
   */
  async recordRedemption(redemptionData) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO redemptions (
          account_id, wish_amount, hbar_amount, exchange_rate,
          burn_transaction_id, payment_transaction_id, redemption_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        redemptionData.accountId,
        redemptionData.wishAmount,
        redemptionData.hbarAmount,
        redemptionData.exchangeRate,
        redemptionData.burnTransactionId,
        redemptionData.paymentTransactionId,
        redemptionData.redemptionDate
      ], function(err) {
        if (err) {
          console.error('❌ Failed to record redemption:', err.message);
          reject(err);
          return;
        }
        
        console.log(`✅ Redemption recorded: ${redemptionData.accountId} -> ${redemptionData.wishAmount} WISH`);
        resolve({ ...redemptionData, id: this.lastID });
      });
    });
  }

  /**
   * Get redemption history
   * @param {string} accountId - Optional account filter
   * @param {number} limit - Maximum number of redemptions to return
   * @returns {Array} Redemption history
   */
  async getRedemptionHistory(accountId = null, limit = 100) {
    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM redemptions`;
      let params = [];
      
      if (accountId) {
        sql += ` WHERE account_id = ?`;
        params.push(accountId);
      }
      
      sql += ` ORDER BY redemption_date DESC LIMIT ?`;
      params.push(limit);
      
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('❌ Failed to get redemption history:', err.message);
          reject(err);
          return;
        }
        
        resolve(rows || []);
      });
    });
  }

  // ═══════════ DONATION TRACKING ═══════════

  /**
   * Record a donation
   * @param {Object} donationData - Donation details
   * @returns {Object} Recorded donation
   */
  async recordDonation(donationData) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO donations (
          donor_account_id, amount_hbar, drop_minted, rebate_wish,
          donation_date, transaction_id, drop_transaction_id, rebate_transaction_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        donationData.donorAccountId,
        donationData.amountHbar,
        donationData.dropMinted ? 1 : 0,
        donationData.rebateWish,
        donationData.donationDate,
        donationData.transactionId,
        donationData.dropTransactionId,
        donationData.rebateTransactionId
      ], function(err) {
        if (err) {
          console.error('❌ Failed to record donation:', err.message);
          reject(err);
          return;
        }
        
        console.log(`✅ Donation recorded: ${donationData.donorAccountId} -> ${donationData.amountHbar} tinybar`);
        resolve({ ...donationData, id: this.lastID });
      });
    });
  }

  /**
   * Check if account has already received DROP token
   * @param {string} accountId - Donor account ID
   * @returns {boolean} True if already received DROP
   */
  async hasReceivedDrop(accountId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT COUNT(*) as count FROM donations WHERE donor_account_id = ? AND drop_minted = 1`;
      
      this.db.get(sql, [accountId], (err, row) => {
        if (err) {
          console.error('❌ Failed to check DROP status:', err.message);
          reject(err);
          return;
        }
        
        resolve(row.count > 0);
      });
    });
  }

  // ═══════════ ANALYTICS & REPORTING ═══════════

  /**
   * Get protocol statistics
   * @returns {Object} Protocol statistics
   */
  async getProtocolStats() {
    return new Promise((resolve, reject) => {
      const queries = {
        totalMembers: `SELECT COUNT(*) as count FROM members`,
        activeMembers: `SELECT COUNT(*) as count FROM members WHERE is_active = 1`,
        totalWishClaimed: `SELECT SUM(total_wish_claimed) as total FROM members`,
        totalRedemptions: `SELECT COUNT(*) as count FROM redemptions`,
        totalHbarRedeemed: `SELECT SUM(hbar_amount) as total FROM redemptions`,
        totalDonations: `SELECT COUNT(*) as count FROM donations`,
        totalHbarDonated: `SELECT SUM(amount_hbar) as total FROM donations`,
        membersAtCap: `SELECT COUNT(*) as count FROM members WHERE lifetime_cap_reached = 1`,
        autoReleases: `SELECT COUNT(*) as count FROM members WHERE auto_release_date IS NOT NULL`
      };
      
      const stats = {};
      const promises = Object.entries(queries).map(([key, sql]) => {
        return new Promise((resolve, reject) => {
          this.db.get(sql, [], (err, row) => {
            if (err) reject(err);
            else {
              stats[key] = row.count !== undefined ? row.count : (row.total || 0);
              resolve();
            }
          });
        });
      });
      
      Promise.all(promises)
        .then(() => {
          console.log('📊 Protocol statistics retrieved');
          resolve(stats);
        })
        .catch(reject);
    });
  }

  /**
   * Get member summary with recent activity
   * @param {string} accountId - Member account ID
   * @returns {Object} Member summary
   */
  async getMemberSummary(accountId) {
    const member = await this.getMember(accountId);
    if (!member) return null;
    
    const [claimHistory, redemptionHistory] = await Promise.all([
      this.getClaimHistory(accountId, 10),
      this.getRedemptionHistory(accountId, 10)
    ]);
    
    return {
      member,
      recentClaims: claimHistory,
      recentRedemptions: redemptionHistory,
      summary: {
        totalClaimed: member.total_wish_claimed,
        remainingQuota: member.remaining_wish,
        percentageUsed: ((member.total_wish_claimed / member.max_wish_allowed) * 100).toFixed(2),
        isActive: member.is_active === 1,
        atLifetimeCap: member.lifetime_cap_reached === 1,
        lifecycleCount: member.lifecycle_count
      }
    };
  }

  /**
   * Backup database to file
   * @param {string} backupPath - Path for backup file
   * @returns {Promise} Backup completion promise
   */
  async backup(backupPath) {
    return new Promise((resolve, reject) => {
      console.log(`💾 Creating database backup: ${backupPath}`);
      
      const fs = require('fs');
      const readStream = fs.createReadStream(CONFIG.infrastructure.database.url);
      const writeStream = fs.createWriteStream(backupPath);
      
      readStream.pipe(writeStream);
      
      writeStream.on('finish', () => {
        console.log('✅ Database backup completed');
        resolve();
      });
      
      writeStream.on('error', (err) => {
        console.error('❌ Database backup failed:', err.message);
        reject(err);
      });
    });
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) {
            console.error('❌ Error closing database:', err.message);
          } else {
            console.log('✅ Database connection closed');
          }
          this.db = null;
          this.isInitialized = false;
          resolve();
        });
      });
    }
  }

  /**
   * Check if database is initialized and connected
   */
  isReady() {
    return this.isInitialized && this.db !== null;
  }
}

// Singleton instance
let membershipDatabaseInstance = null;

/**
 * Get or create singleton membership database instance
 */
async function getMembershipDatabase() {
  if (!membershipDatabaseInstance) {
    membershipDatabaseInstance = new MembershipDatabase();
    await membershipDatabaseInstance.initialize();
  }
  
  if (!membershipDatabaseInstance.isReady()) {
    console.log('🔄 Reinitializing database connection...');
    await membershipDatabaseInstance.initialize();
  }
  
  return membershipDatabaseInstance;
}

/**
 * Close singleton database connection
 */
async function closeMembershipDatabase() {
  if (membershipDatabaseInstance) {
    await membershipDatabaseInstance.close();
    membershipDatabaseInstance = null;
  }
}

module.exports = {
  MembershipDatabase,
  getMembershipDatabase,
  closeMembershipDatabase
};createMembersTable, (err) => {
          if (err) reject(err);
        });
        
        this.db.run(createClaimsTable, (err) => {
          if (err) reject(err);
        });
        
        this.db.run(createRedemptionsTable, (err) => {
          if (err) reject(err);
        });
        
        this.db.run(createDailyStatesTable, (err) => {
          if (err) reject(err);
        });
        
        this.db.run(createDonationsTable, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  // ═══════════ MEMBER MANAGEMENT ═══════════

  /**
   * Create new member record
   * @param {string} accountId - Member account ID
   * @param {number} depositAmount - HBAR deposit in tinybars
   * @returns {Object} Created member record
   */
  async createMember(accountId, depositAmount) {
    return new Promise((resolve, reject) => {
      const memberData = {
        account_id: accountId,
        deposited_hbar: depositAmount,
        deposit_date: new Date().toISOString(),
        max_wish_allowed: CONFIG.parameters.maxWishPerDrip,
        remaining_wish: CONFIG.parameters.maxWishPerDrip
      };

      const sql = `
        INSERT INTO members (
          account_id, deposited_hbar, deposit_date, 
          max_wish_allowed, remaining_wish
        ) VALUES (?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [
        memberData.account_id,
        memberData.deposited_hbar,
        memberData.deposit_date,
        memberData.max_wish_allowed,
        memberData.remaining_wish
      ], function(err) {
        if (err) {
          console.error('❌ Failed to create member:', err.message);
          reject(err);
          return;
        }

        console.log(`✅ Member created: ${accountId}`);
        resolve({ ...memberData, id: this.lastID });
      });
    });
  }

  /**
   * Get member by account ID
   * @param {string} accountId - Member account ID
   * @returns {Object|null} Member record or null if not found
   */
  async getMember(accountId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM members WHERE account_id = ?`;
      
      this.db.get(sql, [accountId], (err, row) => {
        if (err) {
          console.error('❌ Failed to get member:', err.message);
          reject(err);
          return;
        }
        
        resolve(row || null);
      });
    });
  }

  /**
   * Check if account is already a member
   * @param {string} accountId - Account to check
   * @returns {boolean} True if member exists
   */
  async memberExists(accountId) {
    const member = await this.getMember(accountId);
    return member !== null;
  }

  /**
   * Update member's claimed WISH amount
   * @param {string} accountId - Member account ID
   * @param {number} claimAmount - Amount of WISH claimed
   * @returns {Object} Updated member record
   */
  async updateMemberClaim(accountId, claimAmount) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE members 
        SET 
          total_wish_claimed = total_wish_claimed + ?,
          remaining_wish = remaining_wish - ?,
          last_claim_date = ?,
          lifetime_cap_reached = CASE 
            WHEN (remaining_wish - ?) <= 0 THEN 1 
            ELSE lifetime_cap_reached 
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE account_id = ?
      `;
      
      const claimDate = new Date().toISOString();
      
      this.db.run(sql, [claimAmount, claimAmount, claimDate, claimAmount, accountId], function(err) {
        if (err) {
          console.error('❌ Failed to update member claim:', err.message);
          reject(err);
          return;
        }
        
        if (this.changes === 0) {
          reject(new Error(`Member not found: ${accountId}`));
          return;
        }
        
        console.log(`✅ Updated member claim: ${accountId} (+${claimAmount} WISH)`);
        resolve({ accountId, claimAmount, claimDate });
      });
    });
  }

  /**
   * Get all active members
   * @returns {Array} List of active member records
   */
  async getActiveMembers() {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM members WHERE is_active = 1 ORDER BY deposit_date`;
      
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('❌ Failed to get active members:', err.message);
          reject(err);
          return;
        }
        
        resolve(rows || []);
      });
    });
  }

  /**
   * Process AutoRelease for member who reached lifetime cap
   * @param {string} accountId - Member account ID
   * @returns {Object} AutoRelease details
   */
  async processAutoRelease(accountId) {
    return new Promise((resolve, reject) => {
      const releaseDate = new Date().toISOString();
      
      const sql = `
        UPDATE members 
        SET 
          is_active = 0,
          auto_release_date = ?,
          lifecycle_count = lifecycle_count + 1,
          total_wish_claimed = 0,
          remaining_wish = ?,
          lifetime_cap_reached = 0,
          updated_at = CURRENT_TIMESTAMP
        WHERE account_id = ? AND lifetime_cap_reached = 1
      `;
      
      this.db.run(sql, [releaseDate, CONFIG.parameters.maxWishPerDrip, accountId], function(err) {
        if (err) {
          console.error('❌ Failed to process AutoRelease:', err.message);
          reject(err);
          return;
        }
        
        if (this.changes === 0) {
          reject(new Error(`No eligible member for AutoRelease: ${accountId}`));
          return;
        }
        
        console.log(`✅ AutoRelease processed: ${accountId}`);
        resolve({
          accountId,
          releaseDate,
          refundAmount: CONFIG.parameters.memberRefund * CONFIG.constants.HBAR_TO_TINYBAR,
          treasuryFee: CONFIG.parameters.treasuryFee * CONFIG.constants.HBAR_TO_TINYBAR
        });
      });
    });
  }

  // ═══════════ CLAIMS TRACKING ═══════════

  /**
   * Record a new claim
   * @param {Object} claimData - Claim details
   * @returns {Object} Recorded claim
   */
  async recordClaim(claimData) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO claims (
          account_id, claim_amount, claim_date, daily_entitlement,
          cumulative_claimed, remaining_quota, transaction_id, block_timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        claimData.accountId,
        claimData.claimAmount,
        claimData.claimDate,
        claimData.dailyEntitlement,
        claimData.cumulativeClaimed,
        claimData.remainingQuota,
        claimData.transactionId,
        claimData.blockTimestamp
      ], function(err) {
        if (err) {
          console.error('❌ Failed to record claim:', err.message);
          reject(err);
          return;
        }
        
        console.log(`✅ Claim recorded: ${claimData.accountId} -> ${claimData.claimAmount} WISH`);
        resolve({ ...claimData, id: this.lastID });
      });
    });
  }

  /**
   * Get claim history for member
   * @param {string} accountId - Member account ID
   * @param {number} limit - Maximum number of claims to return
   * @returns {Array} Claim history
   */
  async getClaimHistory(accountId, limit = 100) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM claims 
        WHERE account_id = ? 
        ORDER BY claim_date DESC 
        LIMIT ?
      `;
      
      this.db.all(sql, [accountId, limit], (err, rows) => {
        if (err) {
          console.error('❌ Failed to get claim history:', err.message);
          reject(err);
          return;
        }
        
        resolve(rows || []);
      });
    });
  }

  // ═══════════ DAILY STATE MANAGEMENT ═══════════

  /**
   * Record daily state snapshot
   * @param {Object} stateData - Daily state data
   * @returns {Object} Recorded state
   */
  async recordDailyState(stateData) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO daily_states (
          date, active_holders, new_donors, growth_rate,
          cumulative_score, growth_multiplier, donor_booster,
          final_entitlement, total_wish_allocated, hcs_transaction_id,
          snapshot_timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(