import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/storage.js';
import { automationEngine } from './server/automationEngine.js';
import { whopService } from './server/whopService.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for JSON parsing with rawBody retention for signature verification
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString();
      },
    })
  );

  // ----------------------------------------------------
  // API ROUTES
  // ----------------------------------------------------

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 1. Overview Statistics
  app.get('/api/overview', (_req, res) => {
    try {
      const stats = db.getStats();
      const recentActivity = db.getEvents('all', 15);
      res.json({
        stats,
        recentActivity,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Members Endpoints (/api/members)
  app.get('/api/members', (req, res) => {
    try {
      const { status, search } = req.query;
      let members = db.getMembers();

      if (status && status !== 'ALL') {
        members = members.filter((m) => m.dmStatus === status);
      }

      if (search && typeof search === 'string') {
        const query = search.toLowerCase();
        members = members.filter(
          (m) =>
            m.username.toLowerCase().includes(query) ||
            m.whopMemberId.toLowerCase().includes(query) ||
            (m.email && m.email.toLowerCase().includes(query))
        );
      }

      res.json(members);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/members/:id', (req, res) => {
    try {
      const member = db.getMember(req.params.id);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      res.json(member);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Automation Core Endpoints (/api/automation)
  app.get('/api/automation', (_req, res) => {
    try {
      const settings = db.getSettings();
      const stats = db.getStats();
      res.json({
        running: settings.automationEnabled,
        settings,
        stats,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/automation/toggle', (req, res) => {
    try {
      const { enabled } = req.body;
      const settings = db.updateSettings({ automationEnabled: Boolean(enabled) });
      db.addEvent({
        id: `evt_${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: 'automation.toggle',
        action: enabled ? 'Automation engine enabled' : 'Automation engine paused',
        status: 'SUCCESS',
        executionTimeMs: 4,
        details: { enabled: Boolean(enabled) },
      });
      res.json({ success: true, running: settings.automationEnabled, settings });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/automation/config', (req, res) => {
    try {
      const {
        initialMessageTemplate,
        followUpMessageTemplate,
        followUpDelayDays,
        followUpEnabled,
        duplicateProtection,
        replyDetection,
        rateLimitProtection,
        idempotentHandling,
        retryFailedWebhooks,
      } = req.body;

      const updates: any = {};
      if (initialMessageTemplate !== undefined) updates.initialMessageTemplate = initialMessageTemplate;
      if (followUpMessageTemplate !== undefined) updates.followUpMessageTemplate = followUpMessageTemplate;
      if (followUpDelayDays !== undefined) updates.followUpDelayDays = Number(followUpDelayDays);
      if (followUpEnabled !== undefined) updates.followUpEnabled = Boolean(followUpEnabled);
      if (duplicateProtection !== undefined) updates.duplicateProtection = Boolean(duplicateProtection);
      if (replyDetection !== undefined) updates.replyDetection = Boolean(replyDetection);
      if (rateLimitProtection !== undefined) updates.rateLimitProtection = Boolean(rateLimitProtection);
      if (idempotentHandling !== undefined) updates.idempotentHandling = Boolean(idempotentHandling);
      if (retryFailedWebhooks !== undefined) updates.retryFailedWebhooks = Boolean(retryFailedWebhooks);

      const settings = db.updateSettings(updates);
      db.addEvent({
        id: `evt_${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: 'settings.updated',
        action: 'Automation configuration updated',
        status: 'SUCCESS',
        executionTimeMs: 5,
        details: updates,
      });

      res.json({ success: true, settings });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Messages Endpoints (/api/messages)
  app.get('/api/messages', (_req, res) => {
    try {
      const messages = db.getMessages();
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Webhooks Endpoints (/api/webhooks, /api/webhooks/whop)
  app.get('/api/webhooks', (_req, res) => {
    try {
      const webhooks = db.getWebhooks();
      const settings = db.getSettings();
      res.json({
        webhooks,
        endpointUrl: settings.endpointUrl,
        apiVersion: settings.apiVersion,
        maskedSecret: settings.maskedWebhookSecret,
        connected: settings.whopStatus === 'operational',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Real Whop Webhook Receiver Endpoint
  app.post('/api/webhooks/whop', async (req: any, res) => {
    try {
      console.log('Incoming Whop webhook received:', req.body?.action || req.body?.type || 'unknown_event');
      const signature = req.headers['x-whop-signature'] || req.headers['whop-signature'];
      const rawBody = req.rawBody || JSON.stringify(req.body);

      const result = await automationEngine.processWebhook(rawBody, signature as string, req.body);

      if (result.status === 'FAILED' && result.message.includes('signature')) {
        return res.status(403).json({ error: result.message });
      }

      res.status(200).json({
        received: true,
        status: result.status,
        message: result.message,
        eventId: result.eventId,
      });
    } catch (err: any) {
      console.error('Webhook endpoint error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Test Webhook Simulation Endpoint (for operator testing on the Webhooks page)
  app.post('/api/webhooks/test', async (req, res) => {
    try {
      const { topic, payload } = req.body;
      const testPayload = payload || {
        id: `evt_test_${Date.now()}`,
        action: topic || 'membership.went_valid',
        data: {
          member_id: `mbr_${Math.random().toString(36).substring(2, 9)}`,
          username: `alex_ops${Math.floor(Math.random() * 900 + 100)}`,
          email: 'member.test@agency.internal',
          experience_name: 'VIP Client Accelerator',
        },
      };

      const result = await automationEngine.processWebhook(
        JSON.stringify(testPayload),
        undefined,
        testPayload
      );

      res.json({
        success: true,
        result,
        testPayload,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Logs Endpoints (/api/logs)
  app.get('/api/logs', (req, res) => {
    try {
      const { filter, limit } = req.query;
      const events = db.getEvents(
        filter as string,
        limit ? parseInt(limit as string, 10) : 100
      );
      res.json(events);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Settings & Whop Connection Endpoints (/api/settings, /api/whop/...)
  app.get('/api/settings', (_req, res) => {
    try {
      const settings = db.getSettings();
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/settings', (req, res) => {
    try {
      const updates = req.body;
      const settings = db.updateSettings(updates);
      db.addEvent({
        id: `evt_${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: 'settings.updated',
        action: 'System settings saved',
        status: 'SUCCESS',
        executionTimeMs: 4,
        details: { updatedKeys: Object.keys(updates) },
      });
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/whop/test-connection', async (_req, res) => {
    try {
      const conn = await whopService.testConnection();
      db.updateSettings({
        whopStatus: conn.operational ? 'operational' : 'unavailable',
      });
      res.json(conn);
    } catch (err: any) {
      res.status(500).json({ operational: false, message: err.message });
    }
  });

  app.post('/api/whop/reconnect', async (_req, res) => {
    try {
      const conn = await whopService.testConnection();
      const updated = db.updateSettings({
        whopStatus: conn.operational ? 'operational' : 'unavailable',
        lastCredentialUpdate: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
      });
      res.json({ success: true, connection: conn, settings: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // BACKGROUND AUTOMATION ENGINE RUNNER
  // ----------------------------------------------------
  // Periodically check for scheduled follow-ups
  setInterval(async () => {
    try {
      await automationEngine.checkScheduledFollowUps();
    } catch (e) {
      console.error('Follow-up engine tick error:', e);
    }
  }, 10000);

  // ----------------------------------------------------
  // VITE / SPA MIDDLEWARE
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AZORA-Q Automation Server running on port ${PORT}`);
  });
}

startServer();
