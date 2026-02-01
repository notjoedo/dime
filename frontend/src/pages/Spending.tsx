import { useState, useEffect, useCallback } from 'react'
import Header from '../components/Header'
import { MdDownload, MdSearch, MdClose } from 'react-icons/md'

interface TransactionProduct {
  name?: string
  description?: string
  quantity?: number
  unit_price?: string
  image?: string
  image_url?: string
  url?: string
  price?: {
    sub_total?: string
    total?: string
    unit_price?: string
  }
}

interface PaymentMethod {
  type?: string
  brand?: string
  last_four?: string
  name?: string
  transaction_amount?: string
}

interface PriceAdjustment {
  type?: string
  label?: string
  amount?: string
}

interface KnotTransaction {
  id?: string
  external_id?: string
  datetime?: string
  url?: string
  order_status?: string
  price?: {
    sub_total?: string
    total?: string
    currency?: string
    adjustments?: PriceAdjustment[]
  }
  products?: TransactionProduct[]
  payment_methods?: PaymentMethod[]
}

interface MappedTransaction {
  id: string
  merchant: string
  merchantId: number
  category: string
  paymentMethod: string
  paymentBrand: string
  paymentLast4: string
  paymentType: string
  date: string
  time: string
  points: number
  amount: number
  logo?: string
  productImage?: string
  rawData?: KnotTransaction
}



const BACKEND_URL = 'http://localhost:5001'

// Active merchant configs with logos (from active_merchants.csv)
const MERCHANTS = [
  { id: 10, name: 'Uber', logo: '/src/public/Uber.svg', category: 'transportation' },
  { id: 13, name: 'Spotify', logo: '/src/public/Spotify.svg', category: 'entertainment' },
  { id: 19, name: 'DoorDash', logo: '/src/public/DoorDash.svg', category: 'food delivery' },
  { id: 38, name: 'Grubhub', logo: '/src/public/Grubhub.svg', category: 'food delivery' },
  { id: 44, name: 'Amazon', logo: '/src/public/Amazon.svg', category: 'shopping' },
  { id: 60, name: 'Apple', logo: '/src/public/Apple.svg', category: 'shopping' },
]

export default function Spending() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all payment methods')
  const [transactions, setTransactions] = useState<MappedTransaction[]>([])
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['PayPal'])
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<MappedTransaction | null>(null)


  const fetchTransactions = useCallback(async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setInitialLoading(true)
      }
      setError(null)

      const response = await fetch(`${BACKEND_URL}/api/transactions?user_id=aman&limit=100`)
      if (!response.ok) throw new Error('Failed to fetch transactions')

      const data = await response.json()
      const dbTransactions = data.transactions || []

      // Sort by datetime desc
      dbTransactions.sort((a: any, b: any) => {
        const dateA = a.datetime ? new Date(a.datetime).getTime() : 0
        const dateB = b.datetime ? new Date(b.datetime).getTime() : 0
        return dateB - dateA
      })

      // Extract unique payment methods
      const methods = new Set<string>(['PayPal'])

      const mappedTransactions: MappedTransaction[] = dbTransactions.map((tx: any) => {
        const datetime = tx.datetime ? new Date(tx.datetime) : new Date()
        const date = datetime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        const time = datetime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

        let pmDisplay = 'Card'
        let pmBrand = 'Card'
        let pmLast4 = '****'

        if (tx.payment_method === 'PAYPAL') {
          pmDisplay = 'PayPal'
          pmBrand = 'PayPal'
        } else if (tx.payment_method) {
          pmDisplay = tx.payment_method
          pmBrand = tx.payment_method
          methods.add(pmDisplay)
        }

        // Find logo
        const merchantConfig = MERCHANTS.find(m => m.id === tx.merchant_id)

        return {
          id: tx.id,
          merchant: tx.merchant_name || tx.merchant?.name || 'Unknown',
          merchantId: tx.merchant_id || tx.merchant?.id,
          category: tx.spend_category || 'uncategorized',
          paymentMethod: pmDisplay,
          paymentBrand: pmBrand,
          paymentLast4: pmLast4,
          paymentType: tx.payment_method === 'PAYPAL' ? 'PAYPAL' : 'CARD',
          date,
          time,
          points: tx.points_earned || 0,
          amount: -Math.abs(Number(tx.total_amount || 0)),
          logo: merchantConfig?.logo || '/src/public/Avg_Daily_Spend_Icon.svg',
          productImage: null,
          rawData: tx.raw_json || tx
        }
      })

      setPaymentMethods(Array.from(methods))
      setTransactions(mappedTransactions)

    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load transactions.')
    } finally {
      setInitialLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchTransactions(false)
    const interval = setInterval(() => fetchTransactions(true), 60000)
    return () => clearInterval(interval)
  }, [fetchTransactions])

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPayment = selectedPaymentMethod === 'all payment methods' ||
      tx.paymentMethod.toLowerCase() === selectedPaymentMethod.toLowerCase()

    return matchesSearch && matchesPayment
  })

  // Calculate stats
  const stats = {
    totalSpent: filteredTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
    totalTransactions: filteredTransactions.length,
    totalEarned: 6271.86,
    totalDeposits: 13,
    pointsEarned: filteredTransactions.reduce((sum, tx) => sum + tx.points, 0),
  }

  const exportCSV = () => {
    const headers = ['Merchant', 'Category', 'Payment Method', 'Date', 'Points', 'Amount']
    const rows = filteredTransactions.map(tx => [
      tx.merchant,
      tx.category,
      `${tx.paymentMethod} **${tx.paymentLast4}`,
      tx.date,
      tx.points,
      tx.amount.toFixed(2)
    ])
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'spending_history.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatCurrency = (amount?: string) => {
    if (!amount) return '$0.00'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(amount))
  }

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'Unknown'
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }



  return (
    <div style={{ paddingBottom: '80px' }}>
      <Header title="spending history" />

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedTransaction(null)}
        >
          <div
            style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              border: '1px solid #2a2a2a',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img
                  src={selectedTransaction.logo}
                  alt={selectedTransaction.merchant}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    backgroundColor: '#2a2a2a',
                    padding: '8px',
                    objectFit: 'contain',
                  }}
                />
                <div>
                  <div style={{
                    fontFamily: 'Coolvetica, sans-serif',
                    fontSize: '24px',
                    color: '#fff',
                  }}>
                    {selectedTransaction.merchant}
                  </div>
                  <div style={{
                    fontFamily: 'Coolvetica, sans-serif',
                    fontSize: '14px',
                    color: '#666',
                  }}>
                    {selectedTransaction.category}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTransaction(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  padding: '8px',
                }}
              >
                <MdClose size={24} />
              </button>
            </div>

            {/* Order Info */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '24px',
            }}>
              <div style={{
                backgroundColor: '#2a2a2a',
                borderRadius: '12px',
                padding: '16px',
              }}>
                <div style={{ fontFamily: 'Coolvetica', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  order id
                </div>
                <div style={{ fontFamily: 'Coolvetica', fontSize: '14px', color: '#fff' }}>
                  {selectedTransaction.rawData?.external_id || selectedTransaction.rawData?.id || selectedTransaction.id || 'N/A'}
                </div>
              </div>
              <div style={{
                backgroundColor: '#2a2a2a',
                borderRadius: '12px',
                padding: '16px',
              }}>
                <div style={{ fontFamily: 'Coolvetica', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  status
                </div>
                <div style={{
                  fontFamily: 'Coolvetica',
                  fontSize: '14px',
                  color: selectedTransaction.rawData?.order_status === 'COMPLETED' ? '#4ecca3' : '#ffc107',
                }}>
                  {selectedTransaction.rawData?.order_status || selectedTransaction.rawData ? 'Unknown' : 'Completed'}
                </div>
              </div>
              <div style={{
                backgroundColor: '#2a2a2a',
                borderRadius: '12px',
                padding: '16px',
              }}>
                <div style={{ fontFamily: 'Coolvetica', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  date & time
                </div>
                <div style={{ fontFamily: 'Coolvetica', fontSize: '14px', color: '#fff' }}>
                  {selectedTransaction.rawData?.datetime ? formatDateTime(selectedTransaction.rawData.datetime) : `${selectedTransaction.date} ${selectedTransaction.time}`}
                </div>
              </div>
              <div style={{
                backgroundColor: '#2a2a2a',
                borderRadius: '12px',
                padding: '16px',
              }}>
                <div style={{ fontFamily: 'Coolvetica', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  total
                </div>
                <div style={{ fontFamily: 'Coolvetica', fontSize: '14px', color: '#ff6b6b' }}>
                  {formatCurrency(selectedTransaction.rawData?.price?.total || Math.abs(selectedTransaction.amount).toString())}
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            {selectedTransaction.rawData?.price && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  fontFamily: 'Coolvetica',
                  fontSize: '16px',
                  color: '#fff',
                  marginBottom: '12px',
                }}>
                  price breakdown
                </div>
                <div style={{
                  backgroundColor: '#2a2a2a',
                  borderRadius: '12px',
                  padding: '16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontFamily: 'Coolvetica', fontSize: '14px', color: '#888' }}>subtotal</span>
                    <span style={{ fontFamily: 'Coolvetica', fontSize: '14px', color: '#fff' }}>
                      {formatCurrency(selectedTransaction.rawData.price.sub_total)}
                    </span>
                  </div>
                  {selectedTransaction.rawData.price.adjustments?.map((adj, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontFamily: 'Coolvetica', fontSize: '14px', color: '#888' }}>
                        {adj.label || adj.type}
                      </span>
                      <span style={{ fontFamily: 'Coolvetica', fontSize: '14px', color: '#fff' }}>
                        {formatCurrency(adj.amount)}
                      </span>
                    </div>
                  ))}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '12px',
                    borderTop: '1px solid #3a3a3a',
                    marginTop: '8px',
                  }}>
                    <span style={{ fontFamily: 'Coolvetica', fontSize: '16px', color: '#fff', fontWeight: '600' }}>
                      total
                    </span>
                    <span style={{ fontFamily: 'Coolvetica', fontSize: '16px', color: '#ff6b6b', fontWeight: '600' }}>
                      {formatCurrency(selectedTransaction.rawData.price.total)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Products/Items */}
            {selectedTransaction.rawData?.products && selectedTransaction.rawData.products.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  fontFamily: 'Coolvetica',
                  fontSize: '16px',
                  color: '#fff',
                  marginBottom: '12px',
                }}>
                  items ({selectedTransaction.rawData.products.length})
                </div>
                <div style={{
                  backgroundColor: '#2a2a2a',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  {selectedTransaction.rawData.products.map((product, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'Coolvetica', fontSize: '14px', color: '#fff' }}>
                          {product.name || 'Unknown Item'}
                        </div>
                        {product.description && (
                          <div style={{ fontFamily: 'Coolvetica', fontSize: '12px', color: '#666' }}>
                            {product.description.slice(0, 50)}...
                          </div>
                        )}
                        {product.quantity && (
                          <div style={{ fontFamily: 'Coolvetica', fontSize: '12px', color: '#888' }}>
                            Qty: {product.quantity}
                          </div>
                        )}
                      </div>
                      {product.unit_price && (
                        <div style={{ fontFamily: 'Coolvetica', fontSize: '14px', color: '#a78bfa' }}>
                          ${product.unit_price}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Methods */}
            {selectedTransaction.rawData?.payment_methods && selectedTransaction.rawData.payment_methods.length > 0 && (
              <div>
                <div style={{
                  fontFamily: 'Coolvetica',
                  fontSize: '16px',
                  color: '#fff',
                  marginBottom: '12px',
                }}>
                  payment method
                </div>
                <div style={{
                  backgroundColor: '#2a2a2a',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}>
                  {selectedTransaction.rawData.payment_methods.map((pm, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontFamily: 'Coolvetica', fontSize: '14px', color: '#fff' }}>
                        💳 {pm.brand || pm.type} •••• {pm.last_four}
                      </div>
                      {pm.transaction_amount && (
                        <div style={{ fontFamily: 'Coolvetica', fontSize: '14px', color: '#4ecca3' }}>
                          {formatCurrency(pm.transaction_amount)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View Order Link */}
            {selectedTransaction.rawData?.url && (
              <a
                href={selectedTransaction.rawData.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  marginTop: '24px',
                  padding: '14px',
                  backgroundColor: '#0d9488',
                  color: '#fff',
                  textAlign: 'center',
                  borderRadius: '12px',
                  fontFamily: 'Coolvetica',
                  fontSize: '14px',
                  textDecoration: 'none',
                }}
              >
                view order on {selectedTransaction.merchant}
              </a>
            )}
          </div>
        </div>
      )}

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

      {/* Initial Loading State */}
      {initialLoading && (
        <div style={{
          fontFamily: 'Coolvetica, sans-serif',
          fontSize: '16px',
          color: '#888',
          textAlign: 'center',
          padding: '40px',
        }}>
          Loading transactions from Knot...
        </div>
      )}

      {/* Error State */}
      {error && !initialLoading && (
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

      {/* Stats and Activity */}
      {!initialLoading && !error && (
        <>
          {/* Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '20px',
            marginBottom: '48px',
          }}>
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
              }}>
                total spent
              </div>
              <div style={{
                fontFamily: 'Coolvetica, sans-serif',
                fontSize: '32px',
                color: '#ff6b6b',
                marginBottom: '8px',
              }}>
                $ {stats.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div style={{
                fontFamily: 'Coolvetica, sans-serif',
                fontSize: '12px',
                color: '#555',
              }}>
                {stats.totalTransactions} transactions
              </div>
            </div>



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
              }}>
                points earned
              </div>
              <div style={{
                fontFamily: 'Coolvetica, sans-serif',
                fontSize: '32px',
                color: '#a78bfa',
                marginBottom: '8px',
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

          {/* Recent Activity */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <div style={{
                fontFamily: 'Coolvetica, sans-serif',
                fontSize: '24px',
                color: '#fff',
              }}>
                recent activity
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
              }}>
                <div style={{ position: 'relative', width: '200px' }}>
                  <MdSearch
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
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
                      height: '36px',
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #2a2a2a',
                      borderRadius: '8px',
                      padding: '0 12px 0 36px',
                      fontSize: '13px',
                      color: '#fff',
                      outline: 'none',
                      fontFamily: 'Coolvetica, sans-serif',
                    }}
                  />
                </div>

                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    style={{
                      height: '36px',
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #2a2a2a',
                      borderRadius: '8px',
                      padding: '0 32px 0 12px', // Extra padding for arrow
                      fontSize: '13px',
                      color: '#fff',
                      outline: 'none',
                      fontFamily: 'Coolvetica, sans-serif',
                      cursor: 'pointer',
                      appearance: 'none',
                      minWidth: '160px'
                    }}
                  >
                    <option value="all payment methods">all payment methods</option>
                    {paymentMethods.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                  <div style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#666',
                    fontSize: '10px'
                  }}>
                    ▼
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '16px',
              border: '1px solid #2a2a2a',
              overflow: 'hidden',
              position: 'relative',
            }}>
              {/* Refreshing Indicator */}
              {refreshing && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  zIndex: 10,
                }}>
                  <span style={{
                    fontFamily: 'Coolvetica',
                    fontSize: '12px',
                    color: '#0d9488',
                  }}>
                    syncing
                  </span>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: '#0d9488',
                          animation: `pulse 1s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                  <style>{`
                    @keyframes pulse {
                      0%, 100% { opacity: 0.3; transform: scale(0.8); }
                      50% { opacity: 1; transform: scale(1); }
                    }
                  `}</style>
                </div>
              )}

              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(200px, 2fr) minmax(120px, 1fr) minmax(150px, 1.5fr) minmax(130px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr)',
                gap: '16px',
                padding: '16px 24px',
                borderBottom: '1px solid #2a2a2a',
                backgroundColor: '#1f1f1f',
              }}>
                <div style={{ fontFamily: 'Coolvetica', fontSize: '13px', color: '#888' }}>merchant</div>
                <div style={{ fontFamily: 'Coolvetica', fontSize: '13px', color: '#888' }}>category</div>
                <div style={{ fontFamily: 'Coolvetica', fontSize: '13px', color: '#888' }}>payment method</div>
                <div style={{ fontFamily: 'Coolvetica', fontSize: '13px', color: '#888' }}>date</div>
                <div style={{ fontFamily: 'Coolvetica', fontSize: '13px', color: '#888', textAlign: 'right' }}>points</div>
                <div style={{ fontFamily: 'Coolvetica', fontSize: '13px', color: '#888', textAlign: 'right' }}>amount</div>
              </div>

              {filteredTransactions.length === 0 && (
                <div style={{
                  padding: '48px',
                  textAlign: 'center',
                  color: '#666',
                  fontFamily: 'Coolvetica',
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                  <div>No transactions found. Connect merchants to sync your spending.</div>
                </div>
              )}

              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTransaction(tx)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(200px, 2fr) minmax(120px, 1fr) minmax(150px, 1.5fr) minmax(130px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr)',
                    gap: '16px',
                    padding: '16px 24px',
                    borderBottom: '1px solid #2a2a2a',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#252525'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {/* Merchant */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={tx.logo}
                      alt={tx.merchant}
                      onError={(e) => { e.currentTarget.src = '/src/public/Avg_Daily_Spend_Icon.svg' }}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: '#2a2a2a',
                        padding: '4px',
                        objectFit: 'contain',
                      }}
                    />
                    <span style={{ fontFamily: 'Coolvetica', fontSize: '14px', color: '#fff' }}>
                      {tx.merchant}
                    </span>
                    {tx.productImage && (
                      <img
                        src={tx.productImage}
                        alt="product"
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
                          marginLeft: '8px',
                          objectFit: 'cover'
                        }}
                      />
                    )}
                  </div>

                  {/* Category */}
                  <div style={{ fontFamily: 'Coolvetica', fontSize: '14px', color: '#888', textTransform: 'lowercase' }}>
                    {tx.category.replace('_', ' ')}
                  </div>

                  {/* Payment Method */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontFamily: 'Coolvetica', fontSize: '14px', color: '#fff' }}>
                      {tx.paymentMethod}
                    </span>
                    {tx.paymentLast4 && tx.paymentLast4 !== '****' && (
                      <span style={{ fontFamily: 'Coolvetica', fontSize: '12px', color: '#666' }}>
                        •••• {tx.paymentLast4}
                      </span>
                    )}
                  </div>

                  {/* Date */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontFamily: 'Coolvetica', fontSize: '14px', color: '#fff' }}>
                      {tx.date}
                    </span>
                    <span style={{ fontFamily: 'Coolvetica', fontSize: '12px', color: '#666' }}>
                      {tx.time}
                    </span>
                  </div>

                  {/* Points */}
                  <div style={{
                    fontFamily: 'Coolvetica',
                    fontSize: '14px',
                    color: '#a78bfa',
                    textAlign: 'right'
                  }}>
                    {tx.points > 0 ? `+${tx.points}` : '-'}
                  </div>

                  {/* Amount */}
                  <div style={{
                    fontFamily: 'Coolvetica',
                    fontSize: '14px',
                    color: '#fff',
                    textAlign: 'right',
                  }}>
                    {formatCurrency(tx.amount.toString())}
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