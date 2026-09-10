import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { Storage, type RecordInput, type TaskCategory } from '../src/main/storage';

async function main() {
  const root = process.env.GSD_DATA_ROOT ?? path.join(process.env.LOCALAPPDATA!, 'Getting Stuff Done');
  const storage = new Storage(path.join(root, 'data'));
  await storage.initialize();
  const marker = path.join(storage.dataDirectory, '.seed-v1.json');
  try { await access(marker); console.log('Seed already provisioned; no changes.'); return; } catch {}
  const source = JSON.parse(await readFile(path.resolve('.local/seed.json'), 'utf8'));
  const categories: Record<string, TaskCategory> = { Personal:'personal', 'Work (urgent)':'work-urgent', 'Work (thoughts)':'work-thoughts' };
  const records: RecordInput[] = source.tasks.map((task: any, index: number) => ({ id:'initial-' + String(index + 1).padStart(2,'0'), type:'task', title:task.title, category:categories[task.category], waitingOn:task.waitingOn }));
  await storage.seed(records);
  await writeFile(marker, JSON.stringify({ version:1, count:records.length, date:new Date().toISOString() }));
  console.log('Provisioned ' + records.length + ' tasks in ' + storage.dataDirectory);
}
main().catch(error => { console.error(error); process.exit(1); });
