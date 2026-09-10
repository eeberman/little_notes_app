import { randomUUID, createHash } from "node:crypto";
import matter from 'gray-matter';
import { watch as watchDirectory, type FSWatcher } from "node:fs";
import { mkdir, open, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const TASK_CATEGORIES = ["personal", "work-urgent", "work-thoughts"] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];
export type RecordType = "task" | "note" | "daily";
export type TaskStatus = "open" | "completed";

export interface StoredRecord {
  id: string;
  type: RecordType;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  category?: TaskCategory;
  status?: TaskStatus;
  waitingOn?: string;
  revision: string;
}

export interface RecordInput {
  id?: string;
  type: RecordType;
  title: string;
  body?: string;
  createdAt?: string;
  category?: TaskCategory;
  status?: TaskStatus;
  waitingOn?: string;
}

export interface SaveOptions { expectedRevision?: string; expectedUpdatedAt?: string }
export interface StorageOptions {
  now?: () => Date;
  id?: () => string;
  /** Test/integration fault hook invoked after the durable temp write, before replacement. */
  beforeCommit?: (destination: string) => Promise<void>;
}
export interface StorageIssue { filePath: string; error: MalformedRecordError }

export class MalformedRecordError extends Error {
  constructor(public readonly filePath: string, message: string) {
    super(`Malformed record ${filePath}: ${message}`);
    this.name = "MalformedRecordError";
  }
}

export class RecordConflictError extends Error {
  constructor(public readonly current: StoredRecord) {
    super(`Record ${current.id} changed outside the editor`);
    this.name = "RecordConflictError";
  }
}

export class RecordNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Record ${id} was not found`);
    this.name = "RecordNotFoundError";
  }
}

type Metadata = Omit<StoredRecord, "body" | "revision">;
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/;
const VALID_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export class Storage {
  readonly recordsDirectory: string;
  readonly recoveryDirectory: string;
  readonly trashDirectory: string;
  private readonly now: () => Date;
  private readonly createId: () => string;
  private readonly beforeCommit?: (destination: string) => Promise<void>;
  private readonly pending = new Map<string, Promise<unknown>>();
  private issues: StorageIssue[] = [];

  constructor(readonly dataDirectory: string, options: StorageOptions = {}) {
    this.recordsDirectory = path.join(dataDirectory, "records");
    this.recoveryDirectory = path.join(dataDirectory, "recovery");
    this.trashDirectory = path.join(dataDirectory, "trash");
    this.now = options.now ?? (() => new Date());
    this.createId = options.id ?? randomUUID;
    this.beforeCommit = options.beforeCommit;
  }

  async initialize(): Promise<void> {
    await Promise.all([
      mkdir(this.recordsDirectory, { recursive: true }),
      mkdir(this.recoveryDirectory, { recursive: true }),
      mkdir(this.trashDirectory, { recursive: true }),
    ]);
  }

  async list(): Promise<StoredRecord[]> {
    await this.initialize();
    const names = (await readdir(this.recordsDirectory)).filter((name) => name.endsWith(".md"));
    const records: StoredRecord[] = [];
    const issues: StorageIssue[] = [];
    for (const name of names) {
      const filePath = path.join(this.recordsDirectory, name);
      try { records.push(await this.readFile(filePath)); }
      catch (error) {
        if (error instanceof MalformedRecordError) issues.push({ filePath, error });
        else if (!isNodeError(error, 'ENOENT')) throw error;
      }
    }
    this.issues = issues;
    return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title));
  }

  getIssues(): readonly StorageIssue[] { return this.issues; }

  async read(id: string): Promise<StoredRecord> {
    assertId(id);
    const filePath = this.filePath(id);
    try {
      return await this.readFile(filePath);
    } catch (error) {
      if (isNodeError(error, "ENOENT")) throw new RecordNotFoundError(id);
      throw error;
    }
  }

  async save(input: RecordInput, options: SaveOptions = {}): Promise<StoredRecord> {
    const id = input.id ?? (input.type === "daily" ? input.title : this.createId());
    return this.serialized(id, () => this.saveUnlocked({ ...input, id }, options));
  }

  private async saveUnlocked(input: RecordInput, options: SaveOptions): Promise<StoredRecord> {
    await this.initialize();
    validateInput(input);
    const id = input.id!;
    assertId(id);
    const destination = this.filePath(id);
    let previous: StoredRecord | undefined;
    try {
      previous = await this.readFile(destination);
    } catch (error) {
      if (!isNodeError(error, "ENOENT")) throw error;
    }
    const conflicts = (options.expectedRevision !== undefined && previous?.revision !== options.expectedRevision)
      || (options.expectedUpdatedAt !== undefined && previous?.updatedAt !== options.expectedUpdatedAt);
    if (conflicts) {
      if (previous) throw new RecordConflictError(previous);
      throw new RecordNotFoundError(id);
    }
    const now = this.now().toISOString();
    const record: StoredRecord = {
      id,
      type: input.type,
      title: input.title.trim(),
      body: input.body ?? "",
      createdAt: input.createdAt ?? previous?.createdAt ?? now,
      updatedAt: now,
      ...(input.type === "task" ? {
        category: input.category ?? previous?.category ?? "personal",
        status: input.status ?? previous?.status ?? "open",
        ...(input.waitingOn?.trim() ? { waitingOn: input.waitingOn.trim() } : {}),
      } : {}),
      revision: "",
    };
    const content = serialize(record);
    const revision = revisionFor(content);
    await atomicReplace(destination, content, previous ? path.join(this.recoveryDirectory, `${id}.md`) : undefined, this.beforeCommit);
    return { ...record, revision };
  }

  async search(query: string): Promise<StoredRecord[]> {
    const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    const records = await this.list();
    if (!terms.length) return records;
    return records.filter((record) => {
      const haystack = `${record.title}\n${record.body}\n${record.waitingOn ?? ""}`.toLocaleLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }

  async trash(id: string, expectedRevision?: string): Promise<string> {
    return this.serialized(id, () => this.trashUnlocked(id, expectedRevision));
  }

  private async trashUnlocked(id: string, expectedRevision?: string): Promise<string> {
    await this.initialize();
    const current = await this.read(id);
    if (expectedRevision !== undefined && current.revision !== expectedRevision) throw new RecordConflictError(current);
    const suffix = this.now().toISOString().replace(/[:.]/g, "-");
    const target = path.join(this.trashDirectory, `${id}.${suffix}.md`);
    await rename(this.filePath(id), target);
    return target;
  }

  async today(date = this.now()): Promise<StoredRecord> {
    const day = localDate(date);
    try {
      return await this.read(day);
    } catch (error) {
      if (!(error instanceof RecordNotFoundError)) throw error;
      const timestamp = this.now().toISOString();
      return { id: day, type: "daily", title: day, body: "", createdAt: timestamp, updatedAt: timestamp, revision: "" };
    }
  }

  async seed(inputs: readonly RecordInput[]): Promise<StoredRecord[]> {
    const results: StoredRecord[] = [];
    for (const input of inputs) {
      if (!input.id) throw new Error("Seed records require stable ids");
      try {
        results.push(await this.read(input.id));
      } catch (error) {
        if (!(error instanceof RecordNotFoundError)) throw error;
        results.push(await this.save(input));
      }
    }
    return results;
  }

  async watch(callback: () => void): Promise<() => void> {
    await this.initialize();
    let timer: NodeJS.Timeout | undefined;
    const watcher: FSWatcher = watchDirectory(this.recordsDirectory, { persistent: false }, (_event, filename) => {
      if (filename && !filename.endsWith(".md")) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(callback, 40);
    });
    return () => { if (timer) clearTimeout(timer); watcher.close(); };
  }

  private filePath(id: string): string { return path.join(this.recordsDirectory, `${id}.md`); }

  private async serialized<T>(id: string, operation: () => Promise<T>): Promise<T> {
    const prior = this.pending.get(id) ?? Promise.resolve();
    const result = prior.catch(() => undefined).then(operation);
    this.pending.set(id, result);
    try { return await result; }
    finally { if (this.pending.get(id) === result) this.pending.delete(id); }
  }

  private async readFile(filePath: string): Promise<StoredRecord> {
    const content = await readFile(filePath, "utf8");
    const record = parse(content, filePath);
    if (`${record.id}.md`.toLocaleLowerCase() !== path.basename(filePath).toLocaleLowerCase()) {
      throw new MalformedRecordError(filePath, `metadata id ${record.id} does not match filename`);
    }
    return record;
  }
}

export function sanitizeTitleForFilename(title: string): string {
  const sanitized = title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-").replace(/[. ]+$/g, "").trim();
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(sanitized);
  return (reserved ? `_${sanitized}` : sanitized || "untitled").slice(0, 100);
}

function serialize(record: StoredRecord): string {
  const metadata: Metadata = {
    id: record.id, type: record.type, title: record.title,
    createdAt: record.createdAt, updatedAt: record.updatedAt,
    ...(record.category ? { category: record.category } : {}),
    ...(record.status ? { status: record.status } : {}),
    ...(record.waitingOn ? { waitingOn: record.waitingOn } : {}),
  };
  const lines = Object.entries(metadata).map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
  return `---\n${lines.join("\n")}\n---\n${record.body}`;
}

function parse(content: string, filePath: string): StoredRecord {
  const match = FRONT_MATTER.exec(content);
  if (!match) throw new MalformedRecordError(filePath, "missing YAML front matter");
  let raw: Record<string, unknown>;
  try { raw = matter(content).data; }
  catch (error) { throw new MalformedRecordError(filePath, String(error)); }
  for (const key of ['createdAt', 'updatedAt']) if (raw[key] instanceof Date) raw[key] = (raw[key] as Date).toISOString();
  validateMetadata(raw, filePath);
  return { ...(raw as unknown as Metadata), body: match[2], revision: revisionFor(content) };
}

function validateMetadata(raw: Record<string, unknown>, filePath: string): void {
  if (typeof raw.id !== "string" || !VALID_ID.test(raw.id)) throw new MalformedRecordError(filePath, "invalid id");
  if (!(["task", "note", "daily"] as unknown[]).includes(raw.type)) throw new MalformedRecordError(filePath, "invalid type");
  for (const key of ["title", "createdAt", "updatedAt"] as const) {
    if (typeof raw[key] !== "string" || !raw[key]) throw new MalformedRecordError(filePath, `invalid ${key}`);
  }
  if (Number.isNaN(Date.parse(raw.createdAt as string)) || Number.isNaN(Date.parse(raw.updatedAt as string))) throw new MalformedRecordError(filePath, "invalid timestamp");
  if (raw.type === "task") {
    if (!(TASK_CATEGORIES as readonly unknown[]).includes(raw.category)) throw new MalformedRecordError(filePath, "invalid category");
    if (!(raw.status === "open" || raw.status === "completed")) throw new MalformedRecordError(filePath, "invalid status");
    if (raw.waitingOn !== undefined && typeof raw.waitingOn !== "string") throw new MalformedRecordError(filePath, "invalid waitingOn");
  }
}

export { Storage as MarkdownStorage };

function parseYamlScalar(source: string): unknown {
  if (!source) return "";
  if (source.startsWith("\"") || source.startsWith("'")) {
    if (source.startsWith("\"")) return JSON.parse(source);
    if (!source.endsWith("'")) throw new Error("unterminated string");
    return source.slice(1, -1).replace(/''/g, "'");
  }
  if (/^(true|false)$/i.test(source)) return source.toLowerCase() === "true";
  if (/^(null|~)$/i.test(source)) return null;
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(source)) return Number(source);
  return source.replace(/\s+#.*$/, "").trim();
}

function validateInput(input: RecordInput): void {
  if (!input || typeof input !== 'object' || typeof input.title !== 'string' || !['task','note','daily'].includes(input.type)) throw new Error('Invalid record');
  if (input.body !== undefined && typeof input.body !== 'string') throw new Error('Invalid body');
  if (input.waitingOn !== undefined && typeof input.waitingOn !== 'string') throw new Error('Invalid dependency');
  if (input.status !== undefined && !['open','completed'].includes(input.status)) throw new Error('Invalid status');
  if (!input.title.trim()) throw new Error("Record title is required");
  if (input.type === "task" && input.category && !(TASK_CATEGORIES as readonly string[]).includes(input.category)) throw new Error("Invalid task category");
  if (input.type !== "task" && (input.category || input.status || input.waitingOn)) throw new Error("Task metadata is only valid on tasks");
}

function assertId(id: string): void { if (typeof id !== 'string' || !VALID_ID.test(id) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(id) || id.endsWith('.')) throw new Error(`Invalid record id: ${id}`); }
function revisionFor(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException { return !!error && typeof error === "object" && "code" in error && (error as NodeJS.ErrnoException).code === code; }

async function atomicReplace(destination: string, content: string, recovery?: string, beforeCommit?: (destination: string) => Promise<void>): Promise<void> {
  const temporary = `${destination}.${randomUUID()}.tmp`;
  try {
    if (recovery) {
      const previous = await readFile(destination);
      await writeFile(recovery, previous);
    }
    const handle = await open(temporary, "wx");
    try { await handle.writeFile(content, "utf8"); await handle.sync(); } finally { await handle.close(); }
    await beforeCommit?.(destination);
    await rename(temporary, destination);
  } catch (error) {
    try { await stat(temporary); await unlink(temporary); } catch { /* best-effort temp cleanup */ }
    throw error;
  }
}
