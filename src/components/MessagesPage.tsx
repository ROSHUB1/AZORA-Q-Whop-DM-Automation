import React, { useState } from 'react';
import { MessageSquare, Send, CornerDownLeft, Clock } from 'lucide-react';
import { Message } from '../types';
import { PayloadModal } from './PayloadModal';

interface MessagesPageProps {
  messages: Message[];
}

function timeAgo(isoString: string): string {
  try {
    const seconds = Math.floor((new Date().getTime() - new Date(isoString).getTime()) / 1000);
    if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch {
    return 'just now';
  }
}

function getTypeBadge(type: 'INITIAL' | 'FOLLOW-UP' | 'REPLY') {
  switch (type) {
    case 'INITIAL':
      return 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40';
    case 'FOLLOW-UP':
      return 'bg-amber-950/40 text-amber-400 border-amber-800/40';
    case 'REPLY':
      return 'bg-purple-950/40 text-purple-300 border-purple-800/40';
    default:
      return 'bg-neutral-800 text-neutral-400 border-neutral-700';
  }
}

export const MessagesPage: React.FC<MessagesPageProps> = ({ messages }) => {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e222b]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-100 font-mono">
              Messages
            </h1>
            <span className="px-2 py-0.5 rounded bg-neutral-800/80 text-xs font-mono text-neutral-300">
              {messages.length}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Outreach messages dispatched and incoming replies recorded by automation.
          </p>
        </div>
      </div>

      {/* Messages Table */}
      <div className="rounded-md bg-[#0f1116] border border-[#1e222b] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1e222b] flex items-center justify-between">
          <h2 className="text-xs font-semibold text-neutral-200 font-mono uppercase tracking-wider">
            Message Log
          </h2>
          <span className="text-[11px] font-mono text-neutral-400">
            Click row to view full text
          </span>
        </div>

        {messages.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-9 h-9 mx-auto mb-3 rounded-full bg-neutral-800/60 border border-neutral-700/40 flex items-center justify-center text-neutral-500">
              <MessageSquare className="w-4 h-4" />
            </div>
            <p className="text-sm font-medium text-neutral-300 font-mono">No messages processed yet</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto font-mono">
              Welcome DMs, scheduled follow-ups, and incoming member responses will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090a0d] border-b border-[#1e222b] text-[11px] font-mono text-neutral-400">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Member</th>
                  <th className="py-2.5 px-4 font-medium">Type</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium">Sent</th>
                  <th className="py-2.5 px-4 font-medium">Response / Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222b]/60">
                {messages.map((msg) => (
                  <tr
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className="hover:bg-[#15171e] transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-neutral-200">
                      <span className="group-hover:text-white transition-colors">
                        {msg.memberUsername}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${getTypeBadge(
                          msg.type
                        )}`}
                      >
                        {msg.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-mono text-neutral-300">
                        {msg.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-400 text-[11px]">
                      {timeAgo(msg.sentAt)}
                    </td>
                    <td className="py-3 px-4 text-neutral-400 font-mono text-[11px] max-w-md truncate">
                      {msg.content}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Message Inspector */}
      {selectedMessage && (
        <PayloadModal
          title={`Message Details: ${selectedMessage.type}`}
          subtitle={`Member: ${selectedMessage.memberUsername} • ID: ${selectedMessage.id}`}
          data={{
            id: selectedMessage.id,
            memberId: selectedMessage.memberId,
            memberUsername: selectedMessage.memberUsername,
            type: selectedMessage.type,
            status: selectedMessage.status,
            content: selectedMessage.content,
            sentAt: selectedMessage.sentAt,
            whopMessageId: selectedMessage.whopMessageId,
          }}
          onClose={() => setSelectedMessage(null)}
        />
      )}
    </div>
  );
};
