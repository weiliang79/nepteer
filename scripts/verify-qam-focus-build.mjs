// Inspect the final Vite output, including its gated dynamic-import chunk.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
const expected = process.argv[2];
if (!["enabled", "disabled"].includes(expected)) {
  throw new Error(
    "Usage: node scripts/verify-qam-focus-build.mjs enabled|disabled",
  );
}
const directory = "apps/desktop/dist/assets";
const files = (await readdir(directory)).filter((name) => name.endsWith(".js"));
const javascript = (
  await Promise.all(
    files.map((name) => readFile(path.join(directory, name), "utf8")),
  )
).join("\n");
const evidence = [
  javascript.includes("Test Slow Refresh (5s)"),
  javascript.includes("TEST BUILD ONLY"),
  files.some((name) => name.startsWith("qam-focus-diagnostics-")),
];
if (!evidence.every((found) => found === (expected === "enabled"))) {
  throw new Error(
    `QAM diagnostic UI/label/delay chunk does not match ${expected} build: ${evidence}`,
  );
}
console.log(
  `Verified ${expected} QAM focus diagnostics: button, test label and delay chunk ${expected === "enabled" ? "present" : "absent"}.`,
);
