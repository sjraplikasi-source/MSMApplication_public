// =============================
// src/main.tsx (fixed version)
// =============================

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { registerSW } from 'virtual:pwa-register'

//registerSW({ immediate: true })
registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      registration.update()
    }
  }
})

const root = ReactDOM.createRoot(document.getElementById('root')!)

root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)