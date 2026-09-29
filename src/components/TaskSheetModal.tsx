import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  TaskItem,
  PriorityLevel,
  RecurrencePattern,
  TaskCategory,
} from '../types';

interface TaskSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: {
    title: string;
    notes: string;
    category: TaskCategory;
    priority: PriorityLevel;
    dueDate: string;
    reminderTime: string;
    recurrence: RecurrencePattern;
    estimatedPomodoros: number;
  }) => void;
  editingTask: TaskItem | null;
}

const CATEGORIES: TaskCategory[] = ['Work', 'Personal', 'Health', 'Study', 'Errands'];
const PRIORITIES: { value: PriorityLevel; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];
const RECURRENCES: { value: RecurrencePattern; label: string }[] = [
  { value: 'none', label: 'One-time (Does not repeat)' },
  { value: 'daily', label: 'Repeats Daily' },
  { value: 'weekdays', label: 'Every Weekday (Mon–Fri)' },
  { value: 'weekly', label: 'Repeats Weekly' },
  { value: 'monthly', label: 'Repeats Monthly' },
];

export const TaskSheetModal: React.FC<TaskSheetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTask,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Work');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [dueDate, setDueDate] = useState(todayStr);
  const [reminderTime, setReminderTime] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrencePattern>('none');
  const [estimatedPomodoros, setEstimatedPomodoros] = useState(1);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setNotes(editingTask.notes);
      setCategory(editingTask.category);
      setPriority(editingTask.priority);
      setDueDate(editingTask.dueDate || todayStr);
      setReminderTime(editingTask.reminderTime || '');
      setRecurrence(editingTask.recurrence || 'none');
      setEstimatedPomodoros(editingTask.estimatedPomodoros || 1);
    } else {
      setTitle('');
      setNotes('');
      setCategory('Work');
      setPriority('medium');
      setDueDate(todayStr);
      setReminderTime('09:00');
      setRecurrence('none');
      setEstimatedPomodoros(1);
    }
  }, [editingTask, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      notes: notes.trim(),
      category,
      priority,
      dueDate,
      reminderTime,
      recurrence,
      estimatedPomodoros,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85dvh] overflow-hidden"
      >
        {/* Mobile grab handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        {/* Sticky Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white">
            {editingTask ? 'Edit Task & Reminder' : 'New Task'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Fields (16px text-base prevents iOS Safari zoom) */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Task Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to get done?"
              className="w-full min-h-[48px] rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-base text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes, links, or checklist details..."
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-base text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Priority Level */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Priority Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  type="button"
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={`min-h-[46px] rounded-xl px-3 py-2 text-sm font-semibold border transition-colors cursor-pointer ${
                    priority === p.value
                      ? 'bg-sky-500/15 border-sky-500 text-sky-600 dark:text-sky-400'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category & Focus Sessions */}
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full min-h-[48px] rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-base text-slate-900 dark:text-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Focus Sessions (25m)
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={estimatedPomodoros}
                onChange={(e) =>
                  setEstimatedPomodoros(Math.max(1, Math.min(12, Number(e.target.value) || 1)))
                }
                className="w-full min-h-[48px] rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-base font-mono tabular-nums text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Due Date & Reminder Time (2-col safe for 375px iPhone 11) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full min-w-0 max-w-full min-h-[48px] rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-2 text-sm sm:text-base font-mono tabular-nums text-slate-900 dark:text-white"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Reminder Time
              </label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full min-w-0 max-w-full min-h-[48px] rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-2 text-sm sm:text-base font-mono tabular-nums text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Recurring Schedule */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Recurring Schedule
            </label>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as RecurrencePattern)}
              className="w-full min-h-[48px] rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-base text-slate-900 dark:text-white"
            >
              {RECURRENCES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sticky Bottom Footer (Always visible on iPhone 11) */}
        <div className="px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-[48px] px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-bold text-slate-950 shadow-xs transition-colors cursor-pointer"
          >
            {editingTask ? 'Save Changes' : 'Add Task'}
          </button>
        </div>
      </form>
    </div>
  );
};
