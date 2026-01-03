import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function ReportsScreen() {
  const [selectedReport, setSelectedReport] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/reports')
      const data = await response.json()
      if (data.error) {
        setError(data.error)
      } else {
        setReports(data.reports || [])
      }
    } catch (err) {
      setError('Failed to fetch reports')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectReport = (report) => {
    setSelectedReport(report.path)
  }

  const handleImport = () => {
    if (selectedReport) {
      navigate(`/review?report=${encodeURIComponent(selectedReport)}`)
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date'
    const date = new Date(timestamp * 1000)
    return date.toLocaleString()
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '1000px' }}>
        <h2>Storage Analyzer Reports</h2>
        <p>Loading reports...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Storage Analyzer Reports</h2>
          <p style={{ color: '#666', marginTop: '0.5rem', marginBottom: 0 }}>
            Select a report to review duplicates. The latest report is recommended.
          </p>
        </div>
        <button
          onClick={fetchReports}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          Error: {error}
        </div>
      )}

      {reports.length === 0 && !loading && (
        <div style={{
          padding: '2rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#666'
        }}>
          No valid reports found in the reports directory.
          <br />
          Make sure Storage Analyzer has generated reports and the path is correct.
        </div>
      )}

      {reports.length > 0 && (
        <>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '2rem'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Available Reports ({reports.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {reports.map((report, index) => (
                <div
                  key={report.path}
                  onClick={() => handleSelectReport(report)}
                  style={{
                    padding: '1rem',
                    backgroundColor: selectedReport === report.path ? '#e3f2fd' : 'white',
                    border: `2px solid ${selectedReport === report.path ? '#0066cc' : '#e0e0e0'}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                      {report.name}
                      {index === 0 && (
                        <span style={{
                          marginLeft: '0.5rem',
                          fontSize: '0.75rem',
                          padding: '0.125rem 0.5rem',
                          backgroundColor: '#ff9800',
                          color: 'white',
                          borderRadius: '4px',
                          fontWeight: '500'
                        }}>
                          Latest
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      {formatDate(report.timestamp)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                      {report.path}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {report.has_db && (
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '0.125rem 0.375rem',
                          backgroundColor: '#2196f3',
                          color: 'white',
                          borderRadius: '3px'
                        }} title="Has dup.db">
                          DB
                        </span>
                      )}
                      {report.has_csv && (
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '0.125rem 0.375rem',
                          backgroundColor: '#4caf50',
                          color: 'white',
                          borderRadius: '3px'
                        }} title="Has CSV">
                          CSV
                        </span>
                      )}
                    </div>
                    {selectedReport === report.path && (
                      <span style={{ color: '#0066cc', fontWeight: '600', fontSize: '0.875rem' }}>✓ Selected</span>
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
        </>
      )}
    </div>
  )
}

export default ReportsScreen


