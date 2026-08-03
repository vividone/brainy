import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerAllCurricula } from './content'
import App from './App'
import './styles.css'

// Content packs must be registered before any component reads the registry.
registerAllCurricula()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
