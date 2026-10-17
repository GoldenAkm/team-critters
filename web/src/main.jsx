import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import './index.css'
import MapPage from './features/map/MapPage.jsx'
import LandingStub from './features/landing/LandingStub.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/map" element={<MapPage />} />
        <Route path="*" element={<LandingStub />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
