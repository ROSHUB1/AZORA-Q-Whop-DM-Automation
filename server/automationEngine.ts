import { db } from './storage.js';
import { whopService } from './whopService.js';
import {
  Member,
  AutomationEvent,
  Message,
  WebhookEvent,
  DmStatus,
  FollowUpStatus,
} from '../src/types.js';

function formatTemplate(template: string, member: { username: string; email?: string }): string {
  const firstName = member.username.replace(/^@/, '').split(/[._-]/)[0] || member.username;
  return template
    .replace(/\{username\}/g, member.username)
    .replace(/\{firstName\}/g, firstName)
    .replace(/\{name\}/g, firstName)
    .replace(/\{email\}/g, member.email || '');
}

export const automationEngine = {
  /**
   * Process a Whop webhook event with strict idempotency and safeguards
   */
  async processWebhook(
    rawBody: string,
    signatureHeader?: string,
    customPayload?: any
  ): Promise<{ status: 'SUCCESS' | 'FAILED' | 'IGNORED'; message: string; eventId?: string }> {
    const start = Date.now();
    let payload: any;

    try {
      payload = customPayload || JSON.parse(rawBody);
    } catch {
      return { status: 'FAILED', message: 'Invalid JSON webhook payload' };
    }

    const eventId =
      payload.id ||
      payload.event_id ||
      `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const action = payload.action || payload.type || payload.event || 'membership.went_valid';

    // 1. Signature Verification
    const isSignatureValid = whopService.verifyWebhookSignature(rawBody, signatureHeader);
    if (!isSignatureValid) {
      const webhookEntry: WebhookEvent = {
        id: `wh_${Date.now()}`,
        eventId,
        topic: action,
        receivedAt: new Date().toISOString(),
        processingStatus: 'FAILED',
        resultMessage: 'Signature verification failed (403 Unauthorized)',
        signatureValid: false,
        durationMs: Date.now() - start,
        payload,
      };
      db.addWebhook(webhookEntry);
      db.addEvent({
        id: `evt_${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: 'webhook.signature_failed',
        action: 'Reject webhook event',
        status: 'FAILED',
        executionTimeMs: Date.now() - start,
        details: { reason: 'Invalid HMAC signature', eventId, action },
        rawPayload: payload,
      });
      return { status: 'FAILED', message: 'Webhook signature verification failed', eventId };
    }

    const settings = db.getSettings();

    // 2. Idempotency Check
    if (settings.idempotentHandling && db.isEventProcessed(eventId)) {
      const webhookEntry: WebhookEvent = {
        id: `wh_${Date.now()}`,
        eventId,
        topic: action,
        receivedAt: new Date().toISOString(),
        processingStatus: 'IGNORED',
        resultMessage: 'Event already processed (Idempotent ignore)',
        signatureValid: true,
        durationMs: Date.now() - start,
        payload,
      };
      db.addWebhook(webhookEntry);
      db.addEvent({
        id: `evt_${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: 'webhook.idempotent_skip',
        action: 'Idempotency safeguard: Duplicate event ignored',
        status: 'IGNORED',
        executionTimeMs: Date.now() - start,
        details: { eventId, reason: 'Duplicate event received' },
        rawPayload: payload,
      });
      return { status: 'IGNORED', message: 'Event already processed', eventId };
    }

    // Record Webhook Reception
    const webhookRecord: WebhookEvent = {
      id: `wh_${Date.now()}`,
      eventId,
      topic: action,
      receivedAt: new Date().toISOString(),
      processingStatus: 'PROCESSING',
      resultMessage: 'Processing pipeline started',
      signatureValid: true,
      durationMs: 0,
      payload,
    };
    db.addWebhook(webhookRecord);

    // 3. Automation Paused Guard
    if (!settings.automationEnabled) {
      webhookRecord.processingStatus = 'IGNORED';
      webhookRecord.resultMessage = 'Automation paused by administrator';
      webhookRecord.durationMs = Date.now() - start;
      db.recordProcessedEventId(eventId);

      db.addEvent({
        id: `evt_${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: 'automation.paused',
        action: 'Automation switch is PAUSED',
        status: 'IGNORED',
        executionTimeMs: Date.now() - start,
        details: { action, eventId },
      });
      return { status: 'IGNORED', message: 'Automation paused', eventId };
    }

    // 4. Route according to event topic
    if (
      action === 'membership.went_valid' ||
      action === 'membership.created' ||
      action === 'membership.status_updated' ||
      action === 'member.joined' ||
      action === 'member.created' ||
      action === 'user.joined' ||
      action === 'user.created' ||
      action === 'pass.created' ||
      action === 'pass.went_valid' ||
      action === 'experience.member_joined' ||
      action.startsWith('membership.') ||
      action.startsWith('member.')
    ) {
      const result = await this.handleNewMemberEvent(payload, eventId);
      webhookRecord.processingStatus = result.status;
      webhookRecord.resultMessage = result.message;
      webhookRecord.durationMs = Date.now() - start;
      return result;
    }

    if (
      action === 'chat.message_created' ||
      action === 'message.received' ||
      action === 'dm.reply_received'
    ) {
      const result = await this.handleMemberReplyEvent(payload, eventId);
      webhookRecord.processingStatus = result.status;
      webhookRecord.resultMessage = result.message;
      webhookRecord.durationMs = Date.now() - start;
      return result;
    }

    // Unhandled or informational events
    webhookRecord.processingStatus = 'SUCCESS';
    webhookRecord.resultMessage = `Handled event type: ${action}`;
    webhookRecord.durationMs = Date.now() - start;
    db.recordProcessedEventId(eventId);
    return { status: 'SUCCESS', message: `Acknowledged ${action}`, eventId };
  },

  /**
   * Handle new member detection pipeline:
   * 1. Detect member
   * 2. Verify member
   * 3. Check contact history
   * 4. Open/find DM
   * 5. Send initial message
   * 6. Schedule follow-up after X days
   */
  async handleNewMemberEvent(
    payload: any,
    eventId: string
  ): Promise<{ status: 'SUCCESS' | 'FAILED' | 'IGNORED'; message: string; eventId: string }> {
    const start = Date.now();
    const settings = db.getSettings();

    // Extract member information
    const data = payload.data || payload;
    const user = data.user || data.member || data.membership?.user || data;
    const whopMemberId =
      data.member_id ||
      data.user_id ||
      data.membership?.user_id ||
      user.id ||
      data.id ||
      `mbr_${Math.random().toString(36).substring(2, 9)}`;
    const rawUsername =
      user.username ||
      user.name ||
      user.handle ||
      data.username ||
      `user_${whopMemberId.slice(-5)}`;
    const username = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`;
    const email = user.email || data.email || data.membership?.email;
    const experienceName =
      data.experience_name ||
      data.pass_title ||
      data.membership?.pass_title ||
      'Agency Main Experience';

    // Step 1: Member Detected Event
    db.addEvent({
      id: `evt_${Date.now()}_det`,
      timestamp: new Date().toISOString(),
      eventType: 'member.created',
      memberId: whopMemberId,
      memberUsername: username,
      action: 'Member detected',
      status: 'SUCCESS',
      executionTimeMs: 14,
      details: { whopMemberId, username, eventId, experience: experienceName },
      rawPayload: payload,
    });

    // Step 2 & 3: Check Contact History & Duplicate Protection
    const existingMember = db.getMember(whopMemberId);
    if (existingMember && settings.duplicateProtection) {
      if (
        existingMember.dmStatus === 'DM SENT' ||
        existingMember.dmStatus === 'REPLIED' ||
        existingMember.dmStatus === 'FOLLOW-UP SCHEDULED' ||
        existingMember.dmStatus === 'FOLLOW-UP SENT'
      ) {
        db.addEvent({
          id: `evt_${Date.now()}_dup`,
          timestamp: new Date().toISOString(),
          eventType: 'member.contact_check',
          memberId: whopMemberId,
          memberUsername: username,
          action: 'Contact history checked: Previously contacted (Protected)',
          status: 'IGNORED',
          executionTimeMs: 11,
          details: {
            whopMemberId,
            currentDmStatus: existingMember.dmStatus,
            duplicateProtection: true,
          },
        });

        db.recordProcessedEventId(eventId);
        return {
          status: 'IGNORED',
          message: `Member ${username} already contacted. Duplicate protection prevented duplicate DM.`,
          eventId,
        };
      }
    }

    // Step 4 & 5: Open/Find DM and Send Initial Message
    db.addEvent({
      id: `evt_${Date.now()}_chk`,
      timestamp: new Date().toISOString(),
      eventType: 'member.contact_check',
      memberId: whopMemberId,
      memberUsername: username,
      action: 'Contact check passed: Eligible for welcome DM',
      status: 'SUCCESS',
      executionTimeMs: 9,
      details: { eligible: true },
    });

    const initialMessageContent = formatTemplate(settings.initialMessageTemplate, {
      username,
      email,
    });

    const dmResult = await whopService.sendDm({
      memberId: whopMemberId,
      username,
      content: initialMessageContent,
      type: 'INITIAL',
    });

    if (!dmResult.success) {
      // Failed DM Dispatch
      const failedMember: Member = {
        id: existingMember ? existingMember.id : `mem_${Date.now()}`,
        whopMemberId,
        username,
        email,
        joinedAt: new Date().toISOString(),
        membershipStatus: 'active',
        experienceName,
        dmStatus: 'FAILED',
        followUpStatus: 'NOT_SCHEDULED',
        lastActivity: new Date().toISOString(),
        stoppedReason: dmResult.error || 'Whop API dispatch failed',
        timeline: [
          ...(existingMember?.timeline || []),
          {
            id: `tl_${Date.now()}`,
            event: 'dm.failed',
            title: 'Initial DM dispatch failed',
            timestamp: new Date().toISOString(),
            status: 'FAILED',
            note: dmResult.error,
          },
        ],
      };
      db.upsertMember(failedMember);

      db.addEvent({
        id: `evt_${Date.now()}_fail`,
        timestamp: new Date().toISOString(),
        eventType: 'dm.send',
        memberId: whopMemberId,
        memberUsername: username,
        action: 'Initial message dispatch failed',
        status: 'FAILED',
        executionTimeMs: dmResult.durationMs,
        details: { error: dmResult.error },
      });

      return {
        status: 'FAILED',
        message: `DM dispatch failed: ${dmResult.error}`,
        eventId,
      };
    }

    // Record Message in Database
    const messageRecord: Message = {
      id: dmResult.messageId || `msg_${Date.now()}`,
      memberId: whopMemberId,
      memberUsername: username,
      type: 'INITIAL',
      status: 'SENT',
      content: initialMessageContent,
      sentAt: new Date().toISOString(),
      whopMessageId: dmResult.messageId,
    };
    db.addMessage(messageRecord);

    // Step 6: Schedule Follow-up if enabled
    const followUpDelayMs = (settings.followUpDelayDays || 2) * 24 * 60 * 60 * 1000;
    const followUpScheduledFor = settings.followUpEnabled
      ? new Date(Date.now() + followUpDelayMs).toISOString()
      : undefined;

    const newMember: Member = {
      id: existingMember ? existingMember.id : `mem_${Date.now()}`,
      whopMemberId,
      username,
      email,
      joinedAt: new Date().toISOString(),
      membershipStatus: 'active',
      experienceName,
      dmStatus: settings.followUpEnabled ? 'FOLLOW-UP SCHEDULED' : 'DM SENT',
      followUpStatus: settings.followUpEnabled ? 'SCHEDULED' : 'NOT_SCHEDULED',
      followUpScheduledFor,
      lastActivity: new Date().toISOString(),
      conversationId: `conv_${whopMemberId}`,
      initialDmSentAt: new Date().toISOString(),
      timeline: [
        {
          id: `tl_${Date.now()}_join`,
          event: 'member.joined',
          title: 'Member joined Whop experience',
          timestamp: new Date().toISOString(),
          status: 'SUCCESS',
          note: `Joined ${experienceName}`,
        },
        {
          id: `tl_${Date.now()}_det`,
          event: 'member.detected',
          title: 'Member detected by automation pipeline',
          timestamp: new Date().toISOString(),
          status: 'SUCCESS',
        },
        {
          id: `tl_${Date.now()}_dm`,
          event: 'dm.send',
          title: 'Initial approved welcome DM sent',
          timestamp: new Date().toISOString(),
          status: 'SUCCESS',
          note: `Message ID: ${messageRecord.id}`,
        },
        ...(settings.followUpEnabled
          ? [
              {
                id: `tl_${Date.now()}_sch`,
                event: 'automation.followup_scheduled',
                title: `Follow-up scheduled (${settings.followUpDelayDays} days delay)`,
                timestamp: new Date().toISOString(),
                status: 'INFO' as const,
                note: `Scheduled for: ${followUpScheduledFor}`,
              },
            ]
          : []),
      ],
    };

    db.upsertMember(newMember);

    // Add DM send event
    db.addEvent({
      id: `evt_${Date.now()}_dms`,
      timestamp: new Date().toISOString(),
      eventType: 'dm.send',
      memberId: whopMemberId,
      memberUsername: username,
      action: 'Initial message sent',
      status: 'SUCCESS',
      executionTimeMs: dmResult.durationMs,
      details: { messageId: messageRecord.id, templateUsed: 'initial' },
    });

    if (settings.followUpEnabled) {
      db.addEvent({
        id: `evt_${Date.now()}_sch`,
        timestamp: new Date().toISOString(),
        eventType: 'automation.followup_scheduled',
        memberId: whopMemberId,
        memberUsername: username,
        action: `Follow-up scheduled (${settings.followUpDelayDays}d)`,
        status: 'SUCCESS',
        executionTimeMs: 8,
        details: { scheduledFor: followUpScheduledFor, delayDays: settings.followUpDelayDays },
      });
    }

    db.recordProcessedEventId(eventId);
    return {
      status: 'SUCCESS',
      message: `Outreach completed for ${username}. Initial DM sent.`,
      eventId,
    };
  },

  /**
   * Handle member reply event:
   * 1. Detect reply
   * 2. If reply detection is ON: Update status to REPLIED
   * 3. Stop/Cancel scheduled follow-up
   * 4. Log event
   */
  async handleMemberReplyEvent(
    payload: any,
    eventId: string
  ): Promise<{ status: 'SUCCESS' | 'FAILED' | 'IGNORED'; message: string; eventId: string }> {
    const settings = db.getSettings();
    const data = payload.data || payload;
    const memberId = data.sender_id || data.member_id || data.user_id || data.id;
    const replyContent = data.body || data.content || data.message || 'Thank you!';
    const rawUsername = data.username || data.sender_name || 'Member';
    const username = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`;

    // Find member
    let member = memberId ? db.getMember(memberId) : undefined;
    if (!member) {
      const allMembers = db.getMembers();
      member = allMembers.find((m) => m.username.toLowerCase() === username.toLowerCase());
    }

    if (!member) {
      db.recordProcessedEventId(eventId);
      return { status: 'IGNORED', message: 'No matching member for reply event', eventId };
    }

    // Add reply message record
    const replyMsg: Message = {
      id: `msg_rep_${Date.now()}`,
      memberId: member.whopMemberId,
      memberUsername: member.username,
      type: 'REPLY',
      status: 'RECEIVED',
      content: replyContent,
      sentAt: new Date().toISOString(),
    };
    db.addMessage(replyMsg);

    // If reply detection active, stop follow-up
    if (settings.replyDetection) {
      member.dmStatus = 'REPLIED';
      member.followUpStatus = 'CANCELLED_REPLIED';
      member.replyDetectedAt = new Date().toISOString();
      member.lastActivity = new Date().toISOString();
      member.timeline.push({
        id: `tl_${Date.now()}_rep`,
        event: 'dm.reply_detected',
        title: 'Member reply detected',
        timestamp: new Date().toISOString(),
        status: 'SUCCESS',
        note: `Content: "${replyContent.length > 35 ? replyContent.slice(0, 35) + '...' : replyContent}"`,
      });
      member.timeline.push({
        id: `tl_${Date.now()}_stp`,
        event: 'automation.followup_stopped',
        title: 'Follow-up cancelled (Member replied)',
        timestamp: new Date().toISOString(),
        status: 'INFO',
        note: 'Outreach automation successfully concluded',
      });

      db.upsertMember(member);

      db.addEvent({
        id: `evt_${Date.now()}_rep`,
        timestamp: new Date().toISOString(),
        eventType: 'dm.reply_detected',
        memberId: member.whopMemberId,
        memberUsername: member.username,
        action: 'Reply detected: Automation stopped',
        status: 'SUCCESS',
        executionTimeMs: 12,
        details: { replyLength: replyContent.length, previousFollowUpStatus: 'SCHEDULED' },
      });
    }

    db.recordProcessedEventId(eventId);
    return {
      status: 'SUCCESS',
      message: `Reply detected for ${member.username}. Automation stopped.`,
      eventId,
    };
  },

  /**
   * Periodic scheduler to check and send due follow-ups
   */
  async checkScheduledFollowUps(): Promise<number> {
    const settings = db.getSettings();
    if (!settings.automationEnabled || !settings.followUpEnabled) {
      return 0;
    }

    const members = db.getMembers();
    const now = new Date().getTime();
    let sentCount = 0;

    for (const member of members) {
      if (
        member.followUpStatus === 'SCHEDULED' &&
        member.followUpScheduledFor &&
        new Date(member.followUpScheduledFor).getTime() <= now &&
        member.dmStatus !== 'REPLIED' &&
        member.dmStatus !== 'STOPPED'
      ) {
        // Time to send follow-up
        const followUpContent = formatTemplate(settings.followUpMessageTemplate, {
          username: member.username,
          email: member.email,
        });

        const dmResult = await whopService.sendDm({
          memberId: member.whopMemberId,
          username: member.username,
          content: followUpContent,
          type: 'FOLLOW-UP',
        });

        if (dmResult.success) {
          const msgRecord: Message = {
            id: dmResult.messageId || `msg_${Date.now()}`,
            memberId: member.whopMemberId,
            memberUsername: member.username,
            type: 'FOLLOW-UP',
            status: 'SENT',
            content: followUpContent,
            sentAt: new Date().toISOString(),
            whopMessageId: dmResult.messageId,
          };
          db.addMessage(msgRecord);

          member.dmStatus = 'FOLLOW-UP SENT';
          member.followUpStatus = 'SENT';
          member.followUpSentAt = new Date().toISOString();
          member.lastActivity = new Date().toISOString();
          member.timeline.push({
            id: `tl_${Date.now()}_fu`,
            event: 'automation.followup_sent',
            title: 'Automated 2-day follow-up DM sent',
            timestamp: new Date().toISOString(),
            status: 'SUCCESS',
            note: `Message ID: ${msgRecord.id}`,
          });

          db.upsertMember(member);

          db.addEvent({
            id: `evt_${Date.now()}_fus`,
            timestamp: new Date().toISOString(),
            eventType: 'automation.followup_sent',
            memberId: member.whopMemberId,
            memberUsername: member.username,
            action: 'Follow-up message sent',
            status: 'SUCCESS',
            executionTimeMs: dmResult.durationMs,
            details: { messageId: msgRecord.id },
          });

          sentCount++;
        }
      }
    }

    return sentCount;
  },
};
