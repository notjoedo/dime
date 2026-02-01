import './App.css'
import Sidebar from './components/Sidebar'

function Dashboard() {
  return (
    <div className="min-h-screen text-gray-900" style={{ backgroundColor: '#121212' }}>
      <Sidebar />
      <div style={{ marginLeft: '85px', padding: '24px' }}>
        <p> hi</p>
      </div>
    </div>
  )
}

export default Dashboard
