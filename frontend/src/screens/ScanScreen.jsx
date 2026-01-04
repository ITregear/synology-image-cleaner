import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function ScanScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const { backupPath, sortedPath, recycleBinPath } = location.state || {}
  
  const [scanning, setScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)
  const [error, setError] = useState(null)
  const [duplicateCount, setDuplicateCount] = useState(0)
  const [scanSessionId, setScanSessionId] = useState(null)

  useEffect(() => {
    if (!backupPath || !sortedPath) {
      navigate('/connect')
    }
  }, [backupPath, sortedPath, navigate])

  const handleStartScan = async () => {
    setScanning(true)
    setError(null)
    setScanComplete(false)
    
    try {
      const response = await fetch('/api/scan/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          backup_path: backupPath,
          sorted_path: sortedPath
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setDuplicateCount(data.duplicate_count)
        setScanSessionId(data.scan_session_id)
        setScanComplete(true)
      } else {
        setError(data.error || 'Scan failed')
      }
    } catch (err) {
      setError('Failed to start scan: ' + err.message)
    } finally {
      setScanning(false)
    }
  }

  const handleReview = () => {
    navigate('/review', {
      state: {
        scanSessionId: scanSessionId,
        duplicateCount: duplicateCount,
        backupPath: backupPath,
        sortedPath: sortedPath,
        recycleBinPath: recycleBinPath
      }
    })
  }

  if (!backupPath || !sortedPath) {
    return null
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-sh-text mb-4">Duplicate Scan</h1>
        <p className="text-sh-text-secondary text-lg">
          Scan for duplicate image files between the selected folders
        </p>
      </div>

      <div className="sh-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <svg className="w-6 h-6 text-sh-primary" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
          </svg>
          <h2 className="text-2xl font-bold text-sh-text">Scan Configuration</h2>
        </div>
        
        <div className="space-y-4">
          <div className="bg-sh-bg-tertiary rounded-lg p-4 border border-sh-border">
            <div className="text-sm font-semibold text-sh-text-secondary mb-2">Backup Path</div>
            <div className="font-mono text-sm text-sh-text break-all">
              {backupPath}
            </div>
          </div>
          <div className="bg-sh-bg-tertiary rounded-lg p-4 border border-sh-border">
            <div className="text-sm font-semibold text-sh-text-secondary mb-2">Sorted Path</div>
            <div className="font-mono text-sm text-sh-text break-all">
              {sortedPath}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="sh-card p-6 mb-8 bg-sh-error/10 border-sh-error">
          <div className="flex items-center gap-3 text-sh-error">
            <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <div className="font-bold mb-1">Error</div>
              <div className="text-sm">{error}</div>
            </div>
          </div>
        </div>
      )}

      {!scanComplete && (
        <div className="sh-card p-12 text-center">
          {scanning ? (
            <div className="animate-scale-in">
              <div className="text-6xl mb-6 animate-pulse-slow">🔍</div>
              <h2 className="text-3xl font-bold text-sh-text mb-4">Scanning Folders...</h2>
              <p className="text-sh-text-secondary text-lg mb-6">
                Comparing files between backup and sorted directories
              </p>
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-sh-info/10 border border-sh-info rounded-lg text-sh-info text-sm">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                This may take a while for large directories
              </div>
            </div>
          ) : (
            <div className="animate-scale-in">
              <div className="text-7xl mb-6">✨</div>
              <h2 className="text-3xl font-bold text-sh-text mb-4">Ready to Scan</h2>
              <p className="text-sh-text-secondary text-lg mb-8">
                Click below to start scanning for duplicate files
              </p>
              <button
                onClick={handleStartScan}
                disabled={scanning}
                className="sh-button-primary text-lg py-4 px-12 shadow-sh-glow"
              >
                Start Scan
              </button>
            </div>
          )}
        </div>
      )}

      {scanComplete && (
        <div className="sh-card p-12 text-center border-4 border-sh-success bg-sh-success/5 animate-scale-in">
          <div className="text-7xl mb-6">🎉</div>
          <h2 className="text-3xl font-bold text-sh-success mb-4">Scan Complete!</h2>
          <p className="text-sh-text-secondary text-xl mb-2">
            Found <span className="font-bold text-sh-primary text-2xl">{duplicateCount}</span> duplicate pair{duplicateCount !== 1 ? 's' : ''}
          </p>
          <p className="text-sh-text-muted text-sm mb-8">
            Ready to review and clean up your duplicates
          </p>
          <button
            onClick={handleReview}
            className="sh-button-primary text-lg py-4 px-12 shadow-sh-glow inline-flex items-center gap-3"
          >
            Review Duplicates
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

export default ScanScreen
