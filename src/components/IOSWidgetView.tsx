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
} from 'lucide-react';
import { TaskItem, PriorityLevel } from '../types';

export type WidgetSize = 'small' | 'medium' | 'large';
export type WidgetListFilter = 'active' | 'today' | 'high';

interface IOSWidgetCardProps {
  size: WidgetSize;
  tasks: TaskItem[];
  listFilter: WidgetListFilter;
  onToggleComplete: (task: TaskItem) => void;
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

  const maxVisible = size === 'small' ? 4 : size === 'medium' ? 6 : 10;
  const visibleTasks = filteredTasks.slice(0, maxVisible);
  const remainingCount = Math.max(0, filteredTasks.length - visibleTasks.length);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim() || !onQuickAdd) return;
    onQuickAdd(quickInput.trim(), listFilter === 'high' ? 'high' : 'medium');
    setQuickInput('');
  };

  // iOS Widget container geometry matching Small (2x2), Medium (4x2), Large (4x4)
  const containerClasses =
    size === 'small'
      ? 'w-full max-w-[230px] min-h-[230px] p-4 rounded-[28px]'
      : size === 'medium'
      ? 'w-full max-w-[460px] min-h-[220px] p-5 rounded-[30px]'
      : 'w-full max-w-[460px] min-h-[440px] p-5 rounded-[32px]';

  const filterTitle =
    listFilter === 'today'
      ? "Today's Tasks"
      : listFilter === 'high'
      ? 'High Priority'
      : 'Task Queue';

  return (
    <div
      className={`${containerClasses} bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 shadow-lg flex flex-col justify-between transition-all mx-auto`}
    >
      {/* Top iOS Widget Header */}
      <div>
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
            <h2 className="text-xs font-bold tracking-tight font-display text-slate-900 dark:text-white truncate">
              {filterTitle}
            </h2>
          </div>
          <span className="text-xs font-mono font-bold tabular-nums text-sky-500 shrink-0">
            {filteredTasks.length}
          </span>
        </div>

        {/* Task List Only Content */}
        {visibleTasks.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              All tasks completed
            </p>
          </div>
        ) : size === 'medium' ? (
          /* Medium 4x2: Two-column scannable layout */
          <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {visibleTasks.map((task) => (
              <button
                key={task.clientId}
                onClick={() => onToggleComplete(task)}
                className="min-h-[36px] w-full flex items-center gap-2.5 text-left py-1 px-1.5 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
              >
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    task.priority === 'high'
                      ? 'border-rose-500 group-hover:bg-rose-500/15'
                      : task.priority === 'medium'
                      ? 'border-sky-500 group-hover:bg-sky-500/15'
                      : 'border-slate-400 dark:border-slate-600'
                  }`}
                >
                  <Check className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-sky-500 transition-opacity" />
                </span>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                  {task.title}
                </span>
              </button>
            ))}
          </div>
        ) : (
          /* Small 2x2 & Large 4x4: Vertical crisp task list */
          <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800/60">
            {visibleTasks.map((task, idx) => (
              <div
                key={task.clientId}
                className="flex items-center justify-between gap-2 py-1.5"
              >
                <button
                  onClick={() => onToggleComplete(task)}
                  className="min-h-[34px] flex-1 min-w-0 flex items-center gap-2.5 text-left rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/50 px-1 transition-colors cursor-pointer group"
                >
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      task.priority === 'high'
                        ? 'border-rose-500 group-hover:bg-rose-500/15'
                        : task.priority === 'medium'
                        ? 'border-sky-500 group-hover:bg-sky-500/15'
                        : 'border-slate-400 dark:border-slate-600'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-sky-500 transition-opacity" />
                  </span>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                    {task.title}
                  </span>
                </button>

                {size === 'large' && (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                    #{idx + 1} · {task.category}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer of Widget */}
      <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between gap-2">
        {size === 'large' && onQuickAdd ? (
          <form onSubmit={handleAddSubmit} className="flex-1 flex items-center gap-1.5">
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="+ Add task to widget..."
              className="flex-1 min-h-[34px] px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="min-h-[34px] px-2.5 rounded-xl bg-sky-500 text-slate-950 text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
            {remainingCount > 0 ? `+${remainingCount} more tasks` : 'Tap circle to complete'}
          </span>
        )}
        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
          Krono
        </span>
      </div>
    </div>
  );
};

interface IOSWidgetStandaloneProps {
  initialSize: WidgetSize;
  tasks: TaskItem[];
  onToggleComplete: (task: TaskItem) => void;
  onQuickAdd: (title: string, priority: PriorityLevel) => void;
  onExitWidgetMode: () => void;
  onChangeSize: (size: WidgetSize) => void;
}

export const IOSWidgetStandalone: React.FC<IOSWidgetStandaloneProps> = ({
  initialSize,
  tasks,
  onToggleComplete,
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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6">
      {/* Compact Top Control Strip */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/90 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          {(['small', 'medium', 'large'] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleSelectSize(s)}
              className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                size === s
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {s === 'small' ? 'Small 2×2' : s === 'medium' ? 'Medium 4×2' : 'Large 4×4'}
            </button>
          ))}
        </div>

        <button
          onClick={onExitWidgetMode}
          className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          title="Return to full Krono workspace"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Full App</span>
        </button>
      </header>

      {/* Center iOS Task-List-Only Widget */}
      <main className="my-auto py-6 w-full flex flex-col items-center justify-center gap-4">
        <IOSWidgetCard
          size={size}
          tasks={tasks}
          listFilter={listFilter}
          onToggleComplete={onToggleComplete}
          onQuickAdd={onQuickAdd}
        />

        {/* Subtle Task List Filter Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800">
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
              className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                listFilter === tab.id
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 font-semibold'
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
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Tip: Tap <strong>Share → Add to Home Screen</strong> while on this view to pin this{' '}
          <span className="capitalize">{size}</span> Task Widget directly to your iPhone Home Screen.
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
  onQuickAdd: (title: string, priority: PriorityLevel) => void;
  onLaunchWidgetMode: (size: WidgetSize) => void;
}

export const IOSWidgetStudioModal: React.FC<IOSWidgetStudioModalProps> = ({
  isOpen,
  onClose,
  tasks,
  userUid,
  onToggleComplete,
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

  // Ready-to-run iOS Scriptable Home Screen Widget code supporting Small, Medium, and Large iOS sizes
  const scriptableCode = `// Variables used by Scriptable.
// icon-color: deep-blue; icon-glyph: check-circle;
// Krono iOS Home Screen Task List Widget (Supports Small, Medium & Large)

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

// Header
const header = w.addStack();
header.layoutHorizontally();
header.centerAlignContent();
const titleTxt = header.addText("Krono Tasks");
titleTxt.font = Font.boldSystemFont(13);
titleTxt.textColor = new Color("#38bdf8");
header.addSpacer();
const countTxt = header.addText(String(tasks.length));
countTxt.font = Font.boldMonospacedSystemFont(12);
countTxt.textColor = new Color("#94a3b8");

w.addSpacer(8);

// Task List Rows Only
const visible = tasks.slice(0, maxItems);
if (visible.length === 0) {
  const doneTxt = w.addText("All tasks completed 🎉");
  doneTxt.font = Font.systemFont(12);
  doneTxt.textColor = new Color("#64748b");
} else {
  for (const item of visible) {
    const row = w.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    const dot = row.addText(item.priority === "high" ? "● " : "○ ");
    dot.font = Font.boldSystemFont(11);
    dot.textColor = item.priority === "high" ? new Color("#fb7185") : new Color("#38bdf8");
    const t = row.addText(item.title);
    t.font = Font.systemFont(12);
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-widget-modal-title"
    >
      <div className="w-full max-w-2xl rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <LayoutGrid className="w-5 h-5 text-sky-500" />
            <div>
              <h2
                id="ios-widget-modal-title"
                className="text-lg font-bold font-display text-slate-900 dark:text-white"
              >
                iOS Task List Widgets (3 Sizes)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Clean task-list-only widgets in Small (2×2), Medium (4×2), and Large (4×4) sizes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            aria-label="Close widget studio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Size & Filter Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
            {(['small', 'medium', 'large'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setPreviewSize(s)}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  previewSize === s
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {s === 'small' ? 'Small (2×2)' : s === 'medium' ? 'Medium (4×2)' : 'Large (4×4)'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
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
                className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  listFilter === f.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Interactive Widget Preview */}
        <div className="mt-4 p-5 rounded-3xl bg-slate-100/90 dark:bg-slate-950/90 border border-slate-200/70 dark:border-slate-800/80">
          <IOSWidgetCard
            size={previewSize}
            tasks={tasks}
            listFilter={listFilter}
            onToggleComplete={onToggleComplete}
            onQuickAdd={onQuickAdd}
          />
        </div>

        {/* Option 1: Launch Dedicated Task-List-Only Widget Mode & Long-Press Shortcut */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Share className="w-4 h-4 text-sky-500" />
                <span>1. Long-Press & Pin Widget View</span>
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Open Krono in <strong>Task-List-Only Widget Form</strong> (or long-press the installed app icon to pick Small, Medium, or Large) and tap <strong>Share → Add to Home Screen</strong>.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onLaunchWidgetMode(previewSize);
              }}
              className="min-h-[42px] w-full rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Open {previewSize.toUpperCase()} Task Widget View</span>
            </button>
          </div>

          {/* Option 2: Native iOS Home Screen Wallpaper Widget (Scriptable) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-500" />
                <span>2. Native iOS Home Screen Widget</span>
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Want a live 2×2, 4×2, or 4×4 widget directly on your iPhone wallpaper? Paste this generated script into the free <strong>Scriptable</strong> iOS app and long-press your Home Screen to add it in any of the 3 sizes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyScript}
                className="min-h-[42px] flex-1 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedScript ? 'Copied Script!' : 'Copy iOS Script'}</span>
              </button>
              <button
                onClick={handleDownloadScript}
                className="min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1 cursor-pointer"
                title="Download .js file for iCloud Drive / Scriptable"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
