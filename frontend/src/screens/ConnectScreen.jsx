import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PathInput from '../components/PathInput'

function ConnectScreen() {
  const [configStatus, setConfigStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [backupPath, setBackupPath] = useState('')
  const [sortedPath, setSortedPath] = useState('')
  const [recycleBinPath, setRecycleBinPath] = useState('')
  const [backupValid, setBackupValid] = useState(false)
  const [sortedValid, setSortedValid] = useState(false)
  const [recycleBinValid, setRecycleBinValid] = useState(false)
  const [backupError, setBackupError] = useState(null)
  const [sortedError, setSortedError] = useState(null)
  const [pairValidation, setPairValidation] = useState(null)
  const [isValidatingPair, setIsValidatingPair] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => {
        setConfigStatus(data.config)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  // Validate both paths together when they change
  useEffect(() => {
    if (!backupPath || !sortedPath || !backupValid || !sortedValid) {
      setPairValidation(null)
      return
    }

    // Debounce pair validation
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

  const handleBackupValidation = (isValid, error) => {
    setBackupValid(isValid)
    setBackupError(error)
  }

  const handleSortedValidation = (isValid, error) => {
    setSortedValid(isValid)
    setSortedError(error)
  }

  const handleRecycleBinValidation = (isValid, error) => {
    setRecycleBinValid(isValid)
  }

  const handleClearRecycleBin = () => {
    setRecycleBinPath('')
    localStorage.removeItem('recycleBinPath')
  }

  // Add keyboard shortcut for R to clear recycle bin
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'r' || e.key === 'R') {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          handleClearRecycleBin()
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  const handleContinue = () => {
    if (!canContinue) return
    
    // Save recycle bin path to localStorage
    localStorage.setItem('recycleBinPath', recycleBinPath)
    
    navigate('/scan', {
      state: {
        backupPath: pairValidation.backup_path || backupPath,
        sortedPath: pairValidation.sorted_path || sortedPath,
        recycleBinPath: recycleBinPath
      }
    })
  }

  const canContinue = backupValid && sortedValid && recycleBinValid && 
                      pairValidation?.valid && !isValidatingPair

  if (loading) {
    return <div style={{ maxWidth: '800px', margin: '0 auto' }}>Loading...</div>
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2>Configure Paths</h2>
      
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '1.5rem', 
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h3 style={{ marginTop: 0 }}>Folder Paths</h3>
        
        <PathInput
          label="Backup Path"
          value={backupPath}
          onChange={setBackupPath}
          placeholder="/volume1/PhotosBackup"
          storageKey="backupPath"
          onValidationChange={handleBackupValidation}
        />

        <PathInput
          label="Sorted Path"
          value={sortedPath}
          onChange={setSortedPath}
          placeholder="/volume1/PhotosSorted"
          storageKey="sortedPath"
          onValidationChange={handleSortedValidation}
        />

        {isValidatingPair && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#e3f2fd',
            borderRadius: '4px',
            fontSize: '0.875rem',
            color: '#1976d2',
            marginBottom: '1rem'
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
            marginBottom: '1rem'
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

        <p style={{ fontSize: '0.875rem', color: '#666', margin: 0 }}>
          These paths will be scanned recursively for duplicate image files. 
          Files with matching filenames (case-insensitive) will be identified as duplicates.
          {pairValidation?.warnings?.some(w => w.includes('subfolder')) && (
            <span style={{ display: 'block', marginTop: '0.5rem', color: '#f57c00' }}>
              Note: If backup path is a subfolder of sorted path, it will be automatically excluded from the search.
            </span>
          )}
        </p>
      </div>

      <div style={{
        marginTop: '2rem',
        marginBottom: '2rem',
        padding: '1.5rem',
        backgroundColor: '#f0f7ff',
        borderRadius: '8px',
        border: '1px solid #0066cc'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: '#0066cc' }}>Recycle Bin Configuration</h3>
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
              Clear (R)
            </button>
          )}
        </div>
        <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem' }}>
          Deleted files will be moved here (not permanently deleted). Press <strong>R</strong> to clear and re-select.
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

      <button
        onClick={handleContinue}
        disabled={!canContinue}
        style={{
          padding: '0.75rem 2rem',
          fontSize: '1rem',
          backgroundColor: canContinue ? '#0066cc' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: canContinue ? 'pointer' : 'not-allowed',
          fontWeight: '600'
        }}
      >
        Continue to Scan
      </button>

      {!canContinue && (
        <p style={{ color: '#d32f2f', marginTop: '1rem' }}>
          Please enter and validate all paths (Backup, Sorted, and Recycle Bin) to continue.
        </p>
      )}
    </div>
  )
}

function ConfigItem({ label, configured }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ 
        width: '12px', 
        height: '12px', 
        borderRadius: '50%',
        backgroundColor: configured ? '#4caf50' : '#f44336',
        display: 'inline-block'
      }} />
      <span>{label}: {configured ? 'Configured' : 'Not configured'}</span>
    </div>
  )
}

export default ConnectScreen
