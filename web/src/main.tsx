import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Inter autoalojada (@fontsource/inter 5.3.0, versión fija): solo subconjunto latino, 400/500/700, font-display: swap.
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-700.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
