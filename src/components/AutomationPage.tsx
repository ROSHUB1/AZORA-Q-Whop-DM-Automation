import React, { useState } from 'react';
import {
  Play,
  Pause,
  ArrowDown,
  Save,
  Check,
  ShieldCheck,
  Sliders,
  Sparkles,
  GitFork,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { AutomationSettings } from '../types';
import { WorkflowNodeModal, WorkflowNodeDetail } from './WorkflowNodeModal';

interface AutomationPageProps {
  settings: AutomationSettings;
  onUpdateSettings: (settings: Partial<AutomationSettings>) => Promise<boolean>;
  onToggleAutomation: (enabled: boolean) => Promise<boolean>;
}

const WORKFLOW_NODES: Record<string, WorkflowNodeDetail> = {
  new_member: {
    id: 'new_member',
    name: 'NEW MEMBER',
    stage: 'TRIGGER 01',
    description: 'Incoming Whop webhook listener captures new member signup or pass activation event.',
    triggerCondition: 'webhook.action == "membership.went_valid" || "membership.created"',
    parameters: {
      source: 'Whop Webhook Engine',
      signatureAuth: 'HMAC SHA-256',
    },
    safeguards: ['Signature header verification', 'Payload schema validation'],
    failureAction: 'HTTP 403 / Reject unverified payload',
  },
  verify_member: {
    id: 'verify_member',
    name: 'VERIFY MEMBER',
    stage: 'STEP 02',
    description: 'Verifies membership status and confirms the member is active and entitled to agency onboarding.',
    triggerCondition: 'membership.status == "active" || "trialing"',
    parameters: {
      accessPassCheck: true,
      experienceVerification: true,
    },
    safeguards: ['Filter out refunded/canceled events', 'Validate Whop User ID'],
    failureAction: 'Mark event IGNORED, no DM dispatched',
  },
  check_contact_history: {
    id: 'check_contact_history',
    name: 'CHECK CONTACT HISTORY',
    stage: 'STEP 03',
    description: 'Queries local database to check if this member has ever been sent a DM before to prevent duplicates.',
    triggerCondition: 'db.hasMemberBeenContacted(whopMemberId)',
    parameters: {
      duplicateProtection: 'ENABLED',
      mode: 'Strict Idempotency',
    },
    safeguards: ['Cross-check message history', 'Check active conversation registry'],
    failureAction: 'Halt pipeline, status STOPPED (Previously Contacted)',
  },
  open_find_dm: {
    id: 'open_find_dm',
    name: 'OPEN / FIND DM',
    stage: 'STEP 04',
    description: 'Locates existing direct message thread or initializes a new conversation in Whop DM API.',
    triggerCondition: 'Conversation resolution request to Whop API v5',
    parameters: {
      endpoint: '/api/v5/messages',
      rateLimitTier: 'Agency Tier (60 req/min)',
    },
    safeguards: ['Exponential backoff retry', 'Rate-limit queue buffer'],
    failureAction: 'Log error, queue for background retry',
  },
  send_initial_message: {
    id: 'send_initial_message',
    name: 'SEND INITIAL MESSAGE',
    stage: 'STEP 05',
    description: 'Dispatches the approved welcome/outreach message with dynamic variable interpolation ({firstName}, {username}).',
    triggerCondition: 'Valid conversation channel established',
    parameters: {
      templateType: 'Approved Welcome Outreach',
      senderMode: 'Agency Admin Operator',
    },
    safeguards: ['Template sanitization', 'Zero unsolicited external links'],
    failureAction: 'Record status FAILED, alert in logs',
  },
  wait_delay: {
    id: 'wait_delay',
    name: 'WAIT 2 DAYS',
    stage: 'STEP 06',
    description: 'Schedules an automated timer before follow-up check. Delay is fully configurable.',
    triggerCondition: 'Initial DM confirmed sent',
    parameters: {
      defaultDelay: '2 Days (48 Hours)',
      precision: 'Server cron background sweep',
    },
    safeguards: ['Persistent timestamp storage', 'Safe across server restarts'],
    failureAction: 'Persist state to database',
  },
  check_reply: {
    id: 'check_reply',
    name: 'CHECK FOR REPLY',
    stage: 'STEP 07',
    description: 'Listens for incoming messages or checks chat history to determine if member has replied.',
    triggerCondition: 'Incoming message from member or follow-up timer expiry',
    parameters: {
      replyDetection: 'ENABLED',
      eventTopic: 'chat.message_created',
    },
    safeguards: ['Automatic follow-up cancellation on reply', 'State lockdown'],
    failureAction: 'Proceed to follow-up branch if no reply',
  },
  branch_no_reply: {
    id: 'branch_no_reply',
    name: 'IF NO REPLY → SEND FOLLOW-UP',
    stage: 'BRANCH A',
    description: 'If 2 days elapsed and no reply received from member, dispatches approved follow-up check-in.',
    triggerCondition: 'elapsed >= 48h && member.dmStatus != "REPLIED"',
    parameters: {
      templateType: 'Approved Gentle Follow-Up',
      maxFollowUps: '1 (Anti-Spam Policy)',
    },
    safeguards: ['Strict limit of 1 follow-up', 'Status updated to FOLLOW-UP SENT'],
    failureAction: 'Mark FAILED in event log',
  },
  branch_replied: {
    id: 'branch_replied',
    name: 'IF REPLIED → STOP',
    stage: 'BRANCH B',
    description: 'If the member replies at any time, follow-up is immediately cancelled and automation concludes.',
    triggerCondition: 'member.dmStatus == "REPLIED"',
    parameters: {
      action: 'CANCEL_FOLLOW_UP',
      state: 'STOPPED / COMPLETED',
    },
    safeguards: ['Immediate queue eviction', 'No further automated outreach'],
    failureAction: 'Conclude pipeline gracefully',
  },
};

export const AutomationPage: React.FC<AutomationPageProps> = ({
  settings,
  onUpdateSettings,
  onToggleAutomation,
}) => {
  const [initialMsg, setInitialMsg] = useState(settings.initialMessageTemplate);
  const [followUpMsg, setFollowUpMsg] = useState(settings.followUpMessageTemplate);
  const [delayDays, setDelayDays] = useState(settings.followUpDelayDays || 2);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Safeguards state
  const [duplicateProtection, setDuplicateProtection] = useState(settings.duplicateProtection);
  const [replyDetection, setReplyDetection] = useState(settings.replyDetection);
  const [retryFailedWebhooks, setRetryFailedWebhooks] = useState(settings.retryFailedWebhooks);
  const [idempotentHandling, setIdempotentHandling] = useState(settings.idempotentHandling);
  const [rateLimitProtection, setRateLimitProtection] = useState(settings.rateLimitProtection);

  // Selected node modal
  const [selectedNode, setSelectedNode] = useState<WorkflowNodeDetail | null>(null);

  const handleSaveMessages = async () => {
    setIsSaving(true);
    const success = await onUpdateSettings({
      initialMessageTemplate: initialMsg,
      followUpMessageTemplate: followUpMsg,
      followUpDelayDays: Number(delayDays),
    });
    setIsSaving(false);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const handleToggleSafeguard = async (key: keyof AutomationSettings, value: boolean) => {
    if (key === 'duplicateProtection') setDuplicateProtection(value);
    if (key === 'replyDetection') setReplyDetection(value);
    if (key === 'retryFailedWebhooks') setRetryFailedWebhooks(value);
    if (key === 'idempotentHandling') setIdempotentHandling(value);
    if (key === 'rateLimitProtection') setRateLimitProtection(value);

    await onUpdateSettings({ [key]: value });
  };

  const isRunning = settings.automationEnabled;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e222b]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-100 font-mono">
              Automation
            </h1>
            <div
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${
                isRunning
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                  : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span>{isRunning ? 'Running' : 'Paused'}</span>
            </div>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Visual workflow pipeline and outreach configuration engine.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              id="btn-pause-automation"
              onClick={() => onToggleAutomation(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#1a1815] hover:bg-[#262118] border border-amber-700/50 text-amber-300 text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause automation</span>
            </button>
          ) : (
            <button
              id="btn-enable-automation"
              onClick={() => onToggleAutomation(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#102219] hover:bg-[#153022] border border-emerald-700/50 text-emerald-300 text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Enable automation</span>
            </button>
          )}
        </div>
      </div>

      {/* Visual Workflow Graph */}
      <div className="rounded-md bg-[#0f1116] border border-[#1e222b] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitFork className="w-4 h-4 text-neutral-400" />
            <h2 className="text-xs font-semibold text-neutral-200 font-mono uppercase tracking-wider">
              Outreach Workflow Pipeline
            </h2>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            Click any node to inspect configuration
          </span>
        </div>

        {/* Linear & Branching Workflow Canvas */}
        <div className="pt-2 pb-4 flex flex-col items-center">
          {/* Node 1 */}
          <WorkflowNodeItem
            node={WORKFLOW_NODES.new_member}
            onClick={() => setSelectedNode(WORKFLOW_NODES.new_member)}
          />
          <ConnectorArrow />

          {/* Node 2 */}
          <WorkflowNodeItem
            node={WORKFLOW_NODES.verify_member}
            onClick={() => setSelectedNode(WORKFLOW_NODES.verify_member)}
          />
          <ConnectorArrow />

          {/* Node 3 */}
          <WorkflowNodeItem
            node={WORKFLOW_NODES.check_contact_history}
            onClick={() => setSelectedNode(WORKFLOW_NODES.check_contact_history)}
          />
          <ConnectorArrow />

          {/* Node 4 */}
          <WorkflowNodeItem
            node={WORKFLOW_NODES.open_find_dm}
            onClick={() => setSelectedNode(WORKFLOW_NODES.open_find_dm)}
          />
          <ConnectorArrow />

          {/* Node 5 */}
          <WorkflowNodeItem
            node={WORKFLOW_NODES.send_initial_message}
            onClick={() => setSelectedNode(WORKFLOW_NODES.send_initial_message)}
          />
          <ConnectorArrow />

          {/* Node 6 */}
          <WorkflowNodeItem
            node={WORKFLOW_NODES.wait_delay}
            onClick={() => setSelectedNode(WORKFLOW_NODES.wait_delay)}
            badge={`${delayDays} DAYS DELAY`}
          />
          <ConnectorArrow />

          {/* Node 7 */}
          <WorkflowNodeItem
            node={WORKFLOW_NODES.check_reply}
            onClick={() => setSelectedNode(WORKFLOW_NODES.check_reply)}
          />
          <ConnectorArrow />

          {/* Branching Nodes */}
          <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            {/* Branch A: No reply */}
            <div
              onClick={() => setSelectedNode(WORKFLOW_NODES.branch_no_reply)}
              className="p-3 rounded bg-[#13161c] border border-amber-800/40 hover:border-amber-600/60 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-amber-400 mb-1">
                <span>CONDITION: NO REPLY</span>
                <span className="text-neutral-400 group-hover:text-white">Inspect</span>
              </div>
              <div className="text-xs font-semibold font-mono text-neutral-100">
                IF NO REPLY → SEND FOLLOW-UP
              </div>
              <p className="text-[11px] text-neutral-400 mt-1 font-mono">
                Dispatches approved follow-up after {delayDays} days.
              </p>
            </div>

            {/* Branch B: Replied */}
            <div
              onClick={() => setSelectedNode(WORKFLOW_NODES.branch_replied)}
              className="p-3 rounded bg-[#13161c] border border-purple-800/40 hover:border-purple-600/60 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-purple-400 mb-1">
                <span>CONDITION: REPLIED</span>
                <span className="text-neutral-400 group-hover:text-white">Inspect</span>
              </div>
              <div className="text-xs font-semibold font-mono text-neutral-100">
                IF REPLIED → STOP
              </div>
              <p className="text-[11px] text-neutral-400 mt-1 font-mono">
                Follow-up timer cancelled. Pipeline concludes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Message Configuration & Safety Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Message Configuration */}
        <div className="lg:col-span-2 rounded-md bg-[#0f1116] border border-[#1e222b] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-neutral-400" />
              <h2 className="text-xs font-semibold text-neutral-200 font-mono uppercase tracking-wider">
                Message Configuration
              </h2>
            </div>
            <span className="text-[11px] text-neutral-400 font-mono">
              Dynamic variables: <code className="text-neutral-300">{'{firstName}'}</code>, <code className="text-neutral-300">{'{username}'}</code>
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {/* Initial Message */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 font-mono flex items-center justify-between">
                <span>Initial Message (Approved Template)</span>
                <span className="text-[10px] text-neutral-400">Sent on member detection</span>
              </label>
              <textarea
                id="initial-message-input"
                rows={3}
                value={initialMsg}
                onChange={(e) => setInitialMsg(e.target.value)}
                placeholder="Welcome message..."
                className="w-full p-3 rounded bg-[#13161c] border border-[#1e222b] text-xs font-mono text-neutral-200 focus:outline-none focus:border-neutral-600 transition-colors leading-relaxed"
              />
            </div>

            {/* Follow-up Message */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 font-mono flex items-center justify-between">
                <span>Follow-up Message</span>
                <span className="text-[10px] text-neutral-400">Sent if no reply after delay</span>
              </label>
              <textarea
                id="followup-message-input"
                rows={3}
                value={followUpMsg}
                onChange={(e) => setFollowUpMsg(e.target.value)}
                placeholder="Follow-up message..."
                className="w-full p-3 rounded bg-[#13161c] border border-[#1e222b] text-xs font-mono text-neutral-200 focus:outline-none focus:border-neutral-600 transition-colors leading-relaxed"
              />
            </div>

            {/* Follow-up Delay */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-neutral-300 font-mono block">
                  Follow-up Delay
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">
                  Default: 2 days (48 hours)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="delay-days-input"
                  type="number"
                  min="1"
                  max="14"
                  value={delayDays}
                  onChange={(e) => setDelayDays(Math.max(1, parseInt(e.target.value || '2', 10)))}
                  className="w-20 px-3 py-1.5 rounded bg-[#13161c] border border-[#1e222b] text-xs font-mono text-neutral-200 text-center focus:outline-none focus:border-neutral-600"
                />
                <span className="text-xs text-neutral-400 font-mono">Days</span>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-3 border-t border-[#1e222b] flex items-center justify-end gap-3">
              {saveSuccess && (
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>Changes saved successfully</span>
                </span>
              )}
              <button
                id="btn-save-message-config"
                onClick={handleSaveMessages}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-semibold font-mono transition-colors disabled:opacity-60 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Automation Safety */}
        <div className="rounded-md bg-[#0f1116] border border-[#1e222b] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-neutral-400" />
            <h2 className="text-xs font-semibold text-neutral-200 font-mono uppercase tracking-wider">
              Automation Safety
            </h2>
          </div>
          <p className="text-[11px] text-neutral-400 font-mono">
            Active guardrails preventing spam and duplicate outreach.
          </p>

          <div className="space-y-3 pt-1">
            {/* Toggle 1 */}
            <SafetyToggleRow
              label="Prevent duplicate DMs"
              description="Guarantees members receive at most one welcome sequence."
              checked={duplicateProtection}
              onChange={(val) => handleToggleSafeguard('duplicateProtection', val)}
            />

            {/* Toggle 2 */}
            <SafetyToggleRow
              label="Stop follow-up after reply"
              description="Instantly cancel queued follow-ups when member replies."
              checked={replyDetection}
              onChange={(val) => handleToggleSafeguard('replyDetection', val)}
            />

            {/* Toggle 3 */}
            <SafetyToggleRow
              label="Retry failed webhook processing"
              description="Automatic 3x exponential backoff for network blips."
              checked={retryFailedWebhooks}
              onChange={(val) => handleToggleSafeguard('retryFailedWebhooks', val)}
            />

            {/* Toggle 4 */}
            <SafetyToggleRow
              label="Idempotent event handling"
              description="Silently discard duplicate Whop event payloads."
              checked={idempotentHandling}
              onChange={(val) => handleToggleSafeguard('idempotentHandling', val)}
            />

            {/* Toggle 5 */}
            <SafetyToggleRow
              label="Rate-limit protection"
              description="Enforce 60 msgs/min Whop API token bucket."
              checked={rateLimitProtection}
              onChange={(val) => handleToggleSafeguard('rateLimitProtection', val)}
            />
          </div>
        </div>
      </div>

      {/* Node Inspector Modal */}
      <WorkflowNodeModal node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  );
};

interface WorkflowNodeItemProps {
  node: WorkflowNodeDetail;
  onClick: () => void;
  badge?: string;
}

const WorkflowNodeItem: React.FC<WorkflowNodeItemProps> = ({ node, onClick, badge }) => {
  return (
    <div
      onClick={onClick}
      className="w-full max-w-md p-3 rounded-md bg-[#13161c] border border-[#1e222b] hover:border-neutral-600 transition-all cursor-pointer group flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform" />
        <div>
          <div className="text-xs font-semibold text-neutral-100 font-mono group-hover:text-white">
            {node.name}
          </div>
          <div className="text-[10px] text-neutral-400 font-mono">{node.stage}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {badge && (
          <span className="px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-800/40 text-[10px] font-mono text-amber-300">
            {badge}
          </span>
        )}
        <span className="text-[10px] font-mono text-neutral-400 group-hover:text-neutral-200 transition-colors">
          Details →
        </span>
      </div>
    </div>
  );
};

const ConnectorArrow: React.FC = () => (
  <div className="py-1 text-neutral-600">
    <ArrowDown className="w-3.5 h-3.5" />
  </div>
);

interface SafetyToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}

const SafetyToggleRow: React.FC<SafetyToggleRowProps> = ({
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
