import { useWalletStore } from '../../stores/walletStore';
import { formatAccountId } from '../../utils/formatters';

interface HeaderProps {
  onWalletClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onWalletClick }) => {
  const { connected, wallet, accountId, disconnectWallet } = useWalletStore();

  const handleDisconnect = async () => {
    await disconnectWallet();
  };

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-steam-200 sticky top-0 z-40">
      <div className="px-6 py-5">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold fountain-gradient-text">
              ⛲ Fountain Protocol
            </h1>
            <span className="text-sm fountain-text-secondary">
              Sustainable DeFi on Hedera
            </span>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Network Indicator */}
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-success-600 rounded-full animate-pulse"></div>
              <span className="fountain-text-secondary">Hedera Testnet</span>
            </div>

            {/* Wallet Connection */}
            {connected ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3 px-4 py-2 bg-mist-50 rounded-xl border border-steam-200">
                  <div className="text-sm">
                    <div className="fountain-text-primary">
                      {wallet === 'hashpack' && '📱'} 
                      {wallet === 'blade' && '⚔️'} 
                      {wallet === 'test' && '🧪'} 
                      {wallet ? wallet.charAt(0).toUpperCase() + wallet.slice(1) : ''}
                    </div>
                    <div className="text-xs fountain-text-secondary font-mono">
                      {formatAccountId(accountId || '')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-2 text-sm fountain-text-secondary hover:text-warning-600 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button 
                onClick={onWalletClick}
                className="fountain-button-primary"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;