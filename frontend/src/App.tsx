import './App.css'
import Transactions from './components/transactions'
import Merchants from './components/merchants'

function App() {

  const sampleMerchant = {
    id: 1,
    name: 'Corner Coffee',
    logo: '/logo192.png'
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
     

        <Merchants />

        <Transactions />
      </div>
    </div>
  )
}

export default App
