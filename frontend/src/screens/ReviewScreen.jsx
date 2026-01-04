import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function ReviewScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const { scanSessionId, duplicateCount, backupPath, sortedPath, recycleBinPath } = location.state || {}
  
  const [activeTab, setActiveTab] = useState('duplicated')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [duplicatePairs, setDuplicatePairs] = useState([])
  const [allPairs, setAllPairs] = useState([]) // Keep all pairs for filtering
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [actionInProgress, setActionInProgress] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!scanSessionId) {
      navigate('/scan')
      return
    }

    loadDuplicates()
  }, [scanSessionId, navigate])

  const loadDuplicates = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/scan/duplicates?scan_session_id=${encodeURIComponent(scanSessionId)}`)
      const data = await response.json()
      if (data.error) {
        setError(data.error)
        setDuplicatePairs([])
        setAllPairs([])
      } else {
        // Transform pairs and filter out reviewed ones
        const pairs = (data.pairs || []).map(pair => ({
          backup_path: pair.backup_path,
          sorted_path: pair.sorted_path,
          id: pair.id,
          reviewed: pair.reviewed,
          action: pair.action
        }))
        setAllPairs(pairs)
        // Only show unreviewed pairs
        const unreviewed = pairs.filter(p => !p.reviewed)
        setDuplicatePairs(unreviewed)
        setCurrentIndex(0)
      }
      
      // Load stats
      await loadStats()
    } catch (err) {
      setError('Failed to load duplicates: ' + err.message)
      setDuplicatePairs([])
      setAllPairs([])
    } finally {
      setLoading(false)
    }
  }
  
  const loadStats = async () => {
    try {
      const response = await fetch(`/api/review/stats?scan_session_id=${encodeURIComponent(scanSessionId)}`)
      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }
  
  const handleIgnore = async () => {
    if (!currentPair || actionInProgress) return
    
    setActionInProgress(true)
    try {
      const response = await fetch('/api/review/ignore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_id: currentPair.id,
          backup_path: currentPair.backup_path,
          sorted_path: currentPair.sorted_path,
          session_id: scanSessionId
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to ignore duplicate')
      }
      
      // Remove from current list and move to next
      const newPairs = duplicatePairs.filter((_, idx) => idx !== currentIndex)
      setDuplicatePairs(newPairs)
      
      // Adjust index if needed
      if (currentIndex >= newPairs.length && newPairs.length > 0) {
        setCurrentIndex(newPairs.length - 1)
      }
      
      await loadStats()
    } catch (err) {
      alert('Error ignoring duplicate: ' + err.message)
    } finally {
      setActionInProgress(false)
    }
  }
  
  const handleDelete = async () => {
    if (!currentPair || actionInProgress) return
    
    setActionInProgress(true)
    try {
      const response = await fetch('/api/review/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_id: currentPair.id,
          backup_path: currentPair.backup_path,
          sorted_path: currentPair.sorted_path,
          session_id: scanSessionId,
          recycle_bin_path: recycleBinPath
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to delete duplicate')
      }
      
      // Remove from current list and move to next
      const newPairs = duplicatePairs.filter((_, idx) => idx !== currentIndex)
      setDuplicatePairs(newPairs)
      
      // Adjust index if needed
      if (currentIndex >= newPairs.length && newPairs.length > 0) {
        setCurrentIndex(newPairs.length - 1)
      }
      
      await loadStats()
    } catch (err) {
      alert('Error deleting duplicate: ' + err.message)
    } finally {
      setActionInProgress(false)
    }
  }
  
  const handleUndo = async () => {
    if (actionInProgress) return
    
    setActionInProgress(true)
    try {
      const response = await fetch('/api/review/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: scanSessionId
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Nothing to undo')
      }
      
      // Reload duplicates to reflect the undone action
      await loadDuplicates()
    } catch (err) {
      alert('Error undoing: ' + err.message)
    } finally {
      setActionInProgress(false)
    }
  }

  const currentPair = duplicatePairs[currentIndex]
  const totalPairs = duplicatePairs.length

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }, [currentIndex])

  const handleNext = useCallback(() => {
    if (currentIndex < totalPairs - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }, [currentIndex, totalPairs])

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }

      if (e.key === 'ArrowLeft') {
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'e' || e.key === 'E') {
        handleIgnore()
      } else if (e.key === 'd' || e.key === 'D') {
        handleDelete()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        handleUndo()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handlePrevious, handleNext, handleIgnore, handleDelete, handleUndo])

  if (loading) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h2>Review Duplicates</h2>
        <p>Loading duplicates...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto', color: '#c62828' }}>
        <h2>Error</h2>
        <p>Failed to load duplicates: {error}</p>
        <button onClick={() => navigate('/scan')} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
          Back to Scan
        </button>
      </div>
    )
  }

  if (duplicatePairs.length === 0) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto', textAlign: 'center', padding: '4rem 2rem', backgroundColor: '#f0f7ff', borderRadius: '12px', border: '2px solid #0066cc' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ color: '#0066cc', fontSize: '2rem', marginBottom: '1rem' }}>Inbox Zero!</h2>
        <p style={{ color: '#666', fontSize: '1.125rem', marginBottom: '2rem' }}>
          All duplicates have been reviewed.
        </p>
        {stats && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem', fontSize: '1rem' }}>
            <div>
              <div style={{ fontWeight: '600', color: '#0066cc' }}>{stats.deleted}</div>
              <div style={{ color: '#666', fontSize: '0.875rem' }}>Deleted</div>
            </div>
            <div>
              <div style={{ fontWeight: '600', color: '#0066cc' }}>{stats.ignored}</div>
              <div style={{ color: '#666', fontSize: '0.875rem' }}>Ignored</div>
            </div>
            <div>
              <div style={{ fontWeight: '600', color: '#0066cc' }}>{stats.total}</div>
              <div style={{ color: '#666', fontSize: '0.875rem' }}>Total Reviewed</div>
            </div>
          </div>
        )}
        <button 
          onClick={() => navigate('/scan')} 
          style={{ 
            padding: '0.75rem 2rem', 
            fontSize: '1rem',
            backgroundColor: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Back to Scan
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e0e0e0', paddingBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Review Duplicates</h2>
        {backupPath && sortedPath && (
          <>
            <p style={{ color: '#666', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              Backup: <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{backupPath}</span>
            </p>
            <p style={{ fontSize: '0.875rem', color: '#999', fontFamily: 'monospace', margin: 0 }}>
              Sorted: {sortedPath}
            </p>
          </>
        )}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('duplicated')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderBottom: activeTab === 'duplicated' ? '2px solid #0066cc' : 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: activeTab === 'duplicated' ? '600' : '400',
            color: activeTab === 'duplicated' ? '#0066cc' : '#666',
          }}
        >
          Duplicated Photos ({totalPairs})
        </button>
        <button
          onClick={() => setActiveTab('missing')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderBottom: activeTab === 'missing' ? '2px solid #0066cc' : 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: activeTab === 'missing' ? '600' : '400',
            color: activeTab === 'missing' ? '#0066cc' : '#666',
          }}
        >
          Missing Photos (Coming Soon)
        </button>
      </div>

      {activeTab === 'duplicated' && (
        <>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <h3 style={{ margin: 0 }}>Reviewing Duplicates</h3>
            <div style={{ 
              fontSize: '1.125rem', 
              fontWeight: '600',
              color: '#666'
            }}>
              {currentIndex + 1} / {totalPairs}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1.5rem',
              backgroundColor: '#fff3cd'
            }}>
              <h4 style={{ marginTop: 0, color: '#856404' }}>Backup Copy</h4>
              <div style={{
                width: '100%',
                height: '400px',
                backgroundColor: '#f8f9fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                marginBottom: '1rem',
                border: '1px solid #e0e0e0',
                overflow: 'hidden'
              }}>
                {currentPair?.backup_path ? (
                  <img
                    src={`/api/thumb?path=${encodeURIComponent(currentPair.backup_path)}`}
                    alt="Backup Thumbnail"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <span style={{ color: '#999' }}>No Backup Image</span>
                )}
              </div>
              <div style={{
                fontSize: '0.875rem',
                fontFamily: 'monospace',
                color: '#666',
                wordBreak: 'break-all',
                padding: '0.75rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px'
              }}>
                {currentPair?.backup_path || 'N/A'}
              </div>
            </div>

            <div style={{
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1.5rem',
              backgroundColor: '#d1ecf1'
            }}>
              <h4 style={{ marginTop: 0, color: '#0c5460' }}>Kept Copy</h4>
              <div style={{
                width: '100%',
                height: '400px',
                backgroundColor: '#f8f9fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                marginBottom: '1rem',
                border: '1px solid #e0e0e0',
                overflow: 'hidden'
              }}>
                {currentPair?.sorted_path ? (
                  <img
                    src={`/api/thumb?path=${encodeURIComponent(currentPair.sorted_path)}`}
                    alt="Kept Thumbnail"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <span style={{ color: '#999' }}>No Kept Image</span>
                )}
              </div>
              <div style={{
                fontSize: '0.875rem',
                fontFamily: 'monospace',
                color: '#666',
                wordBreak: 'break-all',
                padding: '0.75rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px'
              }}>
                {currentPair?.sorted_path || 'N/A'}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            padding: '1.5rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            alignItems: 'center'
          }}>
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                backgroundColor: currentIndex === 0 ? '#ccc' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              ← Previous
            </button>
            <button
              onClick={handleIgnore}
              disabled={actionInProgress}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                backgroundColor: actionInProgress ? '#ccc' : '#ffa726',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: actionInProgress ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              Ignore (E)
            </button>
            <button
              onClick={handleDelete}
              disabled={actionInProgress}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                backgroundColor: actionInProgress ? '#ccc' : '#d32f2f',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: actionInProgress ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              Delete (D)
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex >= totalPairs - 1}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                backgroundColor: currentIndex >= totalPairs - 1 ? '#ccc' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentIndex >= totalPairs - 1 ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              Next →
            </button>
            <div style={{ borderLeft: '2px solid #ddd', height: '40px', margin: '0 0.5rem' }}></div>
            <button
              onClick={handleUndo}
              disabled={actionInProgress}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                backgroundColor: actionInProgress ? '#ccc' : '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: actionInProgress ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              Undo (Ctrl+Z)
            </button>
          </div>

          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: '#e9ecef',
            borderRadius: '4px',
            fontSize: '0.875rem'
          }}>
            <strong>Keyboard Shortcuts:</strong>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
              <li><strong>ArrowLeft / ArrowRight</strong> - Navigate between duplicates</li>
              <li><strong>E</strong> - Ignore this duplicate (won't show again)</li>
              <li><strong>D</strong> - Delete backup copy (moves to recycle bin)</li>
              <li><strong>Ctrl+Z / Cmd+Z</strong> - Undo last action</li>
            </ul>
          </div>
          
          {stats && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: '#f0f7ff',
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'space-around',
              fontSize: '0.875rem'
            }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '1.25rem', color: '#0066cc' }}>{stats.remaining}</div>
                <div style={{ color: '#666' }}>Remaining</div>
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '1.25rem', color: '#d32f2f' }}>{stats.deleted}</div>
                <div style={{ color: '#666' }}>Deleted</div>
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '1.25rem', color: '#ffa726' }}>{stats.ignored}</div>
                <div style={{ color: '#666' }}>Ignored</div>
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '1.25rem', color: '#666' }}>{stats.reviewed} / {stats.total}</div>
                <div style={{ color: '#666' }}>Progress</div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'missing' && (
        <div style={{ padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center', color: '#666' }}>
          <h3>Missing Photos</h3>
          <p>This feature is coming soon!</p>
        </div>
      )}
    </div>
  )
}

export default ReviewScreen

