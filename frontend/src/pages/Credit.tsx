import { useState, useEffect } from 'react'
import Header from '../components/Header'
import { HiSparkles } from 'react-icons/hi2'
import { MdDelete, MdAdd, MdClose } from 'react-icons/md'

// Card color gradients matching Home.tsx
const CARD_COLORS: Record<string, string> = {
  visa: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6d28d9 100%)',
  mastercard: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  amex: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  discover: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  paypal: 'linear-gradient(135deg, #003087 0%, #009cde 100%)',
}

interface CardData {
  id: string
  category: string
  cardType: string
  cardName: string
  availableCredit: number
  expiryDate: string
  lastFour: string
  creditUtilization: number
  creditLimit: number
  currentBalance: number
  apr: number
  annualFee: number
  rewardsRate: string
  paymentDue: string
  minimumPayment: number
}

// Mock stats for portfolio (since we don't have real balance data yet)
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
    text: 'Based on your spending, consider adding',
    cardSuggestion: 'Chase Ink Business',
    textAfter: 'for 5x on office supplies and earning and rewards plus total earned card too.',
    summary:
      'You spent $1,200 on office supplies last month. The Chase Ink Business Cash card offers 5% cash back on the first $25,000 spent in combined purchases each account anniversary year.',
  },
]

const CARD_TYPES = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "amex", label: "American Express" },
  { value: "discover", label: "Discover" },
  { value: "paypal", label: "PayPal" },
]

export default function Credit() {
  const [creditCards, setCreditCards] = useState<CardData[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Form State
  const [cardNumber, setCardNumber] = useState("")
  const [expiration, setExpiration] = useState("")
  const [cvv, setCvv] = useState("")
  const [cardholder, setCardholder] = useState("")
  const [benefits, setBenefits] = useState("")
  const [cardType, setCardType] = useState("visa")
  const [billingAddress, setBillingAddress] = useState("")
  const [billingCity, setBillingCity] = useState("")
  const [billingState, setBillingState] = useState("")
  const [billingZip, setBillingZip] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchCards = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/cards?user_id=aman')
      const data = await response.json()

      if (data.cards) {
        const mappedCards = data.cards.map((card: any) => ({
          id: card.card_id,
          category: 'everyday use', // Default category for now
          cardType: (card.card_type || 'visa').toLowerCase(),
          cardName: card.nickname || `${card.card_type} Card`,
          // Mock financial data (since AP doesn't provide it yet)
          availableCredit: 9281.56,
          expiryDate: card.expiry || '12/28',
          lastFour: card.last_four || '0000',
          creditUtilization: Math.floor(Math.random() * 40) + 10,
          creditLimit: 15000,
          currentBalance: Math.floor(Math.random() * 5000) + 500,
          apr: 24.99,
          annualFee: 95,
          rewardsRate: card.benefits || '1% on all purchases',
          paymentDue: 'Feb 14',
          minimumPayment: 150,
        }))

        // Add static PayPal card (frontend only, no backend)
        const paypalCard: CardData = {
          id: 'paypal-static',
          category: 'digital wallet',
          cardType: 'paypal',
          cardName: 'PayPal',
          availableCredit: 0,
          expiryDate: 'N/A',
          lastFour: '',
          creditUtilization: 0,
          creditLimit: 0,
          currentBalance: 0,
          apr: 0,
          annualFee: 0,
          rewardsRate: 'Buyer Protection',
          paymentDue: 'N/A',
          minimumPayment: 0,
        }

        setCreditCards([...mappedCards, paypalCard])
      }
    } catch (error) {
      console.error('Failed to fetch cards:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCards()
  }, [])

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (cardNumber.length < 13) {
      setFormError("Please enter a valid card number")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch('http://localhost:5001/api/cards', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "aman",
          card_number: cardNumber,
          expiration,
          cvv,
          cardholder_name: cardholder,
          billing_address: billingAddress,
          billing_city: billingCity,
          billing_state: billingState,
          billing_zip: billingZip,
          card_type: cardType,
          benefits: benefits
        })
      })

      if (!res.ok) throw new Error("Failed to add card")

      // Reset form and close modal
      setCardNumber("")
      setExpiration("")
      setCvv("")
      setCardholder("")
      setBillingAddress("")
      setBillingCity("")
      setBillingState("")
      setBillingZip("")
      setBenefits("")
      setIsAddModalOpen(false)

      await fetchCards()
    } catch (err) {
      setFormError("Failed to save card. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm("Are you sure you want to delete this card?")) return

    try {
      const res = await fetch(`http://localhost:5001/api/cards/${cardId}?user_id=aman`, {
        method: "DELETE"
      })
      if (!res.ok) throw new Error("Failed to delete")
      await fetchCards()
    } catch (err) {
      console.error("Failed to delete card", err)
      alert("Failed to delete card")
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    backgroundColor: "#2A2A2A",
    border: "1px solid #333",
    borderRadius: "8px",
    color: "white",
    outline: "none",
    fontFamily: "inherit"
  }

  const labelStyle = {
    display: "block",
    fontSize: "12px",
    color: "#9ca3af",
    marginBottom: "6px",
    fontWeight: "500"
  }

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <Header title="credit portfolio" />

      {/* Portfolio Overview Section */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2
            style={{
              fontSize: '24px',
              color: 'white',
              opacity: 0.6,
              margin: 0,
            }}
          >
            manage and optimize your credit card portfolio
          </h2>
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              backgroundColor: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            <MdAdd size={20} />
            Add Card
          </button>
        </div>

        {/* 1:1 Grid: Avg Utilization and Recommended */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {/* Avg Utilization Card - Purple */}
          <div
            style={{
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
        </div>

        {/* Connected Dividers Section */}
        <div style={{ width: '100%', height: '1px', backgroundColor: '#333', marginTop: '32px' }} />

        {/* Credit Cards Grid with Vertical Divider */}
        {loading ? (
          <div style={{ color: 'white', padding: '40px', textAlign: 'center' }}>Loading cards...</div>
        ) : (
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
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
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
                        <MdDelete size={16} color="#ef4444" />
                      </button>

                    </div>
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
                      {card.cardType === 'paypal' ? (
                        <svg width="80" height="24" viewBox="0 0 101 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.237 2.8H4.437a.9.9 0 00-.89.76L.007 26.36a.54.54 0 00.53.62h3.87a.9.9 0 00.89-.76l.98-6.22a.9.9 0 01.89-.76h2.05c4.27 0 6.73-2.07 7.38-6.17.29-1.79.01-3.2-.84-4.19-.93-1.09-2.58-1.67-4.77-1.67zm.76 6.07c-.36 2.37-2.16 2.37-3.9 2.37h-.99l.69-4.39a.54.54 0 01.53-.45h.45c1.17 0 2.27 0 2.84.67.34.39.44 1 .38 1.8z" fill="white" />
                          <path d="M35.237 8.8h-3.87a.54.54 0 00-.53.45l-.14.88-.22-.32c-.68-.99-2.19-1.32-3.7-1.32-3.46 0-6.42 2.62-7 6.3-.3 1.84.13 3.6 1.17 4.84.96 1.14 2.33 1.61 3.96 1.61 2.8 0 4.36-1.8 4.36-1.8l-.14.88a.54.54 0 00.53.62h3.48a.9.9 0 00.89-.76l1.68-10.63a.54.54 0 00-.53-.62zm-5.38 6.03c-.3 1.79-1.7 2.99-3.48 2.99-.89 0-1.61-.29-2.08-.83-.47-.54-.64-1.31-.5-2.17.28-1.77 1.71-3.01 3.46-3.01.88 0 1.59.29 2.07.84.48.55.67 1.32.53 2.18z" fill="white" />
                          <path d="M55.337 8.8h-3.9a.9.9 0 00-.74.39l-4.27 6.29-1.81-6.05a.9.9 0 00-.86-.63h-3.83a.54.54 0 00-.51.71l3.42 10.04-3.21 4.53a.54.54 0 00.44.85h3.89a.9.9 0 00.73-.38l10.3-14.88a.54.54 0 00-.44-.85z" fill="white" />
                          <path d="M67.737 2.8h-7.8a.9.9 0 00-.89.76l-3.54 22.8a.54.54 0 00.53.62h4.08a.63.63 0 00.62-.53l1.01-6.42a.9.9 0 01.89-.76h2.05c4.27 0 6.73-2.07 7.38-6.17.29-1.79.01-3.2-.84-4.19-.93-1.09-2.58-1.67-4.77-1.67zm.76 6.07c-.36 2.37-2.16 2.37-3.9 2.37h-.99l.69-4.39a.54.54 0 01.53-.45h.45c1.17 0 2.27 0 2.84.67.34.39.44 1 .38 1.8z" fill="#009cde" />
                          <path d="M90.737 8.8h-3.87a.54.54 0 00-.53.45l-.14.88-.22-.32c-.68-.99-2.19-1.32-3.7-1.32-3.46 0-6.42 2.62-7 6.3-.3 1.84.13 3.6 1.17 4.84.96 1.14 2.33 1.61 3.96 1.61 2.8 0 4.36-1.8 4.36-1.8l-.14.88a.54.54 0 00.53.62h3.48a.9.9 0 00.89-.76l1.68-10.63a.54.54 0 00-.53-.62zm-5.38 6.03c-.3 1.79-1.7 2.99-3.48 2.99-.89 0-1.61-.29-2.08-.83-.47-.54-.64-1.31-.5-2.17.28-1.77 1.71-3.01 3.46-3.01.88 0 1.59.29 2.07.84.48.55.67 1.32.53 2.18z" fill="#009cde" />
                          <path d="M95.337 3.2l-3.59 22.9a.54.54 0 00.53.62h3.42a.9.9 0 00.89-.76l3.54-22.8a.54.54 0 00-.53-.62h-3.73a.54.54 0 00-.53.45z" fill="#009cde" />
                        </svg>
                      ) : (
                        <span style={{ fontSize: '16px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', fontStyle: 'italic' }}>
                          {card.cardType === 'amex' ? 'AMERICAN EXPRESS' : card.cardType.toUpperCase()}
                        </span>
                      )}
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
                    {card.cardType !== 'paypal' && (
                      <div style={{ display: 'flex', gap: '40px', marginBottom: '8px' }}>
                        <div>
                          <p style={{ fontSize: '11px', opacity: 0.7, margin: 0, marginBottom: '2px' }}>available credit</p>
                          <p style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>
                            {card.availableCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: '11px', opacity: 0.7, margin: 0, marginBottom: '2px' }}>expiry date</p>
                          <p style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>{card.expiryDate}</p>
                        </div>
                      </div>
                    )}
                    {card.cardType !== 'paypal' && (
                      <p style={{ fontSize: '16px', letterSpacing: '3px', margin: 0, fontFamily: 'monospace' }}>
                        **** **** **** {card.lastFour}
                      </p>
                    )}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ color: '#9ca3af', fontSize: '18px', margin: 0, fontWeight: '400' }}>
                      {card.category}
                    </h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
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
                        <MdDelete size={16} color="#ef4444" />
                      </button>
                    </div>
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
                      {card.cardType === 'paypal' ? (
                        <svg width="80" height="24" viewBox="0 0 101 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.237 2.8H4.437a.9.9 0 00-.89.76L.007 26.36a.54.54 0 00.53.62h3.87a.9.9 0 00.89-.76l.98-6.22a.9.9 0 01.89-.76h2.05c4.27 0 6.73-2.07 7.38-6.17.29-1.79.01-3.2-.84-4.19-.93-1.09-2.58-1.67-4.77-1.67zm.76 6.07c-.36 2.37-2.16 2.37-3.9 2.37h-.99l.69-4.39a.54.54 0 01.53-.45h.45c1.17 0 2.27 0 2.84.67.34.39.44 1 .38 1.8z" fill="white" />
                          <path d="M35.237 8.8h-3.87a.54.54 0 00-.53.45l-.14.88-.22-.32c-.68-.99-2.19-1.32-3.7-1.32-3.46 0-6.42 2.62-7 6.3-.3 1.84.13 3.6 1.17 4.84.96 1.14 2.33 1.61 3.96 1.61 2.8 0 4.36-1.8 4.36-1.8l-.14.88a.54.54 0 00.53.62h3.48a.9.9 0 00.89-.76l1.68-10.63a.54.54 0 00-.53-.62zm-5.38 6.03c-.3 1.79-1.7 2.99-3.48 2.99-.89 0-1.61-.29-2.08-.83-.47-.54-.64-1.31-.5-2.17.28-1.77 1.71-3.01 3.46-3.01.88 0 1.59.29 2.07.84.48.55.67 1.32.53 2.18z" fill="white" />
                          <path d="M55.337 8.8h-3.9a.9.9 0 00-.74.39l-4.27 6.29-1.81-6.05a.9.9 0 00-.86-.63h-3.83a.54.54 0 00-.51.71l3.42 10.04-3.21 4.53a.54.54 0 00.44.85h3.89a.9.9 0 00.73-.38l10.3-14.88a.54.54 0 00-.44-.85z" fill="white" />
                          <path d="M67.737 2.8h-7.8a.9.9 0 00-.89.76l-3.54 22.8a.54.54 0 00.53.62h4.08a.63.63 0 00.62-.53l1.01-6.42a.9.9 0 01.89-.76h2.05c4.27 0 6.73-2.07 7.38-6.17.29-1.79.01-3.2-.84-4.19-.93-1.09-2.58-1.67-4.77-1.67zm.76 6.07c-.36 2.37-2.16 2.37-3.9 2.37h-.99l.69-4.39a.54.54 0 01.53-.45h.45c1.17 0 2.27 0 2.84.67.34.39.44 1 .38 1.8z" fill="#009cde" />
                          <path d="M90.737 8.8h-3.87a.54.54 0 00-.53.45l-.14.88-.22-.32c-.68-.99-2.19-1.32-3.7-1.32-3.46 0-6.42 2.62-7 6.3-.3 1.84.13 3.6 1.17 4.84.96 1.14 2.33 1.61 3.96 1.61 2.8 0 4.36-1.8 4.36-1.8l-.14.88a.54.54 0 00.53.62h3.48a.9.9 0 00.89-.76l1.68-10.63a.54.54 0 00-.53-.62zm-5.38 6.03c-.3 1.79-1.7 2.99-3.48 2.99-.89 0-1.61-.29-2.08-.83-.47-.54-.64-1.31-.5-2.17.28-1.77 1.71-3.01 3.46-3.01.88 0 1.59.29 2.07.84.48.55.67 1.32.53 2.18z" fill="#009cde" />
                          <path d="M95.337 3.2l-3.59 22.9a.54.54 0 00.53.62h3.42a.9.9 0 00.89-.76l3.54-22.8a.54.54 0 00-.53-.62h-3.73a.54.54 0 00-.53.45z" fill="#009cde" />
                        </svg>
                      ) : (
                        <span style={{ fontSize: '16px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', fontStyle: 'italic' }}>
                          {card.cardType === 'amex' ? 'AMERICAN EXPRESS' : card.cardType.toUpperCase()}
                        </span>
                      )}
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
                    {card.cardType !== 'paypal' && (
                      <div style={{ display: 'flex', gap: '40px', marginBottom: '8px' }}>
                        <div>
                          <p style={{ fontSize: '11px', opacity: 0.7, margin: 0, marginBottom: '2px' }}>available credit</p>
                          <p style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>
                            {card.availableCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: '11px', opacity: 0.7, margin: 0, marginBottom: '2px' }}>expiry date</p>
                          <p style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>{card.expiryDate}</p>
                        </div>
                      </div>
                    )}
                    {card.cardType !== 'paypal' && (
                      <p style={{ fontSize: '16px', letterSpacing: '3px', margin: 0, fontFamily: 'monospace' }}>
                        **** **** **** {card.lastFour}
                      </p>
                    )}
                  </div>

                  <div style={{ height: '1px', backgroundColor: '#333', marginTop: '16px' }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div style={{ height: '50px' }} />

      {/* Add Card Modal */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '16px',
            padding: '24px',
            width: '100%',
            maxWidth: '500px',
            border: '1px solid #333'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '20px' }}>Add New Card</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
              >
                <MdClose size={24} />
              </button>
            </div>

            <form onSubmit={handleAddCard} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Card Type</label>
                  <select
                    value={cardType}
                    onChange={e => setCardType(e.target.value)}
                    style={inputStyle}
                  >
                    {CARD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Cardholder Name</label>
                  <input style={inputStyle} value={cardholder} onChange={e => setCardholder(e.target.value)} placeholder="John Doe" required />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Card Number</label>
                <input style={inputStyle} value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="4242 4242 4242 4242" maxLength={16} required />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Expiry (MM/YY)</label>
                  <input style={inputStyle} value={expiration} onChange={e => setExpiration(e.target.value)} placeholder="MM/YY" maxLength={5} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>CVV</label>
                  <input style={inputStyle} type="password" value={cvv} onChange={e => setCvv(e.target.value)} placeholder="123" maxLength={4} required />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Billing Address</label>
                <input style={inputStyle} value={billingAddress} onChange={e => setBillingAddress(e.target.value)} placeholder="123 Main St" required />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 2 }}>
                  <label style={labelStyle}>City</label>
                  <input style={inputStyle} value={billingCity} onChange={e => setBillingCity(e.target.value)} placeholder="City" required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>State</label>
                  <input style={inputStyle} value={billingState} onChange={e => setBillingState(e.target.value)} placeholder="ST" maxLength={2} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Zip</label>
                  <input style={inputStyle} value={billingZip} onChange={e => setBillingZip(e.target.value)} placeholder="10001" maxLength={5} required />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Card Benefits</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                  value={benefits}
                  onChange={e => setBenefits(e.target.value)}
                  placeholder="e.g. 4x on Dining, 3x on Travel..."
                />
              </div>

              {formError && <div style={{ color: '#ef4444', fontSize: '13px' }}>{formError}</div>}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: '16px',
                  padding: '14px',
                  backgroundColor: isSubmitting ? '#555' : '#7c3aed',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '16px'
                }}
              >
                {isSubmitting ? "Processing..." : "Save Securely"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
