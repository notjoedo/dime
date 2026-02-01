import './App.css'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Spending from './pages/Spending'
import Analytics from './pages/Analytics'
import Credit from './pages/Credit'
import Settings from './pages/Settings'

function Dashboard() {
  return (
    <div className="min-h-screen text-gray-900" style={{ backgroundColor: '#121212' }}>
      <Sidebar />
      <div style={{ marginLeft: '85px', marginTop: '75px', padding: '24px 30px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/spending" element={<Spending />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/credit" element={<Credit />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
      <Footer />
    </div>
  )
}

export default Dashboard