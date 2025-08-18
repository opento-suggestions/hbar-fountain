import { useProtocolStore } from '../../stores/protocolStore';
import { formatHbarWithSymbol, formatROI } from '../../utils/formatters';

const InvestmentCalculator: React.FC = () => {
  const { protocolStatus, investmentCalculation } = useProtocolStore();

  if (!protocolStatus || !investmentCalculation) {
    return (
      <div className="fountain-card p-6">
        <h3 className="text-xl font-semibold mb-4">📊 Investment Calculator</h3>
        <div className="text-center text-slate-500 py-8">
          Connect your wallet and join the protocol to see investment calculations
        </div>
      </div>
    );
  }

  const { investment, projectedReturn, profit, daysRemaining, dailyRate } = investmentCalculation;

  return (
    <div className="fountain-card p-6">
      <h3 className="text-xl font-semibold mb-6 text-center">📊 AutoRedeem Calculator</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Status */}
        <div className="space-y-4">
          <h4 className="font-medium text-slate-700 mb-3">Current Status</h4>
          
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Current ✨ WISH Balance:</span>
              <span className="font-mono font-medium">{protocolStatus.wish.balance}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Daily ✨ WISH Rate:</span>
              <span className="font-mono font-medium text-green-600">+{dailyRate} per day</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Days until AutoRedeem:</span>
              <span className="font-mono font-medium text-blue-600">
                {daysRemaining === 0 ? 'Ready now!' : daysRemaining === Infinity ? 'N/A' : `${daysRemaining} days`}
              </span>
            </div>
          </div>
        </div>

        {/* Investment Returns */}
        <div className="space-y-4">
          <h4 className="font-medium text-slate-700 mb-3">Investment Returns</h4>
          
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Investment:</span>
              <span className="font-mono font-medium">{formatHbarWithSymbol(investment * 100000000)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">AutoRedeem Payout:</span>
              <span className="font-mono font-medium text-green-600">{formatHbarWithSymbol(projectedReturn * 100000000)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-slate-700 font-medium">Net Profit:</span>
              <span className="font-mono font-bold text-green-600">{formatHbarWithSymbol(profit * 100000000)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">ROI:</span>
              <span className="font-mono font-bold text-green-600">{formatROI()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Visualization */}
      <div className="mt-6">
        <h4 className="font-medium text-slate-700 mb-3">Progress to AutoRedeem</h4>
        
        <div className="space-y-2">
          <div className="bg-slate-200 rounded-full h-4 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 transition-all duration-500 ease-out"
              style={{ width: `${Math.min((protocolStatus.wish.balance / 1000) * 100, 100)}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">0 ✨ WISH</span>
            <span className="text-slate-600">1000 ✨ WISH (AutoRedeem)</span>
          </div>
          
          <div className="text-center">
            <span className="text-lg font-bold text-slate-900">
              {protocolStatus.wish.balance}/1000 ✨ WISH
            </span>
            <span className="text-slate-600 ml-2">
              ({Math.round((protocolStatus.wish.balance / 1000) * 100)}% complete)
            </span>
          </div>
        </div>
      </div>

      {/* Investment Highlight */}
      {protocolStatus.wish.canAutoRedeem ? (
        <div className="mt-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4 text-center">
          <div className="text-xl font-bold mb-1">🎉 AutoRedeem Available!</div>
          <div className="text-green-100">
            Claim your {formatHbarWithSymbol(profit * 100000000)} profit now
          </div>
        </div>
      ) : (
        <div className="mt-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-4 text-center">
          <div className="text-lg font-bold mb-1">💰 Potential Profit</div>
          <div className="text-blue-100">
            Earn {formatHbarWithSymbol(profit * 100000000)} in {daysRemaining === Infinity ? 'N/A' : `~${daysRemaining} days`}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentCalculator;