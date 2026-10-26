import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import StudioLayout from './components/StudioLayout'
import Home from './pages/Home'
import Team from './pages/Team'
import MeetingRoom from './pages/MeetingRoom'
import DeptRoom from './pages/DeptRoom'
import RoleRoom from './pages/RoleRoom'
import Clients from './pages/Clients'
import ClientRoom from './pages/ClientRoom'
import ClientDocEditor from './pages/ClientDocEditor'
import Proposals from './pages/Proposals'
import ProposalEditor from './pages/ProposalEditor'
import InvoiceEditor from './pages/InvoiceEditor'
import NewsletterEditor from './pages/NewsletterEditor'
import LetterEditor from './pages/LetterEditor'
import Create from './pages/Create'
import CreateEditor from './pages/CreateEditor'

/* Redirect an old path into the Content Studio, keeping ?open= etc. */
function RedirectWithSearch({ to }: { to: string }) {
  const { search } = useLocation()
  return <Navigate to={`${to}${search}`} replace />
}
import Settings from './pages/Settings'
import AuthGate from './components/AuthGate'
import { BrandProvider } from './lib/brandContext'
import ComingSoon from './pages/ComingSoon'
import Subscribe from './pages/Subscribe'
import Unsubscribe from './pages/Unsubscribe'
import OsHome from './pages/OsHome'
import V2App from './v2/V2App'
import OsNewsletter from './pages/OsNewsletter'

export default function App() {
  return (
    <Routes>
      {/* Public pages — outside the auth gate / studio shell */}
      <Route path="/subscribe" element={<Subscribe />} />
      <Route path="/unsubscribe" element={<Unsubscribe />} />
      {/* The template gallery is gone: social posts are made in Figma now. */}
      <Route path="/templates" element={<Navigate to="/create" replace />} />

      {/* Company OS draft home (September 2026): its own shell, so it does not inherit the top bar. */}
      {/* Copilot V2, the life OS (docs/copilot-v2-life-os.md). Runs beside V1 until V1 is retired. */}
      <Route path="/v2/*" element={<V2App />} />
      <Route path="/os" element={<AuthGate><BrandProvider><OsHome /></BrandProvider></AuthGate>} />
      <Route path="/os/newsletter" element={<AuthGate><BrandProvider><OsNewsletter /></BrandProvider></AuthGate>} />

      <Route element={<StudioLayout />}>
        <Route index element={<Home />} />
        <Route path="create" element={<Create />} />
        <Route path="create/newsletter" element={<NewsletterEditor />} />
        <Route path="create/letter" element={<LetterEditor />} />
        <Route path="create/:family" element={<CreateEditor />} />
        <Route path="calendar" element={<Navigate to="/" replace />} />
        <Route path="library" element={<Navigate to="/" replace />} />
        <Route path="team" element={<Team />} />
        <Route path="team/meeting" element={<MeetingRoom />} />
        <Route path="team/:dept" element={<DeptRoom />} />
        <Route path="roles" element={<Navigate to="/team" replace />} />
        <Route path="roles/:id" element={<RoleRoom />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientRoom />} />
        <Route path="clients/:id/doc/:docId" element={<ClientDocEditor />} />
        <Route path="proposals" element={<Proposals />} />
        <Route path="proposals/:id" element={<ProposalEditor />} />
        <Route path="invoices/:id" element={<InvoiceEditor />} />
        <Route path="social" element={<Navigate to="/create" replace />} />
        {/* Social posts are made in Figma now; old Social Studio links (e.g. from
            daily digest emails) land on Create. */}
        <Route path="social/studio/:id" element={<Navigate to="/create" replace />} />
        <Route path="create/social/:id" element={<Navigate to="/create" replace />} />
        <Route path="newsletter" element={<RedirectWithSearch to="/create/newsletter" />} />
        <Route path="journal" element={<Navigate to="/create/journal" replace />} />
        <Route path="reports" element={<Navigate to="/" replace />} />
        <Route path="settings" element={<Settings />} />
        <Route path="research" element={<ComingSoon title="Research" blurb="Audience & market insight for this brand." />} />
        <Route path="linkedin" element={<ComingSoon title="LinkedIn" blurb="Long-form professional posts for this brand." />} />

      </Route>
    </Routes>
  )
}
