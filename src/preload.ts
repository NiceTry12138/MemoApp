import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    getTasks: () => ipcRenderer.invoke('get-tasks'),
    createTask: (type: string, config: any) => ipcRenderer.invoke('create-task', type, config),
    updateTask: (id: string, type: string, config: any) => ipcRenderer.invoke('update-task', id, type, config),
    toggleMiniMode: (isMini: boolean) => ipcRenderer.invoke('toggle-mini-mode', isMini),
    startTask: (id: string) => ipcRenderer.invoke('start-task', id),
    stopTask: (id: string) => ipcRenderer.invoke('stop-task', id),
    deleteTask: (id: string) => ipcRenderer.invoke('delete-task', id),
});
