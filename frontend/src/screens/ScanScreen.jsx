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
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Duplicate Scan</h2>
          <p style={{ color: '#666', marginTop: '0.5rem', marginBottom: 0 }}>
            Scan for duplicate image files between the selected folders.
          </p>
        </div>
      </div>

      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Scan Configuration</h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div>
            <strong>Backup Path:</strong>
            <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
              {backupPath}
            </div>
          </div>
          <div>
            <strong>Sorted Path:</strong>
            <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
              {sortedPath}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          Error: {error}
        </div>
      )}

      {!scanComplete && (
        <div style={{
          padding: '2rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          {scanning ? (
            <div>
              <p style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Scanning folders...</p>
              <p style={{ color: '#666' }}>This may take a while depending on folder size.</p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Ready to scan</p>
              <button
                onClick={handleStartScan}
                disabled={scanning}
                style={{
                  padding: '0.75rem 2rem',
                  fontSize: '1rem',
                  backgroundColor: '#0066cc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Start Scan
              </button>
            </div>
          )}
        </div>
      )}

      {scanComplete && (
        <div style={{
          padding: '2rem',
          backgroundColor: '#e8f5e9',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3 style={{ marginTop: 0, color: '#2e7d32' }}>Scan Complete!</h3>
          <p style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>
            Found <strong>{duplicateCount}</strong> duplicate pair{duplicateCount !== 1 ? 's' : ''}
          </p>
          <button
            onClick={handleReview}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Review Duplicates
          </button>
        </div>
      )}
    </div>
  )
}

export default ScanScreen

