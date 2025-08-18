// Wallet Connection Manager
class WalletManager {
    constructor() {
        this.connected = false;
        this.currentWallet = null;
        this.accountId = null;
        this.publicKey = null;
        this.dAppConnector = null; // For HashPack/WalletConnect
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

    // HashPack Wallet Integration via HashConnect
    async connectHashPack() {
        try {
            // Use the proper HashConnect service
            if (window.hashConnectService) {
                console.log('Using HashConnect service for connection...');
                const result = await window.hashConnectService.connect();
                
                if (result.success) {
                    this.connected = true;
                    this.currentWallet = 'hashpack';
                    this.accountId = result.accountId;
                    this.hashConnectService = window.hashConnectService;
                    
                    // Listen for HashPack events
                    window.addEventListener('hashpack-connected', (event) => {
                        this.accountId = event.detail.accountId;
                        this.emit('onConnect', {
                            wallet: 'hashpack',
                            accountId: this.accountId
                        });
                    });
                    
                    window.addEventListener('hashpack-disconnected', () => {
                        this.handleDisconnect();
                    });
                    
                    this.emit('onConnect', {
                        wallet: 'hashpack',
                        accountId: this.accountId
                    });
                    
                    return result;
                }
                
                return result;
            }
            
            // Fallback to simple connection
            console.log('HashConnect service not available, trying simple connection...');
            
            // Use SimpleHashPackConnector as fallback
            if (window.SimpleHashPackConnector) {
                const connector = new window.SimpleHashPackConnector();
                const result = await connector.connect();
                
                if (result.success) {
                    this.connected = true;
                    this.currentWallet = 'hashpack';
                    this.accountId = result.accountId;
                    this.simpleConnector = connector; // Store for later use
                    
                    this.emit('onConnect', {
                        wallet: 'hashpack',
                        accountId: this.accountId
                    });
                    
                    return result;
                }
                
                return result;
            }
            
            // If all methods fail
            return {
                success: false,
                error: 'Unable to connect to HashPack. Please ensure:\n' +
                       '1. HashPack extension is installed\n' +
                       '2. You are logged into HashPack\n' +
                       '3. You have a Testnet account\n\n' +
                       'Or use Test Mode to explore the protocol.'
            };
        } catch (error) {
            console.error('HashPack connection error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    handleDisconnect() {
        this.connected = false;
        this.currentWallet = null;
        this.accountId = null;
        this.publicKey = null;
        this.emit('onDisconnect');
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
        if (this.currentWallet === 'hashpack' && this.hashconnect) {
            try {
                await this.hashconnect.disconnect(this.pairingData?.topic);
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
        if (!this.hashconnect || !this.pairingData) {
            return { success: false, error: 'HashPack not connected' };
        }

        try {
            // Send transaction through HashConnect
            const provider = this.hashconnect.getProvider("testnet", this.pairingData.topic, this.accountId);
            const signer = this.hashconnect.getSigner(provider);
            
            // Execute the transaction
            const response = await transaction.executeWithSigner(signer);
            
            return {
                success: true,
                transactionId: response.transactionId?.toString(),
                receipt: response
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