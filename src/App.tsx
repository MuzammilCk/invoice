import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { SidebarNav } from './components/SidebarNav';
import { Dashboard } from './pages/Dashboard';
import { Editor } from './pages/Editor';
import { Users, LayoutTemplate, Settings } from 'lucide-react';

function Layout() {
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
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="editor/:id" element={<Editor />} />
          <Route path="clients" element={<EmptyState icon={Users} title="Client Directory" description="Manage your client profiles, addresses, and payment history in one place. Module unlocking soon." />} />
          <Route path="templates" element={<EmptyState icon={LayoutTemplate} title="Brand Templates" description="Design custom document templates and themes for your organization. Premium gallery incoming." />} />
          <Route path="settings" element={<EmptyState icon={Settings} title="Workspace Settings" description="Configure your API keys, integrations, and default business preferences." />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

