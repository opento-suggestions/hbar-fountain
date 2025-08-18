// Proper HashConnect Integration for HashPack
// This implements the official HashConnect flow

class HashConnectService {
    constructor() {
        this.hashconnect = null;
        this.accountId = null;
        this.topic = null;
        this.pairingData = null;
        this.connected = false;
    }

    async initialize() {
        try {
            // Check if HashConnect is available (loaded via CDN or npm)
            if (typeof HashConnect === 'undefined') {
                console.log('HashConnect not available, loading from CDN...');
                await this.loadHashConnectFromCDN();
            }

            // App metadata
            const appMetadata = {
                name: "Fountain Protocol",
                description: "A sustainable DeFi protocol built on Hedera Hashgraph",
                icons: [window.location.origin + "/icon.png"],
                url: window.location.origin
            };

            // Create HashConnect instance with your WalletConnect Project ID
            this.hashconnect = new HashConnect(
                "testnet", // LedgerId
                "41a1d0cc4e04c3d6300a73be45d92b3c", // Your WalletConnect project ID
                appMetadata,
                true // debug mode
            );

            // Set up event handlers
            this.setupEventHandlers();

            // Initialize HashConnect
            await this.hashconnect.init();
            
            console.log('HashConnect initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize HashConnect:', error);
            return false;
        }
    }

    async loadHashConnectFromCDN() {
        return new Promise((resolve, reject) => {
            // Try loading the UMD build which works in browsers
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/hashconnect@3/dist/umd/index.js';
            script.onload = () => {
                console.log('HashConnect loaded from CDN');
                resolve();
            };
            script.onerror = () => {
                console.error('Failed to load HashConnect from CDN');
                reject(new Error('Failed to load HashConnect'));
            };
            document.head.appendChild(script);
        });
    }

    setupEventHandlers() {
        // Pairing event - when wallet connects
        this.hashconnect.pairingEvent.on((pairingData) => {
            console.log('Wallet paired!', pairingData);
            this.pairingData = pairingData;
            this.topic = pairingData.topic;
            
            if (pairingData.accountIds && pairingData.accountIds.length > 0) {
                this.accountId = pairingData.accountIds[0];
                this.connected = true;
                
                // Emit connection event
                window.dispatchEvent(new CustomEvent('hashpack-connected', {
                    detail: {
                        accountId: this.accountId,
                        network: pairingData.network,
                        topic: this.topic
                    }
                }));
            }
        });

        // Disconnection event
        this.hashconnect.disconnectionEvent.on(() => {
            console.log('Wallet disconnected');
            this.connected = false;
            this.accountId = null;
            this.topic = null;
            this.pairingData = null;
            
            window.dispatchEvent(new CustomEvent('hashpack-disconnected'));
        });

        // Connection status change
        this.hashconnect.connectionStatusChangeEvent.on((status) => {
            console.log('Connection status:', status);
        });

        // Transaction response
        this.hashconnect.transactionResponseEvent.on((response) => {
            console.log('Transaction response:', response);
        });
    }

    async connect() {
        try {
            if (!this.hashconnect) {
                const initialized = await this.initialize();
                if (!initialized) {
                    throw new Error('Failed to initialize HashConnect');
                }
            }

            // Check for existing pairings
            const existingPairings = this.hashconnect.hcData?.pairingData || [];
            if (existingPairings.length > 0) {
                console.log('Found existing pairing');
                const pairing = existingPairings[0];
                this.pairingData = pairing;
                this.topic = pairing.topic;
                this.accountId = pairing.accountIds[0];
                this.connected = true;
                return {
                    success: true,
                    accountId: this.accountId
                };
            }

            // Open pairing modal
            console.log('Opening pairing modal...');
            this.hashconnect.openPairingModal();
            
            // Wait for pairing (with timeout)
            return await this.waitForPairing();
        } catch (error) {
            console.error('Connection failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async waitForPairing(timeout = 60000) {
        return new Promise((resolve) => {
            let resolved = false;
            
            // Set up one-time listener for pairing
            const pairingHandler = (pairingData) => {
                if (!resolved) {
                    resolved = true;
                    if (pairingData.accountIds && pairingData.accountIds.length > 0) {
                        resolve({
                            success: true,
                            accountId: pairingData.accountIds[0]
                        });
                    } else {
                        resolve({
                            success: false,
                            error: 'No accounts in pairing data'
                        });
                    }
                }
            };
            
            this.hashconnect.pairingEvent.once(pairingHandler);
            
            // Timeout
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    resolve({
                        success: false,
                        error: 'Pairing timeout - no response from wallet'
                    });
                }
            }, timeout);
        });
    }

    async disconnect() {
        if (this.hashconnect && this.topic) {
            await this.hashconnect.disconnect(this.topic);
        }
        this.connected = false;
        this.accountId = null;
        this.topic = null;
        this.pairingData = null;
    }

    async signTransaction(transaction) {
        if (!this.connected || !this.topic) {
            throw new Error('Not connected to wallet');
        }

        const transactionRequest = {
            topic: this.topic,
            byteArray: transaction.toBytes(),
            metadata: {
                accountToSign: this.accountId,
                returnTransaction: false,
                hideNft: false
            }
        };

        const response = await this.hashconnect.sendTransaction(transactionRequest);
        return response;
    }

    getAccountId() {
        return this.accountId;
    }

    isConnected() {
        return this.connected;
    }
}

// Create global instance
window.hashConnectService = new HashConnectService();

// Also expose for backward compatibility
window.HashConnectService = HashConnectService;