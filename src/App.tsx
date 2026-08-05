import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import StudioLayout from './components/StudioLayout'
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import Clients from './pages/Clients'
import ClientRoom from './pages/ClientRoom'
import ClientDocEditor from './pages/ClientDocEditor'
import Proposals from './pages/Proposals'
import ProposalEditor from './pages/ProposalEditor'
import InvoiceEditor from './pages/InvoiceEditor'
import SocialStudio from './pages/SocialStudio'
import NewsletterEditor from './pages/NewsletterEditor'
import Create from './pages/Create'
import CreateEditor from './pages/CreateEditor'

/* Redirect an old path into the Content Studio, keeping ?open= etc. */
function RedirectWithSearch({ to }: { to: string }) {
  const { search } = useLocation()
  return <Navigate to={`${to}${search}`} replace />
}

/* Old studio links (e.g. from daily digest emails) land in the new editor. */
function StudioRedirect() {
  const { id } = useParams()
  return <Navigate to={`/create/social/${id}`} replace />
}
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
        <Route path="create/newsletter" element={<NewsletterEditor />} />
        <Route path="create/:family" element={<CreateEditor />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientRoom />} />
        <Route path="clients/:id/doc/:docId" element={<ClientDocEditor />} />
        <Route path="proposals" element={<Proposals />} />
        <Route path="proposals/:id" element={<ProposalEditor />} />
        <Route path="invoices/:id" element={<InvoiceEditor />} />
        <Route path="social" element={<Navigate to="/create" replace />} />
        <Route path="social/studio/:id" element={<StudioRedirect />} />
        <Route path="create/social/:id" element={<SocialStudio />} />
        <Route path="newsletter" element={<RedirectWithSearch to="/create/newsletter" />} />
        <Route path="journal" element={<Navigate to="/create/journal" replace />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="research" element={<ComingSoon title="Research" blurb="Audience & market insight for this brand." />} />
        <Route path="linkedin" element={<ComingSoon title="LinkedIn" blurb="Long-form professional posts for this brand." />} />

      </Route>
    </Routes>
  )
}
