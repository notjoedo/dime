import './App.css'
import Transactions from './components/transactions'
import Merchants from './components/merchants'
import TopOfFile from './components/TopOfFile'
import Cashflow from './components/Cashflow'
import Alerts from './components/Alerts'
import Cards from './components/Cards'
import OptimalCard from './components/OptimalCard'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 style={{
          fontSize: "28px",
          fontWeight: "700",
          textAlign: "center",
          marginBottom: "24px",
          color: "#333"
        }}>
          Dime Dashboard
        </h1>

        <Cards />
        <OptimalCard />
        <Merchants />
        <Transactions />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <TopOfFile />
          <Cashflow />
        </div>
        <Alerts />
      </div>
    </div>
  )
}

export default App
