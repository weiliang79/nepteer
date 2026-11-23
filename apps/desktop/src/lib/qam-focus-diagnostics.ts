// Temporary test-build-only module. The gated dynamic import is removed from normal builds.
export function createDiagnosticDelay() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  const timer = window.setTimeout(release, 5000);
  return {
    promise,
    cancel() {
      window.clearTimeout(timer);
      release();
    },
  };
}
