// Each page (/, /map/, /digital-fishers/) is its own HTML document with its own entry; this mounts it.
import React from 'react'
import ReactDOM from 'react-dom/client'
import '../index.css'

export default function mount(Page) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <Page />
    </React.StrictMode>,
  )
}
