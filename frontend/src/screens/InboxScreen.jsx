import { useState, useEffect, useCallback } from 'react'
import SettingsSidebar from '../components/SettingsSidebar'
import HelpSidebar from '../components/HelpSidebar'
import StatsSidebar from '../components/StatsSidebar'

function InboxScreen() {
  const [activeTab, setActiveTab] = useState('duplicates')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [duplicatePairs, setDuplicatePairs] = useState([])
  const [ignoredPairs, setIgnoredPairs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [actionInProgress, setActionInProgress] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [scanSessionId, setScanSessionId] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [showHelp, setShowHelp] = useState(false)
  
  const [settings, setSettings] = useState({
    backupPath: '',
    sortedPath: '',
    recycleBinPath: ''
  })

  useEffect(() => {
    loadSettings()
    loadLastSession()
  }, [])

  const loadSettings = () => {
    const backupPath = localStorage.getItem('backupPath') || ''
    const sortedPath = localStorage.getItem('sortedPath') || ''
    const recycleBinPath = localStorage.getItem('recycleBinPath') || ''
    setSettings({ backupPath, sortedPath, recycleBinPath })
  }

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings)
  }

  const loadLastSession = async () => {
    const lastSessionId = localStorage.getItem('lastScanSessionId')
    if (lastSessionId) {
      setScanSessionId(lastSessionId)
      await loadDuplicates(lastSessionId)
    }
  }

  const loadDuplicates = async (sessionId) => {
    if (!sessionId) return
    
    setLoading(true)
    setError(null)
    setSelectedImage(null)
    try {
      const response = await fetch(`/api/scan/duplicates?scan_session_id=${encodeURIComponent(sessionId)}`)
      const data = await response.json()
      if (data.error) {
        setError(data.error)
        setDuplicatePairs([])
      } else {
        const pairs = (data.pairs || []).filter(p => !p.reviewed)
        setDuplicatePairs(pairs)
        setCurrentIndex(0)
      }
      
      await loadStats(sessionId)
      await loadIgnored(sessionId)
    } catch (err) {
      setError('Failed to load duplicates: ' + err.message)
      setDuplicatePairs([])
    } finally {
      setLoading(false)
    }
  }

  const loadIgnored = async (sessionId) => {
    if (!sessionId) return
    
    try {
      const response = await fetch(`/api/scan/duplicates?scan_session_id=${encodeURIComponent(sessionId)}`)
      const data = await response.json()
      if (!data.error) {
        const ignored = (data.pairs || []).filter(p => p.reviewed && p.action === 'ignored')
        setIgnoredPairs(ignored)
      }
    } catch (err) {
      console.error('Failed to load ignored pairs:', err)
    }
  }
  
  const loadStats = async (sessionId) => {
    if (!sessionId) return
    try {
      const response = await fetch(`/api/review/stats?scan_session_id=${encodeURIComponent(sessionId)}`)
      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }
  
  const handleScan = async () => {
    if (!settings.backupPath || !settings.sortedPath) {
      alert('Please configure paths in settings first (press S)')
      setSettingsOpen(true)
      return
    }
    
    setScanning(true)
    setError(null)
    
    try {
      const response = await fetch('/api/scan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backup_path: settings.backupPath,
          sorted_path: settings.sortedPath
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        const sessionId = data.scan_session_id
        setScanSessionId(sessionId)
        localStorage.setItem('lastScanSessionId', sessionId)
        await loadDuplicates(sessionId)
      } else {
        setError(data.error || 'Scan failed')
      }
    } catch (err) {
      setError('Failed to start scan: ' + err.message)
    } finally {
      setScanning(false)
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
      setSelectedImage(null)
      
      if (currentIndex >= newPairs.length && newPairs.length > 0) {
        setCurrentIndex(newPairs.length - 1)
      }
      
      await loadStats(scanSessionId)
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
          recycle_bin_path: settings.recycleBinPath
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to delete duplicate')
      }
      
      const newPairs = duplicatePairs.filter((_, idx) => idx !== currentIndex)
      setDuplicatePairs(newPairs)
      setSelectedImage(null)
      
      if (currentIndex >= newPairs.length && newPairs.length > 0) {
        setCurrentIndex(newPairs.length - 1)
      }
      
      await loadStats(scanSessionId)
    } catch (err) {
      alert('Error deleting duplicate: ' + err.message)
    } finally {
      setActionInProgress(false)
    }
  }

  const handleUndo = async () => {
    if (actionInProgress || !scanSessionId) return
    
    setActionInProgress(true)
    try {
      const response = await fetch('/api/review/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: scanSessionId })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Nothing to undo')
      }
      
      await loadDuplicates(scanSessionId)
    } catch (err) {
      alert('Error undoing: ' + err.message)
    } finally {
      setActionInProgress(false)
    }
  }

  const handleUnignore = async () => {
    if (!currentIgnoredPair || actionInProgress) return
    
    setActionInProgress(true)
    try {
      const response = await fetch('/api/review/unignore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_id: currentIgnoredPair.id,
          session_id: scanSessionId
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to unignore duplicate')
      }
      
      await loadDuplicates(scanSessionId)
      await loadIgnored(scanSessionId)
      setCurrentIndex(0)
      setSelectedImage(null)
    } catch (err) {
      alert('Error unignoring: ' + err.message)
    } finally {
      setActionInProgress(false)
    }
  }

  const currentPair = duplicatePairs[currentIndex]
  const totalPairs = duplicatePairs.length
  const currentIgnoredPair = ignoredPairs[currentIndex]
  const totalIgnored = ignoredPairs.length

  const handlePrevious = useCallback(() => {
    if (selectedImage === null || selectedImage === 'backup') {
      setSelectedImage('backup')
    } else {
      setSelectedImage('kept')
    }
  }, [selectedImage])

  const handleNext = useCallback(() => {
    if (selectedImage === null || selectedImage === 'kept') {
      setSelectedImage('kept')
    } else {
      setSelectedImage('backup')
    }
  }, [selectedImage])

  const cycleTab = useCallback(() => {
    setActiveTab(prev => {
      if (prev === 'duplicates') return 'ignored'
      if (prev === 'ignored') return 'missing'
      return 'duplicates'
    })
    setSelectedImage(null)
    setCurrentIndex(0)
  }, [])
  

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        if (showHelp) {
          setShowHelp(false)
        } else if (settingsOpen) {
          setSettingsOpen(false)
        }
      } else if (e.key === '?') {
        e.preventDefault()
        if (settingsOpen) {
          setSettingsOpen(false)
          setTimeout(() => setShowHelp(true), 300)
        } else {
          setShowHelp(prev => !prev)
        }
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        if (showHelp) {
          setShowHelp(false)
          setTimeout(() => setSettingsOpen(true), 300)
        } else if (!settingsOpen) {
          setSettingsOpen(true)
        }
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault()
        handleScan()
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        cycleTab()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        handleIgnore()
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        handleDelete()
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault()
        if (activeTab === 'ignored') {
          handleUnignore()
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        handleUndo()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handlePrevious, handleNext, cycleTab, handleIgnore, handleDelete, handleUnignore, handleUndo, settingsOpen, showHelp, activeTab])

  const hasSettings = settings.backupPath && settings.sortedPath && settings.recycleBinPath

  if (loading && !duplicatePairs.length) {
    return (
      <>
        <StatsSidebar 
          stats={stats}
          scanSessionId={scanSessionId}
          isScanning={false}
          hasSettings={hasSettings}
        />
        <SettingsSidebar
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSettingsChange={handleSettingsChange}
        />
        <HelpSidebar
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
        />
        <div className="ml-64 flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-spin">
              <svg className="w-16 h-16 mx-auto text-sh-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-lg text-sh-text-secondary">Loading...</p>
          </div>
        </div>
      </>
    )
  }

  if (!hasSettings && !scanning) {
    return (
      <>
        <StatsSidebar 
          stats={stats}
          scanSessionId={scanSessionId}
          isScanning={scanning}
          hasSettings={hasSettings}
        />
        <SettingsSidebar
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSettingsChange={handleSettingsChange}
        />
        <HelpSidebar
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
        />
        <div className="ml-64 flex items-center justify-center min-h-[80vh] px-8">
          <div className="sh-card max-w-3xl w-full p-12 text-center">
            <div className="text-7xl mb-6">👋</div>
            <h1 className="text-4xl font-bold text-sh-text mb-4">Welcome to Image Cleaner</h1>
            <p className="text-sh-text-secondary text-lg mb-8 leading-relaxed">
              Get started by configuring your backup, sorted, and recycle bin paths.
            </p>
            <button
              className="sh-button-primary inline-flex items-center gap-3 text-lg py-4 px-8 mb-8"
              onClick={() => setSettingsOpen(true)}
            >
              Press <kbd className="sh-kbd">S</kbd> to Open Settings
            </button>
            <div className="sh-card bg-sh-bg-tertiary p-6 text-left">
              <h3 className="text-lg font-bold text-sh-text mb-4">How it works:</h3>
              <ol className="text-sh-text-secondary leading-relaxed space-y-2 pl-6 list-decimal">
                <li>Configure your folder paths in settings</li>
                <li>Press <kbd className="sh-kbd text-xs mx-1">K</kbd> to scan for duplicates</li>
                <li>Review and manage duplicates with keyboard shortcuts</li>
                <li>Reach Inbox Zero!</li>
              </ol>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (scanning) {
    return (
      <>
        <StatsSidebar 
          stats={stats}
          scanSessionId={scanSessionId}
          isScanning={scanning}
          hasSettings={hasSettings}
        />
        <SettingsSidebar
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSettingsChange={handleSettingsChange}
        />
        <HelpSidebar
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
        />
        <div className="ml-64 flex items-center justify-center min-h-[80vh] px-8">
          <div className="sh-card max-w-2xl w-full p-12 text-center">
            <div className="text-6xl mb-6 animate-pulse-slow">🔍</div>
            <h2 className="text-3xl font-bold text-sh-text mb-4">Scanning Folders...</h2>
            <p className="text-sh-text-secondary text-lg mb-8">
              Comparing files between backup and sorted directories.
            </p>
            <div className="sh-card bg-sh-info/10 border-sh-info p-4 text-sh-info text-sm">
              This may take a while for large directories
            </div>
          </div>
        </div>
      </>
    )
  }

  // Don't return early - always show tabs when there's a scan session

  return (
    <>
      <StatsSidebar 
        stats={stats}
        scanSessionId={scanSessionId}
        isScanning={scanning}
        hasSettings={hasSettings}
      />
      
      <SettingsSidebar
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSettingsChange={handleSettingsChange}
      />
      
      <HelpSidebar
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
      
      <div className="ml-64 max-w-[1600px] mx-auto px-8 py-6">
        <div className="flex justify-between items-center border-b-2 border-sh-border mb-8">
          <div className="flex">
            <button
              onClick={() => { setActiveTab('duplicates'); setSelectedImage(null); setCurrentIndex(0); }}
              className={`px-6 py-4 border-none bg-transparent text-lg font-semibold transition-all duration-200 ${
                activeTab === 'duplicates' 
                  ? 'text-sh-primary border-b-4 border-sh-primary -mb-0.5' 
                  : 'text-sh-text-muted hover:text-sh-text'
              }`}
            >
              Duplicates {totalPairs > 0 && `(${totalPairs})`}
            </button>
            <button
              onClick={() => { setActiveTab('ignored'); setSelectedImage(null); setCurrentIndex(0); }}
              className={`px-6 py-4 border-none bg-transparent text-lg font-semibold transition-all duration-200 ${
                activeTab === 'ignored' 
                  ? 'text-sh-primary border-b-4 border-sh-primary -mb-0.5' 
                  : 'text-sh-text-muted hover:text-sh-text'
              }`}
            >
              Ignored {totalIgnored > 0 && `(${totalIgnored})`}
            </button>
            <button
              onClick={() => { setActiveTab('missing'); setSelectedImage(null); setCurrentIndex(0); }}
              className={`px-6 py-4 border-none bg-transparent text-lg font-semibold transition-all duration-200 ${
                activeTab === 'missing' 
                  ? 'text-sh-primary border-b-4 border-sh-primary -mb-0.5' 
                  : 'text-sh-text-muted hover:text-sh-text'
              }`}
            >
              Missing
            </button>
          </div>
          <div className="sh-card text-sm text-sh-text-secondary px-4 py-2 mb-2">
            Press <kbd className="sh-kbd text-xs mx-1">C</kbd> to cycle tabs
          </div>
        </div>

      {activeTab === 'duplicates' && (
        <>
          {duplicatePairs.length === 0 ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              {stats && stats.total === 0 ? (
                <div className="sh-card max-w-3xl w-full p-16 text-center border-4 border-sh-success bg-sh-success/5">
                  <div className="text-7xl mb-6">✨</div>
                  <h2 className="text-4xl font-bold text-sh-success mb-4">All Clean!</h2>
                  <p className="text-sh-text-secondary text-xl mb-8 leading-relaxed">
                    No duplicate images found between your backup and sorted folders.
                  </p>
                  <button
                    className="sh-button-primary inline-flex items-center gap-3"
                    onClick={handleScan}
                  >
                    Press <kbd className="sh-kbd">K</kbd> to scan again
                  </button>
                </div>
              ) : (
                <div className="sh-card max-w-3xl w-full p-16 text-center border-4 border-sh-primary bg-sh-primary/5">
                  <div className="text-7xl mb-6">🎉</div>
                  <h2 className="text-4xl font-bold text-sh-primary mb-4">Inbox Zero!</h2>
                  <p className="text-sh-text-secondary text-xl mb-8 leading-relaxed">
                    All duplicates have been reviewed.<br />Great work!
                  </p>
                  {stats && (
                    <div className="flex justify-center gap-12 mb-8 p-8 sh-card bg-sh-bg-tertiary">
                      <div>
                        <div className="text-4xl font-bold text-sh-error mb-2">{stats.deleted}</div>
                        <div className="text-sm text-sh-text-secondary font-semibold uppercase tracking-wide">Deleted</div>
                      </div>
                      <div>
                        <div className="text-4xl font-bold text-sh-warning mb-2">{stats.ignored}</div>
                        <div className="text-sm text-sh-text-secondary font-semibold uppercase tracking-wide">Ignored</div>
                      </div>
                      <div>
                        <div className="text-4xl font-bold text-sh-primary mb-2">{stats.total}</div>
                        <div className="text-sm text-sh-text-secondary font-semibold uppercase tracking-wide">Total Reviewed</div>
                      </div>
                    </div>
                  )}
                  {stats && stats.ignored > 0 && (
                    <p className="text-sh-warning text-sm mb-4">
                      💡 Tip: Check the <strong>Ignored</strong> tab to review or unignore items
                    </p>
                  )}
                  <button
                    className="sh-button-primary inline-flex items-center gap-3"
                    onClick={handleScan}
                  >
                    Press <kbd className="sh-kbd">K</kbd> to scan again
                  </button>
                </div>
              )}
            </div>
          ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-sh-text">Review Duplicates</h3>
            <div className="text-xl font-bold text-sh-primary">
              {currentIndex + 1} / {totalPairs}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className={`sh-card p-6 transition-all duration-200 ${
              selectedImage === 'backup' 
                ? 'border-4 border-sh-primary shadow-sh-glow' 
                : 'border-2 border-sh-border'
            }`}>
              <h4 className="flex items-center justify-between text-lg font-bold text-sh-warning mb-4">
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                    <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  Backup Copy
                </span>
                {selectedImage === 'backup' && (
                  <span className="text-xs text-sh-primary font-bold">← SELECTED</span>
                )}
              </h4>
              <div className="w-full h-96 bg-sh-bg-tertiary flex items-center justify-center rounded-lg mb-4 border-2 border-sh-border overflow-hidden">
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
              <div className="text-sm font-mono text-sh-text-secondary break-all p-3 bg-sh-bg-tertiary rounded-lg border border-sh-border">
                {currentPair?.backup_path || 'N/A'}
              </div>
            </div>

            <div className={`sh-card p-6 transition-all duration-200 ${
              selectedImage === 'kept' 
                ? 'border-4 border-sh-primary shadow-sh-glow' 
                : 'border-2 border-sh-border'
            }`}>
              <h4 className="flex items-center justify-between text-lg font-bold text-sh-info mb-4">
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Kept Copy
                </span>
                {selectedImage === 'kept' && (
                  <span className="text-xs text-sh-primary font-bold">SELECTED →</span>
                )}
              </h4>
              <div className="w-full h-96 bg-sh-bg-tertiary flex items-center justify-center rounded-lg mb-4 border-2 border-sh-border overflow-hidden">
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
              <div className="text-sm font-mono text-sh-text-secondary break-all p-3 bg-sh-bg-tertiary rounded-lg border border-sh-border">
                {currentPair?.sorted_path || 'N/A'}
              </div>
            </div>
          </div>

          <div className="sh-card p-6 flex gap-6 items-center flex-wrap">
            <div className="flex-1 min-w-[300px] sh-card bg-sh-bg-tertiary p-4">
              <div className="font-semibold text-sh-text mb-3 text-sm">Keyboard Shortcuts</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <kbd className="sh-kbd text-xs">←/→</kbd>
                  <span className="text-sh-text-secondary">Cycle images</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="sh-kbd text-xs">E</kbd>
                  <span className="text-sh-text-secondary">Ignore</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="sh-kbd text-xs">D</kbd>
                  <span className="text-sh-text-secondary">Delete</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="sh-kbd text-xs">C</kbd>
                  <span className="text-sh-text-secondary">Switch tabs</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleIgnore}
                disabled={actionInProgress}
                className="sh-button-warning min-w-[120px]"
              >
                Ignore
              </button>
              <button
                onClick={handleDelete}
                disabled={actionInProgress}
                className="sh-button-danger min-w-[120px]"
              >
                Delete
              </button>
              <button
                onClick={handleUndo}
                disabled={actionInProgress}
                className="sh-button-secondary min-w-[120px]"
              >
                Undo
              </button>
            </div>
          </div>

          {stats && (
            <div className="sh-card mt-6 p-6 flex justify-around">
              <div className="text-center">
                <div className="text-3xl font-bold text-sh-primary mb-1">{stats.remaining}</div>
                <div className="text-sm text-sh-text-secondary font-semibold uppercase tracking-wide">Remaining</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-sh-error mb-1">{stats.deleted}</div>
                <div className="text-sm text-sh-text-secondary font-semibold uppercase tracking-wide">Deleted</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-sh-warning mb-1">{stats.ignored}</div>
                <div className="text-sm text-sh-text-secondary font-semibold uppercase tracking-wide">Ignored</div>
              </div>
            </div>
          )}
        </>
          )}
        </>
      )}

      {activeTab === 'ignored' && ignoredPairs.length > 0 && (
        <>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-sh-text">Ignored Duplicates</h3>
            <div className="text-xl font-bold text-sh-warning">
              {currentIndex + 1} / {totalIgnored}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className={`sh-card p-6 transition-all duration-200 ${
              selectedImage === 'backup' 
                ? 'border-4 border-sh-primary shadow-sh-glow' 
                : 'border-2 border-sh-border'
            }`}>
              <h4 className="flex items-center justify-between text-lg font-bold text-sh-warning mb-4">
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                    <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  Backup Copy
                </span>
                {selectedImage === 'backup' && (
                  <span className="text-xs text-sh-primary font-bold">← SELECTED</span>
                )}
              </h4>
              <div className="w-full h-96 bg-sh-bg-tertiary flex items-center justify-center rounded-lg mb-4 border-2 border-sh-border overflow-hidden">
                {currentIgnoredPair?.backup_path ? (
                  <img
                    src={`/api/thumb?path=${encodeURIComponent(currentIgnoredPair.backup_path)}`}
                    alt="Backup"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <span className="text-sh-text-muted">No image</span>
                )}
              </div>
              <div className="text-sm font-mono text-sh-text-secondary break-all p-3 bg-sh-bg-tertiary rounded-lg border border-sh-border">
                {currentIgnoredPair?.backup_path || 'N/A'}
              </div>
            </div>

            <div className={`sh-card p-6 transition-all duration-200 ${
              selectedImage === 'kept' 
                ? 'border-4 border-sh-primary shadow-sh-glow' 
                : 'border-2 border-sh-border'
            }`}>
              <h4 className="flex items-center justify-between text-lg font-bold text-sh-info mb-4">
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Kept Copy
                </span>
                {selectedImage === 'kept' && (
                  <span className="text-xs text-sh-primary font-bold">SELECTED →</span>
                )}
              </h4>
              <div className="w-full h-96 bg-sh-bg-tertiary flex items-center justify-center rounded-lg mb-4 border-2 border-sh-border overflow-hidden">
                {currentIgnoredPair?.sorted_path ? (
                  <img
                    src={`/api/thumb?path=${encodeURIComponent(currentIgnoredPair.sorted_path)}`}
                    alt="Kept"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <span className="text-sh-text-muted">No image</span>
                )}
              </div>
              <div className="text-sm font-mono text-sh-text-secondary break-all p-3 bg-sh-bg-tertiary rounded-lg border border-sh-border">
                {currentIgnoredPair?.sorted_path || 'N/A'}
              </div>
            </div>
          </div>

          <div className="sh-card p-6 flex gap-6 items-center flex-wrap">
            <div className="flex-1 min-w-[300px] sh-card bg-sh-bg-tertiary p-4">
              <div className="font-semibold text-sh-text mb-3 text-sm">Keyboard Shortcuts</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <kbd className="sh-kbd text-xs">←/→</kbd>
                  <span className="text-sh-text-secondary">Cycle images</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="sh-kbd text-xs">U</kbd>
                  <span className="text-sh-text-secondary">Unignore</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="sh-kbd text-xs">C</kbd>
                  <span className="text-sh-text-secondary">Switch tabs</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleUnignore}
                disabled={actionInProgress}
                className="sh-button-primary min-w-[160px]"
              >
                Unignore (U)
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === 'ignored' && ignoredPairs.length === 0 && (
        <div className="py-16 text-center">
          <div className="text-6xl mb-6">✨</div>
          <h3 className="text-2xl font-bold text-sh-text mb-2">No Ignored Items</h3>
          <p className="text-sh-text-secondary">You haven't ignored any duplicates yet.</p>
        </div>
      )}

      {activeTab === 'missing' && (
        <div className="py-16 text-center">
          <div className="text-6xl mb-6">🔜</div>
          <h3 className="text-2xl font-bold text-sh-text mb-2">Missing Photos</h3>
          <p className="text-sh-text-secondary">This feature is coming soon!</p>
        </div>
      )}

        {error && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-4 bg-sh-error/90 text-white rounded-xl shadow-sh-lg z-[1000] backdrop-blur-sm">
            {error}
          </div>
        )}
        
        {!showHelp && duplicatePairs.length > 0 && (
          <button
            onClick={() => setShowHelp(true)}
            className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-sh-primary text-white text-2xl font-bold shadow-sh-glow hover:shadow-sh-xl hover:scale-110 transition-all duration-200 z-[1000] flex items-center justify-center"
            title="Show keyboard shortcuts (?)"
          >
            ?
          </button>
        )}
      </div>
    </>
  )
}

export default InboxScreen
