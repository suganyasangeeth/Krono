import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  getUserTasksAndSessions,
  syncUserTasksAndSessions,
  deleteUserTaskByClientId,
  getWidgetTasksByUid,
} from './src/db/tasks.ts';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // Lightweight iOS Home Screen Widget JSON Feed
  app.get('/api/widget', async (req, res) => {
    try {
      const uid = String(req.query.uid || '');
      const data = await getWidgetTasksByUid(uid);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load widget tasks' });
    }
  });

  // Fetch user's persisted tasks & focus sessions
  app.get('/api/tasks', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || 'user@example.com';
      const data = await getUserTasksAndSessions(uid, email);
      res.json(data);
    } catch (error: any) {
      console.error('Failed to fetch tasks:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch tasks' });
    }
  });

  // Sync local tasks & focus sessions with PostgreSQL
  app.post('/api/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || 'user@example.com';
      const { tasks = [], sessions = [], replaceAll = false } = req.body || {};
      const data = await syncUserTasksAndSessions(
        uid,
        email,
        Array.isArray(tasks) ? tasks : [],
        Array.isArray(sessions) ? sessions : [],
        Boolean(replaceAll)
      );
      res.json(data);
    } catch (error: any) {
      console.error('Failed to sync tasks:', error);
      res.status(500).json({ error: error.message || 'Failed to sync tasks' });
    }
  });

  // Delete a specific task by clientId
  app.delete('/api/tasks/:clientId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || 'user@example.com';
      const clientId = String(req.params.clientId || '');
      const result = await deleteUserTaskByClientId(uid, email, clientId);
      res.json(result);
    } catch (error: any) {
      console.error('Failed to delete task:', error);
      res.status(500).json({ error: error.message || 'Failed to delete task' });
    }
  });

  // Serve public directory assets directly (favicons, icons, splash)
  app.use(express.static(path.join(process.cwd(), 'public')));

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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
