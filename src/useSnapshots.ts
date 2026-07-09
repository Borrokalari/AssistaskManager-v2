import { useEffect, useState, useCallback } from "react";
import { load } from "@tauri-apps/plugin-store";

export interface Snapshot {
  id: string;
  name: string;
  code: string;
  savedAt: number;
}

const STORE_FILE = "snapshots.json";
const STORE_KEY = "snapshots";

async function getStore() {
  return load(STORE_FILE, { autoSave: true, defaults: {} });
}

export function useSnapshots() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStore().then(async (store) => {
      const data = await store.get<Snapshot[]>(STORE_KEY);
      setSnapshots(data ?? []);
      setLoading(false);
    });
  }, []);

  const save = useCallback(async (name: string, code: string) => {
    const store = await getStore();
    const next: Snapshot[] = [
      { id: crypto.randomUUID(), name: name.trim(), code, savedAt: Date.now() },
      ...snapshots,
    ];
    await store.set(STORE_KEY, next);
    setSnapshots(next);
  }, [snapshots]);

  const remove = useCallback(async (id: string) => {
    const store = await getStore();
    const next = snapshots.filter((s) => s.id !== id);
    await store.set(STORE_KEY, next);
    setSnapshots(next);
  }, [snapshots]);

  const updateSnapshot = useCallback(async (id: string, code: string) => {
    const store = await getStore();
    const next = snapshots.map((s) =>
      s.id === id ? { ...s, code, savedAt: Date.now() } : s
    );
    await store.set(STORE_KEY, next);
    setSnapshots(next);
  }, [snapshots]);

  return { snapshots, loading, save, remove, updateSnapshot };
}
