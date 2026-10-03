import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const APP_ID = 'hanhaga-2027';
const VALID_TIERS = ['attendance_rw', 'read_all', 'full_rw'];

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

function hashKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
}

async function firestoreRest(pathStr, method = 'GET', body = null) {
  const token = getAccessToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `https://firestore.googleapis.com/v1/projects/${APP_ID}/databases/(default)/documents/${pathStr}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Firestore REST error (${res.status}): ${txt}`);
  }

  return res.json();
}

async function createKey(name, tier) {
  if (!VALID_TIERS.includes(tier)) {
    console.error(`❌ Invalid tier: '${tier}'. Must be one of: ${VALID_TIERS.join(', ')}`);
    process.exit(1);
  }

  const rawSecret = crypto.randomBytes(24).toString('base64url');
  const rawApiKey = `hng_live_${rawSecret}`;
  const keyHash = hashKey(rawApiKey);
  const now = new Date().toISOString();

  const docData = {
    fields: {
      keyHash: { stringValue: keyHash },
      name: { stringValue: name },
      tier: { stringValue: tier },
      isActive: { booleanValue: true },
      createdAt: { timestampValue: now },
      keyPrefix: { stringValue: rawApiKey.slice(0, 14) + '...' }
    }
  };

  await firestoreRest(`system_api_keys/${keyHash}`, 'PATCH', docData);

  console.log('\n============================================================');
  console.log('🔑 NEW API KEY GENERATED SUCCESSFULLY');
  console.log('============================================================');
  console.log(`Name:        ${name}`);
  console.log(`Tier:        ${tier}`);
  console.log(`API Key:     ${rawApiKey}`);
  console.log('------------------------------------------------------------');
  console.log('⚠️  Store this key securely! It will NOT be shown again.');
  console.log(`Header:      X-API-Key: ${rawApiKey}`);
  console.log('============================================================\n');
}

async function listKeys() {
  console.log(`\n📋 Listing API Keys for project: ${APP_ID}...`);
  try {
    const data = await firestoreRest(`system_api_keys`);
    const docs = data.documents || [];
    if (docs.length === 0) {
      console.log('No API keys found.');
      return;
    }

    console.table(
      docs.map((d) => {
        const f = d.fields || {};
        return {
          Name: f.name?.stringValue,
          Tier: f.tier?.stringValue,
          Active: f.isActive?.booleanValue,
          Prefix: f.keyPrefix?.stringValue || 'hng_live_...',
          Created: f.createdAt?.timestampValue?.split('T')[0]
        };
      })
    );
  } catch (e) {
    console.error('Failed to list keys:', e.message);
  }
}

async function revokeKey(keyHash) {
  console.log(`Revoking key hash: ${keyHash}...`);
  const patchData = {
    fields: {
      isActive: { booleanValue: false }
    }
  };
  await firestoreRest(`system_api_keys/${keyHash}?updateMask.fieldPaths=isActive`, 'PATCH', patchData);
  console.log('✅ Key revoked successfully.');
}

const [cmd, arg1, arg2] = process.argv.slice(2);

switch (cmd) {
  case 'create':
    if (!arg1 || !arg2) {
      console.log('Usage: node scripts/manage-api-keys.mjs create "<name>" <tier>');
      console.log(`Available tiers: ${VALID_TIERS.join(', ')}`);
      process.exit(1);
    }
    createKey(arg1, arg2);
    break;
  case 'list':
    listKeys();
    break;
  case 'revoke':
    if (!arg1) {
      console.log('Usage: node scripts/manage-api-keys.mjs revoke <keyHash>');
      process.exit(1);
    }
    revokeKey(arg1);
    break;
  default:
    console.log(`
Hanhaga API Key Manager
-----------------------
Commands:
  node scripts/manage-api-keys.mjs create "<name>" <tier>
      Tiers:
        attendance_rw   - Field scanners, attendance mark/read
        read_all        - Read-only access to all resources
        full_rw         - Full read and write access

  node scripts/manage-api-keys.mjs list
  node scripts/manage-api-keys.mjs revoke <keyHash>
    `);
}
