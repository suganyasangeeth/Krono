import React from 'react';
import {
  X,
  Check,
  Pencil,
  Calendar,
  Bell,
  Repeat,
  Timer,
  Tag,
  Flag,
  FileText,
} from 'lucide-react';
import { TaskItem } from '../types';

interface TaskDetailModalProps {
  task: TaskItem | null;
  onClose: () => void;
  onToggleComplete: (task: TaskItem) => void;
  onEdit: (task: TaskItem) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  onClose,
  onToggleComplete,
  onEdit,
}) => {
  if (!task) return null;

  const priorityLabel =
    task.priority === 'high'
      ? 'High Priority'
      : task.priority === 'medium'
      ? 'Medium Priority'
      : 'Low Priority';

  const recurrenceLabel =
    task.recurrence === 'none'
      ? 'Does not repeat (One-time)'
      : task.recurrence === 'weekdays'
      ? 'Repeats Every Weekday (Mon–Fri)'
      : `Repeats ${task.recurrence.charAt(0).toUpperCase() + task.recurrence.slice(1)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-detail-title"
    >
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85dvh] overflow-hidden">
        {/* Mobile grab handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        {/* Sticky Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <span className="text-sm font-bold tracking-tight text-sky-600 dark:text-sky-400">
            Task Details (Read-Only View)
          </span>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Close task view"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Read-Only Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Task Title & Status */}
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              {task.completed ? 'Status: Completed ✓' : 'Status: Active Task'}
            </div>
            <h2
              id="task-detail-title"
              className={`text-xl sm:text-2xl font-bold font-display leading-snug break-words ${
                task.completed
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {task.title}
            </h2>
          </div>

          {/* Notes / Description Box */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200/80 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              <FileText className="w-4 h-4 text-sky-500 shrink-0" />
              <span>Notes & Details</span>
            </div>
            <p className="text-base text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed break-words">
              {task.notes && task.notes.trim().length > 0
                ? task.notes
                : 'No additional notes added for this task.'}
            </p>
          </div>

          {/* Structured Read-Only Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/70 dark:border-slate-800 p-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Flag className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Priority</span>
              </div>
              <p
                className={`mt-1 text-base font-bold ${
                  task.priority === 'high'
                    ? 'text-rose-600 dark:text-rose-400'
                    : task.priority === 'medium'
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {priorityLabel}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/70 dark:border-slate-800 p-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Tag className="w-4 h-4 text-sky-500 shrink-0" />
                <span>Category</span>
              </div>
              <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                {task.category}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/70 dark:border-slate-800 p-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Due Date</span>
              </div>
              <p className="mt-1 text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {task.dueDate || 'Not set'}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/70 dark:border-slate-800 p-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Bell className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Reminder Time</span>
              </div>
              <p className="mt-1 text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {task.reminderTime ? task.reminderTime : 'No reminder alarm'}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/70 dark:border-slate-800 p-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Repeat className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Recurring Schedule</span>
              </div>
              <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                {recurrenceLabel}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/70 dark:border-slate-800 p-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Timer className="w-4 h-4 text-sky-500 shrink-0" />
                <span>Focus Sessions (25m)</span>
              </div>
              <p className="mt-1 text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {task.completedPomodoros} / {task.estimatedPomodoros} completed
              </p>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Actions (Safe-Area Aware on iPhone 11) */}
        <div className="px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onToggleComplete(task);
              onClose();
            }}
            className="min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4 text-emerald-500" />
            <span>{task.completed ? 'Mark Active' : 'Mark Done'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const target = task;
                onClose();
                onEdit(target);
              }}
              className="min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[46px] px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-sm font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
