import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function ReportsScreen() {
  const [selectedReport, setSelectedReport] = useState(null)
  const navigate = useNavigate()

  const placeholderReports = [
    { id: '1', name: '2024-12-27_10-30-00', date: '2024-12-27 10:30:00', valid: true },
    { id: '2', name: '2024-12-20_09-15-00', date: '2024-12-20 09:15:00', valid: true },
    { id: '3', name: '2024-12-13_14-45-00', date: '2024-12-13 14:45:00', valid: true },
  ]

  const handleSelectReport = (report) => {
    setSelectedReport(report.id)
  }

  const handleImport = () => {
    if (selectedReport) {
      navigate('/review')
    }
  }

  return (
    <div style={{ maxWidth: '1000px' }}>
      <h2>Storage Analyzer Reports</h2>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Select a report to review duplicates. The latest report is recommended.
      </p>

      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Available Reports</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {placeholderReports.map(report => (
            <div
              key={report.id}
              onClick={() => handleSelectReport(report)}
              style={{
                padding: '1rem',
                backgroundColor: selectedReport === report.id ? '#e3f2fd' : 'white',
                border: `2px solid ${selectedReport === report.id ? '#0066cc' : '#e0e0e0'}`,
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: '600' }}>{report.name}</div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>{report.date}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {report.valid && (
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#4caf50',
                    color: 'white',
                    borderRadius: '4px'
                  }}>
                    Valid
                  </span>
                )}
                {selectedReport === report.id && (
                  <span style={{ color: '#0066cc', fontWeight: '600' }}>✓ Selected</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleImport}
        disabled={!selectedReport}
        style={{
          padding: '0.75rem 2rem',
          fontSize: '1rem',
          backgroundColor: selectedReport ? '#0066cc' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: selectedReport ? 'pointer' : 'not-allowed',
          fontWeight: '600'
        }}
      >
        Import and Review
      </button>
    </div>
  )
}

export default ReportsScreen


