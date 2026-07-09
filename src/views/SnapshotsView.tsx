import { useState, useMemo } from "react";
import { useSnapshots, Snapshot } from "../useSnapshots";
import { useTaskStore, Task } from "../store";
import { decodeListCode, encodeListCode } from "../listCode";
import { View } from "../App";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

interface RestorePromptProps {
  snapshot: Snapshot;
  taskCount: number;
  onConfirm: (mode: "replace" | "append") => void;
  onCancel: () => void;
}

function RestorePrompt({ snapshot, taskCount, onConfirm, onCancel }: RestorePromptProps) {
  return (
    <div className="flex flex-col gap-2 p-3 bg-vscode-panel border border-vscode-border rounded">
      <span className="text-xs text-vscode-muted">
        Restore <span className="text-vscode-text">{snapshot.name}</span> ({taskCount} task{taskCount !== 1 ? "s" : ""}) — replace existing or append?
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onConfirm("replace")}
          className="text-xs px-3 py-1 rounded border border-vscode-red text-vscode-red hover:bg-vscode-red hover:text-white transition-colors"
        >
          Replace
        </button>
        <button
          onClick={() => onConfirm("append")}
          className="text-xs px-3 py-1 rounded border border-vscode-accent text-vscode-accent hover:bg-vscode-accent hover:text-vscode-bg transition-colors"
        >
          Append
        </button>
        <button onClick={onCancel} className="text-xs text-vscode-muted hover:text-vscode-text">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function SnapshotsView({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { snapshots, loading, remove, updateSnapshot } = useSnapshots();
  const { importTasks, tasks, deleteAll } = useTaskStore();

  const activeTasks = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const currentCode = useMemo(() => encodeListCode(activeTasks), [activeTasks]);
  const isCurrentSaved = snapshots.length > 0 && snapshots[0].code === currentCode;

  const [restoring, setRestoring] = useState<{ snapshot: Snapshot; decoded: Task[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNewListWarning, setShowNewListWarning] = useState(false);

  const handleRestore = (snapshot: Snapshot) => {
    setError(null);
    try {
      const decoded = decodeListCode(snapshot.code);
      if (decoded.length === 0) throw new Error("empty");
      if (tasks.length === 0) {
        importTasks(decoded, "replace");
      } else {
        setRestoring({ snapshot, decoded });
      }
    } catch {
      setError(`Could not read "${snapshot.name}".`);
    }
  };

  const handleConfirm = (mode: "replace" | "append") => {
    if (!restoring) return;
    importTasks(restoring.decoded, mode);
    setRestoring(null);
  };

  const handleNewList = () => {
    if (activeTasks.length === 0 || isCurrentSaved) {
      deleteAll();
      onNavigate("tasks");
    } else {
      setShowNewListWarning(true);
    }
  };

  const handleNewListConfirm = () => {
    deleteAll();
    setShowNewListWarning(false);
    onNavigate("tasks");
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xs text-vscode-muted">Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Unsaved warning modal */}
      {showNewListWarning && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
          <div className="bg-vscode-sidebar border border-vscode-border rounded p-4 mx-4 flex flex-col gap-3">
            <p className="text-sm text-vscode-text leading-relaxed">
              Your current list hasn't been saved as a snapshot. If you continue, unsaved tasks will be lost.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleNewListConfirm}
                className="text-xs px-3 py-1 rounded border border-vscode-red text-vscode-red hover:bg-vscode-red hover:text-white transition-colors"
              >
                Continue
              </button>
              <button
                onClick={() => setShowNewListWarning(false)}
                className="text-xs px-3 py-1 rounded border border-vscode-border text-vscode-muted hover:text-vscode-text transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-vscode-muted uppercase tracking-wide">saved lists</div>
          <button
            onClick={handleNewList}
            disabled={snapshots.length === 0}
            className="text-xs px-2.5 py-1 rounded border border-vscode-accent text-vscode-accent hover:bg-vscode-accent hover:text-vscode-bg transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            + List
          </button>
        </div>

        {error && <span className="text-xs text-vscode-red">{error}</span>}

        {restoring && (
          <RestorePrompt
            snapshot={restoring.snapshot}
            taskCount={restoring.decoded.length}
            onConfirm={handleConfirm}
            onCancel={() => setRestoring(null)}
          />
        )}

        {snapshots.length === 0 ? (
          <p className="text-xs text-vscode-muted leading-relaxed">
            No saved lists yet. Go to Settings → List code → Save code to create one.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {snapshots.map((s) => {
              const isUpToDate = s.code === currentCode;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 p-2.5 bg-vscode-panel border border-vscode-border rounded"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm text-vscode-text truncate">{s.name}</span>
                    <span className="text-xs text-vscode-muted">{formatDate(s.savedAt)}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={() => updateSnapshot(s.id, currentCode)}
                      disabled={isUpToDate}
                      className="text-xs text-vscode-muted hover:text-vscode-text transition-colors disabled:opacity-30 disabled:pointer-events-none"
                      title={isUpToDate ? "Already up to date" : "Save current tasks into this snapshot"}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => handleRestore(s)}
                      className="text-xs text-vscode-accent hover:underline transition-colors"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => remove(s.id)}
                      className="text-xs text-vscode-muted hover:text-vscode-red transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
