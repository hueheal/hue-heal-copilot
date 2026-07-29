import { Routes, Route, Navigate } from 'react-router-dom'
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
import Create from './pages/Create'
import CreateEditor from './pages/CreateEditor'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import ComingSoon from './pages/ComingSoon'
import Subscribe from './pages/Subscribe'
import Unsubscribe from './pages/Unsubscribe'

export default function App() {
  return (
    <Routes>
      {/* Public pages — outside the auth gate / studio shell */}
      <Route path="/subscribe" element={<Subscribe />} />
      <Route path="/unsubscribe" element={<Unsubscribe />} />

      <Route element={<StudioLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="create" element={<Create />} />
        <Route path="create/:family" element={<CreateEditor />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="clients" element={<Clients />} />
        <Route path="proposals" element={<Proposals />} />
        <Route path="proposals/:id" element={<ProposalEditor />} />
        <Route path="invoices/:id" element={<InvoiceEditor />} />
        <Route path="social" element={<SocialCopilot />} />
        <Route path="social/studio/:id" element={<SocialStudio />} />
        <Route path="newsletter" element={<NewsletterPage />} />
        <Route path="journal" element={<Navigate to="/create/journal" replace />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="research" element={<ComingSoon title="Research" blurb="Audience & market insight for this brand." />} />
        <Route path="linkedin" element={<ComingSoon title="LinkedIn" blurb="Long-form professional posts for this brand." />} />

      </Route>
    </Routes>
  )
}
