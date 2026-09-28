export type PriorityLevel = 'high' | 'medium' | 'low';
export type RecurrencePattern = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';
export type TaskCategory = 'Personal' | 'Work' | 'Health' | 'Errands' | 'Study';

export interface TaskItem {
  clientId: string;
  title: string;
  notes: string;
  category: TaskCategory;
  priority: PriorityLevel;
  position: number;
  completed: boolean;
  dueDate: string; // YYYY-MM-DD
  reminderTime: string; // HH:mm or ''
  recurrence: RecurrencePattern;
  estimatedPomodoros: number;
  completedPomodoros: number;
  lastRemindedDate?: string; // YYYY-MM-DD-HH:mm to prevent duplicate alerts
  updatedAt: string;
  createdAt: string;
}

export interface FocusSessionRecord {
  clientId: string;
  taskClientId: string;
  taskTitle: string;
  durationMinutes: number;
  mode: 'focus' | 'short_break' | 'long_break';
  completedAt: string;
}
