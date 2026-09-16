import React from 'react';
import {
  Users,
  Send,
  MessageSquareReply,
  CalendarClock,
  Circle,
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { OverviewStats, AutomationEvent, Member } from '../types';

interface OverviewPageProps {
  stats: OverviewStats | null;
  recentActivity: AutomationEvent[];
  onSelectEvent: (event: AutomationEvent) => void;
  onNavigatePage: (page: any) => void;
}

function timeAgo(isoString: string): string {
  try {
    const seconds = Math.floor((new Date().getTime() - new Date(isoString).getTime()) / 1000);
    if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return 'just now';
  }
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  stats,
  recentActivity,
  onSelectEvent,
  onNavigatePage,
}) => {
  const isAutomationActive = stats?.automationActive ?? true;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e222b]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-100 font-mono">
              Automation
            </h1>
            {/* Status indicator */}
            <div
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${
                isAutomationActive
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                  : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isAutomationActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span>{isAutomationActive ? 'Automation Active' : 'Automation Paused'}</span>
            </div>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Monitor your Whop member outreach.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigatePage('automation')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-semibold font-mono transition-colors cursor-pointer"
          >
            <span>Automation Controls</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Operational Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Metric 1: New Members */}
        <div className="p-3.5 rounded-md bg-[#0f1116] border border-[#1e222b]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">New Members</span>
            <Users className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-neutral-100">
            {stats ? stats.newMembers : '—'}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400 font-mono">
            {stats && stats.newMembers > 0 ? 'Recorded in pipeline' : 'No data yet'}
          </div>
        </div>

        {/* Metric 2: DMs Sent */}
        <div className="p-3.5 rounded-md bg-[#0f1116] border border-[#1e222b]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">DMs Sent</span>
            <Send className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-neutral-100">
            {stats ? stats.dmsSent : '—'}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400 font-mono">
            {stats && stats.dmsSent > 0 ? 'Welcome & follow-ups' : 'No data yet'}
          </div>
        </div>

        {/* Metric 3: Replies */}
        <div className="p-3.5 rounded-md bg-[#0f1116] border border-[#1e222b]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Replies</span>
            <MessageSquareReply className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-neutral-100">
            {stats ? stats.replies : '—'}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400 font-mono">
            {stats && stats.replies > 0 ? 'Automation stopped' : 'No data yet'}
          </div>
        </div>

        {/* Metric 4: Follow-ups Scheduled */}
        <div className="p-3.5 rounded-md bg-[#0f1116] border border-[#1e222b]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Follow-ups Scheduled</span>
            <CalendarClock className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-neutral-100">
            {stats ? stats.followUpsScheduled : '—'}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400 font-mono">
            {stats && stats.followUpsScheduled > 0 ? 'Queued (2-day delay)' : 'No data yet'}
          </div>
        </div>
      </div>

      {/* Main Activity Area */}
      <div className="rounded-md bg-[#0f1116] border border-[#1e222b] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1e222b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold text-neutral-200 font-mono uppercase tracking-wider">
              Recent Activity
            </h2>
            <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] font-mono text-neutral-400">
              {recentActivity.length}
            </span>
          </div>
          <button
            onClick={() => onNavigatePage('logs')}
            className="text-[11px] font-mono text-neutral-400 hover:text-neutral-200 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>View Full System Logs</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {recentActivity.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-4 text-center">
            <div className="w-9 h-9 mx-auto mb-3 rounded-full bg-neutral-800/60 border border-neutral-700/40 flex items-center justify-center text-neutral-500">
              <Zap className="w-4 h-4" />
            </div>
            <p className="text-sm font-medium text-neutral-300 font-mono">No activity yet</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              New Whop events will appear here automatically.
            </p>
          </div>
        ) : (
          /* Operational Activity Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090a0d] border-b border-[#1e222b] text-[11px] font-mono text-neutral-400">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Event</th>
                  <th className="py-2.5 px-4 font-medium">Member</th>
                  <th className="py-2.5 px-4 font-medium">Action</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222b]/60">
                {recentActivity.map((act) => {
                  const isSuccess = act.status === 'SUCCESS';
                  const isFailed = act.status === 'FAILED';
                  const isIgnored = act.status === 'IGNORED';

                  return (
                    <tr
                      key={act.id}
                      onClick={() => onSelectEvent(act)}
                      className="hover:bg-[#15171e] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-neutral-200">
                        <span className="text-neutral-300 group-hover:text-white transition-colors">
                          {act.eventType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-300 font-mono">
                        {act.memberUsername || '—'}
                      </td>
                      <td className="py-3 px-4 text-neutral-400">
                        {act.action}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${
                            isSuccess
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                              : isFailed
                              ? 'bg-rose-950/40 text-rose-400 border-rose-800/40'
                              : isIgnored
                              ? 'bg-neutral-800/60 text-neutral-400 border-neutral-700/50'
                              : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                          }`}
                        >
                          {act.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-neutral-400 text-[11px]">
                        {timeAgo(act.timestamp)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
