import { MdSearch, MdNotifications, MdMail } from 'react-icons/md'
import pfpImage from '../public/pfp.jpeg'

interface HeaderProps {
  title?: string;
}

export default function Header({ title = 'dashboard' }: HeaderProps) {
  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: '85px',
      right: 0,
      height: '80px',
      backgroundColor: '#121212',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 40px',
      zIndex: 100,
      borderBottom: '1px solid #444',
    }}>
      {/* Dashboard Title */}
      <h1 style={{
        fontFamily: 'Coolvetica, sans-serif',
        fontSize: '36px',
        fontWeight: '400',
        color: '#fff',
        margin: 0,
        letterSpacing: '-0.5px',
      }}>
        {title}
      </h1>

      {/* Search Bar */}
      <div style={{
        position: 'absolute',
        left: '65%',
        transform: 'translateX(-50%)',
        width: '200px',
      }}>
        <MdSearch 
          size={22} 
          style={{
            position: 'absolute',
            left: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#ffffff',
          }}
        />
        <input
          type="text"
          placeholder="search"
          style={{
            width: '100%',
            height: '42px',
            backgroundColor: '#2d2d2d',
            border: '1px solid #3f3f3f',
            borderRadius: '24px',
            padding: '0 24px 0 54px',
            fontSize: '16px',
            color: '#fff',
            outline: 'none',
            fontFamily: 'Coolvetica, sans-serif',
          }}
        />
      </div>

      {/* Right Icons */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        paddingLeft: '32px',
        paddingRight: '16px',
        borderLeft: '1px solid #444',
        height: '100%',
      }}>
        <button style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          backgroundColor: '#3a3a3a',
          border: '1.5px solid #555',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          padding: 0,
        }}>
          <MdNotifications size={22} color="#fff" />
        </button>
        
        <button style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          backgroundColor: '#3a3a3a',
          border: '1.5px solid #555',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          padding: 0,
        }}>
          <MdMail size={22} color="#fff" />
        </button>

        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '1.5px solid #555',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}>
          <img 
            src={pfpImage} 
            alt="Profile" 
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      </div>
    </header>
  )
}
