import React from 'react';
import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { SidebarNav } from './components/SidebarNav';
import { Dashboard } from './pages/Dashboard';
import { Editor } from './pages/Editor';
import { SettingsPage } from './pages/Settings';

function Layout() {
  const location = useLocation();
  const isEditorMode = location.pathname.startsWith('/editor/');

  return (
    <div className="flex h-screen bg-[#0f1115] bg-texture-canvas text-zinc-100 overflow-hidden font-sans">
      {!isEditorMode && <SidebarNav />}
      <main className={`flex-1 flex flex-col h-full overflow-hidden ${!isEditorMode ? 'rounded-l-[2rem] border-l border-[#bf953f]/20 shadow-2xl relative bg-[#15171c]' : 'bg-[#0f1115]'}`}>
        {!isEditorMode && <div className="absolute inset-0 rounded-l-[2rem] border-l border-white/5 pointer-events-none z-50"></div>}
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
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
