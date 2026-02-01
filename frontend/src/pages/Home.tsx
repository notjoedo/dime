import Header from '../components/Header'
import { CreditCard } from '../components/CreditCard'

const cards = [
  {
    card_id: '1',
    card_type: 'visa',
    last_four: '1234',
    expiration: '12/25',
    cardholder: 'John Doe',
  },
]

export default function Home() {
  const handleDeleteCard = (id: string) => {
    console.log('Delete card:', id)
    // TODO: Implement card deletion
  }

  return (
    <div style={{ width: '100%' }}>
      <Header title="dashboard" />

      {/* expenses tracker section */}
      <div style={{ marginTop: '20px' }}>
        {/* Section Header */}
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '24px', color: 'white', opacity: 0.6, margin: 0, marginBottom: '12px' }}>expenses tracker</h2>
        </div>

        {/* Cards Container */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Left Card - Total Earned with Graph Placeholder */}
          <div style={{
            flex: 1,
            borderRadius: '16px',
            padding: '20px',
            backgroundColor: '#1E1E1E',
          }}>
            <p style={{ color: '#6b7280', fontSize: '22px', marginBottom: '16px', marginTop: 0 }}>monthly tracker</p>
            {/* Graph Placeholder */}
            <div style={{
              width: '100%',
              height: '192px',
              borderRadius: '16px',
              backgroundColor: '#2A2A2A',
            }}>
              {/* Graph will be passed from backend */}
            </div>
          </div>

          {/* Right Card - Total Earned with Ring Chart */}
          <div style={{
            width: '288px',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#1E1E1E',
          }}>
            <p style={{ color: '#6b7280', fontSize: '22px', marginBottom: '16px', marginTop: 0 }}>total earned</p>
            {/* Ring Chart Placeholder */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="180" height="180" viewBox="0 0 180 180">
                <circle
                  cx="90"
                  cy="90"
                  r="70"
                  fill="none"
                  stroke="#2A2A2A"
                  strokeWidth="16"
                />
                <circle
                  cx="90"
                  cy="90"
                  r="70"
                  fill="none"
                  stroke="#2DD4BF"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray="330 440"
                  transform="rotate(-90 90 90)"
                />
              </svg>
            </div>
          </div>
        </div>
        <div style={{ width: '100%', height: '1px', backgroundColor: '#333', marginTop: '40px' }} />

        {/* cards section */}
        <div style={{ marginTop: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '24px', color: 'white', opacity: 0.6, margin: 0, marginBottom: '12px' }}>cards</h2>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {cards.map((card) => (
                <CreditCard key={card.card_id} card={card} onDelete={handleDeleteCard} />
              ))}
            </div>
        </div>
      </div>
    </div>
  )
}
