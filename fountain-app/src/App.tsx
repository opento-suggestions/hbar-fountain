import { useEffect, useState } from 'react';
import { useWalletStore } from './stores/walletStore';
import { useProtocolStore } from './stores/protocolStore';
import Header from './components/Header/Header';
import WelcomeSection from './components/Welcome/WelcomeSection';
import Dashboard from './components/Dashboard/Dashboard';

function App() {
  const { connected, accountId } = useWalletStore();
  const { refreshAll } = useProtocolStore();
  const [showWalletModal, setShowWalletModal] = useState(false);

  useEffect(() => {
    // Refresh protocol stats on app load
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    // Refresh user data when wallet connects
    if (connected && accountId) {
      refreshAll(accountId);
    }
  }, [connected, accountId, refreshAll]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-cloud-50 via-white to-mist-50">
      <div className="max-w-7xl mx-auto">
        <Header onWalletClick={() => setShowWalletModal(true)} />
        
        <main className="px-4 py-8">
          {connected ? (
            <Dashboard />
          ) : (
            <WelcomeSection onConnectWallet={() => setShowWalletModal(true)} />
          )}
        </main>
      </div>
      
      {/* Wallet Modal - will be implemented */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-600 mb-4">Choose your preferred wallet to connect to Fountain Protocol</p>
            <button 
              onClick={() => setShowWalletModal(false)}
              className="w-full fountain-button-secondary"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
