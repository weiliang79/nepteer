// Inventory declared licenses for the entire locked graph, including target-only crates.
import { execFileSync } from "node:child_process";
const metadata = JSON.parse(
  execFileSync("cargo", ["metadata", "--locked", "--format-version", "1"], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }),
);
console.log(
  JSON.stringify(
    metadata.packages
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name) || a.version.localeCompare(b.version),
      )
      .map(({ name, version, license, license_file, source }) => ({
        name,
        version,
        license,
        license_file,
        source,
      })),
    null,
    2,
  ),
);
