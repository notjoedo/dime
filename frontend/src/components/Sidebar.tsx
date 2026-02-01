import { MdOutlineHome, MdOutlineCreditCard, MdOutlineBarChart, MdOutlineDescription, MdOutlineSettings, MdOutlineInfo } from 'react-icons/md'
import './sidebar.css'
import dimeLogo from '../public/dime-gradient.svg'
import { Link } from 'react-router-dom'

export default function Sidebar() {
  return (
    <div style={{
      width: '85px',
      height: '100vh',
      backgroundColor: '#252525',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 0',
      position: 'fixed',
      left: 0,
      top: 0,
      borderRight: '1px solid #444',
      zIndex: 200,
    }}>
      {/* Logo */}
      <div style={{ marginBottom: '12px', marginTop: '-8px' }}>
        <img src={dimeLogo} alt="Dime" style={{ width: '50px', height: '50px' }} />
      </div>

      {/* Divider */}
      <div style={{
        width: '100%',
        height: '1px',
        backgroundColor: '#444',
        marginBottom: '30px',
      }}></div>

      {/* Navigation Icons */}
      <nav style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        flex: 1,
      }}>
        <Link to="/home" className="sidebar-icon">
          <MdOutlineHome size={24} />
        </Link>
        <Link to="/spending" className="sidebar-icon">
          <MdOutlineCreditCard size={24} />
        </Link>
        <Link to="/analytics" className="sidebar-icon">
          <MdOutlineBarChart size={24} />
        </Link>
        <Link to="/credit" className="sidebar-icon">
          <MdOutlineDescription size={24} />
        </Link>
        <Link to="/settings" className="sidebar-icon">
          <MdOutlineSettings size={24} />
        </Link>
      </nav>

      {/* Bottom Info Icon */}
      <div style={{ marginTop: 'auto', paddingBottom: '10px' }}>
        <Link to="/information" className="sidebar-icon">
          <MdOutlineInfo size={24} />
        </Link>
      </div>
    </div>
  )
}
