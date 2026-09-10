import { useEffect, useRef, useState } from 'react';
import type { AppCommand, GsdRecord, TaskCategory } from './types';
import { DraftController } from './controller';
import './styles.css';
type View = TaskCategory | 'daily' | 'all';
const LAST_VIEW_KEY = 'getting-stuff-done:last-view';
const nav: Array<{ id: View; label: string; mark: string }> = [
  { id: 'personal', label: 'Personal', mark: '⌂' },
  { id: 'work-urgent', label: 'Work (urgent)', mark: '!' },
  { id: 'work-thoughts', label: 'Work (thoughts)', mark: '✦' },
  { id: 'daily', label: 'Daily Notes', mark: '◫' },
  { id: 'all', label: 'All Notes', mark: '≡' },
];
const categoryLabels: Record<TaskCategory, string> = { personal: 'Personal', 'work-urgent': 'Work (urgent)', 'work-thoughts': 'Work (thoughts)' };
const isTaskCategory = (value: View): value is TaskCategory => value === 'personal' || value === 'work-urgent' || value === 'work-thoughts';
const isView = (value: string | null): value is View => value === 'personal' || value === 'work-urgent' || value === 'work-thoughts' || value === 'daily' || value === 'all';
function initialView(): View {
  try {
    const saved = localStorage.getItem(LAST_VIEW_KEY);
    return isView(saved) ? saved : 'all';
  } catch { return 'all'; }
}
function matchesView(record: GsdRecord, view: View) {
  if (view === 'all') return record.type !== 'task';
  if (view === 'daily') return record.type === 'daily';
  return record.type === 'task' && record.category === view;
}
function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toDateString() === new Date().toDateString() ? date.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'}) : date.toLocaleDateString([], {month:'short', day:'numeric'});
}
export default function App() {
  const [, render] = useState(0);
  const controller = useRef<DraftController | null>(null);
  if (!controller.current) controller.current = new DraftController(window.gsd, () => render(n => n + 1));
  const store = controller.current;
  const records = [...store.records.values()];
  const [view, setView] = useState<View>(initialView);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(selectedId);
  selectedIdRef.current = selectedId;
  const changeSelection = (id: string | null) => { selectedIdRef.current = id; setSelectedId(id); };
  const [query, setQuery] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [localError, setLocalError] = useState('');
  const loadError = localError || store.message;
  const setLoadError = (message: string) => { store.message = ''; setLocalError(message); render(n => n + 1); };
  const saveState = store.error ? 'error' : store.dirty.size ? 'saving' : 'saved';
  const searchRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const pendingTitleFocus = useRef<string | null>(null);
  const shortcutCloseRef = useRef<HTMLButtonElement>(null);
  const selected = records.find(record => record.id === selectedId) ?? null;
  const visible = records.filter(record => {
    if (!query.trim()) return matchesView(record, view);
    const haystack = [record.title, record.body, record.waitingOn ?? ''].join('\n').toLocaleLowerCase();
    return query.toLocaleLowerCase().trim().split(/\s+/).every(term => haystack.includes(term));
  }).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
  const openRecords = visible.filter(record => query.trim() || record.status !== 'completed');
  const completedRecords = query.trim() ? [] : visible.filter(record => record.status === 'completed');
  useEffect(() => {
    void store.refresh();
    const unsubscribe = window.gsd.onChanged(() => { void store.refresh(); });
    const close = window.gsd.onBeforeClose(() => store.flushAll());
    const refreshOnFocus = () => { void store.refresh(); };
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') void store.refresh(); };
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      unsubscribe(); close();
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [store]);
  useEffect(() => {
    try { localStorage.setItem(LAST_VIEW_KEY, view); } catch { /* fall back to All Notes next launch */ }
  }, [view]);
  useEffect(() => {
    if (!selectedId || !visible.some(record => record.id === selectedId)) changeSelection(visible[0]?.id ?? null);
  }, [selectedId, visible.map(record => record.id).join(',')]);
  useEffect(() => {
    if (selectedId && pendingTitleFocus.current === selectedId && titleRef.current) {
      titleRef.current.focus();
      pendingTitleFocus.current = null;
    }
  }, [selectedId, selected?.id]);
  const updateSelected = (patch: Partial<GsdRecord>) => {
    if (selected) store.edit({ ...store.records.get(selected.id)!, ...patch, updatedAt: new Date().toISOString() });
  };
  const createRecord = async (kind: 'note' | 'task' = 'note') => {
    store.discardPristine(selectedIdRef.current);
    const now = new Date().toISOString();
    const category = kind === 'task' ? (isTaskCategory(view) ? view : 'personal') : undefined;
    const record: GsdRecord = { id: crypto.randomUUID(), type: kind, title: '', body: '', category, status: kind === 'task' ? 'open' : undefined, createdAt: now, updatedAt: now };
    store.addDraft(record);
    setView(kind === 'task' ? category! : 'all');
    pendingTitleFocus.current = record.id;
    setQuery(''); changeSelection(record.id);
  };
  const openToday = async () => {
    try {
      const daily = await window.gsd.today();
      if (selectedIdRef.current !== daily.id) store.discardPristine(selectedIdRef.current);
      store.addClean(daily); setView('daily'); setQuery(''); changeSelection(daily.id);
    }
    catch(error) { setLoadError(String(error)); }
  };
  const removeSelected = async () => { if (selected) await store.trash(selected.id); };
  const chooseView = (nextView: View) => { store.discardPristine(selectedIdRef.current); setView(nextView); setQuery(''); changeSelection(null); };
  const selectRecord = (id: string) => { if (id !== selectedIdRef.current) store.discardPristine(selectedIdRef.current); changeSelection(id); };
  const createForView = () => view === 'daily' ? openToday() : createRecord(isTaskCategory(view) ? 'task' : 'note');
  const openNotesFolder = async () => {
    try { await window.gsd.openDataFolder(); }
    catch (error) { setLoadError(error instanceof Error ? error.message : String(error)); }
  };
  const runCommand = (command: AppCommand) => command === 'today' ? openToday() : createRecord();
  useEffect(() => window.gsd.onCommand(command => { void runCommand(command); }));
  useEffect(() => {
    if (showShortcuts) shortcutCloseRef.current?.focus();
  }, [showShortcuts]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showShortcuts) { event.preventDefault(); setShowShortcuts(false); return; }
      if (!event.ctrlKey) return;
      const key = event.key.toLowerCase();
      if (key === 'k' && !event.altKey) { event.preventDefault(); searchRef.current?.focus(); }
      if (key === 'n' && !event.shiftKey && !event.altKey) { event.preventDefault(); void runCommand('new-note'); }
      if (key === 'd' && event.altKey && !event.shiftKey) { event.preventDefault(); void runCommand('today'); }
      if (key === '/') { event.preventDefault(); setShowShortcuts(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
  const counts = (itemView: View) => records.filter((record) => matchesView(record, itemView) && record.status !== 'completed').length;
  const sectionTitle = nav.find((item) => item.id === view)?.label ?? '';

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">✓</span><span>Getting Stuff Done</span></div>
        <nav aria-label="Lists">
          {nav.map((item) => (
            <button className={`nav-item ${view === item.id ? 'active' : ''}`} key={item.id} onClick={() => chooseView(item.id)}>
              <span className="nav-mark">{item.mark}</span><span>{item.label}</span>
              {counts(item.id) > 0 && <span className="count">{counts(item.id)}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <button className="sidebar-action" onClick={() => void openToday()}><span>＋</span> Today <kbd>Ctrl Alt D</kbd></button>
        <button className="sidebar-action" onClick={() => void openNotesFolder()}><span>↗</span> Open notes folder</button>
        <button className="sidebar-action" aria-label="Keyboard shortcuts" onClick={() => setShowShortcuts(true)}><span>?</span> Keyboard shortcuts <kbd>Ctrl /</kbd></button>
      </aside>

      <section className="record-list">
        <header className="list-header">
          <div><p className="eyebrow">LIST</p><h1>{sectionTitle}</h1></div>
          <button className="icon-button primary" aria-label={view === 'daily' ? 'New daily note' : isTaskCategory(view) ? 'New task' : 'New note'} title={view === 'daily' ? "Open today's daily note" : isTaskCategory(view) ? 'New task' : 'New note (Ctrl+N)'} onClick={() => void createForView()}>＋</button>
        </header>
        <label className="search-box">
          <span>⌕</span><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search everything" />
          <kbd>Ctrl K</kbd>
        </label>
        {store.error && <button className="error-banner" onClick={() => void store.flushAll()}>Retry saving</button>}
        {loadError && <button className="error-banner" onClick={() => setLoadError('')}>{loadError}<span>×</span></button>}
        <div className="list-scroll">
          {openRecords.map((record) => <RecordRow key={record.id} record={record} selected={record.id === selectedId} onSelect={selectRecord} />)}
          {openRecords.length === 0 && completedRecords.length === 0 && (
            <div className="empty-list"><span>{query ? '⌕' : '◇'}</span><p>{!store.loaded ? 'Loading notes…' : query ? 'No matches' : 'Nothing here yet'}</p><small>{!store.loaded ? 'Reading your local Markdown files.' : query ? 'Try another search.' : 'Create a note or task to get started.'}</small>{store.loaded && !query && <button onClick={() => void store.refresh()}>Reload notes</button>}</div>
          )}
          {completedRecords.length > 0 && (
            <div className="completed-group">
              <button className="completed-toggle" onClick={() => setShowCompleted((value) => !value)}>
                <span>{showCompleted ? '▾' : '▸'}</span> Completed <span className="completed-count">{completedRecords.length}</span>
              </button>
              {(showCompleted || Boolean(query.trim())) && completedRecords.map((record) => <RecordRow key={record.id} record={record} selected={record.id === selectedId} onSelect={selectRecord} />)}
            </div>
          )}
        </div>
      </section>

      <section className="editor">
        {selected ? (
          <>
            <header className="editor-toolbar">
              <div className={`save-state ${saveState}`}><span />{saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : saveState === 'saved' ? 'Saved' : ''}</div>
              <div className="toolbar-actions">
                {selected.type === 'task' && (
                  <button className={`complete-button ${selected.status === 'completed' ? 'is-complete' : ''}`} onClick={() => updateSelected({ status: selected.status === 'completed' ? 'open' : 'completed' })}>
                    <span>{selected.status === 'completed' ? '↶' : '✓'}</span>{selected.status === 'completed' ? 'Reopen' : 'Complete'}
                  </button>
                )}
                <button className="delete-button" aria-label="Delete note" title="Move saved notes to local trash" onClick={() => void removeSelected()}><span>⌫</span> Delete</button>
              </div>
            </header>
            <article className="editor-content">
              <textarea rows={1} ref={titleRef} className="title-input" aria-label="Title" value={selected.title} onChange={(event) => updateSelected({ title: event.target.value })} placeholder={selected.type === 'task' ? 'What needs doing?' : 'Untitled note'} />
              <div className="metadata-row">
                {selected.type === 'task' && (
                  <label className="select-wrap">List
                    <select value={selected.category} onChange={(event) => updateSelected({ category: event.target.value as TaskCategory })}>
                      {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                )}
                <span>Edited {formatDate(selected.updatedAt)}</span>
              </div>
              {selected.type === 'task' && (
                <label className="waiting-field"><span>Waiting on</span><input value={selected.waitingOn ?? ''} onChange={(event) => updateSelected({ waitingOn: event.target.value })} placeholder="Optional person or dependency" /></label>
              )}
              <textarea className="body-input" aria-label="Body" value={selected.body} onChange={(event) => updateSelected({ body: event.target.value })} placeholder="Start writing…" />
            </article>
          </>
        ) : (
          <div className="empty-editor"><div>◇</div><h2>Select something to work on</h2><p>Choose an item from the list, or create a new one.</p><button onClick={() => void createForView()}>Create new</button></div>
        )}
      </section>
      {showShortcuts && (
        <div className="dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowShortcuts(false); }}>
          <section className="shortcut-dialog" role="dialog" aria-modal="true" aria-labelledby="shortcut-dialog-title">
            <header><div><p className="eyebrow">KEYBOARD</p><h2 id="shortcut-dialog-title">Shortcuts</h2></div><button ref={shortcutCloseRef} className="dialog-close" aria-label="Close shortcuts" onClick={() => setShowShortcuts(false)}>×</button></header>
            <p className="shortcut-scope">Capture from anywhere in Windows</p>
            <dl><div><dt><kbd>Ctrl Alt G</kbd></dt><dd>Open a new note</dd></div><div><dt><kbd>Ctrl Alt D</kbd></dt><dd>Open today’s daily note</dd></div></dl>
            <p className="shortcut-scope">While the app is active</p>
            <dl><div><dt><kbd>Ctrl N</kbd></dt><dd>Open a new note</dd></div><div><dt><kbd>Ctrl K</kbd></dt><dd>Focus search</dd></div><div><dt><kbd>Ctrl /</kbd></dt><dd>Show this guide</dd></div><div><dt><kbd>Esc</kbd></dt><dd>Close this guide</dd></div></dl>
          </section>
        </div>
      )}
    </main>
  );
}
function RecordRow({ record, selected, onSelect }: { record: GsdRecord; selected: boolean; onSelect: (id: string) => void }) {
  const preview = record.waitingOn
    ? (/^waiting on\b/i.test(record.waitingOn) ? record.waitingOn : `Waiting on ${record.waitingOn}`)
    : record.body.replace(/\s+/g, ' ').trim();
  return (
    <button className={`record-row ${selected ? 'selected' : ''} ${record.status === 'completed' ? 'completed' : ''}`} onClick={() => onSelect(record.id)}>
      <span className="record-type">{record.type === 'task' ? (record.status === 'completed' ? '✓' : '○') : record.type === 'daily' ? '◫' : '—'}</span>
      <span className="record-copy"><strong>{record.title || 'Untitled'}</strong><small>{preview || (record.type === 'task' ? 'No details' : 'Empty note')}</small></span>
      <time>{formatDate(record.updatedAt)}</time>
    </button>
  );
}
