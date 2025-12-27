import { useState, useEffect, useRef } from 'react'

function ReviewScreen() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [reviewed, setReviewed] = useState(new Set())
  const containerRef = useRef(null)

  const placeholderGroups = [
    {
      id: '1',
      backupPath: '/volume1/PhotosBackup/2024/01/IMG_001.jpg',
      keptPath: '/volume1/PhotosSorted/2024/01/IMG_001.jpg',
    },
    {
      id: '2',
      backupPath: '/volume1/PhotosBackup/2024/02/IMG_002.jpg',
      keptPath: '/volume1/PhotosSorted/2024/02/IMG_002.jpg',
    },
    {
      id: '3',
      backupPath: '/volume1/PhotosBackup/2024/03/IMG_003.jpg',
      keptPath: '/volume1/PhotosSorted/2024/03/IMG_003.jpg',
    },
  ]

  const currentGroup = placeholderGroups[currentIndex]
  const totalGroups = placeholderGroups.length

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }

      if (e.key === 'Enter') {
        handleSkip()
      } else if (e.key === 'd' || e.key === 'D') {
        handleDelete()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentIndex, reviewed])

  const handleSkip = () => {
    setReviewed(new Set([...reviewed, currentGroup.id]))
    if (currentIndex < totalGroups - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleDelete = () => {
    console.log('Delete action (placeholder) - would delete:', currentGroup.backupPath)
    setReviewed(new Set([...reviewed, currentGroup.id]))
    if (currentIndex < totalGroups - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < totalGroups - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  return (
    <div ref={containerRef} style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h2 style={{ margin: 0 }}>Review Duplicates</h2>
        <div style={{ 
          fontSize: '1.125rem', 
          fontWeight: '600',
          color: '#666'
        }}>
          {currentIndex + 1} / {totalGroups}
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
          <h3 style={{ marginTop: 0, color: '#856404' }}>Backup Copy</h3>
          <div style={{
            width: '100%',
            height: '400px',
            backgroundColor: '#f8f9fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            marginBottom: '1rem',
            border: '1px solid #e0e0e0'
          }}>
            <span style={{ color: '#999' }}>Image Preview Placeholder</span>
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
            {currentGroup.backupPath}
          </div>
        </div>

        <div style={{
          border: '2px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1.5rem',
          backgroundColor: '#d1ecf1'
        }}>
          <h3 style={{ marginTop: 0, color: '#0c5460' }}>Kept Copy</h3>
          <div style={{
            width: '100%',
            height: '400px',
            backgroundColor: '#f8f9fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            marginBottom: '1rem',
            border: '1px solid #e0e0e0'
          }}>
            <span style={{ color: '#999' }}>Image Preview Placeholder</span>
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
            {currentGroup.keptPath}
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
          ← Previous
        </button>
        <button
          onClick={handleSkip}
          style={{
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Skip (ENTER)
        </button>
        <button
          onClick={handleDelete}
          style={{
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Delete (D)
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex >= totalGroups - 1}
          style={{
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            backgroundColor: currentIndex >= totalGroups - 1 ? '#ccc' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: currentIndex >= totalGroups - 1 ? 'not-allowed' : 'pointer',
            fontWeight: '600'
          }}
        >
          Next →
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
          <li><strong>ENTER</strong> - Skip (mark as reviewed, advance to next)</li>
          <li><strong>D</strong> - Delete backup copy (placeholder - no action in Stage 2)</li>
        </ul>
      </div>
    </div>
  )
}

export default ReviewScreen

