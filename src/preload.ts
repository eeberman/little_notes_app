import { contextBridge, ipcRenderer } from 'electron';
import type { GsdApi } from './renderer/types';
const api: GsdApi = {
  list: () => ipcRenderer.invoke('records:list'),
  read: id => ipcRenderer.invoke('records:read', id),
  save: record => ipcRenderer.invoke('records:save', record),
  search: query => ipcRenderer.invoke('records:search', query),
  today: () => ipcRenderer.invoke('records:today'),
  trash: (id, revision) => ipcRenderer.invoke('records:trash', id, revision),
  openDataFolder: () => ipcRenderer.invoke('data:open'),
  onCommand: callback => {
    const handler = (_event: Electron.IpcRendererEvent, command: Parameters<typeof callback>[0]) => callback(command);
    ipcRenderer.on('app:command', handler);
    ipcRenderer.send('app:commands-ready');
    return () => { ipcRenderer.removeListener('app:command', handler); };
  },
  onChanged: callback => {
    const handler = () => callback();
    ipcRenderer.on('records:changed', handler);
    return () => { ipcRenderer.removeListener('records:changed', handler); };
  },
  onBeforeClose: callback => {
    const handler = async () => {
      try { ipcRenderer.send('app:close-ready', await callback()); }
      catch { ipcRenderer.send('app:close-ready', false); }
    };
    ipcRenderer.on('app:before-close', handler);
    return () => { ipcRenderer.removeListener('app:before-close', handler); };
  }
};
contextBridge.exposeInMainWorld('gsd', api);
