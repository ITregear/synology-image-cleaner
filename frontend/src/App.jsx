import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ConnectScreen from './screens/ConnectScreen'
import ScanScreen from './screens/ScanScreen'
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
          <Route path="/scan" element={<ScanScreen />} />
          <Route path="/review" element={<ReviewScreen />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
