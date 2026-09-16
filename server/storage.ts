import fs from 'fs';
import path from 'path';
import {
  Member,
  AutomationEvent,
  Message,
  WebhookEvent,
  AutomationSettings,
  OverviewStats,
} from '../src/types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseSchema {
  settings: AutomationSettings;
  members: Member[];
  events: AutomationEvent[];
  messages: Message[];
  webhooks: WebhookEvent[];
  processedEventIds: string[];
}

const DEFAULT_SETTINGS: AutomationSettings = {
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
  whopApiKeyConfigured: Boolean(process.env.WHOP_API_KEY),
  whopWebhookSecretConfigured: Boolean(process.env.WHOP_WEBHOOK_SECRET),
  maskedApiKey: process.env.WHOP_API_KEY
    ? `apik_${'•'.repeat(12)}${process.env.WHOP_API_KEY.slice(-4)}`
    : 'apik_••••••••••••a922',
  maskedWebhookSecret: process.env.WHOP_WEBHOOK_SECRET
    ? `whsec_${'•'.repeat(14)}${process.env.WHOP_WEBHOOK_SECRET.slice(-4)}`
    : 'whsec_••••••••••••••••7c2a',
  apiVersion: 'v5.2024-10',
  lastCredentialUpdate: '2026-09-15 18:22 UTC',
  environment: 'PRODUCTION',
  endpointUrl: process.env.APP_URL ? `${process.env.APP_URL}/api/webhooks/whop` : '/api/webhooks/whop',
  whopStatus: 'operational',
};

function ensureDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initialDb: DatabaseSchema = {
        settings: DEFAULT_SETTINGS,
        members: [],
        events: [],
        messages: [],
        webhooks: [],
        processedEventIds: [],
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      members: parsed.members || [],
      events: parsed.events || [],
      messages: parsed.messages || [],
      webhooks: parsed.webhooks || [],
      processedEventIds: parsed.processedEventIds || [],
    };
  } catch (err) {
    console.error('Error loading db.json:', err);
    return {
      settings: DEFAULT_SETTINGS,
      members: [],
      events: [],
      messages: [],
      webhooks: [],
      processedEventIds: [],
    };
  }
}

function saveDb(data: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write db.json:', err);
  }
}

export const db = {
  getSettings(): AutomationSettings {
    const data = ensureDb();
    if (process.env.WHOP_API_KEY) {
      data.settings.whopApiKeyConfigured = true;
      data.settings.maskedApiKey = `apik_${'•'.repeat(12)}${process.env.WHOP_API_KEY.slice(-4)}`;
    }
    return data.settings;
  },

  updateSettings(updates: Partial<AutomationSettings>): AutomationSettings {
    const data = ensureDb();
    data.settings = { ...data.settings, ...updates };
    saveDb(data);
    return data.settings;
  },

  getMembers(): Member[] {
    const data = ensureDb();
    return [...data.members].sort(
      (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  },

  getMember(id: string): Member | undefined {
    const data = ensureDb();
    return data.members.find((m) => m.id === id || m.whopMemberId === id);
  },

  upsertMember(member: Member): Member {
    const data = ensureDb();
    const idx = data.members.findIndex(
      (m) => m.id === member.id || m.whopMemberId === member.whopMemberId
    );
    if (idx >= 0) {
      data.members[idx] = { ...data.members[idx], ...member };
    } else {
      data.members.unshift(member);
    }
    saveDb(data);
    return member;
  },

  getEvents(filter?: string, limit: number = 100): AutomationEvent[] {
    const data = ensureDb();
    let events = [...data.events];
    if (filter && filter !== 'all') {
      const f = filter.toUpperCase();
      events = events.filter((e) => e.status === f);
    }
    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  },

  addEvent(event: AutomationEvent): AutomationEvent {
    const data = ensureDb();
    data.events.unshift(event);
    if (data.events.length > 500) {
      data.events = data.events.slice(0, 500);
    }
    saveDb(data);
    return event;
  },

  getMessages(): Message[] {
    const data = ensureDb();
    return [...data.messages].sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );
  },

  addMessage(msg: Message): Message {
    const data = ensureDb();
    data.messages.unshift(msg);
    saveDb(data);
    return msg;
  },

  getWebhooks(): WebhookEvent[] {
    const data = ensureDb();
    return [...data.webhooks].sort(
      (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    );
  },

  addWebhook(wh: WebhookEvent): WebhookEvent {
    const data = ensureDb();
    data.webhooks.unshift(wh);
    if (wh.eventId && !data.processedEventIds.includes(wh.eventId)) {
      data.processedEventIds.push(wh.eventId);
    }
    saveDb(data);
    return wh;
  },

  isEventProcessed(eventId: string): boolean {
    const data = ensureDb();
    return data.processedEventIds.includes(eventId);
  },

  recordProcessedEventId(eventId: string): void {
    const data = ensureDb();
    if (!data.processedEventIds.includes(eventId)) {
      data.processedEventIds.push(eventId);
      saveDb(data);
    }
  },

  getStats(): OverviewStats {
    const data = ensureDb();
    const newMembers = data.members.length;
    const dmsSent = data.messages.filter((m) => m.type === 'INITIAL' || m.type === 'FOLLOW-UP').length;
    const replies = data.members.filter((m) => m.dmStatus === 'REPLIED').length;
    const followUpsScheduled = data.members.filter(
      (m) => m.followUpStatus === 'SCHEDULED'
    ).length;

    return {
      newMembers,
      dmsSent,
      replies,
      followUpsScheduled,
      automationActive: data.settings.automationEnabled,
      whopApiOperational: data.settings.whopStatus === 'operational',
    };
  },
};
