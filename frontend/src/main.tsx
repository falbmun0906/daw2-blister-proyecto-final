import { createRoot } from 'react-dom/client'
import './scss/main.scss'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
