import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ConnectScreen from './screens/ConnectScreen'
import ReportsScreen from './screens/ReportsScreen'
import ReviewScreen from './screens/ReviewScreen'
import Layout from './components/Layout'
import './index.css'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/connect" replace />} />
          <Route path="/connect" element={<ConnectScreen />} />
          <Route path="/reports" element={<ReportsScreen />} />
          <Route path="/review" element={<ReviewScreen />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
