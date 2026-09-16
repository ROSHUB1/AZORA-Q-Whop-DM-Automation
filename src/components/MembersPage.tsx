import React, { useState } from 'react';
import { Search, Filter, Users, ArrowUpDown } from 'lucide-react';
import { Member, DmStatus } from '../types';

interface MembersPageProps {
  members: Member[];
  onSelectMember: (member: Member) => void;
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

function getStatusPill(status: DmStatus) {
  switch (status) {
    case 'NEW':
      return 'bg-blue-950/40 text-blue-400 border-blue-800/40';
    case 'DM SENT':
      return 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40';
    case 'REPLIED':
      return 'bg-purple-950/40 text-purple-300 border-purple-800/40';
    case 'FOLLOW-UP SCHEDULED':
      return 'bg-amber-950/40 text-amber-400 border-amber-800/40';
    case 'FOLLOW-UP SENT':
      return 'bg-teal-950/40 text-teal-400 border-teal-800/40';
    case 'STOPPED':
      return 'bg-neutral-800/80 text-neutral-400 border-neutral-700/60';
    case 'FAILED':
      return 'bg-rose-950/40 text-rose-400 border-rose-800/40';
    default:
      return 'bg-neutral-800 text-neutral-400 border-neutral-700';
  }
}

export const MembersPage: React.FC<MembersPageProps> = ({ members, onSelectMember }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.whopMemberId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || m.dmStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses: { key: string; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'NEW', label: 'New' },
    { key: 'DM SENT', label: 'DM Sent' },
    { key: 'REPLIED', label: 'Replied' },
    { key: 'FOLLOW-UP SCHEDULED', label: 'Follow-up Scheduled' },
    { key: 'FOLLOW-UP SENT', label: 'Follow-up Sent' },
    { key: 'STOPPED', label: 'Stopped' },
    { key: 'FAILED', label: 'Failed' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e222b]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-100 font-mono">
              Members
            </h1>
            <span className="px-2 py-0.5 rounded bg-neutral-800/80 text-xs font-mono text-neutral-300">
              {members.length}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Operational member registry and outreach states.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            id="members-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username or member ID..."
            className="w-full pl-9 pr-3 py-1.5 rounded-md bg-[#0f1116] border border-[#1e222b] text-xs font-mono text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600 transition-colors"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {statuses.map((st) => (
            <button
              key={st.key}
              onClick={() => setStatusFilter(st.key)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === st.key
                  ? 'bg-neutral-800 text-white font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Member Table */}
      <div className="rounded-md bg-[#0f1116] border border-[#1e222b] overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-9 h-9 mx-auto mb-3 rounded-full bg-neutral-800/60 border border-neutral-700/40 flex items-center justify-center text-neutral-500">
              <Users className="w-4 h-4" />
            </div>
            <p className="text-sm font-medium text-neutral-300 font-mono">
              {members.length === 0 ? 'No members recorded yet' : 'No matching members found'}
            </p>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto font-mono">
              {members.length === 0
                ? 'Members joining via Whop webhooks will automatically populate here.'
                : 'Try clearing your search or status filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090a0d] border-b border-[#1e222b] text-[11px] font-mono text-neutral-400">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Member</th>
                  <th className="py-2.5 px-4 font-medium">Member ID</th>
                  <th className="py-2.5 px-4 font-medium">Joined</th>
                  <th className="py-2.5 px-4 font-medium">DM Status</th>
                  <th className="py-2.5 px-4 font-medium">Follow-up</th>
                  <th className="py-2.5 px-4 font-medium text-right">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222b]/60">
                {filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    onClick={() => onSelectMember(member)}
                    className="hover:bg-[#15171e] transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono">
                      <div className="font-semibold text-neutral-200 group-hover:text-white transition-colors">
                        {member.username}
                      </div>
                      {member.email && (
                        <div className="text-[11px] text-neutral-400 font-normal">
                          {member.email}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-300 text-[11px]">
                      {member.whopMemberId}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-400 text-[11px]">
                      {new Date(member.joinedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${getStatusPill(
                          member.dmStatus
                        )}`}
                      >
                        {member.dmStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {member.followUpStatus === 'SCHEDULED' ? (
                        <span className="text-amber-400">Scheduled (2d)</span>
                      ) : member.followUpStatus === 'SENT' ? (
                        <span className="text-teal-400">Follow-up Sent</span>
                      ) : member.followUpStatus === 'CANCELLED_REPLIED' ? (
                        <span className="text-purple-400">Cancelled (Replied)</span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-neutral-400 text-[11px]">
                      {timeAgo(member.lastActivity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
