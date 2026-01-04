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
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
      />
      
      <div className={`fixed top-0 right-0 bottom-0 w-[600px] bg-sh-bg-secondary border-l-2 border-sh-border shadow-sh-xl z-[1000] overflow-y-auto ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-sh-text">Settings</h2>
            <button
              onClick={handleClose}
              className="bg-transparent border-none text-2xl cursor-pointer text-sh-text-secondary hover:text-sh-text transition-colors p-2 rounded-lg hover:bg-sh-surface"
            >
              ✕
            </button>
          </div>

          <div className="sh-card p-6 mb-6">
            <h3 className="text-lg font-bold text-sh-text mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-sh-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              Folder Paths
            </h3>
            
            <PathInput
              label="Backup Path"
              value={backupPath}
              onChange={setBackupPath}
              placeholder="/volume1/PhotosBackup"
              storageKey="backupPath"
              onValidationChange={handleBackupValidation}
            />

            <div className="mt-6">
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
              <div className="p-3 bg-sh-info/10 border border-sh-info rounded-lg text-sm text-sh-info mt-4">
                Validating paths...
              </div>
            )}

            {pairValidation && !isValidatingPair && (
              <div className={`p-3 rounded-lg text-sm mt-4 ${
                pairValidation.valid 
                  ? 'bg-sh-success/10 border border-sh-success' 
                  : 'bg-sh-error/10 border border-sh-error'
              }`}>
                {pairValidation.errors && pairValidation.errors.length > 0 && (
                  <div className="text-sh-error mb-2">
                    <strong>Errors:</strong>
                    <ul className="mt-1 pl-6 list-disc">
                      {pairValidation.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {pairValidation.warnings && pairValidation.warnings.length > 0 && (
                  <div className="text-sh-warning mb-2">
                    <strong>Warnings:</strong>
                    <ul className="mt-1 pl-6 list-disc">
                      {pairValidation.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {pairValidation.valid && pairValidation.errors.length === 0 && (
                  <div className="text-sh-success flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Both paths are valid and accessible
                  </div>
                )}
              </div>
            )}

            <p className="text-sm text-sh-text-secondary mt-4 leading-relaxed">
              These paths will be scanned recursively for duplicate image files.
            </p>
          </div>

          <div className="sh-card p-6 mb-6 border-l-4 border-sh-accent">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-sh-text flex items-center gap-2">
                <svg className="w-5 h-5 text-sh-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Recycle Bin
              </h3>
              {recycleBinPath && (
                <button
                  onClick={handleClearRecycleBin}
                  className="sh-button-warning px-4 py-2 text-sm"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-sm text-sh-text-secondary mb-4 leading-relaxed">
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

          <div className="sh-card p-4 mb-6 bg-sh-primary/5 border-sh-primary">
            <p className="text-sm text-sh-primary leading-relaxed flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span><strong>Tip:</strong> Press <kbd className="sh-kbd text-xs mx-1">?</kbd> to see all keyboard shortcuts</span>
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="sh-button-primary flex-1"
            >
              Save Settings
            </button>
            <button
              onClick={handleClose}
              className="sh-button-secondary px-6"
            >
              Cancel
            </button>
          </div>

          {!canSave && (
            <p className="text-sh-error mt-4 text-sm">
              Please enter and validate all paths to save.
            </p>
          )}
        </div>
      </div>
    </>
  )
}

export default SettingsSidebar
