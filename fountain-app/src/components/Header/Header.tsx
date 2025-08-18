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
    <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold fountain-gradient-text">
              ⛲ Fountain Protocol
            </h1>
            <span className="text-sm text-slate-500 font-medium">
              Sustainable DeFi on Hedera
            </span>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* Network Indicator */}
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-slate-600 font-medium">Hedera Testnet</span>
            </div>

            {/* Wallet Connection */}
            {connected ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-2 bg-slate-100 rounded-lg">
                  <div className="text-sm">
                    <div className="font-medium text-slate-700">
                      {wallet === 'hashpack' && '📱'} 
                      {wallet === 'blade' && '⚔️'} 
                      {wallet === 'test' && '🧪'} 
                      {wallet ? wallet.charAt(0).toUpperCase() + wallet.slice(1) : ''}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {formatAccountId(accountId || '')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-2 text-sm text-slate-600 hover:text-red-600 transition-colors"
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