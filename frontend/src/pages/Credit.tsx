import Header from '../components/Header'
import { HiSparkles } from 'react-icons/hi2'
import { MdEdit } from 'react-icons/md'

// Card color gradients matching Home.tsx
const CARD_COLORS: Record<string, string> = {
  visa: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6d28d9 100%)',
  mastercard: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  amex: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  discover: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
}

// Mock credit card data
const creditCards = [
  {
    id: '1',
    category: 'dining and commute',
    cardType: 'visa',
    cardName: 'Chase Sapphire Reserve',
    availableCredit: 9281.56,
    expiryDate: '02/30',
    lastFour: '4567',
    creditUtilization: 14.7,
    creditLimit: 25000,
    currentBalance: 3420,
    apr: 22.99,
    annualFee: 550,
    rewardsRate: '3x on travel & dining',
    paymentDue: 'Feb 14',
    minimumPayment: 150,
  },
  {
    id: '2',
    category: 'everyday use',
    cardType: 'amex',
    cardName: 'American Express Gold',
    availableCredit: 9281.56,
    expiryDate: '02/30',
    lastFour: '8901',
    creditUtilization: 35.2,
    creditLimit: 15000,
    currentBalance: 5280,
    apr: 19.99,
    annualFee: 0,
    rewardsRate: '1.5% on all purchases',
    paymentDue: 'Feb 17',
    minimumPayment: 80,
  },
  {
    id: '3',
    category: 'gas and groceries',
    cardType: 'visa',
    cardName: 'Chase Sapphire Reserve',
    availableCredit: 9281.56,
    expiryDate: '02/30',
    lastFour: '4567',
    creditUtilization: 13.2,
    creditLimit: 25000,
    currentBalance: 1580,
    apr: 21.99,
    annualFee: 250,
    rewardsRate: '2% on gas & groceries',
    paymentDue: 'Feb 14',
    minimumPayment: 150,
  },
  {
    id: '4',
    category: 'everyday use',
    cardType: 'amex',
    cardName: 'American Express Gold',
    availableCredit: 9281.56,
    expiryDate: '02/30',
    lastFour: '8901',
    creditUtilization: 35.2,
    creditLimit: 15000,
    currentBalance: 5280,
    apr: 19.99,
    annualFee: 0,
    rewardsRate: '1.5% on all purchases',
    paymentDue: 'Feb 17',
    minimumPayment: 80,
  },
]

// Mock data - will be replaced by API calls later
const portfolioStats = {
  avgUtilization: 26.7,
  utilizationStatus: 'healthy range',
  totalCreditLimit: 72000.0,
  activeCards: 4,
  availablePercent: 73.3,
  totalBalance: -19230.29,
  usedPercent: 27.7,
}

const aiRecommendations = [
  {
    id: 1,
    text: 'Your Amex Gold utilization is at 44.8%. Consider paying down $3,000 to optimize your credit score. This could improve your score by 15-20 points.',
    summary:
      'skasjdjasodjsaoijdosajjdsaoidjoasjdosjdosaidjnasdoioqjwnqijndwqjodnwqoinwqoidwqjnwqodjwnqdwoiqdwjoqwqdijowqdqoijwqdijowqdijwdqojjwdqojjwdqijowqdiijodwqijwdiq_jowidojqdwijodwijoiqwdjoijoqdwijodwiowjdqdwquhiy6fdresrdtfyguhigyftdresrrxtcfygvuhjjohugyfтdrsedtyguhijohugyfтdrfguhijohugyfтughijohugуf',
  },
  {
    id: 2,
    text: 'Based on your spending, consider adding',
    cardSuggestion: 'Chase Ink Business',
    textAfter: 'for 5x on office supplies.',
    summary:
      'skasjdjasodjsaoijdosajjdsaoidjoasjdosjdosaidjnasdoioqjwnqijndwqjodnwqoinwqoidwqjnwqodjwnqdwoiqdwjoqwqdijowqdqoijwqdijowqdijwdqojjwdqojjwdqijowqdiijodwqijwdiq_jowidojqdwijodwijoiqwdjoijoqdwijodwiowjdqdwquhiy6fdresrdtfyguhigyftdresrrxtcfygvuhjjohugyfтdrsedtyguhijohugyfтdrfguhijohugyfтughijohugуf',
  },
]

export default function Credit() {
  return (
    <div style={{ width: '100%' }}>
      <Header title="credit portfolio" />

      {/* Portfolio Overview Section */}
      <div style={{ marginTop: '20px' }}>
        <h2
          style={{
            fontSize: '24px',
            color: 'white',
            opacity: 0.6,
            margin: 0,
            marginBottom: '20px',
          }}
        >
          manage and optimize your credit card portfolio
        </h2>

        {/* Stats Cards Row */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          {/* Avg Utilization Card - Purple */}
          <div
            style={{
              flex: 1,
              borderRadius: '16px',
              padding: '24px',
              background: 'linear-gradient(160deg, #2d1f4a 0%, #1a1525 30%, #121212 70%)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }}
          >
            <p style={{ color: '#9ca3af', fontSize: '16px', margin: 0, marginBottom: '12px' }}>
              avg utilization
            </p>
            <p style={{ color: '#A78BFA', fontSize: '32px', fontWeight: '600', margin: 0, marginBottom: '8px' }}>
              {portfolioStats.avgUtilization}%
            </p>
            <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
              {portfolioStats.utilizationStatus}
            </p>
          </div>

          {/* Total Credit Limit Card - Teal/Green */}
          <div
            style={{
              flex: 1.2,
              borderRadius: '16px',
              padding: '24px',
              background: 'linear-gradient(160deg, #0d2d2d 0%, #0a1f1f 30%, #121212 70%)',
              border: '1px solid rgba(45, 212, 191, 0.2)',
            }}
          >
            <p style={{ color: '#9ca3af', fontSize: '16px', margin: 0, marginBottom: '12px' }}>
              total credit limit
            </p>
            <p style={{ color: '#2DD4BF', fontSize: '32px', fontWeight: '600', margin: 0, marginBottom: '8px' }}>
              ${' '}
              {portfolioStats.totalCreditLimit.toLocaleString('en-US', {
                minimumFractionDigits: 2,
              })}
            </p>
            <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
              {portfolioStats.activeCards} active cards
            </p>
            <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0, marginTop: '2px' }}>
              {portfolioStats.availablePercent}% available
            </p>
          </div>

          {/* Total Balance Card - Purple */}
          <div
            style={{
              flex: 1,
              borderRadius: '16px',
              padding: '24px',
              background: 'linear-gradient(160deg, #2d1f4a 0%, #1a1525 30%, #121212 70%)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }}
          >
            <p style={{ color: '#9ca3af', fontSize: '16px', margin: 0, marginBottom: '12px' }}>
              total balance
            </p>
            <p style={{ color: '#A78BFA', fontSize: '32px', fontWeight: '600', margin: 0, marginBottom: '8px' }}>
              -${' '}
              {Math.abs(portfolioStats.totalBalance).toLocaleString('en-US', {
                minimumFractionDigits: 2,
              })}
            </p>
            <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
              across all cards
            </p>
            <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0, marginTop: '2px' }}>
              {portfolioStats.usedPercent}% used
            </p>
          </div>
        </div>

        {/* AI Recommended Section */}
        <div
          style={{
            borderRadius: '16px',
            padding: '24px',
            background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.15) 0%, rgba(45, 212, 191, 0.1) 50%, rgba(139, 92, 246, 0.15) 100%), #121212',
            border: '1px solid rgba(139, 92, 246, 0.2)',
          }}
        >
          {/* AI Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <HiSparkles style={{ color: '#8B5CF6', fontSize: '20px' }} />
            <span style={{ color: '#8B5CF6', fontSize: '20px', fontWeight: '500' }}>
              recommended
            </span>
          </div>

          {/* Recommendations */}
          {aiRecommendations.map((rec, index) => (
            <div key={rec.id} style={{ marginBottom: index < aiRecommendations.length - 1 ? '24px' : 0 }}>
              <p
                style={{
                  color: '#fff',
                  fontSize: '18px',
                  fontWeight: '600',
                  margin: 0,
                  marginBottom: '8px',
                  lineHeight: '1.5',
                }}
              >
                {rec.cardSuggestion ? (
                  <>
                    {rec.text}{' '}
                    <span style={{ color: '#2DD4BF', textDecoration: 'underline' }}>
                      {rec.cardSuggestion}
                    </span>{' '}
                    {rec.textAfter}
                  </>
                ) : (
                  rec.text
                )}
              </p>
              <p
                style={{
                  color: '#4b5563',
                  fontSize: '13px',
                  fontWeight: '400',
                  margin: 0,
                  lineHeight: '1.4',
                  wordBreak: 'break-all',
                }}
              >
                {rec.summary}
              </p>
            </div>
          ))}
        </div>

        {/* Connected Dividers Section */}
        <div style={{ width: '100%', height: '1px', backgroundColor: '#333', marginTop: '32px' }} />

        {/* Credit Cards Grid with Vertical Divider */}
        <div
          style={{
            display: 'flex',
            gap: '0',
            marginTop: '32px',
          }}
        >
          {/* Left Column */}
          <div style={{ flex: 1, paddingRight: '24px' }}>
            {creditCards.filter((_, i) => i % 2 === 0).map((card) => (
              <div key={card.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {/* Category Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ color: '#9ca3af', fontSize: '18px', margin: 0, fontWeight: '400' }}>
                    {card.category}
                  </h3>
                  <button
                    style={{
                      background: '#2A2A2A',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MdEdit size={16} color="#6b7280" />
                  </button>
                </div>

                {/* Credit Card Visual */}
                <div
                  style={{
                    background: CARD_COLORS[card.cardType] || CARD_COLORS.visa,
                    borderRadius: '16px',
                    padding: '20px',
                    color: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', fontStyle: 'italic' }}>
                      {card.cardType === 'amex' ? 'AMERICAN EXPRESS' : card.cardType.toUpperCase()}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        backgroundColor: 'rgba(45, 212, 191, 0.3)',
                        color: '#2DD4BF',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>✓</span> enrolled
                    </span>
                  </div>
                  <h4 style={{ fontSize: '24px', fontWeight: '600', margin: '0 0 12px 0' }}>{card.cardName}</h4>
                  <div style={{ display: 'flex', gap: '40px', marginBottom: '8px' }}>
                    <div>
                      <p style={{ fontSize: '11px', opacity: 0.7, margin: 0, marginBottom: '2px' }}>available credit</p>
                      <p style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>
                        ${card.availableCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', opacity: 0.7, margin: 0, marginBottom: '2px' }}>expiry date</p>
                      <p style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>{card.expiryDate}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: '16px', letterSpacing: '3px', margin: 0, fontFamily: 'monospace' }}>
                    **** **** **** {card.lastFour}
                  </p>
                </div>

                {/* Credit Utilization */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>credit utilization</span>
                  <span style={{ color: card.creditUtilization > 30 ? '#f59e0b' : '#2DD4BF', fontSize: '14px', fontWeight: '500' }}>
                    {card.creditUtilization}%
                  </span>
                </div>
                <div style={{ height: '4px', backgroundColor: '#2A2A2A', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${card.creditUtilization}%`, height: '100%', backgroundColor: card.creditUtilization > 30 ? '#f59e0b' : '#2DD4BF', borderRadius: '2px' }} />
                </div>

                {/* Credit Limit & Current Balance / APR & Annual Fee */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
                  {/* Left Column */}
                  <div>
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ color: '#6b7280', fontSize: '13px', margin: 0, marginBottom: '4px' }}>credit limit</p>
                      <p style={{ color: '#fff', fontSize: '18px', fontWeight: '600', margin: 0 }}>$ {card.creditLimit.toLocaleString()}</p>
                    </div>
                    <div>
                      <p style={{ color: '#6b7280', fontSize: '13px', margin: 0, marginBottom: '4px' }}>apr</p>
                      <p style={{ color: '#fff', fontSize: '18px', fontWeight: '600', margin: 0 }}>{card.apr}%</p>
                    </div>
                  </div>
                  
                  {/* Right Column */}
                  <div>
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ color: '#6b7280', fontSize: '13px', margin: 0, marginBottom: '4px' }}>current balance</p>
                      <p style={{ color: '#A78BFA', fontSize: '18px', fontWeight: '600', margin: 0 }}>$ {card.currentBalance.toLocaleString()}</p>
                    </div>
                    <div>
                      <p style={{ color: '#6b7280', fontSize: '13px', margin: 0, marginBottom: '4px' }}>annual fee</p>
                      <p style={{ color: '#fff', fontSize: '18px', fontWeight: '600', margin: 0 }}>$ {card.annualFee}</p>
                    </div>
                  </div>
                </div>

                {/* Rewards Rate */}
                <div style={{ backgroundColor: '#1E1E1E', borderRadius: '12px', padding: '12px 16px', marginTop: '4px' }}>
                  <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>rewards rate</p>
                  <p style={{ color: '#2DD4BF', fontSize: '16px', fontWeight: '600', margin: 0 }}>{card.rewardsRate}</p>
                </div>

                {/* Payment Due & Minimum */}
                <div style={{ backgroundColor: '#1E1E1E', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>payment due</p>
                    <p style={{ color: '#fff', fontSize: '16px', fontWeight: '600', margin: 0 }}>{card.paymentDue}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>minimum</p>
                    <p style={{ color: '#fff', fontSize: '16px', fontWeight: '600', margin: 0 }}>${card.minimumPayment}</p>
                  </div>
                </div>

                {/* Card Divider */}
                <div style={{ height: '1px', backgroundColor: '#333', marginTop: '16px' }} />
              </div>
            ))}
          </div>

          {/* Vertical Divider */}
          <div style={{ width: '1px', backgroundColor: '#333', flexShrink: 0 }} />

          {/* Right Column */}
          <div style={{ flex: 1, paddingLeft: '24px' }}>
            {creditCards.filter((_, i) => i % 2 === 1).map((card) => (
              <div key={card.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {/* Category Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ color: '#9ca3af', fontSize: '18px', margin: 0, fontWeight: '400' }}>
                    {card.category}
                  </h3>
                  <button
                    style={{
                      background: '#2A2A2A',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MdEdit size={16} color="#6b7280" />
                  </button>
                </div>

                {/* Credit Card Visual */}
                <div
                  style={{
                    background: CARD_COLORS[card.cardType] || CARD_COLORS.visa,
                    borderRadius: '16px',
                    padding: '20px',
                    color: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', fontStyle: 'italic' }}>
                      {card.cardType === 'amex' ? 'AMERICAN EXPRESS' : card.cardType.toUpperCase()}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        backgroundColor: 'rgba(45, 212, 191, 0.3)',
                        color: '#2DD4BF',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>✓</span> enrolled
                    </span>
                  </div>
                  <h4 style={{ fontSize: '24px', fontWeight: '600', margin: '0 0 12px 0' }}>{card.cardName}</h4>
                  <div style={{ display: 'flex', gap: '40px', marginBottom: '8px' }}>
                    <div>
                      <p style={{ fontSize: '11px', opacity: 0.7, margin: 0, marginBottom: '2px' }}>available credit</p>
                      <p style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>
                        ${card.availableCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', opacity: 0.7, margin: 0, marginBottom: '2px' }}>expiry date</p>
                      <p style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>{card.expiryDate}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: '16px', letterSpacing: '3px', margin: 0, fontFamily: 'monospace' }}>
                    **** **** **** {card.lastFour}
                  </p>
                </div>

                {/* Credit Utilization */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>credit utilization</span>
                  <span style={{ color: card.creditUtilization > 30 ? '#f59e0b' : '#2DD4BF', fontSize: '14px', fontWeight: '500' }}>
                    {card.creditUtilization}%
                  </span>
                </div>
                <div style={{ height: '4px', backgroundColor: '#2A2A2A', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${card.creditUtilization}%`, height: '100%', backgroundColor: card.creditUtilization > 30 ? '#f59e0b' : '#2DD4BF', borderRadius: '2px' }} />
                </div>

                {/* Credit Limit & Current Balance / APR & Annual Fee */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
                  {/* Left Column */}
                  <div>
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ color: '#6b7280', fontSize: '13px', margin: 0, marginBottom: '4px' }}>credit limit</p>
                      <p style={{ color: '#fff', fontSize: '18px', fontWeight: '600', margin: 0 }}>$ {card.creditLimit.toLocaleString()}</p>
                    </div>
                    <div>
                      <p style={{ color: '#6b7280', fontSize: '13px', margin: 0, marginBottom: '4px' }}>apr</p>
                      <p style={{ color: '#fff', fontSize: '18px', fontWeight: '600', margin: 0 }}>{card.apr}%</p>
                    </div>
                  </div>
                  
                  {/* Right Column */}
                  <div>
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ color: '#6b7280', fontSize: '13px', margin: 0, marginBottom: '4px' }}>current balance</p>
                      <p style={{ color: '#A78BFA', fontSize: '18px', fontWeight: '600', margin: 0 }}>$ {card.currentBalance.toLocaleString()}</p>
                    </div>
                    <div>
                      <p style={{ color: '#6b7280', fontSize: '13px', margin: 0, marginBottom: '4px' }}>annual fee</p>
                      <p style={{ color: '#fff', fontSize: '18px', fontWeight: '600', margin: 0 }}>$ {card.annualFee}</p>
                    </div>
                  </div>
                </div>

                {/* Rewards Rate */}
                <div style={{ backgroundColor: '#1E1E1E', borderRadius: '12px', padding: '12px 16px', marginTop: '4px' }}>
                  <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>rewards rate</p>
                  <p style={{ color: '#2DD4BF', fontSize: '16px', fontWeight: '600', margin: 0 }}>{card.rewardsRate}</p>
                </div>

                {/* Payment Due & Minimum */}
                <div style={{ backgroundColor: '#1E1E1E', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>payment due</p>
                    <p style={{ color: '#fff', fontSize: '16px', fontWeight: '600', margin: 0 }}>{card.paymentDue}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>minimum</p>
                    <p style={{ color: '#fff', fontSize: '16px', fontWeight: '600', margin: 0 }}>${card.minimumPayment}</p>
                  </div>
                </div>

                {/* Card Divider */}
                <div style={{ height: '1px', backgroundColor: '#333', marginTop: '16px' }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Spacer */}
      <div style={{ height: '1px' }} />
    </div>
  )
}