import React, { useEffect, useRef, useState } from 'react';
import {
  Cloud,
  RefreshCw,
  Upload,
  Download,
  Trash2,
  Calendar,
  FileJson,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { TaskItem, FocusSessionRecord } from '../types';
import {
  DriveBackupFile,
  BackupPayload,
  listDriveBackups,
  uploadBackupToDrive,
  downloadBackupFromDrive,
  deleteBackupFromDrive,
  shareOrDownloadICloudBackup,
  exportAppleRemindersICS,
} from '../lib/driveSync';

interface CloudBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  hasDriveToken: boolean;
  onGoogleLogin: () => Promise<void>;
  onGoogleLogout: () => Promise<void>;
  tasks: TaskItem[];
  sessions: FocusSessionRecord[];
  onRestoreBackup: (tasks: TaskItem[], sessions: FocusSessionRecord[]) => Promise<void>;
  onManualCloudSync: () => Promise<void>;
  isSyncingCloud: boolean;
}

interface PendingConfirmAction {
  title: string;
  description: string;
  confirmLabel: string;
  isDestructive?: boolean;
  onConfirm: () => Promise<void>;
}

export const CloudBackupModal: React.FC<CloudBackupModalProps> = ({
  isOpen,
  onClose,
  user,
  hasDriveToken,
  onGoogleLogin,
  onGoogleLogout,
  tasks,
  sessions,
  onRestoreBackup,
  onManualCloudSync,
  isSyncingCloud,
}) => {
  const [driveFiles, setDriveFiles] = useState<DriveBackupFile[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmAction | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchBackups = async () => {
    if (!hasDriveToken) return;
    setLoadingDrive(true);
    setErrorMessage(null);
    try {
      const files = await listDriveBackups();
      setDriveFiles(files);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to list Google Drive backups.');
    } finally {
      setLoadingDrive(false);
    }
  };

  useEffect(() => {
    if (isOpen && hasDriveToken) {
      fetchBackups();
    }
  }, [isOpen, hasDriveToken]);

  if (!isOpen) return null;

  const createPayload = (): BackupPayload => ({
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'Krono PWA Task & Focus Planner',
    tasks,
    sessions,
  });

  const handleCreateNewDriveBackup = async () => {
    setLoadingDrive(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const uploaded = await uploadBackupToDrive(createPayload());
      setStatusMessage(`Saved new backup '${uploaded.name}' to Google Drive.`);
      await fetchBackups();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload to Google Drive.');
    } finally {
      setLoadingDrive(false);
    }
  };

  const requestOverwriteDriveBackup = (file: DriveBackupFile) => {
    setPendingConfirm({
      title: `Update '${file.name}' on Google Drive?`,
      description: `This will overwrite the existing backup file (${new Date(
        file.modifiedTime
      ).toLocaleString()}) in your Google Drive with your current ${
        tasks.length
      } task(s) and ${sessions.length} focus session(s).`,
      confirmLabel: 'Confirm Overwrite',
      isDestructive: false,
      onConfirm: async () => {
        setPendingConfirm(null);
        setLoadingDrive(true);
        setErrorMessage(null);
        try {
          await uploadBackupToDrive(createPayload(), file.id);
          setStatusMessage(`Updated '${file.name}' on Google Drive.`);
          await fetchBackups();
        } catch (err: any) {
          setErrorMessage(err.message || 'Failed to update backup on Google Drive.');
        } finally {
          setLoadingDrive(false);
        }
      },
    });
  };

  const requestRestoreFromDrive = (file: DriveBackupFile) => {
    setPendingConfirm({
      title: `Restore tasks from '${file.name}'?`,
      description: `This will replace your current local and synced workspace with the backup saved on ${new Date(
        file.modifiedTime
      ).toLocaleString()}.`,
      confirmLabel: 'Confirm Restore',
      isDestructive: false,
      onConfirm: async () => {
        setPendingConfirm(null);
        setLoadingDrive(true);
        setErrorMessage(null);
        try {
          const data = await downloadBackupFromDrive(file.id);
          if (!data || !Array.isArray(data.tasks)) {
            throw new Error('Invalid backup file format.');
          }
          await onRestoreBackup(data.tasks, Array.isArray(data.sessions) ? data.sessions : []);
          setStatusMessage(`Restored ${data.tasks.length} tasks from Google Drive.`);
        } catch (err: any) {
          setErrorMessage(err.message || 'Failed to restore from Google Drive.');
        } finally {
          setLoadingDrive(false);
        }
      },
    });
  };

  const requestDeleteDriveBackup = (file: DriveBackupFile) => {
    setPendingConfirm({
      title: `Delete '${file.name}' from Google Drive?`,
      description: `Are you sure you want to permanently delete the backup from ${new Date(
        file.modifiedTime
      ).toLocaleString()} from your Google Drive? This action cannot be undone.`,
      confirmLabel: 'Delete Backup',
      isDestructive: true,
      onConfirm: async () => {
        setPendingConfirm(null);
        setLoadingDrive(true);
        setErrorMessage(null);
        try {
          await deleteBackupFromDrive(file.id);
          setStatusMessage(`Deleted '${file.name}' from Google Drive.`);
          await fetchBackups();
        } catch (err: any) {
          setErrorMessage(err.message || 'Failed to delete file from Google Drive.');
        } finally {
          setLoadingDrive(false);
        }
      },
    });
  };

  const handleICloudExport = async () => {
    setErrorMessage(null);
    const msg = await shareOrDownloadICloudBackup(createPayload());
    setStatusMessage(msg);
  };

  const handleICloudFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as BackupPayload;
        if (!parsed || !Array.isArray(parsed.tasks)) {
          throw new Error('Selected JSON file does not contain valid Krono tasks.');
        }
        setPendingConfirm({
          title: `Restore ${parsed.tasks.length} task(s) from '${file.name}'?`,
          description: `Importing this iCloud / local backup file will replace your current ${tasks.length} task(s).`,
          confirmLabel: 'Restore Backup',
          onConfirm: async () => {
            setPendingConfirm(null);
            await onRestoreBackup(
              parsed.tasks,
              Array.isArray(parsed.sessions) ? parsed.sessions : []
            );
            setStatusMessage(`Restored ${parsed.tasks.length} task(s) from ${file.name}.`);
          },
        });
      } catch (err: any) {
        setErrorMessage(err.message || 'Invalid backup JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-xl rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Cross-Platform Sync & Cloud Backup
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Offline LocalStorage · Cloud Sync · Google Drive & iCloud Drive
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            aria-label="Close backup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 text-xs font-medium text-rose-600 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Section 1: Google Account & Google Drive Sync */}
        <div className="mt-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-sky-500" />
                <span>Google Drive & Cloud Sync</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {user
                  ? `Signed in as ${user.email}`
                  : 'Sign in with Google to sync across devices and back up to Google Drive.'}
              </p>
            </div>

            {!user || !hasDriveToken ? (
              <button onClick={onGoogleLogin} className="gsi-material-button">
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      style={{ display: 'block' }}
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      ></path>
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      ></path>
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      ></path>
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      ></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">
                    {user ? 'Reconnect Google Drive' : 'Sign in with Google'}
                  </span>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onManualCloudSync}
                  disabled={isSyncingCloud}
                  className="min-h-[44px] flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                  <span>Sync Now</span>
                </button>
                <button
                  onClick={onGoogleLogout}
                  className="min-h-[44px] flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {hasDriveToken && (
            <div className="mt-4 pt-4 border-t border-slate-200/70 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Google Drive Backups (krono-tasks-backup.json)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchBackups}
                    disabled={loadingDrive}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={handleCreateNewDriveBackup}
                    disabled={loadingDrive}
                    className="min-h-[40px] flex items-center gap-1.5 rounded-xl bg-sky-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-400 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>New Drive Backup</span>
                  </button>
                </div>
              </div>

              {loadingDrive ? (
                <p className="text-xs text-slate-500 py-3">Communicating with Google Drive...</p>
              ) : driveFiles.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">
                  No backup snapshots in Google Drive yet. Click "New Drive Backup" to create one.
                </p>
              ) : (
                <div className="space-y-2">
                  {driveFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                          Modified {new Date(file.modifiedTime).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => requestOverwriteDriveBackup(file)}
                          className="min-h-[38px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Overwrite this backup on Google Drive"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => requestRestoreFromDrive(file)}
                          className="min-h-[38px] px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 text-xs font-semibold hover:bg-sky-500/25 transition-colors cursor-pointer"
                          title="Restore tasks from this Google Drive backup"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => requestDeleteDriveBackup(file)}
                          className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          aria-label="Delete backup from Google Drive"
                          title="Delete from Google Drive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 2: iCloud Drive & Apple Reminders Integration */}
        <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            iCloud Drive & Apple Ecosystem Backup
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Export or import portable backups via iOS/macOS iCloud Drive Share Sheet, or export recurring tasks to Apple Calendar & Reminders (.ics).
          </p>

          <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              onClick={handleICloudExport}
              className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <FileJson className="w-4 h-4 text-sky-500 shrink-0" />
              <span>Save to iCloud (.json)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Import iCloud Backup</span>
            </button>

            <button
              onClick={() => {
                exportAppleRemindersICS(tasks);
                setStatusMessage('Exported krono-icloud-reminders.ics for Apple Reminders / Calendar.');
              }}
              className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Apple Calendar (.ics)</span>
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleICloudFileImport}
            className="hidden"
          />
        </div>

        {/* Mandatory Explicit User Confirmation Dialog for Mutating/Destructive Actions */}
        {pendingConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {pendingConfirm.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {pendingConfirm.description}
              </p>
              <div className="mt-5 flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setPendingConfirm(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={pendingConfirm.onConfirm}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer ${
                    pendingConfirm.isDestructive
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                  }`}
                >
                  {pendingConfirm.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
