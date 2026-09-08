import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Cross-platform directory recursive copy function.
 * Avoids Node 24 fs.cpSync issues with non-ASCII paths on Windows.
 */
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('🚀 [1/5] Building apps/main...');
execSync('npm run build', {
  cwd: path.join(rootDir, 'apps', 'main'),
  stdio: 'inherit'
});

console.log('🧹 [2/5] Preparing public directory...');
const publicDir = path.join(rootDir, 'public');
if (fs.existsSync(publicDir)) {
  fs.rmSync(publicDir, { recursive: true, force: true });
}
fs.mkdirSync(publicDir, { recursive: true });

console.log('📦 [3/5] Copying apps/main/dist to public/...');
const mainDistDir = path.join(rootDir, 'apps', 'main', 'dist');
if (!fs.existsSync(mainDistDir)) {
  throw new Error(`Expected build output at ${mainDistDir}, but it does not exist.`);
}
copyDirRecursive(mainDistDir, publicDir);

console.log('📝 Copying sub-apps to public/...');
const appsDir = path.join(rootDir, 'apps');
const appEntries = fs.readdirSync(appsDir, { withFileTypes: true });

for (const entry of appEntries) {
  if (entry.name === 'main' || entry.name.startsWith('.')) continue;

  const appPath = path.join(appsDir, entry.name);
  if (entry.isDirectory()) {
    // If it's a category folder like forms/ or manage/, copy its subdirectories
    if (entry.name === 'forms' || entry.name === 'manage') {
      const subEntries = fs.readdirSync(appPath, { withFileTypes: true });
      for (const sub of subEntries) {
        if (sub.isDirectory()) {
          const src = path.join(appPath, sub.name);
          const dest = path.join(publicDir, entry.name, sub.name);
          console.log(`  -> Copying ${entry.name}/${sub.name} to public/${entry.name}/${sub.name}`);
          copyDirRecursive(src, dest);
        }
      }
    } else {
      // Standalone app/page directly under apps/ (e.g. apps/mashabim)
      const dest = path.join(publicDir, entry.name);
      console.log(`  -> Copying ${entry.name} to public/${entry.name}`);
      copyDirRecursive(appPath, dest);
    }
  }
}

console.log('✨ Build & aggregation completed successfully! Ready for Firebase Hosting.');

