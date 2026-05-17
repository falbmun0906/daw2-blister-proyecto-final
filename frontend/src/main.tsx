import { createRoot } from 'react-dom/client'
import './scss/main.scss'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initializeAppViewportHeight } from './lib/app-viewport'
import { applyStoredUserSettings } from './lib/bootstrap-user-settings'

initializeAppViewportHeight()
applyStoredUserSettings()

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
