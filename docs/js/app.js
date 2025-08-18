// Fountain Protocol Main App Controller
// This unifies all protocol operations into a cohesive user interface

class FountainProtocolApp {
    constructor() {
        this.initialized = false;
        this.walletManager = window.walletManager;
        this.protocolClient = window.fountainClient;
        this.config = window.FOUNTAIN_CONFIG;
        this.utils = window.FOUNTAIN_UTILS;
        
        // UI state management
        this.currentView = 'welcome';
        this.transactionInProgress = false;
        this.userStatus = null;
        
        // Bind methods
        this.handleWalletConnect = this.handleWalletConnect.bind(this);
        this.handleWalletDisconnect = this.handleWalletDisconnect.bind(this);
        this.handleUserDataUpdate = this.handleUserDataUpdate.bind(this);
        this.handleProtocolStatsUpdate = this.handleProtocolStatsUpdate.bind(this);
    }

    // Initialize the application
    async initialize() {
        console.log('🚀 Initializing Fountain Protocol App');
        
        try {
            // Initialize core services
            await this.protocolClient.initialize();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup UI event handlers
            this.setupUIEventHandlers();
            
            // Load initial protocol stats
            await this.loadProtocolStats();
            
            // Check for existing wallet connection
            await this.checkExistingConnection();
            
            this.initialized = true;
            console.log('✅ Fountain Protocol App initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.showError('Failed to initialize application');
        }
    }

    // Setup core event listeners
    setupEventListeners() {
        // Wallet events
        this.walletManager.on('onConnect', this.handleWalletConnect);
        this.walletManager.on('onDisconnect', this.handleWalletDisconnect);
        
        // Protocol data events
        window.addEventListener('fountain-user-updated', this.handleUserDataUpdate);
        window.addEventListener('fountain-stats-updated', this.handleProtocolStatsUpdate);
        window.addEventListener('fountain-activity-logged', this.handleActivityLogged.bind(this));
    }

    // Setup UI event handlers
    setupUIEventHandlers() {
        // Wallet connection button
        const walletConnectBtn = document.getElementById('wallet-connect-btn');
        if (walletConnectBtn) {
            walletConnectBtn.addEventListener('click', () => this.showWalletModal());
        }

        // Wallet selection modal
        const walletModal = document.getElementById('wallet-modal');
        if (walletModal) {
            // Close modal buttons
            walletModal.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', () => this.hideWalletModal());
            });

            // Wallet option buttons
            walletModal.querySelectorAll('.wallet-option').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const walletType = e.currentTarget.dataset.wallet;
                    this.connectWallet(walletType);
                });
            });

            // Click outside to close
            walletModal.addEventListener('click', (e) => {
                if (e.target === walletModal) this.hideWalletModal();
            });
        }

        // Protocol action buttons
        this.setupProtocolActionButtons();

        // Calculator updates
        this.setupCalculatorUpdates();
    }

    // Setup protocol action button handlers
    setupProtocolActionButtons() {
        // Join Protocol button
        const joinBtn = document.getElementById('join-protocol-btn');
        if (joinBtn) {
            joinBtn.addEventListener('click', () => this.handleJoinProtocol());
        }

        // AutoRedeem button
        const autoRedeemBtn = document.getElementById('autoredeem-btn');
        if (autoRedeemBtn) {
            autoRedeemBtn.addEventListener('click', () => this.handleAutoRedeem());
        }

        // Donate button
        const donateBtn = document.getElementById('donate-btn');
        if (donateBtn) {
            donateBtn.addEventListener('click', () => this.handleDonate());
        }
    }

    // Setup calculator auto-updates
    setupCalculatorUpdates() {
        // Calculator will auto-update when user data changes
        window.addEventListener('fountain-user-updated', () => {
            this.updateAutoRedeemCalculator();
        });
    }

    // Load initial protocol statistics
    async loadProtocolStats() {
        try {
            const stats = await this.protocolClient.getProtocolStats();
            this.updateProtocolStatsDisplay(stats);
        } catch (error) {
            console.error('Failed to load protocol stats:', error);
        }
    }

    // Check for existing wallet connection
    async checkExistingConnection() {
        const walletStatus = this.walletManager.getStatus();
        if (walletStatus.connected) {
            await this.handleWalletConnect(walletStatus);
        }
    }

    // Handle wallet connection
    async handleWalletConnect(connectionData) {
        console.log('👛 Wallet connected:', connectionData);
        
        try {
            // Update UI to show connected state
            this.updateWalletUI(connectionData);
            
            // Switch to dashboard view
            this.showDashboardView();
            
            // Load user data
            await this.loadUserData();
            
            // Start periodic updates
            this.protocolClient.startPeriodicUpdates();
            
        } catch (error) {
            console.error('Error handling wallet connection:', error);
            this.showError('Failed to load user data');
        }
    }

    // Handle wallet disconnection
    handleWalletDisconnect() {
        console.log('👛 Wallet disconnected');
        
        // Reset UI state
        this.updateWalletUI(null);
        this.showWelcomeView();
        this.userStatus = null;
        
        // Stop updates
        this.protocolClient.stopPeriodicUpdates();
    }

    // Handle user data updates
    handleUserDataUpdate(event) {
        const { status, activity } = event.detail;
        this.userStatus = status;
        
        // Update all UI components with new data
        this.updateMembershipCard(status);
        this.updateWishCard(status);
        this.updateDonationCard(status);
        this.updateActivityFeed(activity);
        this.updateAutoRedeemCalculator();
    }

    // Handle protocol stats updates
    handleProtocolStatsUpdate(event) {
        this.updateProtocolStatsDisplay(event.detail);
    }

    // Handle activity logging
    handleActivityLogged(event) {
        this.addActivityItem(event.detail);
    }

    // Show wallet connection modal
    showWalletModal() {
        const modal = document.getElementById('wallet-modal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    // Hide wallet connection modal
    hideWalletModal() {
        const modal = document.getElementById('wallet-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // Connect to specific wallet
    async connectWallet(walletType) {
        this.hideWalletModal();
        this.showTransactionModal('Connecting to wallet...');
        
        try {
            const result = await this.walletManager.connect(walletType);
            
            if (result.success) {
                this.hideTransactionModal();
                // handleWalletConnect will be called automatically via event
            } else {
                this.hideTransactionModal();
                this.showError(result.error || 'Failed to connect wallet');
            }
        } catch (error) {
            this.hideTransactionModal();
            this.showError(error.message);
        }
    }

    // Load user data after wallet connection
    async loadUserData() {
        try {
            const [status, activity] = await Promise.all([
                this.protocolClient.getUserProtocolStatus(),
                this.protocolClient.getUserActivity()
            ]);
            
            this.userStatus = status;
            
            // Update UI with loaded data
            this.updateMembershipCard(status);
            this.updateWishCard(status);  
            this.updateDonationCard(status);
            this.updateActivityFeed(activity);
            this.updateAutoRedeemCalculator();
            
        } catch (error) {
            console.error('Failed to load user data:', error);
            this.showError('Failed to load user data');
        }
    }

    // Protocol action handlers
    async handleJoinProtocol() {
        if (this.transactionInProgress) return;
        
        try {
            this.showTransactionModal('Joining Fountain Protocol...');
            this.transactionInProgress = true;
            
            const result = await this.protocolClient.joinProtocol();
            
            if (result.success) {
                this.updateTransactionModal(
                    'Transaction Successful!',
                    `Joined Fountain Protocol\nTransaction: ${result.transactionId}`
                );
                
                // Reload user data
                setTimeout(async () => {
                    await this.loadUserData();
                    this.hideTransactionModal();
                }, 3000);
                
            } else {
                this.hideTransactionModal();
                this.showError(result.error || 'Transaction failed');
            }
            
        } catch (error) {
            this.hideTransactionModal();
            this.showError(error.message);
        } finally {
            this.transactionInProgress = false;
        }
    }

    async handleAutoRedeem() {
        if (this.transactionInProgress) return;
        
        try {
            this.showTransactionModal('Processing AutoRedeem...');
            this.transactionInProgress = true;
            
            const result = await this.protocolClient.processAutoRedeem();
            
            if (result.success) {
                this.updateTransactionModal(
                    'AutoRedeem Successful!',
                    `Burned 1000 WISH → Received 1.8 HBAR\nTransaction: ${result.transactionId}`
                );
                
                // Reload user data
                setTimeout(async () => {
                    await this.loadUserData();
                    this.hideTransactionModal();
                }, 3000);
                
            } else {
                this.hideTransactionModal();
                this.showError(result.error || 'AutoRedeem failed');
            }
            
        } catch (error) {
            this.hideTransactionModal();
            this.showError(error.message);
        } finally {
            this.transactionInProgress = false;
        }
    }

    async handleDonate() {
        if (this.transactionInProgress) return;
        
        // Simple donation amount selector for demo
        const amount = prompt('Enter donation amount in HBAR:', '1');
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return;
        
        const amountTinybars = Math.floor(parseFloat(amount) * 100000000);
        
        try {
            this.showTransactionModal('Processing donation...');
            this.transactionInProgress = true;
            
            const result = await this.protocolClient.makeDonation(amountTinybars);
            
            if (result.success) {
                this.updateTransactionModal(
                    'Donation Successful!',
                    `Donated ${amount} HBAR\nTransaction: ${result.transactionId}`
                );
                
                // Reload user data
                setTimeout(async () => {
                    await this.loadUserData();
                    this.hideTransactionModal();
                }, 3000);
                
            } else {
                this.hideTransactionModal();
                this.showError(result.error || 'Donation failed');
            }
            
        } catch (error) {
            this.hideTransactionModal();
            this.showError(error.message);
        } finally {
            this.transactionInProgress = false;
        }
    }

    // UI Update Methods
    updateWalletUI(connectionData) {
        const walletBtn = document.getElementById('wallet-connect-btn');
        const userAddress = document.getElementById('user-address');
        const userHbarBalance = document.getElementById('user-hbar-balance');
        
        if (connectionData) {
            // Connected state
            if (walletBtn) {
                walletBtn.textContent = 'Disconnect';
                walletBtn.onclick = () => this.walletManager.disconnect();
            }
            
            if (userAddress) {
                userAddress.textContent = this.utils.formatAccountId(connectionData.accountId);
            }
            
        } else {
            // Disconnected state
            if (walletBtn) {
                walletBtn.textContent = 'Connect Wallet';
                walletBtn.onclick = () => this.showWalletModal();
            }
        }
    }

    updateMembershipCard(status) {
        if (!status) return;
        
        const membershipStatus = document.getElementById('membership-status');
        const dripBalance = document.getElementById('drip-balance');
        const wishRate = document.getElementById('wish-rate');
        const joinBtn = document.getElementById('join-protocol-btn');
        
        if (membershipStatus) {
            const indicator = membershipStatus.querySelector('.status-indicator');
            const text = membershipStatus.querySelector('span:last-child');
            
            if (status.membership.isActive) {
                indicator.className = 'status-indicator active';
                text.textContent = 'Active Member';
            } else {
                indicator.className = 'status-indicator inactive';
                text.textContent = 'Not a Member';
            }
        }
        
        if (dripBalance) dripBalance.textContent = status.membership.dripBalance;
        if (wishRate) wishRate.textContent = `${status.membership.dailyWishRate} per day`;
        
        if (joinBtn) {
            joinBtn.style.display = status.membership.isActive ? 'none' : 'block';
        }
    }

    updateWishCard(status) {
        if (!status) return;
        
        const wishBalance = document.getElementById('wish-balance');
        const quotaFill = document.getElementById('quota-fill');
        const quotaText = document.getElementById('quota-text');
        const autoRedeemBtn = document.getElementById('autoredeem-btn');
        
        if (wishBalance) wishBalance.textContent = status.wish.balance;
        
        if (quotaFill && quotaText) {
            quotaFill.style.width = `${status.wish.quotaUsed}%`;
            quotaText.textContent = `${status.wish.balance}/${status.wish.quota} quota used`;
        }
        
        if (autoRedeemBtn) {
            if (status.wish.canAutoRedeem) {
                autoRedeemBtn.disabled = false;
                autoRedeemBtn.textContent = 'AutoRedeem (1000 WISH → 1.8 HBAR)';
                autoRedeemBtn.className = 'action-btn success';
            } else {
                autoRedeemBtn.disabled = true;
                autoRedeemBtn.textContent = `AutoRedeem (Need ${1000 - status.wish.balance} more WISH)`;
                autoRedeemBtn.className = 'action-btn success disabled';
            }
        }
    }

    updateDonationCard(status) {
        if (!status) return;
        
        const donationStatus = document.getElementById('donation-status');
        const dropBalance = document.getElementById('drop-balance');
        const wishBonus = document.getElementById('wish-bonus');
        
        if (donationStatus) {
            const indicator = donationStatus.querySelector('.status-indicator');
            const text = donationStatus.querySelector('span:last-child');
            
            if (status.donation.isRecognized) {
                indicator.className = 'status-indicator active';
                text.textContent = 'Recognized Donor';
            } else {
                indicator.className = 'status-indicator inactive';
                text.textContent = 'No Recognition';
            }
        }
        
        if (dropBalance) {
            dropBalance.textContent = this.utils.formatTokens(status.donation.dropBalance, 8);
        }
        
        if (wishBonus) {
            wishBonus.textContent = `+${status.donation.wishBonus} per day`;
        }
    }

    updateActivityFeed(activity) {
        const activityList = document.getElementById('activity-list');
        if (!activityList || !activity) return;
        
        // Clear existing activity
        activityList.innerHTML = '';
        
        if (activity.length === 0) {
            activityList.innerHTML = `
                <div class="activity-item">
                    <span class="activity-icon">📋</span>
                    <div class="activity-content">
                        <div class="activity-text">No recent activity</div>
                        <div class="activity-time">Start using the protocol to see activity</div>
                    </div>
                </div>
            `;
            return;
        }
        
        activity.forEach(item => {
            this.addActivityItem(item, false);
        });
    }

    addActivityItem(item, prepend = true) {
        const activityList = document.getElementById('activity-list');
        if (!activityList) return;
        
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <span class="activity-icon">${item.icon || '📋'}</span>
            <div class="activity-content">
                <div class="activity-text">${item.action || item.event}</div>
                <div class="activity-time">${item.details || this.utils.formatTimestamp(item.timestamp)}</div>
            </div>
        `;
        
        if (prepend && activityList.firstChild) {
            activityList.insertBefore(activityItem, activityList.firstChild);
        } else {
            activityList.appendChild(activityItem);
        }
        
        // Remove excess items
        const items = activityList.querySelectorAll('.activity-item');
        if (items.length > this.config.UI.MAX_ACTIVITY_ITEMS) {
            items[items.length - 1].remove();
        }
    }

    updateAutoRedeemCalculator() {
        if (!this.userStatus) return;
        
        const calcWishBalance = document.getElementById('calc-wish-balance');
        const calcWishRate = document.getElementById('calc-wish-rate');
        const calcDaysUntil = document.getElementById('calc-days-until');
        const calcProfit = document.getElementById('calc-profit');
        
        if (calcWishBalance) calcWishBalance.value = this.userStatus.wish.balance;
        if (calcWishRate) calcWishRate.value = this.userStatus.membership.dailyWishRate;
        if (calcDaysUntil) calcDaysUntil.textContent = this.userStatus.wish.daysUntilAutoRedeem + ' days';
        if (calcProfit) calcProfit.textContent = '0.8 HBAR';
    }

    updateProtocolStatsDisplay(stats) {
        const totalMembers = document.getElementById('total-members');
        const totalHbar = document.getElementById('total-hbar');
        const totalWishes = document.getElementById('total-wishes');
        
        if (totalMembers) totalMembers.textContent = stats.totalMembers;
        if (totalHbar) totalHbar.textContent = stats.totalHbar.toFixed(2);
        if (totalWishes) totalWishes.textContent = stats.totalWish;
    }

    // View management
    showWelcomeView() {
        this.currentView = 'welcome';
        const welcomeSection = document.getElementById('welcome-section');
        const dashboardSection = document.getElementById('dashboard-section');
        
        if (welcomeSection) welcomeSection.style.display = 'block';
        if (dashboardSection) dashboardSection.style.display = 'none';
    }

    showDashboardView() {
        this.currentView = 'dashboard';
        const welcomeSection = document.getElementById('welcome-section');
        const dashboardSection = document.getElementById('dashboard-section');
        
        if (welcomeSection) welcomeSection.style.display = 'none';
        if (dashboardSection) dashboardSection.style.display = 'block';
    }

    // Modal management
    showTransactionModal(message) {
        const modal = document.getElementById('transaction-modal');
        const messageEl = document.getElementById('transaction-message');
        const detailsEl = document.getElementById('transaction-details');
        
        if (modal && messageEl) {
            messageEl.textContent = message;
            detailsEl.style.display = 'none';
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    updateTransactionModal(message, details) {
        const messageEl = document.getElementById('transaction-message');
        const detailsEl = document.getElementById('transaction-details');
        const transactionId = document.getElementById('transaction-id');
        
        if (messageEl) messageEl.textContent = message;
        if (detailsEl && details) {
            if (transactionId) transactionId.textContent = details.split('Transaction: ')[1] || details;
            detailsEl.style.display = 'block';
        }
    }

    hideTransactionModal() {
        const modal = document.getElementById('transaction-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // Error handling
    showError(message) {
        console.error('App Error:', message);
        // Simple alert for now - could be enhanced with better error UI
        alert(`Error: ${message}`);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🌊 Fountain Protocol - Starting Application');
    
    try {
        window.fountainApp = new FountainProtocolApp();
        await window.fountainApp.initialize();
        
        console.log('🎉 Fountain Protocol App ready!');
    } catch (error) {
        console.error('💥 Failed to start Fountain Protocol App:', error);
    }
});

// Export for global access
window.FountainProtocolApp = FountainProtocolApp;