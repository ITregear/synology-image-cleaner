import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function ReviewScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const { scanSessionId, duplicateCount, backupPath, sortedPath, recycleBinPath } = location.state || {}
  
  const [activeTab, setActiveTab] = useState('duplicated')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [duplicatePairs, setDuplicatePairs] = useState([])
  const [allPairs, setAllPairs] = useState([])
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
        const pairs = (data.pairs || []).map(pair => ({
          backup_path: pair.backup_path,
          sorted_path: pair.sorted_path,
          id: pair.id,
          reviewed: pair.reviewed,
          action: pair.action
        }))
        setAllPairs(pairs)
        const unreviewed = pairs.filter(p => !p.reviewed)
        setDuplicatePairs(unreviewed)
        setCurrentIndex(0)
      }
      
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
      
      const newPairs = duplicatePairs.filter((_, idx) => idx !== currentIndex)
      setDuplicatePairs(newPairs)
      
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
      
      const newPairs = duplicatePairs.filter((_, idx) => idx !== currentIndex)
      setDuplicatePairs(newPairs)
      
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
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">
            <svg className="w-16 h-16 mx-auto text-sh-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-lg text-sh-text-secondary">Loading duplicates...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-12">
        <div className="sh-card p-8 bg-sh-error/10 border-sh-error text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-sh-error mb-2">Error</h2>
          <p className="text-sh-text-secondary mb-6">Failed to load duplicates: {error}</p>
          <button onClick={() => navigate('/scan')} className="sh-button-secondary">
            Back to Scan
          </button>
        </div>
      </div>
    )
  }

  if (duplicatePairs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="sh-card p-16 text-center border-4 border-sh-primary bg-sh-primary/5 animate-scale-in">
          <div className="text-7xl mb-6">🎉</div>
          <h2 className="text-4xl font-bold text-sh-primary mb-4">Inbox Zero!</h2>
          <p className="text-sh-text-secondary text-xl mb-8 leading-relaxed">
            All duplicates have been reviewed.<br />Great work!
          </p>
          {stats && (
            <div className="flex justify-center gap-12 mb-8 p-8 sh-card bg-sh-bg-tertiary max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold text-sh-error mb-2">{stats.deleted}</div>
                <div className="text-sm text-sh-text-secondary font-semibold uppercase tracking-wide">Deleted</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-sh-warning mb-2">{stats.ignored}</div>
                <div className="text-sm text-sh-text-secondary font-semibold uppercase tracking-wide">Ignored</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-sh-primary mb-2">{stats.total}</div>
                <div className="text-sm text-sh-text-secondary font-semibold uppercase tracking-wide">Total Reviewed</div>
              </div>
            </div>
          )}
          <button 
            onClick={() => navigate('/scan')} 
            className="sh-button-primary text-lg py-4 px-8"
          >
            Back to Scan
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="max-w-7xl mx-auto px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-sh-text">Review Duplicates</h1>
          <div className="text-2xl font-bold text-sh-primary tabular-nums">
            {currentIndex + 1} / {totalPairs}
          </div>
        </div>
        {backupPath && sortedPath && (
          <div className="text-sm text-sh-text-muted space-y-1">
            <div className="font-mono">
              <span className="text-sh-text-dim">Backup:</span> {backupPath}
            </div>
            <div className="font-mono">
              <span className="text-sh-text-dim">Sorted:</span> {sortedPath}
            </div>
          </div>
        )}
      </div>

      <div className="flex border-b-2 border-sh-border mb-8">
        <button
          onClick={() => setActiveTab('duplicated')}
          className={`px-6 py-4 border-none bg-transparent text-lg font-semibold transition-all duration-200 relative ${
            activeTab === 'duplicated' 
              ? 'text-sh-primary' 
              : 'text-sh-text-muted hover:text-sh-text'
          }`}
        >
          Duplicated Photos ({totalPairs})
          {activeTab === 'duplicated' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-sh-primary rounded-t-full shadow-sh-glow"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('missing')}
          className={`px-6 py-4 border-none bg-transparent text-lg font-semibold transition-all duration-200 relative ${
            activeTab === 'missing' 
              ? 'text-sh-primary' 
              : 'text-sh-text-muted hover:text-sh-text'
          }`}
        >
          Missing Photos (Coming Soon)
          {activeTab === 'missing' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-sh-primary rounded-t-full shadow-sh-glow"></div>
          )}
        </button>
      </div>

      {activeTab === 'duplicated' && (
        <>
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="sh-card p-6 border-l-4 border-sh-warning bg-sh-warning/5">
              <h3 className="flex items-center justify-between text-lg font-bold text-sh-warning mb-4">
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                    <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  Backup Copy
                </span>
              </h3>
              <div className="w-full aspect-[4/3] bg-sh-bg flex items-center justify-center rounded-lg mb-4 border-2 border-sh-border overflow-hidden shadow-sh">
                {currentPair?.backup_path ? (
                  <img
                    src={`/api/thumb?path=${encodeURIComponent(currentPair.backup_path)}`}
                    alt="Backup"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <span className="text-sh-text-muted">No image</span>
                )}
              </div>
              <div className="text-xs font-mono text-sh-text-secondary break-all p-3 bg-sh-bg-tertiary rounded-lg border border-sh-border">
                {currentPair?.backup_path || 'N/A'}
              </div>
            </div>

            <div className="sh-card p-6 border-l-4 border-sh-info bg-sh-info/5">
              <h3 className="flex items-center justify-between text-lg font-bold text-sh-info mb-4">
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Kept Copy
                </span>
              </h3>
              <div className="w-full aspect-[4/3] bg-sh-bg flex items-center justify-center rounded-lg mb-4 border-2 border-sh-border overflow-hidden shadow-sh">
                {currentPair?.sorted_path ? (
                  <img
                    src={`/api/thumb?path=${encodeURIComponent(currentPair.sorted_path)}`}
                    alt="Kept"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <span className="text-sh-text-muted">No image</span>
                )}
              </div>
              <div className="text-xs font-mono text-sh-text-secondary break-all p-3 bg-sh-bg-tertiary rounded-lg border border-sh-border">
                {currentPair?.sorted_path || 'N/A'}
              </div>
            </div>
          </div>

          <div className="sh-card p-6 mb-6">
            <div className="flex items-center justify-between gap-6 flex-wrap">
              <div className="flex gap-3">
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="sh-button-ghost disabled:opacity-30"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentIndex >= totalPairs - 1}
                  className="sh-button-ghost disabled:opacity-30"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={handleIgnore}
                  disabled={actionInProgress}
                  className="sh-button-warning min-w-[140px] flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                  </svg>
                  Ignore
                  <kbd className="sh-kbd ml-1">E</kbd>
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionInProgress}
                  className="sh-button-danger min-w-[140px] flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Delete
                  <kbd className="sh-kbd ml-1">D</kbd>
                </button>
                <button
                  onClick={handleUndo}
                  disabled={actionInProgress}
                  className="sh-button-secondary min-w-[140px] flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a2 2 0 012 2v4a1 1 0 11-2 0v-4H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Undo
                  <kbd className="sh-kbd ml-1">⌘Z</kbd>
                </button>
              </div>
            </div>
          </div>

          {stats && (
            <div className="sh-card p-6 flex justify-around items-center gap-8">
              <StatDisplay label="Remaining" value={stats.remaining} color="text-sh-primary" />
              <div className="h-12 w-px bg-sh-border"></div>
              <StatDisplay label="Reviewed" value={stats.reviewed} color="text-sh-text-secondary" />
              <div className="h-12 w-px bg-sh-border"></div>
              <StatDisplay label="Deleted" value={stats.deleted} color="text-sh-error" />
              <div className="h-12 w-px bg-sh-border"></div>
              <StatDisplay label="Ignored" value={stats.ignored} color="text-sh-warning" />
            </div>
          )}
        </>
      )}

      {activeTab === 'missing' && (
        <div className="py-24 text-center">
          <div className="text-7xl mb-6">🔜</div>
          <h2 className="text-3xl font-bold text-sh-text mb-4">Missing Photos</h2>
          <p className="text-sh-text-secondary text-lg">This feature is coming soon!</p>
        </div>
      )}
    </div>
  )
}

function StatDisplay({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`text-4xl font-bold ${color} mb-2 tabular-nums`}>{value || 0}</div>
      <div className="text-sm text-sh-text-secondary font-semibold uppercase tracking-wide">{label}</div>
    </div>
  )
}

export default ReviewScreen
