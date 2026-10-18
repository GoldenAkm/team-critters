// The Interactive Map and Digital Fishers 2.0 are their own HTML documents (map/, digital-fishers/); this mounts one.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import './critters-theme.css'

export default function mount(Page) {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <div className="critters-app">
        <Page />
      </div>
    </StrictMode>,
  )
}
