// Fountain Protocol Client - Handles all protocol interactions
class FountainProtocolClient {
    constructor() {
        this.config = window.FOUNTAIN_CONFIG;
        this.utils = window.FOUNTAIN_UTILS;
        this.walletManager = window.walletManager;
        this.cache = new Map();
        this.updateInterval = null;
    }

    // Initialize the protocol client
    async initialize() {
        console.log('🌊 Initializing Fountain Protocol Client');
        
        // Check if walletManager exists
        if (!this.walletManager) {
            console.warn('WalletManager not initialized yet, creating new instance');
            this.walletManager = window.walletManager || new WalletManager();
        }
        
        // Start periodic updates when wallet is connected
        if (this.walletManager && this.walletManager.on) {
            this.walletManager.on('onConnect', () => {
                this.startPeriodicUpdates();
            });
            
            this.walletManager.on('onDisconnect', () => {
                this.stopPeriodicUpdates();
                this.clearCache();
            });
        }
    }

    // Start periodic data updates
    startPeriodicUpdates() {
        if (this.updateInterval) clearInterval(this.updateInterval);
        
        this.updateInterval = setInterval(async () => {
            if (this.walletManager.connected) {
                await this.refreshUserData();
                await this.refreshProtocolStats();
            }
        }, this.config.UI.UPDATE_INTERVAL);
    }

    // Stop periodic updates
    stopPeriodicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // Clear cached data
    clearCache() {
        this.cache.clear();
    }

    // Get user account balance and token holdings
    async getUserBalance(accountId = null) {
        const targetAccount = accountId || this.walletManager.accountId;
        if (!targetAccount) return null;

        const cacheKey = `balance-${targetAccount}`;
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 30000) { // 30 second cache
                return cached.data;
            }
        }

        try {
            const response = await fetch(
                `${this.config.MIRROR_NODE.BASE_URL}/accounts/${targetAccount}/tokens`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const tokens = data.tokens || [];
            
            // Get HBAR balance
            const accountResponse = await fetch(
                `${this.config.MIRROR_NODE.BASE_URL}/accounts/${targetAccount}`
            );
            const accountData = await accountResponse.json();
            
            const balanceData = {
                accountId: targetAccount,
                hbar: parseInt(accountData.balance?.balance || 0),
                tokens: {
                    drip: this.findTokenBalance(tokens, this.config.TOKENS.DRIP),
                    wish: this.findTokenBalance(tokens, this.config.TOKENS.WISH),
                    drop: this.findTokenBalance(tokens, this.config.TOKENS.DROP)
                },
                lastUpdated: Date.now()
            };
            
            this.cache.set(cacheKey, {
                data: balanceData,
                timestamp: Date.now()
            });
            
            return balanceData;
            
        } catch (error) {
            console.error('Failed to fetch user balance:', error);
            return null;
        }
    }

    // Find token balance from tokens array
    findTokenBalance(tokens, tokenId) {
        const token = tokens.find(t => t.token_id === tokenId);
        return token ? parseInt(token.balance) : 0;
    }

    // Get user protocol status
    async getUserProtocolStatus(accountId = null) {
        const balance = await this.getUserBalance(accountId);
        if (!balance) return null;

        const dripBalance = balance.tokens.drip;
        const wishBalance = balance.tokens.wish;
        const dropBalance = balance.tokens.drop;

        const isActiveMember = dripBalance >= 1;
        const isDonorRecognized = dropBalance >= this.config.ECONOMICS.DROP_RECOGNITION_THRESHOLD;
        
        const dailyWishRate = isActiveMember ? 
            this.config.ECONOMICS.DAILY_WISH_BASE + 
            (isDonorRecognized ? this.config.ECONOMICS.DAILY_WISH_BONUS : 0) : 0;

        const quotaUsed = Math.min(wishBalance / this.config.ECONOMICS.WISH_QUOTA * 100, 100);
        const quotaRemaining = Math.max(0, this.config.ECONOMICS.WISH_QUOTA - wishBalance);
        
        const canAutoRedeem = isActiveMember && wishBalance >= this.config.ECONOMICS.WISH_BURN_AMOUNT;
        const daysUntilAutoRedeem = this.utils.calculateDaysUntilAutoRedeem(wishBalance, dailyWishRate);

        return {
            accountId: balance.accountId,
            membership: {
                isActive: isActiveMember,
                dripBalance,
                dailyWishRate
            },
            donation: {
                isRecognized: isDonorRecognized,
                dropBalance,
                wishBonus: isDonorRecognized ? this.config.ECONOMICS.DAILY_WISH_BONUS : 0
            },
            wish: {
                balance: wishBalance,
                quota: this.config.ECONOMICS.WISH_QUOTA,
                quotaUsed: Math.round(quotaUsed),
                quotaRemaining,
                canAutoRedeem,
                daysUntilAutoRedeem
            },
            hbar: {
                balance: balance.hbar,
                formatted: this.utils.formatHbar(balance.hbar)
            },
            lastUpdated: balance.lastUpdated
        };
    }

    // Get protocol statistics
    async getProtocolStats() {
        const cacheKey = 'protocol-stats';
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
                return cached.data;
            }
        }

        try {
            // Try to fetch from existing protocol-data.json
            const response = await fetch('./protocol-data.json');
            if (response.ok) {
                const data = await response.json();
                
                const stats = {
                    totalMembers: data.members ? data.members.length : 0,
                    totalHbar: data.treasuryBalance ? parseFloat(data.treasuryBalance) : 0,
                    totalWish: data.totalWishSupply || 0,
                    lastSnapshot: data.snapshotDate,
                    lastUpdated: Date.now()
                };
                
                this.cache.set(cacheKey, {
                    data: stats,
                    timestamp: Date.now()
                });
                
                return stats;
            }
        } catch (error) {
            console.error('Failed to fetch protocol stats:', error);
        }

        // Fallback to default stats
        const defaultStats = {
            totalMembers: 6,
            totalHbar: 952.64,
            totalWish: 0,
            lastSnapshot: new Date().toISOString(),
            lastUpdated: Date.now()
        };

        return defaultStats;
    }

    // Join Protocol Transaction
    async joinProtocol() {
        if (!this.walletManager.connected) {
            throw new Error('Wallet not connected');
        }

        const userBalance = await this.getUserBalance();
        if (!userBalance || userBalance.hbar < this.config.ECONOMICS.MEMBERSHIP_COST) {
            throw new Error('Insufficient HBAR balance');
        }

        // Create join protocol transaction (simplified for demo)
        const transaction = {
            type: 'JOIN_PROTOCOL',
            amount: this.config.ECONOMICS.MEMBERSHIP_COST,
            memo: 'Fountain Protocol Membership'
        };

        const result = await this.walletManager.executeTransaction(transaction);
        
        if (result.success) {
            // Clear cache to force refresh
            this.clearCache();
            
            // Log to activity
            this.logActivity('🎪', 'Joined Fountain Protocol', 'Membership activated');
        }

        return result;
    }

    // AutoRedeem Transaction
    async processAutoRedeem() {
        if (!this.walletManager.connected) {
            throw new Error('Wallet not connected');
        }

        const status = await this.getUserProtocolStatus();
        if (!status.membership.isActive) {
            throw new Error('Must be a protocol member');
        }

        if (!status.wish.canAutoRedeem) {
            throw new Error('Need 1000 WISH tokens for AutoRedeem');
        }

        // Create AutoRedeem transaction
        const transaction = {
            type: 'AUTO_REDEEM',
            wishBurn: this.config.ECONOMICS.WISH_BURN_AMOUNT,
            hbarPayout: this.config.ECONOMICS.AUTOREDEEM_PAYOUT,
            memo: 'Fountain Protocol AutoRedeem'
        };

        const result = await this.walletManager.executeTransaction(transaction);
        
        if (result.success) {
            // Clear cache to force refresh
            this.clearCache();
            
            // Log to activity
            this.logActivity('🔄', 'AutoRedeem Processed', `Burned 1000 WISH → Received ${this.utils.formatHbar(this.config.ECONOMICS.AUTOREDEEM_PAYOUT)} HBAR`);
        }

        return result;
    }

    // Donation Transaction
    async makeDonation(amount) {
        if (!this.walletManager.connected) {
            throw new Error('Wallet not connected');
        }

        const userBalance = await this.getUserBalance();
        if (!userBalance || userBalance.hbar < amount) {
            throw new Error('Insufficient HBAR balance');
        }

        // Create donation transaction
        const transaction = {
            type: 'DONATION',
            amount: amount,
            memo: 'Fountain Protocol Donation'
        };

        const result = await this.walletManager.executeTransaction(transaction);
        
        if (result.success) {
            // Clear cache to force refresh
            this.clearCache();
            
            // Log to activity
            this.logActivity('🎁', 'Donation Made', `Donated ${this.utils.formatHbar(amount)} HBAR`);
        }

        return result;
    }

    // Get user activity from HCS topic
    async getUserActivity(accountId = null, limit = 10) {
        const targetAccount = accountId || this.walletManager.accountId;
        if (!targetAccount) return [];

        try {
            const response = await fetch(
                `${this.config.MIRROR_NODE.BASE_URL}/topics/${this.config.HCS_TOPIC}/messages?limit=50&order=desc`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const messages = data.messages || [];
            
            const userActivity = [];
            
            for (const message of messages) {
                try {
                    const content = Buffer.from(message.message, 'base64').toString('utf8');
                    const eventData = JSON.parse(content);
                    
                    if (eventData.protocol === 'Fountain Protocol' && 
                        (eventData.memberName === targetAccount || eventData.accountId === targetAccount)) {
                        userActivity.push({
                            type: eventData.type,
                            event: eventData.event,
                            timestamp: eventData.timestamp,
                            details: eventData.details,
                            consensusTimestamp: message.consensus_timestamp
                        });
                    }
                } catch (parseError) {
                    // Skip non-JSON messages
                }
                
                if (userActivity.length >= limit) break;
            }
            
            return userActivity;
            
        } catch (error) {
            console.error('Failed to fetch user activity:', error);
            return [];
        }
    }

    // Refresh user data
    async refreshUserData() {
        if (!this.walletManager.connected) return;

        try {
            const [status, activity] = await Promise.all([
                this.getUserProtocolStatus(),
                this.getUserActivity()
            ]);

            // Emit events for UI updates
            if (status) {
                window.dispatchEvent(new CustomEvent('fountain-user-updated', {
                    detail: { status, activity }
                }));
            }
        } catch (error) {
            console.error('Failed to refresh user data:', error);
        }
    }

    // Refresh protocol statistics
    async refreshProtocolStats() {
        try {
            const stats = await this.getProtocolStats();
            
            window.dispatchEvent(new CustomEvent('fountain-stats-updated', {
                detail: stats
            }));
        } catch (error) {
            console.error('Failed to refresh protocol stats:', error);
        }
    }

    // Log activity (for local storage/display)
    logActivity(icon, action, details) {
        const activity = {
            icon,
            action,
            details,
            timestamp: Date.now(),
            accountId: this.walletManager.accountId
        };

        // Store in local storage
        const existingActivity = JSON.parse(localStorage.getItem('fountain-activity') || '[]');
        existingActivity.unshift(activity);
        existingActivity.splice(this.config.UI.MAX_ACTIVITY_ITEMS); // Keep only recent items
        localStorage.setItem('fountain-activity', JSON.stringify(existingActivity));

        // Emit event for UI update
        window.dispatchEvent(new CustomEvent('fountain-activity-logged', {
            detail: activity
        }));
    }
}

// Create global protocol client instance
window.fountainClient = new FountainProtocolClient();