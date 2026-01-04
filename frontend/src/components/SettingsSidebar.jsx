import { useState, useEffect, useCallback } from 'react'
import PathInput from './PathInput'

function SettingsSidebar({ isOpen, onClose, onSettingsChange }) {
  const [backupPath, setBackupPath] = useState('')
  const [sortedPath, setSortedPath] = useState('')
  const [recycleBinPath, setRecycleBinPath] = useState('')
  const [backupValid, setBackupValid] = useState(false)
  const [sortedValid, setSortedValid] = useState(false)
  const [recycleBinValid, setRecycleBinValid] = useState(false)
  const [pairValidation, setPairValidation] = useState(null)
  const [isValidatingPair, setIsValidatingPair] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    const storedBackupPath = localStorage.getItem('backupPath') || ''
    const storedSortedPath = localStorage.getItem('sortedPath') || ''
    const storedRecycleBinPath = localStorage.getItem('recycleBinPath') || ''
    setBackupPath(storedBackupPath)
    setSortedPath(storedSortedPath)
    setRecycleBinPath(storedRecycleBinPath)
  }, [])

  useEffect(() => {
    if (!backupPath || !sortedPath || !backupValid || !sortedValid) {
      setPairValidation(null)
      return
    }

    const timer = setTimeout(async () => {
      setIsValidatingPair(true)
      try {
        const response = await fetch('/api/paths/validate-pair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            backup_path: backupPath,
            sorted_path: sortedPath
          })
        })
        const data = await response.json()
        setPairValidation(data)
      } catch (err) {
        console.error('Error validating pair:', err)
      } finally {
        setIsValidatingPair(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [backupPath, sortedPath, backupValid, sortedValid])

  const canSave = backupValid && sortedValid && recycleBinValid && 
                  pairValidation?.valid && !isValidatingPair

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }, [onClose])

  const handleSave = useCallback(() => {
    if (!canSave) return
    
    localStorage.setItem('backupPath', backupPath)
    localStorage.setItem('sortedPath', sortedPath)
    localStorage.setItem('recycleBinPath', recycleBinPath)
    
    if (onSettingsChange) {
      onSettingsChange({
        backupPath,
        sortedPath,
        recycleBinPath
      })
    }
    
    handleClose()
  }, [canSave, backupPath, sortedPath, recycleBinPath, onSettingsChange, handleClose])

  const handleClearRecycleBin = () => {
    setRecycleBinPath('')
    localStorage.removeItem('recycleBinPath')
  }

  const handleBackupValidation = (isValid, error) => {
    setBackupValid(isValid)
  }

  const handleSortedValidation = (isValid, error) => {
    setSortedValid(isValid)
  }

  const handleRecycleBinValidation = (isValid, error) => {
    setRecycleBinValid(isValid)
  }

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isOpen || isClosing) return
      
      if (e.key === 'Escape') {
        handleClose()
      } else if ((e.key === 's' || e.key === 'S') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isOpen, isClosing, handleClose, handleSave])

  if (!isOpen && !isClosing) return null

  return (
    <>
      <div 
        onClick={handleClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
          animation: isClosing ? 'fadeOut 0.2s ease-in-out' : 'fadeIn 0.2s ease-in-out'
        }}
      />
      
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '600px',
        backgroundColor: 'white',
        boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        overflowY: 'auto',
        animation: isClosing ? 'slideOutRight 0.3s ease-in-out' : 'slideInRight 0.3s ease-in-out'
      }}>
        <div style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Settings</h2>
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#666',
                padding: '0.25rem 0.5rem'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '1.5rem', 
            borderRadius: '8px',
            marginBottom: '2rem'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Folder Paths</h3>
            
            <PathInput
              label="Backup Path"
              value={backupPath}
              onChange={setBackupPath}
              placeholder="/volume1/PhotosBackup"
              storageKey="backupPath"
              onValidationChange={handleBackupValidation}
            />

            <div style={{ marginTop: '1.5rem' }}>
              <PathInput
                label="Sorted Path"
                value={sortedPath}
                onChange={setSortedPath}
                placeholder="/volume1/PhotosSorted"
                storageKey="sortedPath"
                onValidationChange={handleSortedValidation}
              />
            </div>

            {isValidatingPair && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#e3f2fd',
                borderRadius: '4px',
                fontSize: '0.875rem',
                color: '#1976d2',
                marginTop: '1rem'
              }}>
                Validating paths...
              </div>
            )}

            {pairValidation && !isValidatingPair && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: pairValidation.valid ? '#e8f5e9' : '#ffebee',
                borderRadius: '4px',
                fontSize: '0.875rem',
                marginTop: '1rem'
              }}>
                {pairValidation.errors && pairValidation.errors.length > 0 && (
                  <div style={{ color: '#c62828', marginBottom: '0.5rem' }}>
                    <strong>Errors:</strong>
                    <ul style={{ margin: '0.25rem 0', paddingLeft: '1.5rem' }}>
                      {pairValidation.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {pairValidation.warnings && pairValidation.warnings.length > 0 && (
                  <div style={{ color: '#f57c00', marginBottom: '0.5rem' }}>
                    <strong>Warnings:</strong>
                    <ul style={{ margin: '0.25rem 0', paddingLeft: '1.5rem' }}>
                      {pairValidation.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {pairValidation.valid && pairValidation.errors.length === 0 && (
                  <div style={{ color: '#2e7d32' }}>
                    ✓ Both paths are valid and accessible
                  </div>
                )}
              </div>
            )}

            <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '1rem', marginBottom: 0 }}>
              These paths will be scanned recursively for duplicate image files.
            </p>
          </div>

          <div style={{
            marginBottom: '2rem',
            padding: '1.5rem',
            backgroundColor: '#f0f7ff',
            borderRadius: '8px',
            border: '1px solid #0066cc'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#0066cc' }}>Recycle Bin</h3>
              {recycleBinPath && (
                <button
                  onClick={handleClearRecycleBin}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    backgroundColor: '#ffa726',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem' }}>
              Deleted files will be moved here (not permanently deleted).
            </p>
            <PathInput
              label="Recycle Bin Path"
              value={recycleBinPath}
              onChange={setRecycleBinPath}
              placeholder="/home/Photos/Recycling Bin"
              storageKey="recycleBinPath"
              onValidationChange={handleRecycleBinValidation}
            />
          </div>

          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#f0f7ff', 
            borderRadius: '8px',
            marginBottom: '2rem',
            border: '1px solid #0066cc'
          }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#0066cc', lineHeight: '1.6' }}>
              💡 <strong>Tip:</strong> Press <kbd style={{ padding: '0.125rem 0.375rem', backgroundColor: '#fff', borderRadius: '3px', border: '1px solid #ccc' }}>?</kbd> to see all keyboard shortcuts
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleSave}
              disabled={!canSave}
              style={{
                flex: 1,
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                backgroundColor: canSave ? '#0066cc' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: canSave ? 'pointer' : 'not-allowed',
                fontWeight: '600'
              }}
            >
              Save Settings
            </button>
            <button
              onClick={handleClose}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Cancel
            </button>
          </div>

          {!canSave && (
            <p style={{ color: '#d32f2f', marginTop: '1rem', fontSize: '0.875rem' }}>
              Please enter and validate all paths to save.
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); }
          to { transform: translateX(100%); }
        }
      `}</style>
    </>
  )
}

export default SettingsSidebar

