import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function ConnectScreen() {
  const [configStatus, setConfigStatus] = useState(null)
  const [loading, setLoading] = useState(true)
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

  const handleConnect = () => {
    navigate('/reports')
  }

  if (loading) {
    return <div>Loading configuration status...</div>
  }

  const allConfigured = configStatus && 
    configStatus.nas_host &&
    configStatus.nas_user &&
    configStatus.nas_password &&
    configStatus.nas_reports_root &&
    configStatus.backup_root &&
    configStatus.sorted_root

  return (
    <div style={{ maxWidth: '800px' }}>
      <h2>Connection Configuration</h2>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Verify your environment configuration. All required fields must be set before connecting.
      </p>

      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h3 style={{ marginTop: 0 }}>Configuration Status</h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <ConfigItem 
            label="NAS Host" 
            configured={configStatus?.nas_host} 
          />
          <ConfigItem 
            label="NAS User" 
            configured={configStatus?.nas_user} 
          />
          <ConfigItem 
            label="Authentication" 
            configured={configStatus?.nas_password} 
          />
          <ConfigItem 
            label="Reports Root" 
            configured={configStatus?.nas_reports_root} 
          />
          <ConfigItem 
            label="Backup Root" 
            configured={configStatus?.backup_root} 
          />
          <ConfigItem 
            label="Sorted Root" 
            configured={configStatus?.sorted_root} 
          />
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <strong>Local State Directory:</strong> {configStatus?.local_state_dir || 'Not set'}
      </div>

      <button
        onClick={handleConnect}
        disabled={!allConfigured}
        style={{
          padding: '0.75rem 2rem',
          fontSize: '1rem',
          backgroundColor: allConfigured ? '#0066cc' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: allConfigured ? 'pointer' : 'not-allowed',
          fontWeight: '600'
        }}
      >
        {allConfigured ? 'Continue to Reports' : 'Configure Required Settings'}
      </button>

      {!allConfigured && (
        <p style={{ color: '#d32f2f', marginTop: '1rem' }}>
          Please configure all required settings in your .env file before continuing.
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

