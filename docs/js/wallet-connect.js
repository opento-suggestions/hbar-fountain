// Wallet Connection Manager
class WalletManager {
    constructor() {
        this.connected = false;
        this.currentWallet = null;
        this.accountId = null;
        this.publicKey = null;
        this.callbacks = {
            onConnect: [],
            onDisconnect: [],
            onAccountChange: []
        };
    }

    // Event listener management
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }

    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => callback(data));
        }
    }

    // HashPack Wallet Integration
    async connectHashPack() {
        try {
            if (!window.hashpack) {
                throw new Error('HashPack wallet not found');
            }

            const hashconnect = window.hashpack;
            const connectionData = await hashconnect.connectToLocalWallet();
            
            if (connectionData && connectionData.accountIds.length > 0) {
                this.connected = true;
                this.currentWallet = 'hashpack';
                this.accountId = connectionData.accountIds[0];
                this.publicKey = connectionData.publicKey;
                
                this.emit('onConnect', {
                    wallet: 'hashpack',
                    accountId: this.accountId,
                    publicKey: this.publicKey
                });
                
                return {
                    success: true,
                    accountId: this.accountId,
                    publicKey: this.publicKey
                };
            }
        } catch (error) {
            console.error('HashPack connection failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Blade Wallet Integration  
    async connectBlade() {
        try {
            if (!window.bladeWallet) {
                throw new Error('Blade wallet not found');
            }

            const blade = window.bladeWallet;
            const connectionResult = await blade.createSession();
            
            if (connectionResult && connectionResult.accountId) {
                this.connected = true;
                this.currentWallet = 'blade';
                this.accountId = connectionResult.accountId;
                
                this.emit('onConnect', {
                    wallet: 'blade',
                    accountId: this.accountId
                });
                
                return {
                    success: true,
                    accountId: this.accountId
                };
            }
        } catch (error) {
            console.error('Blade connection failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Test Mode (for development)
    async connectTestMode() {
        const testAccounts = [
            '0.0.6599179', // TEST_USER_1
            '0.0.6599180', // TEST_USER_2
            '0.0.6599181', // TEST_USER_3
            '0.0.6599182', // TEST_USER_4
            '0.0.6599183', // TEST_USER_5
            '0.0.6599772'  // TEST_USER_6
        ];

        const selectedAccount = testAccounts[Math.floor(Math.random() * testAccounts.length)];
        
        this.connected = true;
        this.currentWallet = 'test';
        this.accountId = selectedAccount;
        
        this.emit('onConnect', {
            wallet: 'test',
            accountId: this.accountId
        });
        
        return {
            success: true,
            accountId: this.accountId
        };
    }

    // Universal connect method
    async connect(walletType) {
        switch (walletType) {
            case 'hashpack':
                return await this.connectHashPack();
            case 'blade':
                return await this.connectBlade();
            case 'test':
                return await this.connectTestMode();
            default:
                return {
                    success: false,
                    error: 'Unknown wallet type'
                };
        }
    }

    // Disconnect wallet
    async disconnect() {
        if (this.currentWallet === 'hashpack' && window.hashpack) {
            try {
                await window.hashpack.disconnect();
            } catch (error) {
                console.error('HashPack disconnect error:', error);
            }
        }
        
        this.connected = false;
        this.currentWallet = null;
        this.accountId = null;
        this.publicKey = null;
        
        this.emit('onDisconnect');
        
        return { success: true };
    }

    // Sign and execute transaction
    async executeTransaction(transaction) {
        if (!this.connected) {
            return {
                success: false,
                error: 'Wallet not connected'
            };
        }

        try {
            switch (this.currentWallet) {
                case 'hashpack':
                    return await this.executeHashPackTransaction(transaction);
                case 'blade':
                    return await this.executeBladeTransaction(transaction);
                case 'test':
                    return await this.executeTestTransaction(transaction);
                default:
                    return {
                        success: false,
                        error: 'Unknown wallet type'
                    };
            }
        } catch (error) {
            console.error('Transaction execution failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async executeHashPackTransaction(transaction) {
        if (!window.hashpack) {
            return { success: false, error: 'HashPack not available' };
        }

        try {
            const response = await window.hashpack.sendTransaction(
                this.accountId,
                transaction
            );
            
            return {
                success: true,
                transactionId: response.transactionId,
                receipt: response.receipt
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async executeBladeTransaction(transaction) {
        if (!window.bladeWallet) {
            return { success: false, error: 'Blade wallet not available' };
        }

        try {
            const response = await window.bladeWallet.sendTransaction(transaction);
            
            return {
                success: true,
                transactionId: response.transactionId,
                receipt: response.receipt
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async executeTestTransaction(transaction) {
        // Simulate transaction execution for test mode
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const mockTransactionId = `0.0.${Date.now()}@${Math.floor(Date.now() / 1000)}.${Math.floor(Math.random() * 1000000000)}`;
        
        return {
            success: true,
            transactionId: mockTransactionId,
            receipt: {
                status: 'SUCCESS',
                transactionId: mockTransactionId
            }
        };
    }

    // Get current connection status
    getStatus() {
        return {
            connected: this.connected,
            wallet: this.currentWallet,
            accountId: this.accountId,
            publicKey: this.publicKey
        };
    }

    // Check if specific wallet is available
    static async checkWalletAvailability(walletType) {
        switch (walletType) {
            case 'hashpack':
                return !!window.hashpack;
            case 'blade':
                return !!window.bladeWallet;
            case 'test':
                return true; // Always available
            default:
                return false;
        }
    }
}

// Create global wallet manager instance
window.walletManager = new WalletManager();