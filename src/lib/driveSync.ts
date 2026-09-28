import { getAccessToken } from './firebase';
import { TaskItem, FocusSessionRecord } from '../types';

export interface DriveBackupFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  app: string;
  tasks: TaskItem[];
  sessions: FocusSessionRecord[];
}

const BACKUP_FILENAME = 'krono-tasks-backup.json';

export async function listDriveBackups(): Promise<DriveBackupFile[]> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Google Drive access token required. Please sign in with Google.');
  }

  const query = encodeURIComponent(
    `name = '${BACKUP_FILENAME}' and trashed = false`
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=10`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return Array.isArray(data.files) ? data.files : [];
}

export async function uploadBackupToDrive(
  payload: BackupPayload,
  existingFileId?: string
): Promise<DriveBackupFile> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Google Drive access token required. Please sign in with Google.');
  }

  const metadata = {
    name: BACKUP_FILENAME,
    mimeType: 'application/json',
    description: 'Krono PWA Task & Focus Backup',
  };

  const boundary = '-------krono_drive_multipart_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(payload, null, 2) +
    closeDelimiter;

  const endpoint = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name,modifiedTime,size`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size`;

  const res = await fetch(endpoint, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to upload backup to Google Drive (${res.status}): ${errText}`);
  }

  return await res.json();
}

export async function downloadBackupFromDrive(fileId: string): Promise<BackupPayload> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Google Drive access token required. Please sign in with Google.');
  }

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to download backup from Google Drive (${res.status}): ${errText}`);
  }

  return await res.json();
}

export async function deleteBackupFromDrive(fileId: string): Promise<void> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Google Drive access token required. Please sign in with Google.');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to delete backup from Google Drive (${res.status}): ${errText}`);
  }
}

export async function shareOrDownloadICloudBackup(payload: BackupPayload): Promise<string> {
  const jsonContent = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const fileName = `krono-icloud-backup-${new Date().toISOString().slice(0, 10)}.json`;

  if (
    typeof navigator !== 'undefined' &&
    navigator.canShare &&
    typeof File !== 'undefined'
  ) {
    const file = new File([blob], fileName, { type: 'application/json' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'Krono iCloud Backup',
          text: 'Save your Krono task & focus backup to iCloud Drive',
          files: [file],
        });
        return 'Shared via iOS / macOS iCloud Share Sheet';
      } catch {
        // Fallback to standard file download if share sheet is dismissed
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return `Downloaded ${fileName} (save to iCloud Drive)`;
}

export function exportAppleRemindersICS(tasks: TaskItem[]): void {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Krono PWA//Task & Focus Planner//EN',
    'CALSCALE:GREGORIAN',
  ];

  for (const t of tasks.filter((item) => !item.completed)) {
    const datePart = (t.dueDate || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
    const timePart = t.reminderTime ? t.reminderTime.replace(':', '') + '00' : '090000';
    const dtStart = `${datePart}T${timePart}`;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${t.clientId}@krono.pwa`);
    lines.push(`DTSTAMP:${datePart}T000000Z`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`SUMMARY:${t.title.replace(/[,;\\]/g, ' ')}`);
    if (t.notes) {
      lines.push(`DESCRIPTION:${t.notes.replace(/\n/g, '\\n')}`);
    }
    if (t.recurrence && t.recurrence !== 'none') {
      const freqMap: Record<string, string> = {
        daily: 'FREQ=DAILY',
        weekdays: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
        weekly: 'FREQ=WEEKLY',
        monthly: 'FREQ=MONTHLY',
      };
      if (freqMap[t.recurrence]) {
        lines.push(`RRULE:${freqMap[t.recurrence]}`);
      }
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'krono-icloud-reminders.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
