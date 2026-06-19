import { ChartProvider } from './context/ChartContext'
import AppContent from './components/layout/AppContent'
import './App.css'

function App() {
  return (
    <ChartProvider>
      <AppContent />
    </ChartProvider>
  )
}

export default App
