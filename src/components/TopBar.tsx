import React from 'react';
import { RotateCw, Settings as SettingsIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { NavigationPage } from '../types';

interface TopBarProps {
  currentPage: NavigationPage;
  whopOperational: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  onNavigateSettings: () => void;
}

const PAGE_TITLES: Record<NavigationPage, string> = {
  overview: 'Overview',
  members: 'Members',
  automation: 'Automation',
  messages: 'Messages',
  webhooks: 'Webhooks',
  logs: 'Logs',
  settings: 'Settings',
};

export const TopBar: React.FC<TopBarProps> = ({
  currentPage,
  whopOperational,
  onRefresh,
  isRefreshing,
  onNavigateSettings,
}) => {
  return (
    <header className="h-13 bg-[#0d0e12] border-b border-[#1e222b] px-6 flex items-center justify-between sticky top-0 z-20 select-none">
      {/* Left: Page Title and Statuses */}
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-semibold text-neutral-100 font-mono tracking-tight">
          {PAGE_TITLES[currentPage]}
        </h2>

        <div className="h-3.5 w-px bg-neutral-800" />

        {/* Connection status */}
        <div className="flex items-center gap-1.5 text-xs text-neutral-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="font-mono text-[11px] text-neutral-300">Connected</span>
        </div>

        {/* Whop API Status */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-400">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              whopOperational ? 'bg-emerald-400' : 'bg-rose-500'
            }`}
          />
          <span className="font-mono text-[11px]">
            {whopOperational ? 'Whop API Operational' : 'Whop API unavailable'}
          </span>
        </div>

        {/* Environment Indicator */}
        <div className="px-1.5 py-0.5 rounded bg-neutral-800/80 border border-neutral-700/60 text-[10px] font-mono font-medium text-neutral-300 tracking-wider">
          PRODUCTION
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          id="btn-topbar-refresh"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#15171d] hover:bg-neutral-800 border border-[#232732] text-neutral-300 hover:text-white text-xs font-medium transition-colors disabled:opacity-60 cursor-pointer"
          title="Refresh operational telemetry"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-neutral-100' : ''}`} />
          <span className="font-mono text-[11px]">Refresh</span>
        </button>

        <button
          id="btn-topbar-settings"
          onClick={onNavigateSettings}
          className="p-1.5 rounded bg-[#15171d] hover:bg-neutral-800 border border-[#232732] text-neutral-400 hover:text-white transition-colors cursor-pointer"
          title="Open Settings"
        >
          <SettingsIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
