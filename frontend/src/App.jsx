import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import InboxScreen from './screens/InboxScreen'
import Layout from './components/Layout'
import './index.css'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<InboxScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
