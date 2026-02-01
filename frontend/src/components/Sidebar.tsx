import { MdOutlineHome, MdOutlineCreditCard, MdOutlineBarChart, MdOutlineDescription, MdOutlineSettings, MdOutlineInfo } from 'react-icons/md'
import './sidebar.css'
import dimeLogo from '../public/dime-gradient.svg'

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
        <button className="sidebar-icon">
          <MdOutlineHome size={24} />
        </button>
        <button className="sidebar-icon">
          <MdOutlineCreditCard size={24} />
        </button>
        <button className="sidebar-icon">
          <MdOutlineBarChart size={24} />
        </button>
        <button className="sidebar-icon">
          <MdOutlineDescription size={24} />
        </button>
        <button className="sidebar-icon">
          <MdOutlineSettings size={24} />
        </button>
      </nav>

      {/* Bottom Info Icon */}
      <div style={{ marginTop: 'auto', paddingBottom: '40px' }}>
        <button className="sidebar-icon">
          <MdOutlineInfo size={24} />
        </button>
      </div>
    </div>
  )
}
