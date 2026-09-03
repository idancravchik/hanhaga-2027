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

console.log('📝 [4/5] Copying apps/forms/mashabim to public/forms/mashabim/...');
const formsSrc = path.join(rootDir, 'apps', 'forms', 'mashabim');
const formsDest = path.join(publicDir, 'forms', 'mashabim');
copyDirRecursive(formsSrc, formsDest);

console.log('📊 [5/5] Copying apps/manage/mashabim to public/manage/mashabim/...');
const manageSrc = path.join(rootDir, 'apps', 'manage', 'mashabim');
const manageDest = path.join(publicDir, 'manage', 'mashabim');
copyDirRecursive(manageSrc, manageDest);

console.log('✨ Build & aggregation completed successfully! Ready for Firebase Hosting.');
