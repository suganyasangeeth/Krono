import React, { useMemo, useState } from 'react';
import {
  Check,
  Plus,
  Maximize2,
  Smartphone,
  Copy,
  Download,
  X,
  Share,
  LayoutGrid,
  Eye,
  Calendar,
} from 'lucide-react';
import { TaskItem, PriorityLevel } from '../types';
import { exportAppleRemindersICS } from '../lib/driveSync';

export type WidgetSize = 'small' | 'medium' | 'large';
export type WidgetListFilter = 'active' | 'today' | 'high';

interface IOSWidgetCardProps {
  size: WidgetSize;
  tasks: TaskItem[];
  listFilter: WidgetListFilter;
  onToggleComplete: (task: TaskItem) => void;
  onViewTask: (task: TaskItem) => void;
  onQuickAdd?: (title: string, priority: PriorityLevel) => void;
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const IOSWidgetCard: React.FC<IOSWidgetCardProps> = ({
  size,
  tasks,
  listFilter,
  onToggleComplete,
  onViewTask,
  onQuickAdd,
}) => {
  const [quickInput, setQuickInput] = useState('');

  const filteredTasks = useMemo(() => {
    const today = getTodayStr();
    return [...tasks]
      .sort((a, b) => a.position - b.position)
      .filter((t) => {
        if (t.completed) return false;
        if (listFilter === 'today') return t.dueDate === today;
        if (listFilter === 'high') return t.priority === 'high';
        return true;
      });
  }, [tasks, listFilter]);

  const maxVisible = size === 'small' ? 3 : size === 'medium' ? 5 : 10;
  const visibleTasks = filteredTasks.slice(0, maxVisible);
  const remainingCount = Math.max(0, filteredTasks.length - visibleTasks.length);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim() || !onQuickAdd) return;
    onQuickAdd(quickInput.trim(), listFilter === 'high' ? 'high' : 'medium');
    setQuickInput('');
  };

  // iOS Widget container geometry tailored for iPhone 11 and desktop
  const containerClasses =
    size === 'small'
      ? 'w-full max-w-[300px] min-h-[250px] p-5 rounded-[28px]'
      : size === 'medium'
      ? 'w-full max-w-[480px] min-h-[250px] p-5 rounded-[30px]'
      : 'w-full max-w-[480px] min-h-[430px] p-5 rounded-[32px]';

  const filterTitle =
    listFilter === 'today'
      ? "Today's Tasks"
      : listFilter === 'high'
      ? 'High Priority'
      : 'Task List';

  return (
    <div
      className={`${containerClasses} bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 shadow-lg flex flex-col justify-between transition-all mx-auto`}
    >
      {/* Top iOS Widget Header */}
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-3 h-3 rounded-full bg-sky-500 shrink-0" />
            <h2 className="text-base font-bold tracking-tight font-display text-slate-900 dark:text-white truncate">
              {filterTitle}
            </h2>
          </div>
          <span className="text-sm font-mono font-bold tabular-nums text-sky-500 shrink-0">
            {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>

        {/* Task List Only Content */}
        {visibleTasks.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-base font-medium text-slate-400 dark:text-slate-500">
              All tasks completed
            </p>
          </div>
        ) : (
          <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800/70">
            {visibleTasks.map((task, idx) => (
              <div
                key={task.clientId}
                className="flex items-center justify-between gap-2.5 py-2.5"
              >
                {/* Check-off circle */}
                <button
                  type="button"
                  onClick={() => onToggleComplete(task)}
                  aria-label={`Complete "${task.title}"`}
                  className="min-h-[40px] min-w-[40px] -ml-1 flex items-center justify-center shrink-0 cursor-pointer group"
                >
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      task.priority === 'high'
                        ? 'border-rose-500 group-hover:bg-rose-500/15'
                        : task.priority === 'medium'
                        ? 'border-sky-500 group-hover:bg-sky-500/15'
                        : 'border-slate-400 dark:border-slate-600'
                    }`}
                  >
                    <Check className="w-3 h-3 opacity-0 group-hover:opacity-100 text-sky-500 transition-opacity" />
                  </span>
                </button>

                {/* Tapping task title opens Read-Only Task View Dialog */}
                <button
                  type="button"
                  onClick={() => onViewTask(task)}
                  className="flex-1 min-w-0 text-left cursor-pointer"
                >
                  <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 break-words">
                    {task.title}
                  </p>
                  {size !== 'small' && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                      #{idx + 1} · {task.category} · Due {task.dueDate}
                    </p>
                  )}
                </button>

                {/* View Button */}
                <button
                  type="button"
                  onClick={() => onViewTask(task)}
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl text-slate-400 hover:text-sky-500 shrink-0 cursor-pointer"
                  aria-label={`View details for "${task.title}"`}
                  title="View Task Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer of Widget */}
      <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between gap-2">
        {size === 'large' && onQuickAdd ? (
          <form onSubmit={handleAddSubmit} className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="+ Add task to widget..."
              className="flex-1 min-h-[42px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="min-h-[42px] px-3.5 rounded-xl bg-sky-500 text-slate-950 text-sm font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
            {remainingCount > 0 ? `+${remainingCount} more tasks` : 'Tap task to view · circle to complete'}
          </span>
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          <img
            src="/icon.svg"
            alt="Krono"
            className="w-3.5 h-3.5 rounded-xs object-contain shrink-0"
          />
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 shrink-0">
            Krono
          </span>
        </div>
      </div>
    </div>
  );
};

interface IOSWidgetStandaloneProps {
  initialSize: WidgetSize;
  tasks: TaskItem[];
  onToggleComplete: (task: TaskItem) => void;
  onViewTask: (task: TaskItem) => void;
  onQuickAdd: (title: string, priority: PriorityLevel) => void;
  onExitWidgetMode: () => void;
  onChangeSize: (size: WidgetSize) => void;
}

export const IOSWidgetStandalone: React.FC<IOSWidgetStandaloneProps> = ({
  initialSize,
  tasks,
  onToggleComplete,
  onViewTask,
  onQuickAdd,
  onExitWidgetMode,
  onChangeSize,
}) => {
  const [size, setSize] = useState<WidgetSize>(initialSize);
  const [listFilter, setListFilter] = useState<WidgetListFilter>('active');

  const handleSelectSize = (nextSize: WidgetSize) => {
    setSize(nextSize);
    onChangeSize(nextSize);
  };

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)]">
      {/* Compact Top Control Strip (Safe-Area Aware on iPhone 11) */}
      <header className="w-full max-w-md mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <img
            src="/icon.svg"
            alt="Krono"
            className="w-7 h-7 rounded-lg object-contain shadow-xs shrink-0"
          />
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
            Krono
          </span>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/90 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          {(['small', 'medium', 'large'] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleSelectSize(s)}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                size === s
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {s === 'small' ? 'Small' : s === 'medium' ? 'Medium' : 'Large'}
            </button>
          ))}
        </div>

        <button
          onClick={onExitWidgetMode}
          className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          title="Return to full Krono workspace"
        >
          <Maximize2 className="w-4 h-4" />
          <span>Full App</span>
        </button>
      </header>

      {/* Center iOS Task-List-Only Widget */}
      <main className="my-auto py-5 w-full flex flex-col items-center justify-center gap-4">
        <IOSWidgetCard
          size={size}
          tasks={tasks}
          listFilter={listFilter}
          onToggleComplete={onToggleComplete}
          onViewTask={onViewTask}
          onQuickAdd={onQuickAdd}
        />

        {/* Subtle Task List Filter Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/90 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
          {(
            [
              { id: 'active', label: 'All Active' },
              { id: 'today', label: 'Today Only' },
              { id: 'high', label: 'High Priority' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setListFilter(tab.id)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                listFilter === tab.id
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </main>

      {/* Bottom iOS Home Screen Hint */}
      <footer className="w-full max-w-md mx-auto text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          To pin this <strong>{size.toUpperCase()}</strong> Task Widget to your iPhone Home Screen: open this page in Safari and tap <strong>Share → Add to Home Screen</strong>.
        </p>
      </footer>
    </div>
  );
};

interface IOSWidgetStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  userUid: string | null;
  onToggleComplete: (task: TaskItem) => void;
  onViewTask: (task: TaskItem) => void;
  onQuickAdd: (title: string, priority: PriorityLevel) => void;
  onLaunchWidgetMode: (size: WidgetSize) => void;
}

export const IOSWidgetStudioModal: React.FC<IOSWidgetStudioModalProps> = ({
  isOpen,
  onClose,
  tasks,
  userUid,
  onToggleComplete,
  onViewTask,
  onQuickAdd,
  onLaunchWidgetMode,
}) => {
  const [previewSize, setPreviewSize] = useState<WidgetSize>('medium');
  const [listFilter, setListFilter] = useState<WidgetListFilter>('active');
  const [copiedScript, setCopiedScript] = useState(false);

  if (!isOpen) return null;

  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const activeFallbackTasks = tasks
    .filter((t) => !t.completed)
    .sort((a, b) => a.position - b.position)
    .slice(0, 10)
    .map((t) => ({
      title: t.title,
      priority: t.priority,
      category: t.category,
    }));

  const scriptableCode = `// Variables used by Scriptable.
// icon-color: deep-blue; icon-glyph: check-circle;
// Krono iOS Home Screen Task List Widget (Small, Medium & Large)

const API_URL = "${originUrl}/api/widget?uid=${userUid || ''}";
const FALLBACK_TASKS = ${JSON.stringify(activeFallbackTasks)};

async function loadTasks() {
  try {
    const req = new Request(API_URL);
    req.timeoutInterval = 5;
    const res = await req.loadJSON();
    if (res && Array.isArray(res.tasks) && res.tasks.length > 0) {
      return res.tasks.filter(t => !t.completed);
    }
  } catch (e) {}
  return FALLBACK_TASKS;
}

const tasks = await loadTasks();
const family = config.widgetFamily || "medium";
const maxItems = family === "small" ? 4 : family === "medium" ? 5 : 10;

const w = new ListWidget();
w.backgroundColor = new Color("#0f172a");
w.setPadding(14, 16, 14, 16);
w.url = "${originUrl}/?widget=" + family;

const header = w.addStack();
header.layoutHorizontally();
header.centerAlignContent();
const titleTxt = header.addText("Krono Tasks");
titleTxt.font = Font.boldSystemFont(14);
titleTxt.textColor = new Color("#38bdf8");
header.addSpacer();
const countTxt = header.addText(String(tasks.length));
countTxt.font = Font.boldMonospacedSystemFont(13);
countTxt.textColor = new Color("#94a3b8");

w.addSpacer(8);

const visible = tasks.slice(0, maxItems);
if (visible.length === 0) {
  const doneTxt = w.addText("All tasks completed");
  doneTxt.font = Font.systemFont(13);
  doneTxt.textColor = new Color("#64748b");
} else {
  for (const item of visible) {
    const row = w.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    const dot = row.addText(item.priority === "high" ? "● " : "○ ");
    dot.font = Font.boldSystemFont(12);
    dot.textColor = item.priority === "high" ? new Color("#fb7185") : new Color("#38bdf8");
    const t = row.addText(item.title);
    t.font = Font.systemFont(13);
    t.textColor = new Color("#f8fafc");
    t.lineLimit = 1;
    w.addSpacer(4);
  }
}

w.addSpacer();
Script.setWidget(w);
if (config.runsInApp) {
  family === "small" ? w.presentSmall() : family === "large" ? w.presentLarge() : w.presentMedium();
}
Script.complete();`;

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(scriptableCode);
      setCopiedScript(true);
      window.setTimeout(() => setCopiedScript(false), 3000);
    } catch {
      // ignore
    }
  };

  const handleDownloadScript = () => {
    const blob = new Blob([scriptableCode], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Krono-iOS-Widget.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-widget-modal-title"
    >
      <div className="w-full max-w-2xl rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85dvh] overflow-hidden">
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        {/* Sticky Header */}
        <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/icon.svg"
              alt="Krono"
              className="w-5 h-5 rounded-md object-contain shrink-0 shadow-xs"
            />
            <h2
              id="ios-widget-modal-title"
              className="text-lg font-bold font-display text-slate-900 dark:text-white truncate"
            >
              iOS Task Widgets (3 Sizes)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Close widget studio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
          {/* Size & Filter Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 w-full sm:w-auto">
              {(['small', 'medium', 'large'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setPreviewSize(s)}
                  className={`min-h-[42px] px-3 py-1.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                    previewSize === s
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {s === 'small' ? 'Small' : s === 'medium' ? 'Medium' : 'Large'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 w-full sm:w-auto">
              {(
                [
                  { id: 'active', label: 'All Active' },
                  { id: 'today', label: 'Today' },
                  { id: 'high', label: 'High Priority' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setListFilter(f.id)}
                  className={`min-h-[40px] px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                    listFilter === f.id
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Interactive Widget Preview */}
          <div className="p-4 rounded-3xl bg-slate-100 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800">
            <IOSWidgetCard
              size={previewSize}
              tasks={tasks}
              listFilter={listFilter}
              onToggleComplete={onToggleComplete}
              onViewTask={(t) => {
                onClose();
                onViewTask(t);
              }}
              onQuickAdd={onQuickAdd}
            />
          </div>

          {/* Why iOS Long-Press Needs One of These 3 Options */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Note on iPhone: Apple restricts Safari web apps from showing the native App Store widget size picker when long-pressing an icon. Use any of these 3 ways to get your Task-List Widget on iPhone:
            </p>

            {/* Way 1: Full-Screen Task-List Widget Mode */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Share className="w-4 h-4 text-sky-500 shrink-0" />
                <span>Option 1: Pin Task-List-Only Widget Icon to Home Screen</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Tap below to switch Krono into <strong>Task-List-Only Widget Mode</strong>, then tap <strong>Safari Share → Add to Home Screen</strong> to add a dedicated widget icon that opens straight to your task list.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onLaunchWidgetMode(previewSize);
                }}
                className="min-h-[46px] w-full rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Open {previewSize.toUpperCase()} Task-List Widget Mode</span>
              </button>
            </div>

            {/* Way 2: Built-In iPhone Reminders / Calendar Native Widget */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Option 2: Sync to Built-In iPhone Home Screen Widget (.ics)</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Send your tasks to your iPhone&apos;s built-in <strong>Apple Calendar / Reminders Widget</strong> (which supports long-pressing on your iPhone Home Screen to resize between Small, Medium, and Large!).
              </p>
              <button
                onClick={() => exportAppleRemindersICS(tasks)}
                className="min-h-[46px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span>Export to iPhone Native Widget (.ics)</span>
              </button>
            </div>

            {/* Way 3: Custom Scriptable Native iOS Home Screen Widget */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Option 3: Live Custom iPhone Wallpaper Widget (Scriptable)</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Copy this pre-configured script into the free <strong>Scriptable</strong> app on iOS, then long-press your iPhone Home Screen → tap <strong>+</strong> → add Scriptable in Small, Medium, or Large size.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyScript}
                  className="min-h-[46px] flex-1 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 text-sm font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copiedScript ? 'Copied iOS Script!' : 'Copy iOS Widget Script'}</span>
                </button>
                <button
                  onClick={handleDownloadScript}
                  className="min-h-[46px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
                  title="Download .js file"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
