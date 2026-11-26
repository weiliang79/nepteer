import { afterEach, expect, test } from "vitest";
import {
  createPreferenceStore,
  loadPreferences,
  preferenceKey,
} from "./preferences";

// Two independent renderer stores, asynchronous structured-clone transport and storage
// notifications. This models web behavior; it is not native WebView2 verification.
function windows({ broadcasts = true, notifications = true } = {}) {
  let saved: string | null = null;
  let messages = 0;
  const queue: Array<() => void> = [];
  const peers: Array<{
    receive?: (event: MessageEvent) => void;
    storage?: (event: StorageEvent) => void;
    failRead: boolean;
    failWrite: boolean;
    stale?: string | null;
  }> = [];
  function open(id: string) {
    const peer: (typeof peers)[number] = { failRead: false, failWrite: false };
    peers.push(peer);
    const store = createPreferenceStore({
      id,
      storage: () => ({
        getItem: () => {
          if (peer.failRead) throw Error("read");
          return peer.stale !== undefined ? peer.stale : saved;
        },
        setItem: (_key, value) => {
          if (peer.failWrite) throw Error("quota");
          saved = value;
          if (notifications)
            for (const other of peers)
              if (other !== peer)
                queue.push(() =>
                  other.storage?.({
                    key: preferenceKey,
                    newValue: value,
                  } as StorageEvent),
                );
        },
      }),
      listen: (callback) => {
        peer.storage = callback;
        return () => {
          peer.storage = undefined;
        };
      },
      channel: () => {
        if (!broadcasts) throw Error("unsupported");
        return {
          set onmessage(callback) {
            peer.receive = callback ?? undefined;
          },
          get onmessage() {
            return peer.receive ?? null;
          },
          close: () => {
            peer.receive = undefined;
          },
          postMessage: (value) => {
            messages++;
            for (const other of peers)
              if (other !== peer) {
                const cloned = structuredClone(value);
                queue.push(() =>
                  other.receive?.({ data: cloned } as MessageEvent),
                );
              }
          },
        };
      },
    });
    store.subscribe(() => {});
    stores.push(store);
    return { store, peer };
  }
  function flush(reverse = false) {
    let count = 0;
    while (queue.length) {
      if (++count > 1000) throw Error("synchronization loop");
      (reverse ? queue.pop() : queue.shift())!();
    }
  }
  return {
    open,
    flush,
    seed: (value: string | null) => {
      saved = value;
    },
    saved: () => JSON.parse(saved ?? "{}"),
    messages: () => messages,
  };
}
const stores: ReturnType<typeof createPreferenceStore>[] = [];
afterEach(() => {
  stores.splice(0).forEach((store) => store.dispose());
});

test("defaults are dark/Celsius and legacy saved light/Fahrenheit migrate", () => {
  const env = windows();
  expect(env.open("a").store.getSnapshot().preferences).toEqual({
    theme: "dark",
    unit: "celsius",
  });
  env.seed(JSON.stringify({ theme: "light", unit: "fahrenheit" }));
  const b = env.open("b").store;
  expect(b.getSnapshot().preferences).toEqual({
    theme: "light",
    unit: "fahrenheit",
  });
});

test.each([
  ["theme", "light", "dark"],
  ["unit", "fahrenheit", "celsius"],
] as const)(
  "%s round-trips and persists through a new renderer",
  (field, first, last) => {
    const env = windows();
    const a = env.open("a").store;
    a.update(field, first);
    expect(a.getSnapshot().preferences[field]).toBe(first);
    a.update(field, last);
    expect(a.getSnapshot().preferences[field]).toBe(last);
    a.update(field, first);
    expect(env.open("restart").store.getSnapshot().preferences[field]).toBe(
      first,
    );
  },
);

test.each(["broken JSON", "null", "[]", '{"theme":"blue","unit":"kelvin"}'])(
  "invalid storage %s uses validated defaults",
  (raw) => {
    const env = windows();
    env.seed(raw);
    expect(env.open("a").store.getSnapshot().preferences).toEqual({
      theme: "dark",
      unit: "celsius",
    });
    localStorage.setItem(preferenceKey, raw);
    expect(loadPreferences()).toEqual({ theme: "dark", unit: "celsius" });
  },
);

test.each([true, false])(
  "both origins synchronize with storage notifications=%s",
  (notifications) => {
    const env = windows({ notifications });
    const a = env.open("dashboard").store,
      b = env.open("qam").store;
    env.flush();
    b.update("theme", "light");
    env.flush();
    expect(a.getSnapshot().preferences.theme).toBe("light");
    a.update("unit", "fahrenheit");
    env.flush();
    expect(b.getSnapshot().preferences).toEqual({
      theme: "light",
      unit: "fahrenheit",
    });
    const count = env.messages();
    env.flush();
    expect(env.messages()).toBe(count);
  },
);

test("storage notification fallback reports unavailable channel honestly", () => {
  const env = windows({ broadcasts: false });
  const a = env.open("a").store,
    b = env.open("b").store;
  a.update("theme", "light");
  env.flush();
  expect(b.getSnapshot().preferences.theme).toBe("light");
  expect(b.getSnapshot().syncError).toBe(true);
});

test.each([true, false])(
  "concurrent different fields converge despite stale reads and reordered events=%s",
  (reverse) => {
    const env = windows();
    const a = env.open("a"),
      b = env.open("b");
    env.flush();
    // Both read the same pre-edit snapshot before either receives the other event.
    a.peer.stale = null;
    b.peer.stale = null;
    a.store.update("theme", "light");
    b.store.update("unit", "fahrenheit");
    delete a.peer.stale;
    delete b.peer.stale;
    env.flush(reverse);
    expect(a.store.getSnapshot().preferences).toEqual({
      theme: "light",
      unit: "fahrenheit",
    });
    expect(b.store.getSnapshot().preferences).toEqual(
      a.store.getSnapshot().preferences,
    );
    expect(env.saved()).toMatchObject(a.store.getSnapshot().preferences);
  },
);

test("rapid conflicting changes have deterministic field resolution without loops", () => {
  const env = windows();
  const a = env.open("a"),
    b = env.open("b");
  env.flush();
  a.peer.stale = null;
  b.peer.stale = null;
  a.store.update("theme", "light");
  a.store.update("theme", "dark");
  b.store.update("theme", "light");
  b.store.update("unit", "fahrenheit");
  delete a.peer.stale;
  delete b.peer.stale;
  env.flush(true);
  expect(a.store.getSnapshot().preferences).toEqual(
    b.store.getSnapshot().preferences,
  );
  expect(env.saved()).toMatchObject(a.store.getSnapshot().preferences);
  expect(env.messages()).toBeLessThan(20);
});

test("read/write failures preserve session values and do not falsely clear an unsaved warning", () => {
  const env = windows();
  const a = env.open("a");
  a.peer.failWrite = true;
  a.store.update("theme", "light");
  expect(a.store.getSnapshot().storageError).toBe(true);
  a.store.reload();
  expect(a.store.getSnapshot().storageError).toBe(true);
  a.peer.failRead = true;
  a.store.reload();
  expect(a.store.getSnapshot().preferences.theme).toBe("light");
  a.peer.failRead = false;
  a.peer.failWrite = false;
  a.store.update("theme", "light");
  expect(a.store.getSnapshot().storageError).toBe(false);
  expect(env.saved().theme).toBe("light");
});

test("a reload can recover session changes from its peer when all storage is unavailable", () => {
  const env = windows();
  const a = env.open("a"),
    b = env.open("b");
  env.flush();
  a.peer.failRead =
    a.peer.failWrite =
    b.peer.failRead =
    b.peer.failWrite =
      true;
  a.store.update("unit", "fahrenheit");
  env.flush();
  expect(b.store.getSnapshot().preferences.unit).toBe("fahrenheit");
  expect(b.store.getSnapshot().storageError).toBe(true);
  b.store.dispose();
  const c = env.open("reload");
  c.peer.failRead = c.peer.failWrite = true;
  env.flush();
  expect(c.store.getSnapshot().preferences.unit).toBe("fahrenheit");
});

test("same selected option is harmless and malformed external data cannot reset known values", () => {
  const env = windows();
  const a = env.open("a").store;
  a.update("theme", "light");
  const count = env.messages();
  a.update("theme", "light");
  expect(env.messages()).toBe(count);
  env.seed('{"theme":"bad"}');
  a.reload();
  expect(a.getSnapshot().preferences.theme).toBe("light");
  env.seed("not JSON");
  a.reload();
  expect(a.getSnapshot().storageError).toBe(true);
  expect(a.getSnapshot().preferences.theme).toBe("light");
});

test("malformed channel payloads and stamps are ignored", () => {
  const env = windows();
  const a = env.open("a");
  const baseline = a.store.getSnapshot();
  for (const value of [
    null,
    "light",
    {},
    {
      type: "state",
      value: { theme: "blue", unit: "fahrenheit", revisions: {} },
    },
    {
      type: "state",
      value: {
        theme: "light",
        unit: "fahrenheit",
        revisions: { theme: [Infinity, "x"], unit: [1, "x"] },
      },
    },
  ]) {
    a.peer.receive?.({ data: value } as MessageEvent);
    expect(a.store.getSnapshot()).toBe(baseline);
  }
});

test("initial storage read failure reports an error and explicit selection can recover", () => {
  localStorage.setItem(
    preferenceKey,
    JSON.stringify({ theme: "light", unit: "fahrenheit" }),
  );
  // The public loader is deliberately a safe default-only helper; live stores retain errors.
  const env = windows();
  const a = env.open("a");
  a.store.dispose();
  a.peer.failRead = true;
  expect(a.store.getSnapshot().storageError).toBe(true);
  expect(a.store.getSnapshot().preferences).toEqual({
    theme: "dark",
    unit: "celsius",
  });
  a.peer.failRead = false;
  a.store.update("theme", "light");
  expect(a.store.getSnapshot().storageError).toBe(false);
});
