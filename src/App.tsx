import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { SidebarNav } from './components/SidebarNav';
import { Dashboard } from './pages/Dashboard';
import { Editor } from './pages/Editor';

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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="editor/:id" element={<Editor />} />
          {/* Add basic placeholders for other routes so it doesn't crash if clicked */}
          <Route path="clients" element={<div className="p-8 text-zinc-400">Clients module coming soon...</div>} />
          <Route path="templates" element={<div className="p-8 text-zinc-400">Template gallery coming soon...</div>} />
          <Route path="settings" element={<div className="p-8 text-zinc-400">Settings coming soon...</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

