import React, { useState } from 'react';
import {
  Terminal,
  Search,
  ChevronRight,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
  FileCode,
} from 'lucide-react';
import { AutomationEvent } from '../types';

interface LogsPageProps {
  logs: AutomationEvent[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export const LogsPage: React.FC<LogsPageProps> = ({
  logs,
  activeFilter,
  onFilterChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.memberUsername && log.memberUsername.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.memberId && log.memberId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter =
      activeFilter === 'all' || log.status.toLowerCase() === activeFilter.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  const filterTabs = [
    { key: 'all', label: 'All' },
    { key: 'success', label: 'Success' },
    { key: 'failed', label: 'Failed' },
    { key: 'ignored', label: 'Ignored' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e222b]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-100 font-mono">
              Logs
            </h1>
            <span className="px-2 py-0.5 rounded bg-neutral-800/80 text-xs font-mono text-neutral-300">
              {logs.length} Events
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Structured automation pipeline event log and execution traces.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            id="logs-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search event type, action or member..."
            className="w-full pl-9 pr-3 py-1.5 rounded-md bg-[#0f1116] border border-[#1e222b] text-xs font-mono text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600 transition-colors"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onFilterChange(tab.key)}
              className={`px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                activeFilter === tab.key
                  ? 'bg-neutral-800 text-white font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Console Log Terminal Area */}
      <div className="rounded-md bg-[#07080a] border border-[#1e222b] overflow-hidden font-mono text-xs shadow-inner">
        {/* Terminal Header */}
        <div className="px-4 py-2.5 bg-[#0e1014] border-b border-[#1e222b] flex items-center justify-between text-neutral-400 text-[11px]">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-neutral-400" />
            <span>AZORA-Q Internal Event Stream</span>
          </div>
          <span>Format: [Time] [Topic] [Status] [Latency]</span>
        </div>

        {/* Log Entries */}
        {filteredLogs.length === 0 ? (
          <div className="py-16 px-4 text-center text-neutral-500">
            <p className="text-xs">No matching event logs found</p>
          </div>
        ) : (
          <div className="divide-y divide-[#181a20]">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogIds.has(log.id);
              const isSuccess = log.status === 'SUCCESS';
              const isFailed = log.status === 'FAILED';
              const isIgnored = log.status === 'IGNORED';

              const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              });

              return (
                <div key={log.id} className="group">
                  <div
                    onClick={() => toggleExpand(log.id)}
                    className="px-4 py-2.5 flex items-center justify-between hover:bg-[#0f1116] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <button className="text-neutral-400 group-hover:text-neutral-200 transition-colors">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Time */}
                      <span className="text-neutral-400 shrink-0 text-[11px]">{timeStr}</span>

                      {/* Event topic */}
                      <span className="text-neutral-200 font-semibold group-hover:text-white truncate">
                        {log.eventType}
                      </span>

                      {/* Member Tag */}
                      {log.memberUsername && (
                        <span className="text-neutral-400 text-[11px] truncate">
                          {log.memberUsername}
                        </span>
                      )}

                      {/* Action summary */}
                      <span className="text-neutral-400 text-[11px] hidden md:inline truncate">
                        — {log.action}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {log.executionTimeMs !== undefined && (
                        <span className="text-[10px] text-neutral-400">
                          {log.executionTimeMs}ms
                        </span>
                      )}

                      {/* Status badge */}
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${
                          isSuccess
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                            : isFailed
                            ? 'bg-rose-950/40 text-rose-400 border-rose-800/40'
                            : isIgnored
                            ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                            : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                  </div>

                  {/* Expanded JSON details */}
                  {isExpanded && (
                    <div className="p-4 bg-[#030405] border-t border-[#181a20] space-y-2 text-[11px]">
                      <div className="text-[10px] uppercase font-semibold text-neutral-400">
                        Structured Event Payload
                      </div>
                      <pre className="text-neutral-300 bg-[#08090c] p-3 rounded border border-[#1e222b] overflow-x-auto leading-relaxed">
                        {JSON.stringify(
                          {
                            id: log.id,
                            timestamp: log.timestamp,
                            eventType: log.eventType,
                            memberId: log.memberId,
                            memberUsername: log.memberUsername,
                            action: log.action,
                            status: log.status,
                            executionTimeMs: log.executionTimeMs,
                            details: log.details,
                            rawPayload: log.rawPayload,
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
