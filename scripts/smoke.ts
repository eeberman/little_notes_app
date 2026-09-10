import { _electron as electron, expect } from '@playwright/test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Storage } from '../src/main/storage';
let activeApp: Awaited<ReturnType<typeof electron.launch>> | undefined;

async function main() {
  const root = await mkdtemp(path.resolve('.local/smoke-'));
  const storage = new Storage(path.join(root, 'data'));
  await storage.seed([
    { id:'test-personal', type:'task', title:'Plan a weekend walk', category:'personal' },
    { id:'test-work', type:'task', title:'Monthly dashboard', category:'work-urgent', waitingOn:'Casey: persona names' }
  ]);
  const executablePath = path.resolve('out-1.0.4/Getting Stuff Done-win32-x64/Getting Stuff Done.exe');
  const env: Record<string, string> = { ...Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)), GSD_DATA_ROOT: root };
  delete env.ELECTRON_RUN_AS_NODE;
  let app = await electron.launch({ executablePath, env });
  activeApp = app;
  let page = await app.firstWindow();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.context().setOffline(true);
  await expect(page.getByRole('heading', { name:'All Notes', exact:true })).toBeVisible();
  await page.getByRole('button', { name:/Personal/ }).click();
  await expect(page.getByLabel('Title', { exact:true })).toHaveValue('Plan a weekend walk');
  await page.keyboard.press('Control+k');
  await expect(page.getByPlaceholder('Search everything')).toBeFocused();
  await page.getByPlaceholder('Search everything').fill('Casey');
  await expect(page.getByLabel('Title', { exact:true })).toHaveValue('Monthly dashboard');
  await page.locator('.complete-button').click();
  await expect(page.locator('.complete-button')).toContainText('Reopen');
  await page.locator('.complete-button').click();
  await page.locator('select').selectOption('work-thoughts');
  await expect.poll(async () => (await storage.read('test-work')).category).toBe('work-thoughts');
  await page.keyboard.press('Control+n');
  await page.getByLabel('Title', { exact:true }).fill('First note: <>?');
  await page.getByLabel('Body', { exact:true }).fill('First draft survives switching');
  await page.keyboard.press('Control+n');
  await page.getByLabel('Title', { exact:true }).fill('Second note');
  await page.getByLabel('Body', { exact:true }).fill('Second draft survives immediate close');
  // Close before the debounce expires to exercise the actual close handshake.
  const closed = app.waitForEvent('close');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await closed;
  app = await electron.launch({ executablePath, env });
  activeApp = app;
  page = await app.firstWindow();
  page.on('pageerror', error => errors.push(error.message));
  await page.context().setOffline(true);
  await expect(page.getByPlaceholder('Search everything')).toBeVisible();
  await expect(page.getByRole('heading', { name:'All Notes', exact:true })).toBeVisible();
  const saved = await storage.list();
  expect(saved.find(record => record.title === 'First note: <>?')?.body).toBe('First draft survives switching');
  expect(saved.find(record => record.title === 'Second note')?.body).toBe('Second draft survives immediate close');
  await page.keyboard.press('Control+n');
  await page.getByRole('button', { name:/Personal/ }).click();
  await page.waitForTimeout(700);
  expect.soft((await storage.list()).some(record => record.type === 'note' && record.title === 'Untitled' && record.body === '')).toBe(false);
  await page.getByRole('button', { name:/Daily Notes/ }).click();
  await page.getByRole('button', { name:'New daily note' }).click();
  const now = new Date();
  const expectedDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  await expect.soft(page.getByLabel('Title', { exact:true })).toHaveValue(expectedDay);
  const openedDirectory = await page.evaluate(() => window.gsd.openDataFolder());
  expect.soft(path.basename(openedDirectory)).toBe('records');
  await page.keyboard.press('Control+Shift+d');
  await page.getByLabel('Body', { exact:true }).fill('Daily log saved offline');
  await expect.poll(async () => (await storage.today()).body).toBe('Daily log saved offline');
  await page.keyboard.press('Control+Shift+d');
  await expect(page.getByLabel('Body', { exact:true })).toHaveValue('Daily log saved offline');
  const daily = await storage.today();
  await storage.save({ ...daily, body:'External clean edit' }, { expectedRevision:daily.revision });
  await expect(page.getByLabel('Body', { exact:true })).toHaveValue('External clean edit');
  await page.getByLabel('Body', { exact:true }).fill('Local conflicting draft');
  const disk = await storage.today();
  await storage.save({ ...disk, body:'External competing draft' }, { expectedRevision:disk.revision });
  await expect.poll(async () => (await storage.list()).some(record => record.title.includes('conflict copy') && record.body === 'Local conflicting draft')).toBe(true);
  expect((await storage.today()).body).toBe('External competing draft');
  await writeFile(path.join(storage.recordsDirectory, 'broken.md'), 'Malformed synthetic note');
  await expect(page.getByRole('button').filter({ hasText:'Malformed record' })).toBeVisible();
  await page.getByRole('button', { name:/All Notes/ }).click();
  await page.screenshot({ path:path.join(root, 'packaged-app.png') });
  expect(await page.evaluate(() => typeof (window as any).require)).toBe('undefined');
  expect(errors).toEqual([]);
  await app.close();
  await writeFile(path.join(root, 'result.json'), JSON.stringify({ passed:true, executablePath, scenarios:['offline launch','global search','task completion/reopen/category','Ctrl+K/N/Shift+D','multiple pending drafts','close flush','restart persistence','daily reuse','external reload','conflict preservation','malformed-file report','isolated renderer'], screenshot:path.join(root,'packaged-app.png') }, null, 2));
  console.log('PASS packaged smoke; evidence: ' + root);
}
main().catch(async error => {
  console.error(error);
  if (activeApp) {
    await activeApp.windows()[0]?.screenshot({ path:path.resolve('.local/smoke-failure.png') }).catch(() => {});
    await activeApp.close().catch(() => {});
  }
  process.exit(1);
});
