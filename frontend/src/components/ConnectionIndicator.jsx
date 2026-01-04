import { useState, useEffect } from 'react'

function ConnectionIndicator() {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)
  const [checking, setChecking] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [nasInfo, setNasInfo] = useState({ host: '', user: '' })

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/connection')
      const data = await response.json()
      setConnected(data.connected)
      setError(data.error)
      if (data.nas_host && data.nas_user) {
        setNasInfo({ host: data.nas_host, user: data.nas_user })
      }
    } catch (err) {
      setConnected(false)
      setError('Failed to check connection status')
    }
  }

  const handleTestConnection = async () => {
    setChecking(true)
    try {
      const response = await fetch('/api/connection/test', { method: 'POST' })
      const data = await response.json()
      setConnected(data.connected)
      setError(data.error)
    } catch (err) {
      setConnected(false)
      setError('Connection test failed')
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    checkConnection()
    const interval = setInterval(checkConnection, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ position: 'relative' }}>
      <div 
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        onMouseEnter={() => setShowDetails(true)}
        onMouseLeave={() => setShowDetails(false)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: connected ? '#4caf50' : '#f44336',
              boxShadow: connected ? '0 0 8px rgba(76, 175, 80, 0.6)' : 'none',
              transition: 'all 0.3s ease',
              animation: showDetails ? 'pulse 1s ease-in-out infinite' : 'none'
            }}
            title={connected ? 'Connected to NAS' : error || 'Disconnected from NAS'}
          />
          <span style={{ 
            fontSize: '0.875rem', 
            color: connected ? '#4caf50' : '#f44336',
            fontWeight: '500'
          }}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      {!connected && (
        <button
          onClick={handleTestConnection}
          disabled={checking}
          style={{
            padding: '0.375rem 0.75rem',
            fontSize: '0.875rem',
            backgroundColor: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: checking ? 'not-allowed' : 'pointer',
            opacity: checking ? 0.6 : 1
          }}
        >
          {checking ? 'Testing...' : 'Test Connection'}
        </button>
      )}
        {error && !connected && (
          <span style={{ 
            fontSize: '0.75rem', 
            color: '#d32f2f',
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }} title={error}>
            {error}
          </span>
        )}
      </div>
      
      {showDetails && connected && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '0.5rem',
          backgroundColor: 'white',
          border: '2px solid #4caf50',
          borderRadius: '8px',
          padding: '1rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          minWidth: '250px',
          zIndex: 1000,
          animation: 'dropDown 0.2s ease-out'
        }}>
          <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e0e0e0' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4caf50', marginBottom: '0.5rem' }}>
              NAS Connection
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: '#666', fontWeight: '500' }}>Host: </span>
              <span style={{ fontFamily: 'monospace', color: '#333' }}>{nasInfo.host || 'N/A'}</span>
            </div>
            <div>
              <span style={{ color: '#666', fontWeight: '500' }}>User: </span>
              <span style={{ fontFamily: 'monospace', color: '#333' }}>{nasInfo.user || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.15); }
        }
        @keyframes dropDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default ConnectionIndicator


