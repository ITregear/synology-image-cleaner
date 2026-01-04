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
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
      />
      
      <div className={`fixed top-0 right-0 bottom-0 w-[600px] bg-sh-bg-secondary border-l-2 border-sh-border shadow-sh-xl z-[1000] overflow-y-auto ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-sh-text flex items-center gap-3">
              <svg className="w-7 h-7 text-sh-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              Keyboard Shortcuts
            </h2>
            <button
              onClick={handleClose}
              className="bg-transparent border-none text-2xl cursor-pointer text-sh-text-secondary hover:text-sh-text transition-colors p-2 rounded-lg hover:bg-sh-surface"
            >
              ✕
            </button>
          </div>

          <div className="sh-card p-4 mb-6 bg-sh-primary/5 border-sh-primary">
            <p className="text-sm text-sh-primary leading-relaxed flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span><strong>Tip:</strong> All keyboard shortcuts work from anywhere in the app. No need to click or focus anything first!</span>
            </p>
          </div>

          <div className="space-y-6">
            <section>
              <h3 className="text-xs font-bold text-sh-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Navigation
              </h3>
              <div className="space-y-3">
                <ShortcutItem 
                  keys={['←', '→']} 
                  description="Navigate between duplicate pairs" 
                />
                <ShortcutItem 
                  keys={['C']} 
                  description="Cycle between Duplicates and Missing tabs" 
                />
              </div>
            </section>

            <div className="border-t border-sh-border" />

            <section>
              <h3 className="text-xs font-bold text-sh-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Actions
              </h3>
              <div className="space-y-3">
                <ShortcutItem 
                  keys={['E']} 
                  description="Ignore this duplicate (mark as done)" 
                  color="border-sh-warning"
                />
                <ShortcutItem 
                  keys={['U']} 
                  description="Unignore item (only in Ignored tab)" 
                  color="border-sh-primary"
                />
                <ShortcutItem 
                  keys={['D']} 
                  description="Delete backup copy (move to recycle bin)" 
                  color="border-sh-error"
                />
                <ShortcutItem 
                  keys={['⌘Z', 'Ctrl+Z']} 
                  description="Undo last action" 
                  color="border-sh-text-muted"
                />
              </div>
            </section>

            <div className="border-t border-sh-border" />

            <section>
              <h3 className="text-xs font-bold text-sh-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                System
              </h3>
              <div className="space-y-3">
                <ShortcutItem 
                  keys={['K']} 
                  description="Start a new scan" 
                  color="border-sh-primary"
                />
                <ShortcutItem 
                  keys={['S']} 
                  description="Open settings sidebar" 
                  color="border-sh-primary"
                />
                <ShortcutItem 
                  keys={['?']} 
                  description="Toggle this help sidebar" 
                  color="border-sh-primary"
                />
                <ShortcutItem 
                  keys={['Esc']} 
                  description="Close sidebars and modals" 
                  color="border-sh-text-muted"
                />
              </div>
            </section>
          </div>

          <div className="sh-card mt-8 p-6 text-center bg-gradient-to-br from-sh-accent/10 to-sh-primary/10 border-sh-accent">
            <div className="text-4xl mb-3">⌨️</div>
            <h3 className="text-lg font-bold text-sh-text mb-2">
              Superhuman-Inspired
            </h3>
            <p className="text-sm text-sh-text-secondary leading-relaxed">
              This app is designed for keyboard-driven efficiency. 
              Keep your hands on the keyboard and fly through your duplicates!
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

function ShortcutItem({ keys, description, color = 'border-sh-primary' }) {
  return (
    <div className={`flex justify-between items-center p-4 bg-sh-surface rounded-lg border-l-4 ${color} hover:bg-sh-surface-hover transition-colors duration-200`}>
      <span className="text-sh-text text-sm font-medium">{description}</span>
      <div className="flex gap-2 items-center flex-shrink-0 ml-4">
        {keys.map((key, idx) => (
          <span key={idx} className="flex items-center gap-1">
            <kbd className="sh-kbd">
              {key}
            </kbd>
            {idx < keys.length - 1 && <span className="text-sh-text-muted text-sm">/</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

export default HelpSidebar
