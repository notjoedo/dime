import { useState, useEffect } from 'react'
import Header from '../components/Header'
import { MdChevronLeft, MdChevronRight, MdAdd, MdClose } from 'react-icons/md'

// Import SVG icons
import PrimeIcon from '../public/Prime.svg'
import HBOIcon from '../public/HBO.svg'
import UberEatsIcon from '../public/UberEats.svg'
import CoinbaseIcon from '../public/Coinbase.svg'
import SpotifyIcon from '../public/Spotify.svg'
import GrubhubIcon from '../public/Grubhub.svg'
import LyftIcon from '../public/Lyft.svg'

// Icon mapping for dynamic transactions
const MERCHANT_ICONS: Record<string, string> = {
  'Prime Video': PrimeIcon,
  'HBO Max': HBOIcon,
  'Lyft': LyftIcon,
  'Uber Eats': UberEatsIcon,
  'Coinbase': CoinbaseIcon,
  'Spotify': SpotifyIcon,
  'Grubhub': GrubhubIcon,
}

// Types for dynamic data
interface Transaction {
  id: string
  name: string
  date: string
  amount: number
  icon?: string
}

interface CardData {
  card_id: string
  card_type: string
  last_four: string
  expiration: string
  cardholder: string
  balance: number
  status: string
  currency: string
}

// Sample data - replace with API calls
const initialCards: CardData[] = [
  {
    card_id: '1',
    card_type: 'visa',
    last_four: '1234',
    expiration: '02/30',
    cardholder: 'Joe Do',
    balance: 9281.56,
    status: 'Active',
    currency: 'USD',
  },
  {
    card_id: '2',
    card_type: 'mastercard',
    last_four: '5678',
    expiration: '08/27',
    cardholder: 'Joe Do',
    balance: 4520.00,
    status: 'Active',
    currency: 'USD',
  },
  {
    card_id: '3',
    card_type: 'amex',
    last_four: '9012',
    expiration: '11/26',
    cardholder: 'Joe Do',
    balance: 12450.75,
    status: 'Active',
    currency: 'USD',
  },
]

const initialRecentTransactions: Transaction[] = [
  { id: '1', name: 'Spotify', date: '01.31.26', amount: -48.51 },
  { id: '2', name: 'Spotify', date: '01.31.26', amount: -48.51 },
]

const initialEarningsTransactions: Transaction[] = [
  { id: '1', name: 'Spotify', date: '01.31.26', amount: -48.51 },
  { id: '2', name: 'Spotify', date: '01.31.26', amount: -48.51 },
]

const CARD_COLORS: Record<string, string> = {
  visa: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6d28d9 100%)',
  mastercard: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  amex: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  discover: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  paypal: 'linear-gradient(135deg, #003087 0%, #009cde 100%)',
  other: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
}

const CARD_TYPES = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'amex', label: 'American Express' },
  { value: 'discover', label: 'Discover' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'other', label: 'Other' },
]

export default function Home() {
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showAddCardModal, setShowAddCardModal] = useState(false)

  // Dynamic data state - populated from backend
  const [cards, setCards] = useState<CardData[]>(initialCards)
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(initialRecentTransactions)
  const [earningsTransactions, setEarningsTransactions] = useState<Transaction[]>(initialEarningsTransactions)

  // Fetch cards from API on mount
  useEffect(() => {
    const fetchCards = async () => {
      try {
        const API_URL = 'http://localhost:5001/api'
        const res = await fetch(`${API_URL}/cards?user_id=aman`)
        const data = await res.json()
        if (data.cards && data.cards.length > 0) {
          // Transform API data to match CardData interface
          const apiCards: CardData[] = data.cards.map((card: any) => ({
            card_id: card.card_id,
            card_type: card.card_type?.toLowerCase() || 'visa',
            last_four: card.last_four,
            expiration: card.expiration,
            cardholder: card.cardholder || 'Unknown',
            balance: 0, // API doesn't return balance, default to 0
            status: 'Active',
            currency: 'USD',
          }))
          setCards(apiCards)
        }
      } catch (err) {
        console.error('Failed to fetch cards:', err)
        // Keep initial cards on error
      }
    }
    fetchCards()
  }, [])

  // Graph data - can be populated from backend
  const [avgUtilization, setAvgUtilization] = useState(69) // percentage
  const [totalEarned, setTotalEarned] = useState(77) // percentage
  const [totalEarnedAmount, setTotalEarnedAmount] = useState(1250.00)

  // Form state for add card modal
  const [cardNumber, setCardNumber] = useState('')
  const [expiration, setExpiration] = useState('')
  const [cvv, setCvv] = useState('')
  const [cardholder, setCardholder] = useState('')
  const [cardType, setCardType] = useState('visa')
  const [benefits, setBenefits] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [billingCity, setBillingCity] = useState('')
  const [billingState, setBillingState] = useState('')
  const [billingZip, setBillingZip] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const nextCard = () => {
    setCurrentCardIndex((prev) => (prev + 1) % cards.length)
  }

  const prevCard = () => {
    setCurrentCardIndex((prev) => (prev - 1 + cards.length) % cards.length)
  }

  const currentCard = cards[currentCardIndex]

  // Calculate stroke dasharray for ring charts
  const circumference = 2 * Math.PI * 60 // for small charts (r=60)
  const utilizationDash = (avgUtilization / 100) * circumference
  const earnedDash = (totalEarned / 100) * circumference

  const circumferenceLarge = 2 * Math.PI * 80 // for large chart (r=80)
  const earnedDashLarge = (totalEarned / 100) * circumferenceLarge

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (cardNumber.length < 13) {
      setFormError('Please enter a valid card number')
      return
    }

    try {
      setFormLoading(true)

      // API call to add card - replace with your actual API endpoint
      const API_URL = 'http://localhost:5001/api'
      const res = await fetch(`${API_URL}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'aman',
          card_number: cardNumber,
          expiration,
          cvv,
          cardholder_name: cardholder,
          billing_address: billingAddress,
          billing_city: billingCity,
          billing_state: billingState,
          billing_zip: billingZip,
          card_type: cardType,
          benefits: benefits,
        }),
      })

      if (!res.ok) throw new Error('Failed to add card')

      // Add card locally for immediate feedback
      const newCard: CardData = {
        card_id: Date.now().toString(),
        card_type: cardType,
        last_four: cardNumber.slice(-4),
        expiration,
        cardholder,
        balance: 0,
        status: 'Active',
        currency: 'USD',
      }
      setCards((prev) => [...prev, newCard])

      // Reset form
      resetForm()
      setShowAddCardModal(false)
    } catch (err) {
      setFormError('Failed to save card. Please try again.')
    } finally {
      setFormLoading(false)
    }
  }

  const resetForm = () => {
    setCardNumber('')
    setExpiration('')
    setCvv('')
    setCardholder('')
    setBenefits('')
    setBillingAddress('')
    setBillingCity('')
    setBillingState('')
    setBillingZip('')
    setCardType('visa')
    setFormError(null)
  }

  const getTransactionIcon = (name: string) => {
    return MERCHANT_ICONS[name] || SpotifyIcon
  }

  return (
    <div style={{ width: '100%' }}>
      <Header title="dashboard" />

      {/* Add Card Modal */}
      {showAddCardModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowAddCardModal(false)}
        >
          <div
            style={{
              backgroundColor: '#1E1E1E',
              borderRadius: '20px',
              padding: '32px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: '#fff', fontSize: '24px', margin: 0 }}>add new card</h2>
              <button
                onClick={() => setShowAddCardModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <MdClose size={24} />
              </button>
            </div>

            {/* Card Form */}
            <form onSubmit={handleAddCard} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Card Type & Cardholder */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>card type</label>
                  <select
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value)}
                    style={inputStyle}
                  >
                    {CARD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 2 }}>
                  <label style={labelStyle}>cardholder name</label>
                  <input
                    type="text"
                    value={cardholder}
                    onChange={(e) => setCardholder(e.target.value)}
                    placeholder="John Doe"
                    style={inputStyle}
                    required
                  />
                </div>
              </div>

              {/* Card Number */}
              <div>
                <label style={labelStyle}>card number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="4242 4242 4242 4242"
                  style={inputStyle}
                  maxLength={16}
                  required
                />
              </div>

              {/* Expiration & CVV */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>expiration (MM/YY)</label>
                  <input
                    type="text"
                    value={expiration}
                    onChange={(e) => setExpiration(e.target.value)}
                    placeholder="MM/YY"
                    style={inputStyle}
                    maxLength={5}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>cvv</label>
                  <input
                    type="password"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder="123"
                    style={inputStyle}
                    maxLength={4}
                    required
                  />
                </div>
              </div>

              {/* Billing Address */}
              <div style={{ borderTop: '1px solid #333', marginTop: '8px', paddingTop: '16px' }}>
                <label style={labelStyle}>billing street address</label>
                <input
                  type="text"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="123 Main St"
                  style={inputStyle}
                  required
                />
              </div>

              {/* City, State, Zip */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 2 }}>
                  <label style={labelStyle}>city</label>
                  <input
                    type="text"
                    value={billingCity}
                    onChange={(e) => setBillingCity(e.target.value)}
                    placeholder="New York"
                    style={inputStyle}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>state</label>
                  <input
                    type="text"
                    value={billingState}
                    onChange={(e) => setBillingState(e.target.value)}
                    placeholder="NY"
                    style={inputStyle}
                    maxLength={2}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>zip</label>
                  <input
                    type="text"
                    value={billingZip}
                    onChange={(e) => setBillingZip(e.target.value)}
                    placeholder="10001"
                    style={inputStyle}
                    maxLength={5}
                    required
                  />
                </div>
              </div>

              {/* Benefits */}
              <div>
                <label style={labelStyle}>card benefits (optional)</label>
                <textarea
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                  placeholder="e.g. 3% cashback on dining..."
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              {/* Error Message */}
              {formError && (
                <div style={{ color: '#ef4444', fontSize: '14px' }}>{formError}</div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={formLoading}
                style={{
                  marginTop: '8px',
                  padding: '14px',
                  backgroundColor: formLoading ? '#666' : '#8B5CF6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: formLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {formLoading ? 'processing...' : 'securely save card'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* expenses tracker section */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '24px', color: 'white', opacity: 0.6, margin: 0, marginBottom: '12px' }}>expenses tracker</h2>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1, borderRadius: '16px', padding: '20px', backgroundColor: '#1E1E1E' }}>
            <p style={{ color: '#6b7280', fontSize: '22px', marginBottom: '16px', marginTop: 0 }}>spending & income trend</p>
            <div style={{ width: '100%', height: '192px', borderRadius: '16px', backgroundColor: '#2A2A2A' }} />
          </div>

          {/* Avg Utilization - Dynamic */}
          <div style={{ width: '240px', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', backgroundColor: '#1E1E1E' }}>
            <p style={{ color: '#6b7280', fontSize: '22px', marginBottom: '16px', marginTop: 0 }}>avg. utilization</p>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="60" fill="none" stroke="#2A2A2A" strokeWidth="14" />
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${utilizationDash} ${circumference}`}
                  transform="rotate(-90 80 80)"
                />
              </svg>
            </div>
          </div>

          {/* Total Earned - Dynamic */}
          <div style={{ width: '240px', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', backgroundColor: '#1E1E1E' }}>
            <p style={{ color: '#6b7280', fontSize: '22px', marginBottom: '16px', marginTop: 0 }}>by category</p>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="60" fill="none" stroke="#2A2A2A" strokeWidth="14" />
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  fill="none"
                  stroke="#2DD4BF"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${earnedDash} ${circumference}`}
                  transform="rotate(-90 80 80)"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Cards Section */}
        <div style={{ marginTop: '40px', display: 'flex' }}>
          {/* Left Column - Cards */}
          <div style={{ width: '400px', flexShrink: 0, borderTop: '1px solid #333', paddingTop: '20px', paddingRight: '40px' }}>
            {/* Cards Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '24px', color: 'white', opacity: 0.6, margin: 0 }}>cards</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={prevCard}
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
                    color: '#fff',
                  }}
                >
                  <MdChevronLeft size={20} />
                </button>
                <button
                  onClick={nextCard}
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
                    color: '#fff',
                  }}
                >
                  <MdChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Stacked Cards Display */}
            <div style={{ position: 'relative', height: '240px', marginBottom: '24px' }}>
              {cards.map((card, index) => {
                const offset = (index - currentCardIndex + cards.length) % cards.length
                const isVisible = offset <= 2
                if (!isVisible) return null

                return (
                  <div
                    key={card.card_id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      zIndex: cards.length - offset,
                      opacity: offset === 0 ? 1 : 0.7 - offset * 0.2,
                      transform: `translateY(${offset * 16}px) scale(${1 - offset * 0.04})`,
                      transformOrigin: 'top center',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <div
                      style={{
                        background: CARD_COLORS[card.card_type] || CARD_COLORS.other,
                        borderRadius: '20px',
                        padding: '24px',
                        color: '#fff',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <span style={{ fontSize: '28px', fontWeight: '600' }}>${card.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        <span style={{ fontSize: '20px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px' }}>
                          {card.card_type}
                        </span>
                      </div>
                      <div style={{ fontSize: '20px', letterSpacing: '4px', marginBottom: '24px', fontFamily: 'monospace' }}>
                        **** **** **** {card.last_four}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '10px', opacity: 0.7, letterSpacing: '1px' }}>cardholder name</div>
                          <div style={{ fontSize: '16px', fontWeight: '500', marginTop: '4px' }}>{card.cardholder}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '10px', opacity: 0.7, letterSpacing: '1px' }}>expiry date</div>
                          <div style={{ fontSize: '16px', fontWeight: '500', marginTop: '4px' }}>{card.expiration}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination Dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px', marginTop: '-24px' }}>
              {cards.map((_, index) => (
                <div
                  key={index}
                  onClick={() => setCurrentCardIndex(index)}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: index === currentCardIndex ? '#8B5CF6' : '#444',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s ease',
                  }}
                />
              ))}
            </div>

            {/* Card Info Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '20px', color: 'white', opacity: 0.6, margin: 0 }}>card info</h3>
              <button
                onClick={() => setShowAddCardModal(true)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  border: '1px solid #444',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#888',
                }}
              >
                <MdAdd size={18} />
              </button>
            </div>

            {/* Card Info */}
            <div
              style={{
                backgroundColor: '#1E1E1E',
                borderRadius: '16px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #333' }}>
                <span style={{ color: '#6b7280', fontSize: '16px' }}>status</span>
                <span style={{ color: '#fff', fontSize: '16px' }}>{currentCard?.status || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #333' }}>
                <span style={{ color: '#6b7280', fontSize: '16px' }}>currency</span>
                <span style={{ color: '#fff', fontSize: '16px' }}>{currentCard?.currency || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #333' }}>
                <span style={{ color: '#6b7280', fontSize: '16px' }}>balance</span>
                <span style={{ color: '#fff', fontSize: '16px' }}>${currentCard?.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#8B5CF6',
                    border: 'none',
                    borderRadius: '9999px',
                    color: '#000',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontWeight: '1000',
                  }}
                >
                  make payment
                </button>
                <button
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#3a3a3a',
                    border: 'none',
                    borderRadius: '9999px',
                    color: '#fff',
                    fontSize: '16px',
                    cursor: 'pointer',
                  }}
                >
                  details
                </button>
              </div>
            </div>

            {/* Lorem Ipsum Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '20px', color: 'white', opacity: 0.6, margin: 0 }}>lorum ipsum</h3>
              <button
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2A2A2A',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                learn more
              </button>
            </div>

            {/* Info Cards */}
            <div
              style={{
                backgroundColor: '#1E1E1E',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #333' }}>
                <span style={{ color: '#6b7280', fontSize: '16px' }}>current best category</span>
                <span style={{ color: '#06b6d4', fontSize: '16px', fontWeight: '500' }}>Dining - 3x</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                <span style={{ color: '#6b7280', fontSize: '16px' }}>current subscriptions</span>
                <span style={{ color: '#fff', fontSize: '16px' }}>13 actives</span>
              </div>
            </div>

            {/* Recommended Section */}
            <div
              style={{
                backgroundColor: '#1E1E1E',
                borderRadius: '16px',
                padding: '16px',
                borderLeft: '4px solid #06b6d4',
              }}
            >
              <p style={{ color: '#06b6d4', fontSize: '16px', margin: '0 0 8px 0', fontWeight: '500' }}>recommended</p>
              <p style={{ color: '#fff', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>
                Based on your spending, consider adding{' '}
                <span style={{ textDecoration: 'underline' }}>Chase Ink Business</span> for 5x on office supplies.
              </p>
            </div>
          </div>

          {/* Vertical Divider */}
          <div style={{ width: '1px', backgroundColor: '#333' }} />

          {/* Right Column - Merchants, Transactions, Earnings */}
          <div style={{ flex: 1, borderTop: '1px solid #333', paddingTop: '20px', paddingLeft: '40px' }}>
            {/* Top Merchants */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '24px', color: 'white', opacity: 0.6, margin: 0 }}>top merchants</h2>
              <button
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2A2A2A',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                view all
              </button>
            </div>

            {/* Merchant Icons */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
              {[
                { name: 'Prime Video', icon: PrimeIcon },
                { name: 'HBO Max', icon: HBOIcon },
                { name: 'Lyft', icon: LyftIcon },
                { name: 'Uber Eats', icon: UberEatsIcon },
                { name: 'Coinbase', icon: CoinbaseIcon },
                { name: 'Spotify', icon: SpotifyIcon },
                { name: 'Grubhub', icon: GrubhubIcon },
              ].map((merchant, i) => (
                <div
                  key={i}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={merchant.icon}
                    alt={merchant.name}
                    style={{
                      width: '110%',
                      height: '110%',
                      marginLeft: '-5%',
                      marginTop: '-5%',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Recent Transactions - Dynamic */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '24px', color: 'white', opacity: 0.6, margin: 0 }}>recent transactions</h2>
              <button
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2A2A2A',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                view all
              </button>
            </div>

            <div
              style={{
                backgroundColor: '#1E1E1E',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '32px',
              }}
            >
              {recentTransactions.length === 0 ? (
                <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>No recent transactions</p>
              ) : (
                recentTransactions.map((tx, i) => (
                  <div
                    key={tx.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 0',
                      borderBottom: i < recentTransactions.length - 1 ? '1px solid #333' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={getTransactionIcon(tx.name)}
                          alt={tx.name}
                          style={{
                            width: '110%',
                            height: '110%',
                            marginLeft: '-5%',
                            marginTop: '-5%',
                          }}
                        />
                      </div>
                      <div>
                        <p style={{ color: '#fff', fontSize: '16px', margin: 0, fontWeight: '500' }}>{tx.name}</p>
                        <p style={{ color: '#6b7280', fontSize: '14px', margin: '4px 0 0 0' }}>{tx.date}</p>
                      </div>
                    </div>
                    <span style={{ color: '#fff', fontSize: '18px', fontWeight: '500' }}>
                      {tx.amount < 0 ? '-' : '+'}$ {Math.abs(tx.amount).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Earnings and Rewards - Dynamic */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '24px', color: 'white', opacity: 0.6, margin: 0 }}>earnings and rewards</h2>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              {/* Left - Transactions List */}
              <div
                style={{
                  flex: 1,
                  backgroundColor: '#1E1E1E',
                  borderRadius: '16px',
                  padding: '16px',
                }}
              >
                {earningsTransactions.length === 0 ? (
                  <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>No earnings yet</p>
                ) : (
                  earningsTransactions.map((tx, i) => (
                    <div
                      key={tx.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 0',
                        borderBottom: i < earningsTransactions.length - 1 ? '1px solid #333' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            flexShrink: 0,
                          }}
                        >
                          <img
                            src={getTransactionIcon(tx.name)}
                            alt={tx.name}
                            style={{
                              width: '110%',
                              height: '110%',
                              marginLeft: '-5%',
                              marginTop: '-5%',
                            }}
                          />
                        </div>
                        <div>
                          <p style={{ color: '#fff', fontSize: '16px', margin: 0, fontWeight: '500' }}>{tx.name}</p>
                          <p style={{ color: '#6b7280', fontSize: '14px', margin: '4px 0 0 0' }}>{tx.date}</p>
                        </div>
                      </div>
                      <span style={{ color: '#fff', fontSize: '18px', fontWeight: '500' }}>
                        {tx.amount < 0 ? '-' : '+'}$ {Math.abs(tx.amount).toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Total Earned Ring Chart - Dynamic */}
              <div
                style={{
                  width: '280px',
                  backgroundColor: '#1E1E1E',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <p style={{ color: '#6b7280', fontSize: '18px', margin: '0 0 16px 0', alignSelf: 'flex-start' }}>total earned</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="200" height="200" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#2A2A2A" strokeWidth="20" />
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="#2DD4BF"
                      strokeWidth="20"
                      strokeLinecap="round"
                      strokeDasharray={`${earnedDashLarge} ${circumferenceLarge}`}
                      transform="rotate(-90 100 100)"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Spacer for Footer */}
      <div style={{ height: '100px' }} />
    </div>
  )
}

// Styles for form inputs
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '500',
  color: '#6b7280',
  marginBottom: '6px',
  textTransform: 'lowercase',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  fontSize: '14px',
  backgroundColor: '#2A2A2A',
  border: '1px solid #444',
  borderRadius: '10px',
  color: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
}
