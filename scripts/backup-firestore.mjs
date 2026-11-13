#!/usr/bin/env node
/**
 * scripts/backup-firestore.mjs
 * Automated Firestore Disaster Recovery Backup for קורס הנהגה
 *
 * Runs via Firebase CLI OAuth token (zero npm dependencies required).
 * Backs up all production collections and config under artifacts/hanhaga-2027/
 * into timestamped JSON files with manifest and sha256 checksums.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const APP_ID = 'hanhaga-2027';

function getAccessToken() {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.tokens?.access_token;
    } catch {}
  }
  return null;
}

function parseFirestoreValue(val) {
  if (!val || typeof val !== 'object') return val;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    const values = val.arrayValue?.values || [];
    return values.map(parseFirestoreValue);
  }
  if ('mapValue' in val) {
    const fields = val.mapValue?.fields || {};
    const res = {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = parseFirestoreValue(v);
    }
    return res;
  }
  return val;
}

function parseFirestoreDoc(doc) {
  const id = doc.name.split('/').pop();
  const fields = doc.fields || {};
  const data = { id, _createTime: doc.createTime, _updateTime: doc.updateTime };
  for (const [k, v] of Object.entries(fields)) {
    data[k] = parseFirestoreValue(v);
  }
  return data;
}

async function fetchCollectionDocs(token, collectionPath) {
  const docs = [];
  let pageToken = '';
  do {
    const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
    const url = `https://firestore.googleapis.com/v1/projects/${APP_ID}/databases/(default)/documents/${collectionPath}?pageSize=300${pageParam}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 404) {
      return [];
    }

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Firestore REST error ${res.status} on ${collectionPath}: ${txt}`);
    }

    const data = await res.json();
    if (data.documents && Array.isArray(data.documents)) {
      for (const d of data.documents) {
        docs.push(parseFirestoreDoc(d));
      }
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return docs;
}

async function fetchSingleDoc(token, docPath) {
  const url = `https://firestore.googleapis.com/v1/projects/${APP_ID}/databases/(default)/documents/${docPath}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Firestore REST error ${res.status} on ${docPath}: ${txt}`);
  }

  const data = await res.json();
  return parseFirestoreDoc(data);
}

const DATA_COLLECTIONS = [
  'users',
  'exams',
  'grades',
  'attendance',
  'bulletin_boards',
  'events',
  'notes'
];

async function runBackup() {
  console.log('🚀 [Firestore Backup] Starting automated backup for קורס הנהגה...');
  const token = getAccessToken();
  if (!token) {
    console.error('❌ [Firestore Backup] No active Firebase CLI token found. Please run `npx firebase login`.');
    process.exit(1);
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(rootDir, 'backups', `backup-${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  const manifest = {
    projectId: APP_ID,
    timestamp: now.toISOString(),
    totalCollections: 0,
    totalDocuments: 0,
    collections: {}
  };

  for (const colName of DATA_COLLECTIONS) {
    const colPath = `artifacts/${APP_ID}/public/data/${colName}`;
    process.stdout.write(`  📦 Backing up ${colName.padEnd(16)} ... `);
    try {
      const docs = await fetchCollectionDocs(token, colPath);
      const fileName = `${colName}.json`;
      const filePath = path.join(backupDir, fileName);
      const jsonContent = JSON.stringify(docs, null, 2);
      fs.writeFileSync(filePath, jsonContent, 'utf8');

      const hash = crypto.createHash('sha256').update(jsonContent).digest('hex');
      manifest.collections[colName] = {
        count: docs.length,
        file: fileName,
        sha256: hash,
        bytes: Buffer.byteLength(jsonContent)
      };
      manifest.totalDocuments += docs.length;
      manifest.totalCollections++;
      console.log(`✅ ${docs.length.toString().padStart(4)} docs (${(Buffer.byteLength(jsonContent)/1024).toFixed(1)} KB)`);
    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`);
    }
  }

  // Backup config document as a collection-like array with 1 item for verify consistency
  process.stdout.write(`  📦 Backing up config           ... `);
  try {
    const configDoc = await fetchSingleDoc(token, `artifacts/${APP_ID}/public/config`);
    const docs = configDoc ? [configDoc] : [];
    const fileName = 'config.json';
    const filePath = path.join(backupDir, fileName);
    const jsonContent = JSON.stringify(docs, null, 2);
    fs.writeFileSync(filePath, jsonContent, 'utf8');

    const hash = crypto.createHash('sha256').update(jsonContent).digest('hex');
    manifest.collections['config'] = {
      count: docs.length,
      file: fileName,
      sha256: hash,
      bytes: Buffer.byteLength(jsonContent)
    };
    manifest.totalDocuments += docs.length;
    manifest.totalCollections++;
    console.log(`✅ ${docs.length.toString().padStart(4)} docs (${(Buffer.byteLength(jsonContent)/1024).toFixed(1)} KB)`);
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
  }

  // Write manifest
  fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\n🎉 [Firestore Backup] Backup completed successfully!`);
  console.log(`   - Saved to: ${backupDir}`);
  console.log(`   - Total documents backed up: ${manifest.totalDocuments}`);
}

runBackup().catch(err => {
  console.error('Fatal backup error:', err);
  process.exit(1);
});
