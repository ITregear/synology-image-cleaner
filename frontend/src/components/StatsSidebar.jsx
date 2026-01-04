function StatsSidebar({ stats, scanSessionId, isScanning, hasSettings }) {
  return (
    <div style={{
      position: 'fixed',
      left: 0,
      top: '64px',
      bottom: 0,
      width: '250px',
      backgroundColor: '#f8f9fa',
      borderRight: '1px solid #e0e0e0',
      padding: '1.5rem',
      overflowY: 'auto',
      zIndex: 100
    }}>
      <h3 style={{ 
        margin: '0 0 1rem 0', 
        fontSize: '1rem', 
        color: '#333',
        fontWeight: '600'
      }}>
        Status
      </h3>

      {!hasSettings && !isScanning && !scanSessionId && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fff3cd',
          borderRadius: '6px',
          border: '1px solid #ffa726',
          marginBottom: '1rem'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#856404', marginBottom: '0.5rem' }}>
            ⚠️ Not Ready
          </div>
          <div style={{ fontSize: '0.875rem', color: '#666', lineHeight: '1.4' }}>
            Configure paths in settings first (press <kbd style={{ padding: '0.125rem 0.375rem', backgroundColor: '#fff', borderRadius: '3px', border: '1px solid #ccc' }}>S</kbd>)
          </div>
        </div>
      )}

      {hasSettings && !isScanning && !scanSessionId && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#e3f2fd',
          borderRadius: '6px',
          border: '1px solid #0066cc',
          marginBottom: '1rem'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#0066cc', marginBottom: '0.5rem', fontWeight: '600' }}>
            ✓ Ready to Scan
          </div>
          <div style={{ fontSize: '0.875rem', color: '#666', lineHeight: '1.4' }}>
            Press <kbd style={{ padding: '0.125rem 0.375rem', backgroundColor: '#fff', borderRadius: '3px', border: '1px solid #ccc' }}>K</kbd> to start scanning
          </div>
        </div>
      )}

      {isScanning && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fff',
          borderRadius: '6px',
          border: '2px solid #0066cc',
          marginBottom: '1rem'
        }}>
          <div style={{ 
            fontSize: '0.875rem', 
            color: '#0066cc', 
            marginBottom: '0.5rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%',
              backgroundColor: '#0066cc',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            Scanning...
          </div>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>
            Comparing files...
          </div>
        </div>
      )}

      {scanSessionId && (
        <>
          {stats && stats.total === 0 && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#e8f5e9',
              borderRadius: '6px',
              border: '1px solid #4caf50',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#2e7d32', marginBottom: '0.5rem', fontWeight: '600' }}>
                ✓ No Duplicates Found
              </div>
              <div style={{ fontSize: '0.875rem', color: '#666', lineHeight: '1.4' }}>
                Your backup and sorted folders are in sync!
              </div>
            </div>
          )}

          {stats && stats.total > 0 && (
            <>
              <div style={{
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #e0e0e0'
              }}>
                <h4 style={{ 
                  margin: '0 0 0.75rem 0', 
                  fontSize: '0.875rem', 
                  color: '#666',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: '600'
                }}>
                  Current Session
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <StatItem 
                    label="Remaining" 
                    value={stats.remaining || 0}
                    color="#0066cc"
                  />
                  <StatItem 
                    label="Reviewed" 
                    value={stats.reviewed || 0}
                    color="#666"
                  />
                  <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                    {stats.total || 0} total found
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ 
                  margin: '0 0 0.75rem 0', 
                  fontSize: '0.875rem', 
                  color: '#666',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: '600'
                }}>
                  Actions
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <StatItem 
                    label="Deleted" 
                    value={stats.deleted || 0}
                    color="#d32f2f"
                  />
                  <StatItem 
                    label="Ignored" 
                    value={stats.ignored || 0}
                    color="#ffa726"
                  />
                </div>
              </div>
            </>
          )}
        </>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}

function StatItem({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.875rem', color: '#666' }}>{label}</span>
      <span style={{ 
        fontSize: '1.125rem', 
        fontWeight: '700', 
        color: color,
        minWidth: '40px',
        textAlign: 'right'
      }}>
        {value}
      </span>
    </div>
  )
}

export default StatsSidebar

