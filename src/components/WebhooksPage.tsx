import React, { useState } from 'react';
import {
  Radio,
  Play,
  Copy,
  Check,
  Shield,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { WebhookEvent, ProcessingStatus } from '../types';
import { WebhookTestModal } from './WebhookTestModal';
import { PayloadModal } from './PayloadModal';

interface WebhooksPageProps {
  webhooks: WebhookEvent[];
  endpointUrl: string;
  apiVersion: string;
  maskedSecret: string;
  isWhopConnected: boolean;
  onExecuteTest: (topic: string, payload: any) => Promise<any>;
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

function getResultPill(status: ProcessingStatus) {
  switch (status) {
    case 'SUCCESS':
      return 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40';
    case 'PROCESSING':
      return 'bg-amber-950/40 text-amber-400 border-amber-800/40';
    case 'RECEIVED':
      return 'bg-blue-950/40 text-blue-400 border-blue-800/40';
    case 'IGNORED':
      return 'bg-neutral-800 text-neutral-400 border-neutral-700';
    case 'FAILED':
      return 'bg-rose-950/40 text-rose-400 border-rose-800/40';
    default:
      return 'bg-neutral-800 text-neutral-400 border-neutral-700';
  }
}

export const WebhooksPage: React.FC<WebhooksPageProps> = ({
  webhooks,
  endpointUrl,
  apiVersion,
  maskedSecret,
  isWhopConnected,
  onExecuteTest,
}) => {
  const [copied, setCopied] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedPayload, setSelectedPayload] = useState<any | null>(null);

  const lastEvent = webhooks.length > 0 ? webhooks[0] : null;

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(endpointUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e222b]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-100 font-mono">
              Webhooks
            </h1>
            <span className="px-2 py-0.5 rounded bg-neutral-800/80 text-xs font-mono text-neutral-300">
              {webhooks.length} Events
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Technical webhook gateway and event ingestion telemetry.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2">
          <button
            id="btn-open-test-webhook"
            onClick={() => setShowTestModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-semibold font-mono transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Test Webhook</span>
          </button>
        </div>
      </div>

      {/* Top Operational Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Endpoint Card */}
        <div className="p-3.5 rounded-md bg-[#0f1116] border border-[#1e222b] md:col-span-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Webhook Endpoint</span>
            <button
              onClick={handleCopyEndpoint}
              className="flex items-center gap-1 text-[11px] font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="text-xs font-mono text-neutral-200 truncate bg-[#090a0d] px-2.5 py-1.5 rounded border border-[#1e222b]">
            {endpointUrl}
          </div>
        </div>

        {/* Connection Status */}
        <div className="p-3.5 rounded-md bg-[#0f1116] border border-[#1e222b] space-y-1">
          <span className="text-xs font-medium text-neutral-400">Connection Status</span>
          <div className="flex items-center gap-2 pt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold font-mono text-neutral-200">
              {isWhopConnected ? 'Connected (Live)' : 'Connected (Standby)'}
            </span>
          </div>
          <div className="text-[10px] font-mono text-neutral-400 pt-0.5">
            Ingestion active
          </div>
        </div>

        {/* Last Event */}
        <div className="p-3.5 rounded-md bg-[#0f1116] border border-[#1e222b] space-y-1">
          <span className="text-xs font-medium text-neutral-400">Last Event Received</span>
          <div className="text-xs font-semibold font-mono text-neutral-200 pt-1">
            {lastEvent ? timeAgo(lastEvent.receivedAt) : 'No events yet'}
          </div>
          <div className="text-[10px] font-mono text-neutral-400 truncate">
            {lastEvent ? lastEvent.topic : '—'}
          </div>
        </div>
      </div>

      {/* Webhook Events Table */}
      <div className="rounded-md bg-[#0f1116] border border-[#1e222b] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1e222b] flex items-center justify-between">
          <h2 className="text-xs font-semibold text-neutral-200 font-mono uppercase tracking-wider">
            Ingested Webhooks
          </h2>
          <span className="text-[11px] font-mono text-neutral-400">
            Click row to view raw JSON payload
          </span>
        </div>

        {webhooks.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-9 h-9 mx-auto mb-3 rounded-full bg-neutral-800/60 border border-neutral-700/40 flex items-center justify-center text-neutral-500">
              <Radio className="w-4 h-4" />
            </div>
            <p className="text-sm font-medium text-neutral-300 font-mono">No webhooks received yet</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto font-mono">
              Events dispatched from Whop will be verified and displayed here in real time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090a0d] border-b border-[#1e222b] text-[11px] font-mono text-neutral-400">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Event</th>
                  <th className="py-2.5 px-4 font-medium">Received</th>
                  <th className="py-2.5 px-4 font-medium">Processing</th>
                  <th className="py-2.5 px-4 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222b]/60">
                {webhooks.map((wh) => (
                  <tr
                    key={wh.id}
                    onClick={() =>
                      setSelectedPayload({
                        title: `Webhook: ${wh.topic}`,
                        subtitle: `Event ID: ${wh.eventId} • Duration: ${wh.durationMs}ms`,
                        data: wh.payload,
                      })
                    }
                    className="hover:bg-[#15171e] transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-neutral-200">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-300 group-hover:text-white">
                          {wh.topic}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {wh.eventId.slice(0, 18)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-400 text-[11px]">
                      {new Date(wh.receivedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-300 text-[11px]">
                      {wh.durationMs}ms
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${getResultPill(
                          wh.processingStatus
                        )}`}
                      >
                        {wh.processingStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Technical Configuration Section */}
      <div className="rounded-md bg-[#0f1116] border border-[#1e222b] p-4 space-y-3">
        <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider font-mono">
          Technical Parameters & Credentials
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded bg-[#13161c] border border-[#1e222b] space-y-1">
            <span className="text-[10px] text-neutral-400 block">Endpoint Path</span>
            <span className="text-neutral-200 font-semibold truncate block">/api/webhooks/whop</span>
          </div>

          <div className="p-3 rounded bg-[#13161c] border border-[#1e222b] space-y-1">
            <span className="text-[10px] text-neutral-400 block">Webhook Secret</span>
            <span className="text-neutral-200 font-semibold">{maskedSecret}</span>
          </div>

          <div className="p-3 rounded bg-[#13161c] border border-[#1e222b] space-y-1">
            <span className="text-[10px] text-neutral-400 block">API Version</span>
            <span className="text-neutral-200 font-semibold">{apiVersion}</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showTestModal && (
        <WebhookTestModal
          onClose={() => setShowTestModal(false)}
          onExecuteTest={onExecuteTest}
        />
      )}

      {selectedPayload && (
        <PayloadModal
          title={selectedPayload.title}
          subtitle={selectedPayload.subtitle}
          data={selectedPayload.data}
          onClose={() => setSelectedPayload(null)}
        />
      )}
    </div>
  );
};
