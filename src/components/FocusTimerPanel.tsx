import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, SkipForward, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
import { TaskItem, FocusSessionRecord } from '../types';
import { soundEngine } from '../lib/sound';

interface FocusTimerPanelProps {
  tasks: TaskItem[];
  activeTaskId: string | null;
  onSelectTask: (clientId: string | null) => void;
  onCompleteSession: (session: FocusSessionRecord, linkedTaskId: string | null) => void;
  sessions: FocusSessionRecord[];
}

type TimerMode = 'focus' | 'short_break' | 'long_break';

const MODE_CONFIG: Record<TimerMode, { label: string; defaultMinutes: number; accentClass: string }> = {
  focus: {
    label: 'Deep Focus',
    defaultMinutes: 25,
    accentClass: 'text-sky-500 dark:text-sky-400',
  },
  short_break: {
    label: 'Short Break',
    defaultMinutes: 5,
    accentClass: 'text-emerald-600 dark:text-emerald-400',
  },
  long_break: {
    label: 'Long Break',
    defaultMinutes: 15,
    accentClass: 'text-indigo-500 dark:text-indigo-400',
  },
};

export const FocusTimerPanel: React.FC<FocusTimerPanelProps> = ({
  tasks,
  activeTaskId,
  onSelectTask,
  onCompleteSession,
  sessions,
}) => {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [customFocusMinutes, setCustomFocusMinutes] = useState<number>(25);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const activeTask = tasks.find((t) => t.clientId === activeTaskId && !t.completed) || null;
  const uncompletedTasks = tasks.filter((t) => !t.completed);

  const totalDurationSeconds =
    mode === 'focus'
      ? customFocusMinutes * 60
      : MODE_CONFIG[mode].defaultMinutes * 60;

  useEffect(() => {
    setIsRunning(false);
    setSecondsLeft(
      mode === 'focus'
        ? customFocusMinutes * 60
        : MODE_CONFIG[mode].defaultMinutes * 60
    );
  }, [mode, customFocusMinutes]);

  const handleFinishCycle = () => {
    setIsRunning(false);
    if (soundEnabled) {
      soundEngine.playTimerFinish();
    }

    const durationMins =
      mode === 'focus' ? customFocusMinutes : MODE_CONFIG[mode].defaultMinutes;

    const newSession: FocusSessionRecord = {
      clientId: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      taskClientId: activeTask ? activeTask.clientId : '',
      taskTitle: activeTask ? activeTask.title : MODE_CONFIG[mode].label,
      durationMinutes: durationMins,
      mode,
      completedAt: new Date().toISOString(),
    };

    onCompleteSession(newSession, mode === 'focus' && activeTask ? activeTask.clientId : null);

    if (mode === 'focus') {
      setMode('short_break');
    } else {
      setMode('focus');
    }
  };

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          handleFinishCycle();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning, mode, customFocusMinutes, activeTask, soundEnabled]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progress =
    totalDurationSeconds > 0
      ? ((totalDurationSeconds - secondsLeft) / totalDurationSeconds) * 100
      : 0;

  const radius = 96;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySessions = sessions.filter(
    (s) => s.mode === 'focus' && s.completedAt.startsWith(todayStr)
  );
  const todayMinutes = todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0);

  return (
    <section
      aria-label="Focus Timer"
      className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Focus Timer
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
            {todaySessions.length} sessions today · {todayMinutes} min focused
          </p>
        </div>
        <button
          onClick={() => setSoundEnabled((prev) => !prev)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label={soundEnabled ? 'Mute timer chime' : 'Enable timer chime'}
          title={soundEnabled ? 'Chime sound enabled' : 'Chime sound muted'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Mode Switcher (Interactive Segmented Control) */}
      <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 dark:bg-slate-950 p-1">
        {(['focus', 'short_break', 'long_break'] as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`min-h-[40px] rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap truncate cursor-pointer ${
              mode === m
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {MODE_CONFIG[m].label}
          </button>
        ))}
      </div>

      {/* Duration Presets when in Focus mode */}
      {mode === 'focus' && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {[15, 25, 45, 60].map((mins) => (
            <button
              key={mins}
              onClick={() => setCustomFocusMinutes(mins)}
              className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-mono tabular-nums transition-colors cursor-pointer ${
                customFocusMinutes === mins
                  ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {mins}m
            </button>
          ))}
        </div>
      )}

      {/* Circular SVG Progress Ring + Tabular Countdown */}
      <div className="my-6 flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center w-56 h-56">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 220 220">
            <circle
              cx="110"
              cy="110"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-slate-100 dark:text-slate-800"
            />
            <circle
              cx="110"
              cy="110"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className={`${MODE_CONFIG[mode].accentClass} transition-all duration-300`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <span className="text-4xl font-bold font-mono tabular-nums tracking-tight text-slate-900 dark:text-white">
              {formattedTime}
            </span>
            <span className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {MODE_CONFIG[mode].label}
            </span>
          </div>
        </div>
      </div>

      {/* Linked Task Selector */}
      <div className="mb-5">
        <label
          htmlFor="focus-task-select"
          className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5"
        >
          Focusing on task
        </label>
        <select
          id="focus-task-select"
          value={activeTask?.clientId || ''}
          onChange={(e) => onSelectTask(e.target.value || null)}
          className="w-full min-h-[44px] rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">General Deep Work (No specific task)</option>
          {uncompletedTasks.map((t) => (
            <option key={t.clientId} value={t.clientId}>
              {t.title} ({t.completedPomodoros}/{t.estimatedPomodoros} blocks)
            </option>
          ))}
        </select>
      </div>

      {/* Primary Timer Controls (48px touch hitboxes) */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => {
            setIsRunning(false);
            setSecondsLeft(totalDurationSeconds);
          }}
          className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Reset timer"
          title="Reset timer"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={() => setIsRunning((prev) => !prev)}
          className="min-h-[48px] flex-1 flex items-center justify-center gap-2 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm px-6 py-3 shadow-sm transition-transform active:scale-[0.99] cursor-pointer whitespace-nowrap"
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>{secondsLeft < totalDurationSeconds ? 'Resume Focus' : 'Start Focus'}</span>
            </>
          )}
        </button>

        <button
          onClick={handleFinishCycle}
          className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Complete current focus cycle now"
          title="Complete & log cycle now"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Recent Focus Sessions Log */}
      {sessions.length > 0 && (
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
            Recent Focus Sessions
          </h3>
          <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
            {sessions.slice(0, 5).map((s) => (
              <div
                key={s.clientId}
                className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                    {s.taskTitle}
                  </span>
                </div>
                <span className="font-mono tabular-nums text-slate-400 dark:text-slate-500 shrink-0">
                  {s.durationMinutes}m ·{' '}
                  {new Date(s.completedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
