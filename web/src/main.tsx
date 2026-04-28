import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import 'react-day-picker/style.css'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import UrlRules from './pages/UrlRules'
import UrlCreateRule from './pages/UrlCreateRule'
import Reports from './pages/Reports'
import McpDocuments from './pages/McpDocuments'
import NonAttributedReports from './pages/NonAttributedReports'
import NonAttributedReportsDetail from './pages/NonAttributedReportsDetail'
import ReportsDetail from './pages/ReportsDetail'
import { AuthProvider } from './auth/AuthContext'
import RequireAuth from './components/RequireAuth'
import { ToastProvider } from './components/ToastProvider'

function markMaterialSymbolsReady() {
  const root = document.documentElement
  const readyClass = 'material-symbols-ready'

  const markReady = () => root.classList.add(readyClass)

  if (!('fonts' in document)) {
    markReady()
    return
  }

  if (document.fonts.check('24px "Material Symbols Outlined"')) {
    markReady()
    return
  }

  const fallbackTimer = window.setTimeout(markReady, 3000)
  document.fonts
    .load('24px "Material Symbols Outlined"')
    .then(markReady)
    .catch(markReady)
    .finally(() => window.clearTimeout(fallbackTimer))
}

markMaterialSymbolsReady()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route element={<RequireAuth />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/url-rules" element={<UrlRules />} />
              <Route path="/url-rules/create" element={<UrlCreateRule />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/documents/mcp" element={<McpDocuments />} />
              <Route path="/non-attributed-reports" element={<NonAttributedReports />} />
              <Route path="/non-attributed-reports/:reportId" element={<NonAttributedReportsDetail />} />
              <Route path="/reports/:reportId" element={<ReportsDetail />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
)
