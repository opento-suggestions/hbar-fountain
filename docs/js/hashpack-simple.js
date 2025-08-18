// Simple HashPack Connection without HashConnect library
// This uses the HashPack browser extension API directly

class SimpleHashPackConnector {
    constructor() {
        this.connected = false;
        this.accountId = null;
        this.network = 'testnet';
    }

    async connect() {
        try {
            // First, let's detect what's available in the window
            console.log('Checking for wallet providers...');
            console.log('window.hashpack:', typeof window.hashpack);
            console.log('window.hedera:', typeof window.hedera);
            console.log('window.HashPackProvider:', typeof window.HashPackProvider);
            
            // Check all possible HashPack injection points
            const possibleProviders = [
                'hashpack',
                'hedera',
                'HashPackProvider',
                'hashconnect',
                'ethereum' // Sometimes HashPack uses ethereum provider interface
            ];
            
            for (const provider of possibleProviders) {
                if (window[provider]) {
                    console.log(`Found provider: ${provider}`, window[provider]);
                }
            }

            // Method 1: Check for HashPack injected provider
            if (window.hashpack) {
                console.log('Found HashPack provider');
                return await this.connectViaProvider();
            }

            // Method 2: Check for Hedera window object
            if (window.hedera) {
                console.log('Found Hedera provider');
                return await this.connectViaHedera();
            }

            // Method 3: Check for ethereum-style provider
            if (window.ethereum && window.ethereum.isHashPack) {
                console.log('Found HashPack via ethereum provider');
                return await this.connectViaEthereum();
            }

            // Method 4: Try detecting extension via Chrome API
            const isHashPackInstalled = await this.detectHashPackExtension();
            if (isHashPackInstalled) {
                console.log('HashPack extension detected but not injected yet');
                return {
                    success: false,
                    error: 'HashPack detected but not ready. Please:\n' +
                           '1. Unlock HashPack with your password\n' +
                           '2. Switch to Testnet in HashPack settings\n' +
                           '3. Refresh this page and try again'
                };
            }

            // No HashPack detected at all
            console.log('No HashPack provider found');
            return await this.showManualInstructions();

        } catch (error) {
            console.error('HashPack connection error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async detectHashPackExtension() {
        // Try to detect if HashPack extension is installed
        // This checks for common extension IDs or resources
        try {
            // Check if we can access HashPack's web accessible resources
            const testUrl = 'chrome-extension://gjjkfcalpjhcgoalddabniimdbfhlfkb/manifest.json';
            const response = await fetch(testUrl).catch(() => null);
            return response !== null;
        } catch {
            return false;
        }
    }
    
    async connectViaEthereum() {
        try {
            const provider = window.ethereum;
            
            // Request accounts using ethereum-style API
            const accounts = await provider.request({
                method: 'eth_requestAccounts'
            });
            
            if (accounts && accounts.length > 0) {
                this.accountId = accounts[0];
                this.connected = true;
                return {
                    success: true,
                    accountId: this.accountId
                };
            }
            
            throw new Error('No accounts returned from ethereum provider');
        } catch (error) {
            console.error('Ethereum-style connection failed:', error);
            throw error;
        }
    }

    async connectViaProvider() {
        try {
            const provider = window.hashpack;
            
            // Request account access
            const response = await provider.request({
                method: 'hedera_requestAccounts',
                params: {
                    network: this.network
                }
            });

            if (response && response.accounts && response.accounts.length > 0) {
                this.accountId = response.accounts[0];
                this.connected = true;
                return {
                    success: true,
                    accountId: this.accountId
                };
            }

            throw new Error('No accounts returned from HashPack');
        } catch (error) {
            console.error('Provider connection failed:', error);
            throw error;
        }
    }

    async connectViaHedera() {
        try {
            const hedera = window.hedera;
            
            // Get accounts
            const accounts = await hedera.getAccounts();
            
            if (accounts && accounts.length > 0) {
                this.accountId = accounts[0];
                this.connected = true;
                return {
                    success: true,
                    accountId: this.accountId
                };
            }

            throw new Error('No accounts found in Hedera provider');
        } catch (error) {
            console.error('Hedera connection failed:', error);
            throw error;
        }
    }

    async showManualInstructions() {
        // Show manual connection instructions
        const message = `HashPack not detected. To connect:\n\n` +
            `1. Install HashPack from Chrome Web Store\n` +
            `2. Create or import a wallet\n` +
            `3. Switch to Testnet in HashPack settings\n` +
            `4. Refresh this page\n` +
            `5. Try connecting again\n\n` +
            `Or use Test Mode to explore the protocol without a wallet.`;

        return {
            success: false,
            error: message
        };
    }

    async signTransaction(transaction) {
        if (!this.connected) {
            throw new Error('Not connected to HashPack');
        }

        try {
            if (window.hashpack) {
                return await window.hashpack.request({
                    method: 'hedera_signTransaction',
                    params: {
                        transaction: transaction
                    }
                });
            }

            if (window.hedera) {
                return await window.hedera.signTransaction(transaction);
            }

            throw new Error('No provider available for signing');
        } catch (error) {
            console.error('Transaction signing failed:', error);
            throw error;
        }
    }

    disconnect() {
        this.connected = false;
        this.accountId = null;
    }
}

// Export for use in wallet-connect.js
window.SimpleHashPackConnector = SimpleHashPackConnector;