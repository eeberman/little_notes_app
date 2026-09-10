import { expect, test } from 'vitest';
import { DraftController } from '../src/renderer/controller';
import type { GsdApi, GsdRecord } from '../src/renderer/types';
const note = (id: string, body = ''): GsdRecord => ({ id, type:'note', title:id, body, createdAt:'2026-09-09T10:00:00Z', updatedAt:'2026-09-09T10:00:00Z' });
function api(save: GsdApi['save']): GsdApi {
  return { save, list:async () => ({ records:[], issues:[] }), read:async id => note(id), search:async () => [], today:async () => note('day'), trash:async () => '', openDataFolder:async () => '', onCommand:() => () => {}, onChanged:() => () => {}, onBeforeClose:() => () => {} };
}
test('writes across records and edits during an in-flight save retain the newest body', async () => {
  let release!: () => void;
  let started!: () => void;
  const start = new Promise<void>(resolve => { started = resolve; });
  const hold = new Promise<void>(resolve => { release = resolve; });
  const disk = new Map<string,GsdRecord>();
  let first = true;
  const store = new DraftController(api(async record => {
    if (first) { first = false; started(); await hold; }
    const saved = { ...record, revision:record.body };
    disk.set(record.id, saved); return { record:saved, conflict:false };
  }), () => {});
  store.edit(note('a','early'));
  const flight = store.flush('a'); await start;
  store.edit(note('a','latest')); store.edit(note('b','other record'));
  release(); await flight;
  expect(await store.flushAll()).toBe(true);
  expect(disk.get('a')?.body).toBe('latest');
  expect(disk.get('b')?.body).toBe('other record');
  expect(store.dirty.size).toBe(0);
});
test('failed close flush retains drafts and succeeds on retry', async () => {
  let fail = true;
  const store = new DraftController(api(async record => {
    if (fail) throw new Error('Disk unavailable');
    return { record:{ ...record, revision:'saved' }, conflict:false };
  }), () => {});
  store.edit(note('a','important'));
  expect(await store.flushAll()).toBe(false);
  expect(store.records.get('a')?.body).toBe('important');
  expect(store.dirty.has('a')).toBe(true);
  fail = false;
  expect(await store.flushAll()).toBe(true);
});
test('trash waits for pending save and passes the committed revision', async () => {
  const events: string[] = [];
  const bridge = api(async record => { events.push('save'); return {record:{...record,revision:'r1'},conflict:false}; });
  bridge.trash = async (_id, revision) => { events.push('trash:' + revision); return 'trash/path'; };
  const store = new DraftController(bridge, () => {});
  store.edit(note('a','retain in trash'));
  await store.trash('a');
  expect(events).toEqual(['save','trash:r1']);
  expect(store.records.size).toBe(0);
});

test('a blank unsaved note is discarded instead of persisted as Untitled', async () => {
  let saves = 0;
  const store = new DraftController(api(async record => {
    saves++;
    return { record:{ ...record, revision:'saved' }, conflict:false };
  }), () => {});
  store.edit({ ...note('blank'), title:'' });
  await store.flush('blank');
  expect(saves).toBe(0);
  expect(store.records.has('blank')).toBe(false);
});

test('leaving a pristine new note discards it without a disk operation', () => {
  const store = new DraftController(api(async record => ({ record, conflict:false })), () => {});
  store.addDraft({ ...note('blank'), title:'' });
  expect(store.discardPristine('blank')).toBe(true);
  expect(store.records.has('blank')).toBe(false);
  expect(store.dirty.size).toBe(0);
});

test('an empty initial snapshot is retried so existing notes appear', async () => {
  let calls = 0;
  const bridge = api(async () => ({ record:note('unused'), conflict:false }));
  bridge.list = async () => ({ records:++calls < 4 ? [] : [note('existing', 'still here')], issues:[] });
  const store = new DraftController(bridge, () => {});
  await store.refresh();
  await new Promise(resolve => setTimeout(resolve, 1_900));
  expect(calls).toBeGreaterThanOrEqual(4);
  expect(store.records.get('existing')?.body).toBe('still here');
});
