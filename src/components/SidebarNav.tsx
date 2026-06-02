import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, FileText, Bot } from 'lucide-react';
import { cn } from '../lib/utils';

export function SidebarNav() {
  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/clients', icon: Users, label: 'Clients' },
    { to: '/templates', icon: FileText, label: 'Templates' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="w-20 flex flex-col items-center py-8 border-r border-zinc-800 bg-zinc-900/50 flex-shrink-0 z-20 h-screen">
      <div className="mb-12">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-xl tracking-tighter text-white shadow-lg shadow-indigo-500/20">
          AI
        </div>
      </div>
      <nav className="flex-1 flex flex-col gap-6 w-full px-4">
        {links.map((link) => (
           <NavLink 
             key={link.to} 
             to={link.to}
             className={({ isActive }) => cn(
               "p-3 flex justify-center items-center rounded-xl transition-all group relative",
               isActive ? "bg-zinc-800 text-indigo-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
             )}
             title={link.label}
           >
             <link.icon className="w-6 h-6 stroke-[1.5]" />
           </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-6 items-center">
        <button className="p-3 text-zinc-500 hover:text-indigo-400 transition-colors">
          <Bot className="w-6 h-6 stroke-[1.5]" />
        </button>
        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`} alt="User" />
        </div>
      </div>
    </aside>
  );
}
