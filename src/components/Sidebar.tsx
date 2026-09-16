import React from 'react';
import {
  LayoutDashboard,
  Users,
  GitFork,
  MessageSquare,
  Radio,
  Terminal,
  Settings,
  ShieldCheck,
  CheckCircle2,
  CircleAlert,
} from 'lucide-react';
import { NavigationPage } from '../types';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  isWhopConnected: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isWhopConnected,
}) => {
  const navItems: { id: NavigationPage; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'automation', label: 'Automation', icon: GitFork },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'webhooks', label: 'Webhooks', icon: Radio },
    { id: 'logs', label: 'Logs', icon: Terminal },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-56 shrink-0 bg-[#0d0e12] border-r border-[#1e222b] flex flex-col justify-between select-none h-screen sticky top-0">
      {/* Top Header */}
      <div className="p-4 border-b border-[#1e222b]">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-neutral-100 text-[#090a0d] flex items-center justify-center font-bold text-xs font-mono">
            AQ
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-neutral-100 font-mono">
              AZORA-Q
            </h1>
            <p className="text-[11px] text-neutral-400 font-medium">Private Automation</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-2 space-y-0.5 flex-1 overflow-y-auto">
        <div className="px-2.5 py-1.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider font-mono">
          Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              id={`nav-link-${item.id}`}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left ${
                isActive
                  ? 'bg-neutral-800/80 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-neutral-200' : 'text-neutral-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Status Panel */}
      <div className="p-3.5 border-t border-[#1e222b] bg-[#090a0d]/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-neutral-400">API Connection</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Connected</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-[#1e222b]/60 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
          <span>Whop Engine</span>
          <span>v5.2024-10</span>
        </div>
      </div>
    </aside>
  );
};
