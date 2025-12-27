import { useState, useEffect } from 'react'

function App() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setStatus(data.status === 'ok' ? 'App running' : 'Error')
      })
      .catch(() => setStatus('Error connecting to backend'))
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Synology Duplicate-Review Web App</h1>
      <p>Status: {status}</p>
    </div>
  )
}

export default App

