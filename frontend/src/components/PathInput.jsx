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
  
  // Filter suggestions based on typed text - this is the source of truth
  const filteredSuggestions = useMemo(() => {
    const lastSlashIndex = value.lastIndexOf('/')
    const currentTypedPart = value.substring(lastSlashIndex + 1)
    
    // If we're at a folder boundary (ends with /) or no typed part, show all
    if (value.endsWith('/') || !currentTypedPart) {
      return suggestions
    }
    
    // Otherwise, only show if basename starts with typed part
    return suggestions.filter(suggestion => {
      const suggestionBasename = suggestion.substring(suggestion.lastIndexOf('/') + 1)
      return suggestionBasename.toLowerCase().startsWith(currentTypedPart.toLowerCase())
    })
  }, [suggestions, value])

  // Load cached path on mount
  useEffect(() => {
    if (storageKey) {
      const cached = localStorage.getItem(storageKey)
      if (cached && !value) {
        onChange(cached)
      }
    }
  }, [storageKey, value, onChange])

  // Save to cache when value changes
  useEffect(() => {
    if (storageKey && value) {
      localStorage.setItem(storageKey, value)
    }
  }, [storageKey, value])

  // Fetch suggestions with debounce - trigger on / or when typing
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

    // Trigger immediately if user just typed a / or if value ends with /
    const shouldTriggerImmediately = value.endsWith('/')
    
    const fetchSuggestions = async () => {
      try {
        const response = await fetch(`/api/paths/suggest?partial=${encodeURIComponent(value)}`)
        const data = await response.json()
        if (data.suggestions && data.suggestions.length > 0) {
          // Additional frontend filtering to ensure only matching suggestions are shown
          // Extract the basename being typed
          const lastSlashIndex = value.lastIndexOf('/')
          const typedBasename = lastSlashIndex >= 0 ? value.substring(lastSlashIndex + 1) : value
          
          // Filter suggestions to only show those whose basename starts with typedBasename (case-insensitive)
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
          
          // Find the best inline suggestion (first one that starts with current value)
          // Only show inline suggestion if not ending with / (we're typing a name)
          if (!value.endsWith('/') && filteredSuggestions.length > 0) {
            // The first filtered suggestion is the best match
            const bestMatch = filteredSuggestions[0]
            if (bestMatch) {
              // Extract the part to complete (folder name + /)
              const completion = bestMatch.substring(value.length)
              // Ensure completion ends with /
              const folderCompletion = completion.endsWith('/') ? completion : completion + '/'
              setInlineSuggestion(folderCompletion)
            } else {
              setInlineSuggestion('')
            }
          } else {
            // If ending with /, don't show inline suggestion, just show dropdown
            setInlineSuggestion('')
          }
        } else {
          setSuggestions([])
          // If value ends with / but no suggestions, keep dropdown closed
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
      debounceTimerRef.current = setTimeout(fetchSuggestions, 200) // Shorter debounce for better responsiveness
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [value])

  // Validate path when it changes (with debounce)
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
          // Auto-update to normalized path if it was inferred
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
    }, 500) // 500ms debounce for validation

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [value, onChange, onValidationChange])

  // Close suggestions when clicking outside
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
    // Append / to trigger next level of suggestions
    const newValue = suggestion.endsWith('/') ? suggestion : suggestion + '/'
    onChange(newValue)
    setShowSuggestions(false)
    setSelectedSuggestionIndex(-1)
    // Focus and trigger suggestions for next level
    setTimeout(() => {
      inputRef.current?.focus()
      // Trigger suggestions by dispatching input event
      if (inputRef.current) {
        inputRef.current.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }, 0)
  }

  const acceptInlineSuggestion = () => {
    if (inlineSuggestion) {
      // Accept the inline suggestion (which already includes /)
      const newValue = value + inlineSuggestion
      onChange(newValue)
      setInlineSuggestion('')
      // Trigger suggestions for next level if ending with /
      if (newValue.endsWith('/')) {
        setTimeout(() => {
          inputRef.current?.focus()
          // Trigger suggestions by dispatching input event
          if (inputRef.current) {
            inputRef.current.dispatchEvent(new Event('input', { bubbles: true }))
          }
        }, 0)
      }
    } else if (filteredSuggestions.length > 0) {
      // If no inline suggestion but we have filtered suggestions, use the first one
      // IMPORTANT: Use filteredSuggestions, not suggestions, to get the correct first item
      handleSuggestionClick(filteredSuggestions[0])
    }
  }

  const handleKeyDown = (e) => {
    // Tab should autocomplete, not move to next field
    if (e.key === 'Tab') {
      // If there's an inline suggestion or dropdown suggestions, autocomplete
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
      // Scroll into view
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
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
        {label}
        {isValidating && (
          <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
            (validating...)
          </span>
        )}
        {!isValidating && value && (
          <span style={{ 
            marginLeft: '0.5rem', 
            fontSize: '0.875rem', 
            color: isValid ? '#4caf50' : '#f44336',
            fontWeight: '600'
          }}>
            {isValid ? '✓' : '✗'}
          </span>
        )}
      </label>
      <div style={{ position: 'relative', width: '100%' }}>
        {/* Overlay for inline autocomplete - shows greyed out completion */}
        {inlineSuggestion && !showSuggestions && (
          <div
            ref={overlayRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: '0.75rem',
              fontSize: '1rem',
              fontFamily: 'monospace',
              pointerEvents: 'none',
              zIndex: 0,
              whiteSpace: 'pre',
              overflow: 'hidden',
              border: `2px solid transparent`,
              borderRadius: '4px',
              lineHeight: '1.5',
              color: 'transparent' // Make the whole thing transparent so we can see input through it
            }}
          >
            <span style={{ color: 'transparent' }}>{value}</span>
            <span style={{ color: '#999' }}>{inlineSuggestion}</span>
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
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            border: `2px solid ${validationError ? '#f44336' : isValid && value ? '#4caf50' : '#ddd'}`,
            borderRadius: '4px',
            fontFamily: 'monospace',
            outline: 'none',
            backgroundColor: inlineSuggestion && !showSuggestions ? 'transparent' : 'white',
            position: 'relative',
            zIndex: 1,
            color: '#000'
          }}
        />
        {/* Inline autocomplete overlay - positioned behind input to show grey completion */}
        {inlineSuggestion && !showSuggestions && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              padding: '0.75rem',
              fontSize: '1rem',
              fontFamily: 'monospace',
              pointerEvents: 'none',
              zIndex: 2,
              whiteSpace: 'pre',
              overflow: 'hidden',
              lineHeight: '1.5',
              color: 'transparent'
            }}
          >
            <span style={{ color: 'transparent' }}>{value}</span>
            <span style={{ color: '#999', backgroundColor: 'transparent' }}>{inlineSuggestion}</span>
          </div>
        )}
      </div>
      {validationError && (
        <div style={{
          marginTop: '0.25rem',
          fontSize: '0.875rem',
          color: '#f44336'
        }}>
          {validationError}
        </div>
      )}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            marginTop: '0.25rem'
          }}
        >
          {filteredSuggestions.map((suggestion, index) => {
            // Calculate which part is typed vs suggested
            let typedPortion = ''
            let remainingPortion = suggestion
            
            if (value.endsWith('/')) {
              // Full value is parent, entire suggestion basename is new
              typedPortion = value
              remainingPortion = suggestion.substring(value.length)
            } else {
              // Value includes partial folder name
              // Find the parent directory and typed basename
              const lastSlashIndex = value.lastIndexOf('/')
              const parentPath = lastSlashIndex >= 0 ? value.substring(0, lastSlashIndex + 1) : '/'
              const typedBasename = lastSlashIndex >= 0 ? value.substring(lastSlashIndex + 1) : value
              
              // Extract the basename from the suggestion
              const suggestionBasename = suggestion.substring(parentPath.length)
              
              // Check if suggestion starts with parent path and basename starts with typed basename
              if (suggestion.toLowerCase().startsWith(parentPath.toLowerCase()) && 
                  suggestionBasename.toLowerCase().startsWith(typedBasename.toLowerCase())) {
                // Show: parent (black) + typed basename (black) + remaining basename (grey)
                typedPortion = parentPath + typedBasename
                remainingPortion = suggestionBasename.substring(typedBasename.length)
              } else {
                // Fallback: show parent in black, rest in grey
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
                style={{
                  padding: '0.75rem',
                  cursor: 'pointer',
                  borderBottom: index < suggestions.length - 1 ? '1px solid #eee' : 'none',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  backgroundColor: index === selectedSuggestionIndex ? '#e3f2fd' : 'white',
                  fontWeight: index === selectedSuggestionIndex ? '600' : '400'
                }}
                onMouseEnter={() => {
                  setSelectedSuggestionIndex(index)
                }}
                onMouseLeave={() => {
                  // Don't clear on mouse leave, keep selection
                }}
              >
                <span style={{ color: '#000' }}>{typedPortion}</span>
                <span style={{ color: '#999' }}>{remainingPortion}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PathInput
