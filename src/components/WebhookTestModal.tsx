import React, { useState } from 'react';
import { X, Play, Radio, CheckCircle2, AlertCircle } from 'lucide-react';

interface WebhookTestModalProps {
  onClose: () => void;
  onExecuteTest: (topic: string, payload: any) => Promise<any>;
}

export const WebhookTestModal: React.FC<WebhookTestModalProps> = ({
  onClose,
  onExecuteTest,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<'membership_valid' | 'reply' | 'canceled' | 'duplicate'>('membership_valid');
  const [customUsername, setCustomUsername] = useState('jordan_agency');
  const [customEmail, setCustomEmail] = useState('jordan@client.io');
  const [replyText, setReplyText] = useState('Thanks for reaching out! Looking forward to working together.');
  const [duplicateEventId, setDuplicateEventId] = useState('evt_dup_test_9921');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  const handleRunTest = async () => {
    setIsLoading(true);
    setTestResult(null);

    let topic = 'membership.went_valid';
    let payload: any = {};

    if (selectedPreset === 'membership_valid') {
      topic = 'membership.went_valid';
      payload = {
        id: `evt_valid_${Date.now()}`,
        action: 'membership.went_valid',
        data: {
          member_id: `mbr_${Math.random().toString(36).substring(2, 9)}`,
          username: customUsername.startsWith('@') ? customUsername : `@${customUsername}`,
          email: customEmail,
          experience_name: 'Agency VIP Program',
        },
      };
    } else if (selectedPreset === 'reply') {
      topic = 'chat.message_created';
      payload = {
        id: `evt_reply_${Date.now()}`,
        action: 'chat.message_created',
        data: {
          sender_name: customUsername.startsWith('@') ? customUsername : `@${customUsername}`,
          body: replyText,
          created_at: new Date().toISOString(),
        },
      };
    } else if (selectedPreset === 'canceled') {
      topic = 'membership.canceled';
      payload = {
        id: `evt_canc_${Date.now()}`,
        action: 'membership.canceled',
        data: {
          member_id: `mbr_${Math.random().toString(36).substring(2, 9)}`,
          username: customUsername.startsWith('@') ? customUsername : `@${customUsername}`,
          status: 'canceled',
        },
      };
    } else if (selectedPreset === 'duplicate') {
      topic = 'membership.went_valid';
      payload = {
        id: duplicateEventId,
        action: 'membership.went_valid',
        data: {
          member_id: 'mbr_duplicate_member',
          username: '@duplicate_user',
          email: 'dup@agency.io',
        },
      };
    }

    const res = await onExecuteTest(topic, payload);
    setIsLoading(false);
    setTestResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4">
      <div
        className="w-full max-w-lg bg-[#0e1014] border border-[#1e222b] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#1e222b] bg-[#090a0d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-neutral-100 font-mono">
              Test Webhook Dispatch
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <div>
            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider font-mono block mb-1.5">
              Select Webhook Event Topic
            </label>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => setSelectedPreset('membership_valid')}
                className={`p-2.5 rounded text-left border transition-colors cursor-pointer ${
                  selectedPreset === 'membership_valid'
                    ? 'bg-neutral-800 border-neutral-600 text-white'
                    : 'bg-[#13161c] border-[#1e222b] text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="font-semibold">membership.went_valid</div>
                <div className="text-[10px] text-neutral-400 mt-0.5">New member joins</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPreset('reply')}
                className={`p-2.5 rounded text-left border transition-colors cursor-pointer ${
                  selectedPreset === 'reply'
                    ? 'bg-neutral-800 border-neutral-600 text-white'
                    : 'bg-[#13161c] border-[#1e222b] text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="font-semibold">chat.message_created</div>
                <div className="text-[10px] text-neutral-400 mt-0.5">Member reply detected</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPreset('canceled')}
                className={`p-2.5 rounded text-left border transition-colors cursor-pointer ${
                  selectedPreset === 'canceled'
                    ? 'bg-neutral-800 border-neutral-600 text-white'
                    : 'bg-[#13161c] border-[#1e222b] text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="font-semibold">membership.canceled</div>
                <div className="text-[10px] text-neutral-400 mt-0.5">Pass revoked</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPreset('duplicate')}
                className={`p-2.5 rounded text-left border transition-colors cursor-pointer ${
                  selectedPreset === 'duplicate'
                    ? 'bg-neutral-800 border-neutral-600 text-white'
                    : 'bg-[#13161c] border-[#1e222b] text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="font-semibold">Duplicate Event Test</div>
                <div className="text-[10px] text-neutral-400 mt-0.5">Tests idempotency guard</div>
              </button>
            </div>
          </div>

          {/* Preset Customization Fields */}
          {selectedPreset === 'membership_valid' && (
            <div className="space-y-2 font-mono text-[11px]">
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">Test Username</label>
                <input
                  type="text"
                  value={customUsername}
                  onChange={(e) => setCustomUsername(e.target.value)}
                  className="w-full p-2 rounded bg-[#13161c] border border-[#1e222b] text-neutral-200 focus:outline-none focus:border-neutral-600"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">Test Email</label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full p-2 rounded bg-[#13161c] border border-[#1e222b] text-neutral-200 focus:outline-none focus:border-neutral-600"
                />
              </div>
            </div>
          )}

          {selectedPreset === 'reply' && (
            <div className="space-y-2 font-mono text-[11px]">
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">Responding Member Username</label>
                <input
                  type="text"
                  value={customUsername}
                  onChange={(e) => setCustomUsername(e.target.value)}
                  className="w-full p-2 rounded bg-[#13161c] border border-[#1e222b] text-neutral-200 focus:outline-none focus:border-neutral-600"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">Reply Message Content</label>
                <textarea
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full p-2 rounded bg-[#13161c] border border-[#1e222b] text-neutral-200 focus:outline-none focus:border-neutral-600"
                />
              </div>
            </div>
          )}

          {/* Test Results Banner */}
          {testResult && (
            <div className="p-3 rounded-md bg-[#13161c] border border-[#1e222b] space-y-1.5 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-semibold text-neutral-400">
                  Execution Output
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    testResult.result?.status === 'SUCCESS'
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                      : testResult.result?.status === 'IGNORED'
                      ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      : 'bg-rose-950/40 text-rose-400 border-rose-800/40'
                  }`}
                >
                  {testResult.result?.status}
                </span>
              </div>
              <p className="text-[11px] text-neutral-200">
                {testResult.result?.message || 'Processed successfully'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 border-t border-[#1e222b] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-transparent hover:bg-neutral-800 text-neutral-400 hover:text-white font-mono text-xs cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              id="btn-execute-webhook-test"
              onClick={handleRunTest}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-mono text-xs font-semibold disabled:opacity-60 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Executing...' : 'Dispatch Test Event'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
