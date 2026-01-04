import { useState, useEffect, useRef, useMemo } from 'react'

function PathInput({ label, value, onChange, placeholder, onValidationChange, storageKey }) {
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState(null)
  const [isValid, setIsValid] = useState(false)
  const [inlineSuggestion, setInlineSuggestion] = useState('')
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)
  const debounceTimerRef = useRef(null)
  const containerRef = useRef(null)
  const overlayRef = useRef(null)
  
  const filteredSuggestions = useMemo(() => {
    const lastSlashIndex = value.lastIndexOf('/')
    const currentTypedPart = value.substring(lastSlashIndex + 1)
    
    if (value.endsWith('/') || !currentTypedPart) {
      return suggestions
    }
    
    return suggestions.filter(suggestion => {
      const suggestionBasename = suggestion.substring(suggestion.lastIndexOf('/') + 1)
      return suggestionBasename.toLowerCase().startsWith(currentTypedPart.toLowerCase())
    })
  }, [suggestions, value])

  useEffect(() => {
    if (storageKey) {
      const cached = localStorage.getItem(storageKey)
      if (cached && !value) {
        onChange(cached)
      }
    }
  }, [storageKey, value, onChange])

  useEffect(() => {
    if (storageKey && value) {
      localStorage.setItem(storageKey, value)
    }
  }, [storageKey, value])

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (!value || value.length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      setInlineSuggestion('')
      return
    }

    const shouldTriggerImmediately = value.endsWith('/')
    
    const fetchSuggestions = async () => {
      try {
        const response = await fetch(`/api/paths/suggest?partial=${encodeURIComponent(value)}`)
        const data = await response.json()
        if (data.suggestions && data.suggestions.length > 0) {
          const lastSlashIndex = value.lastIndexOf('/')
          const typedBasename = lastSlashIndex >= 0 ? value.substring(lastSlashIndex + 1) : value
          
          let filteredSuggestions = data.suggestions
          if (typedBasename && !value.endsWith('/')) {
            const typedBasenameLower = typedBasename.toLowerCase()
            filteredSuggestions = data.suggestions.filter(suggestion => {
              const suggestionBasename = suggestion.substring(suggestion.lastIndexOf('/') + 1)
              return suggestionBasename.toLowerCase().startsWith(typedBasenameLower)
            })
          }
          
          setSuggestions(filteredSuggestions)
          setShowSuggestions(filteredSuggestions.length > 0)
          
          if (!value.endsWith('/') && filteredSuggestions.length > 0) {
            const bestMatch = filteredSuggestions[0]
            if (bestMatch) {
              const completion = bestMatch.substring(value.length)
              const folderCompletion = completion.endsWith('/') ? completion : completion + '/'
              setInlineSuggestion(folderCompletion)
            } else {
              setInlineSuggestion('')
            }
          } else {
            setInlineSuggestion('')
          }
        } else {
          setSuggestions([])
          setShowSuggestions(false)
          setInlineSuggestion('')
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err)
        setSuggestions([])
        setInlineSuggestion('')
      }
    }

    if (shouldTriggerImmediately) {
      fetchSuggestions()
    } else {
      debounceTimerRef.current = setTimeout(fetchSuggestions, 200)
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [value])

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (!value || value.trim().length === 0) {
      setIsValid(false)
      setValidationError(null)
      if (onValidationChange) {
        onValidationChange(false, null)
      }
      return
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsValidating(true)
      try {
        const response = await fetch('/api/paths/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: value })
        })
        const data = await response.json()
        
        setIsValid(data.valid)
        setValidationError(data.error)
        
        if (data.normalized_path && data.normalized_path !== value) {
          onChange(data.normalized_path)
        }
        
        if (onValidationChange) {
          onValidationChange(data.valid, data.error)
        }
      } catch (err) {
        setIsValid(false)
        setValidationError('Failed to validate path')
        if (onValidationChange) {
          onValidationChange(false, 'Failed to validate path')
        }
      } finally {
        setIsValidating(false)
      }
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [value, onChange, onValidationChange])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSuggestionClick = (suggestion) => {
    const newValue = suggestion.endsWith('/') ? suggestion : suggestion + '/'
    onChange(newValue)
    setShowSuggestions(false)
    setSelectedSuggestionIndex(-1)
    setTimeout(() => {
      inputRef.current?.focus()
      if (inputRef.current) {
        inputRef.current.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }, 0)
  }

  const acceptInlineSuggestion = () => {
    if (inlineSuggestion) {
      const newValue = value + inlineSuggestion
      onChange(newValue)
      setInlineSuggestion('')
      if (newValue.endsWith('/')) {
        setTimeout(() => {
          inputRef.current?.focus()
          if (inputRef.current) {
            inputRef.current.dispatchEvent(new Event('input', { bubbles: true }))
          }
        }, 0)
      }
    } else if (filteredSuggestions.length > 0) {
      handleSuggestionClick(filteredSuggestions[0])
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      if (inlineSuggestion || filteredSuggestions.length > 0) {
        e.preventDefault()
        acceptInlineSuggestion()
        return
      }
    }

    if (e.key === 'ArrowDown' && filteredSuggestions.length > 0) {
      e.preventDefault()
      const nextIndex = selectedSuggestionIndex < filteredSuggestions.length - 1 
        ? selectedSuggestionIndex + 1 
        : selectedSuggestionIndex
      setSelectedSuggestionIndex(nextIndex)
      setShowSuggestions(true)
      const suggestionElement = suggestionsRef.current?.querySelector(`[data-index="${nextIndex}"]`)
      suggestionElement?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'ArrowUp' && filteredSuggestions.length > 0) {
      e.preventDefault()
      const prevIndex = selectedSuggestionIndex > 0 
        ? selectedSuggestionIndex - 1 
        : -1
      setSelectedSuggestionIndex(prevIndex)
      setShowSuggestions(true)
    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0 && filteredSuggestions.length > 0) {
      e.preventDefault()
      handleSuggestionClick(filteredSuggestions[selectedSuggestionIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedSuggestionIndex(-1)
      setInlineSuggestion('')
    } else if (e.key === 'ArrowRight' && inlineSuggestion) {
      e.preventDefault()
      acceptInlineSuggestion()
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="block mb-2 font-semibold text-sh-text flex items-center gap-2">
        {label}
        {isValidating && (
          <span className="text-sm text-sh-text-muted font-normal">
            (validating...)
          </span>
        )}
        {!isValidating && value && (
          <span className={`text-sm font-semibold ${isValid ? 'text-sh-success' : 'text-sh-error'}`}>
            {isValid ? '✓' : '✗'}
          </span>
        )}
      </label>
      <div className="relative w-full">
        {inlineSuggestion && !showSuggestions && (
          <div
            ref={overlayRef}
            className="absolute top-0 left-0 right-0 p-3 text-base font-mono pointer-events-none z-0 whitespace-pre overflow-hidden border-2 border-transparent rounded-lg leading-relaxed"
          >
            <span className="text-transparent">{value}</span>
            <span className="text-sh-text-muted opacity-50">{inlineSuggestion}</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setSelectedSuggestionIndex(-1)
          }}
          onFocus={() => {
            if (suggestions.length > 0 || value.endsWith('/')) {
              setShowSuggestions(true)
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full p-3 text-base border-2 rounded-lg font-mono outline-none relative z-[1] transition-all duration-200 ${
            validationError 
              ? 'border-sh-error bg-sh-error/5 text-sh-text focus:border-sh-error focus:ring-2 focus:ring-sh-error/20' 
              : isValid && value 
                ? 'border-sh-success bg-sh-success/5 text-sh-text focus:border-sh-success focus:ring-2 focus:ring-sh-success/20' 
                : 'border-sh-border bg-sh-bg-secondary text-sh-text focus:border-sh-primary focus:ring-2 focus:ring-sh-primary/20'
          } ${inlineSuggestion && !showSuggestions ? 'bg-transparent' : ''}`}
        />
        {inlineSuggestion && !showSuggestions && (
          <div className="absolute top-0 left-0 p-3 text-base font-mono pointer-events-none z-[2] whitespace-pre overflow-hidden leading-relaxed">
            <span className="text-transparent">{value}</span>
            <span className="text-sh-text-muted opacity-50">{inlineSuggestion}</span>
          </div>
        )}
      </div>
      {validationError && (
        <div className="mt-1 text-sm text-sh-error">
          {validationError}
        </div>
      )}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 bg-sh-surface border border-sh-border rounded-lg shadow-sh-md max-h-[200px] overflow-y-auto z-[1000] mt-1"
        >
          {filteredSuggestions.map((suggestion, index) => {
            let typedPortion = ''
            let remainingPortion = suggestion
            
            if (value.endsWith('/')) {
              typedPortion = value
              remainingPortion = suggestion.substring(value.length)
            } else {
              const lastSlashIndex = value.lastIndexOf('/')
              const parentPath = lastSlashIndex >= 0 ? value.substring(0, lastSlashIndex + 1) : '/'
              const typedBasename = lastSlashIndex >= 0 ? value.substring(lastSlashIndex + 1) : value
              
              const suggestionBasename = suggestion.substring(parentPath.length)
              
              if (suggestion.toLowerCase().startsWith(parentPath.toLowerCase()) && 
                  suggestionBasename.toLowerCase().startsWith(typedBasename.toLowerCase())) {
                typedPortion = parentPath + typedBasename
                remainingPortion = suggestionBasename.substring(typedBasename.length)
              } else {
                typedPortion = parentPath
                remainingPortion = suggestionBasename
              }
            }
            
            return (
              <div
                key={index}
                data-index={index}
                onClick={() => handleSuggestionClick(suggestion)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSuggestionClick(suggestion)
                  }
                }}
                tabIndex={0}
                className={`p-3 cursor-pointer font-mono text-sm transition-colors duration-150 ${
                  index < suggestions.length - 1 ? 'border-b border-sh-border' : ''
                } ${
                  index === selectedSuggestionIndex 
                    ? 'bg-sh-primary/10 font-semibold' 
                    : 'hover:bg-sh-surface-hover'
                }`}
                onMouseEnter={() => setSelectedSuggestionIndex(index)}
              >
                <span className="text-sh-text">{typedPortion}</span>
                <span className="text-sh-text-muted">{remainingPortion}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PathInput
