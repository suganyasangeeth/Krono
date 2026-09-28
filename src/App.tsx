import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  GripVertical,
  Check,
  ArrowUp,
  ArrowDown,
  Timer,
  Bell,
  BellRing,
  Repeat,
  Sun,
  Moon,
  Cloud,
  Pencil,
  Trash2,
  Search,
  Sparkles,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  TaskItem,
  FocusSessionRecord,
  PriorityLevel,
  RecurrencePattern,
  TaskCategory,
} from './types';
import {
  initAuth,
  googleSignIn,
  logout,
  getIdToken,
  getAccessToken,
} from './lib/firebase';
import { soundEngine } from './lib/sound';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { FocusTimerPanel } from './components/FocusTimerPanel';
import { CloudBackupModal } from './components/CloudBackupModal';
import { TaskSheetModal } from './components/TaskSheetModal';

const STORAGE_KEYS = {
  TASKS: 'krono_tasks_v1',
  SESSIONS: 'krono_sessions_v1',
  THEME: 'krono_theme_v1',
};

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getTomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function computeNextDueDate(currentDue: string, recurrence: RecurrencePattern): string {
  const base = currentDue ? new Date(`${currentDue}T00:00:00`) : new Date();
  if (isNaN(base.getTime())) {
    return getTomorrowStr();
  }
  const next = new Date(base);
  if (recurrence === 'daily') {
    next.setDate(next.getDate() + 1);
  } else if (recurrence === 'weekdays') {
    do {
      next.setDate(next.getDate() + 1);
    } while (next.getDay() === 0 || next.getDay() === 6);
  } else if (recurrence === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (recurrence === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  }
  return next.toISOString().slice(0, 10);
}

const INITIAL_SAMPLE_TASKS: TaskItem[] = [
  {
    clientId: 'task-seed-1',
    title: 'Finalize mobile UI ergonomics & drag-and-drop priority queue',
    notes: 'Verify 44px touch targets, thumb-zone navigation, and offline service worker cache.',
    category: 'Work',
    priority: 'high',
    position: 0,
    completed: false,
    dueDate: getTodayStr(),
    reminderTime: '09:30',
    recurrence: 'weekdays',
    estimatedPomodoros: 3,
    completedPomodoros: 1,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    clientId: 'task-seed-2',
    title: 'Morning hydration & 20-minute mobility routine',
    notes: 'Complete before opening work notifications.',
    category: 'Health',
    priority: 'high',
    position: 1,
    completed: false,
    dueDate: getTodayStr(),
    reminderTime: '08:00',
    recurrence: 'daily',
    estimatedPomodoros: 1,
    completedPomodoros: 0,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    clientId: 'task-seed-3',
    title: 'Back up weekly action plan to Google Drive & iCloud',
    notes: 'Export JSON snapshot and verify cross-device restore.',
    category: 'Personal',
    priority: 'medium',
    position: 2,
    completed: false,
    dueDate: getTodayStr(),
    reminderTime: '17:00',
    recurrence: 'weekly',
    estimatedPomodoros: 1,
    completedPomodoros: 0,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    clientId: 'task-seed-4',
    title: 'Deep reading: Distributed Systems & Offline-First Architecture',
    notes: 'Summarize chapter notes and spaced-repetition flashcards.',
    category: 'Study',
    priority: 'low',
    position: 3,
    completed: false,
    dueDate: getTomorrowStr(),
    reminderTime: '19:30',
    recurrence: 'daily',
    estimatedPomodoros: 2,
    completedPomodoros: 0,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

type NavView = 'all' | 'today' | 'recurring' | 'focus';

export default function App() {
  // Theme state (persisted in localStorage)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      return saved ? saved === 'dark' : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, darkMode ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
  }, [darkMode]);

  // Tasks state (offline-first in localStorage)
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback to sample tasks
    }
    return INITIAL_SAMPLE_TASKS;
  });

  // Focus sessions state (offline-first in localStorage)
  const [sessions, setSessions] = useState<FocusSessionRecord[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Persist to localStorage whenever tasks or sessions change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch {
      // ignore quota errors
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch {
      // ignore
    }
  }, [sessions]);

  // Navigation & filter states
  const [activeView, setActiveView] = useState<NavView>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quickTitle, setQuickTitle] = useState<string>('');
  const [quickPriority, setQuickPriority] = useState<PriorityLevel>('medium');
  const [quickRecurrence, setQuickRecurrence] = useState<RecurrencePattern>('none');

  // Modals & sheets
  const [isTaskSheetOpen, setIsTaskSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Focus Timer linked task
  const [activeFocusTaskId, setActiveFocusTaskId] = useState<string | null>(
    INITIAL_SAMPLE_TASKS[0].clientId
  );

  // Drag-and-Drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  // Recurring & Reminder Alerts
  const [activeReminderTask, setActiveReminderTask] = useState<TaskItem | null>(null);
  const [toastBanner, setToastBanner] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // Auth & Cloud Sync state
  const [user, setUser] = useState<User | null>(null);
  const [hasDriveToken, setHasDriveToken] = useState<boolean>(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastBanner(msg);
    window.setTimeout(() => {
      setToastBanner((prev) => (prev === msg ? null : prev));
    }, 4500);
  }, []);

  // Cloud Sync helper
  const syncWithBackend = useCallback(
    async (
      currentTasks: TaskItem[],
      currentSessions: FocusSessionRecord[],
      replaceAll = false
    ) => {
      const idToken = await getIdToken();
      if (!idToken || !navigator.onLine) return;
      setIsSyncingCloud(true);
      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            tasks: currentTasks,
            sessions: currentSessions,
            replaceAll,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.tasks) && data.tasks.length > 0) {
            const mapped: TaskItem[] = data.tasks.map((row: any) => ({
              clientId: row.clientId,
              title: row.title,
              notes: row.notes || '',
              category: (row.category as TaskCategory) || 'Personal',
              priority: (row.priority as PriorityLevel) || 'medium',
              position: typeof row.position === 'number' ? row.position : 0,
              completed: Boolean(row.completed),
              dueDate: row.dueDate || getTodayStr(),
              reminderTime: row.reminderTime || '',
              recurrence: (row.recurrence as RecurrencePattern) || 'none',
              estimatedPomodoros: row.estimatedPomodoros || 1,
              completedPomodoros: row.completedPomodoros || 0,
              updatedAt: row.updatedAt || new Date().toISOString(),
              createdAt: row.createdAt || new Date().toISOString(),
            }));
            setTasks(mapped);
          }
        }
      } catch {
        // Offline or transient error: local storage keeps data safe
      } finally {
        setIsSyncingCloud(false);
      }
    },
    []
  );

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      async (authedUser, accessToken) => {
        setUser(authedUser);
        setHasDriveToken(Boolean(accessToken));
        await syncWithBackend(tasks, sessions, false);
      },
      () => {
        setUser(null);
        setHasDriveToken(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Re-sync automatically when device comes back online
  useEffect(() => {
    const handleOnline = () => {
      if (user) {
        syncWithBackend(tasks, sessions, false);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user, tasks, sessions, syncWithBackend]);

  const handleGoogleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setHasDriveToken(Boolean(result.accessToken));
        await syncWithBackend(tasks, sessions, false);
        showToast(`Signed in as ${result.user.email}`);
      }
    } catch (err: any) {
      showToast(err.message || 'Sign-in cancelled');
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setUser(null);
    setHasDriveToken(false);
    showToast('Signed out of Google account');
  };

  // Automated Recurring Task Reminder Watcher
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const currentHHMM = `${hh}:${mm}`;
      const stampKey = `${todayStr}-${currentHHMM}`;

      const dueTask = tasks.find(
        (t) =>
          !t.completed &&
          t.dueDate === todayStr &&
          t.reminderTime === currentHHMM &&
          t.lastRemindedDate !== stampKey
      );

      if (dueTask) {
        soundEngine.playReminderAlert();
        setActiveReminderTask(dueTask);
        setTasks((prev) =>
          prev.map((item) =>
            item.clientId === dueTask.clientId
              ? { ...item, lastRemindedDate: stampKey }
              : item
          )
        );

        if (
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
          try {
            new Notification(`Krono Reminder: ${dueTask.title}`, {
              body: `${dueTask.category} · ${
                dueTask.recurrence !== 'none'
                  ? `Repeats ${dueTask.recurrence}`
                  : 'Due now'
              }`,
              icon: '/pwa-192x192.png',
            });
          } catch {
            // ignore notification errors in iframe
          }
        }
      }
    };

    const interval = window.setInterval(checkReminders, 15000);
    return () => window.clearInterval(interval);
  }, [tasks]);

  const requestNotificationAccess = async () => {
    if (typeof Notification === 'undefined') {
      showToast('In-app audio & banner reminders are active.');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        showToast('Browser & system reminder notifications enabled!');
      } else {
        showToast('Using in-app chime & banner alerts for reminders.');
      }
    } catch {
      showToast('Using in-app chime & banner alerts for reminders.');
    }
  };

  const triggerTestReminder = () => {
    const candidate =
      tasks.find((t) => !t.completed && t.recurrence !== 'none') ||
      tasks.find((t) => !t.completed) ||
      INITIAL_SAMPLE_TASKS[0];
    soundEngine.playReminderAlert();
    setActiveReminderTask(candidate);
  };

  // Add or Edit Task
  const handleSaveTaskModal = (taskData: {
    title: string;
    notes: string;
    category: TaskCategory;
    priority: PriorityLevel;
    dueDate: string;
    reminderTime: string;
    recurrence: RecurrencePattern;
    estimatedPomodoros: number;
  }) => {
    if (editingTask) {
      const updated = tasks.map((t) =>
        t.clientId === editingTask.clientId
          ? {
              ...t,
              ...taskData,
              updatedAt: new Date().toISOString(),
            }
          : t
      );
      setTasks(updated);
      syncWithBackend(updated, sessions, false);
      showToast('Task updated');
    } else {
      const newTask: TaskItem = {
        clientId: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: taskData.title,
        notes: taskData.notes,
        category: taskData.category,
        priority: taskData.priority,
        position: 0,
        completed: false,
        dueDate: taskData.dueDate,
        reminderTime: taskData.reminderTime,
        recurrence: taskData.recurrence,
        estimatedPomodoros: taskData.estimatedPomodoros,
        completedPomodoros: 0,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      const reindexed = [newTask, ...tasks].map((item, idx) => ({
        ...item,
        position: idx,
      }));
      setTasks(reindexed);
      syncWithBackend(reindexed, sessions, false);
      showToast('Added new task to top of queue');
    }
    setEditingTask(null);
  };

  // Quick Add Task inline
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    const newTask: TaskItem = {
      clientId: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: quickTitle.trim(),
      notes: '',
      category: 'Work',
      priority: quickPriority,
      position: 0,
      completed: false,
      dueDate: getTodayStr(),
      reminderTime: quickRecurrence !== 'none' ? '09:00' : '',
      recurrence: quickRecurrence,
      estimatedPomodoros: 1,
      completedPomodoros: 0,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    const reindexed = [newTask, ...tasks].map((item, idx) => ({
      ...item,
      position: idx,
    }));
    setTasks(reindexed);
    setQuickTitle('');
    syncWithBackend(reindexed, sessions, false);
  };

  // Toggle Task Completion + Automated Recurring Task Scheduling
  const handleToggleComplete = (task: TaskItem) => {
    const nextCompleted = !task.completed;
    let nextList = tasks.map((t) =>
      t.clientId === task.clientId
        ? { ...t, completed: nextCompleted, updatedAt: new Date().toISOString() }
        : t
    );

    if (nextCompleted) {
      soundEngine.playCompleteTask();

      // If this task has a recurring schedule, automatically generate the next occurrence
      if (task.recurrence && task.recurrence !== 'none') {
        const nextDue = computeNextDueDate(task.dueDate, task.recurrence);
        const alreadyScheduled = nextList.some(
          (t) =>
            !t.completed &&
            t.title === task.title &&
            t.dueDate === nextDue &&
            t.recurrence === task.recurrence
        );

        if (!alreadyScheduled) {
          const recurringNext: TaskItem = {
            ...task,
            clientId: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            completed: false,
            dueDate: nextDue,
            completedPomodoros: 0,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          };
          nextList = [...nextList, recurringNext];
          showToast(
            `Completed! Automated next ${task.recurrence} occurrence for ${nextDue}.`
          );
        }
      }
    }

    // Keep uncompleted tasks ordered before completed tasks while preserving relative drag order
    const ordered = [
      ...nextList.filter((t) => !t.completed),
      ...nextList.filter((t) => t.completed),
    ].map((item, idx) => ({ ...item, position: idx }));

    setTasks(ordered);
    syncWithBackend(ordered, sessions, false);
  };

  const handleDeleteTask = async (clientId: string) => {
    const filtered = tasks
      .filter((t) => t.clientId !== clientId)
      .map((item, idx) => ({ ...item, position: idx }));
    setTasks(filtered);

    const idToken = await getIdToken();
    if (idToken && navigator.onLine) {
      fetch(`/api/tasks/${encodeURIComponent(clientId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      }).catch(() => {});
    }
  };

  // Reorder helper for Drag-and-Drop and Touch Up/Down buttons
  const reorderTasksByIds = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const list = [...tasks].sort((a, b) => a.position - b.position);
    const sourceIndex = list.findIndex((t) => t.clientId === sourceId);
    const targetIndex = list.findIndex((t) => t.clientId === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const [moved] = list.splice(sourceIndex, 1);
    list.splice(targetIndex, 0, moved);
    const reindexed = list.map((item, idx) => ({
      ...item,
      position: idx,
      updatedAt: new Date().toISOString(),
    }));
    setTasks(reindexed);
    syncWithBackend(reindexed, sessions, false);
  };

  const moveTaskStep = (clientId: string, direction: -1 | 1) => {
    const sorted = [...tasks].sort((a, b) => a.position - b.position);
    const index = sorted.findIndex((t) => t.clientId === clientId);
    const targetIndex = index + direction;
    if (index === -1 || targetIndex < 0 || targetIndex >= sorted.length) return;
    reorderTasksByIds(clientId, sorted[targetIndex].clientId);
  };

  // Focus Session Completion Handler
  const handleCompleteFocusSession = (
    newSession: FocusSessionRecord,
    linkedTaskId: string | null
  ) => {
    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);

    let updatedTasks = tasks;
    if (linkedTaskId) {
      updatedTasks = tasks.map((t) =>
        t.clientId === linkedTaskId
          ? {
              ...t,
              completedPomodoros: t.completedPomodoros + 1,
              updatedAt: new Date().toISOString(),
            }
          : t
      );
      setTasks(updatedTasks);
    }

    showToast(`Logged ${newSession.durationMinutes}m ${newSession.mode} session!`);
    syncWithBackend(updatedTasks, updatedSessions, false);
  };

  // Restore Backup Handler (from Google Drive or iCloud JSON)
  const handleRestoreBackup = async (
    restoredTasks: TaskItem[],
    restoredSessions: FocusSessionRecord[]
  ) => {
    const normalized = restoredTasks.map((t, idx) => ({
      ...t,
      position: typeof t.position === 'number' ? t.position : idx,
    }));
    setTasks(normalized);
    setSessions(restoredSessions);
    await syncWithBackend(normalized, restoredSessions, true);
  };

  // Sorted and filtered tasks
  const filteredTasks = useMemo(() => {
    const today = getTodayStr();
    return [...tasks]
      .sort((a, b) => a.position - b.position)
      .filter((t) => {
        if (activeView === 'today' && t.dueDate !== today) return false;
        if (activeView === 'recurring' && t.recurrence === 'none') return false;
        if (statusFilter === 'active' && t.completed) return false;
        if (statusFilter === 'completed' && !t.completed) return false;
        if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
        if (
          searchQuery.trim() &&
          !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !t.notes.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }
        return true;
      });
  }, [tasks, activeView, statusFilter, categoryFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const active = total - completed;
    const recurringCount = tasks.filter((t) => t.recurrence !== 'none' && !t.completed).length;
    const highPriorityLeft = tasks.filter(
      (t) => !t.completed && t.priority === 'high'
    ).length;
    return { total, completed, active, recurringCount, highPriorityLeft };
  }, [tasks]);

  const formatPriorityLabel = (p: PriorityLevel) => {
    if (p === 'high') return 'High Priority';
    if (p === 'medium') return 'Medium Priority';
    return 'Low Priority';
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 md:pb-12">
      {/* Top Bar Contract: Zone 1 (Single Brand Title) — Zone 2 (Nav Links) — Zone 3 (1-2 Actions) */}
      <header className="sticky top-0 z-30 h-14 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('all');
          }}
          className="text-xl font-bold tracking-tight font-display text-slate-900 dark:text-white"
        >
          Krono
        </a>

        {/* Zone 2: 4-5 Clean Text Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <button
            onClick={() => setActiveView('all')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
              activeView === 'all'
                ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-sky-500'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Tasks
          </button>
          <button
            onClick={() => setActiveView('today')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
              activeView === 'today'
                ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-sky-500'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setActiveView('recurring')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
              activeView === 'recurring'
                ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-sky-500'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Recurring Reminders
          </button>
          <button
            onClick={() => setActiveView('focus')}
            className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
              activeView === 'focus'
                ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-sky-500'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Focus Timer
          </button>
          <button
            onClick={() => setIsBackupModalOpen(true)}
            className="py-1 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            Cloud Backup
          </button>
        </nav>

        {/* Zone 3: 1-2 Primary Actions */}
        <div className="flex items-center gap-2">
          <PWAInstallButton />
          <button
            onClick={() => setDarkMode((prev) => !prev)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Live Automated Reminder Alert Banner */}
      {activeReminderTask && (
        <div className="bg-sky-500 text-slate-950 px-4 py-3 shadow-md">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <BellRing className="w-5 h-5 shrink-0 animate-bounce" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold">Reminder Due: {activeReminderTask.title}</span>
                <span className="ml-2 opacity-85">
                  {activeReminderTask.category} ·{' '}
                  {activeReminderTask.recurrence !== 'none'
                    ? `Repeats ${activeReminderTask.recurrence}`
                    : 'Scheduled Today'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveFocusTaskId(activeReminderTask.clientId);
                  setActiveView('focus');
                  setActiveReminderTask(null);
                }}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-950 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Focus Now
              </button>
              <button
                onClick={() => {
                  handleToggleComplete(activeReminderTask);
                  setActiveReminderTask(null);
                }}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/90 text-slate-950 text-xs font-semibold hover:bg-white transition-colors cursor-pointer"
              >
                Mark Done
              </button>
              <button
                onClick={() => setActiveReminderTask(null)}
                className="min-h-[38px] px-2.5 py-1.5 rounded-xl text-slate-950/80 hover:text-slate-950 text-xs font-semibold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtle Toast Notification */}
      {toastBanner && (
        <div className="fixed top-16 right-4 z-40 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 px-4 py-2.5 text-xs font-semibold shadow-lg transition-all">
          {toastBanner}
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 pt-6">
        {/* Compact Workspace Summary Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
              {activeView === 'all' && 'Priority Task Queue'}
              {activeView === 'today' && "Today's Focus Plan"}
              {activeView === 'recurring' && 'Automated Recurring Reminders'}
              {activeView === 'focus' && 'Deep Work Focus Studio'}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 tabular-nums">
              <span>{stats.active} active</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>{stats.highPriorityLeft} high priority</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>{stats.recurringCount} recurring routines</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>{stats.completed} completed</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="min-h-[44px] flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Cloud className="w-4 h-4 text-sky-500 shrink-0" />
              <span>{user ? 'Drive & iCloud Sync' : 'Backup & Sync'}</span>
            </button>

            <button
              onClick={() => {
                setEditingTask(null);
                setIsTaskSheetOpen(true);
              }}
              className="min-h-[44px] flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Responsive 12-Column Grid: Left 7 cols (Task Queue), Right 5 cols (Focus Timer) */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Task Management Column */}
          <div
            className={`lg:col-span-7 space-y-5 ${
              activeView === 'focus' ? 'hidden lg:block' : 'block'
            }`}
          >
            {/* Quick-Add Bar */}
            <form
              onSubmit={handleQuickAdd}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-2xs"
            >
              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Quick add a task (drag rows below to reprioritize)..."
                className="flex-1 min-h-[44px] px-3 text-sm bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
              <div className="flex items-center gap-1.5 px-1 sm:px-0">
                <select
                  aria-label="Quick priority"
                  value={quickPriority}
                  onChange={(e) => setQuickPriority(e.target.value as PriorityLevel)}
                  className="min-h-[40px] rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <select
                  aria-label="Quick recurrence"
                  value={quickRecurrence}
                  onChange={(e) => setQuickRecurrence(e.target.value as RecurrencePattern)}
                  className="min-h-[40px] rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  <option value="none">One-time</option>
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>

                <button
                  type="submit"
                  className="min-h-[40px] px-4 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
                >
                  Add
                </button>
              </div>
            </form>

            {/* Recurring Reminders Control Bar (when on Recurring tab or always accessible) */}
            {activeView === 'recurring' && (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-sky-500" />
                    <span>Automated Recurring Task Engine</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Completing any recurring task automatically spawns its next scheduled cycle.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={requestNotificationAccess}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {notificationPermission === 'granted'
                      ? 'Notifications Active'
                      : 'Enable Push Alerts'}
                  </button>
                  <button
                    onClick={triggerTestReminder}
                    className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 text-xs font-semibold hover:bg-sky-500/25 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Test Reminder Alert</span>
                  </button>
                </div>
              </div>
            )}

            {/* Filter & Search Bar (Interactive Segmented Controls) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-xl overflow-x-auto">
                {(['all', 'active', 'completed'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors whitespace-nowrap cursor-pointer ${
                      statusFilter === st
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
                <span className="mx-1 text-slate-300 dark:text-slate-700">|</span>
                {['All', 'Work', 'Personal', 'Health', 'Study'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`min-h-[38px] px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[180px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter tasks..."
                  className="w-full min-h-[40px] pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Drag-and-Drop Prioritized Task List */}
            <div
              role="list"
              aria-label="Prioritized task list"
              className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden shadow-xs"
            >
              {filteredTasks.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No tasks match this view
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Add a new task above or switch filters to see all items.
                  </p>
                </div>
              ) : (
                filteredTasks.map((task, idx) => {
                  const isBeingDragged = draggedTaskId === task.clientId;
                  const isDragTarget = dragOverTaskId === task.clientId;
                  const isFocused = activeFocusTaskId === task.clientId;

                  return (
                    <div
                      key={task.clientId}
                      role="listitem"
                      draggable
                      onDragStart={(e) => {
                        setDraggedTaskId(task.clientId);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', task.clientId);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverTaskId !== task.clientId) {
                          setDragOverTaskId(task.clientId);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverTaskId === task.clientId) {
                          setDragOverTaskId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const sourceId =
                          draggedTaskId || e.dataTransfer.getData('text/plain');
                        if (sourceId && sourceId !== task.clientId) {
                          reorderTasksByIds(sourceId, task.clientId);
                        }
                        setDraggedTaskId(null);
                        setDragOverTaskId(null);
                      }}
                      onDragEnd={() => {
                        setDraggedTaskId(null);
                        setDragOverTaskId(null);
                      }}
                      className={`group flex items-start gap-2 sm:gap-3 px-3 sm:px-5 py-3.5 transition-colors ${
                        isBeingDragged ? 'opacity-40 bg-slate-100 dark:bg-slate-800' : ''
                      } ${
                        isDragTarget
                          ? 'border-t-2 border-t-sky-500 bg-sky-500/5'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Drag Handle + Priority Rank Index */}
                      <div
                        className="min-h-[44px] flex items-center gap-1 text-slate-400 dark:text-slate-500 cursor-grab active:cursor-grabbing select-none shrink-0"
                        title="Drag to reorder task priority"
                      >
                        <GripVertical className="w-4 h-4" />
                        <span className="text-[11px] font-mono tabular-nums w-4 text-center">
                          {idx + 1}
                        </span>
                      </div>

                      {/* Accessible 44x44px Completion Checkbox */}
                      <button
                        onClick={() => handleToggleComplete(task)}
                        aria-label={
                          task.completed
                            ? `Mark "${task.title}" as incomplete`
                            : `Complete "${task.title}"`
                        }
                        className="min-h-[44px] min-w-[44px] -ml-1 flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        <span
                          className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                            task.completed
                              ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                              : task.priority === 'high'
                              ? 'border-rose-500/80 hover:bg-rose-500/10'
                              : task.priority === 'medium'
                              ? 'border-sky-500/80 hover:bg-sky-500/10'
                              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </span>
                      </button>

                      {/* Task Title, Notes & Zero-Pill Unboxed Metadata */}
                      <div className="flex-1 min-w-0 pt-1">
                        <p
                          className={`text-sm font-semibold leading-snug break-words ${
                            task.completed
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {task.title}
                        </p>

                        {task.notes && (
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                            {task.notes}
                          </p>
                        )}

                        {/* Zero-Pill Unboxed Metadata with Clean Typographic Separators (·) */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          <span
                            className={
                              task.priority === 'high' && !task.completed
                                ? 'font-semibold text-rose-600 dark:text-rose-400'
                                : task.priority === 'medium' && !task.completed
                                ? 'font-medium text-sky-600 dark:text-sky-400'
                                : ''
                            }
                          >
                            {formatPriorityLabel(task.priority)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{task.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {task.dueDate === getTodayStr() ? 'Due Today' : `Due ${task.dueDate}`}
                          </span>
                          {task.reminderTime && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Reminder {task.reminderTime}</span>
                            </>
                          )}
                          {task.recurrence !== 'none' && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium capitalize">
                                Repeats {task.recurrence}
                              </span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>
                            {task.completedPomodoros}/{task.estimatedPomodoros} focus
                          </span>
                        </div>
                      </div>

                      {/* Touch & Keyboard Action Controls */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {!task.completed && (
                          <button
                            onClick={() => {
                              setActiveFocusTaskId(task.clientId);
                              if (window.innerWidth < 1024) {
                                setActiveView('focus');
                              }
                            }}
                            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                              isFocused
                                ? 'text-sky-500 bg-sky-500/10'
                                : 'text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            aria-label="Focus on this task"
                            title="Link to Focus Timer"
                          >
                            <Timer className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => moveTaskStep(task.clientId, -1)}
                          disabled={idx === 0}
                          className="min-h-[44px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-25 cursor-pointer"
                          aria-label="Move task higher in priority"
                          title="Move up priority"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => moveTaskStep(task.clientId, 1)}
                          disabled={idx === filteredTasks.length - 1}
                          className="min-h-[44px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-25 cursor-pointer"
                          aria-label="Move task lower in priority"
                          title="Move down priority"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setEditingTask(task);
                            setIsTaskSheetOpen(true);
                          }}
                          className="min-h-[44px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                          aria-label="Edit task"
                          title="Edit task & schedule"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteTask(task.clientId)}
                          className="min-h-[44px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 cursor-pointer"
                          aria-label="Delete task"
                          title="Delete task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Focus Timer Studio Column */}
          <div
            className={`lg:col-span-5 ${
              activeView === 'focus' ? 'block' : 'hidden lg:block'
            }`}
          >
            <FocusTimerPanel
              tasks={tasks}
              activeTaskId={activeFocusTaskId}
              onSelectTask={(id) => setActiveFocusTaskId(id)}
              onCompleteSession={handleCompleteFocusSession}
              sessions={sessions}
            />
          </div>
        </div>
      </main>

      {/* Mobile Fixed Bottom Thumb-Zone Navigation Bar (10_mobile_touch_apps.md Pattern 1) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-4 items-center px-2"
      >
        <button
          onClick={() => setActiveView('all')}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            activeView === 'all' || activeView === 'today'
              ? 'text-sky-500'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Check className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Tasks</span>
        </button>

        <button
          onClick={() => setActiveView('recurring')}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            activeView === 'recurring'
              ? 'text-sky-500'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Repeat className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Recurring</span>
        </button>

        <button
          onClick={() => setActiveView('focus')}
          className={`min-h-[44px] flex flex-col items-center justify-center cursor-pointer ${
            activeView === 'focus'
              ? 'text-sky-500'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Timer className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Focus</span>
        </button>

        <button
          onClick={() => setIsBackupModalOpen(true)}
          className="min-h-[44px] flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 cursor-pointer"
        >
          <Cloud className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Sync</span>
        </button>
      </nav>

      {/* Modals & Sheets */}
      <TaskSheetModal
        isOpen={isTaskSheetOpen}
        onClose={() => {
          setIsTaskSheetOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTaskModal}
        editingTask={editingTask}
      />

      <CloudBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        user={user}
        hasDriveToken={hasDriveToken}
        onGoogleLogin={handleGoogleLogin}
        onGoogleLogout={handleGoogleLogout}
        tasks={tasks}
        sessions={sessions}
        onRestoreBackup={handleRestoreBackup}
        onManualCloudSync={() => syncWithBackend(tasks, sessions, false)}
        isSyncingCloud={isSyncingCloud}
      />

      <OfflineIndicator />
    </div>
  );
}
