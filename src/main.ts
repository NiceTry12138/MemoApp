import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import { TaskManager } from './core/TaskManager';
import { ClipboardManager } from './core/ClipboardManager';
import { SettingsManager } from './core/SettingsManager';
import { AppStore } from './persistence/AppStore';

// Single import registers all task types with TaskRegistry (see src/tasks/index.ts to add new ones)
import './tasks';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;  // 标记是否真正退出（区分关闭窗口 vs 退出应用）

// Single AppStore — tasks and settings persisted together in app_data.json.
// Swap the backend by passing a different IRepository<IAppModel> to AppStore().
const appStore = new AppStore();
const taskManager = new TaskManager(appStore);
const settingsManager = new SettingsManager(appStore);
const clipboardManager = new ClipboardManager();

// --- 生成托盘图标 ---
function createTrayIcon(): Electron.NativeImage {
    // 使用项目自带图标文件
    const iconPath = path.join(__dirname, '../src/assets/tray.png');
    return nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
}

// --- 创建系统托盘 ---
function createTray(): void {
    const icon = createTrayIcon();
    tray = new Tray(icon);
    tray.setToolTip('任务调度器');

    // 右键托盘图标弹出菜单
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '📋 显示主窗口',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        {
            label: '🔲 迷你模式',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.setSize(240, 500, true);
                    mainWindow.setAlwaysOnTop(true, 'screen-saver');
                    mainWindow.webContents.send('enter-mini-mode');
                }
            }
        },
        { type: 'separator' },
        {
            label: '❌ 退出',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);

    // 双击托盘图标 → 恢复窗口
    tray.on('double-click', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

// --- 创建主窗口 ---
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    mainWindow.setMenu(null);
    mainWindow.loadFile(path.join(__dirname, '../src/ui/index.html'));

    // mainWindow.webContents.openDevTools();

    // 拦截窗口关闭事件：根据设置决定是退出还是隐藏到托盘
    mainWindow.on('close', (event) => {
        if (isQuitting) return; // app.quit() 触发的，直接放行
        const { closeAction } = settingsManager.load();
        if (closeAction === 'tray') {
            event.preventDefault();
            mainWindow?.hide();
        } else {
            // 'quit' ：直接退出
            isQuitting = true;
            app.quit();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Start clipboard monitoring
    clipboardManager.startMonitoring(500);
}

app.on('ready', () => {
    createWindow();
    createTray();
});

app.on('window-all-closed', () => {
    // 不自动退出，让应用驻留在托盘
    // macOS 本身就不会在关闭所有窗口时退出
});

// macOS: 点击 Dock 图标时恢复窗口
app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    } else {
        mainWindow.show();
    }
});

// 应用退出前清理
app.on('before-quit', () => {
    isQuitting = true;
    clipboardManager.stopMonitoring();
});

// === IPC Handlers ===

ipcMain.handle('get-tasks', async () => {
    return taskManager.getAllTasks();
});

ipcMain.handle('create-task', async (event: IpcMainInvokeEvent, type: string, config: any) => {
    try {
        const id = taskManager.createTask(type, config);
        return { success: true, id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('toggle-mini-mode', async (event: IpcMainInvokeEvent, isMini: boolean) => {
    if (!mainWindow) return;
    if (isMini) {
        if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false);
        mainWindow.setSize(240, 500, true);
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
    } else {
        mainWindow.setSize(1000, 800, true);
        mainWindow.setAlwaysOnTop(false);
        mainWindow.center();
    }
});

ipcMain.handle('update-task', async (event: IpcMainInvokeEvent, id: string, type: string, config: any) => {
    try {
        const success = taskManager.updateTask(id, type, config);
        return { success };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('start-task', async (event: IpcMainInvokeEvent, id: string) => {
    return taskManager.startTask(id);
});

ipcMain.handle('stop-task', async (event: IpcMainInvokeEvent, id: string) => {
    return taskManager.stopTask(id);
});

ipcMain.handle('delete-task', async (event: IpcMainInvokeEvent, id: string) => {
    return taskManager.deleteTask(id);
});

// --- Clipboard IPC Handlers ---

ipcMain.handle('get-clipboard-history', async () => {
    return clipboardManager.getHistory();
});

ipcMain.handle('clipboard-copy', async (event: IpcMainInvokeEvent, id: string) => {
    return clipboardManager.copyToClipboard(id);
});

ipcMain.handle('clipboard-delete', async (event: IpcMainInvokeEvent, id: string) => {
    return clipboardManager.deleteEntry(id);
});

ipcMain.handle('clipboard-clear', async () => {
    clipboardManager.clearHistory();
    return true;
});

// --- Settings IPC Handlers ---

ipcMain.handle('get-settings', async () => {
    return settingsManager.load();
});

ipcMain.handle('save-settings', async (event: IpcMainInvokeEvent, settings: any) => {
    settingsManager.save(settings);
    return true;
});
