import { useEffect, useState } from 'react'

function HelpSidebar({ isOpen, onClose }) {
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (isOpen && !isClosing && e.key === 'Escape') {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isOpen, isClosing])

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
    }
  }, [isOpen])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }

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
        width: '550px',
        backgroundColor: 'white',
        boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        overflowY: 'auto',
        animation: isClosing ? 'slideOutRight 0.3s ease-in-out' : 'slideInRight 0.3s ease-in-out'
      }}>
        <div style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Keyboard Shortcuts</h2>
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
            marginBottom: '2rem',
            padding: '1rem',
            backgroundColor: '#f0f7ff',
            borderRadius: '8px',
            border: '1px solid #0066cc'
          }}>
            <p style={{ margin: 0, color: '#0066cc', fontSize: '0.875rem', lineHeight: '1.6' }}>
              💡 <strong>Tip:</strong> All keyboard shortcuts work from anywhere in the app. No need to click or focus anything first!
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <section>
              <h3 style={{ 
                marginTop: 0, 
                marginBottom: '1rem', 
                fontSize: '1rem',
                color: '#0066cc',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: '700'
              }}>
                Navigation
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <ShortcutItem 
                  keys={['←', '→']} 
                  description="Cycle between backup and kept images" 
                />
                <ShortcutItem 
                  keys={['C']} 
                  description="Cycle between Duplicates and Missing tabs" 
                />
              </div>
            </section>

            <div style={{ borderTop: '1px solid #e0e0e0', margin: '0.5rem 0' }} />

            <section>
              <h3 style={{ 
                marginTop: 0, 
                marginBottom: '1rem', 
                fontSize: '1rem',
                color: '#0066cc',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: '700'
              }}>
                Actions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <ShortcutItem 
                  keys={['E']} 
                  description="Ignore this duplicate (mark as done)" 
                  color="#ffa726"
                />
                <ShortcutItem 
                  keys={['D']} 
                  description="Delete backup copy (move to recycle bin)" 
                  color="#d32f2f"
                />
                <ShortcutItem 
                  keys={['⌘Z', 'Ctrl+Z']} 
                  description="Undo last action" 
                  color="#6c757d"
                />
              </div>
            </section>

            <div style={{ borderTop: '1px solid #e0e0e0', margin: '0.5rem 0' }} />

            <section>
              <h3 style={{ 
                marginTop: 0, 
                marginBottom: '1rem', 
                fontSize: '1rem',
                color: '#0066cc',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: '700'
              }}>
                System
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <ShortcutItem 
                  keys={['K']} 
                  description="Start a new scan" 
                />
                <ShortcutItem 
                  keys={['S']} 
                  description="Open settings sidebar" 
                />
                <ShortcutItem 
                  keys={['?']} 
                  description="Toggle this help sidebar" 
                />
                <ShortcutItem 
                  keys={['Esc']} 
                  description="Close sidebars and modals" 
                />
              </div>
            </section>
          </div>

          <div style={{
            marginTop: '2rem',
            padding: '1.5rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⌨️</div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#333' }}>
              Superhuman-Inspired
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#666', lineHeight: '1.6' }}>
              This app is designed for keyboard-driven efficiency. 
              Keep your hands on the keyboard and fly through your duplicates!
            </p>
          </div>
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

function ShortcutItem({ keys, description, color }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.75rem 1rem',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
      borderLeft: color ? `4px solid ${color}` : '4px solid #0066cc'
    }}>
      <span style={{ color: '#333', fontSize: '0.9375rem' }}>{description}</span>
      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, marginLeft: '1rem' }}>
        {keys.map((key, idx) => (
          <span key={idx}>
            <kbd style={{
              padding: '0.375rem 0.75rem',
              backgroundColor: '#fff',
              borderRadius: '4px',
              border: '2px solid #e0e0e0',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#333',
              boxShadow: '0 2px 0 #e0e0e0'
            }}>
              {key}
            </kbd>
            {idx < keys.length - 1 && <span style={{ margin: '0 0.25rem', color: '#999' }}>/</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

export default HelpSidebar

