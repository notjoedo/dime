import Header from '../components/Header'
import Merchants from '../components/merchants'
import { MdEdit, MdEmail, MdPhone, MdLanguage, MdClose } from 'react-icons/md'
import pfpImage from '../public/pfp.jpeg'


export default function Settings() {
  return (
    <div style={{ width: '100%' }}>
      <Header title="settings" />

      {/* Settings Content */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '20px', alignItems: 'stretch' }}>
        {/* Profile Information Section */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header outside container */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ color: '#9ca3af', fontSize: '20px', margin: 0 }}>profile information</h2>
            <button
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#2A2A2A',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
              }}
            >
              <MdEdit size={16} />
            </button>
          </div>

          {/* Container */}
          <div style={{ backgroundColor: '#121212', borderRadius: '16px', padding: '20px', position: 'relative', border: '0.5px solid rgba(255, 255, 255, 0.2)', flex: 1 }}>
            {/* Profile Content - Picture on left, fields on right */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              {/* Profile Picture */}
              <img
                src={pfpImage}
                alt="Profile"
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />

              {/* Form Fields */}
              <div style={{ flex: 1 }}>
                {/* Name Fields */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ color: '#6b7280', fontSize: '11px', marginBottom: '6px', display: 'block' }}>first name</label>
                    <input
                      type="text"
                      defaultValue="Shiva"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        backgroundColor: '#2A2A2A',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '15px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ color: '#6b7280', fontSize: '11px', marginBottom: '6px', display: 'block' }}>last name name</label>
                    <input
                      type="text"
                      defaultValue="Anwar"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        backgroundColor: '#2A2A2A',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '15px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ color: '#6b7280', fontSize: '11px', marginBottom: '6px', display: 'block' }}>email address</label>
                  <div style={{ position: 'relative' }}>
                    <MdEmail
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#6b7280',
                      }}
                    />
                    <input
                      type="email"
                      defaultValue="joedo2910@vt.edu"
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 42px',
                        backgroundColor: '#2A2A2A',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '15px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Phone Field */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ color: '#6b7280', fontSize: '11px', marginBottom: '6px', display: 'block' }}>phone number</label>
                  <div style={{ position: 'relative' }}>
                    <MdPhone
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#6b7280',
                      }}
                    />
                    <input
                      type="tel"
                      defaultValue="+1 (703) 206-8555"
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 42px',
                        backgroundColor: '#2A2A2A',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '15px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Language Field */}
                <div>
                  <label style={{ color: '#6b7280', fontSize: '11px', marginBottom: '6px', display: 'block' }}>language</label>
                  <div style={{ position: 'relative' }}>
                    <MdLanguage
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#6b7280',
                        zIndex: 1,
                      }}
                    />
                    <select
                      defaultValue="English"
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 42px',
                        backgroundColor: '#2A2A2A',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '15px',
                        boxSizing: 'border-box',
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 14px center',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            {/* End of profile container */}
          </div>
        </div>

        {/* Security Section */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header outside container */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ color: '#9ca3af', fontSize: '20px', margin: 0 }}>security</h2>
            <button
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#2A2A2A',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
              }}
            >
              <MdEdit size={16} />
            </button>
          </div>

          {/* Container */}
          <div style={{ backgroundColor: '#121212', borderRadius: '16px', padding: '20px', position: 'relative', border: '0.5px solid rgba(255, 255, 255, 0.2)', flex: 1 }}>
            {/* Current Password Field */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ color: '#6b7280', fontSize: '11px', marginBottom: '6px', display: 'block' }}>current password</label>
              <input
                type="password"
                placeholder="enter current password"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: '#2A2A2A',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* New Password Field */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ color: '#6b7280', fontSize: '11px', marginBottom: '6px', display: 'block' }}>new password</label>
              <input
                type="password"
                placeholder="enter new password"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: '#2A2A2A',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Confirm Password Field */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#6b7280', fontSize: '11px', marginBottom: '6px', display: 'block' }}>confirm new password</label>
              <input
                type="password"
                placeholder="re-enter new password"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: '#2A2A2A',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Password Requirements */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MdClose size={14} style={{ color: '#6b7280' }} />
                <span style={{ color: '#6b7280', fontSize: '11px' }}>minumum 8 characters</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MdClose size={14} style={{ color: '#6b7280' }} />
                <span style={{ color: '#6b7280', fontSize: '11px' }}>at least 1 lowercase letter</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MdClose size={14} style={{ color: '#6b7280' }} />
                <span style={{ color: '#6b7280', fontSize: '11px' }}>at least 1 uppercase letter</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MdClose size={14} style={{ color: '#6b7280' }} />
                <span style={{ color: '#6b7280', fontSize: '11px' }}>at least 1 number</span>
              </div>
            </div>
            {/* End of security container */}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: '100%', height: '1px', backgroundColor: '#333', marginTop: '32px' }} />

      {/* Merchants Section */}
      <Merchants />

      {/* Bottom Spacer */}
      <div style={{ height: '60px' }} />
    </div>
  )
}