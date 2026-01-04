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
    <div className="relative">
      <div 
        className="flex items-center gap-3 cursor-pointer"
        onMouseEnter={() => setShowDetails(true)}
        onMouseLeave={() => setShowDetails(false)}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              connected 
                ? 'bg-sh-success shadow-[0_0_12px_rgba(16,185,129,0.6)]' 
                : 'bg-sh-error'
            } ${showDetails && connected ? 'animate-pulse-slow' : ''}`}
            title={connected ? 'Connected to NAS' : error || 'Disconnected from NAS'}
          />
          <span className={`text-sm font-medium ${
            connected ? 'text-sh-success' : 'text-sh-error'
          }`}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {!connected && (
          <button
            onClick={handleTestConnection}
            disabled={checking}
            className="px-3 py-1.5 text-sm bg-sh-primary hover:bg-sh-primary-dark text-white rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sh-sm"
          >
            {checking ? 'Testing...' : 'Test Connection'}
          </button>
        )}
        {error && !connected && (
          <span 
            className="text-xs text-sh-error max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap" 
            title={error}
          >
            {error}
          </span>
        )}
      </div>
      
      {showDetails && connected && (
        <div className="absolute top-full right-0 mt-2 bg-sh-surface border-2 border-sh-success rounded-xl p-4 shadow-sh-lg min-w-[280px] z-[1000] animate-fade-in">
          <div className="mb-3 pb-3 border-b border-sh-border">
            <div className="text-sm font-semibold text-sh-success flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-sh-success animate-pulse-slow" />
              NAS Connection Active
            </div>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-start justify-between">
              <span className="text-sh-text-secondary font-medium">Host</span>
              <span className="font-mono text-sh-text ml-3 text-right">{nasInfo.host || 'N/A'}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-sh-text-secondary font-medium">User</span>
              <span className="font-mono text-sh-text ml-3 text-right">{nasInfo.user || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ConnectionIndicator


