// 心流花园 - Electron 桌面应用主进程
// 将 Web 应用封装为原生桌面体验

const { app, BrowserWindow, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const { fork } = require('child_process');

// 保持对窗口和服务器进程的全局引用
let mainWindow = null;
let serverProcess = null;
let tray = null;
const SERVER_PORT = 3000;
const isDev = process.argv.includes('--dev');

function createTrayIcon() {
  // 创建一个简单的16x16托盘图标（绿色圆点）
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  // Windows上托盘图标需要实际图标文件，这里用简单的处理
  // 实际部署时使用 .ico 文件
}

function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, 'server.js');

    // 确定数据目录（可写）
    // 开发模式：项目根目录的 data/
    // 打包模式：app.getPath('userData') 或 resources/data/
    let dataPath;
    if (app.isPackaged) {
      // 打包后：使用 resources/data/ (由 extraResources 复制)
      dataPath = path.join(process.resourcesPath, 'data');
    } else {
      // 开发中：使用项目 data/
      dataPath = path.join(__dirname, 'data');
    }

    serverProcess = fork(serverPath, [], {
      env: {
        ...process.env,
        ELECTRON_MODE: 'true',
        DB_PATH: path.join(dataPath, 'garden.db'),
      },
      silent: true,
    });

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      if (isDev) console.log('[Server]', msg);
      // 服务器启动后会自动监听端口
    });

    serverProcess.stderr.on('data', (data) => {
      if (isDev) console.error('[Server Error]', data.toString());
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start server:', err);
      reject(err);
    });

    serverProcess.on('exit', (code) => {
      if (code !== 0 && !serverProcess.__killed) {
        console.error(`Server exited with code ${code}`);
      }
    });

    // 给服务器一些时间启动
    setTimeout(resolve, 1500);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    title: '心流花园 · Mind Garden',
    icon: path.join(__dirname, 'public', 'icon.png'),
    backgroundColor: '#080816',
    show: false, // 等加载完成再显示，避免白屏
    frame: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // 加载应用
  const url = `http://localhost:${SERVER_PORT}`;
  mainWindow.loadURL(url);

  // 页面加载完成后显示窗口
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // 处理窗口关闭
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 在外部浏览器中打开链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ===== 应用生命周期 =====

app.whenReady().then(async () => {
  try {
    await startServer();
    createWindow();
    console.log('🌱 心流花园桌面应用已启动');
  } catch (err) {
    dialog.showErrorBox('启动失败', `无法启动心流花园服务器:\n${err.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // 关闭服务器进程
  if (serverProcess) {
    serverProcess.__killed = true;
    serverProcess.kill();
  }
  app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.__killed = true;
    serverProcess.kill();
  }
});

app.on('activate', () => {
  // macOS: 重新创建窗口
  if (mainWindow === null) {
    createWindow();
  }
});

// 防止多实例
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
