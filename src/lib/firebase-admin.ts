import fs from 'fs';
import path from 'path';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

if (!getApps().length) {
  initializeApp({
    projectId:
      process.env.VITE_FIREBASE_PROJECT_ID ||
      process.env.FIREBASE_PROJECT_ID ||
      firebaseConfig.projectId,
  });
}

export const adminAuth = getAuth();
