import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function ReviewScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('duplicated')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [duplicateGroups, setDuplicateGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)
  const [backupThumbnails, setBackupThumbnails] = useState({})
  const [sortedThumbnails, setSortedThumbnails] = useState({})
  const containerRef = useRef(null)

  useEffect(() => {
    const reportPath = new URLSearchParams(location.search).get('report')
    if (!reportPath) {
      navigate('/reports')
      return
    }

    setSelectedReport({ path: reportPath })
    importReport(reportPath)
  }, [location.search, navigate])

  const importReport = async (reportPath) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/reports/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_path: reportPath })
      })
      const data = await response.json()
      if (data.success) {
        setDuplicateGroups(data.groups || [])
      } else {
        setError(data.error || 'Failed to import report')
      }
    } catch (err) {
      setError('Failed to import report: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (duplicateGroups.length > 0 && currentIndex < duplicateGroups.length) {
      const group = duplicateGroups[currentIndex]
      loadThumbnail(group.backup_path, 'backup')
      loadThumbnail(group.sorted_path, 'sorted')
    }
  }, [duplicateGroups, currentIndex])

  const loadThumbnail = async (path, type) => {
    if (!path) return
    
    const key = `${currentIndex}-${type}`
    if (type === 'backup' && backupThumbnails[key]) return
    if (type === 'sorted' && sortedThumbnails[key]) return

    try {
      const response = await fetch(`/api/thumb?path=${encodeURIComponent(path)}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        if (type === 'backup') {
          setBackupThumbnails(prev => ({ ...prev, [key]: url }))
        } else {
          setSortedThumbnails(prev => ({ ...prev, [key]: url }))
        }
      }
    } catch (err) {
      console.error(`Error loading thumbnail for ${path}:`, err)
    }
  }

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }

      if (e.key === 'ArrowLeft') {
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentIndex, duplicateGroups.length])

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < duplicateGroups.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const currentGroup = duplicateGroups[currentIndex]
  const backupThumb = backupThumbnails[`${currentIndex}-backup`]
  const sortedThumb = sortedThumbnails[`${currentIndex}-sorted`]

  if (loading) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h2>Review Duplicates</h2>
        <p>Loading report...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h2>Review Duplicates</h2>
        <div style={{
          padding: '1rem',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          Error: {error}
        </div>
        <button onClick={() => navigate('/reports')}>
          Back to Reports
        </button>
      </div>
    )
  }

  if (duplicateGroups.length === 0) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h2>Review Duplicates</h2>
        <p>No duplicate groups found in this report.</p>
        <button onClick={() => navigate('/reports')}>
          Back to Reports
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {selectedReport && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
            Report: {selectedReport.path.split('/').pop()}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#666', fontFamily: 'monospace' }}>
            {selectedReport.path}
          </div>
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <button
          onClick={() => setActiveTab('duplicated')}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: activeTab === 'duplicated' ? '#0066cc' : 'transparent',
            color: activeTab === 'duplicated' ? 'white' : '#666',
            border: 'none',
            borderBottom: activeTab === 'duplicated' ? '3px solid #0066cc' : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: '600',
            marginBottom: '-2px'
          }}
        >
          Duplicated ({duplicateGroups.length})
        </button>
        <button
          onClick={() => setActiveTab('missing')}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: activeTab === 'missing' ? '#0066cc' : 'transparent',
            color: activeTab === 'missing' ? 'white' : '#666',
            border: 'none',
            borderBottom: activeTab === 'missing' ? '3px solid #0066cc' : '3px solid transparent',
            cursor: 'pointer',
            fontWeight: '600',
            marginBottom: '-2px'
          }}
        >
          Missing (Coming Soon)
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
            <h3 style={{ margin: 0 }}>Duplicate Images</h3>
            <div style={{ 
              fontSize: '1.125rem', 
              fontWeight: '600',
              color: '#666'
            }}>
              {currentIndex + 1} / {duplicateGroups.length}
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
                minHeight: '400px',
                backgroundColor: '#f8f9fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                marginBottom: '1rem',
                border: '1px solid #e0e0e0',
                overflow: 'hidden'
              }}>
                {backupThumb ? (
                  <img 
                    src={backupThumb} 
                    alt="Backup" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '400px',
                      objectFit: 'contain'
                    }} 
                  />
                ) : (
                  <span style={{ color: '#999' }}>Loading thumbnail...</span>
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
                {currentGroup?.backup_path || 'N/A'}
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
                minHeight: '400px',
                backgroundColor: '#f8f9fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                marginBottom: '1rem',
                border: '1px solid #e0e0e0',
                overflow: 'hidden'
              }}>
                {sortedThumb ? (
                  <img 
                    src={sortedThumb} 
                    alt="Kept" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '400px',
                      objectFit: 'contain'
                    }} 
                  />
                ) : (
                  <span style={{ color: '#999' }}>Loading thumbnail...</span>
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
                {currentGroup?.sorted_path || 'N/A'}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            padding: '1.5rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
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
              ← Previous (←)
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex >= duplicateGroups.length - 1}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                backgroundColor: currentIndex >= duplicateGroups.length - 1 ? '#ccc' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentIndex >= duplicateGroups.length - 1 ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              Next (→) →
            </button>
          </div>

          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: '#e9ecef',
            borderRadius: '4px',
            fontSize: '0.875rem'
          }}>
            <strong>Navigation:</strong>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
              <li><strong>←</strong> / <strong>→</strong> - Navigate between duplicates</li>
              <li>Delete functionality will be enabled in the next step</li>
            </ul>
          </div>
        </>
      )}

      {activeTab === 'missing' && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          Missing photos review coming soon...
        </div>
      )}
    </div>
  )
}

export default ReviewScreen
