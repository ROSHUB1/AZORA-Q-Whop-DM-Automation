import React from 'react';
import {
  X,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Clock4,
  Ban,
  MessageSquare,
  Shield,
  Layers,
} from 'lucide-react';
import { Member, DmStatus } from '../types';

interface MemberDrawerProps {
  member: Member | null;
  onClose: () => void;
}

function getStatusBadge(status: DmStatus) {
  switch (status) {
    case 'NEW':
      return {
        bg: 'bg-blue-950/40 text-blue-400 border-blue-800/40',
        label: 'NEW',
      };
    case 'DM SENT':
      return {
        bg: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
        label: 'DM SENT',
      };
    case 'REPLIED':
      return {
        bg: 'bg-purple-950/40 text-purple-300 border-purple-800/40',
        label: 'REPLIED',
      };
    case 'FOLLOW-UP SCHEDULED':
      return {
        bg: 'bg-amber-950/40 text-amber-400 border-amber-800/40',
        label: 'FOLLOW-UP SCHEDULED',
      };
    case 'FOLLOW-UP SENT':
      return {
        bg: 'bg-teal-950/40 text-teal-400 border-teal-800/40',
        label: 'FOLLOW-UP SENT',
      };
    case 'STOPPED':
      return {
        bg: 'bg-neutral-800 text-neutral-300 border-neutral-700',
        label: 'STOPPED',
      };
    case 'FAILED':
      return {
        bg: 'bg-rose-950/40 text-rose-400 border-rose-800/40',
        label: 'FAILED',
      };
    default:
      return {
        bg: 'bg-neutral-800 text-neutral-400 border-neutral-700',
        label: status,
      };
  }
}

export const MemberDrawer: React.FC<MemberDrawerProps> = ({ member, onClose }) => {
  if (!member) return null;

  const statusBadge = getStatusBadge(member.dmStatus);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-[2px]">
      <div
        className="w-full max-w-md bg-[#0e1014] border-l border-[#1e222b] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#1e222b] flex items-center justify-between bg-[#090a0d]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 font-mono text-xs font-semibold">
              {member.username.replace('@', '').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-100 font-mono">
                {member.username}
              </h3>
              <p className="text-[11px] font-mono text-neutral-400">
                {member.whopMemberId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${statusBadge.bg}`}
            >
              {statusBadge.label}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 flex-1 overflow-y-auto space-y-5 text-xs">
          {/* Metadata Card */}
          <div className="p-3 rounded-md bg-[#13161c] border border-[#1e222b] space-y-2.5 font-mono">
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Member Details
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-neutral-400 block text-[10px]">Whop Member ID</span>
                <span className="text-neutral-200 font-semibold">{member.whopMemberId}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">Membership</span>
                <span className="text-emerald-400 uppercase font-medium">
                  {member.membershipStatus}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">Joined Timestamp</span>
                <span className="text-neutral-300">
                  {new Date(member.joinedAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">Experience</span>
                <span className="text-neutral-300 truncate block">
                  {member.experienceName || 'Main Hub'}
                </span>
              </div>
            </div>
          </div>

          {/* Current Automation State */}
          <div className="p-3 rounded-md bg-[#13161c] border border-[#1e222b] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider font-mono">
                Current Automation State
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                Phase: {member.dmStatus}
              </span>
            </div>

            <div className="text-[11px] text-neutral-300 space-y-1 font-mono">
              {member.followUpStatus === 'SCHEDULED' && member.followUpScheduledFor && (
                <div className="p-2 rounded bg-amber-950/20 border border-amber-800/30 text-amber-300 text-[11px]">
                  Follow-up queued for{' '}
                  {new Date(member.followUpScheduledFor).toLocaleString()}
                </div>
              )}
              {member.dmStatus === 'REPLIED' && (
                <div className="p-2 rounded bg-purple-950/20 border border-purple-800/30 text-purple-300 text-[11px]">
                  Reply detected. Outreach successfully concluded.
                </div>
              )}
              {member.dmStatus === 'STOPPED' && member.stoppedReason && (
                <div className="p-2 rounded bg-neutral-800/60 border border-neutral-700 text-neutral-300 text-[11px]">
                  Stopped: {member.stoppedReason}
                </div>
              )}
            </div>
          </div>

          {/* Timeline Section */}
          <div className="space-y-2.5">
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider font-mono">
              Outreach Timeline
            </div>

            <div className="relative pl-4 space-y-4 border-l border-neutral-800 ml-2">
              {member.timeline && member.timeline.length > 0 ? (
                member.timeline.map((item, index) => {
                  const isSuccess = item.status === 'SUCCESS';
                  const isFailed = item.status === 'FAILED';

                  return (
                    <div key={item.id || index} className="relative group">
                      {/* Node circle */}
                      <span
                        className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 bg-[#0e1014] ${
                          isSuccess
                            ? 'border-emerald-400'
                            : isFailed
                            ? 'border-rose-500'
                            : 'border-neutral-500'
                        }`}
                      />
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-neutral-200 font-mono">
                            {item.title}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400">
                            {new Date(item.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: false,
                            })}
                          </span>
                        </div>
                        {item.note && (
                          <p className="text-[11px] text-neutral-400 font-mono">
                            {item.note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-neutral-500 text-xs">No timeline events recorded.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
