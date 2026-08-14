import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerAllCurricula } from './content'
import App from './App'
import './styles.css'
import { watchForUpdates } from './lib/updates'

// Content packs must be registered before any component reads the registry.
registerAllCurricula()

/*
 * Watch for a new build. The registration itself is done by the script
 * vite-plugin-pwa injects; this is what makes an installed app notice a new one
 * without being fully closed and reopened first.
 */
watchForUpdates()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
