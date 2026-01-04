import { useState, useEffect, useCallback } from 'react'
import SettingsSidebar from '../components/SettingsSidebar'
import HelpSidebar from '../components/HelpSidebar'
import StatsSidebar from '../components/StatsSidebar'

function InboxScreen() {
  const [activeTab, setActiveTab] = useState('duplicates')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [duplicatePairs, setDuplicatePairs] = useState([])
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
    } catch (err) {
      setError('Failed to load duplicates: ' + err.message)
      setDuplicatePairs([])
    } finally {
      setLoading(false)
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

  const currentPair = duplicatePairs[currentIndex]
  const totalPairs = duplicatePairs.length

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
    setActiveTab(prev => prev === 'duplicates' ? 'missing' : 'duplicates')
    setSelectedImage(null)
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
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        handleUndo()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handlePrevious, handleNext, cycleTab, handleIgnore, handleDelete, handleUndo, settingsOpen, showHelp])

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
        <div style={{ marginLeft: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '3rem', 
              marginBottom: '1rem',
              animation: 'spin 2s linear infinite'
            }}>⏳</div>
            <p style={{ fontSize: '1.125rem', color: '#666' }}>Loading...</p>
          </div>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
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
        <div style={{ marginLeft: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          <div style={{ 
            textAlign: 'center', 
            maxWidth: '700px', 
            padding: '3rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            border: '2px solid #e0e0e0'
          }}>
            <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>👋</div>
            <h1 style={{ marginBottom: '1rem', fontSize: '2rem', color: '#333' }}>Welcome to Image Cleaner</h1>
            <p style={{ color: '#666', marginBottom: '2rem', fontSize: '1.125rem', lineHeight: '1.6' }}>
              Get started by configuring your backup, sorted, and recycle bin paths.
            </p>
            <div style={{
              display: 'inline-block',
              padding: '1.5rem 2rem',
              backgroundColor: '#0066cc',
              color: 'white',
              borderRadius: '8px',
              marginBottom: '2rem',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1.125rem'
            }}
            onClick={() => setSettingsOpen(true)}
            >
              Press <kbd style={{ padding: '0.375rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px', fontFamily: 'monospace', marginLeft: '0.5rem', marginRight: '0.5rem' }}>S</kbd> to Open Settings
            </div>
            <div style={{
              marginTop: '2rem',
              padding: '1.5rem',
              backgroundColor: '#fff',
              borderRadius: '8px',
              textAlign: 'left'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>How it works:</h3>
              <ol style={{ color: '#666', lineHeight: '1.8', paddingLeft: '1.5rem', margin: 0 }}>
                <li>Configure your folder paths in settings</li>
                <li>Press <kbd style={{ padding: '0.125rem 0.375rem', backgroundColor: '#f0f0f0', borderRadius: '3px', border: '1px solid #ccc' }}>K</kbd> to scan for duplicates</li>
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
        <div style={{ marginLeft: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          <div style={{ 
            textAlign: 'center', 
            maxWidth: '600px', 
            padding: '3rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            border: '2px solid #e0e0e0'
          }}>
            <div style={{ 
              fontSize: '4rem', 
              marginBottom: '1rem',
              animation: 'pulse 2s ease-in-out infinite'
            }}>🔍</div>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.75rem', color: '#333' }}>Scanning Folders...</h2>
            <p style={{ color: '#666', fontSize: '1.125rem', marginBottom: '2rem' }}>
              Comparing files between backup and sorted directories.
            </p>
            <div style={{
              padding: '1rem',
              backgroundColor: '#e3f2fd',
              borderRadius: '6px',
              color: '#0066cc',
              fontSize: '0.875rem'
            }}>
              This may take a while for large directories
            </div>
          </div>
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.05); }
          }
        `}</style>
      </>
    )
  }

  if (duplicatePairs.length === 0 && scanSessionId) {
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
        <div style={{ marginLeft: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          {stats && stats.total === 0 ? (
            <div style={{ textAlign: 'center', maxWidth: '700px', padding: '4rem', backgroundColor: '#e8f5e9', borderRadius: '16px', border: '3px solid #4caf50' }}>
              <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>✨</div>
              <h2 style={{ color: '#2e7d32', fontSize: '2.5rem', marginBottom: '1rem', fontWeight: '700' }}>All Clean!</h2>
              <p style={{ color: '#666', fontSize: '1.25rem', marginBottom: '2.5rem', lineHeight: '1.6' }}>
                No duplicate images found between your backup and sorted folders.
              </p>
              <div style={{
                padding: '1rem 2rem',
                backgroundColor: 'rgba(46, 125, 50, 0.1)',
                borderRadius: '8px',
                display: 'inline-block'
              }}>
                <p style={{ color: '#2e7d32', fontSize: '1rem', margin: 0, fontWeight: '600' }}>
                  Press <kbd style={{ padding: '0.375rem 0.75rem', backgroundColor: '#fff', borderRadius: '4px', fontFamily: 'monospace', border: '2px solid #4caf50', marginLeft: '0.5rem', marginRight: '0.5rem' }}>K</kbd> to scan again
                </p>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', maxWidth: '700px', padding: '4rem', backgroundColor: '#f0f7ff', borderRadius: '16px', border: '3px solid #0066cc' }}>
              <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>🎉</div>
              <h2 style={{ color: '#0066cc', fontSize: '2.5rem', marginBottom: '1rem', fontWeight: '700' }}>Inbox Zero!</h2>
              <p style={{ color: '#666', fontSize: '1.25rem', marginBottom: '2.5rem', lineHeight: '1.6' }}>
                All duplicates have been reviewed.<br />Great work!
              </p>
            {stats && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '3rem', 
                marginBottom: '2.5rem',
                padding: '2rem',
                backgroundColor: 'rgba(255,255,255,0.7)',
                borderRadius: '8px'
              }}>
                <div>
                  <div style={{ fontWeight: '700', color: '#d32f2f', fontSize: '2rem' }}>{stats.deleted}</div>
                  <div style={{ color: '#666', fontSize: '0.875rem', fontWeight: '600' }}>Deleted</div>
                </div>
                <div>
                  <div style={{ fontWeight: '700', color: '#ffa726', fontSize: '2rem' }}>{stats.ignored}</div>
                  <div style={{ color: '#666', fontSize: '0.875rem', fontWeight: '600' }}>Ignored</div>
                </div>
                <div>
                  <div style={{ fontWeight: '700', color: '#0066cc', fontSize: '2rem' }}>{stats.total}</div>
                  <div style={{ color: '#666', fontSize: '0.875rem', fontWeight: '600' }}>Total Reviewed</div>
                </div>
              </div>
            )}
              <div style={{
                padding: '1rem 2rem',
                backgroundColor: 'rgba(0, 102, 204, 0.1)',
                borderRadius: '8px',
                display: 'inline-block'
              }}>
                <p style={{ color: '#0066cc', fontSize: '1rem', margin: 0, fontWeight: '600' }}>
                  Press <kbd style={{ padding: '0.375rem 0.75rem', backgroundColor: '#fff', borderRadius: '4px', fontFamily: 'monospace', border: '2px solid #0066cc', marginLeft: '0.5rem', marginRight: '0.5rem' }}>K</kbd> to scan again
                </p>
              </div>
            </div>
          )}
        </div>
      </>
    )
  }

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
      
      <div style={{ marginLeft: '250px', maxWidth: '1400px', margin: '0 auto 0 250px', padding: '0 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e0e0e0', marginBottom: '2rem' }}>
          <div style={{ display: 'flex' }}>
            <button
              onClick={() => { setActiveTab('duplicates'); setSelectedImage(null); }}
              style={{
                padding: '1rem 2rem',
                border: 'none',
                borderBottom: activeTab === 'duplicates' ? '3px solid #0066cc' : 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '1.125rem',
                fontWeight: activeTab === 'duplicates' ? '600' : '400',
                color: activeTab === 'duplicates' ? '#0066cc' : '#666',
                marginBottom: '-2px'
              }}
            >
              Duplicates {totalPairs > 0 && `(${totalPairs})`}
            </button>
            <button
              onClick={() => { setActiveTab('missing'); setSelectedImage(null); }}
              style={{
                padding: '1rem 2rem',
                border: 'none',
                borderBottom: activeTab === 'missing' ? '3px solid #0066cc' : 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '1.125rem',
                fontWeight: activeTab === 'missing' ? '600' : '400',
                color: activeTab === 'missing' ? '#0066cc' : '#666',
                marginBottom: '-2px'
              }}
            >
              Missing
            </button>
          </div>
          <div style={{ 
            fontSize: '0.875rem', 
            color: '#666',
            padding: '0.5rem 1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            marginBottom: '0.5rem'
          }}>
            Press <kbd style={{ padding: '0.125rem 0.375rem', backgroundColor: '#fff', borderRadius: '3px', border: '1px solid #ccc', fontFamily: 'monospace' }}>C</kbd> to cycle tabs
          </div>
        </div>

      {activeTab === 'duplicates' && duplicatePairs.length > 0 && (
        <>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#333' }}>Review Duplicates</h3>
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
              border: `3px solid ${selectedImage === 'backup' ? '#0066cc' : '#e0e0e0'}`,
              borderRadius: '8px',
              padding: '1.5rem',
              backgroundColor: '#fff3cd',
              boxShadow: selectedImage === 'backup' ? '0 4px 12px rgba(0, 102, 204, 0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}>
              <h4 style={{ 
                marginTop: 0, 
                marginBottom: '1rem', 
                color: '#856404',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>Backup Copy</span>
                {selectedImage === 'backup' && (
                  <span style={{ fontSize: '0.75rem', color: '#0066cc', fontWeight: '600' }}>← SELECTED</span>
                )}
              </h4>
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
                    alt="Backup"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <span style={{ color: '#999' }}>No image</span>
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
              border: `3px solid ${selectedImage === 'kept' ? '#0066cc' : '#e0e0e0'}`,
              borderRadius: '8px',
              padding: '1.5rem',
              backgroundColor: '#d1ecf1',
              boxShadow: selectedImage === 'kept' ? '0 4px 12px rgba(0, 102, 204, 0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}>
              <h4 style={{ 
                marginTop: 0, 
                marginBottom: '1rem', 
                color: '#0c5460',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>Kept Copy</span>
                {selectedImage === 'kept' && (
                  <span style={{ fontSize: '0.75rem', color: '#0066cc', fontWeight: '600' }}>SELECTED →</span>
                )}
              </h4>
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
                    alt="Kept"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <span style={{ color: '#999' }}>No image</span>
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
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{
              flex: '1',
              minWidth: '250px',
              padding: '1rem',
              backgroundColor: '#fff',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#666',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#333' }}>Keyboard Shortcuts</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div><kbd style={{ padding: '0.125rem 0.375rem', backgroundColor: '#f0f0f0', borderRadius: '3px', border: '1px solid #ccc' }}>←/→</kbd> Cycle images</div>
                <div><kbd style={{ padding: '0.125rem 0.375rem', backgroundColor: '#f0f0f0', borderRadius: '3px', border: '1px solid #ccc' }}>E</kbd> Ignore</div>
                <div><kbd style={{ padding: '0.125rem 0.375rem', backgroundColor: '#f0f0f0', borderRadius: '3px', border: '1px solid #ccc' }}>D</kbd> Delete</div>
                <div><kbd style={{ padding: '0.125rem 0.375rem', backgroundColor: '#f0f0f0', borderRadius: '3px', border: '1px solid #ccc' }}>C</kbd> Switch tabs</div>
                <div><kbd style={{ padding: '0.125rem 0.375rem', backgroundColor: '#f0f0f0', borderRadius: '3px', border: '1px solid #ccc' }}>S</kbd> Settings</div>
                <div><kbd style={{ padding: '0.125rem 0.375rem', backgroundColor: '#f0f0f0', borderRadius: '3px', border: '1px solid #ccc' }}>K</kbd> Scan</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button
                onClick={handleIgnore}
                disabled={actionInProgress}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  backgroundColor: actionInProgress ? '#ccc' : '#ffa726',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: actionInProgress ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  minWidth: '120px'
                }}
              >
                Ignore
              </button>
              <button
                onClick={handleDelete}
                disabled={actionInProgress}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  backgroundColor: actionInProgress ? '#ccc' : '#d32f2f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: actionInProgress ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  minWidth: '120px'
                }}
              >
                Delete
              </button>
              <button
                onClick={handleUndo}
                disabled={actionInProgress}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  backgroundColor: actionInProgress ? '#ccc' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: actionInProgress ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  minWidth: '120px'
                }}
              >
                Undo
              </button>
            </div>
          </div>

          {stats && (
            <div style={{
              marginTop: '2rem',
              padding: '1rem',
              backgroundColor: '#f0f7ff',
              borderRadius: '8px',
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
            </div>
          )}
        </>
      )}

      {activeTab === 'missing' && (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔜</div>
          <h3 style={{ marginBottom: '0.5rem' }}>Missing Photos</h3>
          <p>This feature is coming soon!</p>
        </div>
      )}

        {error && (
          <div style={{
            position: 'fixed',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '1rem 2rem',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            zIndex: 1000
          }}>
            {error}
          </div>
        )}
        
        {!showHelp && duplicatePairs.length > 0 && (
          <button
            onClick={() => setShowHelp(true)}
            style={{
              position: 'fixed',
              bottom: '2rem',
              right: '2rem',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 102, 204, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              zIndex: 1000
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.1)'
              e.target.style.boxShadow = '0 6px 16px rgba(0, 102, 204, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)'
              e.target.style.boxShadow = '0 4px 12px rgba(0, 102, 204, 0.4)'
            }}
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

