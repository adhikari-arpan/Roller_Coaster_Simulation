import { Megaphone, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export default function AnnouncementFeed({ announcements }) {
  // Helper to get matching icons and colors for logs
  const getAnnouncementDetails = (type) => {
    switch (type) {
      case 'alert':
        return {
          icon: <AlertCircle size={14} className="text-red-400" />,
          colorClass: 'log-alert',
          badgeText: 'WARNING'
        };
      case 'success':
        return {
          icon: <CheckCircle2 size={14} className="text-emerald-400" />,
          colorClass: 'log-success',
          badgeText: 'SYSTEM'
        };
      default:
        return {
          icon: <Info size={14} className="text-blue-400" />,
          colorClass: 'log-info',
          badgeText: 'ANNOUNCE'
        };
    }
  };

  return (
    <div className="announcement-panel glass-panel">
      <h3 className="section-title">
        <Megaphone size={18} className="title-icon text-purple-400" />
        Theme Park PA System & Logs
      </h3>

      <div className="announcement-feed-container">
        {announcements.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-4">No recent park broadcasts.</div>
        ) : (
          announcements.map((log) => {
            const { icon, colorClass, badgeText } = getAnnouncementDetails(log.type);
            return (
              <div key={log.id} className={`feed-item ${colorClass}`}>
                <span className="log-time font-mono text-[10px] text-slate-500 mr-2 bg-slate-900 px-1 py-0.5 rounded">
                  [{log.time}]
                </span>
                <span className={`log-badge font-mono text-[9px] font-bold px-1 py-0.5 rounded mr-2 ${log.type === 'alert' ? 'bg-red-950 text-red-400 border border-red-800' :
                    log.type === 'success' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      'bg-slate-800 text-slate-400'
                  }`}>
                  {badgeText}
                </span>
                <span className="log-icon mr-1.5 flex-shrink-0">{icon}</span>
                <span className="log-text text-slate-200">{log.text}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
