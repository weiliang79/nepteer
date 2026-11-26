import { useEffect, useSyncExternalStore } from "react";

export type Preferences = {
  theme: "dark" | "light";
  unit: "celsius" | "fahrenheit";
};
export const preferenceKey = "nepteer.preferences";
const defaults: Preferences = { theme: "dark", unit: "celsius" };
const fields = ["theme", "unit"] as const;
type Field = (typeof fields)[number];
type Stamp = [number, string];
type RecordValue = Preferences & { revisions: Record<Field, Stamp> };
type State = {
  preferences: Preferences;
  storageError: boolean;
  syncError: boolean;
};
type Channel = Pick<BroadcastChannel, "postMessage" | "close" | "onmessage">;
type Environment = {
  storage: () => Pick<Storage, "getItem" | "setItem">;
  channel: () => Channel;
  listen: (callback: (event: StorageEvent) => void) => () => void;
  id: string;
};
function valid(field: Field, value: unknown): boolean {
  return field === "theme"
    ? value === "dark" || value === "light"
    : value === "celsius" || value === "fahrenheit";
}
function validStamp(stamp: unknown): stamp is Stamp {
  return (
    Array.isArray(stamp) &&
    stamp.length === 2 &&
    Number.isSafeInteger(stamp[0]) &&
    stamp[0] >= 0 &&
    stamp[0] < Number.MAX_SAFE_INTEGER &&
    typeof stamp[1] === "string" &&
    stamp[1].length <= 64
  );
}
function decode(value: unknown): RecordValue {
  const record = value as Partial<RecordValue> | null;
  const result: RecordValue = {
    ...defaults,
    revisions: { theme: [0, ""], unit: [0, ""] },
  };
  for (const field of fields) {
    if (!valid(field, record?.[field])) continue;
    Object.assign(result, { [field]: record![field] });
    result.revisions[field] = [1, "legacy"];
    const stamp = record?.revisions?.[field];
    if (validStamp(stamp)) result.revisions[field] = [stamp[0], stamp[1]];
  }
  return result;
}
function newer(a: Stamp, b: Stamp) {
  return a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);
}
export function loadPreferences(): Preferences {
  try {
    const { theme, unit } = decode(
      JSON.parse(localStorage.getItem(preferenceKey) ?? "{}"),
    );
    return { theme, unit };
  } catch {
    return { ...defaults };
  }
}

// Field-wise Lamport revisions converge concurrent edits without replaying them.
// Only the two validated preference enums and their bounded revisions cross windows.
export function createPreferenceStore(env: Environment) {
  let record = decode(null);
  let state: State = {
    preferences: { ...defaults },
    storageError: false,
    syncError: false,
  };
  let initialized = false;
  let writeFailed = false;
  let channel: Channel | undefined;
  let unlisten: (() => void) | undefined;
  const subscribers = new Set<() => void>();
  function publish(
    storageError = state.storageError,
    syncError = state.syncError,
  ) {
    if (
      state.preferences.theme === record.theme &&
      state.preferences.unit === record.unit &&
      state.storageError === storageError &&
      state.syncError === syncError
    )
      return;
    state = {
      preferences: { theme: record.theme, unit: record.unit },
      storageError,
      syncError,
    };
    subscribers.forEach((callback) => callback());
  }
  function merge(next: RecordValue) {
    let changed = false;
    for (const field of fields) {
      if (newer(next.revisions[field], record.revisions[field])) {
        Object.assign(record, { [field]: next[field] });
        record.revisions[field] = next.revisions[field];
        changed = true;
      }
    }
    return changed;
  }
  function read() {
    try {
      const raw = env.storage().getItem(preferenceKey);
      // Missing or malformed storage never erases a known session value.
      if (raw !== null) merge(decode(JSON.parse(raw)));
      publish(writeFailed);
      return true;
    } catch {
      publish(true);
      return false;
    }
  }
  function persist() {
    try {
      const storage = env.storage();
      const serialized = JSON.stringify(record);
      if (storage.getItem(preferenceKey) !== serialized)
        storage.setItem(preferenceKey, serialized);
      writeFailed = false;
      publish(false);
    } catch {
      writeFailed = true;
      publish(true);
    }
  }
  function send(message: unknown) {
    try {
      if (channel) {
        channel.postMessage(message);
        publish(state.storageError, false);
      }
    } catch {
      publish(state.storageError, true);
    }
  }
  function receive(value: unknown) {
    if (!value || typeof value !== "object") return;
    const message = value as { type?: unknown; value?: unknown };
    if (message.type === "request") {
      send({ type: "state", value: record });
      return;
    }
    if (message.type !== "state") return;
    const incoming = message.value as Partial<RecordValue> | null;
    if (
      !incoming ||
      !fields.every(
        (field) =>
          valid(field, incoming[field]) &&
          validStamp(incoming.revisions?.[field]),
      )
    )
      return;
    if (merge(decode(incoming))) {
      publish();
      // Reconcile a concurrent whole-key write with the merged fields. No event echo.
      read();
      persist();
    }
  }
  function start() {
    if (!initialized) {
      initialized = true;
      read();
    }
    if (unlisten) return;
    unlisten = env.listen((event) => {
      if (event.key !== preferenceKey && event.key !== null) return;
      read();
      // A concurrent stale storage notification cannot roll a field backward.
      if (event.newValue !== null) persist();
    });
    try {
      channel = env.channel();
      channel.onmessage = (event) => receive(event.data);
      send({ type: "request" });
    } catch {
      publish(state.storageError, true);
    }
  }
  return {
    getSnapshot: () => {
      if (!initialized) {
        initialized = true;
        read();
      }
      return state;
    },
    subscribe: (callback: () => void) => {
      subscribers.add(callback);
      start();
      return () => {
        subscribers.delete(callback);
      };
    },
    reload: () => {
      read();
      send({ type: "request" });
    },
    update: <K extends Field>(field: K, value: Preferences[K]) => {
      if (!valid(field, value)) return;
      start();
      read();
      if (record[field] === value) {
        persist();
        return;
      }
      const clock =
        Math.max(...fields.map((key) => record.revisions[key][0])) + 1;
      if (!Number.isSafeInteger(clock)) return;
      Object.assign(record, { [field]: value });
      record.revisions[field] = [clock, env.id];
      publish();
      persist();
      send({ type: "state", value: record });
    },
    // Explicit lifetime cleanup; normal React remounts retain the session snapshot.
    dispose: () => {
      unlisten?.();
      channel?.close();
      subscribers.clear();
      unlisten = undefined;
      channel = undefined;
      initialized = false;
      writeFailed = false;
      record = decode(null);
      state = {
        preferences: { ...defaults },
        storageError: false,
        syncError: false,
      };
    },
  };
}
export const preferenceStore = createPreferenceStore({
  storage: () => localStorage,
  channel: () => new BroadcastChannel("nepteer.preferences.v1"),
  listen: (callback) => {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  },
  id: crypto.randomUUID(),
});
export function usePreferences() {
  const state = useSyncExternalStore(
    preferenceStore.subscribe,
    preferenceStore.getSnapshot,
  );
  useEffect(() => {
    document.documentElement.dataset.theme = state.preferences.theme;
  }, [state.preferences.theme]);
  return { ...state, updatePreference: preferenceStore.update };
}
