// 心流花园 - 便携版构建脚本
// 手动打包为无需安装的便携应用

const asar = require('asar');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist', 'MindGarden-win32-x64');

// 不需要打包到 asar 中的目录（仅开发时需要）
const SKIP_DIRS = new Set([
  'node_modules/electron',
  'node_modules/electron-builder',
  'node_modules/@electron',
  'node_modules/asar',
  'node_modules/7zip-bin',
  'node_modules/app-builder-bin',
  'node_modules/app-builder-lib',
  'node_modules/builder-util',
  'node_modules/builder-util-runtime',
  'node_modules/dmg-builder',
  'node_modules/electron-publish',
  'node_modules/read-config-file',
  'node_modules/lazy-val',
  'node_modules/temp-file',
  'node_modules/.bin',
  'node_modules/.cache',
  'node_modules/@malept',
  'node_modules/@develar',
  'node_modules/@types',
  'node_modules/@szmarczak',
  'node_modules/@sindresorhus',
  'node_modules/@electron',
  'node_modules/cross-spawn',
  'node_modules/ci-info',
  'node_modules/is-ci',
  'node_modules/global-agent',
  'node_modules/roarr',
  'node_modules/semver',
  'node_modules/serialize-error',
  'node_modules/matcher',
  'node_modules/env-paths',
  'node_modules/config-file-ts',
  'node_modules/simple-update-notifier',
  'node_modules/sumchecker',
  'node_modules/extract-zip',
  'node_modules/plist',
  'node_modules/smart-buffer',
  'node_modules/@xmldom',
  'node_modules/isbinaryfile',
  'node_modules/js-yaml',
  'node_modules/argparse',
  'node_modules/sprintf-js',
  'node_modules/json5',
  'node_modules/jsonfile',
  'node_modules/universalify',
  'node_modules/fs-extra',
  'node_modules/graceful-fs',
  'node_modules/stat-mode',
  'node_modules/safer-buffer',
  'node_modules/base64-js',
  'node_modules/ieee754',
  'node_modules/yargs',
  'node_modules/cliui',
  'node_modules/y18n',
  'node_modules/emoji-regex',
  'node_modules/escalade',
  'node_modules/get-caller-file',
  'node_modules/require-directory',
  'node_modules/string-width',
  'node_modules/strip-ansi',
  'node_modules/wrap-ansi',
  'node_modules/ansi-regex',
  'node_modules/ansi-styles',
  'node_modules/color-convert',
  'node_modules/color-name',
  'node_modules/hosted-git-info',
]);

function shouldSkip(relPath) {
  // Normalize path separators
  const normalized = relPath.replace(/\\/g, '/');

  // Also skip all top-level-only dev tools
  if (normalized.startsWith('.git/')) return true;
  if (normalized.startsWith('dist/')) return true;
  if (normalized.startsWith('scripts/')) return true;

  return SKIP_DIRS.has(normalized);
}

async function main() {
  console.log('🔨 构建便携版心流花园...\n');

  // 1. 清理并复制 Electron 运行时
  console.log('📦 清理旧版本...');
  try { fs.rmSync(DIST, { recursive: true, force: true }); } catch(e) {}

  const electronDist = path.join(ROOT, 'node_modules', 'electron', 'dist');
  console.log('📋 复制 Electron 运行时...');
  fs.mkdirSync(path.dirname(DIST), { recursive: true });
  fs.cpSync(electronDist, DIST, { recursive: true });
  console.log('  ✅ 已复制 ' + fs.readdirSync(DIST).length + ' 个文件/目录');

  // 2. 创建 resources 和 data 目录
  const resourcesDir = path.join(DIST, 'resources');
  fs.mkdirSync(resourcesDir, { recursive: true });
  const dataDir = path.join(resourcesDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  // 5. 构建临时目录用于打包 asar
  const tmpDir = path.join(ROOT, 'dist', '_tmp_build');
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch(e) {}
  fs.mkdirSync(tmpDir, { recursive: true });

  // 6. 复制文件到临时目录
  console.log('📁 收集应用文件...');

  // 顶级文件
  for (const f of ['main.js', 'preload.js', 'server.js', 'package.json']) {
    const src = path.join(ROOT, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(tmpDir, f));
      console.log('  ✓ ' + f);
    }
  }

  // 复制目录（过滤不需要的文件）
  for (const dir of ['src', 'public']) {
    const srcDir = path.join(ROOT, dir);
    const destDir = path.join(tmpDir, dir);
    if (fs.existsSync(srcDir)) {
      fs.cpSync(srcDir, destDir, { recursive: true });
      console.log('  ✓ ' + dir + '/');
    }
  }

  // 复制 node_modules（过滤模式）
  console.log('  📦 node_modules (过滤中...)');
  const nmSrc = path.join(ROOT, 'node_modules');
  const nmDest = path.join(tmpDir, 'node_modules');
  fs.mkdirSync(nmDest, { recursive: true });

  let copiedCount = 0;
  let skippedCount = 0;
  const topModules = fs.readdirSync(nmSrc, { withFileTypes: true });
  for (const entry of topModules) {
    const rel = 'node_modules/' + entry.name;
    if (shouldSkip(rel)) {
      skippedCount++;
      continue;
    }
    try {
      fs.cpSync(path.join(nmSrc, entry.name), path.join(nmDest, entry.name), { recursive: true });
      copiedCount++;
    } catch(e) {
      console.log('    ⚠ ' + entry.name + ': ' + e.message);
    }
  }
  console.log(`    已复制 ${copiedCount} 个模块，跳过 ${skippedCount} 个`);

  // 空 data 目录
  fs.mkdirSync(path.join(tmpDir, 'data'), { recursive: true });

  // 7. 创建 app.asar
  console.log('🗜️  打包 app.asar...');
  const asarPath = path.join(resourcesDir, 'app.asar');
  await asar.createPackage(tmpDir, asarPath);
  const stat = fs.statSync(asarPath);
  console.log('  ✅ app.asar: ' + (stat.size / 1024 / 1024).toFixed(1) + ' MB');

  // 8. 清理临时目录
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch(e) {}

  // 9. 创建启动批处理文件
  const launcherPath = path.join(DIST, '启动心流花园.bat');
  fs.writeFileSync(launcherPath, '@echo off\r\nstart "" "%~dp0心流花园.exe"\r\n', 'utf-8');

  // 10. 统计
  console.log('\n' + '='.repeat(50));
  console.log('✅ 构建完成！');
  console.log('📍 位置: ' + DIST);
  console.log('🖥️  启动: 双击 心流花园.exe 或 启动心流花园.bat');
  console.log('📦 应用大小:');
  const totalSize = getDirSize(DIST);
  console.log('   总计: ' + (totalSize / 1024 / 1024).toFixed(0) + ' MB');
}

function getDirSize(dirPath) {
  let size = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        size += getDirSize(full);
      } else {
        size += fs.statSync(full).size;
      }
    }
  } catch(e) {}
  return size;
}

main().catch(e => { console.error('❌ 构建失败:', e.message); process.exit(1); });
