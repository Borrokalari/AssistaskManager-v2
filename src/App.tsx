import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useTaskStore, Priority, Task } from "./store";
import { useNotifications } from "./useNotifications";
import { parseTask, formatDetectedDate } from "./parseTask";
import { useSettingsStore, formatInZone, LOCAL_ZONE } from "./settingsStore";
import { useWindowPersistence } from "./useWindowPersistence";
import { useUpdateCheck } from "./useUpdateCheck";
import PixelText from "./PixelText";
import SlideMenu from "./SlideMenu";
import StandupView from "./views/StandupView";
import CompletedView from "./views/CompletedView";
import SettingsView from "./views/SettingsView";
import SnapshotsView from "./views/SnapshotsView";
import AboutView from "./views/AboutView";

export type View = "tasks" | "standup" | "completed" | "settings" | "lists" | "about";


export const PRIORITY_COLORS: Record<Priority, string> = {
  P0: "text-vscode-red",
  P1: "text-vscode-orange",
  P2: "text-vscode-yellow",
  P3: "text-vscode-blue",
  P4: "text-vscode-green",
  P5: "text-vscode-muted",
};

export const PRIORITY_DOT: Record<Priority, string> = {
  P0: "bg-vscode-red",
  P1: "bg-vscode-orange",
  P2: "bg-vscode-yellow",
  P3: "bg-vscode-blue",
  P4: "bg-vscode-green",
  P5: "bg-vscode-muted",
};

function formatDue(dueAt: number): string {
  const d = new Date(dueAt);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return time;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

function toDatetimeLocal(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatCreated(ts: number): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `Created: ${date}, ${time}`;
}

interface TaskRowProps {
  task: Task;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  draggable?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onHandleMouseDown?: (e: React.MouseEvent) => void;
}

function TaskRow({ task, isEditing, onStartEdit, onStopEdit, draggable: isDraggable, isDragging, isDragOver, onHandleMouseDown }: TaskRowProps) {
  const { toggleTask, deleteTask, updateTask } = useTaskStore();
  const overdue = !task.done && task.dueAt !== undefined && task.dueAt < Date.now();

  const [editText, setEditText] = useState(task.text);
  const [editPriority, setEditPriority] = useState<Priority>(task.priority);
  const [editDue, setEditDue] = useState(task.dueAt ? toDatetimeLocal(task.dueAt) : "");
  const textRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setEditText(task.text);
      setEditPriority(task.priority);
      setEditDue(task.dueAt ? toDatetimeLocal(task.dueAt) : "");
      setTimeout(() => textRef.current?.focus(), 0);
    }
  }, [isEditing]);

  const save = () => {
    const text = editText.trim();
    if (!text) return;
    const dueAt = editDue ? new Date(editDue).getTime() : undefined;
    updateTask(task.id, { text, priority: editPriority, dueAt });
    onStopEdit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") onStopEdit();
  };

  if (isEditing) {
    return (
      <div className="border-b border-vscode-border bg-vscode-panel">
        {/* Edit title row */}
        <div className="flex items-center gap-2 px-3 py-2">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[editPriority]}`} />
          <input
            ref={textRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-vscode-text caret-vscode-accent focus:outline-none text-sm"
          />
          <button onClick={save} className="text-vscode-green hover:text-vscode-text transition-colors flex-shrink-0" aria-label="Save">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 6.5L5.5 10L11 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button onClick={onStopEdit} className="text-vscode-muted hover:text-vscode-red transition-colors flex-shrink-0" aria-label="Cancel">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Priority + due date row */}
        <div className="flex items-center gap-2 px-3 pb-2">
          <div className="flex gap-1">
            {(["P0", "P1", "P2", "P3", "P4", "P5"] as Priority[]).map((p) => (
              <button
                key={p}
                onClick={() => setEditPriority(p)}
                className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
                  editPriority === p
                    ? `border-current ${PRIORITY_COLORS[p]}`
                    : "border-vscode-border text-vscode-muted hover:border-vscode-muted"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            type="datetime-local"
            value={editDue}
            onChange={(e) => setEditDue(e.target.value)}
            className="flex-1 bg-vscode-bg text-vscode-text text-xs px-2 py-0.5 rounded border border-vscode-border focus:border-vscode-accent min-w-0"
            style={{ colorScheme: "dark" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      data-task-id={isDraggable ? task.id : undefined}
      title={formatCreated(task.createdAt)}
      className={`relative group flex items-start gap-2 px-3 py-2 border-b border-vscode-border hover:bg-vscode-panel transition-colors cursor-pointer border-l-2 ${
        task.done
          ? "opacity-40 border-l-transparent"
          : overdue
          ? "border-l-[#f44747] bg-[rgba(244,71,71,0.04)]"
          : "border-l-transparent"
      } ${isDragging ? "opacity-40" : ""}`}
      onClick={onStartEdit}
    >
      {isDragOver && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-vscode-accent pointer-events-none" />
      )}
      {isDraggable && (
        <div
          className="mt-[4px] flex-shrink-0 opacity-0 group-hover:opacity-40 hover:!opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onHandleMouseDown?.(e); }}
        >
          <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor" className="text-vscode-muted">
            <circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/>
            <circle cx="2" cy="6" r="1.2"/><circle cx="6" cy="6" r="1.2"/>
            <circle cx="2" cy="10" r="1.2"/><circle cx="6" cy="10" r="1.2"/>
          </svg>
        </div>
      )}
      <div className="mt-[5px] flex-shrink-0">
        <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} />
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
        className="mt-[2px] flex-shrink-0 w-4 h-4 border border-vscode-muted rounded-sm flex items-center justify-center hover:border-vscode-accent transition-colors"
        aria-label="Toggle task"
      >
        {task.done && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-vscode-green">
            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span className={`flex-1 leading-relaxed break-all min-w-0 text-sm ${task.done ? "line-through text-vscode-muted" : "text-vscode-text"}`}>
        {task.text}
      </span>
      {task.dueAt && (
        <span className={`flex-shrink-0 text-xs mt-[2px] ${overdue ? "text-vscode-red" : "text-vscode-muted"}`}>
          {overdue ? "⏰ " : ""}{formatDue(task.dueAt)}
        </span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
        className="flex-shrink-0 mt-[2px] opacity-0 group-hover:opacity-100 text-vscode-muted hover:text-vscode-red transition-all"
        aria-label="Delete task"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function AppHeader() {
  const { showTimezones, localName, tz1Name, tz1Zone, tz2Name, tz2Zone, titleColor, isShiny, isVu } = useSettingsStore();
  const [amplitude, setAmplitude] = useState<number | null>(null);

  useEffect(() => {
    if (!isVu) {
      setAmplitude(null);
      import("@tauri-apps/api/core").then(({ invoke }) => invoke("stop_vu").catch(() => {}));
      return;
    }

    let unlisten: (() => void) | undefined;

    Promise.all([
      import("@tauri-apps/api/core"),
      import("@tauri-apps/api/event"),
    ]).then(([{ invoke }, { listen }]) => {
      listen<number>("vu-data", (e) => setAmplitude(e.payload)).then((fn) => { unlisten = fn; });
      invoke("start_vu").catch(() => useSettingsStore.getState().update({ isVu: false }));
    });

    return () => {
      unlisten?.();
      setAmplitude(null);
      import("@tauri-apps/api/core").then(({ invoke }) => invoke("stop_vu").catch(() => {}));
    };
  }, [isVu]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  void tick;

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex flex-col items-center py-3 border-b border-vscode-border select-none gap-1.5">
      <PixelText text="ASSISTASK" pixelSize={3} color={titleColor || "#52D7C6"} animated={isShiny} amplitude={amplitude} />
      <span className="text-[10px] text-vscode-muted tracking-wide">{today}</span>
      {showTimezones && (
        <div className="flex items-center gap-2 mt-1 text-xs text-vscode-muted">
          <span>
            <span className="text-vscode-text">{localName || "LOCAL"}</span>{" "}
            {formatInZone(LOCAL_ZONE)}
          </span>
          <span className="opacity-30">—</span>
          <span>
            <span className="text-vscode-text">{tz1Name || "TZ1"}</span>{" "}
            {formatInZone(tz1Zone)}
          </span>
          <span className="opacity-30">—</span>
          <span>
            <span className="text-vscode-text">{tz2Name || "TZ2"}</span>{" "}
            {formatInZone(tz2Zone)}
          </span>
        </div>
      )}
    </div>
  );
}

const SLASH_COMMANDS = [
  { cmd: "/search",          desc: "filter tasks by text — keep typing to search" },
  { cmd: "/shiny",           desc: "toggle rainbow wave on ASSISTASK" },
  { cmd: "/vu",              desc: "toggle VU meter — pixels react to your mic" },
  { cmd: "/alldone",         desc: "mark all tasks as done" },
  { cmd: "/clearall",        desc: "send all tasks to completed" },
  { cmd: "/clear critical",  desc: "send critical tasks to completed" },
  { cmd: "/deleteall",       desc: "permanently delete all tasks" },
];

function TasksView() {
  const { tasks, addTask, markAllDone, hideAll, hideCritical, deleteAll, reorderTask } = useTaskStore();
  const { keepKeywords } = useSettingsStore();
  const [input, setInput] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState<Priority>("P3");
  const [showDue, setShowDue] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const dropIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!draggingId) return;

    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    const onMove = (e: MouseEvent) => {
      const els = document.elementsFromPoint(e.clientX, e.clientY);
      const el = els.find((n) => (n as HTMLElement).dataset?.taskId) as HTMLElement | undefined;
      const id = el?.dataset.taskId ?? null;
      const target = id === draggingId ? null : id;
      dropIdRef.current = target;
      setDragOverId(target);
    };

    const onUp = () => {
      if (dragIdRef.current && dropIdRef.current) {
        reorderTask(dragIdRef.current, dropIdRef.current);
      }
      dragIdRef.current = null;
      dropIdRef.current = null;
      setDraggingId(null);
      setDragOverId(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [draggingId, reorderTask]);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef<number>(-1);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const isSearchMode = input.toLowerCase().startsWith("/search");
  const searchText = isSearchMode ? input.slice(7).trim().toLowerCase() : "";

  const slashQuery = input.startsWith("/") && !isSearchMode ? input.toLowerCase() : null;
  const filteredCmds = slashQuery !== null
    ? SLASH_COMMANDS.filter((c) => c.cmd.startsWith(slashQuery))
    : isSearchMode && input.toLowerCase() === "/search"
    ? SLASH_COMMANDS.filter((c) => c.cmd === "/search")
    : [];
  const showPalette = filteredCmds.length > 0 && !(isSearchMode && searchText.length > 0);

  // Keep paletteIdx in bounds when filtered list shrinks
  useEffect(() => {
    setPaletteIdx(0);
  }, [filteredCmds.length]);

  const parsed = parseTask(showPalette || isSearchMode ? "" : input, keepKeywords);
  const effectivePriority = parsed.priority ?? priority;
  const effectiveDue = parsed.dueAt ?? (dueTime ? new Date(dueTime).getTime() : undefined);
  const hasHint = !showPalette && !isSearchMode && (!!parsed.priority || !!parsed.dueAt);

  const resetInput = () => {
    setInput("");
    setDueTime("");
    setPriority("P3");
    setShowDue(false);
    historyIdxRef.current = -1;
  };

  const runSlashCommand = (raw: string): boolean => {
    const parts = raw.slice(1).toLowerCase().split(/\s+/);
    const cmd = parts[0];
    const arg = parts[1];
    if (cmd === "shiny")    { const { isShiny, update } = useSettingsStore.getState(); update({ isShiny: !isShiny }); return true; }
    if (cmd === "vu")       { const { isVu, update } = useSettingsStore.getState(); update({ isVu: !isVu }); return true; }
    if (cmd === "alldone")  { markAllDone(); return true; }
    if (cmd === "clearall") { hideAll(); return true; }
    if (cmd === "deleteall"){ deleteAll(); return true; }
    if (cmd === "clear" && arg === "critical") { hideCritical(); return true; }
    return false;
  };

  const handleAdd = () => {
    const raw = input.trim();
    if (!raw) return;

    const effectiveRaw = showPalette ? filteredCmds[paletteIdx].cmd : raw;

    // /search just primes the input for typing
    if (effectiveRaw === "/search") {
      setInput("/search ");
      return;
    }

    if (effectiveRaw.startsWith("/")) {
      if (runSlashCommand(effectiveRaw)) {
        historyRef.current = [effectiveRaw, ...historyRef.current.filter((h) => h !== effectiveRaw)];
        resetInput();
        return;
      }
    }

    const text = parsed.text.trim();
    if (!text) return;
    addTask(text, effectiveDue, effectivePriority);
    historyRef.current = [raw, ...historyRef.current.filter((h) => h !== raw)];
    resetInput();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (showPalette) {
      if (e.key === "ArrowUp")   { e.preventDefault(); setPaletteIdx((i) => Math.max(0, i - 1)); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setPaletteIdx((i) => Math.min(filteredCmds.length - 1, i + 1)); return; }
      if (e.key === "Enter")     { handleAdd(); return; }
      if (e.key === "Escape")    { resetInput(); return; }
      if (e.key === "Tab")       { e.preventDefault(); setInput(filteredCmds[paletteIdx].cmd); return; }
      return;
    }

    if (e.key === "Enter")  { handleAdd(); return; }
    if (e.key === "Escape") { resetInput(); return; }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const history = historyRef.current;
      if (!history.length) return;
      const next = historyIdxRef.current < history.length - 1 ? historyIdxRef.current + 1 : historyIdxRef.current;
      historyIdxRef.current = next;
      setInput(history[next]);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = historyIdxRef.current;
      if (idx <= 0) { historyIdxRef.current = -1; setInput(""); return; }
      historyIdxRef.current = idx - 1;
      setInput(historyRef.current[idx - 1]);
    }
  };

  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done && !t.hidden);

  const matchSearch = (t: Task) =>
    !searchText || t.text.toLowerCase().includes(searchText);

  const critical = pending
    .filter((t) => (t.priority === "P0" || t.priority === "P1") && matchSearch(t))
    .sort((a, b) => {
      if (a.dueAt && b.dueAt) return a.dueAt - b.dueAt;
      if (a.dueAt) return -1;
      if (b.dueAt) return 1;
      return b.createdAt - a.createdAt;
    });

  const regular = pending
    .filter((t) => t.priority !== "P0" && t.priority !== "P1" && matchSearch(t));

  const SectionDivider = ({ label, accent }: { label: string; accent?: string }) => (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <div className="flex-1 h-px bg-vscode-border" />
      <span className={`text-[10px] tracking-widest uppercase font-medium ${accent ?? "text-vscode-muted"}`}>
        {label}
      </span>
      <div className="flex-1 h-px bg-vscode-border" />
    </div>
  );

  return (
    <>
      <AppHeader />
      {searchText && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-vscode-border bg-vscode-bg text-xs flex-shrink-0">
          <span className="text-vscode-muted">searching</span>
          <span className="text-vscode-accent font-mono">"{searchText}"</span>
          <span className="text-vscode-muted ml-auto">{critical.length + regular.length} result{critical.length + regular.length !== 1 ? "s" : ""}</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-32 text-vscode-muted text-xs">
            no tasks — type below and press enter
          </div>
        )}

        {critical.length > 0 && (
          <>
            <SectionDivider label="critical" accent="text-vscode-red" />
            {critical.map((t) => (
              <TaskRow key={t.id} task={t} isEditing={editingId === t.id} onStartEdit={() => setEditingId(t.id)} onStopEdit={() => setEditingId(null)} />
            ))}
          </>
        )}

        {regular.length > 0 && (
          <>
            <SectionDivider label="tasks" />
            {regular.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                isEditing={editingId === t.id}
                onStartEdit={() => setEditingId(t.id)}
                onStopEdit={() => setEditingId(null)}
                draggable
                isDragging={draggingId === t.id}
                isDragOver={dragOverId === t.id}
                onHandleMouseDown={() => { dragIdRef.current = t.id; setDraggingId(t.id); }}
              />
            ))}
            <div className="h-2" />
          </>
        )}

        {done.length > 0 && (
          <>
            <SectionDivider label="completed" />
            {done.map((t) => (
              <TaskRow key={t.id} task={t} isEditing={editingId === t.id} onStartEdit={() => setEditingId(t.id)} onStopEdit={() => setEditingId(null)} />
            ))}
          </>
        )}
      </div>

      <div className="border-t border-vscode-border bg-vscode-sidebar">
        {showDue && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-vscode-border">
            <span className="text-xs text-vscode-muted w-8">due</span>
            <input
              type="datetime-local"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="flex-1 bg-vscode-panel text-vscode-text text-xs px-2 py-1 rounded border border-vscode-border focus:border-vscode-accent"
              style={{ colorScheme: "dark" }}
            />
            <div className="flex gap-1">
              {(["P0", "P1", "P2", "P3", "P4", "P5"] as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                    priority === p
                      ? `border-current ${PRIORITY_COLORS[p]}`
                      : "border-vscode-border text-vscode-muted hover:border-vscode-muted"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Slash command palette */}
        {showPalette && (
          <div className="border-b border-vscode-border bg-vscode-bg">
            {filteredCmds.map((item, i) => (
              <div
                key={item.cmd}
                onMouseDown={(e) => { e.preventDefault(); setInput(item.cmd); setPaletteIdx(i); setTimeout(() => { runSlashCommand(item.cmd); historyRef.current = [item.cmd, ...historyRef.current.filter((h) => h !== item.cmd)]; resetInput(); inputRef.current?.focus(); }, 0); }}
                onMouseEnter={() => setPaletteIdx(i)}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                  i === paletteIdx ? "bg-vscode-panel" : "hover:bg-vscode-panel"
                }`}
              >
                <span className={`text-xs font-mono ${i === paletteIdx ? "text-vscode-accent" : "text-vscode-muted"}`}>
                  {item.cmd}
                </span>
                <span className="text-xs text-vscode-muted truncate">{item.desc}</span>
                {i === paletteIdx && (
                  <span className="ml-auto text-[10px] text-vscode-muted opacity-50 flex-shrink-0">↵</span>
                )}
              </div>
            ))}
          </div>
        )}

        {hasHint && (
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-vscode-border bg-vscode-bg text-xs text-vscode-muted">
            <span className="text-vscode-accent">detected →</span>
            {parsed.priority && <span className={PRIORITY_COLORS[parsed.priority]}>{parsed.priority}</span>}
            {parsed.dueAt && <span className="text-vscode-green">{formatDetectedDate(parsed.dueAt)}</span>}
            {parsed.text.trim() && (
              <span className="ml-auto truncate text-vscode-muted opacity-60">"{parsed.text.trim()}"</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 px-3 py-2">
          <button
            onClick={() => setShowDue((v) => !v)}
            className={`flex-shrink-0 text-xs transition-colors ${showDue ? "text-vscode-accent" : "text-vscode-muted hover:text-vscode-text"}`}
            title="Set due time / priority"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M7 4.5V7L8.5 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="add task…"
            className="flex-1 bg-transparent text-vscode-text placeholder-vscode-muted caret-vscode-accent"
          />
          <span className="text-xs text-vscode-muted">↵</span>
        </div>
      </div>
    </>
  );
}

export default function App() {
  useNotifications();
  useWindowPersistence();
  const { updateInfo, dismiss: dismissUpdate } = useUpdateCheck();

  const { tasks, hideDone } = useTaskStore();
  const [view, setView] = useState<View>("tasks");
  const [menuOpen, setMenuOpen] = useState(false);

  const pending = tasks.filter((t) => !t.done);
  const overdueCount = pending.filter((t) => t.dueAt && t.dueAt < Date.now()).length;

  return (
    <div className="flex flex-col h-full bg-vscode-bg relative overflow-hidden">
      {/* Title bar */}
      <div
        data-tauri-drag-region
        className="flex items-center justify-between px-3 py-2 bg-vscode-sidebar border-b border-vscode-border select-none flex-shrink-0"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="text-vscode-muted hover:text-vscode-text transition-colors"
            aria-label="Open menu"
            title="Menu (Ctrl+Shift+A to show / hide)"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="2.5" width="12" height="1.2" rx="0.6" fill="currentColor" />
              <rect x="1" y="6.4" width="12" height="1.2" rx="0.6" fill="currentColor" />
              <rect x="1" y="10.3" width="12" height="1.2" rx="0.6" fill="currentColor" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div data-tauri-drag-region className="flex items-center gap-2 text-xs text-vscode-muted">
            {overdueCount > 0 && <span data-tauri-drag-region className="text-vscode-red">{overdueCount} overdue</span>}
            <span data-tauri-drag-region>{pending.length} pending</span>
            {tasks.filter((t) => t.done && !t.hidden).length > 0 && (
              <button onClick={hideDone} className="hover:text-vscode-text transition-colors">
                clear done
              </button>
            )}
          </div>
          <div className="flex items-center gap-0.5 ml-1">
            <button
              onClick={() => getCurrentWebviewWindow().minimize()}
              className="w-5 h-5 flex items-center justify-center text-vscode-muted hover:text-vscode-text transition-colors"
              title="Minimize"
            >
              <svg width="10" height="2" viewBox="0 0 10 2"><rect width="10" height="1.5" y="0.25" fill="currentColor"/></svg>
            </button>
            <button
              onClick={() => getCurrentWebviewWindow().hide()}
              className="w-5 h-5 flex items-center justify-center text-vscode-muted hover:text-vscode-red transition-colors"
              title="Hide to tray"
            >
              <svg width="9" height="9" viewBox="0 0 9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <line x1="1" y1="1" x2="8" y2="8"/><line x1="8" y1="1" x2="1" y2="8"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Update available banner */}
      {updateInfo && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-vscode-border bg-vscode-panel text-xs flex-shrink-0">
          <span className="text-vscode-accent">⬆</span>
          <span className="text-vscode-text">Update available: v{updateInfo.version}</span>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => invoke("open_url", { url: updateInfo.downloadUrl })}
              className="text-vscode-accent hover:underline transition-colors"
            >
              Download
            </button>
            <button
              onClick={dismissUpdate}
              className="text-vscode-muted hover:text-vscode-text transition-colors"
            >
              Ignore
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {view === "tasks" && <TasksView />}
        {view === "standup" && <StandupView />}
        {view === "completed" && <CompletedView />}
        {view === "settings" && <SettingsView onNavigate={setView} />}
        {view === "lists" && <SnapshotsView onNavigate={setView} />}
        {view === "about" && <AboutView />}
      </div>

      {/* Slide menu */}
      <SlideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={setView}
        currentView={view}
      />
    </div>
  );
}
