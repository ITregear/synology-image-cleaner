import { useState, useEffect } from 'react'

function ConnectionIndicator() {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)
  const [checking, setChecking] = useState(false)

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/connection')
      const data = await response.json()
      setConnected(data.connected)
      setError(data.error)
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: connected ? '#4caf50' : '#f44336',
            boxShadow: connected ? '0 0 8px rgba(76, 175, 80, 0.6)' : 'none',
            transition: 'all 0.3s ease'
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
  )
}

export default ConnectionIndicator

