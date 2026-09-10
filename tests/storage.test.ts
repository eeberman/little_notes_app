import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { onTestFinished, test } from "vitest";
import { MalformedRecordError, MarkdownStorage, RecordConflictError, sanitizeTitleForFilename } from "../src/main/storage";

async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), "gsd-storage-"));
  let tick = 0;
  const storage = new MarkdownStorage(directory, {
    now: () => new Date(2026, 8, 9, 10, 0, tick++),
    id: () => `generated-${tick}`,
  });
  return { directory, storage };
}

test("task lifecycle, category, waiting-on, search, restart and recovery", async () => {
  const { directory, storage } = await fixture();
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  const created = await storage.save({ type: "task", title: "Monthly dashboard", body: "Ship metrics", category: "work-urgent", waitingOn: "Casey" });
  assert.equal((await storage.search("casey metrics"))[0].id, created.id);
  const completed = await storage.save({ ...created, category: "work-thoughts", status: "completed" }, { expectedRevision: created.revision });
  assert.equal(completed.status, "completed");
  assert.equal(completed.category, "work-thoughts");
  assert.equal((await new MarkdownStorage(directory).read(created.id)).waitingOn, "Casey");
  const recovery = await readFile(path.join(directory, "recovery", `${created.id}.md`), "utf8");
  assert.match(recovery, /status: "open"/);
});

test("seed is idempotent and never overwrites edits", async () => {
  const { directory, storage } = await fixture();
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  const seed = [{ id: "seed-1", type: "task" as const, title: "Original", category: "personal" as const }];
  const [created] = await storage.seed(seed);
  await storage.save({ ...created, title: "Edited" }, { expectedRevision: created.revision });
  assert.equal((await storage.seed(seed))[0].title, "Edited");
  assert.equal((await storage.list()).length, 1);
});

test("today reuses a local-date daily note and rolls over", async () => {
  const { directory, storage } = await fixture();
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  const first = await storage.today(new Date(2026, 8, 9, 23, 59));
  const same = await storage.today(new Date(2026, 8, 9, 1, 0));
  const next = await storage.today(new Date(2026, 8, 10, 0, 1));
  assert.equal(first.id, same.id);
  assert.notEqual(first.id, next.id);
  assert.equal((await storage.list()).length, 0, "opening a blank daily page does not persist it");
  const saved = await storage.save({ ...first, body: "A real entry" });
  assert.equal((await storage.today(new Date(2026, 8, 9, 12, 0))).revision, saved.revision);
});

test("external changes produce a conflict containing the disk version", async () => {
  const { directory, storage } = await fixture();
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  const clean = await storage.save({ type: "note", title: "Draft", body: "local" });
  const disk = await storage.save({ ...clean, body: "external" }, { expectedRevision: clean.revision });
  await assert.rejects(
    storage.save({ ...clean, body: "dirty editor" }, { expectedRevision: clean.revision }),
    (error: unknown) => error instanceof RecordConflictError && error.current.revision === disk.revision,
  );
  assert.equal((await storage.read(clean.id)).body, "external");
});

test("concurrent saves from the same revision allow one writer and reject the stale writer", async () => {
  const { directory, storage } = await fixture();
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  const clean = await storage.save({ type: "note", title: "Shared draft", body: "original" });
  const results = await Promise.allSettled([
    storage.save({ ...clean, body: "first" }, { expectedRevision: clean.revision }),
    storage.save({ ...clean, body: "second" }, { expectedRevision: clean.revision }),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const rejected = results.find((result) => result.status === "rejected");
  assert.ok(rejected?.status === "rejected" && rejected.reason instanceof RecordConflictError);
  assert.equal((await storage.read(clean.id)).body, "first");
});

test("failed replacement leaves the original readable and permits retry", async () => {
  const { directory, storage } = await fixture();
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  const original = await storage.save({ type: "note", title: "Resilient", body: "safe" });
  let fail = true;
  const faulting = new MarkdownStorage(directory, { beforeCommit: async () => { if (fail) throw new Error("disk full"); } });
  await assert.rejects(faulting.save({ ...original, body: "dirty" }, { expectedRevision: original.revision }), /disk full/);
  assert.equal((await storage.read(original.id)).body, "safe");
  fail = false;
  const retried = await faulting.save({ ...original, body: "dirty" }, { expectedRevision: original.revision });
  assert.equal(retried.body, "dirty");
});

test("malformed metadata is surfaced and not overwritten", async () => {
  const { directory, storage } = await fixture();
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  await storage.initialize();
  const target = path.join(directory, "records", "broken.md");
  await writeFile(target, "---\nid: nope\n---\nbody", "utf8");
  assert.deepEqual(await storage.list(), []);
  assert.equal(storage.getIssues()[0].error instanceof MalformedRecordError, true);
  await assert.rejects(storage.save({ id: "broken", type: "note", title: "Replacement" }), MalformedRecordError);
  assert.equal(await readFile(target, "utf8"), "---\nid: nope\n---\nbody");
});

test("common YAML scalars load, but a metadata id cannot impersonate its filename", async () => {
  const { directory, storage } = await fixture();
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  await storage.initialize();
  await writeFile(path.join(directory, "records", "manual.md"), `---\nid: manual\ntype: task\ntitle: Manually edited\ncreatedAt: 2026-09-09T10:00:00Z\nupdatedAt: 2026-09-09T10:00:00Z\ncategory: personal\nstatus: open\nwaitingOn: 'Sam''s reply'\n---\nReadable YAML`, "utf8");
  assert.equal((await storage.read("manual")).waitingOn, "Sam's reply");
  await writeFile(path.join(directory, "records", "wrong.md"), `---\nid: another\ntype: note\ntitle: Wrong identity\ncreatedAt: 2026-09-09T10:00:00Z\nupdatedAt: 2026-09-09T10:00:00Z\n---\nbody`, "utf8");
  await assert.rejects(storage.read("wrong"), /does not match filename/);
});

test("trash preserves content and Windows-invalid titles are made safe", async () => {
  const { directory, storage } = await fixture();
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  const note = await storage.save({ type: "note", title: "CON: Q?", body: "keep me" });
  const trashPath = await storage.trash(note.id, note.revision);
  assert.match(await readFile(trashPath, "utf8"), /keep me/);
  assert.equal(sanitizeTitleForFilename("CON"), "_CON");
  assert.equal(sanitizeTitleForFilename("bad<>:\"/\\|?* ."), "bad---------");
});
