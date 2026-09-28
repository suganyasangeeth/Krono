import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  clientId: text('client_id').notNull().unique(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  title: text('title').notNull(),
  notes: text('notes').notNull().default(''),
  category: text('category').notNull().default('Personal'),
  priority: text('priority').notNull().default('medium'),
  position: integer('position').notNull().default(0),
  completed: boolean('completed').notNull().default(false),
  dueDate: text('due_date').notNull(),
  reminderTime: text('reminder_time').notNull().default(''),
  recurrence: text('recurrence').notNull().default('none'),
  estimatedPomodoros: integer('estimated_pomodoros').notNull().default(1),
  completedPomodoros: integer('completed_pomodoros').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const focusSessions = pgTable('focus_sessions', {
  id: serial('id').primaryKey(),
  clientId: text('client_id').notNull().unique(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  taskClientId: text('task_client_id').notNull().default(''),
  taskTitle: text('task_title').notNull().default('Deep Focus'),
  durationMinutes: integer('duration_minutes').notNull(),
  mode: text('mode').notNull().default('focus'),
  completedAt: text('completed_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
  focusSessions: many(focusSessions),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  author: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
}));

export const focusSessionsRelations = relations(focusSessions, ({ one }) => ({
  author: one(users, {
    fields: [focusSessions.userId],
    references: [users.id],
  }),
}));
