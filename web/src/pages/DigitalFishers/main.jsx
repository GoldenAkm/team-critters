import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../index.css'
import './base.css'
import DigitalFishersPage from './DigitalFishersPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DigitalFishersPage />
  </StrictMode>,
)
