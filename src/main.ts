import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Storage, RecordConflictError, RecordNotFoundError } from './main/storage';
import { parseLaunchCommands } from './main/launchCommands';
import type { AppCommand } from './main/launchCommands';
import type { GsdRecord } from './renderer/types';

const localRoot = process.env.GSD_DATA_ROOT ?? path.join(process.env.LOCALAPPDATA ?? app.getPath('appData'), 'Getting Stuff Done');
app.setPath('userData', localRoot);
const dataDirectory = path.join(localRoot, 'data');
const storage = new Storage(dataDirectory);
let mainWindow: BrowserWindow | null = null;
let allowClose = false;
let closePending = false;
let stopWatch: (() => void) | undefined;
let rendererCommandsReady = false;
const pendingCommands: AppCommand[] = parseLaunchCommands(process.argv);

function focusMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
}

function deliverPendingCommands() {
  if (!rendererCommandsReady || !mainWindow || mainWindow.isDestroyed()) return;
  for (const command of pendingCommands.splice(0)) mainWindow.webContents.send('app:command', command);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', (_event, commandLine) => {
    pendingCommands.push(...parseLaunchCommands(commandLine));
    focusMainWindow();
    deliverPendingCommands();
  });
  app.whenReady().then(createWindow).catch(console.error);
}
async function createWindow() {
  await storage.initialize();
  mainWindow = new BrowserWindow({
    width: 1180, height: 760, minWidth: 840, minHeight: 560,
    backgroundColor: '#f6f4ef', title: 'Getting Stuff Done',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  mainWindow.setMenu(null);
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', event => event.preventDefault());
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) await mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  else await mainWindow.loadFile(path.join(__dirname, '../renderer/' + MAIN_WINDOW_VITE_NAME + '/index.html'));
  mainWindow.on('close', event => {
    if (allowClose) return;
    event.preventDefault();
    if (!closePending) { closePending = true; mainWindow?.webContents.send('app:before-close'); }
  });
  mainWindow.on('closed', () => { stopWatch?.(); mainWindow = null; });
  stopWatch = await storage.watch(() => mainWindow?.webContents.send('records:changed'));
}
function handle(channel: string, callback: (...args: any[]) => unknown) {
  ipcMain.handle(channel, (event, ...args) => {
    if (event.sender !== mainWindow?.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) throw new Error('Invalid sender');
    return callback(...args);
  });
}
handle('records:list', async () => ({ records: await storage.list(), issues: storage.getIssues().map(issue => issue.error.message) }));
handle('records:read', (id: string) => storage.read(id));
handle('records:search', (query: string) => { if (typeof query !== 'string') throw new Error('Invalid query'); return storage.search(query); });
handle('records:save', async (input: GsdRecord) => {
  const { revision, ...record } = input;
  try { return { record: await storage.save(record, revision ? { expectedRevision: revision } : {}), conflict: false }; }
  catch (error) {
    if (!(error instanceof RecordConflictError || (revision && error instanceof RecordNotFoundError))) throw error;
    const copy = await storage.save({ id: randomUUID(), type: 'note', title: record.title + ' (conflict copy)',
      body: record.type === 'task' ? 'Category: ' + record.category + '\nStatus: ' + record.status + '\nWaiting on: ' + (record.waitingOn ?? '') + '\n\n' + record.body : record.body });
    return { record: copy, conflict: true };
  }
});
handle('records:trash', (id: string, revision?: string) => storage.trash(id, revision));
handle('records:today', () => storage.today());
handle('data:open', async () => {
  await storage.initialize();
  const error = await shell.openPath(storage.recordsDirectory);
  if (error) throw new Error(`Could not open the notes folder: ${error}`);
  return storage.recordsDirectory;
});
ipcMain.on('app:commands-ready', event => {
  if (event.sender !== mainWindow?.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) return;
  rendererCommandsReady = true;
  deliverPendingCommands();
});
ipcMain.on('app:close-ready', (event, success: boolean) => {
  if (event.sender !== mainWindow?.webContents) return;
  closePending = false;
  if (success === true) { allowClose = true; mainWindow.close(); }
});
app.on('window-all-closed', () => app.quit());
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;
