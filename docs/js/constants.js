// Fountain Protocol Constants
window.FOUNTAIN_CONFIG = {
    // Network Configuration
    NETWORK: 'testnet',
    
    // Token IDs (from your environment)
    TOKENS: {
        DRIP: '0.0.6591211',
        WISH: '0.0.6590974', 
        DROP: '0.0.6590982'
    },
    
    // HCS Topic for protocol events
    HCS_TOPIC: '0.0.6591043',
    
    // Protocol Economics
    ECONOMICS: {
        MEMBERSHIP_COST: 100000000, // 1 HBAR in tinybars
        AUTOREDEEM_PAYOUT: 180000000, // 1.8 HBAR in tinybars
        WISH_BURN_AMOUNT: 1000,
        DAILY_WISH_BASE: 50,
        DAILY_WISH_BONUS: 25, // Additional for DROP holders
        WISH_QUOTA: 1000,
        DROP_RECOGNITION_THRESHOLD: 100000000 // 1 DROP token
    },
    
    // Mirror Node API
    MIRROR_NODE: {
        BASE_URL: 'https://testnet.mirrornode.hedera.com/api/v1',
        ENDPOINTS: {
            ACCOUNT_BALANCE: '/accounts/{accountId}/tokens',
            TOPIC_MESSAGES: '/topics/{topicId}/messages',
            TRANSACTIONS: '/transactions'
        }
    },
    
    // Wallet Configuration
    WALLETS: {
        HASHPACK: {
            name: 'HashPack',
            icon: '📱',
            enabled: true
        },
        BLADE: {
            name: 'Blade Wallet', 
            icon: '⚔️',
            enabled: true
        },
        TEST: {
            name: 'Test Mode',
            icon: '🧪',
            enabled: true
        }
    },
    
    // UI Configuration
    UI: {
        UPDATE_INTERVAL: 30000, // 30 seconds
        TRANSACTION_TIMEOUT: 300000, // 5 minutes
        ANIMATION_DURATION: 300,
        MAX_ACTIVITY_ITEMS: 10
    },
    
    // Protocol Messages
    MESSAGES: {
        WELCOME: 'Welcome to Fountain Protocol!',
        WALLET_CONNECTING: 'Connecting to wallet...',
        WALLET_CONNECTED: 'Wallet connected successfully',
        WALLET_DISCONNECTED: 'Wallet disconnected',
        TRANSACTION_PENDING: 'Transaction submitted to Hedera network',
        TRANSACTION_SUCCESS: 'Transaction completed successfully',
        TRANSACTION_FAILED: 'Transaction failed',
        INSUFFICIENT_BALANCE: 'Insufficient HBAR balance',
        INSUFFICIENT_WISH: 'Need 1000 WISH tokens for AutoRedeem',
        NOT_MEMBER: 'Must be a protocol member to perform this action',
        LOADING: 'Loading...'
    },
    
    // Error Messages
    ERRORS: {
        WALLET_NOT_FOUND: 'Wallet not found. Please install the wallet extension.',
        WALLET_LOCKED: 'Wallet is locked. Please unlock it.',
        NETWORK_MISMATCH: 'Please switch to Hedera Testnet',
        TRANSACTION_REJECTED: 'Transaction was rejected by user',
        INSUFFICIENT_FUNDS: 'Insufficient funds for transaction',
        UNKNOWN_ERROR: 'An unknown error occurred'
    }
};

// Utility Functions
window.FOUNTAIN_UTILS = {
    // Format HBAR amounts
    formatHbar: (tinybars) => {
        const hbar = tinybars / 100000000;
        return hbar.toFixed(hbar < 1 ? 8 : 2);
    },
    
    // Format token amounts
    formatTokens: (amount, decimals = 0) => {
        if (decimals === 0) return amount.toString();
        return (amount / Math.pow(10, decimals)).toFixed(decimals);
    },
    
    // Calculate days until AutoRedeem
    calculateDaysUntilAutoRedeem: (currentWish, dailyRate) => {
        if (currentWish >= 1000) return 0;
        return Math.ceil((1000 - currentWish) / dailyRate);
    },
    
    // Calculate WISH quota percentage
    calculateQuotaPercentage: (currentWish, quota = 1000) => {
        return Math.min((currentWish / quota) * 100, 100);
    },
    
    // Format account ID for display
    formatAccountId: (accountId) => {
        if (!accountId) return '';
        return accountId.length > 12 ? 
            `${accountId.substr(0, 6)}...${accountId.substr(-4)}` : 
            accountId;
    },
    
    // Format timestamp
    formatTimestamp: (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    },
    
    // Generate transaction explorer URL
    getTransactionUrl: (transactionId) => {
        return `https://hashscan.io/testnet/transaction/${transactionId}`;
    }
};