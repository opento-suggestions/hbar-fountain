/**
 * HCS Audit Service - Complete Protocol Transparency
 * Logs ALL protocol operations to HCS Topic 0.0.6591043 for full auditability
 * 
 * Events Tracked:
 * - Membership deposits (HBAR → DRIP)
 * - WISH claims (daily entitlements)
 * - Donations (HBAR → DROP)
 * - Daily snapshots (protocol state)
 * - AutoRelease events (cap reached)
 * - All wallet operations
 */

import { 
    TopicMessageSubmitTransaction,
    AccountBalanceQuery,
    AccountId,
    PrivateKey
} from '@hashgraph/sdk';

import { CONFIG } from './config.js';

class HCSAuditService {
    constructor() {
        this.client = null;
        this.hcsTopicId = CONFIG.infrastructure.hcsTopic || '0.0.6591043';
        this.operatorId = AccountId.fromString(CONFIG.accounts.treasury);
        this.operatorKey = PrivateKey.fromString(CONFIG.accounts.treasuryKey);
    }

    /**
     * Initialize HCS audit service
     */
    async initialize(client) {
        console.log('📋 Initializing HCS Audit Service...');
        
        this.client = client;
        this.client.setOperator(this.operatorId, this.operatorKey);
        
        console.log(`✅ HCS Audit Service initialized (Topic: ${this.hcsTopicId})`);
    }

    /**
     * Log membership deposit to HCS
     * @param {string} memberAccount - New member account ID
     * @param {number} hbarAmount - HBAR deposit amount in tinybars
     * @param {number} dripAmount - DRIP tokens minted
     * @param {string} transactionId - Hedera transaction ID
     */
    async logMembershipDeposit(memberAccount, hbarAmount, dripAmount, transactionId) {
        const auditEvent = {
            protocol: "Fountain Protocol",
            version: "1.0",
            type: "membership_deposit",
            event: "MembershipCreated",
            timestamp: new Date().toISOString(),
            member: memberAccount,
            details: {
                hbarDeposited: hbarAmount,
                dripTokensIssued: dripAmount,
                exchangeRate: "1:1 HBAR:DRIP",
                membershipStatus: "ACTIVE",
                lifetimeWishQuota: CONFIG.parameters.maxWishPerDrip,
                transactionId: transactionId
            },
            tokenAddresses: {
                DRIP: CONFIG.tokens.DRIP.id,
                WISH: CONFIG.tokens.WISH.id,
                DROP: CONFIG.tokens.DROP.id
            },
            treasury: CONFIG.accounts.treasury,
            auditTrail: {
                operation: "DEPOSIT",
                initiator: memberAccount,
                approver: CONFIG.accounts.treasury,
                compliance: "HARD_RULE_ENFORCED_ONE_DRIP_PER_WALLET"
            }
        };

        return await this.publishToHCS(auditEvent, `Membership Created: ${memberAccount}`);
    }

    /**
     * Log WISH claim to HCS
     * @param {string} memberAccount - Member claiming WISH
     * @param {number} claimAmount - WISH tokens claimed
     * @param {number} totalClaimed - Total WISH claimed by this member
     * @param {number} remainingQuota - Remaining WISH quota
     * @param {boolean} capReached - Whether 1000 cap was reached
     * @param {string} transactionId - Hedera transaction ID
     */
    async logWishClaim(memberAccount, claimAmount, totalClaimed, remainingQuota, capReached, transactionId) {
        const auditEvent = {
            protocol: "Fountain Protocol",
            version: "1.0",
            type: "wish_claim",
            event: "WishClaimed",
            timestamp: new Date().toISOString(),
            member: memberAccount,
            details: {
                wishClaimed: claimAmount,
                totalWishClaimed: totalClaimed,
                remainingQuota: remainingQuota,
                lifetimeCapReached: capReached,
                autoReleaseTriggered: capReached,
                transactionId: transactionId
            },
            quotaEnforcement: {
                maxLifetimeWish: CONFIG.parameters.maxWishPerDrip,
                currentTotal: totalClaimed,
                complianceStatus: capReached ? "CAP_REACHED" : "WITHIN_LIMITS"
            },
            tokenAddresses: {
                DRIP: CONFIG.tokens.DRIP.id,
                WISH: CONFIG.tokens.WISH.id,
                DROP: CONFIG.tokens.DROP.id
            },
            treasury: CONFIG.accounts.treasury,
            auditTrail: {
                operation: "CLAIM",
                initiator: memberAccount,
                approver: CONFIG.accounts.treasury,
                compliance: "1000_WISH_LIFETIME_CAP_ENFORCED"
            }
        };

        return await this.publishToHCS(auditEvent, `WISH Claimed: ${claimAmount} by ${memberAccount}`);
    }

    /**
     * Log donation to HCS
     * @param {string} donorAccount - Donor account ID
     * @param {number} hbarAmount - HBAR donation amount in tinybars
     * @param {number} dropAmount - DROP tokens issued
     * @param {number} wishBonus - WISH bonus tokens (if any)
     * @param {string} transactionId - Hedera transaction ID
     */
    async logDonation(donorAccount, hbarAmount, dropAmount, wishBonus, transactionId) {
        const auditEvent = {
            protocol: "Fountain Protocol",
            version: "1.0",
            type: "donation",
            event: "DonationReceived",
            timestamp: new Date().toISOString(),
            donor: donorAccount,
            details: {
                hbarDonated: hbarAmount,
                dropTokensIssued: dropAmount,
                wishBonusIssued: wishBonus || 0,
                donationThreshold: CONFIG.parameters.minDonationThreshold,
                rebateEligible: hbarAmount >= CONFIG.parameters.donationRebateThreshold,
                transactionId: transactionId
            },
            tokenAddresses: {
                DRIP: CONFIG.tokens.DRIP.id,
                WISH: CONFIG.tokens.WISH.id,
                DROP: CONFIG.tokens.DROP.id
            },
            treasury: CONFIG.accounts.treasury,
            auditTrail: {
                operation: "DONATION",
                initiator: donorAccount,
                approver: CONFIG.accounts.treasury,
                compliance: "HARD_RULE_ENFORCED_ONE_DROP_PER_WALLET"
            }
        };

        return await this.publishToHCS(auditEvent, `Donation: ${hbarAmount} tinybars by ${donorAccount}`);
    }

    /**
     * Log AutoRelease event to HCS
     * @param {string} memberAccount - Member being auto-released
     * @param {number} wishBurned - WISH tokens burned
     * @param {number} dripBurned - DRIP tokens burned
     * @param {number} hbarPayout - HBAR payout amount
     * @param {string} transactionId - Hedera transaction ID
     */
    async logAutoRelease(memberAccount, wishBurned, dripBurned, hbarPayout, transactionId) {
        const auditEvent = {
            protocol: "Fountain Protocol",
            version: "1.0",
            type: "autorelease",
            event: "AutoReleaseExecuted",
            timestamp: new Date().toISOString(),
            member: memberAccount,
            details: {
                wishTokensBurned: wishBurned,
                dripTokensBurned: dripBurned,
                hbarPayout: hbarPayout,
                membershipTerminated: true,
                reEnrollmentEligible: true,
                transactionId: transactionId
            },
            economics: {
                treasuryFee: CONFIG.parameters.treasuryFee,
                memberRefund: CONFIG.parameters.memberRefund,
                treasuryBonus: CONFIG.parameters.treasuryBonus,
                totalMemberPayout: CONFIG.parameters.totalMemberPayout
            },
            tokenAddresses: {
                DRIP: CONFIG.tokens.DRIP.id,
                WISH: CONFIG.tokens.WISH.id,
                DROP: CONFIG.tokens.DROP.id
            },
            treasury: CONFIG.accounts.treasury,
            auditTrail: {
                operation: "AUTORELEASE",
                initiator: "PROTOCOL_AUTOMATION",
                approver: CONFIG.accounts.treasury,
                compliance: "1000_WISH_CAP_ENFORCEMENT"
            }
        };

        return await this.publishToHCS(auditEvent, `AutoRelease: ${memberAccount} (1000 WISH cap reached)`);
    }

    /**
     * Log daily snapshot to HCS
     * @param {Object} snapshotData - Complete daily snapshot data
     */
    async logDailySnapshot(snapshotData) {
        const auditEvent = {
            protocol: "Fountain Protocol",
            version: "1.0",
            type: "daily_snapshot",
            timestamp: new Date().toISOString(),
            snapshotDate: snapshotData.date,
            metrics: {
                totalDripHolders: snapshotData.activeHolders,
                totalDripSupply: snapshotData.activeHolders,
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
            treasury: CONFIG.accounts.treasury,
            nextSnapshotScheduled: new Date(Date.now() + 86400000).toISOString(),
            auditTrail: {
                operation: "DAILY_SNAPSHOT",
                initiator: "PROTOCOL_SCHEDULER",
                approver: CONFIG.accounts.treasury,
                compliance: "MATHEMATICAL_TRANSPARENCY"
            }
        };

        return await this.publishToHCS(auditEvent, `Daily Snapshot: ${snapshotData.date}`);
    }

    /**
     * Log wallet balance change to HCS
     * @param {string} accountId - Wallet account ID
     * @param {string} operation - Operation type (deposit, claim, donation, etc.)
     * @param {Object} balanceChanges - Before/after token balances
     * @param {string} transactionId - Hedera transaction ID
     */
    async logWalletOperation(accountId, operation, balanceChanges, transactionId) {
        const auditEvent = {
            protocol: "Fountain Protocol",
            version: "1.0",
            type: "wallet_operation",
            event: "WalletBalanceChanged",
            timestamp: new Date().toISOString(),
            account: accountId,
            operation: operation,
            balanceChanges: balanceChanges,
            transactionId: transactionId,
            tokenAddresses: {
                DRIP: CONFIG.tokens.DRIP.id,
                WISH: CONFIG.tokens.WISH.id,
                DROP: CONFIG.tokens.DROP.id
            },
            treasury: CONFIG.accounts.treasury,
            auditTrail: {
                operation: "WALLET_UPDATE",
                initiator: accountId,
                approver: CONFIG.accounts.treasury,
                compliance: "BALANCE_TRACKING"
            }
        };

        return await this.publishToHCS(auditEvent, `Wallet ${operation}: ${accountId}`);
    }

    /**
     * Publish audit event to HCS topic
     * @param {Object} auditEvent - Event data to publish
     * @param {string} summary - Brief summary for logging
     */
    async publishToHCS(auditEvent, summary) {
        try {
            console.log(`📋 Publishing to HCS: ${summary}`);
            
            const messageBytes = Buffer.from(JSON.stringify(auditEvent, null, 2));
            
            const hcsTransaction = new TopicMessageSubmitTransaction()
                .setTopicId(this.hcsTopicId)
                .setMessage(messageBytes);
            
            const response = await hcsTransaction.execute(this.client);
            const receipt = await response.getReceipt(this.client);
            
            console.log(`✅ HCS Published: ${response.transactionId} (${summary})`);
            
            return {
                success: true,
                transactionId: response.transactionId.toString(),
                consensusTimestamp: receipt.consensusTimestamp?.toDate().toISOString(),
                messageSize: messageBytes.length,
                topicId: this.hcsTopicId,
                summary: summary
            };
            
        } catch (error) {
            console.error(`❌ HCS Publish failed (${summary}):`, error.message);
            
            return {
                success: false,
                error: error.message,
                summary: summary,
                topicId: this.hcsTopicId
            };
        }
    }

    /**
     * Get HCS audit trail for an account
     * @param {string} accountId - Account to get audit trail for
     * @returns {Array} Audit events for the account
     */
    async getAuditTrail(accountId) {
        // This would integrate with Mirror Node API to fetch historical messages
        // For now, return placeholder
        console.log(`📋 Fetching audit trail for ${accountId}...`);
        
        return {
            account: accountId,
            totalEvents: 0,
            events: [],
            note: "Use Mirror Node API to fetch complete audit trail"
        };
    }

    /**
     * Health check for HCS audit service
     * @returns {Object} Health status
     */
    async getHealthStatus() {
        return {
            service: "HCS Audit Service",
            status: this.client ? "connected" : "disconnected",
            topicId: this.hcsTopicId,
            operator: this.operatorId.toString(),
            timestamp: new Date().toISOString()
        };
    }
}

// Singleton instance
let hcsAuditInstance = null;

/**
 * Get or create singleton HCS audit service instance
 */
export async function getHCSAuditService(client = null) {
    if (!hcsAuditInstance) {
        hcsAuditInstance = new HCSAuditService();
        if (client) {
            await hcsAuditInstance.initialize(client);
        }
    }
    return hcsAuditInstance;
}

export { HCSAuditService };