import React, { useState } from 'react';
import {
  Settings,
  Shield,
  KeyRound,
  RotateCw,
  Check,
  CheckCircle2,
  AlertCircle,
  Radio,
  Sliders,
  Save,
} from 'lucide-react';
import { AutomationSettings } from '../types';

interface SettingsPageProps {
  settings: AutomationSettings;
  onUpdateSettings: (settings: Partial<AutomationSettings>) => Promise<boolean>;
  onTestConnection: () => Promise<{ operational: boolean; latencyMs: number; message: string }>;
  onReconnect: () => Promise<{ success: boolean; connection: any }>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
  onTestConnection,
  onReconnect,
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ operational: boolean; latencyMs: number; message: string } | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectResult, setReconnectResult] = useState<string | null>(null);

  // Automation toggles
  const [automationEnabled, setAutomationEnabled] = useState(settings.automationEnabled);
  const [followUpEnabled, setFollowUpEnabled] = useState(settings.followUpEnabled);
  const [duplicateProtection, setDuplicateProtection] = useState(settings.duplicateProtection);
  const [replyDetection, setReplyDetection] = useState(settings.replyDetection);
  const [delayDays, setDelayDays] = useState(settings.followUpDelayDays || 2);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await onTestConnection();
    setIsTesting(false);
    setTestResult(res);
  };

  const handleReconnect = async () => {
    setIsReconnecting(true);
    setReconnectResult(null);
    const res = await onReconnect();
    setIsReconnecting(false);
    if (res.success) {
      setReconnectResult('Re-authenticated successfully with Whop API credentials');
      setTimeout(() => setReconnectResult(null), 3000);
    }
  };

  const handleSaveAutomationSettings = async () => {
    setIsSaving(true);
    const success = await onUpdateSettings({
      automationEnabled,
      followUpEnabled,
      duplicateProtection,
      replyDetection,
      followUpDelayDays: Number(delayDays),
    });
    setIsSaving(false);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-[#1e222b]">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-100 font-mono">
          Settings
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Whop API integration, automation safeguards, webhook credentials, and security.
        </p>
      </div>

      {/* Section 1: Whop Connection */}
      <div className="rounded-md bg-[#0f1116] border border-[#1e222b] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-neutral-400" />
          <h2 className="text-xs font-semibold text-neutral-200 font-mono uppercase tracking-wider">
            Whop Connection
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3 rounded bg-[#13161c] border border-[#1e222b] space-y-1">
            <span className="text-[10px] text-neutral-400 block">Connection Status</span>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-neutral-200 font-semibold">
                {settings.whopStatus === 'operational' ? 'Operational' : 'Unavailable'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded bg-[#13161c] border border-[#1e222b] space-y-1">
            <span className="text-[10px] text-neutral-400 block">API Version</span>
            <span className="text-neutral-200 font-semibold">{settings.apiVersion}</span>
          </div>

          <div className="p-3 rounded bg-[#13161c] border border-[#1e222b] space-y-1">
            <span className="text-[10px] text-neutral-400 block">API Key</span>
            <span className="text-neutral-300 font-semibold">{settings.maskedApiKey}</span>
          </div>
        </div>

        {/* Action buttons & feedback */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            id="btn-reconnect-whop"
            onClick={handleReconnect}
            disabled={isReconnecting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#15171d] hover:bg-neutral-800 border border-[#232732] text-neutral-300 hover:text-white text-xs font-mono transition-colors disabled:opacity-60 cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
            <span>{isReconnecting ? 'Reconnecting...' : 'Reconnect'}</span>
          </button>

          <button
            id="btn-test-whop-connection"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-semibold font-mono transition-colors disabled:opacity-60 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
          </button>

          {reconnectResult && (
            <span className="text-xs font-mono text-emerald-400">{reconnectResult}</span>
          )}
        </div>

        {/* Test Connection Output */}
        {testResult && (
          <div className="p-3 rounded bg-[#13161c] border border-[#1e222b] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  testResult.operational ? 'bg-emerald-400' : 'bg-rose-500'
                }`}
              />
              <span className="text-neutral-200">{testResult.message}</span>
            </div>
            <span className="text-neutral-400">{testResult.latencyMs}ms latency</span>
          </div>
        )}
      </div>

      {/* Section 2: Automation Settings */}
      <div className="rounded-md bg-[#0f1116] border border-[#1e222b] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-neutral-400" />
          <h2 className="text-xs font-semibold text-neutral-200 font-mono uppercase tracking-wider">
            Automation Settings
          </h2>
        </div>

        <div className="space-y-3">
          <SettingToggleRow
            label="Automation enabled"
            description="Global switch enabling or pausing all automated Whop member DM outreach."
            checked={automationEnabled}
            onChange={setAutomationEnabled}
          />

          <SettingToggleRow
            label="Follow-up enabled"
            description="Automatically schedule a 2-day follow-up DM if no response is detected."
            checked={followUpEnabled}
            onChange={setFollowUpEnabled}
          />

          <SettingToggleRow
            label="Duplicate protection"
            description="Guarantees members who have already been contacted are never sent duplicate outreach."
            checked={duplicateProtection}
            onChange={setDuplicateProtection}
          />

          <SettingToggleRow
            label="Reply detection"
            description="Monitors chat messages and stops scheduled follow-ups once a member replies."
            checked={replyDetection}
            onChange={setReplyDetection}
          />

          {/* Follow-up delay input */}
          <div className="p-2.5 rounded bg-[#13161c] border border-[#1e222b] flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-medium text-neutral-200 font-mono">Follow-up delay</div>
              <div className="text-[10px] text-neutral-400 font-mono">
                Duration to wait before sending automated follow-up check-in.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="14"
                value={delayDays}
                onChange={(e) => setDelayDays(Math.max(1, parseInt(e.target.value || '2', 10)))}
                className="w-16 px-2.5 py-1 rounded bg-[#090a0d] border border-[#1e222b] text-xs font-mono text-neutral-200 text-center focus:outline-none focus:border-neutral-600"
              />
              <span className="text-xs text-neutral-400 font-mono">days</span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="pt-2 flex items-center justify-end gap-3">
          {saveSuccess && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Saved</span>
            </span>
          )}
          <button
            id="btn-save-automation-settings"
            onClick={handleSaveAutomationSettings}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-semibold font-mono transition-colors disabled:opacity-60 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Section 3: Webhook */}
      <div className="rounded-md bg-[#0f1116] border border-[#1e222b] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-neutral-400" />
          <h2 className="text-xs font-semibold text-neutral-200 font-mono uppercase tracking-wider">
            Webhook Configuration
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
          <div className="p-3 rounded bg-[#13161c] border border-[#1e222b] space-y-1">
            <span className="text-[10px] text-neutral-400 block">Webhook Ingestion URL</span>
            <span className="text-neutral-200 font-semibold truncate block">
              {settings.endpointUrl}
            </span>
          </div>

          <div className="p-3 rounded bg-[#13161c] border border-[#1e222b] space-y-1">
            <span className="text-[10px] text-neutral-400 block">Webhook Secret Status</span>
            <span className="text-neutral-200 font-semibold">
              {settings.maskedWebhookSecret}
            </span>
          </div>
        </div>
      </div>

      {/* Section 4: Security */}
      <div className="rounded-md bg-[#0f1116] border border-[#1e222b] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-neutral-400" />
          <h2 className="text-xs font-semibold text-neutral-200 font-mono uppercase tracking-wider">
            Security & Compliance
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3 rounded bg-[#13161c] border border-[#1e222b] space-y-1">
            <span className="text-[10px] text-neutral-400 block">Last Credential Update</span>
            <span className="text-neutral-200 font-semibold">{settings.lastCredentialUpdate}</span>
          </div>

          <div className="p-3 rounded bg-[#13161c] border border-[#1e222b] space-y-1">
            <span className="text-[10px] text-neutral-400 block">Webhook Secret Status</span>
            <span className="text-emerald-400 font-semibold">Active (SHA-256 HMAC)</span>
          </div>

          <div className="p-3 rounded bg-[#13161c] border border-[#1e222b] space-y-1">
            <span className="text-[10px] text-neutral-400 block">Environment</span>
            <span className="text-neutral-200 font-semibold">PRODUCTION</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SettingToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}

const SettingToggleRow: React.FC<SettingToggleRowProps> = ({
  label,
  description,
  checked,
  onChange,
}) => {
  return (
    <div className="p-2.5 rounded bg-[#13161c] border border-[#1e222b] flex items-center justify-between gap-3">
      <div className="space-y-0.5">
        <div className="text-xs font-medium text-neutral-200 font-mono">{label}</div>
        <div className="text-[10px] text-neutral-400 font-mono">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 cursor-pointer ${
          checked ? 'bg-emerald-500' : 'bg-neutral-800'
        }`}
      >
        <span
          className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4.5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};
