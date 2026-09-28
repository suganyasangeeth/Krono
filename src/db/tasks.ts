import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { focusSessions, tasks, users } from './schema.ts';
import { getOrCreateUser } from './users.ts';

export interface SyncTaskPayload {
  clientId: string;
  title: string;
  notes: string;
  category: string;
  priority: string;
  position: number;
  completed: boolean;
  dueDate: string;
  reminderTime: string;
  recurrence: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
}

export interface SyncSessionPayload {
  clientId: string;
  taskClientId: string;
  taskTitle: string;
  durationMinutes: number;
  mode: string;
  completedAt: string;
}

export async function getUserTasksAndSessions(uid: string, email: string) {
  try {
    const user = await getOrCreateUser(uid, email);
    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, user.id))
      .orderBy(asc(tasks.position), desc(tasks.createdAt));

    const userSessions = await db
      .select()
      .from(focusSessions)
      .where(eq(focusSessions.userId, user.id))
      .orderBy(desc(focusSessions.createdAt));

    return {
      tasks: userTasks,
      sessions: userSessions,
    };
  } catch (error) {
    console.error('Database query failed in getUserTasksAndSessions:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function syncUserTasksAndSessions(
  uid: string,
  email: string,
  incomingTasks: SyncTaskPayload[],
  incomingSessions: SyncSessionPayload[],
  replaceAll = false
) {
  try {
    const user = await getOrCreateUser(uid, email);

    if (replaceAll) {
      await db.delete(tasks).where(eq(tasks.userId, user.id));
    }

    for (const item of incomingTasks) {
      await db
        .insert(tasks)
        .values({
          clientId: item.clientId,
          userId: user.id,
          title: item.title,
          notes: item.notes || '',
          category: item.category || 'Personal',
          priority: item.priority || 'medium',
          position: typeof item.position === 'number' ? item.position : 0,
          completed: Boolean(item.completed),
          dueDate: item.dueDate,
          reminderTime: item.reminderTime || '',
          recurrence: item.recurrence || 'none',
          estimatedPomodoros: item.estimatedPomodoros || 1,
          completedPomodoros: item.completedPomodoros || 0,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: tasks.clientId,
          set: {
            title: item.title,
            notes: item.notes || '',
            category: item.category || 'Personal',
            priority: item.priority || 'medium',
            position: typeof item.position === 'number' ? item.position : 0,
            completed: Boolean(item.completed),
            dueDate: item.dueDate,
            reminderTime: item.reminderTime || '',
            recurrence: item.recurrence || 'none',
            estimatedPomodoros: item.estimatedPomodoros || 1,
            completedPomodoros: item.completedPomodoros || 0,
            updatedAt: new Date(),
          },
        });
    }

    for (const session of incomingSessions) {
      await db
        .insert(focusSessions)
        .values({
          clientId: session.clientId,
          userId: user.id,
          taskClientId: session.taskClientId || '',
          taskTitle: session.taskTitle || 'Deep Focus',
          durationMinutes: session.durationMinutes || 25,
          mode: session.mode || 'focus',
          completedAt: session.completedAt,
        })
        .onConflictDoNothing({
          target: focusSessions.clientId,
        });
    }

    return await getUserTasksAndSessions(uid, email);
  } catch (error) {
    console.error('Database query failed in syncUserTasksAndSessions:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function deleteUserTaskByClientId(uid: string, email: string, clientId: string) {
  try {
    const user = await getOrCreateUser(uid, email);
    await db
      .delete(tasks)
      .where(and(eq(tasks.userId, user.id), eq(tasks.clientId, clientId)));
    return { deleted: true };
  } catch (error) {
    console.error('Database query failed in deleteUserTaskByClientId:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
