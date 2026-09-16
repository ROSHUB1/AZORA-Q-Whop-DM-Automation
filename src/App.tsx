import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { OverviewPage } from './components/OverviewPage';
import { MembersPage } from './components/MembersPage';
import { MemberDrawer } from './components/MemberDrawer';
import { AutomationPage } from './components/AutomationPage';
import { MessagesPage } from './components/MessagesPage';
import { WebhooksPage } from './components/WebhooksPage';
import { LogsPage } from './components/LogsPage';
import { SettingsPage } from './components/SettingsPage';
import { PayloadModal } from './components/PayloadModal';
import {
  NavigationPage,
  OverviewStats,
  Member,
  AutomationEvent,
  Message,
  WebhookEvent,
  AutomationSettings,
} from './types';

const INITIAL_SETTINGS: AutomationSettings = {
  automationEnabled: true,
  followUpEnabled: true,
  duplicateProtection: true,
  replyDetection: true,
  idempotentHandling: true,
  rateLimitProtection: true,
  retryFailedWebhooks: true,
  followUpDelayDays: 2,
  initialMessageTemplate:
    'Hey {firstName}, welcome to the agency community! Excited to have you here. Let me know if you need any assistance getting oriented.',
  followUpMessageTemplate:
    'Hey {firstName}, just checking in to see how everything is going so far. Feel free to ping me if you have any questions!',
  whopApiKeyConfigured: false,
  whopWebhookSecretConfigured: false,
  maskedApiKey: 'apik_••••••••••••a922',
  maskedWebhookSecret: 'whsec_••••••••••••••••7c2a',
  apiVersion: 'v5.2024-10',
  lastCredentialUpdate: '2026-09-15 18:22 UTC',
  environment: 'PRODUCTION',
  endpointUrl: '/api/webhooks/whop',
  whopStatus: 'operational',
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Core Backend State
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AutomationEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [logs, setLogs] = useState<AutomationEvent[]>([]);
  const [logsFilter, setLogsFilter] = useState<string>('all');
  const [settings, setSettings] = useState<AutomationSettings>(INITIAL_SETTINGS);

  // Selected drawers / modals
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedActivityEvent, setSelectedActivityEvent] = useState<AutomationEvent | null>(null);

  // Fetch telemetry & operational data
  const fetchData = useCallback(async () => {
    try {
      // 1. Overview & Stats
      const overviewRes = await fetch('/api/overview');
      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        setStats(overviewData.stats);
        setRecentActivity(overviewData.recentActivity || []);
      }

      // 2. Settings
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        const liveOrigin = typeof window !== 'undefined' ? window.location.origin : '';
        setSettings({
          ...settingsData,
          endpointUrl: liveOrigin ? `${liveOrigin}/api/webhooks/whop` : settingsData.endpointUrl,
        });
      }

      // 3. Members
      const membersRes = await fetch('/api/members');
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData);
      }

      // 4. Messages
      const messagesRes = await fetch('/api/messages');
      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        setMessages(messagesData);
      }

      // 5. Webhooks
      const webhooksRes = await fetch('/api/webhooks');
      if (webhooksRes.ok) {
        const webhooksData = await webhooksRes.json();
        setWebhooks(webhooksData.webhooks || []);
      }

      // 6. Logs
      const logsRes = await fetch(`/api/logs?filter=${logsFilter}`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData || []);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    }
  }, [logsFilter]);

  // Initial load & Polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Manual refresh action
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  // Toggle automation enabled/paused
  const handleToggleAutomation = async (enabled: boolean): Promise<boolean> => {
    try {
      const res = await fetch('/api/automation/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        await fetchData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Update Settings & Message Configuration
  const handleUpdateSettings = async (updates: Partial<AutomationSettings>): Promise<boolean> => {
    try {
      const res = await fetch('/api/automation/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        await fetchData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Test Webhook execution
  const handleExecuteWebhookTest = async (topic: string, payload: any) => {
    try {
      const res = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, payload }),
      });
      const data = await res.json();
      await fetchData();
      return data;
    } catch (err: any) {
      return { success: false, result: { status: 'FAILED', message: err.message } };
    }
  };

  // Whop API Test Connection
  const handleTestWhopConnection = async () => {
    try {
      const res = await fetch('/api/whop/test-connection', { method: 'POST' });
      const data = await res.json();
      await fetchData();
      return data;
    } catch (err: any) {
      return { operational: false, latencyMs: 0, message: err.message };
    }
  };

  // Reconnect Whop API credentials
  const handleReconnectWhop = async () => {
    try {
      const res = await fetch('/api/whop/reconnect', { method: 'POST' });
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
      await fetchData();
      return data;
    } catch (err: any) {
      return { success: false, connection: { operational: false, message: err.message } };
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0d] text-[#ededed] flex select-text">
      {/* Compact Left Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page)}
        isWhopConnected={settings.whopStatus === 'operational'}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          currentPage={currentPage}
          whopOperational={settings.whopStatus === 'operational'}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onNavigateSettings={() => setCurrentPage('settings')}
        />

        <main className="flex-1 overflow-y-auto pb-12">
          {currentPage === 'overview' && (
            <OverviewPage
              stats={stats}
              recentActivity={recentActivity}
              onSelectEvent={(act) => setSelectedActivityEvent(act)}
              onNavigatePage={(page) => setCurrentPage(page)}
            />
          )}

          {currentPage === 'members' && (
            <MembersPage
              members={members}
              onSelectMember={(mem) => setSelectedMember(mem)}
            />
          )}

          {currentPage === 'automation' && (
            <AutomationPage
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onToggleAutomation={handleToggleAutomation}
            />
          )}

          {currentPage === 'messages' && <MessagesPage messages={messages} />}

          {currentPage === 'webhooks' && (
            <WebhooksPage
              webhooks={webhooks}
              endpointUrl={settings.endpointUrl}
              apiVersion={settings.apiVersion}
              maskedSecret={settings.maskedWebhookSecret}
              isWhopConnected={settings.whopStatus === 'operational'}
              onExecuteTest={handleExecuteWebhookTest}
            />
          )}

          {currentPage === 'logs' && (
            <LogsPage
              logs={logs}
              activeFilter={logsFilter}
              onFilterChange={(f) => setLogsFilter(f)}
            />
          )}

          {currentPage === 'settings' && (
            <SettingsPage
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onTestConnection={handleTestWhopConnection}
              onReconnect={handleReconnectWhop}
            />
          )}
        </main>
      </div>

      {/* Member Detail Drawer */}
      {selectedMember && (
        <MemberDrawer
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {/* Activity Event Inspector Modal */}
      {selectedActivityEvent && (
        <PayloadModal
          title={`Activity Event: ${selectedActivityEvent.eventType}`}
          subtitle={`Member: ${selectedActivityEvent.memberUsername || 'System'} • Status: ${selectedActivityEvent.status}`}
          data={{
            id: selectedActivityEvent.id,
            timestamp: selectedActivityEvent.timestamp,
            eventType: selectedActivityEvent.eventType,
            memberId: selectedActivityEvent.memberId,
            memberUsername: selectedActivityEvent.memberUsername,
            action: selectedActivityEvent.action,
            status: selectedActivityEvent.status,
            executionTimeMs: selectedActivityEvent.executionTimeMs,
            details: selectedActivityEvent.details,
            rawPayload: selectedActivityEvent.rawPayload,
          }}
          onClose={() => setSelectedActivityEvent(null)}
        />
      )}
    </div>
  );
}
