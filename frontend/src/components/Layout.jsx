import { Link, useLocation } from 'react-router-dom'

function Layout({ children }) {
  const location = useLocation()
  
  const navItems = [
    { path: '/connect', label: 'Connect' },
    { path: '/reports', label: 'Reports' },
    { path: '/review', label: 'Review' },
  ]
  
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        borderBottom: '1px solid #e0e0e0',
        padding: '1rem 2rem',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
            Synology Duplicate-Review
          </h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  textDecoration: 'none',
                  color: location.pathname === item.path ? '#0066cc' : '#666',
                  fontWeight: location.pathname === item.path ? '600' : '400',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  backgroundColor: location.pathname === item.path ? '#e3f2fd' : 'transparent'
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      <main style={{ flex: 1, padding: '2rem' }}>
        {children}
      </main>
    </div>
  )
}

export default Layout


