import { useState, useEffect } from 'react'
import Header from '../components/Header'
import { MdChevronLeft, MdChevronRight, MdClose } from 'react-icons/md'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// Import SVG icons - Active merchants only
import UberIcon from '../public/Uber.svg'
import SpotifyIcon from '../public/Spotify.svg'
import DoordashIcon from '../public/Doordash.svg'
import GrubhubIcon from '../public/Grubhub.svg'
import AmazonIcon from '../public/Amazon.svg'
import AppleIcon from '../public/Apple.svg'
import HBOIcon from '../public/unused_merchants/HBO.svg'
import LyftIcon from '../public/unused_merchants/Lyft.svg'
import UberEatsIcon from '../public/unused_merchants/UberEats.svg'
import CoinbaseIcon from '../public/unused_merchants/Coinbase.svg'
const PrimeIcon = AmazonIcon // Alias for compatibility

// Icon mapping for dynamic transactions - Active merchants only
const MERCHANT_ICONS: Record<string, string> = {
  'Uber': UberIcon,
  'Spotify': SpotifyIcon,
  'DoorDash': DoordashIcon,
  'Grubhub': GrubhubIcon,
  'Amazon': AmazonIcon,
  'Apple': AppleIcon,
  'Whole Foods': AmazonIcon,
  'Shell Gas': GrubhubIcon,
  'eBay': AmazonIcon,
  'Netflix': HBOIcon,
  'Delta': LyftIcon,
  'Hotel': LyftIcon,
  'Coffee': GrubhubIcon,
  'Coinbase': CoinbaseIcon,
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

interface TrendData {
  month: string
  spending: number
  income: number
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

const initialRecentTransactions: Transaction[] = []

const MERCHANTS_MOCK: Record<string, { name: string, icon: string }[]> = {
  visa: [{ name: 'Amazon', icon: PrimeIcon }, { name: 'Whole Foods', icon: PrimeIcon }],
  paypal: [{ name: 'DoorDash', icon: DoordashIcon }],
  discover: [],
  mastercard: [{ name: 'Spotify', icon: SpotifyIcon }, { name: 'Netflix', icon: HBOIcon }],
  amex: [{ name: 'Uber Eats', icon: UberEatsIcon }],
  default: []
}

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
  const [topMerchants, setTopMerchants] = useState<{ name: string, icon: string }[]>([])
  const [syncing, setSyncing] = useState(false)

  // Fetch cards from API on mount
  useEffect(() => {
    const fetchCards = async () => {
      try {
        const API_URL = 'http://localhost:5001/api'
        const res = await fetch(`${API_URL}/cards?user_id=aman`)
        const data = await res.json()
        const paypalCard: CardData = {
          card_id: 'paypal-static',
          card_type: 'paypal',
          last_four: '',
          expiration: 'N/A',
          cardholder: 'PayPal User',
          balance: 0,
          status: 'Active',
          currency: 'USD',
        }

        if (data.cards) {
          const apiCards: CardData[] = data.cards.map((card: any) => ({
            card_id: card.card_id,
            card_type: card.card_type?.toLowerCase() || 'visa',
            last_four: card.last_four,
            expiration: card.expiration,
            cardholder: card.nickname || card.cardholder || 'User',
            balance: 0,
            status: 'Active',
            currency: 'USD',
          }))
          setCards([...apiCards, paypalCard])
        } else {
          setCards([paypalCard])
        }
      } catch (err) {
        console.error('Failed to fetch cards:', err)
        // Keep initial cards on error
      }
    }
    fetchCards()
  }, [])

  // Update Data on Card Switch
  useEffect(() => {
    if (cards.length > 0) {
      const currentCard = cards[currentCardIndex]
      const type = (currentCard.card_type || 'visa').toLowerCase()

      // Fetch Real Transactions from Snowflake
      const fetchTransactions = async () => {
        try {
          const API_URL = 'http://localhost:5001/api'
          const res = await fetch(`${API_URL}/snowflake/transactions?user_id=aman&card_id=${currentCard.card_id}&card_type=${type}`)
          const data = await res.json()

          if (data.transactions && Array.isArray(data.transactions)) {
            const mapped = data.transactions.map((tx: any) => ({
              id: tx.id,
              name: tx.merchant_name || 'Unknown',
              date: new Date(tx.datetime).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }),
              // Ensure spending shows as negative
              amount: -Math.abs(Number(tx.total_amount))
            }))
            setRecentTransactions(mapped)
          } else {
            setRecentTransactions([])
          }
        } catch (e) {
          console.error("Failed to fetch recent transactions", e)
          setRecentTransactions([])
        }
      }

      fetchTransactions()

      // Set Merchants (keep logic for now)
      if (type === 'discover') {
        setTopMerchants([])
      } else {
        setTopMerchants(MERCHANTS_MOCK[type] || MERCHANTS_MOCK.default)
      }
    }
  }, [currentCardIndex, cards])

  const handleSyncAll = async () => {
    try {
      setSyncing(true)
      const API_URL = 'http://localhost:5001/api'
      const res = await fetch(`${API_URL}/knot/sync-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'aman' })
      })
      const data = await res.json()

      if (data.success) {
        // Refresh cards and transactions
        window.location.reload()
      } else {
        alert("Sync failed: " + (data.error || "Unknown error"))
      }
    } catch (err) {
      console.error("Sync error:", err)
      alert("Failed to connect to backend for sync.")
    } finally {
      setSyncing(false)
    }
  }

  // Graph data - can be populated from backend
  const avgUtilization = 69 // percentage (static for now)
  const totalEarned = 77 // percentage (static for now)
  const [trendData, setTrendData] = useState<TrendData[]>([])

  // Fetch spending and income trends
  useEffect(() => {
    const fetchTrends = async () => {
      const API_URL = 'http://localhost:5001/api'
      try {
        const [spendingRes, incomeRes] = await Promise.all([
          fetch(`${API_URL}/spending-trends?months=6`),
          fetch(`${API_URL}/nessie/income-trends?months=6`)
        ])

        const spendingData = await spendingRes.json()
        const incomeData = await incomeRes.json()

        const spendingTrends = spendingData.trends || []
        const incomeTrends = incomeData.trends || []

        // Merge the data by month
        const monthMap: Record<string, TrendData> = {}

        spendingTrends.forEach((item: { month: string; amount: number }) => {
          monthMap[item.month] = {
            month: item.month,
            spending: item.amount,
            income: 0
          }
        })

        incomeTrends.forEach((item: { month: string; amount: number }) => {
          if (monthMap[item.month]) {
            monthMap[item.month].income = item.amount
          } else {
            monthMap[item.month] = {
              month: item.month,
              spending: 0,
              income: item.amount
            }
          }
        })

        // Convert to array and sort by month order
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const mergedData = Object.values(monthMap).sort((a, b) => {
          return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month)
        })

        setTrendData(mergedData)
      } catch (err) {
        console.error('Failed to fetch trends:', err)
        // Set sample data on error - non-parallel patterns
        setTrendData([
          { month: 'Aug', spending: 2850, income: 4200 },
          { month: 'Sep', spending: 2600, income: 4350 },
          { month: 'Oct', spending: 3100, income: 4400 },
          { month: 'Nov', spending: 3950, income: 5200 },
          { month: 'Dec', spending: 3400, income: 4500 },
          { month: 'Jan', spending: 2900, income: 4650 },
        ])
      }
    }
    fetchTrends()
  }, [])

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
    // Exact match
    if (MERCHANT_ICONS[name]) return MERCHANT_ICONS[name]

    // Fuzzy match
    const lowerName = name.toLowerCase()
    const match = Object.keys(MERCHANT_ICONS).find(key =>
      lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)
    )
    return match ? MERCHANT_ICONS[match] : SpotifyIcon
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
            <div style={{ width: '100%', height: '192px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#252525', border: '1px solid #333', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: any) => [`$${(Number(value) || 0).toLocaleString()}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="spending"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={{ fill: '#a855f7', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#2DD4BF"
                    strokeWidth={2}
                    dot={{ fill: '#2DD4BF', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
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
              <h2 style={{ fontSize: '24px', color: 'white', opacity: 0.6, margin: 0 }}>payment methods</h2>
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
                      width: '100%',
                    }}
                  >
                    <div
                      style={{
                        background: CARD_COLORS[card.card_type] || CARD_COLORS.other,
                        borderRadius: '20px',
                        padding: '24px',
                        color: '#fff',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        height: '220px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', marginBottom: '20px' }}>
                        {card.card_type === 'paypal' ? (
                          <svg width="80" height="24" viewBox="0 0 101 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12.237 2.8H4.437a.9.9 0 00-.89.76L.007 26.36a.54.54 0 00.53.62h3.87a.9.9 0 00.89-.76l.98-6.22a.9.9 0 01.89-.76h2.05c4.27 0 6.73-2.07 7.38-6.17.29-1.79.01-3.2-.84-4.19-.93-1.09-2.58-1.67-4.77-1.67zm.76 6.07c-.36 2.37-2.16 2.37-3.9 2.37h-.99l.69-4.39a.54.54 0 01.53-.45h.45c1.17 0 2.27 0 2.84.67.34.39.44 1 .38 1.8z" fill="white" />
                            <path d="M35.237 8.8h-3.87a.54.54 0 00-.53.45l-.14.88-.22-.32c-.68-.99-2.19-1.32-3.7-1.32-3.46 0-6.42 2.62-7 6.3-.3 1.84.13 3.6 1.17 4.84.96 1.14 2.33 1.61 3.96 1.61 2.8 0 4.36-1.8 4.36-1.8l-.14.88a.54.54 0 00.53.62h3.48a.9.9 0 00.89-.76l1.68-10.63a.54.54 0 00-.53-.62zm-5.38 6.03c-.3 1.79-1.7 2.99-3.48 2.99-.89 0-1.61-.29-2.08-.83-.47-.54-.64-1.31-.5-2.17.28-1.77 1.71-3.01 3.46-3.01.88 0 1.59.29 2.07.84.48.55.67 1.32.53 2.18z" fill="white" />
                            <path d="M55.337 8.8h-3.9a.9.9 0 00-.74.39l-4.27 6.29-1.81-6.05a.9.9 0 00-.86-.63h-3.83a.54.54 0 00-.51.71l3.42 10.04-3.21 4.53a.54.54 0 00.44.85h3.89a.9.9 0 00.73-.38l10.3-14.88a.54.54 0 00-.44-.85z" fill="white" />
                            <path d="M67.737 2.8h-7.8a.9.9 0 00-.89.76l-3.54 22.8a.54.54 0 00.53.62h4.08a.63.63 0 00.62-.53l1.01-6.42a.9.9 0 01.89-.76h2.05c4.27 0 6.73-2.07 7.38-6.17.29-1.79.01-3.2-.84-4.19-.93-1.09-2.58-1.67-4.77-1.67zm.76 6.07c-.36 2.37-2.16 2.37-3.9 2.37h-.99l.69-4.39a.54.54 0 01.53-.45h.45c1.17 0 2.27 0 2.84.67.34.39.44 1 .38 1.8z" fill="#009cde" />
                            <path d="M90.737 8.8h-3.87a.54.54 0 00-.53.45l-.14.88-.22-.32c-.68-.99-2.19-1.32-3.7-1.32-3.46 0-6.42 2.62-7 6.3-.3 1.84.13 3.6 1.17 4.84.96 1.14 2.33 1.61 3.96 1.61 2.8 0 4.36-1.8 4.36-1.8l-.14.88a.54.54 0 00.53.62h3.48a.9.9 0 00.89-.76l1.68-10.63a.54.54 0 00-.53-.62zm-5.38 6.03c-.3 1.79-1.7 2.99-3.48 2.99-.89 0-1.61-.29-2.08-.83-.47-.54-.64-1.31-.5-2.17.28-1.77 1.71-3.01 3.46-3.01.88 0 1.59.29 2.07.84.48.55.67 1.32.53 2.18z" fill="#009cde" />
                            <path d="M95.337 3.2l-3.59 22.9a.54.54 0 00.53.62h3.42a.9.9 0 00.89-.76l3.54-22.8a.54.54 0 00-.53-.62h-3.73a.54.54 0 00-.53.45z" fill="#009cde" />
                          </svg>
                        ) : (
                          <span style={{ fontSize: '20px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px' }}>
                            {card.card_type}
                          </span>
                        )}
                      </div>
                      {card.card_type !== 'paypal' && (
                        <>
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
                        </>
                      )}
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








          </div>

          {/* Vertical Divider */}
          <div style={{ width: '1px', backgroundColor: '#333' }} />

          {/* Right Column - Merchants, Transactions, Earnings */}
          <div style={{ flex: 1, borderTop: '1px solid #333', paddingTop: '20px', paddingLeft: '40px' }}>
            {/* Top Merchants */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '24px', color: 'white', opacity: 0.6, margin: 0 }}>this month's top</h2>
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

            {/* Merchant Icons - Active merchants only */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
              {topMerchants.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '14px' }}>No top merchants this month</p>
              ) : (
                topMerchants.map((merchant, i) => (
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
                ))
              )}
            </div>

            {/* Recent Transactions - Dynamic */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 style={{ fontSize: '24px', color: 'white', opacity: 0.6, margin: 0 }}>recent transactions</h2>
                <button
                  onClick={handleSyncAll}
                  disabled={syncing}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: syncing ? '#444' : '#8B5CF6',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: syncing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {syncing ? 'syncing...' : 'sync now'}
                </button>
              </div>
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
                      {tx.amount < 0 ? '-' : '+'} {Math.abs(tx.amount).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
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
