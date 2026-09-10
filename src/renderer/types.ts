import type { StoredRecord, TaskCategory } from '../main/storage';
import type { AppCommand } from '../main/launchCommands';
export type { TaskCategory };
export type { AppCommand };
export type RecordStatus = 'open' | 'completed';
export type GsdRecord = Omit<StoredRecord, 'revision'> & { revision?: string };
export interface Snapshot { records: GsdRecord[]; issues: string[] }
export interface GsdApi {
  list(): Promise<Snapshot>;
  read(id: string): Promise<GsdRecord>;
  save(record: GsdRecord): Promise<{ record: GsdRecord; conflict: boolean }>;
  search(query: string): Promise<GsdRecord[]>;
  today(): Promise<GsdRecord>;
  trash(id: string, revision?: string): Promise<string>;
  openDataFolder(): Promise<string>;
  onCommand(callback: (command: AppCommand) => void): () => void;
  onChanged(callback: () => void): () => void;
  onBeforeClose(callback: () => Promise<boolean>): () => void;
}
declare global { interface Window { gsd: GsdApi } }
