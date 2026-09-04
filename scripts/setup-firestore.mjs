import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

async function run() {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  if (!fs.existsSync(configPath)) {
    console.error('Config not found at', configPath);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const tokens = config.tokens;
  let accessToken = tokens?.access_token;
  const refreshToken = tokens?.refresh_token;

  // Refresh token to ensure validity
  if (refreshToken) {
    console.log('🔄 Refreshing Google OAuth access token...');
    const params = new URLSearchParams({
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho85qd6.apps.googleusercontent.com',
      client_secret: '', // Public client used by firebase-tools
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (tokenRes.ok) {
      const data = await tokenRes.json();
      accessToken = data.access_token;
      console.log('✅ Access token refreshed successfully!');
    } else {
      console.warn('⚠️ Token refresh failed, using existing access token...', await tokenRes.text());
    }
  }

  // 1. Update Firestore Rules via REST API
  console.log('📜 Updating Firestore security rules via REST API...');
  const rulesContent = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    match /artifacts/{appId}/public/config {
      allow read: if true;
      allow write: if isAuthenticated();
    }
    match /artifacts/{appId}/public/data/{document=**} {
      allow read, write: if isAuthenticated();
    }
  }
}`;

  const rulesetRes = await fetch('https://firebaserules.googleapis.com/v1/projects/hanhaga-2027/rulesets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      source: {
        files: [{ name: 'firestore.rules', content: rulesContent }]
      }
    })
  });

  if (rulesetRes.ok) {
    const rulesetData = await rulesetRes.json();
    console.log('✅ Ruleset created:', rulesetData.name);
    
    // Release the ruleset to cloud.firestore
    const releaseRes = await fetch('https://firebaserules.googleapis.com/v1/projects/hanhaga-2027/releases/cloud.firestore', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        release: {
          name: 'projects/hanhaga-2027/releases/cloud.firestore',
          rulesetName: rulesetData.name
        }
      })
    });

    if (releaseRes.ok) {
      console.log('✅ Firestore rules published successfully!');
    } else {
      console.warn('⚠️ Ruleset release note:', await releaseRes.text());
    }
  } else {
    console.warn('⚠️ Ruleset creation note:', await rulesetRes.text());
  }

  // 2. Insert User Document via Firestore REST API
  console.log('👤 Writing admin user 0507117791 via Firestore REST API...');
  const docUrl = 'https://firestore.googleapis.com/v1/projects/hanhaga-2027/databases/(default)/documents/artifacts/hanhaga-2027/public/data/users?documentId=0507117791';

  const userFields = {
    fields: {
      id: { stringValue: '0507117791' },
      name: { stringValue: "עידן קרבצ'יק" },
      fullName: { stringValue: "עידן קרבצ'יק" },
      phone: { stringValue: '0507117791' },
      role: { stringValue: 'admin' },
      school: { stringValue: 'מנהלה' },
      tags: { arrayValue: { values: [] } },
      createdAt: { stringValue: new Date().toISOString() }
    }
  };

  const writeRes = await fetch(docUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userFields)
  });

  if (writeRes.ok) {
    console.log('🎉 SUCCESS! Admin user document created in Firestore!');
    const resData = await writeRes.json();
    console.log('Document path:', resData.name);
  } else {
    const errText = await writeRes.text();
    // If document already exists (ALREADY_EXISTS), patch it
    if (writeRes.status === 409) {
      console.log('ℹ️ Document already exists, updating via PATCH...');
      const patchUrl = 'https://firestore.googleapis.com/v1/projects/hanhaga-2027/databases/(default)/documents/artifacts/hanhaga-2027/public/data/users/0507117791';
      const patchRes = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userFields)
      });
      if (patchRes.ok) {
        console.log('🎉 SUCCESS! Admin user document updated in Firestore!');
      } else {
        console.error('❌ Patch failed:', await patchRes.text());
      }
    } else {
      console.error('❌ Firestore write failed:', errText);
    }
  }
}

run().catch(console.error);
