function StatsSidebar({ stats, scanSessionId, isScanning, hasSettings }) {
  return (
    <div className="sh-sidebar left-0 w-64 border-r pt-[73px] z-40">
      <div className="p-6 space-y-6">
        <h3 className="text-base font-bold text-sh-text uppercase tracking-wider">
          Status
        </h3>

        {!hasSettings && !isScanning && !scanSessionId && (
          <div className="sh-card p-4 border-l-4 border-sh-warning bg-sh-warning/5">
            <div className="flex items-center gap-2 text-sm font-semibold text-sh-warning mb-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Not Ready
            </div>
            <p className="text-sm text-sh-text-secondary leading-relaxed">
              Configure paths in settings first (press <kbd className="sh-kbd text-xs py-1 px-2">S</kbd>)
            </p>
          </div>
        )}

        {hasSettings && !isScanning && !scanSessionId && (
          <div className="sh-card p-4 border-l-4 border-sh-primary bg-sh-primary/5">
            <div className="flex items-center gap-2 text-sm font-semibold text-sh-primary mb-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Ready to Scan
            </div>
            <p className="text-sm text-sh-text-secondary leading-relaxed">
              Press <kbd className="sh-kbd text-xs py-1 px-2">K</kbd> to start scanning
            </p>
          </div>
        )}

        {isScanning && (
          <div className="sh-card p-4 border-2 border-sh-primary shadow-sh-glow">
            <div className="flex items-center gap-2 text-sm font-semibold text-sh-primary mb-2">
              <div className="w-3 h-3 rounded-full bg-sh-primary animate-pulse-slow" />
              Scanning...
            </div>
            <p className="text-sm text-sh-text-secondary">
              Comparing files...
            </p>
          </div>
        )}

        {scanSessionId && (
          <>
            {stats && stats.total === 0 && (
              <div className="sh-card p-4 border-l-4 border-sh-success bg-sh-success/5">
                <div className="flex items-center gap-2 text-sm font-semibold text-sh-success mb-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  No Duplicates Found
                </div>
                <p className="text-sm text-sh-text-secondary leading-relaxed">
                  Your backup and sorted folders are in sync!
                </p>
              </div>
            )}

            {stats && stats.total > 0 && (
              <>
                <div className="pb-4 border-b border-sh-border">
                  <h4 className="text-xs font-bold text-sh-text-muted uppercase tracking-wider mb-3">
                    Current Session
                  </h4>
                  <div className="space-y-3">
                    <StatItem 
                      label="Remaining" 
                      value={stats.remaining || 0}
                      color="text-sh-primary"
                      icon={
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      }
                    />
                    <StatItem 
                      label="Reviewed" 
                      value={stats.reviewed || 0}
                      color="text-sh-text-secondary"
                      icon={
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                        </svg>
                      }
                    />
                    <div className="text-xs text-sh-text-muted pt-1">
                      {stats.total || 0} total found
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-sh-text-muted uppercase tracking-wider mb-3">
                    Actions
                  </h4>
                  <div className="space-y-3">
                    <StatItem 
                      label="Deleted" 
                      value={stats.deleted || 0}
                      color="text-sh-error"
                      icon={
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      }
                    />
                    <StatItem 
                      label="Ignored" 
                      value={stats.ignored || 0}
                      color="text-sh-warning"
                      icon={
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                        </svg>
                      }
                    />
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StatItem({ label, value, color, icon }) {
  return (
    <div className="flex items-center justify-between bg-sh-bg-secondary/50 rounded-lg p-3 hover:bg-sh-surface/50 transition-colors duration-200">
      <div className="flex items-center gap-2">
        {icon && <span className={`${color} opacity-75`}>{icon}</span>}
        <span className="text-sm text-sh-text-secondary font-medium">{label}</span>
      </div>
      <span className={`text-lg font-bold ${color} tabular-nums`}>
        {value}
      </span>
    </div>
  )
}

export default StatsSidebar
