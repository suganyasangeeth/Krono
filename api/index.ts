import express from 'express';
import { requireAuth, type AuthRequest } from '../src/middleware/auth.ts';
import {
  getUserTasksAndSessions,
  syncUserTasksAndSessions,
  deleteUserTaskByClientId,
  getWidgetTasksByUid,
} from '../src/db/tasks.ts';

const app = express();

app.use(express.json({ limit: '5mb' }));

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

export default app;
