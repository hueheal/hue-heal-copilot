import { Routes, Route } from 'react-router-dom'
import StudioLayout from './components/StudioLayout'
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import Clients from './pages/Clients'
import Proposals from './pages/Proposals'
import ProposalEditor from './pages/ProposalEditor'
import InvoiceEditor from './pages/InvoiceEditor'
import SocialCopilot from './pages/SocialCopilot'
import SocialStudio from './pages/SocialStudio'
import NewsletterPage from './pages/Newsletter'
import Reports from './pages/Reports'

export default function App() {
  return (
    <Routes>
      <Route element={<StudioLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="clients" element={<Clients />} />
        <Route path="proposals" element={<Proposals />} />
        <Route path="proposals/:id" element={<ProposalEditor />} />
        <Route path="invoices/:id" element={<InvoiceEditor />} />
        <Route path="social" element={<SocialCopilot />} />
        <Route path="social/studio/:id" element={<SocialStudio />} />
        <Route path="newsletter" element={<NewsletterPage />} />
        <Route path="reports" element={<Reports />} />
      </Route>
    </Routes>
  )
}
