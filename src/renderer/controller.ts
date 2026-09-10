import type { GsdApi, GsdRecord } from './types';
const EMPTY_RETRY_DELAYS = [200, 500, 1_000, 2_000, 3_000] as const;
/** Draft ownership and write sequencing do not depend on React render timing. */
export class DraftController {
  records = new Map<string, GsdRecord>();
  dirty = new Set<string>();
  loaded = false;
  private pristine = new Set<string>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private flights = new Map<string, Promise<void>>();
  private generation = 0;
  private emptyRetryIndex = 0;
  private emptyRetryTimer: ReturnType<typeof setTimeout> | undefined;
  message = '';
  error = false;
  constructor(private api: GsdApi, private changed: () => void) {}
  async refresh() {
    const generation = this.generation;
    try {
      const snapshot = await this.api.list();
      if (generation !== this.generation) { this.scheduleInitialRetry(); return; }
      const incoming = new Map(snapshot.records.map(record => [record.id, record]));
      for (const [id, record] of this.records) {
        const existsOnDisk = incoming.has(id);
        if (this.dirty.has(id) || this.flights.has(id) || (this.pristine.has(id) && !existsOnDisk)) incoming.set(id, record);
        if (this.pristine.has(id) && existsOnDisk) this.pristine.delete(id);
      }
      this.records = incoming;
      this.loaded = true;
      if (snapshot.issues.length) this.message = snapshot.issues.join('\n');
      this.changed();
      if (!snapshot.records.length && !snapshot.issues.length) this.scheduleInitialRetry();
      else this.stopInitialRetries();
    } catch (error) { this.loaded = true; this.fail(error); }
  }
  private scheduleInitialRetry() {
    if (this.emptyRetryTimer || this.emptyRetryIndex >= EMPTY_RETRY_DELAYS.length) return;
    const delay = EMPTY_RETRY_DELAYS[this.emptyRetryIndex++];
    this.emptyRetryTimer = setTimeout(() => {
      this.emptyRetryTimer = undefined;
      void this.refresh();
    }, delay);
  }
  private stopInitialRetries() {
    if (this.emptyRetryTimer) clearTimeout(this.emptyRetryTimer);
    this.emptyRetryTimer = undefined;
    this.emptyRetryIndex = EMPTY_RETRY_DELAYS.length;
  }
  edit(record: GsdRecord) {
    this.generation++;
    this.pristine.delete(record.id);
    this.records.set(record.id, record);
    this.dirty.add(record.id);
    this.error = false;
    const timer = this.timers.get(record.id);
    if (timer) clearTimeout(timer);
    this.timers.set(record.id, setTimeout(() => { this.timers.delete(record.id); void this.flush(record.id).catch(() => {}); }, 550));
    this.changed();
  }
  addClean(record: GsdRecord) {
    if (!record.revision) return this.addDraft(record);
    if (!this.dirty.has(record.id)) this.records.set(record.id, record);
    this.changed();
  }
  addDraft(record: GsdRecord) {
    this.generation++;
    this.records.set(record.id, record);
    this.pristine.add(record.id);
    this.changed();
  }
  discardPristine(id: string | null | undefined): boolean {
    if (!id || !this.pristine.delete(id)) return false;
    this.generation++;
    this.records.delete(id);
    this.changed();
    return true;
  }
  async flush(id: string): Promise<void> {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
    const flight = this.flights.get(id);
    if (flight) { await flight; if (this.dirty.has(id)) return this.flush(id); return; }
    if (!this.dirty.has(id)) return;
    const operation = this.write(id);
    this.flights.set(id, operation);
    try { await operation; } finally { this.flights.delete(id); this.changed(); }
  }
  private async write(id: string) {
    try {
      while (this.dirty.has(id)) {
        const sent = this.records.get(id)!;
        if (!sent.revision && isBlank(sent)) {
          this.generation++;
          this.records.delete(id);
          this.dirty.delete(id);
          break;
        }
        const result = await this.api.save({ ...sent, title: sent.title.trim() || 'Untitled' });
        this.generation++;
        const current = this.records.get(id)!;
        if (result.conflict) {
          this.message = 'The file changed outside the app. Both versions were kept; your draft is in All Notes as a conflict copy.';
          this.records.delete(id); this.dirty.delete(id);
          this.records.set(result.record.id, result.record);
          if (current !== sent) this.edit({ ...result.record, body: current.body, title: (current.title || 'Untitled') + ' (conflict copy)' });
          await this.refresh();
          break;
        }
        if (current === sent) { this.records.set(id, result.record); this.dirty.delete(id); }
        else this.records.set(id, { ...current, revision: result.record.revision });
      }
      this.error = false;
    } catch (error) { this.fail(error); throw error; }
    finally { this.changed(); }
  }
  async flushAll(): Promise<boolean> {
    try {
      while (this.dirty.size || this.flights.size) await Promise.all([...new Set([...this.dirty, ...this.flights.keys()])].map(id => this.flush(id)));
      return true;
    } catch { return false; }
  }
  async trash(id: string) {
    try {
      const unsaved = this.records.get(id);
      if (unsaved && !unsaved.revision && isBlank(unsaved)) {
        const timer = this.timers.get(id);
        if (timer) clearTimeout(timer);
        this.timers.delete(id);
        this.pristine.delete(id);
        this.dirty.delete(id);
        this.generation++;
        this.records.delete(id);
        this.changed();
        return;
      }
      await this.flush(id);
      const record = this.records.get(id);
      if (!record) return;
      await this.api.trash(id, record.revision);
      this.generation++; this.records.delete(id); this.changed();
    } catch (error) { this.fail(error); }
  }
  private fail(error: unknown) { this.error = true; this.message = error instanceof Error ? error.message : String(error); this.changed(); }
}

function isBlank(record: GsdRecord): boolean {
  return !record.title.trim() && !record.body.trim() && !record.waitingOn?.trim();
}
