import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { SidebarNav } from './components/SidebarNav';
import { Dashboard } from './pages/Dashboard';
import { Editor } from './pages/Editor';
import { SettingsPage } from './pages/Settings';
import { ClientsPage } from './pages/Clients';
import { TemplatesPage } from './pages/Templates';
import { OnboardingPage } from './pages/Onboarding';
import { SharedInvoicePage } from './pages/SharedInvoice';

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!localStorage.getItem('onboarding_complete') && location.pathname !== '/onboarding') {
      navigate('/onboarding');
    }
  }, [navigate, location]);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      <SidebarNav />
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="flex-1 p-8 lg:p-12 overflow-y-auto bg-zinc-950 flex flex-col items-center justify-center">
      <div className="text-center py-20 px-8 w-full max-w-xl bg-zinc-900/40 rounded-3xl border border-zinc-800/50 border-dashed backdrop-blur-sm">
        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-zinc-800">
          <Icon className="w-10 h-10 text-zinc-500" />
        </div>
        <h2 className="text-2xl font-light tracking-tight mb-2 text-zinc-100">{title}</h2>
        <p className="text-zinc-500 text-sm">{description}</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/shared/:token" element={<SharedInvoicePage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="editor/:id" element={<Editor />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

