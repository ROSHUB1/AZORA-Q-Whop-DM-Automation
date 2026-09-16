export type DmStatus =
  | 'NEW'
  | 'DM SENT'
  | 'REPLIED'
  | 'FOLLOW-UP SCHEDULED'
  | 'FOLLOW-UP SENT'
  | 'STOPPED'
  | 'FAILED';

export type FollowUpStatus =
  | 'NOT_SCHEDULED'
  | 'SCHEDULED'
  | 'SENT'
  | 'CANCELLED_REPLIED'
  | 'CANCELLED_MANUAL';

export type ProcessingStatus =
  | 'RECEIVED'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'IGNORED';

export interface TimelineItem {
  id: string;
  event: string;
  title: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED' | 'INFO' | 'CANCELLED';
  note?: string;
}

export interface Member {
  id: string;
  whopMemberId: string;
  username: string;
  email?: string;
  joinedAt: string;
  membershipStatus: 'active' | 'past_due' | 'canceled' | 'trialing' | 'completed';
  experienceName?: string;
  dmStatus: DmStatus;
  followUpStatus: FollowUpStatus;
  followUpScheduledFor?: string;
  lastActivity: string;
  conversationId?: string;
  initialDmSentAt?: string;
  replyDetectedAt?: string;
  followUpSentAt?: string;
  stoppedReason?: string;
  timeline: TimelineItem[];
  metadata?: Record<string, any>;
}

export interface AutomationEvent {
  id: string;
  timestamp: string;
  eventType: string;
  memberId?: string;
  memberUsername?: string;
  action: string;
  status: 'SUCCESS' | 'FAILED' | 'IGNORED' | 'PROCESSING';
  executionTimeMs: number;
  details: Record<string, any>;
  rawPayload?: any;
}

export interface Message {
  id: string;
  memberId: string;
  memberUsername: string;
  type: 'INITIAL' | 'FOLLOW-UP' | 'REPLY';
  status: 'SENT' | 'DELIVERED' | 'FAILED' | 'RECEIVED';
  content: string;
  sentAt: string;
  response?: string;
  whopMessageId?: string;
}

export interface WebhookEvent {
  id: string;
  eventId: string;
  topic: string;
  receivedAt: string;
  processingStatus: ProcessingStatus;
  resultMessage: string;
  signatureValid: boolean;
  durationMs: number;
  payload: any;
}

export interface AutomationSettings {
  automationEnabled: boolean;
  followUpEnabled: boolean;
  duplicateProtection: boolean;
  replyDetection: boolean;
  idempotentHandling: boolean;
  rateLimitProtection: boolean;
  retryFailedWebhooks: boolean;
  followUpDelayDays: number;
  initialMessageTemplate: string;
  followUpMessageTemplate: string;
  whopApiKeyConfigured: boolean;
  whopWebhookSecretConfigured: boolean;
  maskedApiKey: string;
  maskedWebhookSecret: string;
  apiVersion: string;
  lastCredentialUpdate: string;
  environment: 'PRODUCTION';
  endpointUrl: string;
  whopStatus: 'operational' | 'unavailable' | 'unconfigured';
}

export interface OverviewStats {
  newMembers: number;
  dmsSent: number;
  replies: number;
  followUpsScheduled: number;
  automationActive: boolean;
  whopApiOperational: boolean;
}

export type NavigationPage =
  | 'overview'
  | 'members'
  | 'automation'
  | 'messages'
  | 'webhooks'
  | 'logs'
  | 'settings';
