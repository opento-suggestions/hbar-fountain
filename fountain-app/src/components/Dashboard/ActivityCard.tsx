import { useProtocolStore } from '../../stores/protocolStore';
import { formatTimeAgo } from '../../utils/formatters';
import type { ActivityItem } from '../../types/protocol';

const ActivityCard: React.FC = () => {
  const { activities, isRefreshing } = useProtocolStore();

  const defaultActivity: ActivityItem = {
    icon: '🔄',
    action: 'Welcome to Fountain Protocol!',
    details: 'Your activity will appear here as you interact with the protocol',
    timestamp: Date.now()
  };

  const displayActivities = activities.length > 0 ? activities : [defaultActivity];

  return (
    <div className="fountain-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">📋 Recent Activity</h3>
        {isRefreshing && (
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {displayActivities.map((activity, index) => (
          <div key={index} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
            <div className="text-xl flex-shrink-0 mt-0.5">
              {activity.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 truncate">
                {activity.action}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                {activity.details}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center space-x-2">
                <span>{formatTimeAgo(activity.timestamp)}</span>
                {activity.transactionId && (
                  <>
                    <span>•</span>
                    <a 
                      href={`https://hashscan.io/testnet/transaction/${activity.transactionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      View Transaction
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {activities.length === 0 && (
          <div className="text-center text-slate-500 py-4">
            <div className="text-2xl mb-2">🌊</div>
            <div className="text-sm">
              Start interacting with the protocol to see your activity here
            </div>
          </div>
        )}
      </div>

      {/* Live Updates Indicator */}
      <div className="mt-4 pt-3 border-t border-slate-200">
        <div className="flex items-center justify-center space-x-2 text-xs text-slate-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live updates via HCS Topic 0.0.6591043</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityCard;