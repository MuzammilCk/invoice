import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, FileText, Bot, LogIn } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';

export function SidebarNav() {
  const { businessInfo, authUser, isAuthenticated } = useStore();

  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/clients', icon: Users, label: 'Clients' },
    { to: '/templates', icon: FileText, label: 'Templates' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  // Use auth user name if available, fallback to business name
  const displayName = authUser?.name || businessInfo.name;
  const initials = displayName
    ?.split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'U';

  return (
    <aside className="sidebar-nav w-20 flex flex-col items-center py-8 flex-shrink-0 z-20 h-screen bg-transparent">
      <div className="mb-12">
        <div className="w-12 h-12 bg-gradient-to-br from-[#1a1a1a] to-[#0f1115] rounded-xl flex items-center justify-center font-serif font-black italic text-2xl gold-gradient-text gold-border historical-shadow">
          Da
        </div>
      </div>
      <nav className="flex-1 flex flex-col gap-6 w-full px-4">
        {links.map((link) => (
           <NavLink 
             key={link.to} 
             to={link.to}
             className={({ isActive }) => cn(
               "p-3 flex justify-center items-center rounded-xl transition-all group relative",
               isActive ? "bg-[#15171c]/80 text-[#bf953f] sketched-border" : "text-zinc-500 hover:text-[#fcf6ba] hover:bg-[#15171c]/50 border border-transparent"
             )}
             title={link.label}
           >
             <link.icon className="w-6 h-6 stroke-[1.5]" />
           </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-6 items-center">
        <button className="p-3 text-zinc-500 hover:text-[#bf953f] transition-colors">
          <Bot className="w-6 h-6 stroke-[1.5]" />
        </button>
        {isAuthenticated ? (
          <div className="w-8 h-8 rounded-full bg-[#15171c] flex items-center justify-center text-xs font-serif font-black italic gold-gradient-text gold-border historical-shadow" title={displayName}>
            {initials}
          </div>
        ) : (
          <NavLink 
            to="/login"
            className="p-3 text-zinc-500 hover:text-[#bf953f] transition-colors"
            title="Sign In to Sync"
          >
            <LogIn className="w-6 h-6 stroke-[1.5]" />
          </NavLink>
        )}
      </div>
    </aside>
  );
}
