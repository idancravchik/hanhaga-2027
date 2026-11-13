#!/usr/bin/env node
/**
 * scripts/verify-backup.mjs
 * Disaster Recovery & Backup Integrity Verification
 *
 * Inspects a generated backup directory in `backups/`, parses manifest.json,
 * validates JSON syntax, non-empty file sizes, and matching document counts.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const backupsDir = path.join(rootDir, 'backups');

const targetDirName = process.argv[2];

function findLatestBackup() {
  if (!fs.existsSync(backupsDir)) {
    return null;
  }
  const entries = fs.readdirSync(backupsDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.startsWith('backup-'))
    .map(d => d.name)
    .sort()
    .reverse();
  return entries.length > 0 ? path.join(backupsDir, entries[0]) : null;
}

const targetPath = targetDirName 
  ? (path.isAbsolute(targetDirName) ? targetDirName : path.join(backupsDir, targetDirName))
  : findLatestBackup();

if (!targetPath || !fs.existsSync(targetPath)) {
  console.error(`❌ [VERIFY] Target backup directory not found: ${targetPath || 'none'}`);
  process.exit(1);
}

console.log(`🔍 [VERIFY] Inspecting backup: ${targetPath}`);

const manifestPath = path.join(targetPath, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error(`❌ [VERIFY] Missing manifest.json in ${targetPath}`);
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (e) {
  console.error(`❌ [VERIFY] Failed to parse manifest.json:`, e);
  process.exit(1);
}

console.log(`📋 [VERIFY] Manifest info:`);
console.log(`   - Project: ${manifest.projectId}`);
console.log(`   - Timestamp: ${manifest.timestamp}`);
console.log(`   - Total Collections: ${manifest.totalCollections}`);
console.log(`   - Total Documents: ${manifest.totalDocuments}`);

let errors = 0;

for (const [colName, stats] of Object.entries(manifest.collections || {})) {
  const filePath = path.join(targetPath, stats.file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ [VERIFY] Collection file missing: ${stats.file}`);
    errors++;
    continue;
  }

  const stat = fs.statSync(filePath);
  if (stat.size === 0) {
    console.error(`❌ [VERIFY] Collection file is empty (0 bytes): ${stats.file}`);
    errors++;
    continue;
  }

  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(content)) {
      console.error(`❌ [VERIFY] Collection ${colName} is not an array.`);
      errors++;
      continue;
    }

    if (content.length !== stats.count) {
      console.error(`❌ [VERIFY] Count mismatch in ${colName}: manifest says ${stats.count}, file has ${content.length}`);
      errors++;
    } else {
      console.log(`  ✅ ${colName.padEnd(20)}: ${content.length.toString().padStart(4)} docs (${(stat.size / 1024).toFixed(1)} KB) - VALID`);
    }
  } catch (err) {
    console.error(`❌ [VERIFY] Failed to parse JSON in ${stats.file}:`, err.message);
    errors++;
  }
}

if (errors > 0) {
  console.error(`\n❌ [VERIFY] Verification failed with ${errors} error(s)!`);
  process.exit(1);
} else {
  console.log(`\n🎉 [VERIFY] Backup integrity 100% verified! All collections and documents are intact.`);
  process.exit(0);
}
