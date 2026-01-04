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
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
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
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-sh-text mb-4">Configure Paths</h1>
        <p className="text-sh-text-secondary text-lg">
          Set up your folder paths to get started with duplicate detection
        </p>
      </div>
      
      <div className="sh-card p-8 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <svg className="w-6 h-6 text-sh-primary" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <h2 className="text-2xl font-bold text-sh-text">Folder Paths</h2>
        </div>
        
        <div className="space-y-6">
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
        </div>

        {isValidatingPair && (
          <div className="p-4 bg-sh-info/10 border border-sh-info rounded-lg text-sm text-sh-info mt-6 flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Validating paths...
          </div>
        )}

        {pairValidation && !isValidatingPair && (
          <div className={`p-4 rounded-lg text-sm mt-6 ${
            pairValidation.valid 
              ? 'bg-sh-success/10 border border-sh-success' 
              : 'bg-sh-error/10 border border-sh-error'
          }`}>
            {pairValidation.errors && pairValidation.errors.length > 0 && (
              <div className="text-sh-error mb-3">
                <div className="font-bold mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Errors:
                </div>
                <ul className="space-y-1 pl-6 list-disc">
                  {pairValidation.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            {pairValidation.warnings && pairValidation.warnings.length > 0 && (
              <div className="text-sh-warning mb-3">
                <div className="font-bold mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Warnings:
                </div>
                <ul className="space-y-1 pl-6 list-disc">
                  {pairValidation.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            {pairValidation.valid && pairValidation.errors.length === 0 && (
              <div className="text-sh-success flex items-center gap-2 font-medium">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Both paths are valid and accessible
              </div>
            )}
          </div>
        )}

        <p className="text-sm text-sh-text-secondary mt-6 leading-relaxed">
          These paths will be scanned recursively for duplicate image files. 
          Files with matching filenames (case-insensitive) will be identified as duplicates.
        </p>
      </div>

      <div className="sh-card p-8 mb-8 border-l-4 border-sh-accent">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-sh-accent" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h2 className="text-2xl font-bold text-sh-text">Recycle Bin</h2>
          </div>
          {recycleBinPath && (
            <button
              onClick={handleClearRecycleBin}
              className="sh-button-warning text-sm py-2 px-4"
            >
              Clear (R)
            </button>
          )}
        </div>
        <p className="text-sm text-sh-text-secondary mb-6 leading-relaxed">
          Deleted files will be moved here (not permanently deleted). Press <kbd className="sh-kbd mx-1">R</kbd> to clear and re-select.
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

      <div className="flex items-center justify-between">
        <div className="sh-card px-4 py-3 bg-sh-primary/5 border-sh-primary/30">
          <p className="text-sm text-sh-text-secondary">
            Press <kbd className="sh-kbd mx-1">?</kbd> anytime for keyboard shortcuts
          </p>
        </div>
        
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="sh-button-primary text-lg py-4 px-8"
        >
          Continue to Scan →
        </button>
      </div>

      {!canContinue && (backupPath || sortedPath || recycleBinPath) && (
        <p className="text-sh-error text-center mt-6 text-sm">
          Please enter and validate all paths (Backup, Sorted, and Recycle Bin) to continue.
        </p>
      )}
    </div>
  )
}

export default ConnectScreen
