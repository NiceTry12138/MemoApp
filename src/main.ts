import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
import { TaskManager, TaskType } from './core/TaskManager';
import { ClipboardManager } from './core/ClipboardManager';

let mainWindow: BrowserWindow | null = null;
const taskManager = new TaskManager();
const clipboardManager = new ClipboardManager();

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        autoHideMenuBar: true, // Hide menu bar
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    
    // Remove the menu entirely
    mainWindow.setMenu(null);

    mainWindow.loadFile(path.join(__dirname, '../src/ui/index.html'));
    
    // Open DevTools for debugging
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Start clipboard monitoring
    clipboardManager.startMonitoring(500);
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    clipboardManager.stopMonitoring();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// IPC Handlers: Bridge between UI and Task Logic

// Get All Tasks
ipcMain.handle('get-tasks', async () => {
    return taskManager.getAllTasks();
});

// Create Task
ipcMain.handle('create-task', async (event: IpcMainInvokeEvent, type: TaskType, config: any) => {
    try {
        const id = taskManager.createTask(type, config);
        return { success: true, id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

// Toggle Mini Mode
ipcMain.handle('toggle-mini-mode', async (event: IpcMainInvokeEvent, isMini: boolean) => {
    if (!mainWindow) return;
    if (isMini) {
        if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false);
        mainWindow.setSize(240, 500, true);
        mainWindow.setAlwaysOnTop(true, 'screen-saver'); // Ensure it stays on top
    } else {
        mainWindow.setSize(1000, 800, true);
        mainWindow.setAlwaysOnTop(false);
        mainWindow.center();
    }
});

// Update Task
ipcMain.handle('update-task', async (event: IpcMainInvokeEvent, id: string, type: TaskType, config: any) => {
    try {
        const success = taskManager.updateTask(id, type, config);
        return { success };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

// Start Task
ipcMain.handle('start-task', async (event: IpcMainInvokeEvent, id: string) => {
    return taskManager.startTask(id);
});

// Stop Task
ipcMain.handle('stop-task', async (event: IpcMainInvokeEvent, id: string) => {
    return taskManager.stopTask(id);
});

// Delete Task
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
