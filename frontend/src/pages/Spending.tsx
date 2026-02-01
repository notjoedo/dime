import { useState, useEffect } from 'react'
import Header from '../components/Header'
import { MdDownload, MdSearch } from 'react-icons/md'

interface Transaction {
  id: string
  merchant: string
  category: string
  card: string
  cardLast4: string
  date: string
  time: string
  points: number
  amount: number
  icon?: string
}

interface Card {
  card_id: string
  card_type: string
  last_four: string
  card_number: string
}

interface BackendTransaction {
  id: string
  merchant_name: string
  category: string
  datetime: string
  total_amount: number
  currency: string
}

const BACKEND_URL = 'http://localhost:5001'

export default function Spending() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMerchant, setSelectedMerchant] = useState('all merchants')
  const [selectedCard, setSelectedCard] = useState('all cards')
  const [selectedTime, setSelectedTime] = useState('all time')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch transactions
        const txResponse = await fetch(`${BACKEND_URL}/api/snowflake/transactions?user_id=aman&limit=50`)
        const txData = await txResponse.json()

        // Fetch cards
        const cardsResponse = await fetch(`${BACKEND_URL}/api/cards?user_id=aman`)
        const cardsData = await cardsResponse.json()

        // Map backend transactions to frontend format
        const mappedTransactions: Transaction[] = (txData.transactions || []).map((tx: BackendTransaction, index: number) => {
          // Assign a card (rotate through available cards)
          const card = cardsData.cards && cardsData.cards.length > 0
            ? cardsData.cards[index % cardsData.cards.length]
            : { card_type: 'Unknown Card', last_four: '0000' }

          // Parse datetime
          const datetime = tx.datetime ? new Date(tx.datetime) : new Date()
          const date = datetime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

          // Calculate points (simple: $1 = 1 point, can be enhanced)
          const points = Math.floor(Math.abs(tx.total_amount))

          return {
            id: tx.id,
            merchant: tx.merchant_name || 'Unknown Merchant',
            category: tx.category || 'uncategorized',
            card: card.card_type || 'Unknown Card',
            cardLast4: card.last_four || '0000',
            date: date,
            time: `**${card.last_four}`,
            points: points,
            amount: -Math.abs(tx.total_amount), // Negative for spending
          }
        })

        setTransactions(mappedTransactions)
        setError(null)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load transactions. Please check if the backend is running.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Calculate stats from transactions
  const stats = {
    totalSpent: transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
    totalTransactions: transactions.length,
    totalEarned: 0, // This would come from a different source
    totalDeposits: 0,
    pointsEarned: transactions.reduce((sum, tx) => sum + tx.points, 0),
  }

  const exportCSV = () => {
    console.log('Exporting CSV...')
    // Implement CSV export logic
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      <Header title="spending history" />

      {/* Subtitle and Export Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
      }}>
        <div style={{
          fontFamily: 'Coolvetica, sans-serif',
          fontSize: '18px',
          color: '#888',
        }}>
          complete history across all your credit cards
        </div>

        {/* Export CSV Button */}
        <button
          onClick={exportCSV}
          style={{
            backgroundColor: '#0d9488',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            fontFamily: 'Coolvetica, sans-serif',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0f766e'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0d9488'}
        >
          <MdDownload size={16} />
          export CSV
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{
          fontFamily: 'Coolvetica, sans-serif',
          fontSize: '16px',
          color: '#888',
          textAlign: 'center',
          padding: '40px',
        }}>
          Loading transactions...
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div style={{
          fontFamily: 'Coolvetica, sans-serif',
          fontSize: '16px',
          color: '#ff6b6b',
          textAlign: 'center',
          padding: '40px',
          backgroundColor: '#3d1f1f',
          borderRadius: '12px',
          marginBottom: '24px',
        }}>
          {error}
        </div>
      )}

      {/* Stats Cards and Recent Activity */}
      {!loading && !error && (
        <>
          {/* Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            marginBottom: '48px',
          }}>
            {/* Total Spent Card */}
            <div style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #2a2a2a',
            }}>
              <div style={{
                fontFamily: 'Coolvetica, sans-serif',
                fontSize: '13px',
                color: '#666',
                marginBottom: '8px',
                textTransform: 'lowercase',
              }}>
                total spent
              </div>
              <div style={{
                fontFamily: 'Coolvetica, sans-serif',
                fontSize: '32px',
                color: '#ff6b6b',
                marginBottom: '8px',
                fontWeight: '600',
              }}>
                -$ {stats.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div style={{
                fontFamily: 'Coolvetica, sans-serif',
                fontSize: '12px',
                color: '#555',
              }}>
                {stats.totalTransactions} transactions
              </div>
            </div>

            {/* Total Earned Card */}
            <div style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #2a2a2a',
            }}>
              <div style={{
                fontFamily: 'Coolvetica, sans-serif',
                fontSize: '13px',
                color: '#666',
                marginBottom: '8px',
                textTransform: 'lowercase',
              }}>
                total earned
              </div>
              <div style={{
                fontFamily: 'Coolvetica, sans-serif',
                fontSize: '32px',
                color: '#4ecca3',
                marginBottom: '8px',
                fontWeight: '600',
              }}>
                +$ {stats.totalEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div style={{
                fontFamily: 'Coolvetica, sans-serif',
                fontSize: '12px',
                color: '#555',
              }}>
                {stats.totalDeposits} deposits
              </div>
            </div>

            {/* Points Earned Card */}
            <div style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #2a2a2a',
            }}>
              <div style={{
                fontFamily: 'Coolvetica, sans-serif',
                fontSize: '13px',
                color: '#666',
                marginBottom: '8px',
                textTransform: 'lowercase',
              }}>
                points earned
              </div>
              <div style={{
                fontFamily: 'Coolvetica, sans-serif',
                fontSize: '32px',
                color: '#a78bfa',
                marginBottom: '8px',
                fontWeight: '600',
              }}>
                {stats.pointsEarned.toLocaleString()}
              </div>
              <div style={{
                fontFamily: 'Coolvetica, sans-serif',
                fontSize: '12px',
                color: '#555',
              }}>
                across all cards
              </div>
            </div>
          </div>

          {/* Recent Activity Section */}
          <div>
            <div style={{
              fontFamily: 'Coolvetica, sans-serif',
              fontSize: '24px',
              color: '#fff',
              marginBottom: '24px',
            }}>
              recent activity
            </div>

            {/* Filters Row */}
            <div style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '24px',
              alignItems: 'center',
            }}>
              {/* Search Transactions */}
              <div style={{
                position: 'relative',
                flex: '0 0 300px',
              }}>
                <MdSearch
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#666',
                  }}
                />
                <input
                  type="text"
                  placeholder="search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    padding: '0 16px 0 46px',
                    fontSize: '14px',
                    color: '#fff',
                    outline: 'none',
                    fontFamily: 'Coolvetica, sans-serif',
                  }}
                />
              </div>

              {/* All Merchants Dropdown */}
              <select
                value={selectedMerchant}
                onChange={(e) => setSelectedMerchant(e.target.value)}
                style={{
                  height: '42px',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '8px',
                  padding: '0 16px',
                  fontSize: '14px',
                  color: '#fff',
                  outline: 'none',
                  fontFamily: 'Coolvetica, sans-serif',
                  cursor: 'pointer',
                }}
              >
                <option value="all merchants">all merchants</option>
                <option value="whole foods">Whole Foods</option>
                <option value="amazon">Amazon</option>
              </select>

              {/* All Cards Dropdown */}
              <select
                value={selectedCard}
                onChange={(e) => setSelectedCard(e.target.value)}
                style={{
                  height: '42px',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '8px',
                  padding: '0 16px',
                  fontSize: '14px',
                  color: '#fff',
                  outline: 'none',
                  fontFamily: 'Coolvetica, sans-serif',
                  cursor: 'pointer',
                }}
              >
                <option value="all cards">all cards</option>
                <option value="freedom unlimited">Freedom Unlimited</option>
                <option value="sapphire reserve">Sapphire Reserve</option>
              </select>

              {/* All Time Dropdown */}
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                style={{
                  height: '42px',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '8px',
                  padding: '0 16px',
                  fontSize: '14px',
                  color: '#fff',
                  outline: 'none',
                  fontFamily: 'Coolvetica, sans-serif',
                  cursor: 'pointer',
                }}
              >
                <option value="all time">all time</option>
                <option value="today">Today</option>
                <option value="this week">This Week</option>
                <option value="this month">This Month</option>
              </select>
            </div>

            {/* Transactions Table */}
            <div style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '16px',
              border: '1px solid #2a2a2a',
              overflow: 'hidden',
            }}>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr',
                gap: '16px',
                padding: '16px 24px',
                borderBottom: '1px solid #2a2a2a',
              }}>
                <div style={{
                  fontFamily: 'Coolvetica, sans-serif',
                  fontSize: '13px',
                  color: '#666',
                  textTransform: 'lowercase',
                }}>
                  transaction
                </div>
                <div style={{
                  fontFamily: 'Coolvetica, sans-serif',
                  fontSize: '13px',
                  color: '#666',
                  textTransform: 'lowercase',
                }}>
                  card used
                </div>
                <div style={{
                  fontFamily: 'Coolvetica, sans-serif',
                  fontSize: '13px',
                  color: '#666',
                  textTransform: 'lowercase',
                }}>
                  date & time
                </div>
                <div style={{
                  fontFamily: 'Coolvetica, sans-serif',
                  fontSize: '13px',
                  color: '#666',
                  textTransform: 'lowercase',
                }}>
                  points
                </div>
                <div style={{
                  fontFamily: 'Coolvetica, sans-serif',
                  fontSize: '13px',
                  color: '#666',
                  textTransform: 'lowercase',
                  textAlign: 'right',
                }}>
                  amount
                </div>
              </div>

              {/* Table Rows */}
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr',
                    gap: '16px',
                    padding: '20px 24px',
                    borderBottom: '1px solid #2a2a2a',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#222'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {/* Transaction Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: '#2a2a2a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        backgroundColor: '#444',
                      }} />
                    </div>
                    <div>
                      <div style={{
                        fontFamily: 'Coolvetica, sans-serif',
                        fontSize: '15px',
                        color: '#fff',
                        marginBottom: '4px',
                      }}>
                        {transaction.merchant}
                      </div>
                      <div style={{
                        fontFamily: 'Coolvetica, sans-serif',
                        fontSize: '13px',
                        color: '#666',
                      }}>
                        {transaction.category}
                      </div>
                    </div>
                  </div>

                  {/* Card Used */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}>
                    <div style={{
                      fontFamily: 'Coolvetica, sans-serif',
                      fontSize: '15px',
                      color: '#fff',
                      marginBottom: '4px',
                    }}>
                      {transaction.card}
                    </div>
                    <div style={{
                      fontFamily: 'Coolvetica, sans-serif',
                      fontSize: '13px',
                      color: '#666',
                    }}>
                      **{transaction.cardLast4}
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}>
                    <div style={{
                      fontFamily: 'Coolvetica, sans-serif',
                      fontSize: '15px',
                      color: '#fff',
                      marginBottom: '4px',
                    }}>
                      {transaction.date}
                    </div>
                    <div style={{
                      fontFamily: 'Coolvetica, sans-serif',
                      fontSize: '13px',
                      color: '#666',
                    }}>
                      {transaction.time}
                    </div>
                  </div>

                  {/* Points */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                    <div style={{
                      fontFamily: 'Coolvetica, sans-serif',
                      fontSize: '15px',
                      color: '#a78bfa',
                      backgroundColor: '#2d1f4d',
                      padding: '6px 14px',
                      borderRadius: '20px',
                    }}>
                      +{transaction.points}
                    </div>
                  </div>

                  {/* Amount */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                  }}>
                    <div style={{
                      fontFamily: 'Coolvetica, sans-serif',
                      fontSize: '15px',
                      color: '#ff6b6b',
                      backgroundColor: '#3d1f1f',
                      padding: '6px 14px',
                      borderRadius: '20px',
                    }}>
                      -$ {Math.abs(transaction.amount).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}