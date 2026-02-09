// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx' // <--- Fíjate que apunte al .jsx
import { RoutineProvider } from './context/RoutineContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RoutineProvider>
        <App />
      </RoutineProvider>
    </AuthProvider>
  </React.StrictMode>,
)